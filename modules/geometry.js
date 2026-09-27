import { CALCULATORS, MATERIALS, THREADS, round } from './geometry-core.mjs';
import { updateWorkspace } from './workspace-store.mjs';

(() => {
  'use strict';

  const STORAGE='cnc-geometry-projects-v1';
  const $=id=>document.getElementById(id);
  const state={screen:'home',calc:null,values:{},result:null,currentProjectId:null};

  const f=(name,label,value,hint='')=>({name,label,type:'number',value,hint});
  const s=(name,label,value,options)=>({name,label,type:'select',value,options});
  const defs=[
    {id:'sphereCube',icon:'◉',badge:'X/Z/C',title:'Шар → 4 грани',desc:'Кругляк → шар отрезным резцом → четыре одинаковые грани',fields:[
      f('stockDia','Заготовка Ø',25,'Исходный кругляк, мм'),f('sphereDia','Диаметр шара Ø',24,'Например R12 = Ø24'),f('toolWidth','Ширина отрезного резца',4,'мм'),f('stepZ','Шаг врезаний Z',2,'мм'),f('finishAllowance','Припуск по R',.2,'мм'),f('neckDia','Шейка Ø',10,'0 = без шейки'),f('acrossFlats','Размер между гранями S',20,'мм'),f('millDia','Фреза Ø',8,'мм'),f('start','Первая грань C',0,'°'),s('direction','Индексация','cw',[['cw','CW / по часовой'],['ccw','CCW / против часовой']])
    ]},
    {id:'division',icon:'C°',badge:'C-axis',title:'Деление окружности',desc:'Индексация оси C на любое число позиций',fields:[f('count','Количество позиций',6),f('start','Стартовый угол C',0,'°'),s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])]},
    {id:'pcd',icon:'◎',badge:'X/Y/C',title:'Болтовая окружность',desc:'PCD → X/Y и углы C для отверстий',fields:[f('pcd','Диаметр PCD',60,'мм'),f('count','Количество отверстий',6),f('start','Стартовый угол',0,'°'),f('cx','Центр X₀',0,'мм'),f('cy','Центр Y₀',0,'мм'),s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])]},
    {id:'lobes',icon:'✿',badge:'R/C',title:'Лепестки / контур',desc:'Фигурная окружность, центры дуг и компенсация',fields:[f('stockDia','Заготовка Ø',62),f('baseDia','Базовый Ø',50),f('outerDia','Наружный Ø',62),f('count','Количество лепестков',6),f('lobeR','Радиус лепестка R',11),f('toolDia','Фреза Ø',8),f('start','Старт C',0),s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])]},
    {id:'flats',icon:'▰',badge:'AF',title:'Лыски',desc:'Глубина съёма и позиции C по размеру между лысками',fields:[f('stockDia','Заготовка Ø',50),f('acrossFlats','Размер по лыскам',46),f('count','Количество лысок',2),f('toolDia','Фреза Ø',8),f('start','Старт C',0),s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])]},
    {id:'polygon',icon:'⬡',badge:'N-gon',title:'Многоугольник',desc:'Квадрат, шестигранник и произвольное N',fields:[f('stockDia','Заготовка Ø',50),f('sides','Количество граней',6),f('acrossFlats','Размер по граням S',42),f('toolDia','Фреза Ø',8),f('start','Старт C',0),s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])]},
    {id:'slots',icon:'⌗',badge:'C/Y',title:'Пазы по окружности',desc:'Радиальные или тангенциальные пазы по PCD',fields:[f('pcd','PCD центров Ø',50),f('count','Количество пазов',6),f('length','Длина паза',10),f('width','Ширина паза',8),f('depth','Глубина',3),f('toolDia','Фреза Ø',6),f('start','Старт C',0),s('orientation','Ориентация','radial',[['radial','Радиальная'],['tangent','Тангенциальная']]),s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])]},
    {id:'holes',icon:'⊙',badge:'Drill',title:'Радиальные отверстия',desc:'Повторяющиеся отверстия и C-позиции',fields:[f('pcd','PCD Ø',50),f('count','Количество отверстий',6),f('diameter','Сверло Ø',6),f('depth','Глубина',10),f('start','Старт C',0),s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])]},
    {id:'thread',icon:'↯',badge:'M',title:'Сверление / резьба',desc:'Сверло под метрическую резьбу, S и F метчика',fields:[
      s('thread','Резьба','M8',Object.keys(THREADS).map(k=>[k,k.replace('_','.')])),f('pitch','Шаг P',1.25,'мм'),s('material','Материал','aisi304',Object.entries(MATERIALS).map(([k,m])=>[k,m.name])),f('maxRpm','Ограничение S',4000,'об/мин')
    ]},
    {id:'arc',icon:'⌒',badge:'G2/G3',title:'Дуга по 2 точкам + R',desc:'Центр дуги, I/J и G2/G3',fields:[f('x1','Начало X1',0),f('y1','Начало Y1',0),f('x2','Конец X2',30),f('y2','Конец Y2',20),f('radius','Радиус R',25),s('side','Сторона центра','left',[['left','Слева от хорды'],['right','Справа от хорды']]),s('direction','Направление','cw',[['cw','G2 / CW'],['ccw','G3 / CCW']])]},
    {id:'linear',icon:'⋯',badge:'X/Y',title:'Линейный массив',desc:'Ряд отверстий под произвольным углом',fields:[f('count','Количество точек',5),f('step','Шаг',20,'мм'),f('x0','Старт X₀',0),f('y0','Старт Y₀',0),f('angle','Угол ряда',0,'°')]},
    {id:'cutting',icon:'⌁',badge:'S/F',title:'Режимы фрезерования',desc:'Vc → S, fz → F и три стратегии',fields:[
      s('material','Материал','aisi304',Object.entries(MATERIALS).map(([k,m])=>[k,m.name])),f('toolDia','Фреза Ø',8),f('teeth','Количество зубьев z',4),f('vc','Vc вручную',75,'м/мин'),f('fz','fz вручную',.03,'мм/зуб'),f('ap','Глубина ap',1,'мм'),f('maxRpm','Ограничение S',4000),s('strategy','Стратегия','work',[['safe','Безопасная'],['work','Рабочая'],['prod','Производительная']])
    ]}
  ];

  function def(id){return defs.find(d=>d.id===id)}
  function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function getProjects(){try{const v=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function saveProjects(v){try{localStorage.setItem(STORAGE,JSON.stringify(v.slice(0,100)))}catch{}}
  function uid(){return (crypto.randomUUID?.()||Date.now()+'-'+Math.random()).toString().slice(0,24)}
  function defaults(d){return Object.fromEntries(d.fields.map(x=>[x.name,x.value]))}

  function setScreen(screen){
    state.screen=screen;
    document.querySelectorAll('.geometry-screen').forEach(x=>x.classList.toggle('is-active',x.dataset.geometryScreen===screen));
    document.querySelectorAll('[data-geometry-tab]').forEach(x=>x.classList.toggle('is-active',x.dataset.geometryTab===(screen==='projects'?'projects':'home')));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderHome(){
    const root=$('geometryCards');root.innerHTML='';
    for(const d of defs){
      const b=document.createElement('button');b.type='button';b.className='geometry-card';b.dataset.geometryCalc=d.id;
      b.innerHTML=`<span class="geometry-card-badge">${esc(d.badge)}</span><span class="geometry-card-icon">${esc(d.icon)}</span><strong>${esc(d.title)}</strong><small>${esc(d.desc)}</small>`;
      b.onclick=()=>openCalc(d.id);root.appendChild(b);
    }
  }

  function openCalc(id,values=null,projectId=null){
    const d=def(id);if(!d)return;
    state.calc=id;state.values={...defaults(d),...(values||{})};state.currentProjectId=projectId;state.result=null;
    renderForm();setScreen('calc');
  }

  function fieldHtml(field){
    const value=state.values[field.name];
    if(field.type==='select')return `<select name="${field.name}">${field.options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
    return `<input name="${field.name}" type="text" inputmode="decimal" autocomplete="off" value="${esc(value)}">`;
  }

  function renderForm(){
    const d=def(state.calc);
    $('geometryCalcTag').textContent=d.badge+' · '+d.title;
    $('geometryFormTitle').textContent=d.title;$('geometryFormDesc').textContent=d.desc;
    $('geometryFormGrid').innerHTML=d.fields.map(x=>`<label class="geometry-field"><span>${esc(x.label)}</span>${fieldHtml(x)}${x.hint?'<small>'+esc(x.hint)+'</small>':''}</label>`).join('');
    const form=$('geometryForm');
    form.onsubmit=e=>{
      e.preventDefault();const fd=new FormData(form),values=Object.fromEntries(fd.entries());
      d.fields.forEach(x=>{if(x.type==='number')values[x.name]=Number(String(values[x.name]).replace(',','.'))});
      state.values=values;
      try{state.result=CALCULATORS[state.calc](values);renderResult();setScreen('result')}catch(err){alert(err?.message||'Ошибка расчёта')}
    };
    form.querySelectorAll('input[inputmode="decimal"]').forEach(input=>{
      const end=()=>{try{input.setSelectionRange(input.value.length,input.value.length)}catch{}};
      input.addEventListener('focus',()=>{requestAnimationFrame(end);setTimeout(end,40)});
    });
  }

  function summaryHtml(r){return (r.summary||[]).map(([k,v])=>`<div class="geometry-summary-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}
  function kpiHtml(r){return r.kpis?.length?`<div class="geometry-kpis">${r.kpis.map(([k,v])=>`<div class="geometry-kpi"><strong>${esc(v)}</strong><small>${esc(k)}</small></div>`).join('')}</div>`:''}
  function tableHtml(t){
    return `<div class="geometry-table-set"><div class="geometry-table-caption"><strong>${esc(t.title||'Таблица')}</strong><span>${esc(t.subtitle||((t.rows||[]).length+' строк'))}</span></div><div class="geometry-table-wrap"><table class="geometry-table"><thead><tr>${(t.columns||[]).map(c=>'<th>'+esc(c)+'</th>').join('')}</tr></thead><tbody>${(t.rows||[]).map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')}</tbody></table></div></div>`;
  }

  function renderDiagram(d){
    if(!d)return '<svg viewBox="0 0 320 230"><text x="160" y="118" text-anchor="middle">Схема недоступна</text></svg>';
    const base='<svg viewBox="0 0 320 230" role="img" aria-label="Техническая схема">';
    const axes='<g class="geo-soft"><line x1="20" y1="115" x2="300" y2="115"/><line x1="160" y1="14" x2="160" y2="216"/></g>';
    const c={x:160,y:115};
    if(d.type==='division'){
      let s=base+axes+'<circle cx="160" cy="115" r="80" class="geo-soft"/>';
      for(let i=0;i<d.count;i++){const a=(d.start+(d.direction==='ccw'?-1:1)*i*360/d.count-90)*Math.PI/180,x=c.x+80*Math.cos(a),y=c.y+80*Math.sin(a);s+=`<line x1="160" y1="115" x2="${x}" y2="${y}" class="geo-soft"/><circle cx="${x}" cy="${y}" r="3" fill="var(--purple)"/>`}return s+'</svg>';
    }
    if(d.type==='pcd'||d.type==='holes'){
      const pts=d.points||[];let s=base+axes+'<circle cx="160" cy="115" r="80" class="geo-soft" stroke-dasharray="5 5"/>';const maxR=d.radius||1;
      pts.forEach((p,i)=>{const x=c.x+80*(p.x/maxR),y=c.y-80*(p.y/maxR);s+=`<circle cx="${x}" cy="${y}" r="6" class="geo-accent" stroke-width="2"/><text x="${x}" y="${y-10}" text-anchor="middle">${i+1}</text>`});return s+'</svg>';
    }
    if(d.type==='polygon'){
      const n=d.sides,R=80*(d.polyR/d.stockR),pts=Array.from({length:n},(_,i)=>{const a=(d.start+i*360/n-90)*Math.PI/180;return[c.x+R*Math.cos(a),c.y+R*Math.sin(a)]});
      return base+axes+'<circle cx="160" cy="115" r="80" class="geo-soft"/><polygon points="'+pts.map(p=>p.join(',')).join(' ')+'" class="geo-fill" stroke-width="2"/></svg>';
    }
    if(d.type==='flats'){
      const R=80,off=R*(d.flatOffset/d.stockR);let s=base+axes+'<circle cx="160" cy="115" r="80" class="geo-soft"/>';
      for(let i=0;i<d.count;i++){const a=(d.start+i*360/d.count-90)*Math.PI/180,nx=Math.cos(a),ny=Math.sin(a),tx=-ny,ty=nx,half=Math.sqrt(Math.max(0,R*R-off*off));s+=`<line x1="${c.x+off*nx+half*tx}" y1="${c.y+off*ny+half*ty}" x2="${c.x+off*nx-half*tx}" y2="${c.y+off*ny-half*ty}" class="geo-accent" stroke-width="3"/>`}return s+'</svg>';
    }
    if(d.type==='slots'){
      let s=base+axes+'<circle cx="160" cy="115" r="80" class="geo-soft" stroke-dasharray="5 5"/>';
      for(let i=0;i<d.count;i++){const angle=d.start+i*360/d.count,a=(angle-90)*Math.PI/180,x=c.x+80*Math.cos(a),y=c.y+80*Math.sin(a),rot=d.orientation==='tangent'?angle:angle+90;s+=`<rect x="${x-14}" y="${y-4}" width="28" height="8" rx="4" class="geo-fill" transform="rotate(${rot} ${x} ${y})"/>`}return s+'</svg>';
    }
    if(d.type==='lobes'){
      const scale=80/(d.outerR||1);let s=base+axes+`<circle cx="160" cy="115" r="${d.baseR*scale}" class="geo-soft" stroke-dasharray="4 4"/>`;
      const pts=[];for(let i=0;i<360;i++){const a=i*Math.PI/180;let max=-Infinity;for(const p of d.centers){const dot=p.x*Math.cos(a)+p.y*Math.sin(a),disc=d.lobeR*d.lobeR-(p.x*p.x+p.y*p.y-dot*dot);if(disc>=0)max=Math.max(max,dot+Math.sqrt(disc))}const rr=Math.max(d.baseR,max);pts.push([c.x+rr*scale*Math.cos(a),c.y-rr*scale*Math.sin(a)])}
      return s+`<path d="M ${pts.map(p=>p.join(' ')).join(' L ')} Z" class="geo-fill" stroke-width="2"/></svg>`;
    }
    if(d.type==='linear'){
      const pts=d.points||[],xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min(250/(maxX-minX||1),150/(maxY-minY||1));let s=base+axes;
      pts.forEach((p,i)=>{const x=35+(p.x-minX)*scale,y=190-(p.y-minY)*scale;s+=`<circle cx="${x}" cy="${y}" r="6" class="geo-accent" stroke-width="2"/><text x="${x}" y="${y-10}" text-anchor="middle">${i+1}</text>`});return s+'</svg>';
    }
    if(d.type==='arc'){
      const xs=[d.x1,d.x2,d.cx],ys=[d.y1,d.y2,d.cy],minX=Math.min(...xs)-d.R,maxX=Math.max(...xs)+d.R,minY=Math.min(...ys)-d.R,maxY=Math.max(...ys)+d.R,sc=Math.min(250/(maxX-minX||1),160/(maxY-minY||1)),map=(x,y)=>[35+(x-minX)*sc,195-(y-minY)*sc],[cx,cy]=map(d.cx,d.cy),[x1,y1]=map(d.x1,d.y1),[x2,y2]=map(d.x2,d.y2),rr=d.R*sc,sweep=d.direction==='ccw'?1:0;
      return base+`<circle cx="${cx}" cy="${cy}" r="3" fill="var(--purple)"/><path d="M ${x1} ${y1} A ${rr} ${rr} 0 0 ${sweep} ${x2} ${y2}" class="geo-accent" stroke-width="3"/><line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" class="geo-soft"/><line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" class="geo-soft"/></svg>`;
    }
    if(d.type==='thread'){
      return base+'<g transform="translate(72 17)"><path d="M85 8 L126 62 L106 62 L117 174 L62 174 L74 62 L54 62 Z" class="geo-fill" stroke-width="2"/><line x1="90" y1="8" x2="90" y2="174" class="geo-soft" stroke-dasharray="4 4"/><text x="90" y="197" text-anchor="middle">M'+round(d.diameter)+' · P'+round(d.pitch)+'</text><text x="90" y="212" text-anchor="middle">сверло Ø'+round(d.drill)+'</text></g></svg>';
    }
    if(d.type==='cutting'){
      return base+'<g transform="translate(62 15)"><rect x="78" y="14" width="42" height="148" rx="8" class="geo-fill" stroke-width="2"/><path d="M78 48 C120 67 78 87 120 106 C78 126 120 145 78 164" class="geo-accent" stroke-width="5"/><text x="99" y="190" text-anchor="middle">Ø'+round(d.toolDia)+' · z'+d.teeth+'</text><text x="99" y="207" text-anchor="middle">S '+d.rpm+' · F '+d.feed+'</text></g></svg>';
    }
    if(d.type==='sphereCube'){
      const R=d.sphereR||1,sideR=60,cx1=86,cy=112,off=sideR*((d.acrossFlats/2)/R),half=sideR*((d.faceDia/2)/R);let s=base;
      s+=`<circle cx="${cx1}" cy="${cy}" r="${sideR}" class="geo-fill" stroke-width="2"/><line x1="${cx1}" y1="42" x2="${cx1}" y2="182" class="geo-soft" stroke-dasharray="4 4"/><text x="${cx1}" y="204" text-anchor="middle">ШАР R${round(R)}</text>`;
      const ex=237;s+=`<circle cx="${ex}" cy="${cy}" r="${sideR}" class="geo-soft"/><line x1="${ex-off}" y1="${cy-half}" x2="${ex-off}" y2="${cy+half}" class="geo-accent" stroke-width="3"/><line x1="${ex+off}" y1="${cy-half}" x2="${ex+off}" y2="${cy+half}" class="geo-accent" stroke-width="3"/><line x1="${ex-half}" y1="${cy-off}" x2="${ex+half}" y2="${cy-off}" class="geo-accent" stroke-width="3"/><line x1="${ex-half}" y1="${cy+off}" x2="${ex+half}" y2="${cy+off}" class="geo-accent" stroke-width="3"/><text x="${ex}" y="204" text-anchor="middle">4 ГРАНИ · S${round(d.acrossFlats)}</text>`;return s+'</svg>';
    }
    return base+axes+'<circle cx="160" cy="115" r="70" class="geo-soft"/></svg>';
  }

  function renderResult(){
    const r=state.result,d=def(state.calc);
    $('geometryResultHero').innerHTML=`<small>${esc(r.title)}</small><h2>${esc(r.headline)}</h2><p>${esc(r.formula)}</p>${kpiHtml(r)}`;
    $('geometryWarnings').innerHTML=(r.warnings||[]).map(w=>`<div class="geometry-warning ${String(w).includes('не получить')?'error':''}">${esc(w)}</div>`).join('');
    $('geometrySummary').innerHTML=summaryHtml(r);$('geometryDiagram').innerHTML=renderDiagram(r.diagram);
    const sets=r.tables?.length?r.tables:[{title:'Координаты / шаг',subtitle:(r.rows||[]).length+' строк',columns:r.columns||[],rows:r.rows||[]}];
    $('geometryTables').innerHTML=sets.map(tableHtml).join('');
    $('geometryCode').textContent=r.gcode||'';
    $('geometryResultTag').textContent=d.badge+' · '+d.title;
  }

  function saveCurrent(){
    if(!state.result)return;const projects=getProjects(),existing=state.currentProjectId&&projects.find(p=>p.id===state.currentProjectId);
    const name=prompt('Название проекта',existing?.name||(state.result.title+' • '+new Date().toLocaleDateString('ru-RU')));if(!name)return;
    const item={id:existing?.id||uid(),name,calc:state.calc,values:state.values,result:state.result,updated:Date.now()},next=projects.filter(p=>p.id!==item.id);next.unshift(item);saveProjects(next);state.currentProjectId=item.id;
    updateWorkspace(w=>({
      title:w.title==='Новая деталь'?name:w.title,
      geometry:{id:item.id,name:item.name,calc:item.calc,values:item.values,result:item.result,updated:item.updated}
    }),{source:'geometry'});
    alert('Проект сохранён локально и добавлен в рабочий процесс');
  }

  function renderProjects(){
    const root=$('geometryProjects'),projects=getProjects();root.innerHTML='';
    if(!projects.length){root.innerHTML='<div class="geometry-empty"><span>▣</span><strong>Проектов пока нет</strong><p>Сохрани любой результат — он появится здесь.</p></div>';return}
    projects.forEach(p=>{
      const d=def(p.calc),row=document.createElement('div');row.className='geometry-project';
      row.innerHTML=`<span class="geometry-project-icon">${esc(d?.icon||'▦')}</span><span class="geometry-project-main"><strong>${esc(p.name)}</strong><small>${esc(d?.title||p.calc)} · ${new Date(p.updated).toLocaleString('ru-RU')}</small></span><span class="geometry-project-actions"><button data-open="${esc(p.id)}" type="button">›</button><button data-delete="${esc(p.id)}" type="button">×</button></span>`;
      row.querySelector('[data-open]').onclick=()=>openCalc(p.calc,p.values,p.id);
      row.querySelector('[data-delete]').onclick=()=>{if(confirm('Удалить проект?')){saveProjects(getProjects().filter(x=>x.id!==p.id));renderProjects()}};
      root.appendChild(row);
    });
  }

  async function copyCode(){
    try{await navigator.clipboard.writeText(state.result?.gcode||'');const b=$('geometryCopy');const old=b.textContent;b.textContent='Скопировано ✓';setTimeout(()=>b.textContent=old,1400)}catch{alert('Не удалось скопировать')}
  }
  function exportPng(){
    if(!state.result)return;const r=state.result,canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1500;const x=canvas.getContext('2d');x.fillStyle='#081018';x.fillRect(0,0,1200,1500);x.fillStyle='#a884ff';x.fillRect(0,0,1200,16);x.fillStyle='#fff';x.font='700 52px -apple-system,Arial';x.fillText('CNC Geometry',70,100);x.font='700 37px -apple-system,Arial';wrap(x,r.title,70,172,1060,46);x.fillStyle='#a884ff';x.font='700 30px -apple-system,Arial';wrap(x,r.headline,70,255,1060,40);x.fillStyle='#9aabb7';x.font='24px -apple-system,Arial';wrap(x,r.formula,70,330,1060,34);let y=430;for(const [k,v] of r.summary||[]){x.fillStyle='#101d27';x.fillRect(60,y,1080,90);x.fillStyle='#fff';x.font='700 23px -apple-system,Arial';x.fillText(String(k),85,y+34);x.fillStyle='#b59aff';x.font='22px -apple-system,Arial';wrap(x,String(v),85,y+67,1010,28);y+=103;if(y>1320)break}x.fillStyle='#8fa0ac';x.font='20px -apple-system,Arial';x.fillText('CNC Copilot • Geometry • offline',70,1440);const a=document.createElement('a');a.download='cnc-geometry-'+Date.now()+'.png';a.href=canvas.toDataURL('image/png');a.click();
  }
  function wrap(ctx,text,x,y,max,line){let cur='';for(const w of String(text).split(' ')){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>max&&cur){ctx.fillText(cur,x,y);cur=w;y+=line}else cur=t}if(cur)ctx.fillText(cur,x,y)}

  function bind(){
    document.querySelectorAll('[data-geometry-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.geometryTab==='projects'){renderProjects();setScreen('projects')}else setScreen('home')});
    $('geometryBackCalc').onclick=()=>setScreen('home');$('geometryBackResult').onclick=()=>{renderForm();setScreen('calc')};
    $('geometryCopy').onclick=copyCode;$('geometrySave').onclick=saveCurrent;$('geometryPng').onclick=exportPng;$('geometryPrint').onclick=()=>window.print();$('geometryNew').onclick=()=>openCalc(state.calc);
    $('geometryQuickSphere').onclick=()=>openCalc('sphereCube');$('geometryQuickLobes').onclick=()=>openCalc('lobes');$('geometryQuickPcd').onclick=()=>openCalc('pcd');
  }

  renderHome();bind();renderProjects();
})();