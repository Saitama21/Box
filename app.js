(() => {
  const STORAGE_KEY = 'box-pwa-presets-v3';
  const THEME_KEY = 'box-pwa-theme-v3';
  const MAX_DRAW = 14;
  let deferredInstallPrompt = null;

  const CRATES = [
    { id: 'hp280', name: 'HP280', length: 600, width: 400, height: 280 },
    { id: 'euro-600-400-120', name: 'Ящик 600 × 400 × 120', length: 600, width: 400, height: 120 },
    { id: 'euro-600-400-170', name: 'Ящик 600 × 400 × 170', length: 600, width: 400, height: 170 },
    { id: 'euro-600-400-220', name: 'Ящик 600 × 400 × 220', length: 600, width: 400, height: 220 },
    { id: 'euro-600-400-320', name: 'Ящик 600 × 400 × 320', length: 600, width: 400, height: 320 },
    { id: 'euro-600-400-400', name: 'Ящик 600 × 400 × 400', length: 600, width: 400, height: 400 },
    { id: 'mid-500-400-220', name: 'Ящик 500 × 400 × 220', length: 500, width: 400, height: 220 },
    { id: 'mid-500-300-220', name: 'Ящик 500 × 300 × 220', length: 500, width: 300, height: 220 },
    { id: 'compact-400-300-120', name: 'Ящик 400 × 300 × 120', length: 400, width: 300, height: 120 },
    { id: 'compact-400-300-170', name: 'Ящик 400 × 300 × 170', length: 400, width: 300, height: 170 },
    { id: 'compact-400-300-220', name: 'Ящик 400 × 300 × 220', length: 400, width: 300, height: 220 },
    { id: 'compact-400-300-280', name: 'Ящик 400 × 300 × 280', length: 400, width: 300, height: 280 },
    { id: 'small-300-200-120', name: 'Ящик 300 × 200 × 120', length: 300, width: 200, height: 120 },
    { id: 'small-300-200-170', name: 'Ящик 300 × 200 × 170', length: 300, width: 200, height: 170 },
    { id: 'large-800-600-220', name: 'Ящик 800 × 600 × 220', length: 800, width: 600, height: 220 },
    { id: 'large-800-600-320', name: 'Ящик 800 × 600 × 320', length: 800, width: 600, height: 320 },
    { id: 'large-800-600-420', name: 'Ящик 800 × 600 × 420', length: 800, width: 600, height: 420 }
  ];

  const els = {
    cratePreset: document.getElementById('cratePreset'),
    boxLength: document.getElementById('boxLength'), boxWidth: document.getElementById('boxWidth'), boxHeight: document.getElementById('boxHeight'),
    partDiameter: document.getElementById('partDiameter'), partHeight: document.getElementById('partHeight'),
    countX: document.getElementById('countX'), countY: document.getElementById('countY'), countZ: document.getElementById('countZ'),
    topProjection: document.getElementById('topProjection'), sideProjection: document.getElementById('sideProjection'), endProjection: document.getElementById('endProjection'),
    topCaption: document.getElementById('topCaption'), sideCaption: document.getElementById('sideCaption'), endCaption: document.getElementById('endCaption'),
    totalCount: document.getElementById('totalCount'), resultFormula: document.getElementById('resultFormula'),
    infoBoxName: document.getElementById('infoBoxName'), infoBoxSize: document.getElementById('infoBoxSize'), infoPartSize: document.getElementById('infoPartSize'),
    infoLayout: document.getElementById('infoLayout'), infoPerLayer: document.getElementById('infoPerLayer'), infoLayers: document.getElementById('infoLayers'), infoTotal: document.getElementById('infoTotal'),
    gapLength: document.getElementById('gapLength'), gapWidth: document.getElementById('gapWidth'), gapHeight: document.getElementById('gapHeight'), fitStatus: document.getElementById('fitStatus'), statusText: document.getElementById('statusText'),
    presetName: document.getElementById('presetName'), savePreset: document.getElementById('savePreset'), quickPresets: document.getElementById('quickPresets'), quickPresetTemplate: document.getElementById('quickPresetTemplate'),
    resetButton: document.getElementById('resetButton'), offlineState: document.getElementById('offlineState'), installButton: document.getElementById('installButton'), themeDark: document.getElementById('themeDark'), themeLight: document.getElementById('themeLight')
  };

  const defaults = { crateId: 'hp280', boxLength: 600, boxWidth: 400, boxHeight: 280, partDiameter: 50, partHeight: 20, x: 9, y: 5, z: 4 };
  const fmt = new Intl.NumberFormat('ru-RU');

  function initCrateOptions() {
    const fragment = document.createDocumentFragment();
    const groups = [
      ['600 × 400', CRATES.filter(c => c.length === 600 && c.width === 400)],
      ['500 мм', CRATES.filter(c => c.length === 500)],
      ['400 × 300', CRATES.filter(c => c.length === 400 && c.width === 300)],
      ['300 × 200', CRATES.filter(c => c.length === 300 && c.width === 200)],
      ['800 × 600', CRATES.filter(c => c.length === 800 && c.width === 600)]
    ];
    groups.forEach(([label, crates]) => {
      if (!crates.length) return;
      const group = document.createElement('optgroup');
      group.label = label;
      crates.forEach(crate => {
        const option = document.createElement('option');
        option.value = crate.id;
        option.textContent = `${crate.name} — ${crate.length} × ${crate.width} × ${crate.height} мм`;
        group.append(option);
      });
      fragment.append(group);
    });
    const custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'Свой размер';
    fragment.append(custom);
    els.cratePreset.replaceChildren(fragment);
    els.cratePreset.value = defaults.crateId;
  }

  function sanitizeNumber(value, fallback = 1) { const n = Number(String(value).replace(',', '.')); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : fallback; }
  function sanitizeInt(value, fallback = 1) { const n = Math.trunc(Number(value)); return Number.isFinite(n) && n >= 1 ? Math.min(999, n) : fallback; }
  function state() { return { crateId: els.cratePreset.value, boxLength: sanitizeNumber(els.boxLength.value, 600), boxWidth: sanitizeNumber(els.boxWidth.value, 400), boxHeight: sanitizeNumber(els.boxHeight.value, 280), partDiameter: sanitizeNumber(els.partDiameter.value, 50), partHeight: sanitizeNumber(els.partHeight.value, 20), x: sanitizeInt(els.countX.value, 9), y: sanitizeInt(els.countY.value, 5), z: sanitizeInt(els.countZ.value, 4) }; }
  function applyState(s) { els.boxLength.value=s.boxLength; els.boxWidth.value=s.boxWidth; els.boxHeight.value=s.boxHeight; els.partDiameter.value=s.partDiameter; els.partHeight.value=s.partHeight; els.countX.value=s.x; els.countY.value=s.y; els.countZ.value=s.z; if (s.crateId) els.cratePreset.value = s.crateId; }
  function selectedCrateName() { const crate = CRATES.find(c => c.id === els.cratePreset.value); return crate ? crate.name : 'Свой размер'; }

  function onCrateChange() {
    const crate = CRATES.find(c => c.id === els.cratePreset.value);
    if (!crate) return;
    els.boxLength.value = crate.length; els.boxWidth.value = crate.width; els.boxHeight.value = crate.height;
    update();
  }

  function matchCrateToManualDimensions() {
    const l=sanitizeNumber(els.boxLength.value), w=sanitizeNumber(els.boxWidth.value), h=sanitizeNumber(els.boxHeight.value);
    const match = CRATES.find(c => c.length===l && c.width===w && c.height===h);
    els.cratePreset.value = match ? match.id : 'custom';
  }

  function svgEl(name, attrs={}) { const n=document.createElementNS('http://www.w3.org/2000/svg',name); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v))); return n; }
  function ensureDefs(svg) { const defs=svgEl('defs'); const pg=svgEl('linearGradient',{id:'partGradient',x1:'0',y1:'0',x2:'0',y2:'1'}); pg.append(svgEl('stop',{offset:'0%','stop-color':'#f6f8fa'}),svgEl('stop',{offset:'55%','stop-color':'#d6dde4'}),svgEl('stop',{offset:'100%','stop-color':'#aab4bf'})); const cg=svgEl('linearGradient',{id:'crateFill',x1:'0',y1:'0',x2:'1',y2:'1'}); cg.append(svgEl('stop',{offset:'0%','stop-color':'#21bc76','stop-opacity':'.25'}),svgEl('stop',{offset:'100%','stop-color':'#066f42','stop-opacity':'.44'})); defs.append(pg,cg); svg.append(defs); }
  function addMeasure(svg,{x1,y1,x2,y2,label,labelX,labelY,orientation='horizontal'}){const color=getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()||'#126ae6';svg.append(svgEl('line',{x1,y1,x2,y2,stroke:color,'stroke-width':2}));if(orientation==='horizontal'){svg.append(svgEl('line',{x1,y1:y1-10,x2:x1,y2:y1+10,stroke:color,'stroke-width':2}),svgEl('line',{x1:x2,y1:y2-10,x2,y2:y2+10,stroke:color,'stroke-width':2}))}else{svg.append(svgEl('line',{x1:x1-10,y1,x2:x1+10,y2:y1,stroke:color,'stroke-width':2}),svgEl('line',{x1:x2-10,y1:y2,x2:x2+10,y2,stroke:color,'stroke-width':2}))}const t=svgEl('text',{x:labelX,y:labelY,fill:color,'font-size':15,'font-weight':800,'text-anchor':'middle'});if(orientation==='vertical')t.setAttribute('transform',`rotate(-90 ${labelX} ${labelY})`);t.textContent=label;svg.append(t)}
  function addFrame(svg,box,end=false){svg.append(svgEl('rect',{x:box.x,y:box.y,width:box.w,height:box.h,rx:18,fill:'url(#crateFill)',stroke:'rgba(10,125,78,.82)','stroke-width':5}),svgEl('rect',{x:box.x+12,y:box.y+12,width:box.w-24,height:box.h-24,rx:12,fill:'none',stroke:'rgba(71,211,148,.45)','stroke-width':2}));for(let i=1;i<5;i++){const px=box.x+(box.w/5)*i;svg.append(svgEl('line',{x1:px,y1:box.y+6,x2:px,y2:box.y+box.h-6,stroke:'rgba(16,122,77,.25)','stroke-width':2}))}if(end)svg.append(svgEl('rect',{x:box.x+box.w/2-32,y:box.y+8,width:64,height:14,rx:6,fill:'rgba(255,255,255,.9)'}))}
  function drawTop(s){const svg=svgEl('svg',{viewBox:'0 0 760 420',preserveAspectRatio:'xMidYMid meet'});ensureDefs(svg);const box={x:76,y:74,w:540,h:248};addFrame(svg,box,false);addMeasure(svg,{x1:box.x,y1:40,x2:box.x+box.w,y2:40,label:`${fmt.format(s.boxLength)} мм`,labelX:box.x+box.w/2,labelY:30});addMeasure(svg,{x1:34,y1:box.y,x2:34,y2:box.y+box.h,label:`${fmt.format(s.boxWidth)} мм`,labelX:22,labelY:box.y+box.h/2,orientation:'vertical'});const dx=Math.min(s.x,MAX_DRAW),dy=Math.min(s.y,MAX_DRAW),px=24,py=24,cw=(box.w-px*2)/dx,ch=(box.h-py*2)/dy,r=Math.max(6,Math.min(cw,ch)*.42);for(let row=0;row<dy;row++)for(let col=0;col<dx;col++){const cx=box.x+px+cw*(col+.5),cy=box.y+py+ch*(row+.5);svg.append(svgEl('circle',{cx,cy,r,fill:'url(#partGradient)',stroke:'#99a4af','stroke-width':1.2}),svgEl('ellipse',{cx:cx-r*.2,cy:cy-r*.25,rx:r*.26,ry:r*.16,fill:'#fff',opacity:.42}))}els.topProjection.replaceChildren(svg)}
  function drawSide({horizontal,vertical,hLabel,vLabel,target,end=false}){const svg=svgEl('svg',{viewBox:'0 0 580 290',preserveAspectRatio:'xMidYMid meet'});ensureDefs(svg);const box={x:68,y:62,w:430,h:168};addFrame(svg,box,end);addMeasure(svg,{x1:box.x,y1:34,x2:box.x+box.w,y2:34,label:hLabel,labelX:box.x+box.w/2,labelY:24});addMeasure(svg,{x1:38,y1:box.y,x2:38,y2:box.y+box.h,label:vLabel,labelX:24,labelY:box.y+box.h/2,orientation:'vertical'});const dh=Math.min(horizontal,MAX_DRAW),dv=Math.min(vertical,MAX_DRAW),px=18,py=20,cw=(box.w-px*2)/dh,ch=(box.h-py*2)/dv,pw=Math.max(6,cw*.78),ph=Math.max(6,ch*.74),rx=Math.min(9,ph*.24);for(let row=0;row<dv;row++)for(let col=0;col<dh;col++){const x=box.x+px+col*cw+(cw-pw)/2,y=box.y+box.h-py-(row+1)*ch+(ch-ph)/2;svg.append(svgEl('rect',{x,y,width:pw,height:ph,rx,fill:'url(#partGradient)',stroke:'#99a4af','stroke-width':1}),svgEl('ellipse',{cx:x+pw/2,cy:y+Math.max(3,ph*.18),rx:pw*.42,ry:Math.max(2,ph*.12),fill:'#fff',opacity:.58}))}target.replaceChildren(svg)}
  function pluralRows(n){const n10=n%10,n100=n%100;if(n10===1&&n100!==11)return'ряд';if([2,3,4].includes(n10)&&![12,13,14].includes(n100))return'ряда';return'рядов'}
  function updateStatus(g){const fits=g.length>=0&&g.width>=0&&g.height>=0;els.fitStatus.classList.toggle('is-fit',fits);els.fitStatus.classList.toggle('is-overflow',!fits);els.statusText.textContent=fits?'Детали помещаются':'Детали не помещаются';document.querySelector('.status-dot').textContent=fits?'✓':'!'}
  function update(){const s=state();const per=s.x*s.y,total=per*s.z,g={length:Math.round((s.boxLength-s.x*s.partDiameter)*100)/100,width:Math.round((s.boxWidth-s.y*s.partDiameter)*100)/100,height:Math.round((s.boxHeight-s.z*s.partHeight)*100)/100};els.totalCount.textContent=fmt.format(total);els.resultFormula.textContent=`(${s.x} × ${s.y} × ${s.z})`;els.infoBoxName.textContent=selectedCrateName();els.infoBoxSize.textContent=`${fmt.format(s.boxLength)} × ${fmt.format(s.boxWidth)} × ${fmt.format(s.boxHeight)} мм`;els.infoPartSize.textContent=`Ø${fmt.format(s.partDiameter)} × ${fmt.format(s.partHeight)} мм`;els.infoLayout.textContent=`${s.x} × ${s.y} × ${s.z}`;els.infoPerLayer.textContent=`${fmt.format(per)} шт`;els.infoLayers.textContent=fmt.format(s.z);els.infoTotal.textContent=`${fmt.format(total)} шт`;els.gapLength.textContent=`${fmt.format(g.length)} мм`;els.gapWidth.textContent=`${fmt.format(g.width)} мм`;els.gapHeight.textContent=`${fmt.format(g.height)} мм`;els.topCaption.textContent=`${s.x} шт в длину × ${s.y} шт в ширину (${fmt.format(per)} шт в слое)`;els.sideCaption.textContent=`${s.x} шт в длину × ${s.z} ${pluralRows(s.z)} в высоту`;els.endCaption.textContent=`${s.y} шт в ширину × ${s.z} ${pluralRows(s.z)} в высоту`;if(!els.presetName.matches(':focus'))els.presetName.value=`${s.partDiameter} × ${s.partHeight}`;updateStatus(g);drawTop(s);drawSide({horizontal:s.x,vertical:s.z,hLabel:`${fmt.format(s.boxLength)} мм`,vLabel:`${fmt.format(s.boxHeight)} мм`,target:els.sideProjection});drawSide({horizontal:s.y,vertical:s.z,hLabel:`${fmt.format(s.boxWidth)} мм`,vLabel:`${fmt.format(s.boxHeight)} мм`,target:els.endProjection,end:true});renderPresets()}

  function setTheme(theme){const next=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=next;localStorage.setItem(THEME_KEY,next);els.themeDark.classList.toggle('is-active',next==='dark');els.themeLight.classList.toggle('is-active',next==='light')}
  function getPresets(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v.slice(0,12):[]}catch{return[]}}
  function setPresets(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,12)));renderPresets()}
  function seedPresets(){if(getPresets().length)return;setPresets([{id:1,title:'50 × 20',crateId:'hp280',boxLength:600,boxWidth:400,boxHeight:280,partDiameter:50,partHeight:20,x:9,y:5,z:4},{id:2,title:'50 × 30',crateId:'hp280',boxLength:600,boxWidth:400,boxHeight:280,partDiameter:50,partHeight:30,x:9,y:5,z:3},{id:3,title:'40 × 20',crateId:'euro-600-400-220',boxLength:600,boxWidth:400,boxHeight:220,partDiameter:40,partHeight:20,x:12,y:8,z:4}])}
  function loadPreset(p){applyState({crateId:p.crateId||'custom',boxLength:p.boxLength,boxWidth:p.boxWidth,boxHeight:p.boxHeight,partDiameter:p.partDiameter,partHeight:p.partHeight,x:p.x,y:p.y,z:p.z});els.presetName.value=p.title;update();window.scrollTo({top:0,behavior:'smooth'})}
  function deletePreset(id){setPresets(getPresets().filter(i=>i.id!==id))}
  function savePreset(){const s=state(),title=(els.presetName.value||`${s.partDiameter} × ${s.partHeight}`).trim().slice(0,32),items=getPresets().filter(i=>i.title!==title);items.unshift({id:Date.now(),title,...s});setPresets(items)}
  function renderPresets(){const presets=getPresets(),cur=state();els.quickPresets.replaceChildren();presets.forEach(p=>{const node=els.quickPresetTemplate.content.firstElementChild.cloneNode(true),total=p.x*p.y*p.z;node.querySelector('.quick-card-title').textContent=p.title;node.querySelector('.quick-card-layout').textContent=`${p.x} × ${p.y} × ${p.z}`;node.querySelector('.quick-card-total').textContent=`${fmt.format(total)} шт`;if(p.x===cur.x&&p.y===cur.y&&p.z===cur.z&&p.boxLength===cur.boxLength&&p.boxWidth===cur.boxWidth&&p.boxHeight===cur.boxHeight)node.classList.add('is-selected');node.addEventListener('click',()=>loadPreset(p));const remove=node.querySelector('.quick-card-delete');remove.addEventListener('click',e=>{e.stopPropagation();deletePreset(p.id)});els.quickPresets.append(node)})}
  function resetAll(){els.cratePreset.value=defaults.crateId;applyState(defaults);els.presetName.value='50 × 20';update()}
  function updateOnlineState(){els.offlineState.textContent=navigator.onLine?'Готов к офлайн-работе':'Офлайн-режим активен'}

  initCrateOptions(); seedPresets();
  els.cratePreset.addEventListener('change',onCrateChange);
  [els.boxLength,els.boxWidth,els.boxHeight].forEach(input=>input.addEventListener('input',()=>{matchCrateToManualDimensions();update()}));
  [els.partDiameter,els.partHeight,els.countX,els.countY,els.countZ].forEach(input=>input.addEventListener('input',update));
  document.querySelectorAll('[data-step-target]').forEach(btn=>btn.addEventListener('click',()=>{const input=document.getElementById(btn.dataset.stepTarget);input.value=Math.max(1,sanitizeInt(input.value)+Number(btn.dataset.step||0));update()}));
  els.savePreset.addEventListener('click',savePreset); els.resetButton.addEventListener('click',resetAll); els.themeDark.addEventListener('click',()=>{setTheme('dark');update()}); els.themeLight.addEventListener('click',()=>{setTheme('light');update()});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;els.installButton.classList.remove('is-hidden')});els.installButton.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;els.installButton.classList.add('is-hidden')});window.addEventListener('online',updateOnlineState);window.addEventListener('offline',updateOnlineState);
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{els.offlineState.textContent='Service Worker не зарегистрирован'}));
  setTheme(localStorage.getItem(THEME_KEY)||'light');updateOnlineState();update();
})();
