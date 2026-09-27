import { loadWorkspace, subscribeWorkspace } from './workspace-store.mjs';
import { buildWorkspaceResult, workspaceResultText, workspaceNcDraft } from './result-core.mjs';

(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const fmt=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3});
  const missingLabels={
    geometry:'геометрия',
    material:'материал / режим',
    tool:'инструмент',
    operations:'маршрут',
    copilot:'расчёт Co-Pilot'
  };

  function value(v,suffix=''){
    return v==null?'—':fmt.format(v)+(suffix?(' '+suffix):'');
  }

  function toolText(r){
    return [r.tool?.holder,r.tool?.insert,r.tool?.grade].filter(Boolean).join(' · ')||'—';
  }

  function stockText(r){
    const parts=[];
    if(r.stock?.diameter!=null)parts.push('Ø'+fmt.format(r.stock.diameter)+' мм');
    if(r.stock?.partLength!=null)parts.push('L '+fmt.format(r.stock.partLength)+' мм');
    if(r.stock?.quantity!=null)parts.push(r.stock.quantity+' шт');
    return parts.join(' · ')||'—';
  }

  function set(id,text){
    const node=$(id);if(node)node.textContent=text;
  }

  function renderOps(r){
    const root=$('workflowResultOps');if(!root)return;
    root.replaceChildren();

    if(!r.operations.length){
      const empty=document.createElement('div');
      empty.className='result-empty';
      empty.textContent='Нет рассчитанных операций. Собери маршрут и выполни расчёт в CNC Co-Pilot.';
      root.appendChild(empty);
      return;
    }

    for(const op of r.operations){
      const card=document.createElement('article');card.className='result-op';
      const head=document.createElement('div');head.className='result-op-head';
      const copy=document.createElement('div');
      const tag=document.createElement('small');tag.textContent='ОПЕРАЦИЯ '+String(op.index).padStart(2,'0');
      const title=document.createElement('strong');title.textContent=op.name;
      copy.append(tag,title);
      const rpm=document.createElement('b');rpm.textContent=op.rpm==null?'S —':'S '+fmt.format(op.rpm);
      head.append(copy,rpm);

      const metrics=document.createElement('div');metrics.className='result-op-metrics';
      for(const [label,val] of [
        ['Обороты',value(op.rpm,'rpm')],
        ['Подача',value(op.feed,'мм/об')],
        ['Vc',value(op.vc,'м/мин')],
        ['ap',value(op.ap,'мм')]
      ]){
        const item=document.createElement('div');
        const s=document.createElement('span');s.textContent=label;
        const b=document.createElement('strong');b.textContent=val;
        item.append(s,b);metrics.appendChild(item);
      }

      card.append(head,metrics);
      for(const warning of op.warnings){
        const note=document.createElement('div');note.className='result-warning';note.textContent='! '+warning;card.appendChild(note);
      }
      root.appendChild(card);
    }
  }

  function renderMissing(r){
    const root=$('workflowResultMissing');if(!root)return;
    root.replaceChildren();
    root.hidden=!r.missing.length;
    for(const id of r.missing){
      const chip=document.createElement('span');chip.textContent='Нужно: '+(missingLabels[id]||id);root.appendChild(chip);
    }
  }

  function render(workspace=loadWorkspace()){
    const r=buildWorkspaceResult(workspace);
    const state=$('workflowResultState');
    if(state){
      state.classList.toggle('is-ready',r.ready);
      const span=state.querySelector('span');
      if(span)span.textContent=r.ready?'ТЕХПРОЦЕСС СОБРАН':'НЕ ХВАТАЕТ ДАННЫХ';
    }

    set('workflowResultTitle',r.title);
    set('workflowResultMeta',(r.machine.name||'—')+' · '+(r.machine.control||'—'));
    set('workflowResultMaterial',r.material.label);
    set('workflowResultStock',stockText(r));
    set('workflowResultGeometry',r.geometry.name);
    set('workflowResultTool',toolText(r));
    set('workflowResultMode',[
      r.mode.operation,
      r.mode.rpm!=null?r.mode.rpm+' rpm':'',
      r.mode.feed!=null?'f '+r.mode.feed:''
    ].filter(Boolean).join(' · ')||'—');
    set('workflowResultCutcalc',r.cutcalc?.purchaseLength!=null?(fmt.format(r.cutcalc.purchaseLength/1000)+' м'):'—');
    set('workflowResultBox',r.box?.total!=null?(r.box.total+' шт · '+[r.box.length,r.box.width,r.box.height].filter(v=>v!=null).map(v=>fmt.format(v)).join(' × ')+' мм'):'—');
    set('workflowResultOpCount',r.operations.length+' '+(r.operations.length===1?'операция':'операций'));

    renderMissing(r);
    renderOps(r);

    const nc=workspaceNcDraft(r);
    if($('workflowResultCode'))$('workflowResultCode').textContent=nc;

    const hasOps=r.operations.length>0;
    if($('resultCopyNc'))$('resultCopyNc').disabled=!hasOps;
    if($('resultDownloadNc'))$('resultDownloadNc').disabled=!hasOps;

    return r;
  }

  function download(name,content,type='text/plain;charset=utf-8'){
    const blob=new Blob([content],{type});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),800);
  }

  function filename(title,ext){
    const base=String(title||'cnc-result').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').slice(0,70)||'cnc-result';
    return base+'.'+ext;
  }

  async function copyButton(button,text){
    try{
      await navigator.clipboard.writeText(text);
      const old=button.textContent;button.textContent='Скопировано ✓';setTimeout(()=>button.textContent=old,1300);
    }catch{}
  }

  $('resultCopySummary')?.addEventListener('click',()=>{
    const r=buildWorkspaceResult(loadWorkspace());
    copyButton($('resultCopySummary'),workspaceResultText(r));
  });

  $('resultCopyNc')?.addEventListener('click',()=>{
    const r=buildWorkspaceResult(loadWorkspace());
    if(!r.operations.length)return;
    copyButton($('resultCopyNc'),workspaceNcDraft(r));
  });

  $('resultDownloadTxt')?.addEventListener('click',()=>{
    const r=buildWorkspaceResult(loadWorkspace());
    download(filename(r.title,'txt'),workspaceResultText(r));
  });

  $('resultDownloadNc')?.addEventListener('click',()=>{
    const r=buildWorkspaceResult(loadWorkspace());
    if(!r.operations.length)return;
    download(filename(r.title,'NC'),workspaceNcDraft(r),'text/plain;charset=utf-8');
  });

  $('resultDownloadJson')?.addEventListener('click',()=>{
    const workspace=loadWorkspace(),r=buildWorkspaceResult(workspace);
    download(filename(r.title,'json'),JSON.stringify({type:'cnc-copilot-result',version:1,exportedAt:new Date().toISOString(),workspace,result:r},null,2),'application/json');
  });

  $('resultOpenCopilot')?.addEventListener('click',()=>window.CNCShell?.openModule('copilot'));

  subscribeWorkspace(render);
  window.addEventListener('cnc-route-opened',event=>{if(event.detail?.route==='workflow')render()});
  render();
})();
