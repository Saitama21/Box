import { normalizeWorkspace, saveWorkspace, workspaceProgress } from './workspace-store.mjs';

export const SAVED_WORKSPACES_KEY='cnc-suite.saved-workspaces-v1';
export const SAVED_WORKSPACES_VERSION=1;
export const SAVED_WORKSPACES_EVENT='cnc-saved-workspaces-changed';

function readRaw(){
  try{
    const value=JSON.parse(globalThis.localStorage?.getItem(SAVED_WORKSPACES_KEY)||'[]');
    return Array.isArray(value)?value:[];
  }catch{return[]}
}

function notify(projects,source='projects'){
  if(globalThis.window?.dispatchEvent){
    window.dispatchEvent(new CustomEvent(SAVED_WORKSPACES_EVENT,{detail:{projects,source}}));
    window.dispatchEvent(new CustomEvent('cnc-local-data-changed',{detail:{key:SAVED_WORKSPACES_KEY,source}}));
  }
}

export function listSavedWorkspaces(){
  return readRaw()
    .map(item=>({
      ...normalizeWorkspace(item),
      savedAt:item.savedAt||item.updatedAt||item.createdAt||new Date().toISOString()
    }))
    .sort((a,b)=>Date.parse(b.savedAt||0)-Date.parse(a.savedAt||0));
}

export function saveWorkspaceProject(workspace,{source='projects-save'}={}){
  const normalized=normalizeWorkspace(workspace);
  const now=new Date().toISOString();
  const project={...normalized,savedAt:now,updatedAt:normalized.updatedAt||now};
  const list=listSavedWorkspaces().filter(item=>item.id!==project.id);
  list.unshift(project);
  try{globalThis.localStorage?.setItem(SAVED_WORKSPACES_KEY,JSON.stringify(list))}catch{}
  notify(list,source);
  return project;
}

export function deleteWorkspaceProject(id,{source='projects-delete'}={}){
  const list=listSavedWorkspaces().filter(item=>item.id!==id);
  try{globalThis.localStorage?.setItem(SAVED_WORKSPACES_KEY,JSON.stringify(list))}catch{}
  notify(list,source);
  return list;
}

export function openWorkspaceProject(id,{source='projects-open'}={}){
  const project=listSavedWorkspaces().find(item=>item.id===id);
  if(!project)return null;
  const opened=saveWorkspace(project,{source});
  return opened;
}

export function projectSummary(project){
  const p=normalizeWorkspace(project);
  const progress=workspaceProgress(p);
  return {
    id:p.id,
    title:p.title,
    material:p.material?.label||p.material?.name||p.material?.title||p.material?.code||p.material?.id||'Материал не выбран',
    geometry:p.geometry?.name||p.geometry?.title||p.geometry?.result?.title||p.geometry?.calc||'Геометрия не выбрана',
    operations:Array.isArray(p.operations)?p.operations.length:0,
    progress,
    savedAt:project?.savedAt||p.updatedAt||p.createdAt
  };
}
