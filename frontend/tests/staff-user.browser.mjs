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
const artifacts = path.resolve('backups/staff-create-20261023')
const fixture = JSON.parse(fs.readFileSync(path.join(artifacts, 'fixtures.json'), 'utf8'))
const base = 'http://localhost:8081'
const port = fs.readFileSync(path.join(artifacts, 'chrome-profile-staff-mobile-actions/DevToolsActivePort'), 'utf8').split('\n')[0]
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
const results=[]
const created=[]
let buildAssets=[]
let mobileLayout
const report=()=>fs.writeFileSync(path.join(artifacts,'staff-user-results.json'),JSON.stringify({results,created,responses,requests,exceptions,buildAssets,mobileLayout},null,2))
async function check(id,run){if(process.env.STAFF_E2E_CASES&&!process.env.STAFF_E2E_CASES.split(',').some(prefix=>id.startsWith(prefix)))return;await run();results.push({id,result:'PASS'});console.log('PASS '+id);report()}
async function click(p,label){const expr=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)} && b.getClientRects().length && !b.disabled)`;await wait(p,`!!(${expr})`,'button '+label);await evaluate(p,expr+'.click();true')}
async function select(p,id,value){await evaluate(p,`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change',{bubbles:true}));true`)}
async function api(p,route,method='GET',body,csrf=true){return evaluate(p,`fetch('/api/v1/'+${JSON.stringify(route)},{method:${JSON.stringify(method)},headers:{Accept:'application/json','Content-Type':'application/json',...(document.cookie.includes('XSRF-TOKEN=')?{'X-XSRF-TOKEN':${csrf?`decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).slice(11))`:`'wrong-token'`}}:{})},${body?'body:'+JSON.stringify(JSON.stringify(body))+',':''}credentials:'same-origin'}).then(async r=>({status:r.status,body:await r.json().catch(()=>null)}))`)}
async function open(p){await click(p,'Tạo tài khoản nhân viên');await wait(p,'!!document.getElementById("staff-user-full_name")','staff modal')}
async function save(p){await evaluate(p,'document.querySelector("[role=dialog] form").requestSubmit();true')}
const password=fixture.password
const prefix='STAFF '+fixture.run+' '
const tech={full_name:prefix+'Technician',phone:fixture.register_phone,email:null,role:'technician',password,password_confirmation:password}
const guard={...tech,full_name:prefix+'Guard',phone:fixture.register_phone2,email:'staff-'+fixture.run+'@example.test',role:'guard'}
const offline={...tech,full_name:prefix+'Retry',phone:fixture.register_phone.slice(0,-1)+'9'}
const busy={...tech,full_name:prefix+'Busy',phone:'07'+fixture.register_phone.slice(2)}
async function form(p,input){
 await select(p,'staff-user-role',input.role)
 for(const field of ['full_name','phone','email','password','password_confirmation'])await fill(p,'staff-user-'+field,input[field]??'')
}
async function createdFromServer(p,input,before){
 await wait(p,'!document.querySelector("[role=dialog]")','creation modal closes')
 await wait(p,`document.querySelector('main').innerText.includes(${JSON.stringify('cho '+input.full_name)})`,'safe success message')
 await wait(p,`document.querySelector('tbody')?.innerText.includes(${JSON.stringify(input.full_name)})`,'refreshed list contains persisted staff')
 const response=await api(p,'users?q='+encodeURIComponent(input.full_name))
 assert.equal(response.status,200);const user=response.body.data.find(u=>u.full_name===input.full_name);assert.ok(user)
 assert.equal(user.phone,input.phone);assert.equal(user.role,input.role);assert.equal(user.status,'active');assert.equal(user.email,input.email)
 assert.equal(user.has_active_contract,false);assert.equal(user.active_contract,null)
 for(const key of ['password','password_confirmation','remember_token','id_number'])assert.equal(key in user,false)
 assert.ok(responses.slice(before).some(r=>r.url==='/api/v1/users'&&r.status===201))
 assert.ok(requests.some(r=>r.method==='POST'&&r.url==='/api/v1/users'&&r.hasXsrfToken))
 const refreshDeadline=Date.now()+10000
 while(responses.slice(before).filter(r=>r.url==='/api/v1/users'&&r.status===200).length<2&&Date.now()<refreshDeadline)await new Promise(r=>setTimeout(r,100))
 assert.ok(responses.slice(before).filter(r=>r.url==='/api/v1/users'&&r.status===200).length>=2)
 created.push({id:user.id,name:user.full_name,phone:user.phone,role:user.role});return user
}
try{
 const p=await page()
 await check('STAFF01-anonymous-POST401',async()=>{await go(p,'/login');await evaluate(p,"fetch('/sanctum/csrf-cookie').then(r=>r.status)");assert.equal((await api(p,'users','POST',tech)).status,401)})
 await login(p,'admin');await go(p,'/admin/users');await wait(p,'!!document.querySelector("tbody")','real users list')
 buildAssets=await evaluate(p,'Array.from(document.scripts).map(s=>s.src).filter(Boolean)')
 await check('STAFF02-modal-two-roles-password-hidden',async()=>{
  await open(p);assert.deepEqual(await evaluate(p,'Array.from(document.getElementById("staff-user-role").options).map(o=>o.value)'),['technician','guard'])
  assert.equal(await evaluate(p,'["password","password_confirmation"].every(f=>{const e=document.getElementById("staff-user-"+f);return e.type==="password"&&e.autocomplete==="new-password"})'),true)
  await screenshot(p,'staff-modal-desktop')
 })
 await check('STAFF03-invalid-confirmation-no-POST',async()=>{
  await form(p,{...tech,password_confirmation:'Mismatch-only-for-test'});const before=requests.length;await save(p)
  await wait(p,'document.getElementById("staff-user-password_confirmation-error").textContent.length>0','confirmation validation');assert.equal(requests.slice(before).some(r=>r.method==='POST'&&r.url==='/api/v1/users'),false)
 })
 await check('STAFF04-cancel-clears-password-state',async()=>{
  await click(p,'Hủy');await open(p);assert.equal(await evaluate(p,'document.getElementById("staff-user-password").value+document.getElementById("staff-user-password_confirmation").value'),'')
 })
 let techUser
 await check('STAFF05-create-technician-NULL-phone-normalized-refresh',async()=>{
  await form(p,{...tech,phone:'+84'+tech.phone.slice(1)});const before=responses.length;await save(p);techUser=await createdFromServer(p,tech,before)
 })
 await check('STAFF06-preserve-Admin-session-F5-detail',async()=>{
  const me=await api(p,'auth/me');assert.equal(me.body.data.id,fixture.accounts.admin.id);assert.equal(me.body.data.role,'admin')
  await go(p,'/admin/users/'+techUser.id);await wait(p,`document.querySelector('h1')?.textContent===${JSON.stringify(tech.full_name)}`,'real staff detail')
  await cdp('Page.reload',{},p.sessionId);await wait(p,`document.querySelector('h1')?.textContent===${JSON.stringify(tech.full_name)}`,'F5 staff detail');assert.ok(await evaluate(p,'document.querySelector("main").innerText.includes("Chưa có email")'))
  await go(p,'/admin/users');await wait(p,'!!document.querySelector("tbody")')
 })
 await check('STAFF07-create-guard-email-normalized',async()=>{
  await open(p);await form(p,{...guard,email:'  '+guard.email.toUpperCase()+'  '});const before=responses.length;await save(p);await createdFromServer(p,guard,before)
 })
 await check('STAFF08-duplicate-email422-existing-unchanged',async()=>{
  await open(p);await form(p,{...offline,email:guard.email});await save(p);await wait(p,'document.getElementById("staff-user-email-error").textContent.includes("sử dụng")','duplicate email')
  assert.ok(responses.some(r=>r.url==='/api/v1/users'&&r.status===422));assert.equal((await api(p,'users?q='+encodeURIComponent(guard.full_name))).body.data.length,1)
 })
 await check('STAFF09-duplicate-phone422-no-promotion',async()=>{
  await form(p,{...offline,phone:tech.phone,role:'guard'});await save(p);await wait(p,'document.getElementById("staff-user-phone-error").textContent.includes("sử dụng")','duplicate phone')
  assert.equal((await api(p,'users/'+techUser.id)).body.data.role,'technician');await click(p,'Hủy')
 })
 await check('STAFF10-forbidden-role422-CSRF419',async()=>{
  const denied=await api(p,'users','POST',{...offline,role:'admin'});assert.equal(denied.status,422);assert.ok(denied.body.errors.role)
  // Laravel 13 cho phép Sec-Fetch-Site:same-origin; ca giả mạo phải có cross-site.
  const cookies=(await cdp('Network.getCookies',{urls:[base]},p.sessionId)).cookies.map(item=>`${item.name}=${item.value}`).join('; ')
  const csrf=await fetch('http://127.0.0.1:8081/api/v1/users',{method:'POST',headers:{Cookie:cookies,Origin:base,Referer:base+'/','Sec-Fetch-Site':'cross-site','X-XSRF-TOKEN':'invalid-test-token',Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(offline)})
  assert.equal(csrf.status,419)
  assert.equal((await api(p,'users?q='+encodeURIComponent(offline.full_name))).body.data.length,0)
 })
 await check('STAFF11-new-staff-login-separate-cookie-jar-403',async()=>{
  const q=await page();await go(q,'/login');await wait(q,'!!document.querySelector("#identifier") && !document.querySelector("button[type=submit]").disabled')
  await fill(q,'identifier',tech.phone);await fill(q,'password',password);await submit(q);await wait(q,'location.pathname==="/account/profile"','new technician login')
  assert.equal((await api(q,'auth/me')).body.data.id,techUser.id);assert.equal((await api(q,'users')).status,403);assert.equal((await api(q,'users','POST',offline)).status,403)
  assert.equal((await api(p,'auth/me')).body.data.id,fixture.accounts.admin.id)
 })
 await check('STAFF12-offline-save-no-fake-success-retry',async()=>{
  await open(p);await form(p,offline);await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId);await save(p)
  await wait(p,'document.querySelector("[role=dialog] [role=alert]")?.textContent.includes("kết nối")','offline error');assert.ok(await evaluate(p,'!!document.querySelector("[role=dialog]")'))
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId)
  assert.equal((await api(p,'users?q='+encodeURIComponent(offline.full_name))).body.data.length,0);const before=responses.length;await save(p);await createdFromServer(p,offline,before)
 })
 await check('STAFF13-in-flight-close-and-double-submit-blocked',async()=>{
  await open(p);await form(p,busy);await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/users',requestStage:'Request'}]},p.sessionId)
  const beforePaused=paused.length;const before=responses.length;await save(p)
  const deadline=Date.now()+10000;while(!paused.slice(beforePaused).some(r=>r.session===p.sessionId&&r.request.method==='POST')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50))
  const held=paused.slice(beforePaused).filter(r=>r.session===p.sessionId&&r.request.method==='POST');assert.equal(held.length,1)
  assert.equal(await evaluate(p,'document.querySelector("[role=dialog] fieldset").disabled'),true)
  await evaluate(p,'document.querySelector("[role=dialog] button[aria-label=Đóng]").click();document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));document.querySelector("[role=dialog] form").requestSubmit();true')
  assert.equal(await evaluate(p,'!!document.querySelector("[role=dialog]")'),true)
  assert.equal(paused.slice(beforePaused).filter(r=>r.request.method==='POST').length,1)
  await cdp('Fetch.continueRequest',{requestId:held[0].requestId},p.sessionId);await cdp('Fetch.disable',{},p.sessionId);await createdFromServer(p,busy,before)
  assert.equal(responses.slice(before).filter(r=>r.url==='/api/v1/users'&&r.status===201).length,1)
 })
 await check('STAFF14-mobile-scroll-no-credential-leak-runtime',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},p.sessionId);await open(p);await form(p,tech)
  mobileLayout=await evaluate(p,'(()=>{const f=document.querySelector("[role=dialog] form");return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,formHeight:f.clientHeight,formContent:f.scrollHeight,overflowY:getComputedStyle(f).overflowY}})()');await screenshot(p,'staff-modal-mobile-tall')
  assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'),true)
  assert.equal(mobileLayout.overflowY,'auto')
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:667,deviceScaleFactor:1,mobile:true},p.sessionId)
  await wait(p,'innerHeight===667','short mobile viewport')
  assert.equal(await evaluate(p,'(()=>{const f=document.querySelector("[role=dialog] form");return f.scrollHeight>f.clientHeight&&getComputedStyle(f).overflowY==="auto"})()'),true)
  assert.equal(await evaluate(p,`document.body.innerText.includes(${JSON.stringify(password)})||location.href.includes(${JSON.stringify(password)})||JSON.stringify({...localStorage,...sessionStorage}).includes(${JSON.stringify(password)})`),false)
  await screenshot(p,'staff-modal-mobile')
  await evaluate(p,'const f=document.querySelector("[role=dialog] form");f.scrollTop=f.scrollHeight;true')
  await wait(p,'(()=>{const f=document.querySelector("[role=dialog] form");return f.scrollTop+f.clientHeight>=f.scrollHeight-1})()','mobile form scroll reaches actions')
  assert.equal(await evaluate(p,'(()=>{const r=document.querySelector("[role=dialog] button[type=submit]").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()'),true)
  await screenshot(p,'staff-modal-mobile-actions');await click(p,'Hủy');await open(p);assert.equal(await evaluate(p,'document.getElementById("staff-user-password").value'),'');await click(p,'Hủy')
  assert.equal(exceptions.length,0)
 })
 console.log('Staff browser PASS '+results.length+' cases on isolated MySQL test')
}catch(error){results.push({result:'FAIL',reason:error.message});console.error('Staff browser FAIL:',error.message);process.exitCode=1}
finally{report();for(const browserContextId of openedContexts)await cdp('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});await cdp('Browser.close').catch(()=>{});ws.close()}
