import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_STORAGE_KEY, WORKSPACE_VERSION, emptyWorkspace, normalizeWorkspace, workspaceProgress } from '../modules/workspace-store.mjs';

test('workspace keeps stable storage contract',()=>{
  assert.equal(WORKSPACE_STORAGE_KEY,'cnc-suite.workspace-v1');
  assert.equal(WORKSPACE_VERSION,1);
});

test('empty workspace contains cross-module sections',()=>{
  const w=emptyWorkspace('2026-01-01T00:00:00.000Z');
  assert.equal(w.title,'Новая деталь');
  assert.deepEqual(w.operations,[]);
  assert.deepEqual(w.results,{cutcalc:null,copilot:null});
  for(const key of ['material','stock','geometry','mode','tool','box','machine'])assert.equal(w[key],null);
});

test('workspace normalization preserves partial module snapshots',()=>{
  const w=normalizeWorkspace({
    title:'Фланец Ø185',
    material:{id:'aisi304',label:'AISI 304'},
    geometry:{calc:'pcd'},
    operations:[{operation:'face'}],
    results:{cutcalc:{purchaseLength:1000}}
  });
  assert.equal(w.title,'Фланец Ø185');
  assert.equal(w.material.id,'aisi304');
  assert.equal(w.geometry.calc,'pcd');
  assert.equal(w.operations.length,1);
  assert.equal(w.results.cutcalc.purchaseLength,1000);
  assert.equal(w.results.copilot,null);
});

test('workspace progress is derived from real sections',()=>{
  const w=normalizeWorkspace({
    geometry:{calc:'sphereCube'},
    material:{id:'aisi304'},
    tool:{insert:'WNMG 080408'},
    operations:[{operation:'turning'}],
    results:{copilot:{count:1}}
  });
  const p=workspaceProgress(w);
  assert.equal(p.done,5);
  assert.equal(p.total,7);
  assert.equal(p.percent,71);
});
