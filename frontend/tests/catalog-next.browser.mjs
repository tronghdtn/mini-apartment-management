/** Chạy sau backend tests, chỉ với app/Nginx cô lập đã xác minh DB test.
 * Không thêm thư viện: Chrome CDP + WebSocket/Node 24. Không in mật khẩu/cookie.
 */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

if (process.env.AUTH_E2E_CONFIRMED_TEST_DB !== 'mini_apartment_test') throw new Error('Require verified dedicated test DB before browser test')
const artifacts = path.resolve('backups/catalog-next-20261023')
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


const results=[]; const created={service:null,price:null}
const code='CATB'+fixture.run.toUpperCase(); const name='CATB '+fixture.run
async function click(p,label){const expr=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)} && b.getClientRects().length && !b.disabled)`;await wait(p,`!!(${expr})`);await evaluate(p,expr+'.click();true')}
async function select(p,id,value){await wait(p,`!!document.getElementById(${JSON.stringify(id)}) && !document.getElementById(${JSON.stringify(id)}).disabled && Array.from(document.getElementById(${JSON.stringify(id)}).options).some(o=>o.value===${JSON.stringify(''+value)})`,'select ready '+id);await evaluate(p,`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(''+value)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change',{bubbles:true}));true`)}
async function request(p,url,method='GET',body){return evaluate(p,`fetch('/api/v1/'+${JSON.stringify(url)},{method:${JSON.stringify(method)},headers:{Accept:'application/json','Content-Type':'application/json','X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(s=>s.startsWith('XSRF-TOKEN='))?.slice(11)??'')},${body===undefined?'':`body:JSON.stringify(${JSON.stringify(body)}),`}}).then(async r=>({status:r.status,body:await r.json()}))`)}
async function check(id,fn){await fn();results.push({id,result:'PASS'});console.log('PASS '+id);fs.writeFileSync(path.join(artifacts,'catalog-next-results.json'),JSON.stringify({results,responses,exceptions,created},null,2))}
try {
 const p=await page()
 await check('CATB01-anonymous401',async()=>{await go(p,'/admin/services');await wait(p,'location.pathname==="/login"');for(const resource of ['services','utility-prices','settings'])assert.equal((await request(p,resource)).status,401)})
 let electricity,water
 await check('CATB02-create-service-real-validation',async()=>{
  await login(p,'admin');await go(p,'/admin/services');await wait(p,'document.body.innerText.includes("Trang 1/")')
  assert.ok(await evaluate(p,'document.body.innerText.includes("API thật")'))
  const system=await request(p,'services');electricity=system.body.data.find(s=>s.code==='ELECTRICITY');water=system.body.data.find(s=>s.code==='WATER');assert.ok(electricity&&water)
  await click(p,'Thêm dịch vụ');await wait(p,'!!document.getElementById("service-name")');await submit(p);await wait(p,'document.getElementById("service-name-error").textContent.length>0')
  for(const [key,value] of Object.entries({name,code:code.toLowerCase(),price:'100000',unit:'phòng/tháng',description:'Dịch vụ API thật'}))await fill(p,'service-'+key,value)
  await submit(p);await wait(p,`!document.querySelector('form[aria-busy]') && document.body.innerText.includes(${JSON.stringify(name)})`)
  const saved=(await request(p,'services')).body.data.find(s=>s.code===code);created.service=saved.id;assert.equal(saved.price,100000);assert.equal(saved.billing_type,'per_room');assert.equal(saved.status,'active')
 })
 await check('CATB03-refresh-edit-preserves-code-type-unit',async()=>{
  await go(p,'/admin/services');await wait(p,`document.body.innerText.includes(${JSON.stringify(name)})`)
  await evaluate(p,`document.querySelector('button[aria-label="Sửa dịch vụ ${code}"]').click();true`);await wait(p,'!!document.getElementById("service-price")')
  assert.equal(await evaluate(p,'!!document.getElementById("service-code") || !!document.getElementById("service-billing_type") || !!document.getElementById("service-unit")'),false)
  await fill(p,'service-price','120000');await fill(p,'service-description','Giá niêm yết mới');await submit(p);await wait(p,'!document.querySelector("form[aria-busy]")')
  const svc=(await request(p,'services/'+created.service)).body.data;assert.equal(svc.price,120000);assert.equal(svc.code,code);assert.equal(svc.unit,'phòng/tháng')
 })
 await check('CATB04-duplicate422-server-field',async()=>{
  await click(p,'Thêm dịch vụ');await wait(p,'!!document.getElementById("service-code")');await fill(p,'service-name',name+' duplicate');await fill(p,'service-code',code);await submit(p)
  await wait(p,'document.getElementById("service-code-error").textContent.includes("sử dụng")');await click(p,'Hủy')
 })
 await check('CATB05-metered-price-protected-client-and-server',async()=>{
  await evaluate(p,`document.querySelector('button[aria-label="Sửa dịch vụ ELECTRICITY"]').click();true`);await wait(p,'!!document.getElementById("service-name")')
  assert.equal(await evaluate(p,'!!document.getElementById("service-price")'),false);await click(p,'Hủy')
  assert.equal((await request(p,'services/'+electricity.id,'PATCH',{price:3500})).status,422)
 })
 await check('CATB06-utility-create-firstday-and-persist',async()=>{
  await go(p,'/admin/utility-prices');await wait(p,'document.body.innerText.includes("Trang 1/")');await click(p,'Thêm giá áp dụng mới');await wait(p,'!!document.getElementById("utility-price-service_id")')
  await select(p,'utility-price-service_id',electricity.id);await fill(p,'utility-price-unit_price','3500');await fill(p,'utility-price-effective_from','2026-11-02');await submit(p)
  await wait(p,'document.getElementById("utility-price-effective_from-error").textContent.length>0')
  await fill(p,'utility-price-effective_from','2026-11-01');await submit(p);await wait(p,'!document.querySelector("form[aria-busy]") && document.body.innerText.includes("2026-11-01")')
  const price=(await request(p,'utility-prices')).body.data.find(row=>row.service_id===electricity.id&&row.effective_from==='2026-11-01');created.price=price.id;assert.equal(price.unit_price,3500)
 })
 await check('CATB07-utility-refresh-filter-real',async()=>{
  await go(p,'/admin/utility-prices');await wait(p,'document.body.innerText.includes("2026-11-01")');await select(p,'utility-price-service-filter',water.id);await wait(p,'document.body.innerText.includes("Chưa có bảng giá phù hợp.")')
  assert.equal((await request(p,'utility-prices?service_id='+water.id)).body.data.length,0);await select(p,'utility-price-service-filter','');await wait(p,'document.body.innerText.includes("2026-11-01")')
 })
 await check('CATB08-utility-duplicate422-server-field',async()=>{
  await click(p,'Thêm giá áp dụng mới');await wait(p,'!!document.getElementById("utility-price-service_id")');await select(p,'utility-price-service_id',electricity.id);await fill(p,'utility-price-unit_price','3600');await fill(p,'utility-price-effective_from','2026-11-01');await submit(p)
  await wait(p,'document.getElementById("utility-price-effective_from-error").textContent.includes("đã có")');await click(p,'Hủy')
 })
 const q=await page()
 await check('CATB09-nonadmin-real-api403',async()=>{await login(q,'user');for(const resource of ['services','utility-prices','settings'])assert.equal((await request(q,resource)).status,403);assert.equal((await request(q,'settings/invoice.due_days','PUT',{value:5})).status,403)})
 await check('CATB10-offline-does-not-report-saved',async()=>{
  await go(p,'/admin/services');await wait(p,'document.body.innerText.includes("Trang 1/")');await click(p,'Thêm dịch vụ');await wait(p,'!!document.getElementById("service-name")');await fill(p,'service-name',name+' offline');await fill(p,'service-code',code+'X')
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},p.sessionId);await submit(p);await wait(p,'document.querySelector("form [role=alert]")?.textContent.includes("kết nối")')
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},p.sessionId);await click(p,'Hủy');assert.equal((await request(p,'services')).body.data.some(s=>s.code===code+'X'),false)
 })
 await check('CATB11-settings-approved-days-real-api',async()=>{
  const snapshot=await request(p,'settings');assert.equal(snapshot.body.data.length,8);assert.equal(snapshot.body.missing_keys.length,0)
  for(const key of ['invoice.due_days','contract.expiring_warning_days']){assert.equal((await request(p,'settings/'+key,'PUT',{value:365})).status,200);assert.equal((await request(p,'settings/'+key,'PUT',{value:0})).status,422)}
  assert.equal((await request(p,'settings')).body.data.find(row=>row.key==='invoice.due_days').value,'365')
 })
 await check('CATB12-mobile-no-page-overflow',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},p.sessionId);assert.ok(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'));await screenshot(p,'services-mobile')
  await go(p,'/admin/utility-prices');await wait(p,'document.body.innerText.includes("2026-11-01")');assert.ok(await evaluate(p,'document.documentElement.scrollWidth<=innerWidth'));await screenshot(p,'utility-prices-mobile')
 })
 assert.equal(exceptions.length,0);console.log('CAT-B browser PASS '+results.length+' cases on isolated MySQL test')
} catch(error){results.push({result:'FAIL',reason:error.message});console.error('CAT-B browser FAIL:',error.message);process.exitCode=1}
finally{fs.writeFileSync(path.join(artifacts,'catalog-next-results.json'),JSON.stringify({results,responses,exceptions,created},null,2));const contexts=await cdp('Target.getBrowserContexts');for(const browserContextId of contexts.browserContextIds)await cdp('Target.disposeBrowserContext',{browserContextId});ws.close()}
