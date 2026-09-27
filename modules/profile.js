import {
  MACHINE_FALLBACK,
  defaultMachine,
  loadMachine,
  saveMachine,
  resetMachine,
  effectiveRpmLimit,
  subscribeMachine
} from './machine-store.mjs';

(() => {
  'use strict';
  const $=id=>document.getElementById(id);

  function num(id,fallbackValue){
    const node=$(id);
    if(!node)return fallbackValue;
    const raw=node.value.trim();
    if(!raw)return fallbackValue;
    const n=Number(raw.replace(',','.'));
    return Number.isFinite(n)?n:fallbackValue;
  }

  function profileFromForm(){
    const old=loadMachine();
    return {
      ...old,
      name:$('profileMachineName').value.trim()||MACHINE_FALLBACK.name,
      control:$('profileControl').value.trim()||MACHINE_FALLBACK.control,
      maxRpm:Math.max(100,num('profileMaxRpm',4000)),
      spindleKw:Math.max(1,num('profilePower',17)),
      efficiency:Math.max(.5,Math.min(1,num('profileEfficiency',.85))),
      setupMaxRpm:$('profileSetupRpm').value.trim()?Math.max(100,num('profileSetupRpm',null)):null,
      spindle:$('profileSpindle').value.trim()||'A2-6',
      bore:Math.max(1,num('profileBore',61)),
      turret:$('profileTurret').value.trim()||MACHINE_FALLBACK.turret,
      axes:$('profileAxes').value.trim()||MACHINE_FALLBACK.axes,
      chuckCylinder:{
        ...(old.chuckCylinder||{}),
        model:$('profileCylinderModel').value.trim()||'BK-1552',
        maxRpm:Math.max(100,num('profileCylinderRpm',6000))
      },
      motor:{
        ...(old.motor||{}),
        model:$('profileMotorModel').value.trim()||'1PH8137-1DD02-0CA1',
        maxRpm:Math.max(100,num('profileMotorRpm',8000))
      }
    };
  }

  function render(p=loadMachine()){
    $('profileMachineName').value=p.name||'';
    $('profileControl').value=p.control||'';
    $('profileMaxRpm').value=p.maxRpm||4000;
    $('profilePower').value=p.spindleKw||17;
    $('profileEfficiency').value=p.efficiency??.85;
    $('profileSetupRpm').value=p.setupMaxRpm||'';
    $('profileSpindle').value=p.spindle||'A2-6';
    $('profileBore').value=p.bore||61;
    $('profileTurret').value=p.turret||'';
    $('profileAxes').value=p.axes||'';
    $('profileCylinderModel').value=p.chuckCylinder?.model||'BK-1552';
    $('profileCylinderRpm').value=p.chuckCylinder?.maxRpm||6000;
    $('profileMotorModel').value=p.motor?.model||'1PH8137-1DD02-0CA1';
    $('profileMotorRpm').value=p.motor?.maxRpm||8000;

    $('profileHeroName').textContent=p.name||MACHINE_FALLBACK.name;
    $('profileHeroControl').textContent=p.control||MACHINE_FALLBACK.control;

    if($('homeMachineName'))$('homeMachineName').textContent=p.name||MACHINE_FALLBACK.name;
    if($('homeMachineControl'))$('homeMachineControl').textContent=p.control||MACHINE_FALLBACK.control;
    if($('homeMachineRpm'))$('homeMachineRpm').textContent=(p.maxRpm||4000)+' rpm';
    if($('homeMachineTurret'))$('homeMachineTurret').textContent=String(p.turret||'15 позиций').replace('иций','.');
    if($('homeMachineAxes'))$('homeMachineAxes').textContent=p.axes||'X / Z / Y / C';

    const [source,limit]=effectiveRpmLimit(p);
    $('profileEffectiveLimit').textContent=Math.round(limit);
    $('profileLimitText').textContent='G96 / LIMS будет ограничен: '+source+' · '+Math.round(limit)+' rpm';
  }

  function exportProfile(){
    const p=profileFromForm();
    const blob=new Blob([JSON.stringify({type:'cnc-machine-profile',version:1,profile:p},null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='CK52PT-Y-profile.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),800);
  }

  $('profileSave').onclick=()=>{
    const next=saveMachine(profileFromForm());
    if(next){
      render(next);
      const b=$('profileSave'),old=b.textContent;
      b.textContent='Сохранено ✓';
      setTimeout(()=>b.textContent=old,1400);
    }
  };

  $('profileReset').onclick=()=>{
    if(confirm('Вернуть подтверждённый профиль CK52PT-Y по умолчанию?')){
      const next=resetMachine()||defaultMachine();
      render(next);
    }
  };

  $('profileExport').onclick=exportProfile;
  subscribeMachine(render);
  render();
})();
