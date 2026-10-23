/** Chạy sau backend tests, chỉ với app/Nginx cô lập đã xác minh DB test.
 * Không thêm thư viện: Chrome CDP + WebSocket/Node 24. Không in mật khẩu/cookie.
 * Chrome test cần --host-resolver-rules="MAP localhost 127.0.0.1": Nginx8081
 * chỉ bind IPv4; ::1 có thể thuộc ứng dụng khác. Chờ DevToolsActivePort mới
 * và GET /json/version thành công trước khi chạy; không dùng file port cũ.
 */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

if (process.env.AUTH_E2E_CONFIRMED_TEST_DB !== 'mini_apartment_test') throw new Error('Require verified dedicated test DB before browser test')
const artifacts = path.resolve('backups/user-name-20261024')
const fixture = JSON.parse(fs.readFileSync(path.join(artifacts, 'fixtures.json'), 'utf8'))
const base = 'http://localhost:8081'
const port = fs.readFileSync(path.join(artifacts, 'chrome-profile-name/DevToolsActivePort'), 'utf8').split('\n')[0]
const version = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json())
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
let serial = 0
const pending = new Map()
const responses = []
const requests = []
const paused = []
const exceptions = []
ws.addEventListener('message', event => {
  const data = JSON.parse(event.data)
  if (data.id) {
    const request = pending.get(data.id)
    if (!request) return
    pending.delete(data.id); clearTimeout(request.timer)
    if (data.error) request.reject(new Error(`CDP ${request.method} failed: ${data.error.message}`))
    else request.resolve(data.result)
  }
  if (data.method === 'Network.responseReceived' && data.params.response.url.startsWith(base+'/api/')) {
    responses.push({ session: data.sessionId, url: new URL(data.params.response.url).pathname, status: data.params.response.status })
  }
  if (data.method === 'Network.requestWillBeSent' && data.params.request.url.startsWith(base+'/api/')) {
    requests.push({session:data.sessionId,url:new URL(data.params.request.url).pathname,method:data.params.request.method,hasXsrfToken:Object.keys(data.params.request.headers).some(key=>key.toLowerCase()==='x-xsrf-token')})
  }
  if (data.method === 'Fetch.requestPaused') paused.push({session:data.sessionId,...data.params})
  if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text)
})
function cdp(method, params = {}, sessionId) {
  const id=++serial
  return new Promise((resolve,reject) => {
    const timer=setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${method}`)) }, method === 'Page.navigate' ? 60000 : 20000)
    pending.set(id,{resolve,reject,timer,method}); ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))
  })
}
const openedContexts = []
async function page() {
 const {browserContextId}=await cdp('Target.createBrowserContext')
 const {targetId}=await cdp('Target.createTarget',{url:'about:blank',browserContextId})
 const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true})
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId)
 await cdp('Page.enable',{},sessionId); await cdp('Runtime.enable',{},sessionId); await cdp('Network.enable',{},sessionId)
 openedContexts.push(browserContextId)
 return {browserContextId,sessionId}
}
async function evaluate(p, expression) {
 const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},p.sessionId)
 if (result.exceptionDetails) throw new Error('Browser script failed: '+(result.exceptionDetails.exception?.description?.split('\n')[0] ?? result.exceptionDetails.text))
 return result.result.value
}
async function wait(p, expression, label='condition') {
 const deadline=Date.now()+60000
 while (Date.now()<deadline) {
   try { if (await evaluate(p,expression)) return } catch { /* Document mới có thể đang thay execution context. */ }
   await new Promise(r=>setTimeout(r,100))
 }
 throw new Error(`Browser wait timeout: ${label}`)
}
async function go(p, route) {
 await cdp('Page.bringToFront',{},p.sessionId)
 await cdp('Page.navigate',{url:base+route},p.sessionId)
 await wait(p,'!!document.querySelector("#root")?.firstElementChild','page load')
}
async function fill(p,id,text) {
 if (await evaluate(p,`document.getElementById(${JSON.stringify(id)}).type==='date'`)) {
  await evaluate(p,`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(document.getElementById(${JSON.stringify(id)}),${JSON.stringify(text)});document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('input',{bubbles:true}));document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change',{bubbles:true}));true`)
  return
 }
 await evaluate(p,`document.getElementById(${JSON.stringify(id)}).focus(); document.getElementById(${JSON.stringify(id)}).select(); true`)
 if (text) await cdp('Input.insertText',{text},p.sessionId)
 else { await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',windowsVirtualKeyCode:8},p.sessionId); await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',windowsVirtualKeyCode:8},p.sessionId) }
}
async function submit(p) { await evaluate(p,'(document.querySelector("form[aria-busy]") ?? document.querySelector("form")).requestSubmit(); true') }
async function login(p,role,identifier='email') {
 await go(p,'/login'); await wait(p,'!!document.querySelector("#identifier") && !document.querySelector("button[type=submit]").disabled','login ready')
 await fill(p,'identifier',fixture.accounts[role][identifier]); await fill(p,'password',fixture.password); await submit(p)
 await wait(p,role==='admin'?'location.pathname.startsWith("/admin")':'location.pathname === "/account/profile"','login role destination')
}
async function screenshot(p,name) {
 const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},p.sessionId)
 fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(result.data,'base64'))
}

// CDP helpers được dùng giống harness user-management; không thêm thư viện.
// CDP helpers chung theo harness USR-B; không log mật khẩu/cookie/body.
// Dùng helper CDP theo harness USR-C, chỉ ghi metadata request.
const results=[]
let buildAssets=[]
const report=()=>fs.writeFileSync(path.join(artifacts,'user-name-results.json'),JSON.stringify({results,responses,requests,exceptions,buildAssets},null,2))
async function check(id,run){await run();results.push({id,result:'PASS'});console.log('PASS '+id);report()}
async function click(p,label){const expr=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}&&b.getClientRects().length&&!b.disabled)`;await wait(p,`!!(${expr})`,'button '+label);await evaluate(p,expr+'.click();true')}
async function api(p,role,method='GET',body,suffix=''){const route=role==='me'?'auth/me':'users/'+fixture.accounts[role].id+suffix;return evaluate(p,`fetch('/api/v1/'+${JSON.stringify(route)},{method:${JSON.stringify(method)},headers:{Accept:'application/json','Content-Type':'application/json',...(document.cookie.includes('XSRF-TOKEN=')?{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).slice(11))}:{})},${body?'body:'+JSON.stringify(JSON.stringify(body))+',':''}credentials:'same-origin'}).then(async r=>({status:r.status,body:await r.json().catch(()=>null)}))`)}
async function ready(p,name){await wait(p,`!document.querySelector('[role=dialog]')&&document.querySelector('h1')?.textContent===${JSON.stringify(name)}`,'detail name from API')}
async function detail(p,role){await go(p,'/admin/users/'+fixture.accounts[role].id);await ready(p,fixture.accounts[role].name)}
async function open(p){await click(p,'Sửa họ tên');await wait(p,'!!document.getElementById("user-full_name")','name form')}
async function save(p){await evaluate(p,'document.querySelector("[role=dialog] form").requestSubmit();true')}
const prefix='AuthStep4 '+fixture.run+' '
try{
 const p=await page()
 await check('NAME01-anonymous401',async()=>{await go(p,'/login');await evaluate(p,"fetch('/sanctum/csrf-cookie').then(r=>r.status)");assert.equal((await api(p,'user','PATCH',{full_name:prefix+'Không lưu'})).status,401)})
 await login(p,'admin');buildAssets=await evaluate(p,'Array.from(document.scripts).map(s=>s.src).filter(Boolean)')
 await detail(p,'user')
 await check('NAME02-only-name-prefilled-cancel-no-write',async()=>{
  await open(p);assert.deepEqual(await evaluate(p,'Array.from(document.querySelectorAll("[role=dialog] input")).map(e=>e.name)'),['full_name'])
  assert.equal(await evaluate(p,'document.getElementById("user-full_name").value'),fixture.accounts.user.name)
  const start=requests.length;await fill(p,'user-full_name',prefix+'Hủy');await click(p,'Hủy');assert.equal(requests.slice(start).some(r=>r.method==='PATCH'),false)
  await open(p);assert.equal(await evaluate(p,'document.getElementById("user-full_name").value'),fixture.accounts.user.name)
 })
 await check('NAME03-invalid-empty-and121-no-PATCH',async()=>{
  const start=requests.length;await fill(p,'user-full_name','');await save(p);await wait(p,'document.getElementById("user-full_name-error").textContent.length>0','required name')
  await fill(p,'user-full_name','a'.repeat(121));await save(p);await wait(p,'document.getElementById("user-full_name-error").textContent.includes("120")','length validation')
  assert.equal(requests.slice(start).some(r=>r.method==='PATCH'),false);await click(p,'Hủy')
 })
 await check('NAME04-save-trim-F5-search-list-preserve-profile',async()=>{
  const before=(await api(p,'user')).body.data;const name=prefix+'Nguyễn Văn An';await open(p);await fill(p,'user-full_name','  '+name+'  ');await save(p);await ready(p,name)
  assert.deepEqual((await api(p,'user')).body.data,{...before,full_name:name});fixture.accounts.user.name=name
  const start=responses.length;await cdp('Page.reload',{},p.sessionId);const deadline=Date.now()+20000
  while(!responses.slice(start).some(r=>r.url==='/api/v1/users/'+fixture.accounts.user.id&&r.status===200)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100))
  assert.ok(responses.slice(start).some(r=>r.url==='/api/v1/users/'+fixture.accounts.user.id&&r.status===200));await ready(p,name)
  await go(p,'/admin/users');await wait(p,'!!document.getElementById("user-q")');await fill(p,'user-q',name);await evaluate(p,'document.querySelector("form").requestSubmit();true')
  await wait(p,`document.querySelectorAll('tbody tr').length===1&&document.querySelector('a[href="/admin/users/${fixture.accounts.user.id}"]')?.closest('tr')?.innerText.includes(${JSON.stringify(name)})`,'name in filtered list');assert.equal(await evaluate(p,'document.querySelectorAll("tbody tr").length'),1)
 })
 await check('NAME05-protected-fields422-CSRF419-missing404',async()=>{
  const before=(await api(p,'user')).body.data
  for(const field of ['role','status','phone','email','password','id_number'])assert.equal((await api(p,'user','PATCH',{full_name:prefix+'Không lưu',[field]:null})).status,422)
  const cookies=(await cdp('Network.getCookies',{urls:[base]},p.sessionId)).cookies.map(c=>`${c.name}=${c.value}`).join('; ')
  const denied=await fetch('http://127.0.0.1:8081/api/v1/users/'+fixture.accounts.user.id,{method:'PATCH',headers:{Cookie:cookies,Origin:base,Referer:base+'/','Sec-Fetch-Site':'cross-site','X-XSRF-TOKEN':'invalid-test-token',Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({full_name:prefix+'Không lưu'})});assert.equal(denied.status,419)
  assert.equal(await evaluate(p,"fetch('/api/v1/users/999999999',{headers:{Accept:'application/json'}}).then(r=>r.status)"),404)
  assert.deepEqual((await api(p,'user')).body.data,before)
 })
 await check('NAME06-all-nonadmin403',async()=>{
  for(const role of ['user','resident','technician','guard']){const q=await page();await login(q,role);assert.equal((await api(q,'user','PATCH',{full_name:prefix+'Không lưu'})).status,403)}
 })
 await check('NAME07-Admin-own-name-me-and-navbar-refresh-no-lock-permission',async()=>{
  await detail(p,'admin');await open(p);const name=prefix+'Quản trị';await fill(p,'user-full_name',name);await save(p);await ready(p,name);fixture.accounts.admin.name=name
  await wait(p,`document.querySelector('header a[href="/account/profile"]')?.getAttribute('title')===${JSON.stringify(name)}`,'navbar /me refresh')
  assert.equal((await api(p,'me')).body.data.full_name,name);assert.equal((await api(p,'admin','PATCH',{status:'locked'},'/status')).status,403)
 })
 await check('NAME08-offline-no-write-no-success-retry',async()=>{
  await detail(p,'user');const before=(await api(p,'user')).body.data.full_name;await open(p);const name=prefix+'Thử lại';await fill(p,'user-full_name',name)
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId);await save(p);await wait(p,'document.querySelector("[role=dialog] [role=alert]")?.textContent.includes("kết nối")','network error')
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);assert.equal((await api(p,'user')).body.data.full_name,before);await save(p);await ready(p,name);fixture.accounts.user.name=name
 })
 await check('NAME09-pending-close-and-double-submit-blocked',async()=>{
  await detail(p,'technician');await open(p);const name=prefix+'Kỹ thuật';await fill(p,'user-full_name',name)
  await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/users/'+fixture.accounts.technician.id,requestStage:'Request'}]},p.sessionId);const start=paused.length;const networkStart=requests.length;await save(p)
  const deadline=Date.now()+10000;while(!paused.slice(start).some(r=>r.request.method==='PATCH')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50))
  const held=paused.slice(start).filter(r=>r.request.method==='PATCH');assert.equal(held.length,1)
  await evaluate(p,'document.querySelector("[role=dialog] button[aria-label=Đóng]").click();document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));document.querySelector("[role=dialog] form").requestSubmit();true')
  assert.equal(await evaluate(p,'!!document.querySelector("[role=dialog]")'),true);assert.equal(paused.slice(start).filter(r=>r.request.method==='PATCH').length,1)
  await cdp('Fetch.continueRequest',{requestId:held[0].requestId},p.sessionId);await cdp('Fetch.disable',{},p.sessionId);await ready(p,name);fixture.accounts.technician.name=name
  assert.equal(requests.slice(networkStart).filter(r=>r.method==='PATCH').length,1)
 })
 await check('NAME10-mobile-form-actions-visible',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:667,deviceScaleFactor:1,mobile:true},p.sessionId);await detail(p,'technician');await open(p)
  assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'),true)
  assert.equal(await evaluate(p,'(()=>{const b=document.querySelector("[role=dialog] button[type=submit]").getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight})()'),true)
  await screenshot(p,'user-name-mobile');await click(p,'Hủy');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},p.sessionId)
 })
 await check('NAME11-status-regression-after-name-update',async()=>{
  await detail(p,'technician');await click(p,'Khóa tài khoản');await click(p,'Xác nhận khóa');await wait(p,'!document.querySelector("[role=dialog]")&&Array.from(document.querySelectorAll("button")).some(b=>b.textContent.trim()==="Mở khóa tài khoản")','locked after name edit')
  assert.equal((await api(p,'technician')).body.data.full_name,fixture.accounts.technician.name)
  await click(p,'Mở khóa tài khoản');await click(p,'Xác nhận mở khóa');await wait(p,'!document.querySelector("[role=dialog]")&&Array.from(document.querySelectorAll("button")).some(b=>b.textContent.trim()==="Khóa tài khoản")','unlocked after name edit')
  assert.equal((await api(p,'technician')).body.data.role,'technician');assert.equal((await api(p,'technician')).body.data.status,'active');await screenshot(p,'user-name-desktop')
 })
 await check('NAME12-minimal-response-and-runtime',async()=>{
  const r=await api(p,'user','PATCH',{full_name:fixture.accounts.user.name});assert.equal(r.status,200)
  assert.deepEqual(Object.keys(r.body.data).sort(),['id','full_name','email','phone','role','status','created_at','has_active_contract','active_contract'].sort());assert.equal((await api(p,'me')).body.data.role,'admin')
  assert.equal(exceptions.length,0)
 })
 console.log('User name browser PASS '+results.length+' cases on dedicated MySQL test')
}catch(error){results.push({result:'FAIL',reason:error.message});console.error('User name browser FAIL:',error.message);process.exitCode=1}
finally{report();for(const browserContextId of openedContexts)await cdp('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});await cdp('Browser.close').catch(()=>{});ws.close()}
