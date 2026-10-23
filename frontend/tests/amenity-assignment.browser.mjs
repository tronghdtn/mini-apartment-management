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
const artifacts = path.resolve('backups/amenity-assignment-20261023')
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

const results = []
const created = { building: null, room: null, otherRoom: null, amenities: [] }
const prefix = 'ASSIGN '+fixture.run
const report = () => fs.writeFileSync(path.join(artifacts, 'assignment-results.json'), JSON.stringify({ results, responses, requests, exceptions, created }, null, 2))
async function check(id, run) { await run(); results.push({ id, result: 'PASS' }); console.log('PASS '+id); report() }
async function request(p, route, method='GET', body) {
 return evaluate(p, `fetch('/api/v1/'+${JSON.stringify(route)}, {method:${JSON.stringify(method)},headers:{Accept:'application/json','Content-Type':'application/json','X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(s=>s.startsWith('XSRF-TOKEN='))?.slice(11)??'')},${body===undefined?'':`body:JSON.stringify(${JSON.stringify(body)}),`}}).then(async r=>{const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null}})`)
}
async function click(p, label) {
 const expr=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)} && b.getClientRects().length && !b.disabled)`
 await wait(p, `!!(${expr})`, 'button '+label); await evaluate(p, expr+'.click();true')
}
function checkbox(type, target, amenity) { return `amenity-assignment-${type}-${target}-${amenity}` }
async function toggle(p, type, target, amenity, selected) {
 const id=checkbox(type,target,amenity)
 await wait(p, `!!document.getElementById(${JSON.stringify(id)})`, 'checkbox '+id)
 await evaluate(p, `(()=>{const input=document.getElementById(${JSON.stringify(id)});if(input.checked!==${selected})input.click();return true})()`)
}
async function save(p) {
 const before=responses.filter(r=>r.status===200&&r.url.endsWith('/amenities')).length
 await click(p, 'Lưu tiện nghi')
 await wait(p, `Array.from(document.querySelectorAll('[role=status]')).some(s=>s.textContent.includes('Đã lưu tiện nghi.'))`, 'saved status')
 assert.ok(responses.filter(r=>r.status===200&&r.url.endsWith('/amenities')).length>before)
}
async function ready(p,type,target) {
 await wait(p, `!!document.getElementById(${JSON.stringify(checkbox(type,target,created.amenities[1]))}) && !!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Lưu tiện nghi'&&!b.disabled)`, 'assignment ready')
}
async function goTarget(p,type,target) { await go(p,'/admin/'+type+'/'+target); await ready(p,type,target) }
function ids(rows) { return rows.map(row=>row.id).sort((a,b)=>a-b) }
try {
 const p=await page()
 await check('ASSIGN01-anonymous-real401', async()=>{
  await go(p,'/admin/buildings'); await wait(p,'location.pathname==="/login"')
  for(const type of ['buildings','rooms']) assert.equal((await request(p,type+'/999/amenities')).status,401)
 })
 await check('ASSIGN02-admin-fixtures-through-real-api', async()=>{
  await login(p,'admin')
  const b=await request(p,'buildings','POST',{name:prefix+' Building',address:'Địa chỉ kiểm thử DB test',total_floors:3});assert.equal(b.status,201);created.building=b.body.data.id
  for(const label of ['Camera','Thang máy','Bàn ghế']) {const a=await request(p,'amenities','POST',{name:prefix+' '+label,description:'Tiện nghi không sinh khoản thu'});assert.equal(a.status,201);created.amenities.push(a.body.data.id)}
  for(const key of ['room','otherRoom']) {const r=await request(p,'rooms','POST',{building_id:created.building,code:'ASSIGN-'+fixture.run+'-'+key,floor_number:1,area:'25.50',base_price:3500000,deposit_amount:3500000,max_occupants:2,is_public:false,description:'Phòng DB test'});assert.equal(r.status,201);created[key]=r.body.data.id}
 })
 const [a,b,c]=created.amenities
 await check('ASSIGN03-building-ui-selection-save-no-room-copy', async()=>{
  await goTarget(p,'buildings',created.building);await toggle(p,'buildings',created.building,a,true);await toggle(p,'buildings',created.building,b,true);await save(p)
  const building=await request(p,`buildings/${created.building}/amenities`);assert.deepEqual(ids(building.body.data.direct),[a,b]);assert.deepEqual(building.body.data.inherited,[])
  for(const room of [created.room,created.otherRoom]) {const value=(await request(p,`rooms/${room}/amenities`)).body.data;assert.deepEqual(value.direct,[]);assert.deepEqual(ids(value.inherited),[a,b])}
 })
 await check('ASSIGN04-building-f5-empty-and-restore', async()=>{
  await goTarget(p,'buildings',created.building);assert.equal(await evaluate(p,`document.getElementById(${JSON.stringify(checkbox('buildings',created.building,a))}).checked`),true)
  await toggle(p,'buildings',created.building,a,false);await toggle(p,'buildings',created.building,b,false);await save(p)
  assert.deepEqual((await request(p,`buildings/${created.building}/amenities`)).body.data.direct,[])
  await toggle(p,'buildings',created.building,a,true);await toggle(p,'buildings',created.building,b,true);await save(p)
 })
 await check('ASSIGN05-room-inheritance-explicit-direct-and-distinct-union', async()=>{
  await goTarget(p,'rooms',created.room);await toggle(p,'rooms',created.room,b,true);await toggle(p,'rooms',created.room,c,true);await save(p)
  const value=(await request(p,`rooms/${created.room}/amenities`)).body.data
  assert.deepEqual(ids(value.direct),[b,c]);assert.deepEqual(ids(value.inherited),[a,b]);assert.deepEqual(ids(value.effective),[a,b,c])
  assert.deepEqual((await request(p,`rooms/${created.otherRoom}/amenities`)).body.data.direct,[])
 })
 await check('ASSIGN06-room-f5-and-xsrf-header-on-real-writes', async()=>{
  await goTarget(p,'rooms',created.room)
  for(const id of [b,c]) assert.equal(await evaluate(p,`document.getElementById(${JSON.stringify(checkbox('rooms',created.room,id))}).checked`),true)
  const writes=requests.filter(r=>r.method==='PUT'&&r.url.endsWith('/amenities'));assert.ok(writes.length>=4);assert.ok(writes.every(r=>r.hasXsrfToken))
 })
 await check('ASSIGN07-archived-badges-no-selection-and-retained-on-save', async()=>{
  for(const id of [a,c]) assert.equal((await request(p,'amenities/'+id,'DELETE')).status,204)
  await click(p,'Tải lại tiện nghi');await ready(p,'rooms',created.room)
  await wait(p,'document.body.innerText.includes("Đã lưu trữ")')
  assert.ok(await evaluate(p,'Array.from(document.querySelectorAll("li")).filter(e=>e.innerText.includes("Đã lưu trữ")).length>=2'))
  for(const id of [a,c]) assert.equal(await evaluate(p,`!!document.getElementById(${JSON.stringify(checkbox('rooms',created.room,id))})`),false)
  await save(p)
  const value=(await request(p,`rooms/${created.room}/amenities`)).body.data;assert.deepEqual(ids(value.direct),[b,c]);assert.equal(value.direct.find(row=>row.id===c).is_archived,true);assert.equal(value.inherited.find(row=>row.id===a).is_archived,true)
 })
 await check('ASSIGN08-clearing-active-preserves-archived-room-and-building-links', async()=>{
  await toggle(p,'rooms',created.room,b,false);await save(p);assert.deepEqual(ids((await request(p,`rooms/${created.room}/amenities`)).body.data.direct),[c])
  await goTarget(p,'buildings',created.building);await toggle(p,'buildings',created.building,b,false);await save(p)
  const building=(await request(p,`buildings/${created.building}/amenities`)).body.data;assert.deepEqual(ids(building.direct),[a]);assert.equal(building.direct[0].is_archived,true)
  await screenshot(p,'building-archived-assignment')
 })
 await check('ASSIGN09-mobile-archived-room-no-overflow', async()=>{
  await goTarget(p,'rooms',created.room)
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},p.sessionId)
  assert.equal(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'),true)
  await evaluate(p,'Array.from(document.querySelectorAll("h2")).find(e=>e.textContent==="Tiện nghi phòng và tòa nhà").scrollIntoView();true');await screenshot(p,'room-mobile-archived-assignment')
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},p.sessionId)
 })
 await check('ASSIGN10-offline-save-no-fake-success-then-retry', async()=>{
  await toggle(p,'rooms',created.room,b,true)
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId)
  await click(p,'Lưu tiện nghi');await wait(p,'Array.from(document.querySelectorAll("form [role=alert]")).some(e=>e.textContent.includes("kết nối"))','offline error')
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId)
  assert.deepEqual(ids((await request(p,`rooms/${created.room}/amenities`)).body.data.direct),[c])
  await click(p,'Tải lại tiện nghi');await ready(p,'rooms',created.room);assert.equal(await evaluate(p,`document.getElementById(${JSON.stringify(checkbox('rooms',created.room,b))}).checked`),false)
  await toggle(p,'rooms',created.room,b,true);await save(p)
 })
 await check('ASSIGN11-load-error-and-retry', async()=>{
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId);await click(p,'Tải lại tiện nghi')
  await wait(p,'Array.from(document.querySelectorAll("[role=alert]")).some(e=>e.textContent.includes("kết nối"))','load offline error')
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);await click(p,'Tải lại tiện nghi');await ready(p,'rooms',created.room)
 })
 await check('ASSIGN12-backend-role403-all-four-endpoints', async()=>{
  const q=await page();await login(q,'user')
  for(const [type,id] of [['buildings',created.building],['rooms',created.room]]) for(const method of ['GET','PUT']) assert.equal((await request(q,`${type}/${id}/amenities`,method,method==='PUT'?{amenity_ids:[]}:undefined)).status,403)
 })
 await check('ASSIGN13-real-csrf419-no-assignment-mutation', async()=>{
  const before=(await request(p,`rooms/${created.room}/amenities`)).body.data
  const cookies=(await cdp('Network.getCookies',{urls:[base]},p.sessionId)).cookies.map(item=>`${item.name}=${item.value}`).join('; ')
  const response=await fetch(`http://127.0.0.1:8081/api/v1/rooms/${created.room}/amenities`,{method:'PUT',headers:{Cookie:cookies,Origin:base,Referer:base+'/','Sec-Fetch-Site':'cross-site','X-XSRF-TOKEN':'invalid-test-token',Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({amenity_ids:[]})})
  assert.equal(response.status,419);assert.deepEqual((await request(p,`rooms/${created.room}/amenities`)).body.data,before)
 })
 await check('ASSIGN14-real-server422-on-archive-race-and-reload', async()=>{
  await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/rooms/*/amenities',requestStage:'Request'}]},p.sessionId)
  await click(p,'Lưu tiện nghi')
  const deadline=Date.now()+20000;let held
  while(Date.now()<deadline&&!held){held=paused.find(item=>item.session===p.sessionId&&item.request.method==='PUT');if(!held)await new Promise(r=>setTimeout(r,50))}
  assert.ok(held,'real assignment write paused')
  assert.equal((await request(p,'amenities/'+b,'DELETE')).status,204)
  await cdp('Fetch.continueRequest',{requestId:held.requestId},p.sessionId);await cdp('Fetch.disable',{},p.sessionId)
  await wait(p,`document.getElementById(${JSON.stringify(`amenity-assignment-rooms-${created.room}-error`)})?.textContent.includes('lưu trữ')`,'422 field mapping')
  assert.ok(responses.some(r=>r.status===422&&r.url===`/api/v1/rooms/${created.room}/amenities`))
  const value=(await request(p,`rooms/${created.room}/amenities`)).body.data;assert.deepEqual(ids(value.direct),[b,c]);assert.ok(value.direct.every(row=>row.is_archived))
  await click(p,'Tải lại tiện nghi');await wait(p,'document.body.innerText.includes("Danh mục chưa có tiện nghi hoạt động để chọn.")')
 })
 assert.equal(exceptions.length,0,'no browser runtime exceptions')
 console.log('Amenity assignment browser PASS '+results.length+' cases on isolated MySQL test')
} catch(error) { results.push({result:'FAIL',reason:error.message});console.error('Amenity assignment browser FAIL:',error.message);process.exitCode=1 }
finally {
 report()
 for(const browserContextId of openedContexts) await cdp('Target.disposeBrowserContext',{browserContextId}).catch(()=>{})
 await cdp('Browser.close').catch(()=>{});ws.close()
}
