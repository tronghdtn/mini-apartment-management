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
const artifacts = path.resolve('backups/checkpoint-ctr-20261024')
const fixture = JSON.parse(fs.readFileSync(path.join(artifacts, 'fixtures.json'), 'utf8'))
const base = 'http://localhost:8081'
const port = fs.readFileSync(path.join(artifacts, 'chrome-profile-contracts/DevToolsActivePort'), 'utf8').split('\n')[0]
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
const contractsFixture = JSON.parse(fs.readFileSync(path.join(artifacts, 'contracts-fixtures.json'), 'utf8'))
const results=[]
let buildAssets=[]
const report=()=>fs.writeFileSync(path.join(artifacts,'contracts-results.json'),JSON.stringify({results,responses,requests,exceptions,buildAssets},null,2))
async function check(id,run){await run();results.push({id,result:'PASS'});console.log('PASS '+id);report()}
async function click(p,label){const expr=`Array.from(document.querySelectorAll('button')).find(b=>(b.textContent.trim()===${JSON.stringify(label)}||(b.closest('nav[aria-label="Các bước lập hợp đồng nháp"]')&&b.textContent.trim().endsWith(${JSON.stringify(label)})))&&b.getClientRects().length&&!b.disabled)`;await wait(p,`!!(${expr})`,'button '+label);await evaluate(p,expr+'.click();true')}
async function select(p,id,value){await evaluate(p,`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(String(value))};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change',{bubbles:true}));true`)}
async function responseAfter(url,status,start){const deadline=Date.now()+60000;while(!responses.slice(start).some(r=>r.url===url&&r.status===status)){if(Date.now()>deadline)throw new Error('Missing fresh response '+url);await new Promise(r=>setTimeout(r,50))}}
async function api(p,route,method='GET',body){return evaluate(p,`fetch('/api/v1/'+${JSON.stringify(route)},{method:${JSON.stringify(method)},headers:{Accept:'application/json','Content-Type':'application/json',...(document.cookie.includes('XSRF-TOKEN=')?{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).slice(11))}:{})},${body?'body:'+JSON.stringify(JSON.stringify(body))+',':''}credentials:'same-origin'}).then(async r=>({status:r.status,body:await r.json().catch(()=>null)}))`)}
async function detail(p,id){await go(p,'/admin/contracts/'+id);await wait(p,'document.querySelector("h1")?.textContent.startsWith("Hợp Đồng Thuê Phòng ")','detail actual GET')}
async function edit(p,id){await go(p,'/admin/contracts/'+id+'/edit');await wait(p,'!!document.getElementById("contract-room_id")','edit form');await click(p,'Thời hạn & tiền')}
let createdId
try {
 const p=await page()
 await check('CTR01-anonymous401-routeguard',async()=>{
  await go(p,'/admin/contracts');await wait(p,'location.pathname==="/login"','anonymous redirect')
  assert.equal((await api(p,'contracts')).status,401)
 })
 await login(p,'admin');buildAssets=await evaluate(p,'Array.from(document.scripts).map(s=>s.src).filter(Boolean)')
 await check('CTR02-options-beyond20-real-api',async()=>{
  await go(p,'/admin/contracts/new');await wait(p,'!!document.getElementById("contract-room_id")','form options loaded')
  assert.ok(await evaluate(p,`!!Array.from(document.getElementById('contract-room_id').options).find(o=>o.value===${JSON.stringify(String(contractsFixture.rooms[22].id))})`))
  await click(p,'Người thuê')
  assert.ok(await evaluate(p,`!!Array.from(document.getElementById('contract-user_id').options).find(o=>o.value===${JSON.stringify(String(contractsFixture.tenants[43].id))})`))
  assert.equal(await evaluate(p,'Array.from(document.querySelectorAll("button")).some(b=>b.textContent.trim()==="Kích hoạt hợp đồng")'),false)
  await click(p,'Chọn phòng');await select(p,'contract-room_id',contractsFixture.rooms[22].id);await click(p,'Tiếp tục')
  await select(p,'contract-user_id',contractsFixture.tenants[43].id);await click(p,'Tiếp tục')
 })
 await check('CTR03-invalid-dates-capacity-no-post',async()=>{
  await fill(p,'contract-start_date','2026-11-01');await fill(p,'contract-end_date','2026-11-01')
  let before=requests.length;await submit(p);await wait(p,'document.getElementById("contract-end_date-error").textContent.includes("sau")','date validation')
  assert.equal(requests.slice(before).some(r=>r.method==='POST'&&r.url==='/api/v1/contracts'),false)
  await fill(p,'contract-end_date','2027-10-31');await fill(p,'contract-occupant_count','4');before=requests.length;await submit(p)
  await wait(p,'document.getElementById("contract-occupant_count-error").textContent.includes("3")','capacity validation')
  assert.equal(requests.slice(before).some(r=>r.method==='POST'&&r.url==='/api/v1/contracts'),false)
 })
 await check('CTR04-create-draft-persist-no-sideeffects',async()=>{
  await fill(p,'contract-occupant_count','2');await fill(p,'contract-note','CTRDraft '+contractsFixture.run+' ghi chú thật')
  await submit(p);await wait(p,"location.pathname.startsWith('/admin/contracts/') && Number.isSafeInteger(Number(location.pathname.split('/').at(-1)))",'create navigation')
  createdId=Number((await evaluate(p,'location.pathname')).split('/').at(-1));await wait(p,'document.querySelector("h1")?.textContent.startsWith("Hợp Đồng Thuê Phòng ")','created detail')
  const r=await api(p,'contracts/'+createdId);assert.equal(r.status,200);assert.equal(r.body.data.contract_number,null);assert.equal(r.body.data.status,'draft');assert.equal(r.body.data.deposit_status,'unpaid');assert.equal(r.body.data.room.status,'available');assert.equal(r.body.data.tenant.role,'resident');assert.equal(r.body.data.tenant.email,null);assert.equal(r.body.data.monthly_rent,3100000)
  assert.equal(JSON.stringify(r.body).includes('remember_token'),false);assert.equal(JSON.stringify(r.body).includes('id_number'),false)
  assert.ok(requests.some(r=>r.method==='POST'&&r.url==='/api/v1/contracts'&&r.hasXsrfToken))
  await screenshot(p,'contract-detail-desktop')
 })
 await check('CTR05-refresh-session-detail-no-fallback',async()=>{
  const start=responses.length;await cdp('Page.reload',{},p.sessionId)
  await responseAfter('/api/v1/contracts/'+createdId,200,start)
  await wait(p,`document.querySelector('h1')?.textContent.includes(${JSON.stringify(contractsFixture.rooms[22].code)})`,'F5 detail data')
  assert.ok(responses.slice(start).some(r=>r.url==='/api/v1/contracts/'+createdId&&r.status===200));assert.equal((await api(p,'auth/me')).body.data.role,'admin')
  await go(p,'/admin/contracts/999999999');await wait(p,'!!document.querySelector("[role=alert]")','404 response');assert.equal(await evaluate(p,'document.body.innerText.includes("Không tìm thấy")'),true)
 })
 await check('CTR06-edit-draft-partial-and-get-refresh',async()=>{
  await edit(p,createdId);assert.equal(await evaluate(p,'document.getElementById("contract-monthly_rent").value'),'3100000')
  await fill(p,'contract-monthly_rent','3700000');await fill(p,'contract-note','CTRDraft '+contractsFixture.run+' đã sửa');await submit(p)
  await wait(p,`location.pathname==='/admin/contracts/${createdId}'&&!!document.querySelector('h1')?.textContent.startsWith('Hợp Đồng Thuê Phòng ')`,'edit saved')
  const r=await api(p,'contracts/'+createdId);assert.equal(r.body.data.monthly_rent,3700000);assert.equal(r.body.data.note,'CTRDraft '+contractsFixture.run+' đã sửa');assert.equal(r.body.data.status,'draft')
 })
 await check('CTR07-backend-protected-fields-role-csrf',async()=>{
  const denied=await api(p,'contracts/'+createdId,'PATCH',{status:null});assert.equal(denied.status,422)
  const other=await page();await login(other,'guard');assert.equal((await api(other,'contracts')).status,403);assert.equal((await api(other,'contracts/'+createdId,'PATCH',{note:'Không lưu'})).status,403)
  const cookies=(await cdp('Network.getCookies',{urls:[base]},p.sessionId)).cookies.map(c=>c.name+'='+c.value).join('; ')
  const forged=await fetch('http://127.0.0.1:8081/api/v1/contracts/'+createdId,{method:'PATCH',headers:{Cookie:cookies,Origin:base,'Sec-Fetch-Site':'cross-site',Accept:'application/json','Content-Type':'application/json','X-XSRF-TOKEN':'wrong-token'},body:JSON.stringify({note:'Không lưu'})})
  assert.equal(forged.status,419);assert.equal((await api(p,'contracts/'+createdId)).body.data.note,'CTRDraft '+contractsFixture.run+' đã sửa')
 })
 await check('CTR08-offline-save-no-false-success-retry',async()=>{
  await edit(p,createdId);await fill(p,'contract-note','CTRDraft '+contractsFixture.run+' offline retry')
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);await submit(p);await wait(p,'!!document.querySelector("[role=alert]")','network error')
  assert.ok((await evaluate(p,'location.pathname')).endsWith('/edit'))
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId)
  assert.equal((await api(p,'contracts/'+createdId)).body.data.note,'CTRDraft '+contractsFixture.run+' đã sửa')
  await submit(p);await wait(p,`location.pathname==='/admin/contracts/${createdId}'`,'network retry saved')
  assert.equal((await api(p,'contracts/'+createdId)).body.data.note,'CTRDraft '+contractsFixture.run+' offline retry')
 })
 await check('CTR09-busy-patch-no-double-submit',async()=>{
  await edit(p,createdId);await fill(p,'contract-note','CTRDraft '+contractsFixture.run+' busy')
  await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/contracts/'+createdId,requestStage:'Request'}]},p.sessionId)
  const before=requests.length;await submit(p)
  const deadline=Date.now()+10000;while(!paused.some(r=>r.session===p.sessionId&&r.request.method==='PATCH')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50))
  const held=paused.find(r=>r.session===p.sessionId&&r.request.method==='PATCH');assert.ok(held)
  assert.equal(await evaluate(p,'document.querySelector("form[aria-busy]").getAttribute("aria-busy")'),'true')
  assert.equal(await evaluate(p,'Array.from(document.querySelectorAll("form button")).filter(b=>b.getClientRects().length).every(b=>b.disabled)'),true)
  await submit(p);assert.equal(requests.slice(before).filter(r=>r.method==='PATCH').length,1)
  await cdp('Fetch.continueRequest',{requestId:held.requestId},p.sessionId);await cdp('Fetch.disable',{},p.sessionId)
  await wait(p,`location.pathname==='/admin/contracts/${createdId}'`,'busy saved')
 })
 await check('CTR10-mobile-form-list-filter-real-data',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:667,deviceScaleFactor:1,mobile:false},p.sessionId)
  await edit(p,createdId);assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth+1'),true);await screenshot(p,'contract-form-mobile')
  await go(p,'/admin/contracts');await wait(p,'!!document.getElementById("contract-q")','list search');await fill(p,'contract-q',contractsFixture.tenants[43].name);await select(p,'contract-status','draft');await evaluate(p,'document.querySelector("form").requestSubmit();true')
  await wait(p,`document.querySelectorAll('tbody tr').length===1&&document.querySelector('tbody')?.innerText.includes(${JSON.stringify(contractsFixture.rooms[22].code)})`,'filtered response')
  assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth+1'),true)
  assert.ok(await evaluate(p,'Array.from(document.querySelectorAll("div.overflow-x-auto")).some(e=>e.scrollWidth>e.clientWidth)'));await screenshot(p,'contract-list-mobile')
 })
 await check('CTR11-delete-cancel-softdelete404',async()=>{
  await detail(p,createdId);await click(p,'Xóa bản nháp');await wait(p,'!!document.querySelector("[role=dialog]")','delete modal');await click(p,'Hủy');assert.equal((await api(p,'contracts/'+createdId)).status,200)
  await click(p,'Xóa bản nháp');await click(p,'Xác nhận xóa bản nháp');await wait(p,'location.pathname==="/admin/contracts"','deleted list')
  assert.equal((await api(p,'contracts/'+createdId)).status,404)
 })
 await check('CTR12-runtime-and-auth-regression',async()=>{assert.deepEqual(exceptions,[]);assert.equal((await api(p,'auth/me')).body.data.role,'admin');await api(p,'auth/logout','POST',{});assert.equal((await api(p,'contracts')).status,401)})
 report()
} catch(error){results.push({id:'FAIL',result:'FAIL',message:error.message});report();throw error}
finally{for(const browserContextId of openedContexts){await cdp('Target.disposeBrowserContext',{browserContextId}).catch(()=>{})}ws.close()}
