import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVED_WORKSPACES_KEY, SAVED_WORKSPACES_VERSION, projectSummary } from '../modules/project-store.mjs';

test('saved workspace library has stable storage contract',()=>{
  assert.equal(SAVED_WORKSPACES_KEY,'cnc-suite.saved-workspaces-v1');
  assert.equal(SAVED_WORKSPACES_VERSION,1);
});

test('project summary derives useful card metadata',()=>{
  const s=projectSummary({
    id:'p1',
    title:'Куб R25',
    material:{label:'AISI 304'},
    geometry:{name:'Шар → куб'},
    tool:{insert:'WNMG'},
    operations:[{operation:'turning'}],
    results:{copilot:{count:1}}
  });
  assert.equal(s.title,'Куб R25');
  assert.equal(s.material,'AISI 304');
  assert.equal(s.geometry,'Шар → куб');
  assert.equal(s.operations,1);
  assert.equal(s.progress.done,5);
});
