export const SHELL_ROUTES = Object.freeze(['home','workflow','tools','projects','profile']);

export const MODULE_REGISTRY = Object.freeze({
  modes: {
    id:'modes',
    view:'modes',
    order:1,
    eyebrow:'МОЯ БАЗА · CNC REFERENCE',
    title:'Режимы обработки',
    description:'Проверенные режимы обработки, реальные детали, материалы и заметки.'
  },
  cutcalc: {
    id:'cutcalc',
    view:'cutcalc',
    order:2,
    eyebrow:'CUT CALC CNC',
    title:'Цеховые расчёты',
    description:'Расход прутка, длина детали, отрезной рез, торцовка, количество и расчёт партии.'
  },
  box: {
    id:'box',
    view:'box',
    order:3,
    eyebrow:'BOX · УКЛАДКА',
    title:'Укладка заготовок',
    description:'Количество деталей по X/Y/Z, габариты блока и технические проекции.'
  },
  geometry: {
    id:'geometry',
    view:'geometry',
    order:4,
    eyebrow:'CNC GEOMETRY · FULL OFFLINE',
    title:'Геометрия',
    description:'Координаты, PCD, ось C, дуги, лепестки, пазы, куб, шар и другие геометрические расчёты.'
  },
  copilot: {
    id:'copilot',
    view:'copilot',
    order:5,
    eyebrow:'CNC COPILOT',
    title:'CNC Напарник',
    description:'Маршрут обработки, инструмент, параметры станка и проверенные режимы.'
  },
  codes: {
    id:'codes',
    view:'codes',
    order:6,
    eyebrow:'SINUMERIK 828D · G/M',
    title:'Справочник кодов',
    description:'G-коды, M-коды, поиск, категории и избранное.'
  }
});

export function moduleMeta(id){
  return MODULE_REGISTRY[id] || null;
}

export function moduleIds(){
  return Object.values(MODULE_REGISTRY)
    .sort((a,b)=>a.order-b.order)
    .map(x=>x.id);
}

export function resolveView(id){
  return MODULE_REGISTRY[id]?.view || 'module';
}

export function isShellRoute(route){
  return SHELL_ROUTES.includes(route);
}
