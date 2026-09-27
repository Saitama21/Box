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

test('Modes material cards use intact local WebP assets',()=>{
  for(const material of MODES_MATERIALS){
    assert.equal(material.art.startsWith('./assets/modes/'),true);
    const asset=material.art.split('?')[0];
    assert.equal(asset.endsWith('.webp'),true);
    const path=asset.replace('./','');
    const data=fs.readFileSync(path);
    assert.equal(data.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
    const declared=data.readUInt32LE(4)+8;
    assert.equal(declared,data.length,`${path} is truncated or has an invalid RIFF size`);
  }
});
