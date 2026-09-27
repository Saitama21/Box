import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MODES_DB_NAME, MODES_DB_VERSION, MODES_STORE, MODES_MATERIALS } from '../modules/modes-data.mjs';

test('Modes keeps the existing IndexedDB contract',()=>{
  assert.equal(MODES_DB_NAME,'operating-modes-828d');
  assert.equal(MODES_DB_VERSION,1);
  assert.equal(MODES_STORE,'records');
});

test('Modes material set remains stable',()=>{
  assert.deepEqual(MODES_MATERIALS.map(m=>m.id),['aisi304','steel','polyamide','brass']);
});

test('Modes material cards use local WebP assets',()=>{
  for(const material of MODES_MATERIALS){
    assert.match(material.art,/^./assets/modes/.+.webp$/);
    const path=material.art.replace('./','');
    const data=fs.readFileSync(path);
    assert.equal(data.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
  }
});
