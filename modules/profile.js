(() => {
  'use strict';
  const KEY='cncFullMachineV1';
  const $=id=>document.getElementById(id);
  const fallback={id:'ck52pty',name:'Tengyue CK52PT-Y',control:'SINUMERIK 828D / ShopTurn',maxRpm:4000,spindleKw:17,efficiency:.85,spindle:'A2-6',bore:61,turret:'15 позиций · BMT40 / ER25',axes:'X / Z / Y / C',setupMaxRpm:null,chuckCylinder:{model:'BK-1552',maxRpm:6000,maxPressureBar:44.1},motor:{family:'Siemens SIMOTICS M',model:'1PH8137-1DD02-0CA1',maxRpm:8000,maxTorqueNm:405}};
  const sourceDefault=window.CNC_DATA?.machineDefault||fallback;

  function deepMerge(base,raw){
    raw=raw&&typeof raw==='object'?raw:{};
    return{...base,...raw,motor:{...(base.motor||{}),...(raw.motor||{})},chuckCylinder:{...(base.chuckCylinder||{}),...(raw.chuckCylinder||{})},drive:{...(base.drive||{}),...(raw.drive||{})}};
  }
  function load(){try{return deepMerge(sourceDefault,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return deepMerge(sourceDefault,{})}}
  function save(p){try{localStorage.setItem(KEY,JSON.stringify(p));window.dispatchEvent(new CustomEvent('cnc-machine-profile-changed',{detail:p}));return true}catch{return false}}
  function num(id,fallbackValue){const raw=$(id).value.trim();if(!raw)return fallbackValue;const n=Number(raw.replace(',','.'));return Number.isFinite(n)?n:fallbackValue}
  function profileFromForm(){
    const old=load();
    return{...old,name:$('profileMachineName').value.trim()||fallback.name,control:$('profileControl').value.trim()||fallback.control,maxRpm:Math.max(100,num('profileMaxRpm',4000)),spindleKw:Math.max(1,num('profilePower',17)),efficiency:Math.max(.5,Math.min(1,num('profileEfficiency',.85))),setupMaxRpm:$('profileSetupRpm').value.trim()?Math.max(100,num('profileSetupRpm',null)):null,spindle:$('profileSpindle').value.trim()||'A2-6',bore:Math.max(1,num('profileBore',61)),turret:$('profileTurret').value.trim()||fallback.turret,axes:$('profileAxes').value.trim()||fallback.axes,chuckCylinder:{...(old.chuckCylinder||{}),model:$('profileCylinderModel').value.trim()||'BK-1552',maxRpm:Math.max(100,num('profileCylinderRpm',6000))},motor:{...(old.motor||{}),model:$('profileMotorModel').value.trim()||'1PH8137-1DD02-0CA1',maxRpm:Math.max(100,num('profileMotorRpm',8000))}};
  }
  function limiter(p){const vals=[['станок',p.maxRpm],['гидроцилиндр',p.chuckCylinder?.maxRpm],['двигатель',p.motor?.maxRpm],['патрон/кулачки',p.setupMaxRpm]].filter(x=>Number(x[1])>0).sort((a,b)=>a[1]-b[1]);return vals[0]||['станок',4000]}
  function render(p=load()){
    $('profileMachineName').value=p.name||'';$('profileControl').value=p.control||'';$('profileMaxRpm').value=p.maxRpm||4000;$('profilePower').value=p.spindleKw||17;$('profileEfficiency').value=p.efficiency??.85;$('profileSetupRpm').value=p.setupMaxRpm||'';$('profileSpindle').value=p.spindle||'A2-6';$('profileBore').value=p.bore||61;$('profileTurret').value=p.turret||'';$('profileAxes').value=p.axes||'';$('profileCylinderModel').value=p.chuckCylinder?.model||'BK-1552';$('profileCylinderRpm').value=p.chuckCylinder?.maxRpm||6000;$('profileMotorModel').value=p.motor?.model||'1PH8137-1DD02-0CA1';$('profileMotorRpm').value=p.motor?.maxRpm||8000;
    $('profileHeroName').textContent=p.name||fallback.name;$('profileHeroControl').textContent=p.control||fallback.control;
    if($('homeMachineName'))$('homeMachineName').textContent=p.name||fallback.name;if($('homeMachineControl'))$('homeMachineControl').textContent=p.control||fallback.control;if($('homeMachineRpm'))$('homeMachineRpm').textContent=(p.maxRpm||4000)+' rpm';if($('homeMachineTurret'))$('homeMachineTurret').textContent=String(p.turret||'15 позиций').replace('иций','.') ;if($('homeMachineAxes'))$('homeMachineAxes').textContent=p.axes||'X / Z / Y / C';
    const lim=limiter(p);$('profileEffectiveLimit').textContent=Math.round(lim[1]);$('profileLimitText').textContent='G96 / LIMS будет ограничен: '+lim[0]+' · '+Math.round(lim[1])+' rpm';
  }
  function exportProfile(){
    const p=profileFromForm(),blob=new Blob([JSON.stringify({type:'cnc-machine-profile',version:1,profile:p},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CK52PT-Y-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);
  }
  $('profileSave').onclick=()=>{const p=profileFromForm();if(save(p)){render(p);const b=$('profileSave'),old=b.textContent;b.textContent='Сохранено ✓';setTimeout(()=>b.textContent=old,1400)}};
  $('profileReset').onclick=()=>{if(confirm('Вернуть подтверждённый профиль CK52PT-Y по умолчанию?')){const p=deepMerge(sourceDefault,{});save(p);render(p)}};
  $('profileExport').onclick=exportProfile;
  window.addEventListener('cnc-machine-profile-changed',e=>render(e.detail));
  render();
})();