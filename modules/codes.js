import { GROUPS, M_CODES, G_CODES, ALL_CODES, EXTRA } from './codes-data.mjs';

(() => {
  'use strict';

  const FAVORITES='cnc-code-favorites';
  const $=id=>document.getElementById(id);
  const state={tab:'M',group:'all',query:'',selected:'M75',favorites:loadFavorites()};

  function loadFavorites(){try{const v=JSON.parse(localStorage.getItem(FAVORITES)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function saveFavorites(){try{localStorage.setItem(FAVORITES,JSON.stringify(state.favorites))}catch{}}
  function base(){return state.tab==='favorites'?ALL_CODES.filter(c=>state.favorites.includes(c.code)):state.tab==='M'?M_CODES:G_CODES}
  function rows(){const q=state.query.trim().toLocaleLowerCase('ru');return base().filter(c=>(state.group==='all'||c.group===state.group)&&(!q||[c.code,c.title,c.english,GROUPS[c.group]?.[0]].join(' ').toLocaleLowerCase('ru').includes(q)))}
  function selected(){return ALL_CODES.find(c=>c.code===state.selected)||rows()[0]||M_CODES[0]}
  function toggle(code){state.favorites=state.favorites.includes(code)?state.favorites.filter(x=>x!==code):[...state.favorites,code];saveFavorites();render()}

  function tabs(){
    document.querySelectorAll('[data-code-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.codeTab===state.tab));
  }
  function categories(){
    const root=$('codesCategories'),groups=[...new Set(base().map(c=>c.group))];root.innerHTML='';
    const make=(id,label,color)=>{
      const b=document.createElement('button');b.type='button';b.className='codes-category'+(state.group===id?' is-active':'');b.style.setProperty('--code-accent',color);b.textContent=label;b.onclick=()=>{state.group=id;render()};root.appendChild(b)
    };
    make('all','Все коды','#49a5ff');groups.forEach(id=>make(id,GROUPS[id][0],GROUPS[id][1]));
  }
  function list(){
    const root=$('codesList'),data=rows();$('codesCount').textContent=data.length;$('codesCountLabel').textContent=state.tab==='favorites'?'Избранные':state.tab+'-коды';root.innerHTML='';
    if(!data.length){root.innerHTML='<div class="codes-empty"><span>⌕</span><strong>Ничего не найдено</strong><p>Попробуй M75, G96, «патрон», «резьба» или сбрось категорию.</p></div>';return}
    data.forEach(c=>{
      const b=document.createElement('article');b.className='codes-row'+(c.code===state.selected?' is-selected':'');b.style.setProperty('--code-accent',GROUPS[c.group][1]);
      b.innerHTML=`<span class="codes-row-accent"></span><b class="codes-row-code">${c.code}</b><span class="codes-row-copy"><strong></strong><small></small></span><button class="codes-star ${state.favorites.includes(c.code)?'is-active':''}" type="button" aria-label="Избранное">☆</button>`;
      b.querySelector('.codes-row-copy strong').textContent=c.title;b.querySelector('.codes-row-copy small').textContent=c.english;
      b.onclick=e=>{if(e.target.closest('.codes-star'))return;state.selected=c.code;renderDetail();list()};
      b.querySelector('.codes-star').onclick=e=>{e.stopPropagation();toggle(c.code)};root.appendChild(b)
    });
  }
  function renderDetail(){
    const c=selected(),m=GROUPS[c.group],x=EXTRA[c.code]||{},root=$('codesDetail');root.style.setProperty('--code-accent',m[1]);root.innerHTML='';
    const head=document.createElement('div');head.className='codes-detail-head';
    const code=document.createElement('span');code.className='codes-detail-code';code.textContent=c.code;
    const fav=document.createElement('button');fav.type='button';fav.className=state.favorites.includes(c.code)?'is-active':'';fav.textContent='☆';fav.onclick=()=>toggle(c.code);
    const copy=document.createElement('button');copy.type='button';copy.textContent='⧉';copy.onclick=async()=>{const text=c.code+': '+c.title+'\n'+c.english;try{await navigator.clipboard.writeText(text);copy.textContent='✓';setTimeout(()=>copy.textContent='⧉',1200)}catch{}};
    head.append(code,fav,copy);root.append(head);
    const h=document.createElement('h2');h.textContent=c.title;const en=document.createElement('p');en.className='english';en.textContent=c.english;root.append(h,en);
    const info=(icon,title,text,cls='')=>{const d=document.createElement('div');d.className='codes-info '+cls;const i=document.createElement('span');i.textContent=icon;const body=document.createElement('div'),b=document.createElement('b'),p=document.createElement('p');b.textContent=title;p.textContent=text;body.append(b,p);d.append(i,body);root.append(d)};
    info('◆','Группа',m[0]);info('▤','Описание',x.description||c.title+'. Команда относится к разделу «'+m[0]+'» и применяется в управляющей программе SINUMERIK.');info('!','Осторожно',x.warning||m[5],'warning');info('ⓘ','Применение',x.use||m[4]);
  }
  function quick(){
    const root=$('codesQuick');root.innerHTML='';['M03','M05','M08','M10','M11','M75','G95','G96','G54–G59'].forEach(code=>{const c=ALL_CODES.find(x=>x.code===code);if(!c)return;const b=document.createElement('button');b.type='button';b.textContent=code;b.onclick=()=>{state.tab=c.type;state.group='all';state.query='';$('codesSearch').value='';state.selected=code;render()};root.appendChild(b)})
  }
  function render(){tabs();categories();list();renderDetail()}

  document.querySelectorAll('[data-code-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.codeTab;state.group='all';state.query='';$('codesSearch').value='';const f=state.tab==='M'?M_CODES[0]:state.tab==='G'?G_CODES[0]:ALL_CODES.find(c=>state.favorites.includes(c.code));if(f)state.selected=f.code;render()});
  $('codesSearch').oninput=e=>{state.query=e.target.value;list()};$('codesClear').onclick=()=>{state.query='';$('codesSearch').value='';list()};
  quick();render();
})();