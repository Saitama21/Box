import test from 'node:test';
import assert from 'node:assert/strict';
import { M_CODES, G_CODES, ALL_CODES, GROUPS } from '../modules/codes-data.mjs';

test('SINUMERIK reference keeps M/G databases',()=>{
  assert.ok(M_CODES.length>=28);
  assert.ok(G_CODES.length>=90);
  assert.equal(ALL_CODES.length,M_CODES.length+G_CODES.length);
});

test('critical machine commands are preserved',()=>{
  const codes=new Set(ALL_CODES.map(x=>x.code));
  for(const code of ['M03','M05','M08','M10','M11','M75','M76','G0','G1','G2','G3','G54–G59','G95','G96','G97','G33']){
    assert.ok(codes.has(code),`Missing code ${code}`);
  }
});

test('every code has a valid group and bilingual label',()=>{
  for(const item of ALL_CODES){
    assert.ok(GROUPS[item.group],`Unknown group ${item.group}`);
    assert.ok(item.title);
    assert.ok(item.english);
  }
});
