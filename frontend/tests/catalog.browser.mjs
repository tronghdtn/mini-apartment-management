/** Chạy sau backend tests, chỉ với app/Nginx cô lập đã xác minh DB test.
 * Không thêm thư viện: Chrome CDP + WebSocket/Node 24. Không in mật khẩu/cookie.
 */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

if (process.env.AUTH_E2E_CONFIRMED_TEST_DB !== 'mini_apartment_test') throw new Error('Require verified dedicated test DB before browser test')
const artifacts = path.resolve('backups/catalog-sprint-20261023')
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

const results=[]; const created={building:null,amenity:null,room:null}
const name='CAT '+fixture.run+' Building';const amenityName='CAT '+fixture.run+' Amenity'
async function click(p,text) {const expression=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)} && b.getClientRects().length)`;await wait(p,`!!(${expression})`,'button '+text);await evaluate(p,expression+'.click();true')}
async function request(p,path) {return evaluate(p,`fetch('/api/v1/'+${JSON.stringify(path)},{headers:{Accept:'application/json'}}).then(async r=>({status:r.status,body:await r.json()}))`)}
async function check(id,fn){await fn();results.push({id,result:'PASS'});console.log('PASS '+id);fs.writeFileSync(path.join(artifacts,'catalog-results.json'),JSON.stringify({results,responses,exceptions,created},null,2))}
try {
 const p=await page()
 await check('CAT01-anonymous-denied',async()=>{
  await go(p,'/admin/buildings');await wait(p,'location.pathname==="/login" && !!document.getElementById("identifier")')
  assert.equal((await request(p,'buildings')).status,401)
 })
 await check('CAT02-real-building-create-client-validation',async()=>{
  await login(p,'admin');await go(p,'/admin/buildings');await wait(p,'document.body.innerText.includes("Trang 1/")')
  assert.ok(await evaluate(p,'document.body.innerText.includes("API thật")'))
  await click(p,'Thêm tòa nhà mới');await wait(p,'!!document.getElementById("building-name")')
  const before=responses.filter(r=>r.url.endsWith('/buildings')&&r.status===201).length
  await submit(p);await wait(p,'document.getElementById("building-name-error").textContent.length>0')
  assert.equal(responses.filter(r=>r.url.endsWith('/buildings')&&r.status===201).length,before)
  for(const [key,value] of Object.entries({name,address:'12 Nguyễn Trãi',total_floors:'5',latitude:'10.1234567',longitude:'106.7654321',description:'Tòa nhà kiểm thử API thật'}))await fill(p,'building-'+key,value)
  await submit(p);await wait(p,`!document.querySelector('form[aria-busy]') && document.body.innerText.includes(${JSON.stringify(name)})`)
  const list=await request(p,'buildings');assert.equal(list.status,200);created.building=list.body.data.find(row=>row.name===name).id
 })
 await check('CAT03-building-refresh-detail-edit',async()=>{
  await go(p,'/admin/buildings');await wait(p,`document.body.innerText.includes(${JSON.stringify(name)})`)
  await go(p,'/admin/buildings/'+created.building);await wait(p,`document.querySelector('h1')?.textContent===${JSON.stringify(name)}`)
  await click(p,'Sửa thông tin');await wait(p,'!!document.getElementById("building-name")');await fill(p,'building-name',name+' edited');await submit(p)
  await wait(p,`document.querySelector('h1')?.textContent===${JSON.stringify(name+' edited')}`)
  const saved=await request(p,'buildings/'+created.building);assert.equal(saved.body.data.name,name+' edited');assert.equal(saved.body.data.latitude,'10.1234567')
  await screenshot(p,'building-detail')
 })
 await check('CAT04-duplicate-building-422-field',async()=>{
  await go(p,'/admin/buildings');await wait(p,'document.body.innerText.includes("Trang 1/")');await click(p,'Thêm tòa nhà mới');await wait(p,'!!document.getElementById("building-name")')
  await fill(p,'building-name',name+' edited');await fill(p,'building-address','Duplicate test');await submit(p)
  await wait(p,'document.getElementById("building-name-error").textContent.includes("sử dụng")');assert.ok(responses.some(r=>r.url.endsWith('/buildings')&&r.status===422))
  await click(p,'Hủy')
 })
 await check('CAT05-detail404-no-fallback',async()=>{
  await go(p,'/admin/buildings/999999999');await wait(p,'document.body.innerText.includes("Không tìm thấy tòa nhà")')
  assert.equal(await evaluate(p,`document.querySelector('h1')?.textContent===${JSON.stringify(name+' edited')}`),false)
 })
 await check('CAT06-amenity-create-refresh-edit',async()=>{
  await go(p,'/admin/amenities');await wait(p,'document.body.innerText.includes("Trang 1/")');await click(p,'Thêm tiện nghi');await wait(p,'!!document.getElementById("amenity-name")')
  await fill(p,'amenity-name',amenityName);await fill(p,'amenity-description','Chỉ là tiện nghi, không thu tiền');await submit(p)
  await wait(p,`!document.querySelector('form[aria-busy]') && document.body.innerText.includes(${JSON.stringify(amenityName)})`)
  const data=await request(p,'amenities');created.amenity=data.body.data.find(row=>row.name===amenityName).id
  await go(p,'/admin/amenities');await wait(p,`document.body.innerText.includes(${JSON.stringify(amenityName)})`);await click(p,'Sửa');await wait(p,'!!document.getElementById("amenity-name")')
  await fill(p,'amenity-name',amenityName+' edited');await submit(p);await wait(p,`!document.querySelector('form[aria-busy]') && document.body.innerText.includes(${JSON.stringify(amenityName+' edited')})`)
 })
 await check('CAT07-mobile-true-catalog-no-overflow',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},p.sessionId)
  assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'),true)
  await screenshot(p,'amenities-mobile');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},p.sessionId)
 })
 await check('CAT08-archive-keeps-name-unique',async()=>{
  await click(p,'Lưu trữ');await wait(p,'document.body.innerText.includes("dữ liệu và liên kết hiện có được giữ lại")');await click(p,'Xác nhận lưu trữ')
  await wait(p,'document.body.innerText.includes("Chưa có tiện nghi nào.")')
  assert.equal((await request(p,'amenities/'+created.amenity)).status,404)
  await click(p,'Thêm tiện nghi');await wait(p,'!!document.getElementById("amenity-name")');await fill(p,'amenity-name',amenityName+' edited');await submit(p)
  await wait(p,'document.getElementById("amenity-name-error").textContent.includes("sử dụng")');await click(p,'Hủy')
 })
 const q=await page()
 await check('CAT09-backend-nonadmin403',async()=>{
  await login(q,'user');assert.equal((await request(q,'buildings')).status,403);assert.equal((await request(q,'amenities')).status,403)
  await go(q,'/admin/amenities');await wait(q,'document.body.innerText.includes("không có quyền")')
 })
 await check('CAT10-offline-save-no-fake-success',async()=>{
  await go(p,'/admin/buildings');await wait(p,'document.body.innerText.includes("Trang 1/")');await click(p,'Thêm tòa nhà mới');await wait(p,'!!document.getElementById("building-name")')
  await fill(p,'building-name',name+' offline');await fill(p,'building-address','Network test')
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId);await submit(p)
  await wait(p,'!!document.querySelector("form [role=alert]") && document.querySelector("form [role=alert]").textContent.includes("kết nối")')
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);await click(p,'Hủy')
  assert.equal((await request(p,'buildings')).body.data.filter(b=>b.name===name+' offline').length,0)
 })

 await check('ROOM01-real-create-and-refresh',async()=>{
  await go(p,'/admin/rooms');await wait(p,'document.body.innerText.includes("Trang 1/")');await click(p,'Thêm phòng mới');await wait(p,'!!document.getElementById("room-code")')
  await evaluate(p,`document.getElementById('room-building_id').value=${JSON.stringify(''+created.building)};document.getElementById('room-building_id').dispatchEvent(new Event('change',{bubbles:true}));true`)
  for(const [key,value] of Object.entries({code:'R'+fixture.run,floor_number:'2',area:'28.50',base_price:'3500000',deposit_amount:'3500000',max_occupants:'2',description:'Phòng API thật'}))await fill(p,'room-'+key,value)
  await submit(p);await wait(p,`!document.querySelector('form[aria-busy]') && document.body.innerText.includes(${JSON.stringify('R'+fixture.run)})`)
  const list=await request(p,'rooms');const room=list.body.data.find(r=>r.code==='R'+fixture.run);created.room=room.id;assert.equal(room.status,'available');assert.equal(room.area,'28.50');assert.equal(room.base_price,3500000)
  await go(p,'/admin/rooms');await wait(p,`document.body.innerText.includes(${JSON.stringify('R'+fixture.run)})`)
 })
 await check('ROOM02-duplicate-code-422',async()=>{
  await click(p,'Thêm phòng mới');await wait(p,'!!document.getElementById("room-code")')
  await evaluate(p,`document.getElementById('room-building_id').value=${JSON.stringify(''+created.building)};document.getElementById('room-building_id').dispatchEvent(new Event('change',{bubbles:true}));true`)
  for(const [key,value] of Object.entries({code:'R'+fixture.run,floor_number:'1',area:'20',base_price:'0',deposit_amount:'0',max_occupants:'1'}))await fill(p,'room-'+key,value)
  await submit(p);await wait(p,'document.getElementById("room-code-error").textContent.includes("sử dụng")');await click(p,'Hủy')
 })
 await check('ROOM03-detail-edit-keeps-status',async()=>{
  await go(p,'/admin/rooms/'+created.room);await wait(p,`document.querySelector('h1')?.textContent.includes(${JSON.stringify('R'+fixture.run)})`)
  await click(p,'Sửa thông tin');await wait(p,'!!document.getElementById("room-code")');await fill(p,'room-description','Mô tả đã sửa từ API');await submit(p)
  await wait(p,'!document.querySelector("form[aria-busy]") && document.body.innerText.includes("Mô tả đã sửa từ API")')
  const room=(await request(p,'rooms/'+created.room)).body.data;assert.equal(room.status,'available');assert.equal(room.building_id,created.building)
  await screenshot(p,'room-detail')
 })
 await check('ROOM04-filter-is-real-query',async()=>{
  await go(p,'/admin/rooms');await wait(p,'!!document.getElementById("room-query") && document.body.innerText.includes("Trang 1/")');await fill(p,'room-query','not-found-'+fixture.run);await submit(p)
  await wait(p,'document.body.innerText.includes("Không có phòng") || document.body.innerText.includes("Chưa có phòng")')
  assert.equal(await evaluate(p,`document.querySelector('tbody')?.innerText.includes(${JSON.stringify('R'+fixture.run)})`),false)
 })
 await check('ROOM05-backend-denies-nonadmin',async()=>{assert.equal((await request(q,'rooms')).status,403);await go(q,'/admin/rooms');await wait(q,'document.body.innerText.includes("không có quyền")')})
 await check('ROOM06-missing-id404-no-fallback',async()=>{await go(p,'/admin/rooms/999999999');await wait(p,'document.body.innerText.includes("Không tìm thấy phòng")')})
 assert.equal(exceptions.length,0,'no browser runtime exceptions')
 console.log('Catalog browser PASS '+results.length+' cases on isolated MySQL test')
} catch(error){results.push({result:'FAIL',reason:error.message});console.error('Catalog browser FAIL:',error.message);process.exitCode=1}
finally {
 fs.writeFileSync(path.join(artifacts,'catalog-results.json'),JSON.stringify({results,responses,exceptions,created},null,2))
 const contexts=await cdp('Target.getBrowserContexts');for(const browserContextId of contexts.browserContextIds)await cdp('Target.disposeBrowserContext',{browserContextId});ws.close()
}
