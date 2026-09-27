import { computeBox, normalizeCount, layerLabel as coreLayerLabel, layoutText as coreLayoutText } from './box-core.mjs';
import { updateWorkspace } from './workspace-store.mjs';

(() => {
  'use strict';

  const LAST_KEY = 'cnc-suite.box.last-v1';
  const MODE_KEY = 'cnc-suite.box.mode-v1';
  const MAX_COUNT = 999;

  const $ = id => document.getElementById(id);
  const el = {
    d: $('boxDiameter'), h: $('boxHeight'), x: $('boxCountX'), y: $('boxCountY'), z: $('boxCountZ'),
    calc: $('boxCalculate'), reset: $('boxReset'), copy: $('boxCopy'),
    total: $('boxTotal'), layout: $('boxResultLayout'), block: $('boxResultBlock'), part: $('boxResultPart'),
    topSize: $('boxTopSize'), sideSize: $('boxSideSize'), endSize: $('boxEndSize'), isoLabel: $('boxIsoLabel'),
    top: $('boxTopProjection'), side: $('boxSideProjection'), end: $('boxEndProjection'), iso: $('boxIsoProjection'),
    note: $('boxPackingNote')
  };
  if (!el.d || !el.top) return;

  const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const intFmt = new Intl.NumberFormat('ru-RU');
  let mode = readMode();
  let zOptional = String(el.z.value || '').trim() === '';

  function readMode(){ try{return localStorage.getItem(MODE_KEY)==='staggered'?'staggered':'straight'}catch{return 'straight'} }
  function saveMode(){ try{localStorage.setItem(MODE_KEY,mode)}catch{} }
  function integer(input){ return normalizeCount(input.value, MAX_COUNT); }
  function state(){
    return computeBox({
      d: el.d.value,
      h: el.h.value,
      x: el.x.value,
      y: el.y.value,
      z: zOptional ? null : el.z.value
    }, mode);
  }
  function layers(s){return s.layers}
  function complete(s){return s.valid===true}
  function layerLabel(s){return coreLayerLabel(s.layers)}
  function layoutText(s){return coreLayoutText(s)}
  function dimensions(s){return{length:s.length,width:s.width,height:s.height}}

  function saveLast(){
    const s=state(); if(!complete(s))return;
    try{localStorage.setItem(LAST_KEY,JSON.stringify({d:s.d,h:s.h,x:s.x,y:s.y,z:s.z,mode:s.mode}))}catch{}
  }
  function restoreLast(){
    try{
      const saved=JSON.parse(localStorage.getItem(LAST_KEY)||'null');
      if(!saved)return;
      if(saved.d!=null)el.d.value=saved.d;if(saved.h!=null)el.h.value=saved.h;if(saved.x!=null)el.x.value=saved.x;if(saved.y!=null)el.y.value=saved.y;
      if(saved.z!=null&&saved.z!==''){el.z.value=saved.z;zOptional=false}else{el.z.value='';zOptional=true}
      if(saved.mode==='staggered'||saved.mode==='straight')mode=saved.mode;
    }catch{}
  }

  function svg(name,attrs={},text=''){
    const n=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));if(text)n.textContent=text;return n;
  }
  function defs(root,prefix){
    const d=svg('defs');
    const metal=svg('linearGradient',{id:prefix+'-metal',x1:'0',y1:'0',x2:'1',y2:'0'});
    [['0%','#59656d'],['12%','#aeb8bd'],['30%','#f1f4f5'],['50%','#88949b'],['69%','#e1e6e8'],['87%','#a2adb3'],['100%','#55616a']].forEach(([o,c])=>metal.append(svg('stop',{offset:o,'stop-color':c})));
    const top=svg('radialGradient',{id:prefix+'-top',cx:'34%',cy:'26%',r:'78%'});
    [['0%','#fff'],['28%','#eef2f4'],['62%','#c7d0d5'],['100%','#75818a']].forEach(([o,c])=>top.append(svg('stop',{offset:o,'stop-color':c})));
    const shadow=svg('filter',{id:prefix+'-shadow',x:'-35%',y:'-45%',width:'170%',height:'205%'});
    shadow.append(svg('feDropShadow',{dx:0,dy:4,stdDeviation:4,'flood-color':'#10232c','flood-opacity':'.24'}));
    d.append(metal,top,shadow);root.append(d);
  }
  function grid(root){
    const g=svg('g',{opacity:.22,stroke:'#71868f','stroke-width':.55});
    for(let x=82;x<=580;x+=28)g.append(svg('line',{x1:x,y1:67,x2:x,y2:266}));
    for(let y=70;y<=266;y+=28)g.append(svg('line',{x1:82,y1:y,x2:580,y2:y}));
    root.append(g);
  }
  function dimH(root,x1,x2,y,label){
    root.append(svg('line',{x1,y1:y,x2,y2:y,stroke:'#4d7a91','stroke-width':1.25}));
    root.append(svg('line',{x1,y1:y-6,x2:x1,y2:y+6,stroke:'#4d7a91','stroke-width':1}));
    root.append(svg('line',{x1:x2,y1:y-6,x2,y2:y+6,stroke:'#4d7a91','stroke-width':1}));
    root.append(svg('text',{x:(x1+x2)/2,y:y-9,'text-anchor':'middle',class:'box-dim'},label));
  }
  function dimV(root,x,y1,y2,label){
    root.append(svg('line',{x1:x,y1,x2:x,y2,stroke:'#4d7a91','stroke-width':1.25}));
    root.append(svg('line',{x1:x-6,y1,x2:x+6,y2:y1,stroke:'#4d7a91','stroke-width':1}));
    root.append(svg('line',{x1:x-6,y1:y2,x2:x+6,y2,stroke:'#4d7a91','stroke-width':1}));
    root.append(svg('text',{x:x-14,y:(y1+y2)/2,'text-anchor':'middle',class:'box-dim',transform:`rotate(-90 ${x-14} ${(y1+y2)/2})`},label));
  }
  function empty(target){
    const r=svg('svg',{viewBox:'0 0 640 300'});grid(r);
    r.append(svg('rect',{x:90,y:82,width:460,height:150,rx:16,fill:'none',stroke:'currentColor','stroke-opacity':'.13','stroke-dasharray':'7 7'}));
    r.append(svg('text',{x:320,y:150,'text-anchor':'middle',class:'box-dim'},'Заполните параметры'));
    r.append(svg('text',{x:320,y:176,'text-anchor':'middle',class:'box-dim-note'},'Проекция появится автоматически'));
    target.replaceChildren(r);
  }

  function drawTop(s,dims){
    const root=svg('svg',{viewBox:'0 0 640 300',preserveAspectRatio:'xMidYMid meet'});defs(root,'bt');grid(root);
    const maxW=470,maxH=175,scale=Math.min(maxW/dims.length,maxH/dims.width);
    const cell=s.d*scale,rowPitch=mode==='staggered'?cell*SQRT3_OVER_2:cell;
    const w=dims.length*scale,h=dims.width*scale,x0=95+(maxW-w)/2,y0=86+(maxH-h)/2;
    root.append(svg('rect',{x:x0-5,y:y0-5,width:w+10,height:h+10,rx:8,fill:'#81939b','fill-opacity':.06,stroke:'#6f828b','stroke-opacity':.16}));
    const total=s.x*s.y,maxVisible=800;let drawn=0;
    outer:for(let y=0;y<s.y;y++){
      const offset=mode==='staggered'&&y%2?cell/2:0;
      const cy=y0+cell/2+y*rowPitch;
      for(let x=0;x<s.x;x++){
        if(drawn>=maxVisible)break outer;
        const cx=x0+cell/2+offset+x*cell,r=Math.max(.35,cell/2-Math.min(1.1,cell*.04));
        root.append(svg('circle',{cx,cy,r,fill:'url(#bt-top)',stroke:'#66747d','stroke-width':Math.max(.25,Math.min(.9,cell*.022)),filter:'url(#bt-shadow)'}));
        if(cell>12)root.append(svg('ellipse',{cx:cx-cell*.12,cy:cy-cell*.14,rx:cell*.11,ry:cell*.07,fill:'#fff','fill-opacity':.45}));
        drawn++;
      }
    }
    dimH(root,x0,x0+w,48,`${fmt.format(dims.length)} мм`);dimV(root,55,y0,y0+h,`${fmt.format(dims.width)} мм`);
    const note=drawn<total?`Показано ${intFmt.format(drawn)} из ${intFmt.format(total)} · ${mode==='staggered'?'шахматная':'ровная'}`:`${mode==='staggered'?'шахматная':'ровная'} · ${s.x} × ${s.y} = ${intFmt.format(total)} шт. в слое`;
    root.append(svg('text',{x:320,y:286,'text-anchor':'middle',class:'box-dim-note'},note));el.top.replaceChildren(root);
  }

  function drawSide(target,s,horizontal,realW,prefix){
    const z=layers(s),realH=z*s.h;const root=svg('svg',{viewBox:'0 0 640 300',preserveAspectRatio:'xMidYMid meet'});defs(root,prefix);grid(root);
    const scale=Math.min(470/realW,175/realH),cellW=s.d*scale,cellH=s.h*scale,w=realW*scale,h=realH*scale,x0=95+(470-w)/2,y0=86+(175-h)/2;
    const total=horizontal*z,maxVisible=700;let drawn=0;
    outer:for(let zz=0;zz<z;zz++)for(let x=0;x<horizontal;x++){
      if(drawn>=maxVisible)break outer;
      const px=x0+x*cellW,py=y0+(z-1-zz)*cellH;
      root.append(svg('rect',{x:px+.5,y:py+Math.max(.6,cellH*.12),width:Math.max(.6,cellW-1),height:Math.max(.8,cellH*.82),rx:Math.min(4,cellW*.08),fill:`url(#${prefix}-metal)`,stroke:'#65727a','stroke-width':.45,filter:`url(#${prefix}-shadow)`}));
      root.append(svg('ellipse',{cx:px+cellW/2,cy:py+Math.max(.6,cellH*.12),rx:Math.max(.3,cellW/2-.5),ry:Math.max(.35,Math.min(4,cellH*.13)),fill:`url(#${prefix}-top)`,stroke:'#6d7982','stroke-width':.4}));
      drawn++;
    }
    dimH(root,x0,x0+w,48,`${fmt.format(realW)} мм`);dimV(root,55,y0,y0+h,`${fmt.format(realH)} мм · ${layerLabel(s)}`);
    root.append(svg('text',{x:320,y:286,'text-anchor':'middle',class:'box-dim-note'},`${horizontal} по горизонтали × ${z} по высоте`));target.replaceChildren(root);
  }

  function drawIso(s,dims){
    const root=svg('svg',{viewBox:'0 0 640 300',preserveAspectRatio:'xMidYMid meet'});defs(root,'bi');
    const z=layers(s),total=s.x*s.y*z,maxVisible=360;
    const ratio=Math.max(.14,Math.min(1.65,s.h/s.d)),w=27,ell=4.7,body=Math.max(5.2,Math.min(24,16.5*ratio)),stepX=w*.82,stepYx=w*.45,stepYy=10.2,stepZ=body+3.1;
    const spanW=Math.max(w,(s.x-1)*stepX+(s.y-1)*stepYx+w),spanH=Math.max(body+ell*2,(s.y-1)*stepYy+(z-1)*stepZ+body+ell*2);
    const scale=Math.min(535/spanW,205/spanH,1.25),left=320-spanW*scale/2,bottom=246;
    const group=svg('g',{transform:`translate(${left} ${bottom}) scale(${scale})`,filter:'url(#bi-shadow)'});let drawn=0;
    outer:for(let zz=0;zz<z;zz++)for(let y=s.y-1;y>=0;y--)for(let x=0;x<s.x;x++){
      if(drawn>=maxVisible)break outer;
      const stagger=mode==='staggered'&&y%2?w/2:0,px=x*stepX+y*stepYx+stagger,py=-y*stepYy-zz*stepZ,by=py-body;
      group.append(svg('rect',{x:px,y:by,width:w,height:body,rx:Math.min(5,w*.12),fill:'url(#bi-metal)',stroke:'#64717a','stroke-width':.6}));
      group.append(svg('ellipse',{cx:px+w/2,cy:by,rx:w/2,ry:ell,fill:'url(#bi-top)',stroke:'#6d7982','stroke-width':.6}));
      drawn++;
    }
    root.append(group);
    root.append(svg('text',{x:320,y:278,'text-anchor':'middle',class:'box-dim-note'},drawn<total?`Показано ${drawn} из ${intFmt.format(total)} · блок ${fmt.format(dims.length)} × ${fmt.format(dims.width)} × ${fmt.format(dims.height)} мм`:`${layoutText(s)} · ${layerLabel(s)} · блок ${fmt.format(dims.length)} × ${fmt.format(dims.width)} × ${fmt.format(dims.height)} мм`));
    el.iso.replaceChildren(root);
  }

  function updateModeUI(){
    document.querySelectorAll('[data-box-pack]').forEach(b=>b.classList.toggle('is-active',b.dataset.boxPack===mode));
    if(el.note)el.note.textContent=mode==='staggered'?'ряды смещены на ½ Ø':'ряды без смещения';
  }

  function render(){
    const s=state(),ok=complete(s);el.calc.disabled=!ok;el.copy.disabled=!ok;
    if(!ok){
      el.total.textContent='—';el.part.textContent='Деталь: —';el.layout.textContent='Укладка: —';el.block.textContent='Габариты блока: —';
      el.topSize.textContent='—';el.sideSize.textContent='—';el.endSize.textContent='—';el.isoLabel.textContent='—';
      [el.top,el.side,el.end,el.iso].forEach(empty);return;
    }
    const dims=dimensions(s),z=layers(s),total=s.x*s.y*z;
    el.total.textContent=intFmt.format(total);
    el.part.textContent=`Деталь: Ø${fmt.format(s.d)} × ${fmt.format(s.h)} мм`;
    el.layout.textContent=`Укладка: ${layoutText(s)} · ${layerLabel(s)} · ${mode==='staggered'?'шахматная':'ровная'}`;
    el.block.textContent=`Габариты: ${fmt.format(dims.length)} × ${fmt.format(dims.width)} × ${fmt.format(dims.height)} мм`;
    el.topSize.textContent=`${fmt.format(dims.length)} × ${fmt.format(dims.width)} мм`;el.sideSize.textContent=`${fmt.format(dims.length)} × ${fmt.format(dims.height)} мм`;el.endSize.textContent=`${fmt.format(dims.width)} × ${fmt.format(dims.height)} мм`;el.isoLabel.textContent=`${intFmt.format(total)} деталей · ${layerLabel(s)}`;
    drawTop(s,dims);drawSide(el.side,s,s.x,dims.length,'bs');drawSide(el.end,s,s.y,dims.width,'be');drawIso(s,dims);saveLast();
  }

  function commitWorkspace(){
    const s=state();if(!complete(s))return;
    updateWorkspace(w=>({
      stock:w.stock||{diameter:s.d,partLength:s.h},
      box:{
        diameter:s.d,heightPerPart:s.h,x:s.x,y:s.y,z:s.z,layers:s.layers,mode:s.mode,
        total:s.total,length:s.length,width:s.width,height:s.height
      }
    }),{source:'box'});
  }

  function bump(input,delta){
    const isZ=input===el.z,current=isZ&&zOptional?1:(integer(input)??1),next=Math.max(1,Math.min(MAX_COUNT,current+delta));
    if(isZ&&next===1){zOptional=true;input.value=''}else{if(isZ)zOptional=false;input.value=next}
    render();
  }
  async function copy(){
    const s=state();if(!complete(s))return;const dims=dimensions(s),z=layers(s);
    const text=`Деталь Ø${fmt.format(s.d)}×${fmt.format(s.h)} мм | Укладка ${layoutText(s)} (${mode==='staggered'?'шахматная':'ровная'}) | Всего ${intFmt.format(s.x*s.y*z)} шт | Габариты ${fmt.format(dims.length)}×${fmt.format(dims.width)}×${fmt.format(dims.height)} мм`;
    let copied=false;try{if(navigator.clipboard?.writeText&&window.isSecureContext){await navigator.clipboard.writeText(text);copied=true}}catch{}
    if(!copied){const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();try{copied=document.execCommand('copy')}catch{}area.remove()}
    if(copied){const old=el.copy.textContent;el.copy.textContent='Скопировано ✓';setTimeout(()=>el.copy.textContent=old,1600)}
  }

  restoreLast();updateModeUI();
  [el.d,el.h,el.x,el.y,el.z].forEach(input=>{
    input.addEventListener('input',()=>{if(input===el.z)zOptional=String(el.z.value||'').trim()==='';render()});
    input.addEventListener('change',()=>{if(input===el.z)zOptional=String(el.z.value||'').trim()==='';render()});
  });
  document.querySelectorAll('[data-box-step]').forEach(button=>button.addEventListener('click',()=>bump($(button.dataset.boxStep),Number(button.dataset.delta))));
  document.querySelectorAll('[data-box-pack]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.boxPack;saveMode();updateModeUI();render()}));
  el.calc.addEventListener('click',()=>{render();commitWorkspace();document.getElementById('boxVisual')?.scrollIntoView({behavior:'smooth',block:'start'})});
  el.reset.addEventListener('click',()=>{try{localStorage.removeItem(LAST_KEY)}catch{};el.d.value='';el.h.value='';el.x.value='';el.y.value='';el.z.value='';zOptional=true;mode='straight';saveMode();updateModeUI();render();el.d.focus()});
  el.copy.addEventListener('click',copy);
  render();
})();