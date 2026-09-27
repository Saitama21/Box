(() => {
  'use strict';
  const KEY='cncFullToolsV2';
  const D=window.CNC_DATA||{tools:[]};
  const $=id=>document.getElementById(id);
  const state={query:'',iso:'all',editing:null};

  const uid=()=>crypto.randomUUID?.()||'local-'+Date.now()+'-'+Math.random().toString(16).slice(2);
  function local(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));window.dispatchEvent(new CustomEvent('cnc-local-data-changed',{detail:{key:KEY}}));return true}catch{return false}}
  function normalize(t,localTool=false){return{...t,id:t.id||uid(),holder:t.holder||'',insert:t.insert||'',grade:t.grade||'',breaker:t.breaker||'',nose:t.nose??'',iso:Array.isArray(t.iso)?t.iso:(t.iso?[t.iso]:[]),ops:Array.isArray(t.ops)?t.ops:[],quantity:t.quantity==null?(localTool?1:null):Math.max(0,Number(t.quantity)||0),location:t.location||'',photos:t.photos||{},source:t.source||(localTool?'Мой шкаф':'Каталог'),libraryType:localTool?'cupboard':(t.libraryType||'catalog')}}
  function all(){return[...(D.tools||[]).map(t=>normalize(t,false)),...local().map(t=>normalize(t,true))]}
  function filtered(){const q=state.query.toLowerCase();return all().filter(t=>(state.iso==='all'||(t.iso||[]).includes(state.iso))&&(!q||[t.insert,t.holder,t.grade,t.breaker,t.location,t.source].join(' ').toLowerCase().includes(q)))}
  function stats(){const l=local();$('toolsCount').textContent=all().length;$('toolsLocalCount').textContent=l.length;$('toolsQty').textContent=l.reduce((n,t)=>n+(Number(t.quantity)||0),0)}
  function art(card,t){const host=card.querySelector('.tool-card-art'),src=t.photos?.front||t.photos?.box||'';if(src){const img=new Image();img.alt='';img.src=src;host.appendChild(img)}else{const shape=document.createElement('span');shape.className='insert-shape';host.appendChild(shape)}}
  async function useTool(t,button){
    try{
      const {updateWorkspace}=await import('./workspace-store.mjs');
      updateWorkspace({
        tool:{
          id:t.id||'',
          holder:t.holder||'',
          insert:t.insert||'',
          grade:t.grade||'',
          breaker:t.breaker||'',
          nose:t.nose??null,
          iso:t.iso||[],
          ops:t.ops||[],
          source:t.source||'',
          location:t.location||''
        }
      },{source:'tools'});
      if(button){const old=button.textContent;button.textContent='✓ В работе';setTimeout(()=>button.textContent=old,1300)}
    }catch{}
  }

  function activeToolId(){
    try{return JSON.parse(localStorage.getItem('cnc-suite.workspace-v1')||'{}')?.tool?.id||''}catch{return''}
  }

  function render(){
    stats();const root=$('toolsGrid');root.innerHTML='';const rows=filtered();
    if(!rows.length){root.innerHTML='<div class="tools-empty"><span>◇</span><strong>Ничего не найдено</strong><p>Сбрось фильтр или добавь свою пластину/державку.</p></div>';return}
    rows.forEach(t=>{
      const isLocal=t.libraryType==='cupboard',card=document.createElement('article');card.className='tool-card'+(isLocal?' is-local':'')+(t.id===activeToolId()?' is-workflow-active':'');
      card.innerHTML=`<div class="tool-card-art"></div><div class="tool-card-copy"><small>${isLocal?'МОЙ ШКАФ':'КАТАЛОГ'}</small><strong></strong><span class="tool-desc"></span><div class="tool-card-meta"></div></div><div class="tool-card-actions"></div>`;
      card.querySelector('strong').textContent=t.insert||'Инструмент';card.querySelector('.tool-desc').textContent=(t.holder||'Державка не указана')+' · '+(t.grade||'grade —')+' · '+(t.breaker||'стружколом —');
      const meta=card.querySelector('.tool-card-meta');for(const s of [...(t.iso||[]).map(x=>'ISO '+x),...(isLocal?[String(t.quantity||0)+' шт',t.location||'без ячейки']:[])]){const i=document.createElement('i');i.textContent=s;meta.appendChild(i)}
      const use=document.createElement('button');use.type='button';use.className='use-workflow';use.textContent='В работу';use.title='Использовать в текущей детали';use.onclick=()=>useTool(t,use);card.querySelector('.tool-card-actions').appendChild(use);
      if(isLocal){const edit=document.createElement('button');edit.type='button';edit.textContent='✎';edit.title='Редактировать';edit.onclick=()=>openForm(t);card.querySelector('.tool-card-actions').appendChild(edit)}
      art(card,t);root.appendChild(card);
    })
  }
  function openForm(t=null){
    state.editing=t?.id||null;$('toolFormTitle').textContent=t?'Редактировать инструмент':'Добавить в шкаф';$('toolDelete').hidden=!t;
    const val=(id,v='')=>$(id).value=v??'';val('toolHolder',t?.holder);val('toolInsert',t?.insert);val('toolGrade',t?.grade);val('toolBreaker',t?.breaker);val('toolNose',t?.nose);val('toolQty',t?.quantity??1);val('toolLocation',t?.location);val('toolIso',(t?.iso||['M']).join(','));val('toolOps',(t?.ops||['face','od']).join(','));val('toolVcMin',t?.vc_min);val('toolVcMax',t?.vc_max);val('toolFeedMin',t?.feed_min);val('toolFeedMax',t?.feed_max);val('toolApMin',t?.ap_min);val('toolApMax',t?.ap_max);$('toolPhoto').value='';$('toolDialog').showModal();
  }
  function fileData(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(file)})}
  async function submit(e){
    e.preventDefault();const list=local(),old=state.editing?list.find(t=>t.id===state.editing):null;let photo=old?.photos?.front||'';if($('toolPhoto').files[0])photo=await fileData($('toolPhoto').files[0]);
    const num=id=>{const v=$(id).value.trim();return v===''?null:Number(v.replace(',','.'))};
    const t=normalize({...old,id:old?.id||uid(),holder:$('toolHolder').value.trim(),insert:$('toolInsert').value.trim(),grade:$('toolGrade').value.trim(),breaker:$('toolBreaker').value.trim(),nose:num('toolNose'),quantity:Math.max(0,Math.round(num('toolQty')??1)),location:$('toolLocation').value.trim(),iso:$('toolIso').value.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean),ops:$('toolOps').value.split(',').map(x=>x.trim()).filter(Boolean),vc_min:num('toolVcMin'),vc_max:num('toolVcMax'),feed_min:num('toolFeedMin'),feed_max:num('toolFeedMax'),ap_min:num('toolApMin'),ap_max:num('toolApMax'),photos:photo?{...(old?.photos||{}),front:photo}:(old?.photos||{}),source:'Добавлено вручную · unified'},true);
    const next=list.filter(x=>x.id!==t.id);next.unshift(t);if(save(next)){$('toolDialog').close();render()}
  }
  function remove(){if(!state.editing)return;if(confirm('Удалить инструмент из шкафа?')){save(local().filter(x=>x.id!==state.editing));$('toolDialog').close();render()}}

  $('toolsSearch').oninput=e=>{state.query=e.target.value;render()};document.querySelectorAll('[data-tools-iso]').forEach(b=>b.onclick=()=>{state.iso=b.dataset.toolsIso;document.querySelectorAll('[data-tools-iso]').forEach(x=>x.classList.toggle('is-active',x===b));render()});$('toolsAdd').onclick=()=>openForm();$('toolDialogClose').onclick=()=>$('toolDialog').close();$('toolForm').onsubmit=submit;$('toolDelete').onclick=remove;
  window.addEventListener('cnc-local-data-changed',e=>{if(e.detail?.key===KEY||e.detail?.key==='cnc-suite.workspace-v1')render()});
  window.addEventListener('cnc-route-opened',e=>{if(e.detail?.route==='tools')render()});
  window.CNCTools={all,local,render};
  render();
})();