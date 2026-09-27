function text(value,fallback='—'){
  const s=String(value??'').trim();
  return s||fallback;
}

function num(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}

export function buildWorkspaceResult(workspace){
  const w=workspace&&typeof workspace==='object'?workspace:{};
  const material=w.material||{};
  const stock=w.stock||{};
  const geometry=w.geometry||{};
  const mode=w.mode||{};
  const tool=w.tool||{};
  const box=w.box||{};
  const machine=w.machine||{};
  const copilot=w.results?.copilot||null;
  const cutcalc=w.results?.cutcalc||null;

  const operations=Array.isArray(copilot?.items)
    ? copilot.items.map((item,index)=>({
        index:index+1,
        name:text(item.operation||item.route?.operation,`Операция ${index+1}`),
        rpm:num(item.spindleRpm),
        feed:num(item.feedMmRev),
        vc:num(item.vcActual),
        ap:num(item.apMm),
        warnings:Array.isArray(item.warnings)?item.warnings:[],
        machineInput:item.machineInput&&typeof item.machineInput==='object'?item.machineInput:null
      }))
    : [];

  const missing=[];
  if(!w.geometry)missing.push('geometry');
  if(!w.material&&!w.mode)missing.push('material');
  if(!w.tool)missing.push('tool');
  if(!Array.isArray(w.operations)||!w.operations.length)missing.push('operations');
  if(!copilot)missing.push('copilot');

  return {
    id:text(w.id,'workspace'),
    title:text(w.title,'Новая деталь'),
    ready:missing.length===0,
    missing,
    createdAt:w.createdAt||null,
    updatedAt:w.updatedAt||null,
    machine:{
      name:text(machine.name),
      control:text(machine.control),
      maxRpm:num(machine.maxRpm),
      spindleKw:num(machine.spindleKw)
    },
    material:{
      label:text(material.label||material.name||material.title||material.code||material.id),
      iso:text(material.iso,'')
    },
    stock:{
      diameter:num(stock.diameter),
      partLength:num(stock.partLength),
      quantity:num(stock.quantity),
      stockLength:num(stock.stockLength)
    },
    geometry:{
      name:text(geometry.name||geometry.title||geometry.result?.title||geometry.calc),
      calc:text(geometry.calc,''),
      headline:text(geometry.result?.headline,'')
    },
    mode:{
      title:text(mode.title),
      operation:text(mode.operation,''),
      rpm:num(mode.rpm),
      feed:num(mode.feed),
      depth:num(mode.depth),
      tool:text(mode.tool,'')
    },
    tool:{
      holder:text(tool.holder,''),
      insert:text(tool.insert,''),
      grade:text(tool.grade,''),
      breaker:text(tool.breaker,''),
      nose:num(tool.nose),
      location:text(tool.location,'')
    },
    box:{
      total:num(box.total),
      length:num(box.length),
      width:num(box.width),
      height:num(box.height),
      mode:text(box.mode,'')
    },
    cutcalc:cutcalc?{
      purchaseLength:num(cutcalc.purchaseLength),
      createdAt:cutcalc.createdAt||null
    }:null,
    operations
  };
}

export function workspaceResultText(result){
  const r=result||{};
  const lines=[
    'CNC COPILOT — ТЕХНОЛОГИЧЕСКАЯ СВОДКА',
    r.title||'Новая деталь',
    '',
    `Станок: ${r.machine?.name||'—'}`,
    `Стойка: ${r.machine?.control||'—'}`,
    `Материал: ${r.material?.label||'—'}`,
    `Геометрия: ${r.geometry?.name||'—'}`,
    `Заготовка: ${r.stock?.diameter!=null?'Ø'+r.stock.diameter+' мм':'—'}`,
    `Инструмент: ${[r.tool?.holder,r.tool?.insert,r.tool?.grade].filter(Boolean).join(' · ')||'—'}`,
    `Проверенный режим: ${[
      r.mode?.operation,
      r.mode?.rpm!=null?r.mode.rpm+' rpm':'',
      r.mode?.feed!=null?'f '+r.mode.feed+' мм/об':''
    ].filter(Boolean).join(' · ')||'—'}`
  ];

  if(r.cutcalc?.purchaseLength!=null){
    lines.push(`Заготовка по CutCalc: ${(r.cutcalc.purchaseLength/1000).toFixed(3)} м`);
  }
  if(r.box?.total!=null){
    lines.push(`Укладка Box: ${r.box.total} шт · ${[r.box.length,r.box.width,r.box.height].filter(v=>v!=null).join(' × ')} мм`);
  }

  lines.push('', 'ОПЕРАЦИИ');
  if(!r.operations?.length){
    lines.push('— нет рассчитанных операций');
  }else{
    for(const op of r.operations){
      lines.push(
        `${op.index}. ${op.name}`,
        `   S: ${op.rpm??'—'} rpm · f: ${op.feed??'—'} мм/об · Vc: ${op.vc??'—'} м/мин · ap: ${op.ap??'—'} мм`
      );
      for(const warning of op.warnings||[])lines.push(`   ! ${warning}`);
    }
  }

  if(r.missing?.length){
    lines.push('', 'НЕ ЗАПОЛНЕНО: '+r.missing.join(', '));
  }

  return lines.join('\n');
}

export function workspaceNcDraft(result){
  const r=result||{};
  const lines=[
    '; CNC COPILOT — ЧЕРНОВИК ДЛЯ СТОЙКИ',
    '; Проверить инструмент, нули, направление вращения и ограничения станка перед запуском',
    `; Деталь: ${r.title||'—'}`,
    `; Станок: ${r.machine?.name||'—'} · ${r.machine?.control||'—'}`,
    `; Материал: ${r.material?.label||'—'}`,
    ''
  ];

  if(!r.operations?.length){
    lines.push('; Нет рассчитанных операций Co-Pilot');
    return lines.join('\n');
  }

  for(const op of r.operations){
    lines.push(`; OP ${String(op.index).padStart(2,'0')} — ${op.name}`);
    const mi=op.machineInput||{};
    if(mi.constantSurface)lines.push(String(mi.constantSurface));
    else if(op.rpm!=null)lines.push(`S${Math.round(op.rpm)}`);
    if(mi.feedMode&&mi.feedPerRev!=null)lines.push(`${mi.feedMode} ${mi.feedPerRev}`);
    else if(op.feed!=null)lines.push(`G95 F${op.feed}`);
    if(mi.summary)lines.push(`; ${mi.summary}`);
    for(const warning of op.warnings||[])lines.push(`; WARNING: ${warning}`);
    lines.push('');
  }

  return lines.join('\n');
}
