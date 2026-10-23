/* CNC Toolkit — Thread → Drill. Vanilla JS; no external requests or dependencies. */
(() => {
'use strict';
const {THREADS, POPULAR, findThread, drillFor} = window.CNC_THREAD_DATA;
const $ = id => document.getElementById(id);
const $grid = $('thread-grid');
const state = { tab:'common', d:10, p:1.5, theme:'dark', modal:null, opener:null };
const FINE_SIZES = [3,4,5,6,8,10,12,14,16,18,20,22,24,27,30,33,36];
const num = n => Number(n).toLocaleString('en-US', {maximumFractionDigits:2, useGrouping:false});
const label = n => `M${num(n)}`;
const fullLabel = (d,p) => `${label(d)} × ${num(p)}`;
const STORAGE_KEY = 'cnc-thread-drill-v2';

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const item = findThread(saved.d);
    if(item && [item.coarse,...item.fine].includes(Number(saved.p))) {
      state.d=item.d;state.p=Number(saved.p);
    }
    if(['common','fine','other'].includes(saved.tab)) state.tab=saved.tab;
    if(['light','dark'].includes(saved.theme)) state.theme=saved.theme;
  } catch { /* Storage unavailable or old format: use safe default. */ }
}
function persist() {
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify({d:state.d,p:state.p,tab:state.tab,theme:state.theme}));}catch{}
}
function setTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]').content = theme==='light' ? '#eaf0f5' : '#0b0e12';
  persist();
}
function sizesFor(tab) {
  if(tab==='common') return POPULAR;
  if(tab==='fine') return FINE_SIZES;
  return THREADS.map(t=>t.d).filter(d=>!POPULAR.includes(d));
}
function updateTabs() {
  document.querySelectorAll('.mode-tab').forEach(btn => {
    const selected=btn.dataset.tab===state.tab;
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-selected',String(selected));
  });
  $('list-caption').textContent= state.tab==='fine'?'ВЫБЕРИ РАЗМЕР ДЛЯ МЕЛКОГО ШАГА':state.tab==='other'?'ДОПОЛНИТЕЛЬНЫЕ РАЗМЕРЫ':'ВЫБЕРИ РАЗМЕР РЕЗЬБЫ';
  $('all-sizes').textContent = state.tab==='other'?'Популярные ↗':'Все размеры ↗';
}
function drawGrid() {
  const fragment=document.createDocumentFragment();
  for(const d of sizesFor(state.tab)) {
    const b=document.createElement('button');
    b.type='button';b.className='thread-btn';b.dataset.size=String(d);
    b.textContent=label(d);
    b.setAttribute('aria-label',`Резьба ${label(d)}`);
    b.setAttribute('aria-pressed',String(state.d===d));
    if(d===state.d) b.classList.add('selected');
    b.addEventListener('click',()=>selectThread(d));
    fragment.append(b);
  }
  $grid.replaceChildren(fragment);
}
function setTab(tab) {
  state.tab=tab;
  if(tab==='fine' && findThread(state.d)?.fine.length) {
    if(state.p===findThread(state.d).coarse) state.p=findThread(state.d).fine[0];
  }
  // On 'other' choose its first size so the highlighted item always remains visible.
  if(tab==='other' && POPULAR.includes(state.d)) {
    const item=findThread(sizesFor('other')[0]);state.d=item.d;state.p=item.coarse;
  } else if(tab==='common' && !POPULAR.includes(state.d)) {
    const item=findThread(10);state.d=item.d;state.p=item.coarse;
  }
  updateTabs();drawGrid();drawResult();persist();
}
function selectThread(d, requestedPitch) {
  const item=findThread(d);if(!item)return;
  $('result-card').hidden=false;
  state.d=item.d;
  state.p=requestedPitch!==undefined && [item.coarse,...item.fine].includes(Number(requestedPitch))
    ? Number(requestedPitch)
    : (state.tab==='fine'&&item.fine.length?item.fine[0]:item.coarse);
  if(!sizesFor(state.tab).includes(item.d)) state.tab=POPULAR.includes(item.d)?'common':'other';
  updateTabs();drawGrid();drawResult();persist();
}
function selectPitch(p) {
  const item=findThread(state.d);
  if(!item||![item.coarse,...item.fine].includes(p))return;
  state.p=p;drawResult();persist();
}
function drawResult() {
  const entry=findThread(state.d);
  if(!entry) return;
  const result=drillFor(entry.d,state.p);
  const fine=state.p!==entry.coarse;
  $('thread-name').textContent=label(state.d);
  $('thread-pitch-title').textContent=`× ${num(state.p)}`;
  $('result-eyebrow').textContent='СВЕРЛЕНИЕ ПОД МЕТЧИК';
  $('pitch-status').textContent=fine?'Мелкий шаг':'Стандартный шаг';
  const frag=document.createDocumentFragment();
  for(const p of [entry.coarse,...entry.fine]) {
    const b=document.createElement('button');
    b.type='button';b.className=`pitch-btn${p===state.p?' selected':''}`;
    b.textContent=num(p);b.setAttribute('aria-label',`Шаг ${num(p)} мм`);
    b.setAttribute('aria-pressed',String(p===state.p));
    b.addEventListener('click',()=>selectPitch(p));frag.append(b);
  }
  $('pitch-list').replaceChildren(frag);
  $('drill-diameter').textContent=num(result.diameter);
  $('bore-annotation').textContent=`Ø ${num(result.diameter)}`;
  $('spec-pitch').textContent=`${num(state.p)} мм`;
  $('spec-major').textContent=`${num(state.d)} мм`;
  $('spec-method').textContent=result.chart?'Таблица':'D − P';
  $('result-note-text').textContent=result.chart
    ? `Ø ${num(result.diameter)} мм — справочный диаметр под режущий метчик ${fullLabel(entry.d,state.p)}. Проверь материал, допуск и рекомендацию производителя метчика.`
    : `Ø ${num(result.diameter)} мм рассчитан ориентировочно по D − P. Для точной обработки проверь таблицу производителя метчика и требования чертежа.`;
  $('result-card').classList.remove('changed');void $('result-card').offsetWidth;
  $('result-card').classList.add('changed');
}

const modalBackdrop=$('modal-backdrop'), modalBody=$('modal-body');
function makeHTML(html) {modalBody.innerHTML=html;}
function openModal(title,html,after) {
  state.opener=document.activeElement;
  state.modal=title;
  $('modal-title').textContent=title;
  makeHTML(html);
  modalBackdrop.hidden=false;
  document.body.classList.add('modal-open');
  if(after)after();
  requestAnimationFrame(()=>{
    const target=modalBody.querySelector('input,button') || $('modal-close');
    target.focus({preventScroll:true});
  });
}
function closeModal() {
  if(modalBackdrop.hidden)return;
  modalBackdrop.hidden=true;document.body.classList.remove('modal-open');state.modal=null;
  if(state.opener?.isConnected) state.opener.focus({preventScroll:true});
}
function pickSize(d,p) { closeModal();selectThread(d,p); $('result-card').scrollIntoView({behavior:'smooth',block:'nearest'}); }
function createPick(d,p,caption='') {
  const btn=document.createElement('button');btn.type='button';btn.className='dialog-pick';
  const name=document.createElement('strong');name.textContent=fullLabel(d,p);
  const info=document.createElement('span'); const result=drillFor(d,p);
  info.textContent=`Ø ${num(result.diameter)} мм${caption?' · '+caption:''}`;
  btn.append(name,info);btn.addEventListener('click',()=>pickSize(d,p));return btn;
}
function searchableEntries() {
  return THREADS.flatMap(t=>[t.coarse,...t.fine].map(p=>({d:t.d,p,diameter:drillFor(t.d,p).diameter})));
}
function showSearch() {
  openModal('Поиск резьбы',`<label class="field-title" for="search-field">Размер или обозначение (например: М10×1.25)</label>
  <div class="search-input-wrap"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input class="modal-field" id="search-field" autocomplete="off" enterkeyhint="search" inputmode="search" placeholder="M10, M12×1.5…" /></div>
  <div class="dialog-results" id="search-results"></div><p class="dialog-hint" id="search-count"></p>`,()=>{
    const input=$('search-field'), output=$('search-results'), counter=$('search-count');
    function update(){
      const needle=input.value.trim().toLowerCase().replaceAll(',','.').replace(/\s/g,'').replace(/м/g,'m').replace(/[×хx*]/g,'x');
      const items=searchableEntries().filter(({d,p})=>{
        const base=`m${num(d)}`, full=`${base}x${num(p)}`;
        return !needle?POPULAR.includes(d)&&p===findThread(d).coarse:full.includes(needle)||base===needle;
      }).slice(0,35);
      output.replaceChildren(...items.map(i=>createPick(i.d,i.p)));
      counter.textContent=`Найдено: ${items.length}${needle?' (показаны первые совпадения)':''}`;
      if(!items.length)counter.textContent='Ничего не найдено. Проверь обозначение резьбы.';
    }
    input.addEventListener('input',update);update();
  });
}
function showHole() {
  openModal('Подбор по отверстию',`<p>Есть сверло или готовое отверстие? Укажи его диаметр — покажу ближайшие подходящие метрические резьбы.</p>
    <label class="field-title" for="hole-input">Диаметр сверла, мм</label>
    <div class="modal-row"><input class="modal-field" id="hole-input" type="text" inputmode="decimal" placeholder="Например, 8.5" autocomplete="off"><button class="solid-action" id="hole-find" type="button">Найти</button></div>
    <div class="dialog-hint" id="hole-tip">Поиск в справочнике по допуску ±0,15 мм. Это не расчёт класса точности резьбы.</div>
    <div class="dialog-results" id="hole-results"></div>`,()=>{
      const input=$('hole-input'), results=$('hole-results'), hint=$('hole-tip');
      function find(){
        const v=Number(input.value.replace(',','.'));
        results.replaceChildren();
        if(!Number.isFinite(v)||v<=0||v>70){hint.textContent='Введи число больше нуля и не более 70 мм.';hint.classList.add('dialog-error');return;}
        hint.classList.remove('dialog-error');
        const found=searchableEntries().map(t=>({...t,diff:Math.abs(t.diameter-v)})).filter(t=>t.diff<=.15).sort((a,b)=>a.diff-b.diff||a.d-b.d).slice(0,25);
        if(found.length){
          results.append(...found.map(t=>createPick(t.d,t.p,t.diff<.001?'совпадает':'рядом')));
          hint.textContent=`Найдено ${found.length} вариантов. Сверь шаг и тип метчика.`;
        } else hint.textContent='Прямых совпадений нет. Проверь размер сверла и шаг резьбы.';
      }
      $('hole-find').addEventListener('click',find);
      input.addEventListener('keydown',e=>{if(e.key==='Enter')find()});
    });
}
function showGeometry() {
  const d=state.d,p=state.p;
  const d2=d-0.6495190528*p;
  const d1=d-1.0825317547*p;
  const result=drillFor(d,p);
  openModal('Размеры резьбы',`<p>Основные теоретические размеры внутренней метрической резьбы (профиль ISO 68-1, без поля допуска).</p>
    <div class="mini-illustration"><img src="./assets/cutting-tap.webp" alt="Метчик"><div>Резьба <strong>${fullLabel(d,p)}</strong>Режущий метчик</div></div>
    <div class="stat-chip"><span>Номинальный диаметр D</span><b>${num(d)} мм</b></div>
    <div class="stat-chip"><span>Шаг P</span><b>${num(p)} мм</b></div>
    <div class="stat-chip"><span>Средний основной диаметр D₂</span><b>${num(d2.toFixed(3))} мм</b></div>
    <div class="stat-chip"><span>Внутренний основной диаметр D₁</span><b>${num(d1.toFixed(3))} мм</b></div>
    <div class="stat-chip"><span>Рекомендуемое сверло</span><b>Ø ${num(result.diameter)} мм</b></div>
    <p class="modal-footnote">D₁ — теоретический диаметр профиля, а не рекомендованный диаметр сверла. Поле допуска (например, 6H или 7H), процент заполнения резьбы, материал и вид метчика нужно учитывать отдельно.</p>`);
}
function showTable() {
  openModal('Таблица сверления',`<p>Размеры отверстий под <b>режущие</b> метчики. Нажми на строку, чтобы выбрать резьбу в главном окне.</p>
    <div class="table-wrap"><table class="modal-table"><thead><tr><th>Резьба</th><th>Шаг, мм</th><th>Сверло</th></tr></thead><tbody id="table-body"></tbody></table></div><p class="modal-footnote">Мелкие шаги доступны при выборе размера.</p>`,()=>{
      const parent=$('table-body');const frag=document.createDocumentFragment();
      for(const t of THREADS){
        const row=document.createElement('tr'),cell=document.createElement('td'),btn=document.createElement('button');
        btn.textContent=label(t.d);btn.addEventListener('click',()=>pickSize(t.d,t.coarse));cell.append(btn);
        const step=document.createElement('td');step.textContent=num(t.coarse);
        const bore=document.createElement('td');bore.textContent=`Ø ${num(t.coarseDrill)}`;
        row.append(cell,step,bore);frag.append(row);
      }
      parent.append(frag);
    });
}
function showInfo() {
  openModal('О приложении',`<div class="mini-illustration"><img src="./assets/cutting-tap.webp" alt="Режущий метчик"><div><strong>Резьба → Сверло</strong>Справочник для мастерской · CNC Toolkit</div></div>
    <h3>Как пользоваться</h3><p>Выбери метрическую резьбу (например, М10), затем при необходимости измени её шаг (например, 1,25). В главной карточке сразу увидишь диаметр сверла.</p>
    <h3>Важное по технологии</h3><p>Значения предназначены для обычных <b>режущих метчиков</b>. Для раскатников (формирующих метчиков) отверстие обычно больше — используй таблицу конкретного производителя.</p>
    <p>Значения, рассчитанные по D − P, являются ориентировочными. Для серийной обработки, ответственных резьб и допусков 6H/7H сверяй данные производителя, чертёж и материал. Геометрические размеры не заменяют контроль резьбовым калибром.</p>
    <h3>Офлайн-режим</h3><p>После первого открытия опубликованного HTTPS-сайта приложение сохраняет свои файлы и картинки локально. Для установки на iPhone открой ссылку в Safari → «Поделиться» → «На экран Домой».</p>
    <p class="modal-footnote">v2.0 · Не является управляющей программой ЧПУ. Перед обработкой сверяй инструмент и наладку.</p>`);
}
function showSettings() {
  openModal('Настройки',`<h3>Цветовая тема</h3><div class="choices"><button type="button" class="choice-button" id="theme-dark">Тёмная</button><button type="button" class="choice-button" id="theme-light">Светлая</button></div>
  <h3>Выбранная резьба</h3><div class="stat-chip"><span id="current-selection">${fullLabel(state.d,state.p)}</span><b>Ø ${num(drillFor(state.d,state.p).diameter)} мм</b></div>
  <button class="light-action" type="button" id="reset-choice">Сбросить выбор на М10×1,5</button><p class="dialog-hint" id="settings-feedback">Выбранная резьба и тема сохраняются только на этом устройстве.</p>`,()=>{
    function activeTheme(){for(const theme of ['dark','light']) $('theme-'+theme).classList.toggle('active',state.theme===theme);}
    for(const theme of ['dark','light']) $('theme-'+theme).addEventListener('click',()=>{setTheme(theme);activeTheme()});
    $('reset-choice').addEventListener('click',()=>{state.tab='common';selectThread(10,1.5);$('settings-feedback').textContent='Выбор сброшен на М10×1,5';$('current-selection').textContent='M10 × 1.5';});
    activeTheme();
  });
}
function clearSelection() {
  // Close only the result panel. A thread tap reopens it instantly.
  $('result-card').hidden=true;
}
function initEvents() {
  document.querySelectorAll('.mode-tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  $('all-sizes').addEventListener('click',()=>setTab(state.tab==='other'?'common':'other'));
  $('search-open').addEventListener('click',showSearch);
  $('settings-open').addEventListener('click',showSettings);
  $('clear-selection').addEventListener('click',clearSelection);
  $('modal-close').addEventListener('click',closeModal);
  modalBackdrop.addEventListener('click',e=>{if(e.target===modalBackdrop)closeModal()});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !modalBackdrop.hidden) closeModal();
    if(e.key==='Tab' && !modalBackdrop.hidden){
      const items=[...$('modal-sheet').querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(el=>el.offsetParent!==null);
      if(!items.length)return;
      if(e.shiftKey && document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}
      else if(!e.shiftKey && document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
    }
  });
  $('dock-threads').addEventListener('click',()=>{closeModal();$('thread-grid').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('dock-hole').addEventListener('click',showHole);
  $('dock-sizes').addEventListener('click',showGeometry);
  $('dock-table').addEventListener('click',showTable);
  $('dock-info').addEventListener('click',showInfo);
}
let offlineReady=false;
function networkState() {
  $('online-status').textContent=!navigator.onLine?'БЕЗ СЕТИ':offlineReady?'ОФЛАЙН ГОТОВ':'ПОДГОТОВКА ОФЛАЙН';
}
async function registerOffline() {
  if(!('serviceWorker' in navigator)){$('online-status').textContent='ЛОКАЛЬНО';return;}
  try {
    await navigator.serviceWorker.register('./sw.js',{scope:'./'});
    await navigator.serviceWorker.ready;
    const keys=await caches.keys();
    offlineReady=keys.some(key=>key.startsWith('cnc-thread-drill-v2-'));
    networkState();
  }
  catch {$('online-status').textContent='OFFLINE ПОСЛЕ HTTPS';}
}
restore();setTheme(state.theme);updateTabs();drawGrid();drawResult();initEvents();networkState();
window.addEventListener('online',networkState);window.addEventListener('offline',networkState);
if(location.protocol.startsWith('http')) registerOffline();
else $('online-status').textContent='НУЖЕН HTTPS';
})();
