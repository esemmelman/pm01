// Run with Playwright installed. Serves dist/ on a temporary local port.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/app.js','utf8');
const url=source.match(/const URL='([^']+)'/)[1],key=source.match(/const KEY='([^']+)'/)[1];
async function api(path,method='GET',body){const response=await fetch(url+path,{method,headers:{apikey:key,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});if(!response.ok)throw Error(await response.text());return response.status===204?null:response.json()}
(async()=>{
 const http=require('node:http'),path=require('node:path');
 const server=http.createServer((req,res)=>{const file=path.basename(new URL(req.url,'http://localhost').pathname)||'index.html';if(!['index.html','app.js','style.css'].includes(file)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join('dist',file)))});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser,item;
 try{
  [item]=await api('pm01_items','POST',{name:'Temporary multiple notes verification'});
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Connected'));
  await page.selectOption('#items',item.id);await page.waitForSelector('#grid-wrap:not([hidden])');
  await page.click('#open-multiple-notes');await page.waitForFunction(()=>document.getElementById('notes-status').textContent.includes('first note'));
  await page.click('#multiple-note-add');await page.waitForSelector('#notes-editor[contenteditable=true]');
  await page.fill('#multiple-note-name','First note');await page.locator('#notes-editor').fill('First content');
  await page.locator('#notes-editor').selectText();await page.click('#notes-toolbar [data-command=bold]');
  await page.locator('#notes-editor').press('ArrowRight');
  await page.click('#notes-toolbar [data-command=dateStamp]');
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('All changes saved'));
  const first=(await api('pm01_multiple_notes?item_id=eq.'+item.id))[0];assert.equal(first.title,'First note');assert.match(first.content_html,/<(b|strong)>/);assert.match(first.content_html,/First content/);
  await page.click('#multiple-note-add');await page.waitForFunction(()=>document.querySelectorAll('#multiple-note-list option').length===2);
  await page.fill('#multiple-note-name','Second note');await page.locator('#notes-editor').fill('Second content');
  await page.selectOption('#multiple-note-list',first.id);assert.match(await page.locator('#notes-editor').innerHTML(),/First content/);
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('All changes saved'));
  await page.click('#open-notes');await page.waitForSelector('#notes-editor[contenteditable=true]');assert.equal(await page.locator('#notes-editor').innerHTML(),'');
  await page.locator('#notes-editor').fill('Original Notes preserved');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('All changes saved'));
  await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Connected'));await page.selectOption('#items',item.id);await page.waitForSelector('#grid-wrap:not([hidden])');await page.click('#open-multiple-notes');await page.waitForFunction(()=>document.querySelectorAll('#multiple-note-list option').length===2);
  const notes=await api('pm01_multiple_notes?item_id=eq.'+item.id);assert.equal(notes.length,2);const second=notes.find(note=>note.title==='Second note');assert.equal(second.content_html,'Second content');
  await page.selectOption('#multiple-note-list',second.id);assert.equal(await page.locator('#notes-editor').innerText(),'Second content');
  await page.route('**/rest/v1/pm01_multiple_notes?**',route=>route.request().method()==='PATCH'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Simulated save failure'})}):route.continue());
  await page.locator('#notes-editor').fill('Retry content');await page.waitForSelector('#notes-retry:not([hidden])');
  await page.unroute('**/rest/v1/pm01_multiple_notes?**');await page.click('#notes-retry');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('All changes saved'));
  assert.equal((await api('pm01_multiple_notes?id=eq.'+second.id))[0].content_html,'Retry content');
  await page.click('#multiple-note-delete');await page.waitForFunction(()=>document.querySelectorAll('#multiple-note-list option').length===1);assert.equal((await api('pm01_multiple_notes?item_id=eq.'+item.id)).length,1);
  await page.click('#open-notes');await page.waitForSelector('#notes-editor[contenteditable=true]');assert.equal(await page.locator('#notes-editor').innerText(),'Original Notes preserved');
  await page.setViewportSize({width:390,height:844});await page.click('#open-multiple-notes');await page.waitForSelector('#notes-editor[contenteditable=true]');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'pm01-multiple-notes-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: create, rename, formatting, date stamp, separate notes, reload, save failure/retry, deletion, original Notes, mobile layout');
 }finally{
  if(browser)await browser.close();
  server.close();
  if(item){await api('pm01_items?id=eq.'+item.id,'DELETE');assert.equal((await api('pm01_multiple_notes?item_id=eq.'+item.id)).length,0);console.log('PASS: temporary planner cleanup and cascading note deletion')}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
