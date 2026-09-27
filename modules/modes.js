import { MODES_DB_NAME, MODES_DB_VERSION, MODES_STORE, MODES_MATERIALS } from './modes-data.mjs';
import { updateWorkspace } from './workspace-store.mjs';

(() => {
  'use strict';

  const MATERIALS=MODES_MATERIALS;
  const $=id=>document.getElementById(id);
  const state={view:'home',materialIndex:0,recordIndex:0,records:[],editingId:null};

  const dbp=new Promise((resolve,reject)=>{
    const req=indexedDB.open(MODES_DB_NAME,MODES_DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(MODES_STORE))db.createObjectStore(MODES_STORE,{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  async function dbAll(){
    const db=await dbp;
    return new Promise((res,rej)=>{
      const r=db.transaction('records').objectStore(MODES_STORE).getAll();
      r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
    });
  }
  async function dbPut(value){
    const db=await dbp;
    return new Promise((res,rej)=>{
      const r=db.transaction('records','readwrite').objectStore(MODES_STORE).put(value);
      r.onsuccess=()=>res(value);r.onerror=()=>rej(r.error);
    });
  }
  async function dbDelete(id){
    const db=await dbp;
    return new Promise((res,rej)=>{
      const r=db.transaction('records','readwrite').objectStore(MODES_STORE).delete(id);
      r.onsuccess=()=>res();r.onerror=()=>rej(r.error);
    });
  }

  function material(id){return MATERIALS.find(m=>m.id===id)||MATERIALS[0]}
  function recordsFor(id){return state.records.filter(r=>r.materialId===id)}
  function uid(){return crypto.randomUUID?crypto.randomUUID():'mode-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
  function safeText(v){return String(v??'')}

  function setView(view){
    state.view=view;
    document.querySelectorAll('.modes-screen').forEach(s=>s.classList.toggle('is-active',s.dataset.modesScreen===view));
    document.querySelectorAll('[data-modes-nav]').forEach(b=>b.classList.toggle('is-active',b.dataset.modesNav===view));
    if(view==='search')setTimeout(()=>$('modesSearchInput')?.focus(),60);
  }

  function renderDeck(){
    const deck=$('modesMaterialDeck'); if(!deck)return;
    deck.innerHTML='';
    MATERIALS.forEach((m,i)=>{
      const count=recordsFor(m.id).length;
      const card=document.createElement('button');
      card.type='button';card.className='modes-material-card';card.style.setProperty('--mat-rgb',m.rgb);
      card.innerHTML=`<img src="${m.art}" alt="" draggable="false"><span class="modes-card-copy"><small>${m.short}</small><strong>${m.title}</strong><span>${m.subtitle}</span><span class="modes-card-foot"><b>${count===1?'1 запись':count+' записей'}</b><i>›</i></span></span>`;
      card.addEventListener('click',()=>{state.materialIndex=i;openMaterial(m.id)});
      deck.appendChild(card);
    });
    $('modesRecordTotal').textContent=state.records.length;
  }

  function openMaterial(id,recordId){
    state.materialIndex=Math.max(0,MATERIALS.findIndex(m=>m.id===id));
    const rows=recordsFor(id);
    state.recordIndex=recordId?Math.max(0,rows.findIndex(r=>r.id===recordId)):0;
    renderDetail();setView('detail');
  }

  function currentRecord(){
    const m=MATERIALS[state.materialIndex];
    return recordsFor(m.id)[state.recordIndex]||null;
  }

  function renderDetail(){
    const m=MATERIALS[state.materialIndex],rows=recordsFor(m.id),empty=rows.length===0;
    $('modesDetailTag').textContent=m.title;$('modesDetailSub').textContent=m.short||m.subtitle;
    $('modesEmpty').hidden=!empty;$('modesRecordCard').hidden=empty;$('modesEdit').hidden=empty;
    if(empty)return;
    state.recordIndex=(state.recordIndex+rows.length)%rows.length;
    const r=rows[state.recordIndex];
    $('modesRecordTitle').textContent=r.title||'Без названия';
    $('modesRecordDate').textContent=r.createdAt?new Date(r.createdAt).toLocaleDateString('ru-RU',{day:'2-digit',month:'short',year:'numeric'}):'Проверенный режим';
    $('modesDia').textContent=r.dia?'Ø'+r.dia+' мм':'—';$('modesOperation').textContent=r.operation||'—';$('modesRpm').textContent=r.rpm?r.rpm+' rpm':'—';$('modesFeed').textContent=r.feed?r.feed+' мм/об':'—';$('modesDepth').textContent=r.depth?r.depth+' мм':'—';$('modesTool').textContent=r.tool||'—';
    $('modesRecordIndex').textContent=(state.recordIndex+1)+' / '+rows.length;$('modesCounter').textContent=(state.recordIndex+1)+' / '+rows.length;
    const img=$('modesRecordImage'),fallback=$('modesRecordFallback');
    if(r.image){img.src=r.image;img.hidden=false;fallback.hidden=true}else{img.removeAttribute('src');img.hidden=true;fallback.hidden=false}
    $('modesNote').classList.toggle('has-note',!!r.note);$('modesNotePreview').hidden=!r.note;$('modesNotePreview').textContent=r.note||'';
  }

  function move(dir){
    const rows=recordsFor(MATERIALS[state.materialIndex].id);if(!rows.length)return;
    state.recordIndex=(state.recordIndex+dir+rows.length)%rows.length;renderDetail();
  }

  function fillMaterials(){
    $('modesFormMaterial').innerHTML=MATERIALS.map(m=>`<option value="${m.id}">${m.title} — ${m.subtitle}</option>`).join('');
  }

  function openForm(record){
    state.editingId=record?.id||null;
    $('modesFormTitle').textContent=record?'Редактировать режим':'Новый режим';
    $('modesDelete').hidden=!record;
    $('modesFormMaterial').value=record?.materialId||(MATERIALS[state.materialIndex]||MATERIALS[0]).id;
    $('modesFormName').value=record?.title||'';$('modesFormDia').value=record?.dia||'';$('modesFormOperation').value=record?.operation||'';$('modesFormRpm').value=record?.rpm||'';$('modesFormFeed').value=record?.feed||'';$('modesFormDepth').value=record?.depth||'';$('modesFormTool').value=record?.tool||'';$('modesFormNote').value=record?.note||'';$('modesFormPhoto').value='';
    $('modesRecordDialog').showModal();
  }

  function fileData(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(file)})}

  async function saveForm(e){
    e.preventDefault();
    const old=state.editingId?state.records.find(r=>r.id===state.editingId):null;
    let image=old?.image||'';const file=$('modesFormPhoto').files[0];if(file)image=await fileData(file);
    const rec={id:old?.id||uid(),materialId:$('modesFormMaterial').value,title:$('modesFormName').value.trim(),dia:$('modesFormDia').value.trim(),operation:$('modesFormOperation').value.trim(),rpm:$('modesFormRpm').value.trim(),feed:$('modesFormFeed').value.trim(),depth:$('modesFormDepth').value.trim(),tool:$('modesFormTool').value.trim(),note:$('modesFormNote').value.trim(),image,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    await dbPut(rec);state.records=(await dbAll()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));$('modesRecordDialog').close();renderDeck();openMaterial(rec.materialId,rec.id);useRecordInWorkspace(rec);
  }

  function useRecordInWorkspace(record=currentRecord()){
    if(!record)return;
    const m=material(record.materialId);
    updateWorkspace(w=>({
      title:w.title==='Новая деталь'&&record.title?record.title:w.title,
      material:{id:m.id,label:m.title,title:m.title,subtitle:m.subtitle},
      stock:record.dia?{...(w.stock||{}),diameter:Number(String(record.dia).replace(',','.'))||record.dia}:w.stock,
      mode:{
        id:record.id,
        title:record.title||'Проверенный режим',
        materialId:record.materialId,
        operation:record.operation||'',
        rpm:record.rpm||'',
        feed:record.feed||'',
        depth:record.depth||'',
        tool:record.tool||'',
        note:record.note||''
      }
    }),{source:'modes'});
    const b=$('modesUse');if(b){const old=b.textContent;b.textContent='В работе ✓';setTimeout(()=>b.textContent=old,1300)}
  }

  async function removeCurrent(){
    if(!state.editingId)return;
    if(!confirm('Удалить эту запись?'))return;
    const old=state.records.find(r=>r.id===state.editingId);await dbDelete(state.editingId);state.records=await dbAll();$('modesRecordDialog').close();renderDeck();openMaterial(old.materialId);
  }

  function renderSearch(){
    const q=$('modesSearchInput').value.trim().toLowerCase(),root=$('modesSearchResults');
    const rows=state.records.filter(r=>[r.title,r.operation,r.tool,r.note,material(r.materialId).title,material(r.materialId).subtitle].join(' ').toLowerCase().includes(q));
    root.innerHTML='';
    if(!rows.length){root.innerHTML='<div class="modes-empty"><span>⌕</span><h3>Ничего не найдено</h3><p>Попробуй название детали, материал или инструмент.</p></div>';return}
    rows.forEach(r=>{
      const m=material(r.materialId),b=document.createElement('button');b.type='button';b.className='modes-search-item';b.style.setProperty('--item-rgb',m.rgb);
      b.innerHTML=`<i></i><span><strong>${safeText(r.title||'Без названия')}</strong><small>${m.title} · ${safeText(r.operation||'Без операции')}</small></span><b>${r.rpm?safeText(r.rpm)+' rpm':''}</b>`;b.onclick=()=>openMaterial(r.materialId,r.id);root.appendChild(b);
    });
  }

  async function exportData(){
    const data=JSON.stringify({app:'Operating Modes Reference 828D',version:1,exportedAt:new Date().toISOString(),records:state.records},null,2);
    const blob=new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='828d-modes-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);
  }
  async function importData(file){
    const txt=await file.text(),data=JSON.parse(txt);if(!Array.isArray(data.records))throw new Error('Неверный файл');
    for(const r of data.records)await dbPut(r);state.records=(await dbAll()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));renderDeck();renderSearch();$('modesMenuDialog').close();
  }

  function bind(){
    document.querySelectorAll('[data-modes-nav]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.modesNav==='home'){renderDeck();setView('home')}else{renderSearch();setView('search')}}));
    $('modesAdd').onclick=()=>openForm();$('modesBackMaterial').onclick=()=>{renderDeck();setView('home')};$('modesPrev').onclick=()=>move(-1);$('modesNext').onclick=()=>move(1);$('modesEmptyAdd').onclick=()=>openForm();$('modesEdit').onclick=()=>openForm(currentRecord());
    $('modesRecordForm').addEventListener('submit',saveForm);$('modesRecordClose').onclick=()=>$('modesRecordDialog').close();if($('modesUse'))$('modesUse').onclick=()=>useRecordInWorkspace();$('modesDelete').onclick=removeCurrent;$('modesSearchInput').addEventListener('input',renderSearch);$('modesClearSearch').onclick=()=>{$('modesSearchInput').value='';renderSearch()};
    $('modesNote').onclick=()=>{const r=currentRecord();if(!r?.note)return;$('modesNoteTitle').textContent=r.title||'Заметка';$('modesNoteFull').textContent=r.note;$('modesNoteDialog').showModal()};$('modesNoteClose').onclick=()=>$('modesNoteDialog').close();$('modesMenuClose').onclick=()=>$('modesMenuDialog').close();
    $('modesMenu').onclick=()=>$('modesMenuDialog').showModal();$('modesExport').onclick=exportData;$('modesImport').onchange=async e=>{try{if(e.target.files[0])await importData(e.target.files[0])}catch{alert('Не удалось импортировать файл')}};
  }

  async function start(){
    try{if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{})}catch{}
    fillMaterials();state.records=(await dbAll()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));bind();renderDeck();renderSearch();setView('home');
  }
  start().catch(err=>console.error('Modes module init failed',err));
})();