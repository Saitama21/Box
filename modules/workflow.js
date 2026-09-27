import {
  loadWorkspace,
  updateWorkspace,
  resetWorkspace,
  subscribeWorkspace,
  workspaceProgress
} from './workspace-store.mjs';
import { loadMachine, subscribeMachine } from './machine-store.mjs';

(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const fmt=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});

  const stepMap={
    geometry:{target:'geometry',type:'module'},
    material:{target:'modes',type:'module'},
    cutcalc:{target:'cutcalc',type:'module'},
    tool:{target:'tools',type:'route'},
    box:{target:'box',type:'module'},
    copilot:{target:'copilot',type:'module'},
    result:{target:'workflow',type:'route'}
  };

  function text(value,fallback='Не выбрано'){
    const s=String(value??'').trim();
    return s||fallback;
  }

  function materialLabel(w){
    const m=w.material||{};
    return text(m.label||m.name||m.title||m.code||m.id,'Материал не выбран');
  }

  function geometryLabel(w){
    const g=w.geometry||{};
    return text(g.name||g.title||g.result?.title||g.calc,'Геометрия не выбрана');
  }

  function modeLabel(w){
    const m=w.mode||{};
    if(m.rpm||m.feed)return [m.operation,m.rpm?m.rpm+' rpm':'',m.feed?m.feed+' мм/об':''].filter(Boolean).join(' · ');
    return text(m.title,'Режим не выбран');
  }

  function cutcalcLabel(w){
    const r=w.results?.cutcalc;
    if(!r)return w.stock?.diameter?('Ø'+fmt.format(w.stock.diameter)+' · расчёт не сохранён'):'Расчёт не сохранён';
    const meters=Number(r.purchaseLength);
    return Number.isFinite(meters)?fmt.format(meters/1000)+' м заготовки':'Расчёт сохранён';
  }

  function toolLabel(w){
    const t=w.tool||{};
    return text([t.insert,t.holder].filter(Boolean).join(' · '),'Инструмент не выбран');
  }

  function boxLabel(w){
    const b=w.box||{};
    if(!b.total)return'Укладка не рассчитана';
    return b.total+' шт · '+[b.length,b.width,b.height].filter(v=>v!=null).map(v=>fmt.format(v)).join(' × ')+' мм';
  }

  function copilotLabel(w){
    const n=Array.isArray(w.operations)?w.operations.length:0;
    return n?n+' '+(n===1?'операция':'операций'):'Маршрут не собран';
  }

  function resultLabel(w){
    const r=w.results?.copilot;
    if(!r)return'Финальный расчёт не выполнен';
    return r.count?('Рассчитано '+r.count+' операций'):'Результат готов';
  }

  function render(workspace=loadWorkspace()){
    const w=workspace,p=workspaceProgress(w),machine=w.machine||loadMachine();

    if($('workflowTitle')&&document.activeElement!==$('workflowTitle'))$('workflowTitle').value=w.title;
    if($('workflowMachine'))$('workflowMachine').textContent=(machine.name||'Станок')+' · '+(machine.control||'стойка');
    if($('workflowPercent'))$('workflowPercent').textContent=p.percent+'%';
    if($('workflowDoneText'))$('workflowDoneText').textContent=p.done+' из '+p.total+' этапов';
    if($('workflowTrack'))$('workflowTrack').style.width=p.percent+'%';
    if($('homeWorkflowRing'))$('homeWorkflowRing').style.setProperty('--p',p.percent);
    if($('homeWorkflowPercent'))$('homeWorkflowPercent').textContent=p.percent+'%';
    if($('homeWorkflowText'))$('homeWorkflowText').textContent=p.done?('Заполнено '+p.done+' из '+p.total+' этапов'):'Начни с геометрии или материала';

    const labels={
      geometry:geometryLabel(w),
      material:materialLabel(w)+' · '+modeLabel(w),
      cutcalc:cutcalcLabel(w),
      tool:toolLabel(w),
      box:boxLabel(w),
      copilot:copilotLabel(w),
      result:resultLabel(w)
    };

    for(const step of p.steps){
      const node=document.querySelector(`.workflow-step[data-step="${step.id}"]`);
      if(!node)continue;
      node.classList.toggle('is-done',step.done);
      const label=node.querySelector('[data-workflow-status]');
      if(label)label.textContent=labels[step.id];
    }

    const fields={
      workflowSummaryMaterial:materialLabel(w),
      workflowSummaryGeometry:geometryLabel(w),
      workflowSummaryStock:w.stock?.diameter?('Ø'+fmt.format(w.stock.diameter)+' мм'):'—',
      workflowSummaryMode:modeLabel(w),
      workflowSummaryTool:toolLabel(w),
      workflowSummaryRoute:copilotLabel(w)
    };
    for(const [id,value] of Object.entries(fields))if($(id))$(id).textContent=value;
  }

  function open(type,target){
    if(type==='module'){
      if(!window.CNCShell?.openModule?.(target))location.hash=target;
      return;
    }
    window.CNCShell?.activateRoute?.(target,{updateHistory:true});
  }

  document.querySelectorAll('[data-workflow-target]').forEach(button=>{
    button.addEventListener('click',()=>{
      const target=button.dataset.workflowTarget;
      const type=button.dataset.workflowType||'module';
      if(target==='workflow')return;
      open(type,target);
    });
  });

  $('workflowTitle')?.addEventListener('change',event=>{
    updateWorkspace({title:event.target.value.trim()||'Новая деталь'},{source:'workflow-title'});
  });

  $('workflowNew')?.addEventListener('click',()=>{
    const current=workspaceProgress(loadWorkspace());
    if(current.done&& !confirm('Начать новую деталь? Текущий рабочий процесс будет сброшен, но данные внутри отдельных модулей останутся.'))return;
    resetWorkspace();
  });

  $('workflowCopy')?.addEventListener('click',async()=>{
    const w=loadWorkspace(),p=workspaceProgress(w);
    const summary=[
      w.title,
      'Прогресс: '+p.done+'/'+p.total,
      'Материал: '+materialLabel(w),
      'Геометрия: '+geometryLabel(w),
      'Заготовка: '+(w.stock?.diameter?('Ø'+fmt.format(w.stock.diameter)+' мм'):'—'),
      'Режим: '+modeLabel(w),
      'Инструмент: '+toolLabel(w),
      'Маршрут: '+copilotLabel(w)
    ].join('\n');
    try{
      await navigator.clipboard.writeText(summary);
      const b=$('workflowCopy'),old=b.textContent;b.textContent='Скопировано ✓';setTimeout(()=>b.textContent=old,1300);
    }catch{}
  });

  subscribeWorkspace(render);
  subscribeMachine(machine=>{
    const current=loadWorkspace();
    const same=JSON.stringify(current.machine||{})===JSON.stringify(machine||{});
    if(!same)updateWorkspace({machine},{source:'machine'});
  });

  window.addEventListener('cnc-route-opened',event=>{
    if(event.detail?.route==='workflow')render();
  });

  const current=loadWorkspace();
  if(!current.machine)updateWorkspace({machine:loadMachine()},{source:'workflow-init'});
  else render(current);
})();
