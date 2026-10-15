const URL='https://fgomaujsdblpzxhnnqrg.supabase.co/rest/v1/';
const KEY='sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i';
const $=id=>document.getElementById(id);
const APP_VERSION='1.3.10';
let items=[],selected=null,loadVersion=0,dialogMode='add',viewMode='empty';
let itemClickTimer;
function cancelItemClick(){clearTimeout(itemClickTimer);itemClickTimer=null}
// Keep the listbox visible long enough for the second click to reach it.
function scheduleChoose(){cancelItemClick();itemClickTimer=setTimeout(()=>{itemClickTimer=null;choose()},600)}
let dateItems=[],activeDateItem=null,dateDraft=null,dateCreating=false;
let dateClickTimer,dragEntryId=null;
function cancelDateClick(){clearTimeout(dateClickTimer);dateClickTimer=null}
function clearDateDrag(){dragEntryId=null;document.querySelectorAll('.date-entry.drag-ready').forEach(button=>{button.draggable=false;button.classList.remove('drag-ready')});document.querySelectorAll('.date-drop-target').forEach(cell=>cell.classList.remove('date-drop-target'))}
const datePending=new Map(),dateCells=new Map();
let informationDates=[],tasksOnly=false;
function dateDistance(date){return Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(todayKey()+'T00:00:00Z'))/86400000)}
function dateTooltip(date){const days=dateDistance(date),weeks=Math.round(Math.abs(days)/7*10)/10;return `${weeks} weeks, ${Math.abs(days)} days ${days<0?'before':'from'} today`}
function filterTaskDates(dates){const occupied=new Set(dates);for(const row of $('grid').querySelectorAll('tr'))row.hidden=tasksOnly&&(!row.dataset.date||!occupied.has(row.dataset.date))}
$('tasks-only').onclick=()=>{tasksOnly=!tasksOnly;$('tasks-only').setAttribute('aria-pressed',String(tasksOnly));updateInformationSpan()};
function updateInformationSpan(){
  const dates=[...informationDates,...(viewMode==='dayflow'?[]:dateItems.filter(entry=>(viewMode==='all'||entry.item_id===selected)&&dateCells.has(entry.entry_date)).map(entry=>entry.entry_date))].sort();
  const label=$('information-span');label.hidden=false;
  const today=todayKey(),next=dates.find(date=>date>=today),last=dates.at(-1);
  const daysUntil=date=>Math.max(0,Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000));
  const totalDays=last?daysUntil(last):null;
  const totalWeeks=totalDays===null?null:Math.round(totalDays/7*10)/10;
  label.textContent=`Next: ${next?daysUntil(next):'—'} days\u00a0\u00a0\u00a0end: ${last?totalWeeks:'—'} weeks, ${last?totalDays:'—'} days`;
  label.title=`From ${today} · Next: days until ${next||'none'} · end: weeks, days until ${last||'none'}`;
  filterTaskDates(dates);
}
function hasPending(){return pending.size||notesPending.size||datePending.size||multiPending.size}
function todayKey(now=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const part=type=>parts.find(p=>p.type===type).value;return `${part('year')}-${part('month')}-${part('day')}`}
function scrollToToday(){const wrap=$('grid-wrap');const row=document.querySelector('tr.today');wrap.scrollTop=0;if(row){const header=wrap.querySelector('thead');wrap.scrollTop=Math.max(0,row.getBoundingClientRect().top-wrap.getBoundingClientRect().top-header.getBoundingClientRect().height)}}
const pending=new Map();let saving=false,saveTimer;
async function api(path,method='GET',body){const response=await fetch(URL+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body)});if(!response.ok){let error;try{error=await response.json()}catch{}throw new Error(error?.message||`Connection error (${response.status})`)}return response.status===204?null:response.json()}
function status(message,error=false){$('status').textContent=`v${APP_VERSION} · ${message}`;$('status').classList.toggle('error',error)}
function sortItems(){items.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}))}
function renderItems(){sortItems();const value=selected;$('items').replaceChildren(...items.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.name;return option}));$('items').value=value||'';$('open-notes').disabled=$('open-multiple-notes').disabled=$('edit').disabled=$('delete').disabled=!selected}
function setSidebar(visible){$('item-panel').hidden=!visible;$('toggle-items').textContent=visible?'‹':'›';$('toggle-items').setAttribute('aria-expanded',String(visible));$('toggle-items').setAttribute('aria-label',visible?'Hide planner items':'Show planner items');$('toggle-items').title=visible?'Hide planner items':'Show planner items'}
$('toggle-items').onclick=()=>setSidebar($('item-panel').hidden);
function setView(mode){cancelItemClick();cancelDateClick();clearDateDrag();viewMode=mode;$('tasks-only').disabled=mode==='empty';$('all-items').setAttribute('aria-pressed',String(mode==='all'));$('import-dayflow').setAttribute('aria-pressed',String(mode==='dayflow'))}
function showEmpty(){selected=null;setView('empty');renderItems();setSidebar(true);$('grid-wrap').hidden=true;$('empty').hidden=false;$('title').textContent='Your daily plan';$('description').textContent='Choose an item on the left, or add a new item.'}
async function refresh(){try{items=await api('pm01_items?select=*&order=created_at.asc');sortItems();selected=items.find(item=>item.id===selected)?.id||null;renderItems();if(viewMode==='all')await showAll();else if(viewMode==='dayflow')await importDayflow();else if(selected)await choose();else{showEmpty();status('Connected · All changes saved')}}catch(error){status(error.message+' · Click to retry',true)}}
async function apiRows(path){const rows=[];for(let offset=0;;offset+=1000){const page=await api(path+'&limit=1000&offset='+offset);rows.push(...page);if(page.length<1000)return rows}}
function allInformation(entries){const names=new Map(items.map(item=>[item.id,item.name]));const days=new Map();for(const entry of entries){if(!entry.content||!names.has(entry.item_id))continue;if(!days.has(entry.entry_date))days.set(entry.entry_date,[]);days.get(entry.entry_date).push({name:names.get(entry.item_id),content:entry.content})}return [...days].map(([entry_date,rows])=>({entry_date,content:rows.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})).map(row=>`${row.content} (${row.name})`).join('\n')}))}
async function showAll(){dismissNotes();selected=null;setView('all');renderItems();setSidebar(false);const version=++loadVersion;$('grid-wrap').hidden=true;$('empty').hidden=true;$('title').textContent='All';$('description').textContent='All planner items · Click an entry for notes';status('Loading all items…');try{const [planners,entries,dated]=await Promise.all([api('pm01_items?select=*&order=name.asc'),apiRows('pm01_entries?select=item_id,entry_date,content&order=entry_date.asc,item_id.asc'),apiRows('pm01_date_items?select=*&order=entry_date.asc,created_at.asc,id.asc')]);if(version!==loadVersion)return;items=planners;renderItems();const plannerIds=new Set(items.map(item=>item.id));dateItems=dated.filter(entry=>plannerIds.has(entry.item_id)).map(entry=>({...entry,...datePending.get(entry.id)}));for(const entry of pending.values()){const old=entries.find(row=>row.item_id===entry.item_id&&row.entry_date===entry.entry_date);if(old)old.content=entry.content;else entries.push(entry)}buildGrid(allInformation(entries));$('grid-wrap').hidden=false;scrollToToday();status(hasPending()?'Unsaved changes…':'All changes saved')}catch(error){if(version===loadVersion)status(error.message+' · Click to retry',true)}}
$('all-items').onclick=showAll;
function buildGrid(entries,readOnly=false){
  cancelDateClick();clearDateDrag();
  const values=new Map(entries.map(e=>[e.entry_date,e.content]));
  informationDates=[...values].filter(([date,content])=>date>='2026-10-01'&&date<='2027-12-31'&&String(content||'').trim()).map(([date])=>date);
  const fragment=document.createDocumentFragment();const today=todayKey();dateCells.clear();
  for(let date=new Date(Date.UTC(2026,9,1));date<=new Date(Date.UTC(2027,11,31));date.setUTCDate(date.getUTCDate()+1)){
    const iso=date.toISOString().slice(0,10);const label=iso.slice(5)+' '+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()];
    const row=document.createElement('tr');row.dataset.date=iso;if(iso===today){row.className='today';row.setAttribute('aria-current','date')}
    const day=document.createElement('td');day.className='date';day.title=dateTooltip(iso);day.addEventListener('mouseenter',()=>{day.title=dateTooltip(iso)});
    const dateLabel=document.createElement('span');dateLabel.className='date-label';dateLabel.textContent=label;
    const dayLayout=document.createElement('div');dayLayout.className='date-layout';dayLayout.append(dateLabel);
    if(!readOnly&&viewMode!=='all'){const add=document.createElement('button');add.type='button';add.className='date-add';add.textContent='+';add.setAttribute('aria-label','Add item for '+label);add.title='Add item for '+label;const itemId=selected;add.onclick=()=>openDateAdd(itemId,iso,label);const slot=document.createElement('span');slot.className='date-add-slot';slot.append(add);dayLayout.append(slot)}
    day.append(dayLayout);const cell=document.createElement('td');
    if(!readOnly){for(const target of [day,cell]){target.dataset.dropDate=iso;target.addEventListener('dragover',event=>{if(!dragEntryId)return;event.preventDefault();event.dataTransfer.dropEffect='move';target.classList.add('date-drop-target')});target.addEventListener('dragleave',()=>target.classList.remove('date-drop-target'));target.addEventListener('drop',event=>{if(!dragEntryId)return;event.preventDefault();moveDateItem(dragEntryId,iso)})}}
    if(values.get(iso)){const text=document.createElement('div');text.className='legacy-information';text.textContent=values.get(iso);cell.append(text)}
    if(!readOnly){const list=document.createElement('div');list.className='date-items';cell.append(list);dateCells.set(iso,list)}
    row.append(day,cell);fragment.append(row);
    if(date.getUTCDay()===0){const gap=document.createElement('tr');gap.className='spacer';gap.setAttribute('aria-hidden','true');const td=document.createElement('td');td.colSpan=2;gap.append(td);fragment.append(gap)}
  }
  $('grid').replaceChildren(fragment);if(!readOnly)renderDateItems();else updateInformationSpan();
}
function hasNoteContent(html){const note=document.createElement('div');note.innerHTML=cleanNotes(html||'');return Boolean(note.textContent.replace(/[\s\u200B-\u200D\uFEFF]/g,''))}
function renderDateItems(){for(const [date,list]of dateCells){list.replaceChildren(...dateItems.filter(entry=>(viewMode==='all'||entry.item_id===selected)&&entry.entry_date===date).map(entry=>{const button=document.createElement('button');button.type='button';button.className='date-entry';const name=items.find(item=>item.id===entry.item_id)?.name||'';button.textContent=entry.title+(hasNoteContent(entry.content_html)?'*':'')+(viewMode==='all'?` (${name})`:'');button.dataset.entryId=entry.id;button.setAttribute('aria-label','Open notes for '+button.textContent);button.title='Click for notes. Double-click, then drag to another date.';
  button.onclick=event=>{cancelDateClick();if(event.detail>1||dragEntryId===entry.id)return;dateClickTimer=setTimeout(()=>{dateClickTimer=null;openDateNote(entry.id)},600)};
  button.ondblclick=event=>{event.preventDefault();cancelDateClick();clearDateDrag();dragEntryId=entry.id;button.draggable=true;button.classList.add('drag-ready');button.focus();status('Drag this item to another date · Esc to cancel')};
  button.ondragstart=event=>{if(dragEntryId!==entry.id){event.preventDefault();return}cancelDateClick();event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',entry.id)};
  button.ondragend=()=>{clearDateDrag();if(!hasPending())status('All changes saved')};return button}))}updateInformationSpan()}
function moveDateItem(id,date){
  const entry=dateItems.find(entry=>entry.id===id);if(!entry||!dateCells.has(date))return;
  clearDateDrag();if(entry.entry_date===date)return;
  entry.entry_date=date;datePending.set(id,{...datePending.get(id),entry_date:date});renderDateItems();
  status('Unsaved changes…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,100);
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&dragEntryId){clearDateDrag();if(!hasPending())status('All changes saved')}});
async function choose(){dismissNotes();selected=$('items').value||null;$('open-notes').disabled=$('open-multiple-notes').disabled=$('edit').disabled=$('delete').disabled=!selected;const version=++loadVersion;$('grid-wrap').hidden=true;$('empty').hidden=!!selected;if(!selected){showEmpty();return}setView('item');setSidebar(false);const item=items.find(i=>i.id===selected);$('title').textContent=item.name;$('description').textContent='October 1, 2026 – December 31, 2027 · Click + to add a dated item; click an item for notes';status('Loading…');try{const [entries,dated]=await Promise.all([api('pm01_entries?select=*&item_id=eq.'+selected),api('pm01_date_items?select=*&item_id=eq.'+selected+'&order=created_at.asc,id.asc')]);if(version!==loadVersion)return;dateItems=dated.map(entry=>({...entry,...datePending.get(entry.id)}));for(const entry of pending.values())if(entry.item_id===selected){const old=entries.find(e=>e.entry_date===entry.entry_date);if(old)old.content=entry.content;else entries.push(entry)}buildGrid(entries);$('grid-wrap').hidden=false;scrollToToday();status(hasPending()?'Unsaved changes…':'All changes saved')}catch(error){if(version===loadVersion)status(error.message+' · Click to retry',true)}}
function queue(item_id,entry_date,content){pending.set(item_id+':'+entry_date,{item_id,entry_date,content});status('Unsaved changes…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,500)}
async function flush(){clearTimeout(saveTimer);if(saving||!hasPending())return;saving=true;const batch=[...pending.entries()];status('Saving…');try{if(batch.length)await api('pm01_entries?on_conflict=item_id,entry_date','POST',batch.map(([,entry])=>entry));await saveNotes();await saveMultipleNotes();await saveDateNotes();for(const [key,entry]of batch)if(pending.get(key)===entry)pending.delete(key);status(hasPending()?'Saving…':'All changes saved')}catch(error){status('Save failed: '+error.message+' · Click to retry',true);if(notesPending.size||multiPending.size)noteStatus('Save failed · Click Retry save',true);if(datePending.size)dateNoteStatus('Save failed · Click Retry save',true)}finally{saving=false;if(hasPending()&&!$('status').classList.contains('error'))saveTimer=setTimeout(flush,100)}}
function openDialog(mode){dialogMode=mode;$('dialog-title').textContent=mode==='add'?'Add item':'Edit item';$('name').value=mode==='edit'?items.find(i=>i.id===selected).name:'';$('dialog-error').textContent='';$('dialog').showModal();$('name').focus()}
$('add').onclick=$('first-add').onclick=()=>openDialog('add');$('edit').onclick=()=>openDialog('edit');$('cancel').onclick=()=>$('dialog').close();
$('item-form').onsubmit=async event=>{event.preventDefault();const name=$('name').value.trim();if(!name){$('dialog-error').textContent='Enter an item name.';return}$('confirm').disabled=true;try{if(dialogMode==='add'){const [item]=await api('pm01_items','POST',{name});items.push(item);selected=item.id}else{await api('pm01_items?id=eq.'+selected,'PATCH',{name});items.find(i=>i.id===selected).name=name}renderItems();$('dialog').close();await choose()}catch(error){$('dialog-error').textContent=error.message}finally{$('confirm').disabled=false}};
$('delete').onclick=async()=>{const item=items.find(i=>i.id===selected);if(!item||!confirm(`Delete “${item.name}” and all its daily information?`))return;$('delete').disabled=true;try{await flush();if(hasPending()||saving)throw new Error('Wait for notes to save before deleting.');await api('pm01_items?id=eq.'+item.id,'DELETE');items=items.filter(i=>i.id!==item.id);selected=null;++loadVersion;dismissNotes();showEmpty();status('Item deleted')}catch(error){status(error.message,true)}finally{renderItems()}};
$('items').addEventListener('change',scheduleChoose);
$('items').addEventListener('click',event=>{if(event.detail===1)scheduleChoose();else if(event.detail>1)cancelItemClick()});
$('status').onclick=()=>{if(hasPending())flush();else if(viewMode==='all')showAll();else if(viewMode==='dayflow')importDayflow();else if(selected)choose();else refresh()};
window.addEventListener('beforeunload',event=>{if(hasPending()||saving||dateCreating){event.preventDefault();event.returnValue=''}});document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});window.addEventListener('online',()=>hasPending()?flush():refresh());
// Persist rich item notes separately from the daily grid.
const notesPending=new Map(),multiPending=new Map();let noteItem=null,noteVersion=0,multipleMode=false,multipleNotes=[],activeNote=null,multipleBusy=false,multipleLoading=false;
const notesPane=document.createElement('section');notesPane.id='notes-pane';notesPane.hidden=true;
notesPane.innerHTML='<div class="notes-heading"><h3 id="notes-title">Item notes</h3><button type="button" id="notes-close" aria-label="Close notes">Close</button></div><div id="notes-toolbar" role="toolbar" aria-label="Text formatting"><button type="button" data-command="dateStamp" title="Insert current date and time">Date stamp</button><button type="button" data-command="bold" title="Bold"><b>B</b></button><button type="button" data-command="italic" title="Italic"><i>I</i></button><button type="button" data-command="underline" title="Underline"><u>U</u></button><button type="button" data-command="insertUnorderedList" title="Bulleted list">• List</button><button type="button" data-command="insertOrderedList" title="Numbered list">1. List</button><button type="button" data-command="formatBlock" data-value="h2">Heading</button><button type="button" data-command="formatBlock" data-value="p">Paragraph</button><button type="button" data-command="removeFormat">Clear format</button><button type="button" data-command="undo" title="Undo">↶</button><button type="button" data-command="redo" title="Redo">↷</button></div><div id="notes-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Rich text item notes"></div><div class="notes-footer"><span id="notes-status" hidden aria-hidden="true">Loading…</span><button type="button" id="notes-retry" hidden>Retry save</button></div>';
$('grid-wrap').after(notesPane);
const noteControls=document.createElement('div');noteControls.id='multiple-note-controls';noteControls.hidden=true;
noteControls.innerHTML='<label for="multiple-note-list">Choose a note</label><select id="multiple-note-list" aria-label="Notes"></select><button type="button" id="multiple-note-add">＋ Add note</button><button type="button" id="multiple-note-delete">Delete note</button><label for="multiple-note-name">Note name</label><input id="multiple-note-name" maxlength="200" autocomplete="off">';
$('notes-toolbar').before(noteControls);
$('open-notes').onclick=()=>openNotes();$('open-multiple-notes').onclick=()=>openNotes(true);

function dismissNotes(){++noteVersion;multipleMode=false;notesPane.hidden=true;noteItem=null;flush()}
function safeLink(value){try{const url=new globalThis.URL(value);return ['http:','https:','mailto:','tel:'].includes(url.protocol)?url.href:null}catch{return null}}
function cleanNotes(html){const source=document.createElement('template');source.innerHTML=html;const allowed=new Set(['P','BR','DIV','B','STRONG','I','EM','U','UL','OL','LI','H2','H3','BLOCKQUOTE']);function copy(node){if(node.nodeType===3)return document.createTextNode(node.textContent);const out=document.createDocumentFragment();if(node.nodeType!==1)return out;if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH'].includes(node.tagName))return out;let target=allowed.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):out;if(node.tagName==='A'){const href=safeLink(node.getAttribute('href'));if(href){target=document.createElement('a');target.href=href;target.target='_blank';target.rel='noopener noreferrer'}}for(const child of node.childNodes)target.append(copy(child));return target}const holder=document.createElement('div');for(const child of source.content.childNodes)holder.append(copy(child));return holder.innerHTML}
function noteStatus(message,error=false){$('notes-status').textContent=message;$('notes-status').classList.toggle('error',error);$('notes-retry').hidden=!error}
async function openNotes(multiple=false){
  const id=$('items').value;if(!id)return;
  multipleMode=multiple;multipleLoading=multiple;activeNote=null;
  if(multiple){multipleNotes=[];renderMultipleNotes()}
  $('multiple-note-controls').hidden=!multiple;selected=id;setView('notes');setSidebar(false);++loadVersion;
  $('grid-wrap').hidden=true;$('empty').hidden=true;const version=++noteVersion;noteItem=id;
  $('title').textContent=items.find(item=>item.id===id)?.name||'Item notes';
  $('description').textContent='Rich text notes · Changes save automatically';
  $('notes-title').textContent=items.find(item=>item.id===id)?.name+(multiple?' — Multiple Notes':' — Notes');
  $('notes-editor').innerHTML='';$('notes-editor').contentEditable='false';noteStatus('Loading…');notesPane.hidden=false;
  try{
    if(multiple){
      const rows=await apiRows('pm01_multiple_notes?item_id=eq.'+id+'&order=created_at.asc,id.asc');
      if(version!==noteVersion||notesPane.hidden)return;
      multipleNotes=rows.map(note=>({...note,...multiPending.get(note.id)}));multipleLoading=false;
      selectMultipleNote(multipleNotes[0]?.id);return;
    }
    const rows=await api('pm01_item_notes?item_id=eq.'+id);
    if(version!==noteVersion||notesPane.hidden)return;
    $('notes-editor').innerHTML=cleanNotes(notesPending.get(id)?.content_html??rows[0]?.content_html??'');
    $('notes-editor').contentEditable='true';noteStatus(notesPending.has(id)?'Unsaved changes…':'All changes saved');$('notes-editor').focus();
  }catch(error){if(version===noteVersion)noteStatus('Load failed: '+error.message,true)}
}
function queueNote(){if(!noteItem)return;if(multipleMode){queueMultipleNote();return}notesPending.set(noteItem,{item_id:noteItem,content_html:cleanNotes($('notes-editor').innerHTML)});noteStatus('Unsaved changes…');status('Unsaved changes…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,500)}
async function saveNotes(){const batch=[...notesPending.entries()];if(!batch.length)return;noteStatus('Saving…');await api('pm01_item_notes?on_conflict=item_id','POST',batch.map(([,entry])=>entry));for(const [id,entry]of batch)if(notesPending.get(id)===entry)notesPending.delete(id);noteStatus(notesPending.size?'Unsaved changes…':'All changes saved')}
$('notes-editor').addEventListener('input',queueNote);$('notes-editor').addEventListener('blur',flush);
$('notes-toolbar').addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault()});
function formatNotes(editor,button,queue){
  if(!button||editor.contentEditable!=='true')return;editor.focus();
  if(button.dataset.command==='createLink'){
    const selection=window.getSelection();const range=selection.rangeCount?selection.getRangeAt(0).cloneRange():null;
    if(!range||!editor.contains(range.commonAncestorContainer))return;
    const parent=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
    const existing=parent?.closest('a');
    if(range.collapsed&&existing&&editor.contains(existing))range.selectNode(existing);
    const entered=window.prompt('Link address (https://, http://, mailto:, or tel:)',existing?.getAttribute('href')||'https://');if(entered===null)return;
    const href=safeLink(entered.trim());if(!href){window.alert('Enter a valid web, email, or phone link.');return}
    const name=window.prompt('Friendly link name',range.toString()||href);if(name===null)return;
    editor.focus();selection.removeAllRanges();selection.addRange(range);
    const label=name.trim()||href;
    if(!range.collapsed&&label===range.toString())document.execCommand('createLink',false,href);
    else{const link=document.createElement('a');link.href=href;link.textContent=label;link.target='_blank';link.rel='noopener noreferrer';document.execCommand('insertHTML',false,link.outerHTML)}
  }else if(button.dataset.command==='dateStamp')document.execCommand('insertText',false,dateStamp());
  else document.execCommand(button.dataset.command,false,button.dataset.value||null);
  queue();
}
const linkButton=document.createElement('button');linkButton.type='button';linkButton.dataset.command='createLink';linkButton.textContent='Link';linkButton.title='Turn selected text into a link, or insert a link';$('notes-toolbar').append(linkButton);
const unlinkButton=document.createElement('button');unlinkButton.type='button';unlinkButton.dataset.command='unlink';unlinkButton.textContent='Unlink';$('notes-toolbar').append(unlinkButton);
function enableNoteLinks(editor){
  function follow(event){const link=event.target.closest('a');if(!link||!editor.contains(link))return;event.preventDefault();const href=safeLink(link.getAttribute('href'));if(href)window.open(href,'_blank','noopener,noreferrer')}
  editor.addEventListener('click',follow);editor.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.closest('a'))follow(event)});
}
enableNoteLinks($('notes-editor'));
$('notes-toolbar').addEventListener('click',event=>formatNotes($('notes-editor'),event.target.closest('button'),queueNote));
$('notes-close').textContent='Daily grid';$('notes-close').setAttribute('aria-label','Show daily grid');$('notes-close').onclick=choose;
$('notes-retry').onclick=()=>notesPending.size||multiPending.size?flush():openNotes(multipleMode);$('items').addEventListener('dblclick',()=>{cancelItemClick();openNotes()});
$('items').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();openNotes()}});

// Named rich text notes share the existing editor and save lifecycle.
function renderMultipleNotes(){
  $('multiple-note-list').replaceChildren(...multipleNotes.map(note=>{const option=document.createElement('option');option.value=note.id;option.textContent=note.title;return option}));
  $('multiple-note-list').value=activeNote||'';
  const busy=multipleBusy||multipleLoading;
  $('multiple-note-add').disabled=busy;
  $('multiple-note-list').disabled=busy;
  if(multipleMode)$('notes-editor').contentEditable=activeNote&&!busy?'true':'false';
  $('multiple-note-delete').disabled=busy||!activeNote;
  $('multiple-note-name').disabled=busy||!activeNote;
}
function selectMultipleNote(id){
  const note=multipleNotes.find(note=>note.id===id);activeNote=note?.id||null;renderMultipleNotes();
  $('multiple-note-name').value=note?.title||'';
  $('notes-editor').innerHTML=cleanNotes(note?.content_html||'');
  noteStatus(note?(multiPending.has(note.id)?'Unsaved changes…':'All changes saved'):'Click Add note to create your first note.');
}
function queueMultipleNote(){
  const note=multipleNotes.find(note=>note.id===activeNote);if(!note)return;
  note.title=$('multiple-note-name').value.trim()||'Untitled note';note.content_html=cleanNotes($('notes-editor').innerHTML);
  multiPending.set(note.id,{title:note.title,content_html:note.content_html});renderMultipleNotes();
  noteStatus('Unsaved changes…');status('Unsaved changes…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,500);
}
async function saveMultipleNotes(){
  const batch=[...multiPending.entries()];if(!batch.length)return;
  if(multipleMode)noteStatus('Saving…');
  for(const [id,entry]of batch){await api('pm01_multiple_notes?id=eq.'+id,'PATCH',entry);if(multiPending.get(id)===entry)multiPending.delete(id)}
  if(multipleMode)noteStatus(multiPending.has(activeNote)?'Unsaved changes…':'All changes saved');
}
$('multiple-note-list').onchange=()=>selectMultipleNote($('multiple-note-list').value);
$('multiple-note-name').addEventListener('input',queueMultipleNote);
$('multiple-note-name').addEventListener('blur',flush);
$('multiple-note-add').onclick=async()=>{
  if(!noteItem||!multipleMode||multipleBusy||multipleLoading)return;const itemId=noteItem,version=noteVersion;multipleBusy=true;renderMultipleNotes();
  try{const [note]=await api('pm01_multiple_notes','POST',{item_id:itemId,title:'New note',content_html:''});
    if(version!==noteVersion)return;multipleBusy=false;multipleNotes.push(note);selectMultipleNote(note.id);$('multiple-note-name').focus();$('multiple-note-name').select();
  }catch(error){if(version===noteVersion)noteStatus('Could not add note: '+error.message,true)}
  finally{multipleBusy=false;renderMultipleNotes()}
};
$('multiple-note-delete').onclick=async()=>{
  const note=multipleNotes.find(note=>note.id===activeNote);if(!note||multipleBusy||!confirm('Delete “'+note.title+'”?'))return;
  const version=noteVersion;multipleBusy=true;renderMultipleNotes();
  try{await flush();if(saving||multiPending.has(note.id))throw new Error('Wait for changes to save, then try again.');
    await api('pm01_multiple_notes?id=eq.'+note.id,'DELETE');
    if(version!==noteVersion)return;multipleNotes=multipleNotes.filter(row=>row.id!==note.id);selectMultipleNote(multipleNotes[0]?.id);
  }catch(error){if(version===noteVersion)noteStatus('Could not delete note: '+error.message,true)}
  finally{multipleBusy=false;renderMultipleNotes()}
};

// Each dated item has its own automatically saved rich text notes.
function openDateAdd(itemId,date,label){if(dateCreating)return;dateDraft={itemId,date};$('date-add-heading').textContent='Add item · '+label;$('date-name').value='';$('date-add-error').textContent='';$('date-add-dialog').showModal();$('date-name').focus()}
$('date-add-cancel').onclick=()=>$('date-add-dialog').close();
$('date-add-form').onsubmit=async event=>{
  event.preventDefault();if(dateCreating||!dateDraft)return;const title=$('date-name').value.trim();
  if(!title){$('date-add-error').textContent='Enter an item name.';return}
  const draft=dateDraft;dateCreating=true;$('date-add-confirm').disabled=true;status('Adding item…');
  try{const [entry]=await api('pm01_date_items','POST',{item_id:draft.itemId,entry_date:draft.date,title});
    if(selected===draft.itemId){dateItems.push(entry);renderDateItems()}
    if($('date-add-dialog').open&&dateDraft===draft)$('date-add-dialog').close();
    status(hasPending()?'Unsaved changes…':'All changes saved');
  }catch(error){$('date-add-error').textContent=error.message;status('Could not add item: '+error.message,true)}
  finally{dateCreating=false;$('date-add-confirm').disabled=false}
};
function openDateNote(id){const entry=dateItems.find(item=>item.id===id);if(!entry)return;activeDateItem=id;$('date-note-heading').textContent=items.find(item=>item.id===entry.item_id)?.name+' · '+entry.entry_date;$('date-note-name').value=entry.title;$('date-note-editor').innerHTML=cleanNotes(entry.content_html);dateNoteStatus(datePending.has(id)?'Unsaved changes…':'All changes saved');$('date-note-dialog').showModal();$('date-note-editor').focus()}
function dateNoteStatus(message,error=false){$('date-note-status').textContent=message;$('date-note-status').classList.toggle('error',error);$('date-note-retry').hidden=!error}
function queueDateNote(){const entry=dateItems.find(item=>item.id===activeDateItem);if(!entry)return;entry.title=$('date-note-name').value.trim()||'Untitled item';entry.content_html=cleanNotes($('date-note-editor').innerHTML);datePending.set(entry.id,{...datePending.get(entry.id),title:entry.title,content_html:entry.content_html});renderDateItems();dateNoteStatus('Unsaved changes…');status('Unsaved changes…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,500)}
async function saveDateNotes(){const batch=[...datePending.entries()];if(!batch.length)return;dateNoteStatus('Saving…');for(const [id,entry]of batch){await api('pm01_date_items?id=eq.'+id,'PATCH',entry);if(datePending.get(id)===entry)datePending.delete(id)}dateNoteStatus(datePending.has(activeDateItem)?'Unsaved changes…':'All changes saved')}
$('date-note-name').addEventListener('input',queueDateNote);$('date-note-name').addEventListener('blur',()=>{$('date-note-name').value=dateItems.find(item=>item.id===activeDateItem)?.title||'';flush()});
$('date-note-editor').addEventListener('input',queueDateNote);$('date-note-editor').addEventListener('blur',flush);
$('date-toolbar').innerHTML=$('notes-toolbar').innerHTML;
$('date-toolbar').addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault()});
$('date-toolbar').addEventListener('click',event=>formatNotes($('date-note-editor'),event.target.closest('button'),queueDateNote));
enableNoteLinks($('date-note-editor'));
$('date-note-close').onclick=()=>$('date-note-dialog').close();$('date-note-dialog').addEventListener('close',()=>{activeDateItem=null;flush()});$('date-note-retry').onclick=flush;

const DAYFLOW_URL='https://ynfjfanvdvpyycoeweca.supabase.co';
const DAYFLOW_KEY='sb_publishable_j7q6Ox0GVsUv68D3oQiOBA_2Avx50il';
let importing=false;
function dateStamp(now=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'2-digit',day:'2-digit',weekday:'short',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(now);const get=type=>parts.find(p=>p.type===type).value;return `${get('month')}-${get('day')} ${get('weekday')}. ${get('hour')}:${get('minute')} ${get('dayPeriod').toLowerCase()}`}
function taskTime(time){const [hour,minute]=time.split(':');return `${Number(hour)%12||12}:${minute} ${Number(hour)<12?'am':'pm'}`}
function groupDayflow(tasks){const dates=new Map();for(const task of tasks){if(!task.date||task.date<'2026-10-01'||task.date>'2027-12-31')continue;if(!dates.has(task.date))dates.set(task.date,[]);dates.get(task.date).push(task)}return new Map([...dates].map(([date,rows])=>[date,rows.sort((a,b)=>(a.start_time||'99:99').localeCompare(b.start_time||'99:99')||a.title.localeCompare(b.title)||a.id.localeCompare(b.id)).map(task=>task.title+(task.start_time?' — '+taskTime(task.start_time):'')).join('\n')]))}
async function dayflowTasks(){const tasks=[];for(let offset=0;;offset+=1000){const response=await fetch(DAYFLOW_URL+'/rest/v1/pm01_dayflow_calendar_export?select=id,title,date,start_time&order=date.asc,id.asc&limit=1000&offset='+offset,{headers:{apikey:DAYFLOW_KEY}});if(!response.ok)throw new Error('Could not read DayFlow items');const page=await response.json();tasks.push(...page);if(page.length<1000)return tasks}}
function showDayflow(entries){dismissNotes();++loadVersion;selected=null;setView('dayflow');renderItems();setSidebar(false);$('empty').hidden=true;$('title').textContent='DayFlow';$('description').textContent='DayFlow calendar · Timed items first, then untimed items';buildGrid(entries,true);$('grid-wrap').hidden=false;scrollToToday()}
async function importDayflow(){if(importing)return;await flush();if(saving||hasPending()){status('Wait for changes to save, then click Import DayFlow again.',true);return}importing=true;$('import-dayflow').disabled=true;const version=++loadVersion;try{status('Importing DayFlow…');const tasks=await dayflowTasks();const grouped=groupDayflow(tasks);const cached=await api('pm01_dayflow_entries?select=entry_date');const dates=new Set([...grouped.keys(),...cached.map(row=>row.entry_date)]);const updates=[...dates].map(entry_date=>({entry_date,content:grouped.get(entry_date)||''}));if(updates.length)await api('pm01_dayflow_entries?on_conflict=entry_date','POST',updates);if(version===loadVersion){showDayflow(updates);status(`Imported ${tasks.length} DayFlow items · All changes saved`)}}catch(error){status(error.message+' · Click Import DayFlow to retry',true)}finally{importing=false;$('import-dayflow').disabled=false}}
$('import-dayflow').onclick=importDayflow;

refresh();
