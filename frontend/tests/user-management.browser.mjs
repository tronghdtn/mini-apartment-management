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
const artifacts = path.resolve('backups/user-management-20261023')
const fixture = JSON.parse(fs.readFileSync(path.join(artifacts, 'fixtures.json'), 'utf8'))
const base = 'http://localhost:8081'
const port = fs.readFileSync(path.join(artifacts, 'chrome-profile-ipv4/DevToolsActivePort'), 'utf8').split('\n')[0]
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

const results=[]
let buildAssets=[]
const report=()=>fs.writeFileSync(path.join(artifacts,'user-management-results.json'),JSON.stringify({results,responses,requests,exceptions,buildAssets},null,2))
const usr=fixture.usr
const queryPrefix='USR '+fixture.run
async function check(id,run){await run();results.push({id,result:'PASS'});console.log('PASS '+id);report()}
async function request(p,route){return evaluate(p,`fetch('/api/v1/'+${JSON.stringify(route)},{headers:{Accept:'application/json'}}).then(async r=>({status:r.status,body:await r.json()}))`)}
async function click(p,label){const expr=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)} && b.getClientRects().length && !b.disabled)`;await wait(p,`!!(${expr})`,'button '+label);await evaluate(p,expr+'.click();true')}
async function select(p,id,value){await evaluate(p,`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change',{bubbles:true}));true`)}
async function rowsReady(p,count){await wait(p,`document.querySelectorAll('tbody tr').length===${count} && !!document.querySelector('nav[aria-label="Phân trang tài khoản"]')`,'loaded rows '+count)}
async function search(p,q,count){await fill(p,'user-q',q);await click(p,'Tìm kiếm');await rowsReady(p,count)}
async function detailReady(p,user){await wait(p,`document.querySelector('h1')?.textContent===${JSON.stringify(user.name)}`,'real account detail')}
async function freshResponse(route,before){const deadline=Date.now()+60000;while(Date.now()<deadline){if(responses.filter(r=>r.url===route&&r.status===200).length>before)return;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('No fresh API response after reload')}
try {
 const p=await page()
 await check('USR01-anonymous401-and-admin-route-redirect',async()=>{
  await go(p,'/admin/users');await wait(p,'location.pathname==="/login"')
  assert.equal((await request(p,'users')).status,401);assert.equal((await request(p,'users/'+usr.active.id)).status,401)
 })
 await check('USR02-admin-list-real-paginated-readonly-resource',async()=>{
  await login(p,'admin');await go(p,'/admin/users');await rowsReady(p,20)
  buildAssets=await evaluate(p,'Array.from(document.scripts).map(s=>s.src).filter(src=>src.includes("/assets/index-"))')
  const list=await request(p,'users');assert.equal(list.status,200);assert.equal(list.body.meta.per_page,20);assert.ok(list.body.meta.total>=28)
  assert.ok(list.body.data.some(row=>row.id===fixture.accounts.admin.id))
  for(const row of list.body.data)for(const field of ['id_number','date_of_birth','gender','permanent_address','password','remember_token'])assert.equal(field in row,false)
  assert.equal(await evaluate(p,'Array.from(document.querySelectorAll("button")).some(b=>["Thêm người dùng","Cấp tài khoản","Khóa tài khoản"].includes(b.textContent.trim()))'),false)
  assert.ok(await evaluate(p,'document.body.innerText.includes("API thật")'))
 })
 await check('USR03-search-prefix-and-actual-page-two',async()=>{
  await search(p,queryPrefix,20);await wait(p,`document.querySelector('nav[aria-label="Phân trang tài khoản"]').innerText.includes("23 tài khoản")`)
  await click(p,'Trang sau');await rowsReady(p,3)
  for(const user of [usr.active,usr.former,usr.locked]) assert.ok(await evaluate(p,`document.querySelector('tbody').innerText.includes(${JSON.stringify(user.name)})`))
  await screenshot(p,'users-desktop-page-two')
 })
 await check('USR04-combined-filters-reset-page-and-show-real-active-room',async()=>{
  await select(p,'user-role','resident');await select(p,'user-status','active');await select(p,'user-has_active_contract','1');await click(p,'Tìm kiếm');await rowsReady(p,1)
  const text=await evaluate(p,'document.querySelector("tbody").innerText');assert.ok(text.includes(usr.active.name));assert.ok(text.includes(usr.room_code));assert.ok(text.includes(usr.building_name));assert.ok(text.includes('Chưa có email'))
  assert.ok(await evaluate(p,`document.querySelector('nav[aria-label="Phân trang tài khoản"]').innerText.includes("Trang 1/1")`))
  const data=await request(p,'users?'+new URLSearchParams({q:queryPrefix,role:'resident',status:'active',has_active_contract:'1'}));assert.equal(data.body.data.length,1);assert.equal(data.body.data[0].id,usr.active.id);assert.equal(data.body.data[0].active_contract.room.id,usr.room)
 })
 await check('USR05-former-resident-not-currently-renting',async()=>{
  await select(p,'user-has_active_contract','0');await click(p,'Tìm kiếm');await rowsReady(p,1)
  await wait(p,`document.querySelector('tbody').innerText.includes(${JSON.stringify(usr.former.name)})`)
  const text=await evaluate(p,'document.querySelector("tbody").innerText');assert.ok(text.includes(usr.former.name));assert.ok(text.includes('Không đang thuê'));assert.equal(text.includes(usr.room_code),false)
 })
 await check('USR06-clear-filters-restores-all-accounts-page-one',async()=>{
  await click(p,'Xóa bộ lọc');await rowsReady(p,20)
  for(const id of ['user-q','user-role','user-status','user-has_active_contract'])assert.equal(await evaluate(p,`document.getElementById(${JSON.stringify(id)}).value`),'')
  assert.ok(await evaluate(p,`document.querySelector('nav[aria-label="Phân trang tài khoản"]').innerText.includes("Trang 1/")`))
 })
 await check('USR07-search-name-email-phone-and-literal-percent-underscore-backslash',async()=>{
  for(const [needle,expected] of [[usr.users[0].name,usr.users[0]],[usr.former.email,usr.former],[usr.active.phone,usr.active],['%',usr.active],['_',usr.active],['\\',usr.active]]){
   await search(p,needle,1);await wait(p,`document.querySelector('tbody').innerText.includes(${JSON.stringify(expected.name)})`)
   const result=await request(p,'users?'+new URLSearchParams({q:needle}));assert.equal(result.body.data.length,1);assert.equal(result.body.data[0].id,expected.id)
  }
 })
 await check('USR08-invalid-search-blocked-locally-and-empty-search-has-no-fallback',async()=>{
  const before=requests.filter(r=>r.url==='/api/v1/users').length
  await fill(p,'user-q','a'.repeat(192));await click(p,'Tìm kiếm');await wait(p,'document.getElementById("user-q-error").textContent.includes("191")')
  assert.equal(requests.filter(r=>r.url==='/api/v1/users').length,before)
  await search(p,'ABSENT-USR-'+fixture.run,1);await wait(p,'document.querySelector("tbody").innerText.includes("Không có tài khoản phù hợp.")')
 })
 await check('USR09-admin-only-legal-detail-real-room-and-readonly-ui',async()=>{
  await go(p,'/admin/users/'+usr.active.id);await detailReady(p,usr.active)
  const text=await evaluate(p,'document.querySelector("main").innerText');for(const value of ['012345678901','legacy','Địa chỉ hồ sơ kiểm thử',usr.room_code,usr.building_name,'Chưa có email'])assert.ok(text.includes(value))
  assert.equal(await evaluate(p,'document.querySelectorAll("main form").length'),0)
  const detail=await request(p,'users/'+usr.active.id);assert.equal(detail.body.data.date_of_birth,'1998-01-02');assert.equal(detail.body.data.id_number,'012345678901');assert.equal(detail.body.data.email,null)
  for(const field of ['password','remember_token','files','payments'])assert.equal(field in detail.body.data,false)
  const me=await request(p,'auth/me');for(const field of ['id_number','date_of_birth','gender','permanent_address'])assert.equal(field in me.body.data,false)
 })
 await check('USR10-detail-f5-keeps-real-id-profile-and-tenancy',async()=>{
  const before=responses.filter(r=>r.url==='/api/v1/users/'+usr.active.id&&r.status===200).length
  await go(p,'/admin/users/'+usr.active.id);await freshResponse('/api/v1/users/'+usr.active.id,before);await detailReady(p,usr.active);assert.ok(await evaluate(p,`document.querySelector('main').innerText.includes(${JSON.stringify(usr.room_code)})`));await screenshot(p,'user-detail-desktop')
 })
 await check('USR11-detail404-no-sample-fallback-and-former-detail',async()=>{
  await go(p,'/admin/users/999999999');await wait(p,'document.querySelector("h1")?.textContent==="Không tìm thấy tài khoản"');assert.equal(await evaluate(p,`document.querySelector('main').innerText.includes(${JSON.stringify(usr.active.name)})`),false)
  await go(p,'/admin/users/'+usr.former.id);await detailReady(p,usr.former);assert.ok(await evaluate(p,'document.querySelector("main").innerText.includes("Không đang thuê")'));assert.ok(await evaluate(p,'document.querySelector("main").innerText.includes("Cư dân")'))
 })
 await check('USR12-mobile-detail-and-horizontal-table-contained',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},p.sessionId)
  await go(p,'/admin/users/'+usr.active.id);await detailReady(p,usr.active);assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'),true);await screenshot(p,'user-detail-mobile')
  await go(p,'/admin/users');await rowsReady(p,20);assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'),true)
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},p.sessionId)
 })
 await check('USR13-nonadmin-backend403-and-react-guard',async()=>{
  const q=await page();await login(q,'user');for(const route of ['users','users/'+usr.active.id])assert.equal((await request(q,route)).status,403)
  await go(q,'/admin/users/'+usr.active.id);await wait(q,'document.body.innerText.includes("không có quyền")');assert.equal(await evaluate(q,'document.body.innerText.includes("012345678901")'),false)
 })
 await check('USR14-list-offline-error-retry-no-stale-success',async()=>{
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId);await click(p,'Tìm kiếm')
  await wait(p,'Array.from(document.querySelectorAll("[role=alert]")).some(e=>e.textContent.includes("kết nối"))');assert.equal(await evaluate(p,'!!document.querySelector("tbody")'),false)
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);await click(p,'Thử lại');await rowsReady(p,20)
 })
 await check('USR15-detail-offline-navigation-retry-without-fallback',async()=>{
  await search(p,queryPrefix,20);await click(p,'Trang sau');await rowsReady(p,3)
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId)
  await evaluate(p,`document.querySelector('a[href="/admin/users/${usr.active.id}"]').click();true`)
  await wait(p,'document.querySelector("h1")?.textContent==="Chưa tải được hồ sơ tài khoản"');assert.equal(await evaluate(p,'document.querySelector("main").innerText.includes("012345678901")'),false)
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);await click(p,'Thử lại');await detailReady(p,usr.active)
 })
 await check('USR16-no-user-mutation-requests-issued',async()=>{
  const userRequests=requests.filter(r=>r.url==='/api/v1/users'||r.url.startsWith('/api/v1/users/'));assert.ok(userRequests.length>15);assert.ok(userRequests.every(r=>r.method==='GET'));assert.equal(exceptions.length,0)
 })
 console.log('USR browser PASS '+results.length+' cases on isolated MySQL test')
}catch(error){results.push({result:'FAIL',reason:error.message});console.error('USR browser FAIL:',error.message);process.exitCode=1}
finally{report();for(const browserContextId of openedContexts)await cdp('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});await cdp('Browser.close').catch(()=>{});ws.close()}
