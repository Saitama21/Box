import { calculateMachining, OPERATIONS } from './copilot-core.mjs';
import { MATERIALS } from './copilot-materials.mjs';

(() => {
  'use strict';

  const D=window.CNC_DATA||{};
  const MACHINE_KEY='cncFullMachineV1';
  const ROUTE_KEY='cnc-suite.copilot.route-v1';
  const $=id=>document.getElementById(id);
  const isoColors={P:'#2788ff',M:'#f3cc28',K:'#e94b4b',N:'#39b95a',S:'#c77a3a',H:'#9ba3ad'};
  const defaults=D.machineDefault||{name:'Tengyue CK52PT-Y',control:'SINUMERIK 828D / ShopTurn',maxRpm:4000,spindleKw:17,efficiency:.85,chuckCylinder:{maxRpm:6000,model:'BK-1552'},motor:{maxRpm:8000,model:'1PH8137-1DD02-0CA1'}};

  const state={step:1,machine:loadMachine(),materialCode:'AISI304',stockDia:50,route:[],mode:'normal',results:[]};

  function loadMachine(){try{return{...defaults,...JSON.parse(localStorage.getItem(MACHINE_KEY)||'{}')}}catch{return{...defaults}}}
  function saveMachine(){try{localStorage.setItem(MACHINE_KEY,JSON.stringify(state.machine))}catch{}}
  function saveRoute(){try{localStorage.setItem(ROUTE_KEY,JSON.stringify({materialCode:state.materialCode,stockDia:state.stockDia,route:state.route,mode:state.mode}))}catch{}}
  function restoreRoute(){try{const v=JSON.parse(localStorage.getItem(ROUTE_KEY)||'null');if(v){state.materialCode=v.materialCode||state.materialCode;state.stockDia=Number(v.stockDia)||state.stockDia;state.route=Array.isArray(v.route)?v.route:[];state.mode=['reliable','normal','productive'].includes(v.mode)?v.mode:'normal'}}catch{}}
  function uid(){return crypto.randomUUID?.()||'op-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
  function material(){return MATERIALS.find(m=>m.code===state.materialCode)||MATERIALS.find(m=>m.code==='AISI304')||MATERIALS[0]}
  function opLabel(id){return OPERATIONS[id]?.label||id}

  function setStep(n){
    n=Math.max(1,Math.min(5,Number(n)||1));state.step=n;
    document.querySelectorAll('.copilot-screen').forEach(x=>x.classList.toggle('is-active',+x.dataset.copilotScreen===n));
    document.querySelectorAll('.copilot-step').forEach(x=>{const v=+x.dataset.copilotStep;x.classList.toggle('is-active',v===n);x.classList.toggle('is-done',v<n)});
    if(n===5)calculateAll();
    window.scrollTo({top:0,behavior:'smooth'});saveRoute();
  }

  function syncMachine(){
    $('copMachineName').textContent=state.machine.name||defaults.name;$('copMachineControl').textContent=state.machine.control||defaults.control;
    $('copMachineMaxRpm').value=state.machine.maxRpm||4000;$('copMachinePower').value=state.machine.spindleKw||17;$('copSetupMaxRpm').value=state.machine.setupMaxRpm||'';
    $('copMachineLiveRpm').textContent=(state.machine.maxRpm||4000)+' rpm';$('copMachineLivePower').textContent=(state.machine.spindleKw||17)+' kW';$('copMachineLiveCylinder').textContent=(state.machine.chuckCylinder?.model||'BK-1552')+' · '+(state.machine.chuckCylinder?.maxRpm||6000);$('copMachineLiveControl').textContent='828D';
  }
  function readMachine(){
    state.machine.maxRpm=Math.max(100,Number($('copMachineMaxRpm').value)||4000);state.machine.spindleKw=Math.max(1,Number($('copMachinePower').value)||17);state.machine.setupMaxRpm=$('copSetupMaxRpm').value?Math.max(100,Number($('copSetupMaxRpm').value)):null;saveMachine();syncMachine();
  }

  function renderMaterials(filter=''){
    const q=filter.trim().toLowerCase(),root=$('copMaterialList');root.innerHTML='';
    MATERIALS.filter(m=>!q||[m.code,m.name,...(m.aliases||[])].join(' ').toLowerCase().includes(q)).forEach(m=>{
      const b=document.createElement('button');b.type='button';b.className='copilot-material-card'+(m.code===state.materialCode?' is-selected':'');b.style.setProperty('--iso',isoColors[m.iso]||'#41e0e9');
      b.innerHTML=`<i>ISO ${m.iso}</i><strong>${m.code}</strong><small>${m.name}</small>`;b.onclick=()=>{state.materialCode=m.code;$('copStockDia').value=state.stockDia;renderMaterials($('copMaterialSearch').value);syncMaterial();saveRoute()};root.appendChild(b)
    })
  }
  function syncMaterial(){
    const m=material();$('copSelectedMaterial').textContent=m.code+' · '+m.name;$('copSelectedIso').textContent='ISO '+m.iso;$('copMaterialNote').textContent=m.note||'Стартовый профиль материала загружен.';
  }

  function makeRoute(operation='turning'){return{id:uid(),operation,diameterMm:state.stockDia||50,cutType:'semi',threadPitchMm:'',toolDiameterMm:'',cutLengthMm:'',passes:1,customVc:'',customFeed:'',customAp:''}}
  function ensureRoute(){if(!state.route.length)state.route.push(makeRoute())}
  function renderRoute(){
    const root=$('copRouteList');root.innerHTML='';
    state.route.forEach((r,i)=>{
      const row=document.createElement('article');row.className='copilot-route';const isThread=OPERATIONS[r.operation]?.threading,isDrill=OPERATIONS[r.operation]?.drilling;
      row.innerHTML=`<div class="copilot-route-top"><span class="copilot-route-index">${i+1}</span><select data-route-field="operation">${Object.entries(OPERATIONS).map(([id,o])=>`<option value="${id}" ${id===r.operation?'selected':''}>${o.label}</option>`).join('')}</select><button class="copilot-route-remove" type="button">×</button></div>
      <div class="copilot-route-fields">
        <label><span>Ø обработки, мм</span><input data-route-field="diameterMm" inputmode="decimal" value="${r.diameterMm??''}"></label>
        <label><span>Тип прохода</span><select data-route-field="cutType"><option value="rough" ${r.cutType==='rough'?'selected':''}>Черновой</option><option value="semi" ${r.cutType==='semi'?'selected':''}>Получистовой</option><option value="finish" ${r.cutType==='finish'?'selected':''}>Чистовой</option></select></label>
        ${isThread?`<label><span>Шаг резьбы P</span><input data-route-field="threadPitchMm" inputmode="decimal" value="${r.threadPitchMm??''}" placeholder="1.5"></label>`:isDrill?`<label><span>Ø сверла/инструмента</span><input data-route-field="toolDiameterMm" inputmode="decimal" value="${r.toolDiameterMm??''}" placeholder="10"></label>`:'<label><span>Количество проходов</span><input data-route-field="passes" inputmode="numeric" value="'+(r.passes||1)+'"></label>'}
        <label><span>Длина резания, мм</span><input data-route-field="cutLengthMm" inputmode="decimal" value="${r.cutLengthMm??''}" placeholder="необяз."></label>
        <label><span>Vc вручную</span><input data-route-field="customVc" inputmode="decimal" value="${r.customVc??''}" placeholder="авто"></label>
        <label><span>f вручную, мм/об</span><input data-route-field="customFeed" inputmode="decimal" value="${r.customFeed??''}" placeholder="авто"></label>
        <label><span>ap вручную, мм</span><input data-route-field="customAp" inputmode="decimal" value="${r.customAp??''}" placeholder="авто"></label>
      </div>`;
      row.querySelector('.copilot-route-remove').onclick=()=>{state.route.splice(i,1);renderRoute();saveRoute()};
      row.querySelectorAll('[data-route-field]').forEach(input=>input.onchange=input.oninput=()=>{
        const k=input.dataset.routeField;let v=input.value;if(['diameterMm','threadPitchMm','toolDiameterMm','cutLengthMm','passes','customVc','customFeed','customAp'].includes(k))v=String(v).trim()===''?'':Number(String(v).replace(',','.'));r[k]=v;
        if(k==='operation')renderRoute();saveRoute();
      });root.appendChild(row);
    });
    $('copRouteCount').textContent=state.route.length+' оп.';
  }

  function setMode(mode){state.mode=mode;document.querySelectorAll('[data-cop-mode]').forEach(b=>b.classList.toggle('is-active',b.dataset.copMode===mode));saveRoute()}
  function inputFor(r){
    const m=state.machine,cyl=m.chuckCylinder||defaults.chuckCylinder||{},motor=m.motor||defaults.motor||{};
    return{materialCode:state.materialCode,operation:r.operation,diameterMm:Number(r.diameterMm)||state.stockDia,mode:state.mode,cutType:r.cutType||'semi',maxRpm:m.maxRpm||4000,machineMaxRpm:m.maxRpm||4000,machinePowerKw:m.spindleKw||17,hydraulicCylinderMaxRpm:cyl.maxRpm||6000,hydraulicCylinderModel:cyl.model||'BK-1552',motorMaxRpm:motor.maxRpm||8000,motorModel:motor.model||'1PH8137-1DD02-0CA1',setupMaxRpm:m.setupMaxRpm||null,threadPitchMm:r.threadPitchMm||null,toolDiameterMm:r.toolDiameterMm||null,cutLengthMm:r.cutLengthMm||null,passes:r.passes||1,customVc:r.customVc||null,customFeed:r.customFeed||null,customAp:r.customAp||null};
  }

  function calculateAll(){
    if(!state.route.length){$('copResults').innerHTML='<div class="copilot-empty"><span>⌁</span><strong>Маршрут пуст</strong><p>Вернись на шаг «Операции» и добавь хотя бы одну.</p></div>';return}
    const out=[];try{for(const r of state.route)out.push({route:r,result:calculateMachining(inputFor(r))})}catch(err){$('copResults').innerHTML=`<div class="copilot-empty"><span>!</span><strong>Не хватает данных</strong><p>${String(err.message||err)}</p></div>`;return}
    state.results=out;renderResults();
  }
  function renderResults(){
    const root=$('copResults');root.innerHTML='';
    state.results.forEach(({route,result:r},i)=>{
      const card=document.createElement('article');card.className='copilot-result-group';
      const power=r.powerLoadPercent==null?'—':r.powerLoadPercent+'%',time=r.cuttingTimeMin==null?'—':r.cuttingTimeMin+' мин';
      card.innerHTML=`<div class="copilot-result-head"><div><small>ОПЕРАЦИЯ ${i+1}</small><strong>${r.operation.label}</strong></div><span>${r.material.code} · ${r.cutType.label}</span></div>
      <div class="copilot-metrics"><div class="copilot-metric rpm"><small>S · ШПИНДЕЛЬ</small><strong>${r.spindleRpm}</strong></div><div class="copilot-metric feed"><small>f · G95</small><strong>${r.feedMmRev}</strong></div><div class="copilot-metric"><small>Vc факт.</small><strong>${r.vcActual}</strong></div><div class="copilot-metric"><small>ap</small><strong>${r.apMm}</strong></div></div>
      <div class="copilot-secondary"><div><span>F линейная</span><strong>${r.feedMmMin} мм/мин</strong></div><div><span>Мощность / нагрузка</span><strong>${r.requiredSpindlePowerKw??'—'} кВт · ${power}</strong></div><div><span>Время резания</span><strong>${time}</strong></div></div>
      <pre class="copilot-machine-code">${r.machineInput.constantSurface}\n${r.machineInput.feedMode} ${r.machineInput.feedPerRev}\n; ${r.machineInput.summary}</pre>
      <div class="copilot-warnings">${r.warnings.map(w=>'<div class="copilot-warning">'+escapeHtml(w)+'</div>').join('')}</div>
      <div class="copilot-result-actions"><button type="button" data-copy="${i}">⧉ Копировать для стойки</button></div>`;
      card.querySelector('[data-copy]').onclick=async()=>{const t=r.machineInput.constantSurface+'\n'+r.machineInput.feedMode+' '+r.machineInput.feedPerRev+'\n; '+r.machineInput.summary;try{await navigator.clipboard.writeText(t);card.querySelector('[data-copy]').textContent='Скопировано ✓';setTimeout(()=>card.querySelector('[data-copy]').textContent='⧉ Копировать для стойки',1400)}catch{}};
      root.appendChild(card);
    });
  }
  function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function bind(){
    document.querySelectorAll('.copilot-step').forEach(b=>b.onclick=()=>setStep(b.dataset.copilotStep));
    document.querySelectorAll('[data-cop-next]').forEach(b=>b.onclick=()=>setStep(+b.dataset.copNext));
    document.querySelectorAll('[data-cop-prev]').forEach(b=>b.onclick=()=>setStep(+b.dataset.copPrev));
    ['copMachineMaxRpm','copMachinePower','copSetupMaxRpm'].forEach(id=>$(id).addEventListener('change',readMachine));
    $('copMaterialSearch').oninput=e=>renderMaterials(e.target.value);$('copStockDia').oninput=e=>{state.stockDia=Number(String(e.target.value).replace(',','.'))||0;saveRoute()};
    $('copAddOperation').onclick=()=>{state.route.push(makeRoute());renderRoute();saveRoute()};
    document.querySelectorAll('[data-cop-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.copMode));
    $('copRecalculate').onclick=calculateAll;
    window.addEventListener('cnc-machine-profile-changed',e=>{state.machine={...state.machine,...(e.detail||{})};syncMachine();if(state.step===5)calculateAll()});
  }

  restoreRoute();ensureRoute();syncMachine();$('copStockDia').value=state.stockDia;renderMaterials();syncMaterial();renderRoute();setMode(state.mode);bind();setStep(1);
})();