import { MODES_DB_NAME, MODES_DB_VERSION, MODES_STORE } from './modes-data.mjs';
import { loadWorkspace, workspaceProgress } from './workspace-store.mjs';
import {
  listSavedWorkspaces,
  saveWorkspaceProject,
  deleteWorkspaceProject,
  openWorkspaceProject,
  projectSummary,
  SAVED_WORKSPACES_EVENT
} from './project-store.mjs';

(() => {
  'use strict';

  const KEYS=Object.freeze({
    cutcalc:'cutcalc.history.v3',
    geometry:'cnc-geometry-projects-v1',
    copilot:'cnc-suite.copilot.route-v1',
    tools:'cncFullToolsV2'
  });

  const $=id=>document.getElementById(id);
  const json=(key,fallback)=>{
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value??fallback;
    }catch{return fallback}
  };

  function list(key){
    const value=json(key,[]);
    return Array.isArray(value)?value:[];
  }

  async function modes(){
    if(!('indexedDB' in window))return[];
    return new Promise(resolve=>{
      try{
        const req=indexedDB.open(MODES_DB_NAME,MODES_DB_VERSION);
        req.onupgradeneeded=()=>{
          const db=req.result;
          if(!db.objectStoreNames.contains(MODES_STORE))db.createObjectStore(MODES_STORE,{keyPath:'id'});
        };
        req.onerror=()=>resolve([]);
        req.onsuccess=()=>{
          const db=req.result;
          try{
            const tx=db.transaction(MODES_STORE,'readonly');
            const all=tx.objectStore(MODES_STORE).getAll();
            all.onsuccess=()=>resolve(Array.isArray(all.result)?all.result:[]);
            all.onerror=()=>resolve([]);
          }catch{resolve([])}
        };
      }catch{resolve([])}
    });
  }

  function route(){
    const value=json(KEYS.copilot,null);
    return value&&Array.isArray(value.route)?value:null;
  }

  function dateValue(value){
    if(value==null)return 0;
    const n=typeof value==='number'?value:Date.parse(value);
    return Number.isFinite(n)?n:0;
  }

  function dateText(value){
    const time=dateValue(value);
    if(!time)return'';
    return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(time));
  }

  function recentRows(data){
    const rows=[];

    for(const item of data.modes){
      rows.push({
        source:'modes',
        accent:'var(--blue)',
        icon:'R',
        title:item.title||'Проверенный режим',
        meta:[item.materialId,item.operation,item.rpm?item.rpm+' rpm':''].filter(Boolean).join(' · '),
        time:item.updatedAt||item.createdAt
      });
    }

    for(const item of data.cutcalc){
      rows.push({
        source:'cutcalc',
        accent:'var(--orange)',
        icon:'C',
        title:item.input?.material||'Расчёт CutCalc',
        meta:[
          item.input?.diameter?('Ø'+item.input.diameter):'',
          item.input?.quantity?(item.input.quantity+' шт'):'',
          item.result?.purchaseLength?((Number(item.result.purchaseLength)/1000).toFixed(3)+' м'):''
        ].filter(Boolean).join(' · '),
        time:item.createdAt
      });
    }

    for(const item of data.geometry){
      rows.push({
        source:'geometry',
        accent:'var(--purple)',
        icon:'G',
        title:item.name||'Geometry проект',
        meta:item.calc||'Геометрия',
        time:item.updated
      });
    }

    return rows.sort((a,b)=>dateValue(b.time)-dateValue(a.time)).slice(0,12);
  }

  function sourceCount(data){
    return [
      data.modes.length,
      data.cutcalc.length,
      data.geometry.length,
      data.tools.length,
      data.route?.route?.length||0
    ].filter(Boolean).length;
  }

  async function snapshot(){
    return{
      workspace:loadWorkspace(),
      saved:listSavedWorkspaces(),
      modes:await modes(),
      cutcalc:list(KEYS.cutcalc),
      geometry:list(KEYS.geometry),
      tools:list(KEYS.tools),
      route:route()
    };
  }

  function setText(id,value){
    const node=$(id);
    if(node)node.textContent=String(value);
  }

  function renderSources(data){
    setText('projectsModesCount',data.modes.length);
    setText('projectsCutcalcCount',data.cutcalc.length);
    setText('projectsGeometryCount',data.geometry.length);
    setText('projectsToolsCount',data.tools.length);
    setText('projectsCopilotCount',data.route?.route?.length||0);
  }

  function renderSaved(data){
    const root=$('projectsSavedList'),empty=$('projectsSavedEmpty');
    if(!root||!empty)return;

    root.replaceChildren();
    empty.hidden=data.saved.length>0;
    setText('projectsSavedCount',data.saved.length);

    const activeId=data.workspace?.id||'';

    for(const project of data.saved){
      const s=projectSummary(project);
      const card=document.createElement('article');
      card.className='saved-project-card';
      if(s.id===activeId)card.classList.add('is-active');

      const head=document.createElement('div');head.className='saved-project-head';
      const titleWrap=document.createElement('div');
      const eyebrow=document.createElement('small');eyebrow.textContent=s.id===activeId?'ТЕКУЩАЯ ДЕТАЛЬ':'СОХРАНЁННЫЙ ПРОЕКТ';
      const title=document.createElement('strong');title.textContent=s.title;
      titleWrap.append(eyebrow,title);
      const percent=document.createElement('b');percent.textContent=s.progress.percent+'%';
      head.append(titleWrap,percent);

      const meta=document.createElement('div');meta.className='saved-project-meta';
      for(const [label,value] of [
        ['Материал',s.material],
        ['Геометрия',s.geometry],
        ['Маршрут',s.operations+' оп.']
      ]){
        const item=document.createElement('span');
        const k=document.createElement('small');k.textContent=label;
        const v=document.createElement('b');v.textContent=value;
        item.append(k,v);meta.appendChild(item);
      }

      const foot=document.createElement('div');foot.className='saved-project-foot';
      const date=document.createElement('span');date.textContent=dateText(s.savedAt)||'локально';
      const actions=document.createElement('div');

      const open=document.createElement('button');open.type='button';open.textContent=s.id===activeId?'Продолжить':'Открыть';
      open.onclick=()=>{
        const loaded=openWorkspaceProject(s.id);
        if(!loaded)return;
        window.CNCShell?.activateRoute('workflow',{updateHistory:true});
      };

      const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='×';
      del.setAttribute('aria-label','Удалить проект');
      del.onclick=()=>{
        if(!confirm('Удалить сохранённый проект «'+s.title+'»? Текущий Workflow и данные модулей не удалятся.'))return;
        deleteWorkspaceProject(s.id);
      };

      actions.append(open,del);foot.append(date,actions);
      card.append(head,meta,foot);root.appendChild(card);
    }
  }

  function renderRecent(data){
    const root=$('projectsList');
    const empty=$('projectsEmpty');
    if(!root||!empty)return;

    const rows=recentRows(data);
    root.replaceChildren();
    empty.hidden=rows.length>0;
    setText('projectsRecentCount',rows.length);

    for(const item of rows){
      const row=document.createElement('article');
      row.className='project-row';
      row.style.setProperty('--row-accent',item.accent);
      row.innerHTML='<div class="project-row-icon"></div><div class="project-row-main"><strong></strong><small></small></div><div class="project-row-actions"><button type="button">Открыть</button></div>';
      row.querySelector('.project-row-icon').textContent=item.icon;
      row.querySelector('strong').textContent=item.title;
      row.querySelector('small').textContent=[item.meta,dateText(item.time)].filter(Boolean).join(' · ');
      row.querySelector('button').onclick=()=>window.CNCShell?.openModule(item.source);
      root.appendChild(row);
    }
  }

  async function render(){
    const data=await snapshot();
    const total=data.modes.length+data.cutcalc.length+data.geometry.length+data.tools.length+(data.route?.route?.length?1:0);

    setText('projectsTotal',total);
    setText('projectsSavedCount',data.saved.length);
    setText('projectsSourceCount',sourceCount(data));
    setText('projectsModeTotal',data.modes.length);
    setText('projectsToolTotal',data.tools.length);
    renderSaved(data);
    renderSources(data);
    renderRecent(data);

    const toast=$('projectsToast');
    if(toast){
      toast.textContent='Локальные данные синхронизированы · '+new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date());
      toast.hidden=false;
    }

    return data;
  }

  function saveCurrent(){
    const current=loadWorkspace();
    const progress=workspaceProgress(current);
    if(progress.done===0 && current.title==='Новая деталь'){
      if(!confirm('Текущая деталь пока пустая. Всё равно сохранить проект?'))return;
    }
    saveWorkspaceProject(current);
    const b=$('projectsSaveCurrent');
    if(b){
      const old=b.textContent;
      b.textContent='Сохранено ✓';
      setTimeout(()=>b.textContent=old,1300);
    }
  }

  async function exportAll(){
    const data=await snapshot();
    const payload={
      type:'cnc-copilot-workspace-library',
      version:2,
      exportedAt:new Date().toISOString(),
      data
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='cnc-copilot-library-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),800);
  }

  document.querySelectorAll('[data-projects-open]').forEach(button=>{
    button.addEventListener('click',()=>window.CNCShell?.openModule(button.dataset.projectsOpen));
  });

  $('projectsSaveCurrent')?.addEventListener('click',saveCurrent);
  $('projectsRefresh')?.addEventListener('click',render);
  $('projectsExport')?.addEventListener('click',exportAll);

  window.addEventListener('cnc-local-data-changed',render);
  window.addEventListener(SAVED_WORKSPACES_EVENT,render);
  window.addEventListener('cnc-module-opened',event=>{
    if(event.detail?.id)render();
  });
  window.addEventListener('cnc-route-opened',event=>{
    if(event.detail?.route==='projects')render();
  });
  window.addEventListener('storage',render);

  render();
  window.CNCProjects=Object.freeze({refresh:render,snapshot,saveCurrent});
})();
