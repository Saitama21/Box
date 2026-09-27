export const WORKSPACE_STORAGE_KEY = 'cnc-suite.workspace-v1';
export const WORKSPACE_EVENT = 'cnc-workspace-changed';
export const WORKSPACE_VERSION = 1;

function uid(){
  try{return globalThis.crypto?.randomUUID?.()||'ws-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
  catch{return 'ws-'+Date.now()}
}

export function emptyWorkspace(now = new Date().toISOString()){
  return {
    version:WORKSPACE_VERSION,
    id:uid(),
    title:'Новая деталь',
    material:null,
    stock:null,
    geometry:null,
    mode:null,
    tool:null,
    box:null,
    machine:null,
    operations:[],
    results:{
      cutcalc:null,
      copilot:null
    },
    createdAt:now,
    updatedAt:now
  };
}

function object(value){
  return value&&typeof value==='object'&&!Array.isArray(value)?value:null;
}

export function normalizeWorkspace(raw){
  const base=emptyWorkspace(object(raw)?.createdAt||new Date().toISOString());
  const safe=object(raw)||{};
  return {
    ...base,
    ...safe,
    version:WORKSPACE_VERSION,
    id:String(safe.id||base.id),
    title:String(safe.title||'Новая деталь').trim()||'Новая деталь',
    material:object(safe.material),
    stock:object(safe.stock),
    geometry:object(safe.geometry),
    mode:object(safe.mode),
    tool:object(safe.tool),
    box:object(safe.box),
    machine:object(safe.machine),
    operations:Array.isArray(safe.operations)?safe.operations:[],
    results:{
      cutcalc:object(safe.results)?.cutcalc||null,
      copilot:object(safe.results)?.copilot||null
    },
    createdAt:safe.createdAt||base.createdAt,
    updatedAt:safe.updatedAt||base.updatedAt
  };
}

export function loadWorkspace(){
  try{
    const raw=JSON.parse(globalThis.localStorage?.getItem(WORKSPACE_STORAGE_KEY)||'null');
    return normalizeWorkspace(raw||{});
  }catch{
    return normalizeWorkspace({});
  }
}

export function saveWorkspace(workspace,{source='workspace',notify=true}={}){
  const next=normalizeWorkspace({...workspace,updatedAt:new Date().toISOString()});
  try{
    globalThis.localStorage?.setItem(WORKSPACE_STORAGE_KEY,JSON.stringify(next));
    if(notify&&globalThis.window?.dispatchEvent){
      window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT,{detail:{workspace:next,source}}));
      window.dispatchEvent(new CustomEvent('cnc-local-data-changed',{detail:{key:WORKSPACE_STORAGE_KEY,source}}));
    }
  }catch{}
  return next;
}

export function updateWorkspace(patch,{source='workspace'}={}){
  const current=loadWorkspace();
  const delta=typeof patch==='function'?patch(current):(patch||{});
  const next={
    ...current,
    ...delta,
    results:{
      ...(current.results||{}),
      ...(delta.results||{})
    }
  };
  return saveWorkspace(next,{source});
}

export function resetWorkspace(title='Новая деталь'){
  return saveWorkspace({...emptyWorkspace(),title},{source:'reset'});
}

export function subscribeWorkspace(listener){
  if(!globalThis.window?.addEventListener)return()=>{};
  const handler=event=>listener(event.detail?.workspace||loadWorkspace(),event.detail?.source||'event');
  window.addEventListener(WORKSPACE_EVENT,handler);
  return()=>window.removeEventListener(WORKSPACE_EVENT,handler);
}

export function workspaceSteps(workspace=loadWorkspace()){
  const w=normalizeWorkspace(workspace);
  const steps=[
    {id:'geometry',done:!!w.geometry},
    {id:'material',done:!!w.material||!!w.mode},
    {id:'cutcalc',done:!!w.results.cutcalc||!!w.stock},
    {id:'tool',done:!!w.tool},
    {id:'box',done:!!w.box},
    {id:'copilot',done:Array.isArray(w.operations)&&w.operations.length>0},
    {id:'result',done:!!w.results.copilot}
  ];
  return steps;
}

export function workspaceProgress(workspace=loadWorkspace()){
  const steps=workspaceSteps(workspace);
  const done=steps.filter(x=>x.done).length;
  return {done,total:steps.length,percent:Math.round(done/steps.length*100),steps};
}
