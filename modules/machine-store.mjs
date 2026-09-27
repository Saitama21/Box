export const MACHINE_STORAGE_KEY = 'cncFullMachineV1';
export const MACHINE_EVENT = 'cnc-machine-profile-changed';

export const MACHINE_FALLBACK = Object.freeze({
  id:'ck52pty',
  name:'Tengyue CK52PT-Y',
  control:'SINUMERIK 828D / ShopTurn',
  maxRpm:4000,
  spindleKw:17,
  efficiency:.85,
  spindle:'A2-6',
  bore:61,
  turret:'15 позиций · BMT40 / ER25',
  axes:'X / Z / Y / C',
  setupMaxRpm:null,
  chuckCylinder:{model:'BK-1552',maxRpm:6000,maxPressureBar:44.1},
  motor:{family:'Siemens SIMOTICS M',model:'1PH8137-1DD02-0CA1',maxRpm:8000,maxTorqueNm:405}
});

export function deepMergeMachine(base, raw){
  const safe=raw&&typeof raw==='object'?raw:{};
  return {
    ...base,
    ...safe,
    motor:{...(base.motor||{}),...(safe.motor||{})},
    chuckCylinder:{...(base.chuckCylinder||{}),...(safe.chuckCylinder||{})},
    drive:{...(base.drive||{}),...(safe.drive||{})}
  };
}

export function defaultMachine(){
  const external=globalThis.window?.CNC_DATA?.machineDefault;
  return deepMergeMachine(MACHINE_FALLBACK, external || {});
}

export function loadMachine(){
  const base=defaultMachine();
  try{
    const raw=JSON.parse(globalThis.localStorage?.getItem(MACHINE_STORAGE_KEY)||'{}');
    return deepMergeMachine(base, raw);
  }catch{
    return deepMergeMachine(base,{});
  }
}

export function saveMachine(profile,{notify=true}={}){
  const next=deepMergeMachine(defaultMachine(),profile);
  try{
    globalThis.localStorage?.setItem(MACHINE_STORAGE_KEY,JSON.stringify(next));
    if(notify && globalThis.window?.dispatchEvent){
      globalThis.window.dispatchEvent(new CustomEvent(MACHINE_EVENT,{detail:next}));
    }
    return next;
  }catch{
    return null;
  }
}

export function resetMachine(){
  return saveMachine(defaultMachine());
}

export function effectiveRpmLimit(profile=loadMachine()){
  const values=[
    ['станок',profile.maxRpm],
    ['гидроцилиндр',profile.chuckCylinder?.maxRpm],
    ['двигатель',profile.motor?.maxRpm],
    ['патрон/кулачки',profile.setupMaxRpm]
  ].filter(([,value])=>Number(value)>0).sort((a,b)=>Number(a[1])-Number(b[1]));
  return values[0] || ['станок',4000];
}

export function subscribeMachine(listener){
  if(!globalThis.window?.addEventListener)return()=>{};
  const handler=event=>listener(event.detail||loadMachine());
  window.addEventListener(MACHINE_EVENT,handler);
  return()=>window.removeEventListener(MACHINE_EVENT,handler);
}
