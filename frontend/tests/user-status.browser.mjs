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
const artifacts = path.resolve('backups/user-status-20261023')
const fixture = JSON.parse(fs.readFileSync(path.join(artifacts, 'fixtures.json'), 'utf8'))
const base = 'http://localhost:8081'
const port = fs.readFileSync(path.join(artifacts, 'chrome-profile-status/DevToolsActivePort'), 'utf8').split('\n')[0]
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
const results=[]
let buildAssets=[]
const report=()=>fs.writeFileSync(path.join(artifacts,'user-status-results.json'),JSON.stringify({results,responses,requests,exceptions,buildAssets},null,2))
async function check(id,run){await run();results.push({id,result:'PASS'});console.log('PASS '+id);report()}
async function click(p,label){const expr=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)} && b.getClientRects().length && !b.disabled)`;await wait(p,`!!(${expr})`,'button '+label);await evaluate(p,expr+'.click();true')}
async function api(p,route,method='GET',body){return evaluate(p,`fetch('/api/v1/'+${JSON.stringify(route)},{method:${JSON.stringify(method)},headers:{Accept:'application/json','Content-Type':'application/json',...(document.cookie.includes('XSRF-TOKEN=')?{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).slice(11))}:{})},${body?'body:'+JSON.stringify(JSON.stringify(body))+',':''}credentials:'same-origin'}).then(async r=>({status:r.status,body:await r.json().catch(()=>null)}))`)}
const route=role=>'users/'+fixture.accounts[role].id
async function detail(p,role){await go(p,'/admin/'+route(role));await wait(p,`document.querySelector('h1')?.textContent===${JSON.stringify(fixture.accounts[role].name)}`,'real user detail')}
async function statusReady(p,status){await wait(p,`!document.querySelector('[role=dialog]') && Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(status==='locked'?'Mở khóa tài khoản':'Khóa tài khoản')})`,'detail refresh '+status)}
async function change(p,status){await click(p,status==='locked'?'Khóa tài khoản':'Mở khóa tài khoản');await click(p,status==='locked'?'Xác nhận khóa':'Xác nhận mở khóa');await statusReady(p,status)}
try{
 const p=await page()
 await check('STATUS01-anonymous401',async()=>{await go(p,'/login');await evaluate(p,"fetch('/sanctum/csrf-cookie').then(r=>r.status)");assert.equal((await api(p,route('user')+'/status','PATCH',{status:'locked'})).status,401)})
 await login(p,'admin');buildAssets=await evaluate(p,'Array.from(document.scripts).map(s=>s.src).filter(Boolean)')
 await check('STATUS02-Admin-self-no-actions-and403',async()=>{
  await detail(p,'admin');assert.equal(await evaluate(p,'Array.from(document.querySelectorAll("button")).some(b=>["Khóa tài khoản","Mở khóa tài khoản"].includes(b.textContent.trim()))'),false)
  for(const status of ['locked','active'])assert.equal((await api(p,route('admin')+'/status','PATCH',{status})).status,403)
 })
 const resident=await page();await login(resident,'resident')
 let index=3
 for(const role of ['user','resident','technician','guard'])await check('STATUS'+String(index++).padStart(2,'0')+'-'+role+'-lock-unlock-preserves-profile',async()=>{
  const before=(await api(p,route(role))).body.data;await detail(p,role)
  if(role==='user'){
   const count=requests.filter(r=>r.method==='PATCH').length;await click(p,'Khóa tài khoản');assert.ok(await evaluate(p,`document.querySelector('[role=dialog]').innerText.includes(${JSON.stringify(fixture.accounts[role].name)})`));await click(p,'Hủy');assert.equal(requests.filter(r=>r.method==='PATCH').length,count)
  }
  await change(p,'locked');assert.equal((await api(p,route(role))).body.data.status,'locked')
  if(role==='resident'){
   assert.equal((await api(resident,'auth/me')).status,403);assert.equal((await api(resident,'auth/me')).status,401)
   await go(resident,'/login');await wait(resident,'!!document.querySelector("#identifier")&&!document.querySelector("button[type=submit]").disabled');await fill(resident,'identifier',fixture.accounts.resident.phone);await fill(resident,'password',fixture.password);await submit(resident);await wait(resident,'document.querySelector("[role=alert]")?.textContent.includes("khóa")','locked login denied')
  }
  await change(p,'active');assert.deepEqual((await api(p,route(role))).body.data,before)
  if(role==='resident'){await login(resident,'resident','phone');assert.equal((await api(resident,'auth/me')).body.data.id,fixture.accounts.resident.id)}
 })
 await check('STATUS07-invalid422-missing404-CSRF419-no-mutation',async()=>{
  const before=(await api(p,route('user'))).body.data
  assert.equal((await api(p,route('user')+'/status','PATCH',{status:'locked',role:'admin'})).status,422)
  assert.equal((await api(p,route('user')+'/status','PATCH',{status:'inactive'})).status,422)
  assert.equal((await api(p,'users/999999999/status','PATCH',{status:'locked'})).status,404)
  const cookies=(await cdp('Network.getCookies',{urls:[base]},p.sessionId)).cookies.map(c=>`${c.name}=${c.value}`).join('; ')
  const denied=await fetch('http://127.0.0.1:8081/api/v1/'+route('user')+'/status',{method:'PATCH',headers:{Cookie:cookies,Origin:base,Referer:base+'/','Sec-Fetch-Site':'cross-site','X-XSRF-TOKEN':'invalid-test-token',Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({status:'locked'})});assert.equal(denied.status,419)
  assert.deepEqual((await api(p,route('user'))).body.data,before)
 })
 await check('STATUS08-all-nonadmin-callers403',async()=>{
  for(const role of ['user','resident','technician','guard']){const q=role==='resident'?resident:await page();if(role!=='resident')await login(q,role);assert.equal((await api(q,route('guard')+'/status','PATCH',{status:'locked'})).status,403)}
 })
 await check('STATUS09-F5-and-list-read-persisted-status',async()=>{
  await detail(p,'guard');await change(p,'locked');await screenshot(p,'user-status-desktop');const begin=responses.length;await cdp('Page.reload',{},p.sessionId)
  const deadline=Date.now()+20000;while(!responses.slice(begin).some(r=>r.url==='/api/v1/'+route('guard')&&r.status===200)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100))
  assert.ok(responses.slice(begin).some(r=>r.url==='/api/v1/'+route('guard')&&r.status===200));await statusReady(p,'locked')
  await go(p,'/admin/users');await wait(p,`document.querySelector('a[href="/admin/users/${fixture.accounts.guard.id}"]')?.closest('tr')?.innerText.includes('Đã khóa')`,'locked status in list')
  await detail(p,'guard');await change(p,'active')
 })
 await check('STATUS10-offline-no-fake-success-retry',async()=>{
  await detail(p,'user');await click(p,'Khóa tài khoản');await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId);await click(p,'Xác nhận khóa')
  await wait(p,'document.querySelector("[role=dialog] [role=alert]")?.textContent.includes("kết nối")','network error');assert.equal(await evaluate(p,'!!document.querySelector("[role=dialog]")'),true)
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);assert.equal((await api(p,route('user'))).body.data.status,'active')
  await click(p,'Xác nhận khóa');await statusReady(p,'locked');await change(p,'active')
 })
 await check('STATUS11-in-flight-no-close-no-double-PATCH',async()=>{
  await detail(p,'technician');await click(p,'Khóa tài khoản');await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/users/*/status',requestStage:'Request'}]},p.sessionId)
  const start=paused.length;const responseStart=responses.length;await click(p,'Xác nhận khóa')
  const deadline=Date.now()+10000;while(!paused.slice(start).some(r=>r.session===p.sessionId)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50))
  const held=paused.slice(start).filter(r=>r.session===p.sessionId);assert.equal(held.length,1)
  await evaluate(p,'document.querySelector("[role=dialog] button[aria-label=Đóng]").click();document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));Array.from(document.querySelectorAll("[role=dialog] button")).find(b=>b.textContent.trim()==="Xác nhận khóa").click();true')
  assert.equal(await evaluate(p,'!!document.querySelector("[role=dialog]")'),true);assert.equal(paused.slice(start).length,1)
  await cdp('Fetch.continueRequest',{requestId:held[0].requestId},p.sessionId);await cdp('Fetch.disable',{},p.sessionId);await statusReady(p,'locked')
  assert.equal(responses.slice(responseStart).filter(r=>r.url.endsWith('/status')&&r.status===200).length,1);await change(p,'active')
 })
 await check('STATUS12-mobile-confirmation-actions-visible-no-overflow',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:667,deviceScaleFactor:1,mobile:true},p.sessionId);await detail(p,'guard');await click(p,'Khóa tài khoản')
  assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'),true)
  assert.equal(await evaluate(p,'(()=>{const b=Array.from(document.querySelectorAll("[role=dialog] button")).find(b=>b.textContent.trim()==="Xác nhận khóa").getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight})()'),true)
  await screenshot(p,'user-status-mobile');await click(p,'Hủy');assert.equal((await api(p,route('guard'))).body.data.status,'active')
 })
 await check('STATUS13-minimal-response-Admin-session-runtime',async()=>{
  const response=await api(p,route('technician')+'/status','PATCH',{status:'active'});assert.equal(response.status,200)
  assert.deepEqual(Object.keys(response.body.data).sort(),['id','full_name','email','phone','role','status','created_at','has_active_contract','active_contract'].sort())
  assert.equal((await api(p,'auth/me')).body.data.id,fixture.accounts.admin.id)
  assert.ok(requests.filter(r=>r.method==='PATCH'&&r.url.endsWith('/status')).some(r=>r.hasXsrfToken));assert.equal(exceptions.length,0)
 })
 console.log('User status browser PASS '+results.length+' cases on dedicated MySQL test')
}catch(error){results.push({result:'FAIL',reason:error.message});console.error('User status browser FAIL:',error.message);process.exitCode=1}
finally{report();for(const browserContextId of openedContexts)await cdp('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});await cdp('Browser.close').catch(()=>{});ws.close()}
