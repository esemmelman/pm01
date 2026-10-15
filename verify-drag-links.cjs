// Run with Playwright installed. Serves dist/ on a temporary local port.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
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
  [item]=await api('pm01_items','POST',{name:'Temporary drag and links verification'});
  const [entry]=await api('pm01_date_items','POST',{item_id:item.id,entry_date:'2026-10-14',title:'Move this item',content_html:'<p>Preserved notes</p>'});
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Connected'));
  const saved=async()=>{try{await page.waitForFunction(()=>document.getElementById('status').textContent.includes('All changes saved'))}catch(error){console.log('Save status:',await page.locator('#status').innerText());console.log('Notes status:',await page.locator('#notes-status').innerText());throw error}};
  const button=()=>page.locator('[data-entry-id="'+entry.id+'"]');
  await page.selectOption('#items',item.id);await page.waitForSelector('#grid-wrap:not([hidden])');
  await button().dblclick();assert.equal(await button().getAttribute('draggable'),'true');assert.equal(await page.locator('#date-note-dialog').evaluate(el=>el.open),false);
  await button().dragTo(page.locator('td[data-drop-date="2026-10-15"]').last());await saved();
  let stored=(await api('pm01_date_items?id=eq.'+entry.id))[0];assert.equal(stored.entry_date,'2026-10-15');assert.equal(stored.item_id,item.id);assert.equal(stored.content_html,'<p>Preserved notes</p>');
  console.log('PASS: first drag move');
  await button().click();await page.waitForSelector('#date-note-dialog[open]');assert.equal(await page.locator('#date-note-editor').innerText(),'Preserved notes');
  async function addLink(editor,toolbar,text,href){
    await page.locator(editor).fill(text);await page.locator(editor).selectText();const answer=dialog=>dialog.accept(dialog.message()==='Friendly link name'?text+' friendly':href);page.on('dialog',answer);await page.click(toolbar+' [data-command=createLink]');page.off('dialog',answer);await saved();assert.equal(await page.locator(editor+' a').getAttribute('href'),href);assert.equal(await page.locator(editor+' a').innerText(),text+' friendly');
  }
  await addLink('#date-note-editor','#date-toolbar','Dated link','https://example.com/dated');
  console.log('PASS: dated link');
  await page.click('#date-note-close');
  await page.click('#open-notes');await page.waitForSelector('#notes-editor[contenteditable=true]');
  await addLink('#notes-editor','#notes-toolbar','Original notes link','https://example.com/notes');
  console.log('PASS: original link');
  await page.click('#open-multiple-notes');await page.waitForFunction(()=>document.getElementById('notes-status').textContent.includes('first note'));await page.click('#multiple-note-add');await page.waitForSelector('#notes-editor[contenteditable=true]');
  await addLink('#notes-editor','#notes-toolbar','Multiple notes link','https://example.com/multiple');
  await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Connected'));await page.selectOption('#items',item.id);await page.waitForSelector('#grid-wrap:not([hidden])');
  assert.equal(await button().locator('..').evaluate(el=>el.parentElement.dataset.dropDate),'2026-10-15');
  await button().click();await page.waitForSelector('#date-note-dialog[open]');assert.equal(await page.locator('#date-note-editor a').getAttribute('href'),'https://example.com/dated');await page.click('#date-note-close');
  await page.click('#open-notes');await page.waitForSelector('#notes-editor a');assert.equal(await page.locator('#notes-editor a').innerText(),'Original notes link friendly');
  const popupPromise=page.waitForEvent('popup');await page.click('#notes-editor a');const popup=await popupPromise;await popup.close();
  await page.locator('#notes-editor').selectText();await page.click('#notes-toolbar [data-command=unlink]');await saved();assert.equal(await page.locator('#notes-editor a').count(),0);
  await page.locator('#notes-editor').press('ArrowRight');const emailAnswer=dialog=>dialog.accept(dialog.message()==='Friendly link name'?'Email us':'mailto:hello@example.com');page.on('dialog',emailAnswer);await page.click('#notes-toolbar [data-command=createLink]');page.off('dialog',emailAnswer);await saved();assert.equal(await page.locator('#notes-editor a').getAttribute('href'),'mailto:hello@example.com');assert.equal(await page.locator('#notes-editor a').innerText(),'Email us');
  await page.locator('#notes-editor').evaluate(el=>{el.innerHTML='<a href="javascript:alert(1)" onclick="alert(1)">Unsafe</a><a href="https://example.com/safe" onclick="alert(1)">Safe</a>';el.dispatchEvent(new Event('input',{bubbles:true}))});await saved();
  const html=(await api('pm01_item_notes?item_id=eq.'+item.id))[0].content_html;assert.doesNotMatch(html,/javascript:|onclick/);assert.match(html,/https:\/\/example.com\/safe/);assert.match(html,/noopener/);
  await page.click('#open-multiple-notes');await page.waitForSelector('#notes-editor a');assert.equal(await page.locator('#notes-editor a').getAttribute('href'),'https://example.com/multiple');
  await page.locator('#notes-editor').selectText();page.once('dialog',dialog=>dialog.accept('javascript:alert(1)'));
  // Invalid addresses must be rejected without changing the saved link.
  const rejectAlert=dialog=>{if(dialog.type()==='alert')dialog.accept()};page.on('dialog',rejectAlert);await page.click('#notes-toolbar [data-command=createLink]');page.off('dialog',rejectAlert);assert.equal(await page.locator('#notes-editor a').getAttribute('href'),'https://example.com/multiple');
  await page.click('#all-items');await page.waitForSelector('#grid-wrap:not([hidden])');await button().dblclick();
  await page.route('**/rest/v1/pm01_date_items?**',route=>route.request().method()==='PATCH'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Simulated move failure'})}):route.continue());
  await button().dragTo(page.locator('td[data-drop-date="2026-10-16"]').last());await page.waitForFunction(()=>document.getElementById('status').classList.contains('error'));
  assert.equal((await api('pm01_date_items?id=eq.'+entry.id))[0].entry_date,'2026-10-15');
  await page.unroute('**/rest/v1/pm01_date_items?**');await page.evaluate(()=>window.dispatchEvent(new Event('online')));await saved();
  stored=(await api('pm01_date_items?id=eq.'+entry.id))[0];assert.equal(stored.entry_date,'2026-10-16');assert.equal(stored.item_id,item.id);assert.match(stored.content_html,/https:\/\/example.com\/dated/);
  assert.deepEqual(errors,[]);console.log('PASS: double-click activation, drag/drop, single-click notes, move persistence, All view, failed move retry, links in all three editors, link reload/click/unlink, unsafe link rejection');
 }finally{if(browser)await browser.close();server.close();if(item){await api('pm01_items?id=eq.'+item.id,'DELETE');console.log('PASS: temporary data cleanup')}}
})().catch(error=>{console.error(error);process.exitCode=1});
