import { calculateCutCalc } from './cutcalc-core.mjs';
import { updateWorkspace } from './workspace-store.mjs';

(() => {
  'use strict';

  const STORAGE_KEY='cutcalc.history.v3';
  const MAX_HISTORY=60;
  const MIN_GRIP=46;
  const $=id=>document.getElementById(id);
  const ids=['Material','Diameter','PartLength','Quantity','Kerf','FaceA','FaceB','StockLength','StockFace','ReservePct'];
  const numeric=ids.filter(x=>x!=='Material');
  const ru=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
  const ru3=new Intl.NumberFormat('ru-RU',{minimumFractionDigits:3,maximumFractionDigits:3});
  let lastResult=null;

  const node=name=>$('cut'+name);
  const raw=name=>node(name)?.value??'';
  const input=()=>({
    material:raw('Material'),diameter:raw('Diameter'),partLength:raw('PartLength'),quantity:raw('Quantity'),
    kerf:raw('Kerf'),faceA:raw('FaceA'),faceB:raw('FaceB'),stockLength:raw('StockLength'),
    stockFace:raw('StockFace'),reservePct:raw('ReservePct'),minChuckGrip:MIN_GRIP
  });
  const hasCore=()=>String(raw('PartLength')).trim()!==''||String(raw('Quantity')).trim()!=='';

  function resetResult(){
    lastResult=null;$('cutPurchaseMeters').textContent='—';$('cutPurchaseHint').hidden=false;$('cutPurchaseHint').textContent='Заполни длину детали и количество';
    $('cutCycleLength').textContent='—';$('cutNetLength').textContent='—';$('cutTechLoss').textContent='—';$('cutPartsPerBar').textContent='—';$('cutBarsCount').textContent='—';$('cutGripTail').textContent='—';$('cutRemainderValue').textContent='—';$('cutWarning').hidden=true;
  }
  function invalid(r){
    lastResult=r;$('cutPurchaseMeters').textContent='—';$('cutPurchaseHint').hidden=false;$('cutPurchaseHint').textContent='Нужны исходные данные';
    $('cutCycleLength').textContent=r.cycleLength>0?ru.format(r.cycleLength)+' мм':'—';$('cutNetLength').textContent=r.input?.partLength>0?ru.format(r.input.partLength)+' мм':'—';$('cutTechLoss').textContent='—';$('cutPartsPerBar').textContent='—';$('cutBarsCount').textContent='—';$('cutGripTail').textContent='—';$('cutRemainderValue').textContent='—';$('cutWarning').hidden=false;$('cutWarning').textContent=r.errors.join(' ');
  }
  function render(){
    if(!hasCore()){resetResult();return}
    const r=calculateCutCalc(input());if(!r.valid){invalid(r);return}
    lastResult=r;$('cutWarning').hidden=true;$('cutPurchaseHint').hidden=false;$('cutPurchaseMeters').textContent=ru3.format(r.purchaseLength/1000);$('cutCycleLength').textContent=ru.format(r.cycleLength)+' мм';$('cutNetLength').textContent=ru.format(r.input.partLength)+' мм';$('cutTechLoss').textContent=ru.format(r.processLoss)+' мм';
    if(r.mode==='direct'){
      $('cutPurchaseHint').textContent=r.targetQuantity+' шт × '+ru.format(r.cycleLength)+' мм'+(r.input.reservePct>0?' · с запасом':'');$('cutPartsPerBar').textContent='—';$('cutBarsCount').textContent='—';$('cutGripTail').textContent='—';$('cutRemainderValue').textContent='—';return;
    }
    $('cutPurchaseHint').textContent=r.bars+' '+(r.bars===1?'пруток':'прутка')+' × '+ru3.format(r.input.stockLength/1000)+' м · '+r.targetQuantity+' шт';
    $('cutPartsPerBar').textContent=r.partsPerBar+' шт';$('cutBarsCount').textContent=String(r.bars);$('cutGripTail').textContent=ru.format(r.fullBarGripTail)+' мм';$('cutRemainderValue').textContent=r.reusableRemainder>0?ru.format(r.reusableRemainder)+' мм':'—';
  }

  function history(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function putHistory(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_HISTORY)))}catch{}}
  function signature(i,r){return JSON.stringify({material:i.material||'',diameter:+i.diameter||0,partLength:+i.partLength||0,quantity:+i.quantity||0,kerf:+i.kerf||0,faceA:+i.faceA||0,faceB:+i.faceB||0,stockLength:+i.stockLength||0,stockFace:+i.stockFace||0,reservePct:+i.reservePct||0,purchaseLength:+r.purchaseLength||0})}
  function saveSnapshot(){
    if(!lastResult?.valid)return;
    const sig=signature(lastResult.input,lastResult),list=history();
    const item={id:Date.now()+'-'+Math.random().toString(16).slice(2,8),createdAt:new Date().toISOString(),signature:sig,input:lastResult.input,result:{purchaseLength:lastResult.purchaseLength}};
    updateWorkspace(w=>({
      material:lastResult.input.material?{...(w.material||{}),label:lastResult.input.material}:w.material,
      stock:{
        material:lastResult.input.material||'',
        diameter:lastResult.input.diameter||null,
        partLength:lastResult.input.partLength||null,
        quantity:lastResult.input.quantity||null,
        stockLength:lastResult.input.stockLength||null
      },
      results:{cutcalc:{...item.result,input:item.input,createdAt:item.createdAt}}
    }),{source:'cutcalc'});
    if(list.some(x=>x.signature===sig))return;
    list.unshift(item);putHistory(list);
  }
  function dateText(iso){
    const d=new Date(iso);if(Number.isNaN(d.valueOf()))return'';const now=new Date();
    return now.toDateString()===d.toDateString()?'Сегодня, '+new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(d):new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function thumb(material){return /латун|brass|cuzn/i.test(material)?'./assets/cutcalc/rod-brass.webp':'./assets/cutcalc/rod-steel.webp'}

  function renderHistory(){
    const list=$('cutHistoryList'),items=history();list.replaceChildren();$('cutHistoryEmpty').hidden=items.length>0;$('cutClearHistory').hidden=items.length===0;
    for(const item of items){
      const b=document.createElement('button');b.type='button';b.className='cutcalc-history-card';
      const img=document.createElement('img');img.src=thumb(item.input.material||'');img.alt='';
      const main=document.createElement('span');main.className='cutcalc-history-main';
      const title=document.createElement('strong');title.textContent=item.input.material||'Материал';
      const d=document.createElement('small');d.textContent=item.input.diameter>0?'Ø '+ru.format(item.input.diameter)+' мм':'Ø —';
      const info=document.createElement('small');info.textContent='L '+ru.format(item.input.partLength)+' мм · '+item.input.quantity+' шт';main.append(title,d,info);
      const result=document.createElement('span');result.className='cutcalc-history-result';const dt=document.createElement('small');dt.textContent=dateText(item.createdAt);const m=document.createElement('strong');m.textContent=ru3.format(item.result.purchaseLength/1000)+' м';result.append(dt,m);
      const arrow=document.createElement('span');arrow.textContent='›';b.append(img,main,result,arrow);b.onclick=()=>{load(item.input);show('calc')};list.append(b);
    }
  }
  function load(data){for(const id of ids){const n=node(id);if(n)n.value=data[id.charAt(0).toLowerCase()+id.slice(1)]??''}render();window.scrollTo({top:0,behavior:'smooth'})}
  function clearAll(){for(const id of ids){const n=node(id);if(n)n.value=''}resetResult();$('cutBarDetails').open=false}
  function show(name){
    if(name==='history')saveSnapshot();
    document.querySelectorAll('.cutcalc-screen').forEach(s=>s.classList.toggle('is-active',s.dataset.cutScreen===name));document.querySelectorAll('[data-cut-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.cutTab===name));
    if(name==='history')renderHistory();window.scrollTo({top:0,behavior:'smooth'});
  }
  function network(){const n=$('cutOfflineState');if(!n)return;n.classList.toggle('is-offline',!navigator.onLine);n.querySelector('span').textContent=navigator.onLine?'Готов к работе':'Офлайн'}

  function init(){
    $('cutMinGripValue').textContent=ru.format(MIN_GRIP)+' мм';
    numeric.forEach(id=>{node(id)?.addEventListener('input',render);node(id)?.addEventListener('change',render)});node('Material')?.addEventListener('input',render);
    $('cutClearAll').onclick=clearAll;document.querySelectorAll('[data-cut-tab]').forEach(b=>b.onclick=()=>show(b.dataset.cutTab));
    $('cutClearHistory').onclick=()=>{if(history().length&&confirm('Удалить всю историю расчётов?')){putHistory([]);renderHistory()}};
    window.addEventListener('online',network,{passive:true});window.addEventListener('offline',network,{passive:true});
    resetResult();renderHistory();network();
  }
  init();
})();