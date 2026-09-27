import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkspaceResult, workspaceResultText, workspaceNcDraft } from '../modules/result-core.mjs';

const sample={
  id:'ws-1',
  title:'Фланец Ø185',
  material:{label:'AISI 304'},
  stock:{diameter:185,partLength:10,quantity:20},
  geometry:{name:'Фланец Ø185',calc:'pcd',result:{headline:'PCD Ø120'}},
  mode:{operation:'Точение',rpm:'500',feed:'0.06',tool:'WNMG 080408'},
  tool:{holder:'MWLNR',insert:'WNMG 080408',grade:'HAPC9030'},
  box:{total:20,length:500,width:200,height:10},
  machine:{name:'Tengyue CK52PT-Y',control:'SINUMERIK 828D / ShopTurn'},
  operations:[{operation:'turning'}],
  results:{
    cutcalc:{purchaseLength:1000},
    copilot:{count:1,items:[{
      operation:'Продольное точение',
      spindleRpm:500,
      feedMmRev:.06,
      vcActual:145,
      apMm:1,
      warnings:['Проверить вылет'],
      machineInput:{constantSurface:'G96 S145',feedMode:'G95 F0.06',feedPerRev:.06,summary:'S max 4000'}
    }]}
  }
};

test('final result aggregates workspace modules',()=>{
  const r=buildWorkspaceResult(sample);
  assert.equal(r.ready,true);
  assert.equal(r.title,'Фланец Ø185');
  assert.equal(r.material.label,'AISI 304');
  assert.equal(r.operations.length,1);
  assert.equal(r.operations[0].rpm,500);
});

test('final result reports missing production stages',()=>{
  const r=buildWorkspaceResult({title:'Пусто'});
  assert.equal(r.ready,false);
  assert.ok(r.missing.includes('geometry'));
  assert.ok(r.missing.includes('copilot'));
});

test('text report includes machining data',()=>{
  const text=workspaceResultText(buildWorkspaceResult(sample));
  assert.match(text,/Фланец Ø185/);
  assert.match(text,/AISI 304/);
  assert.match(text,/500 rpm/);
  assert.match(text,/WNMG 080408/);
});

test('NC draft is built only from existing Copilot machine input',()=>{
  const text=workspaceNcDraft(buildWorkspaceResult(sample));
  assert.match(text,/ЧЕРНОВИК ДЛЯ СТОЙКИ/);
  assert.match(text,/G96 S145/);
  assert.match(text,/G95 F0\.06/);
  assert.match(text,/WARNING: Проверить вылет/);
});
