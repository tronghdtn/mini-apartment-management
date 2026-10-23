/** Chạy sau backend tests, chỉ với app/Nginx cô lập đã xác minh DB test.
 * Không thêm thư viện: Chrome CDP + WebSocket/Node 24. Không in mật khẩu/cookie.
 */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

if (process.env.AUTH_E2E_CONFIRMED_TEST_DB !== 'mini_apartment_test') throw new Error('Require verified dedicated test DB before browser test')
const artifacts = path.resolve('backups/auth-step4-e2e')
const fixture = JSON.parse(fs.readFileSync(path.join(artifacts, 'fixtures.json'), 'utf8'))
const base = 'http://localhost:8081'
const port = fs.readFileSync(path.join(artifacts, 'chrome-profile/DevToolsActivePort'), 'utf8').split('\n')[0]
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
async function page() {
 const {browserContextId}=await cdp('Target.createBrowserContext')
 const {targetId}=await cdp('Target.createTarget',{url:'about:blank',browserContextId})
 const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true})
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId)
 await cdp('Page.enable',{},sessionId); await cdp('Runtime.enable',{},sessionId); await cdp('Network.enable',{},sessionId)
 return {browserContextId,sessionId}
}
async function evaluate(p, expression) {
 const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},p.sessionId)
 if (result.exceptionDetails) throw new Error('Browser script failed')
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
 await evaluate(p,`document.getElementById(${JSON.stringify(id)}).focus(); document.getElementById(${JSON.stringify(id)}).select(); true`)
 if (text) await cdp('Input.insertText',{text},p.sessionId)
 else { await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',windowsVirtualKeyCode:8},p.sessionId); await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',windowsVirtualKeyCode:8},p.sessionId) }
}
async function submit(p) { await evaluate(p,'document.querySelector("form").requestSubmit(); true') }
async function signOut(p) {
 if (!await evaluate(p,`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Đăng xuất') && b.getClientRects().length)`)) {
   await evaluate(p,`Array.from(document.querySelectorAll('button[aria-label="Menu"]')).find(b=>b.getClientRects().length).click(); true`)
 }
 await evaluate(p,`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Đăng xuất') && b.getClientRects().length).click(); true`)
 await wait(p,'location.pathname === "/" && !!document.querySelector("#root")?.firstElementChild','logout navigation')
}
async function login(p,role,identifier='email') {
 await go(p,'/login'); await wait(p,'!!document.querySelector("#identifier") && !document.querySelector("button[type=submit]").disabled','login ready')
 await fill(p,'identifier',fixture.accounts[role][identifier]); await fill(p,'password',fixture.password); await submit(p)
 await wait(p,role==='admin'?'location.pathname === "/admin"':'location.pathname === "/account/profile"','login role destination')
}
async function screenshot(p,name) {
 const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},p.sessionId)
 fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(result.data,'base64'))
}
function mutateStatus(role,status) {
 const result=spawnSync('docker',['exec','mini-apartment-auth-test-app','php','tests/Support/AuthBrowserFixtures.php','status','/tmp/auth-step4-fixtures.json',role,status],{encoding:'utf8'})
 assert.equal(result.status,0,'guarded test fixture mutation')
}
async function waitPaused(p, predicate) {
 const deadline=Date.now()+20000
 while (Date.now()<deadline) {
  const index=paused.findIndex(item=>item.session===p.sessionId && predicate(item))
  if (index>=0) return paused.splice(index,1)[0]
  await new Promise(r=>setTimeout(r,100))
 }
 throw new Error('Expected intercepted test request did not arrive')
}
const results=[]
async function check(id, fn) {
 if (process.env.AUTH_E2E_CASE && process.env.AUTH_E2E_CASE !== id) return
 await fn(); results.push({id,result:'PASS'}); console.log(`PASS ${id}`)
 fs.writeFileSync(path.join(artifacts,'browser-results.json'),JSON.stringify({results,responses,requests,exceptions},null,2))
}
try {
 const old=await cdp('Target.getBrowserContexts')
 for (const browserContextId of old.browserContextIds) await cdp('Target.disposeBrowserContext',{browserContextId})
 const p=await page()
 await check('B01-anonymous-admin-guard',async()=>{
  await go(p,'/admin'); await wait(p,'location.pathname === "/login" && !!document.querySelector("#identifier")','anonymous redirect')
  assert.equal(await evaluate(p,'document.body.innerText.includes("Truy Cập Nhanh Prototype")'),false)
  assert.equal(await evaluate(p,'document.getElementById("identifier").value'), '')
  assert.equal(await evaluate(p,'document.getElementById("password").value'), '')
  await screenshot(p,'login-desktop')
 })
 await check('B02-client-validation-no-request',async()=>{
  const start=responses.filter(r=>r.url.endsWith('/login')).length
  await submit(p); await wait(p,'document.getElementById("identifier-error").textContent.length>0','required identifier')
  assert.equal(responses.filter(r=>r.url.endsWith('/login')).length,start)
 })
 await check('B03-register-no-email-autologin-and-profile',async()=>{
  await go(p,'/register'); await wait(p,'!!document.getElementById("full_name") && !document.querySelector("button[type=submit]").disabled','registration ready')
  await fill(p,'full_name','AuthStep4 '+fixture.run+' registered'); await fill(p,'phone',fixture.register_phone)
  await fill(p,'password',fixture.password); await fill(p,'password_confirmation','mismatch'); await fill(p,'email','invalid')
  const start=responses.filter(r=>r.url.endsWith('/register')).length
  await submit(p); await wait(p,'document.getElementById("email-error").textContent.length>0 && document.getElementById("password_confirmation-error").textContent.length>0','client register errors')
  assert.equal(responses.filter(r=>r.url.endsWith('/register')).length,start)
  await fill(p,'email',''); await fill(p,'password_confirmation',fixture.password)
  await submit(p); await wait(p,'location.pathname === "/account/profile"','auto login account')
  await wait(p,'document.body.innerText.includes("Chưa cung cấp email")','nullable email')
  assert.equal(await evaluate(p,'document.querySelectorAll("main input, main form").length'),0)
  assert.equal(responses.some(r=>r.url.endsWith('/register')&&r.status===201),true)
  const cookies=await cdp('Network.getCookies',{urls:[base]},p.sessionId)
  assert.equal(cookies.cookies.some(c=>c.name==='mini_apartment_auth_e2e'&&c.httpOnly),true)
  assert.equal(cookies.cookies.some(c=>c.name==='XSRF-TOKEN'),true)
 })
 await check('B04-refresh-cookie-and-no-role-escalation',async()=>{
  await go(p,'/account/profile'); await wait(p,'document.body.innerText.includes("Chưa cung cấp email")','restored profile')
  assert.equal(await evaluate(p,`document.body.innerText.includes(${JSON.stringify('AuthStep4 '+fixture.run+' registered')})`),true)
  await go(p,'/admin'); await wait(p,'document.body.innerText.includes("không có quyền")','wrong role')
 })
 await check('B05-mobile-account-no-overflow',async()=>{
  for (const width of [320,375,390]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true},p.sessionId)
    await go(p,'/account/profile'); await wait(p,'document.body.innerText.includes("Chưa cung cấp email")','mobile account')
    assert.equal(await evaluate(p,'document.documentElement.scrollWidth <= innerWidth'),true,`no overflow at ${width}px`)
  }
  await screenshot(p,'account-mobile')
  await cdp('Emulation.clearDeviceMetricsOverride',{},p.sessionId)
 })
 await check('B06-logout-session-invalid',async()=>{
  await signOut(p)
  const status=await evaluate(p,`fetch('/api/v1/auth/me',{headers:{Accept:'application/json'}}).then(r=>r.status)`)
  assert.equal(status,401)
  await go(p,'/account/profile'); await wait(p,'location.pathname === "/login"','guard after logout')
 })
 await check('B07-email-login-user-and-phone-login',async()=>{
  await login(p,'user'); await signOut(p); await login(p,'user','phone')
  assert.equal(await evaluate(p,`document.body.innerText.includes(${JSON.stringify(fixture.accounts.user.name)})`),true)
  await signOut(p)
 })
 await check('B08-server-422-field-error',async()=>{
  await go(p,'/register'); await wait(p,'!!document.getElementById("full_name") && !document.querySelector("button[type=submit]").disabled','registration ready')
  for(const [key,value] of Object.entries({full_name:'AuthStep4 '+fixture.run+' duplicate',phone:fixture.register_phone2,email:fixture.accounts.user.email,password:fixture.password,password_confirmation:fixture.password})) await fill(p,key,value)
  await submit(p); await wait(p,'document.getElementById("email-error").textContent.length>0','duplicate email 422')
  assert.equal(await evaluate(p,'location.pathname'), '/register')
  assert.equal(responses.some(r=>r.url.endsWith('/register')&&r.status===422),true)
  await fill(p,'phone',fixture.accounts.user.phone); await fill(p,'email','auth-step4-'+fixture.run+'-new@example.test'); await submit(p)
  await wait(p,'document.getElementById("phone-error").textContent.length>0','duplicate phone 422')
 })
 await check('B08b-register-email-normalized',async()=>{
  await fill(p,'phone',fixture.register_phone2); await fill(p,'email','AUTH-STEP4-'+fixture.run+'#NEW@EXAMPLE.TEST'); await submit(p)
  await wait(p,'location.pathname === "/account/profile"','email registration auto login')
  assert.equal(await evaluate(p,`document.body.innerText.includes(${JSON.stringify('auth-step4-'+fixture.run+'#new@example.test')})`),true)
  await signOut(p)
 })
 await check('B09-five-role-landings-no-fake-staff-data',async()=>{
  for(const role of ['resident','technician','guard']) {
    await login(p,role)
    await wait(p,'document.body.innerText.includes("chưa hoàn thiện")','temporary account notice')
    assert.equal(await evaluate(p,`document.body.innerText.includes(${JSON.stringify(fixture.accounts[role].name)})`),true)
    assert.equal(await evaluate(p,'document.querySelectorAll("main input, main table").length'),0)
    await signOut(p)
  }
  await login(p,'admin'); await wait(p,'document.body.innerText.includes("dữ liệu minh họa")','admin demo distinction')
  assert.equal(await evaluate(p,`document.body.innerText.includes(${JSON.stringify(fixture.accounts.admin.name)})`),true)
  assert.equal(await evaluate(p,'document.body.innerText.includes("Đổi vai trò")'),false)
  await screenshot(p,'admin-demo-labeled'); await signOut(p)
 })
 await check('B10-locked-after-login-and-login-forbidden',async()=>{
  await login(p,'technician'); mutateStatus('technician','locked')
  await go(p,'/account/profile'); await wait(p,'location.pathname === "/login"','locked session invalidated')
  await fill(p,'identifier',fixture.accounts.technician.email); await fill(p,'password',fixture.password); await submit(p)
  await wait(p,'!!document.querySelector("[role=alert]") && document.querySelector("[role=alert]").textContent.includes("khóa")','locked login 403')
  mutateStatus('technician','active')
 })
 await check('B11-real-cross-origin-csrf-rejection',async()=>{
  const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Origin:'https://untrusted.example.test'},body:JSON.stringify({identifier:'unused@example.test',password:'irrelevant'})})
  assert.equal(response.status,419)
 })
 await check('B12-real-rate-limit-429-ui',async()=>{
  await go(p,'/login'); await wait(p,'!!document.getElementById("identifier") && !document.querySelector("button[type=submit]").disabled','login ready')
  await fill(p,'identifier','ratelimit-'+fixture.run+'@example.test'); await fill(p,'password',fixture.password)
  for(let i=0;i<6;i++) {
    const start=responses.length; await submit(p)
    await wait(p,'!document.querySelector("button[type=submit]").disabled','submit finished')
    const deadline=Date.now()+10000
    while (!responses.slice(start).some(r=>r.url.endsWith('/login')) && Date.now()<deadline) await new Promise(r=>setTimeout(r,100))
  }
  await wait(p,'!!document.querySelector("[role=alert]") && document.querySelector("[role=alert]").textContent.includes("quá nhiều")','429 user message')
  assert.equal(responses.some(r=>r.url.endsWith('/login')&&r.status===429),true)
 })
 const q=await page()
 await check('B13-login-focus-race-and-xsrf-header',async()=>{
  await go(q,'/login'); await wait(q,'!!document.getElementById("identifier") && !document.querySelector("button[type=submit]").disabled','login ready')
  await fill(q,'identifier',fixture.accounts.user.email); await fill(q,'password',fixture.password)
  await cdp('Fetch.enable',{patterns:[{urlPattern:base+'/api/v1/auth/login',requestStage:'Response'}]},q.sessionId)
  await submit(q)
  const held=await waitPaused(q,item=>item.request.url.endsWith('/login') && item.responseStatusCode===200)
  const before=requests.filter(r=>r.session===q.sessionId&&r.url.endsWith('/me')).length
  await evaluate(q,'window.dispatchEvent(new Event("focus")); true')
  await new Promise(r=>setTimeout(r,500))
  assert.equal(requests.filter(r=>r.session===q.sessionId&&r.url.endsWith('/me')).length,before,'do not revalidate anonymous cookie while login pending')
  await cdp('Fetch.continueResponse',{requestId:held.requestId},q.sessionId)
  await cdp('Fetch.disable',{},q.sessionId)
  await wait(q,'location.pathname === "/account/profile"','login response accepted')
  assert.equal(requests.some(r=>r.session===q.sessionId&&r.url.endsWith('/login')&&r.hasXsrfToken),true)
  await signOut(q)
 })
 await check('B14-background-refresh-keeps-form-mounted',async()=>{
  await login(q,'admin'); await go(q,'/admin/rooms'); await wait(q,'!!document.querySelector("main input")','room search')
  await evaluate(q,'document.querySelector("main input").id="e2e-draft"; true')
  await fill(q,'e2e-draft','AuthStep4Draft')
  const before=responses.filter(r=>r.session===q.sessionId&&r.url.endsWith('/me')).length
  await evaluate(q,'window.dispatchEvent(new Event("focus")); true')
  const deadline=Date.now()+10000
  while (responses.filter(r=>r.session===q.sessionId&&r.url.endsWith('/me')).length===before && Date.now()<deadline) await new Promise(r=>setTimeout(r,100))
  assert.ok(responses.filter(r=>r.session===q.sessionId&&r.url.endsWith('/me')).length>before)
  assert.equal(await evaluate(q,'document.getElementById("e2e-draft")?.value'), 'AuthStep4Draft')
 })
 await check('B15-offline-logout-does-not-fake-success',async()=>{
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},q.sessionId)
  await evaluate(q,`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Đăng xuất') && b.getClientRects().length).click(); true`)
  await wait(q,'!!document.querySelector("[role=alert]") && document.querySelector("[role=alert]").textContent.includes("kết nối")','logout network error')
  assert.equal(await evaluate(q,'location.pathname'), '/admin/rooms')
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},q.sessionId)
  await signOut(q)
 })
 await check('B16-real-419-displayed-no-fake-login',async()=>{
  await go(q,'/login'); await wait(q,'!!document.getElementById("identifier") && !document.querySelector("button[type=submit]").disabled','login ready')
  await fill(q,'identifier',fixture.accounts.user.email); await fill(q,'password',fixture.password)
  await cdp('Fetch.enable',{patterns:[{urlPattern:base+'/api/v1/auth/login',requestStage:'Request'}]},q.sessionId)
  await submit(q)
  const held=await waitPaused(q,item=>item.request.url.endsWith('/login'))
  // Chrome tái tạo Sec-Fetch-Site khi tiếp tục request. Relay bằng Node để
  // làm hỏng header có kiểm soát và chuyển nguyên phản hồi THẬT từ Laravel.
  const headers=Object.fromEntries(Object.entries(held.request.headers).filter(([name])=>!['host','content-length','sec-fetch-site','x-xsrf-token'].includes(name.toLowerCase())))
  headers['Sec-Fetch-Site']='cross-site'; headers['X-XSRF-TOKEN']='invalid-test-token'
  const rejected=await fetch(held.request.url,{method:held.request.method,headers,body:held.request.postData})
  assert.equal(rejected.status,419,'real Laravel CSRF rejection before relaying to browser')
  await cdp('Fetch.fulfillRequest',{requestId:held.requestId,responseCode:rejected.status,responsePhrase:'Page Expired',responseHeaders:[{name:'Content-Type',value:rejected.headers.get('content-type') || 'application/json'}],body:Buffer.from(await rejected.arrayBuffer()).toString('base64')},q.sessionId)
  await cdp('Fetch.disable',{},q.sessionId)
  await wait(q,'!!document.querySelector("[role=alert]") && document.querySelector("[role=alert]").textContent.includes("bảo mật")','419 UI')
  assert.equal(await evaluate(q,'location.pathname'),'/login')
  assert.equal(responses.some(r=>r.session===q.sessionId&&r.url.endsWith('/login')&&r.status===419),true)
 })
 assert.equal(exceptions.length,0,'no uncaught browser runtime errors')
 console.log(`Browser PASS ${results.length} cases through Nginx -> Laravel -> MySQL test`)
} catch(error) {
 console.error('Browser FAIL:',error.message)
 fs.writeFileSync(path.join(artifacts,'browser-results.json'),JSON.stringify({results,responses,requests,exceptions,failure:error.message},null,2))
 process.exitCode=1
} finally {
 const contexts=await cdp('Target.getBrowserContexts')
 for (const browserContextId of contexts.browserContextIds) await cdp('Target.disposeBrowserContext',{browserContextId})
 ws.close()
}
