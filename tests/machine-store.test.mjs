import test from 'node:test';
import assert from 'node:assert/strict';
import { MACHINE_STORAGE_KEY, MACHINE_FALLBACK, deepMergeMachine, effectiveRpmLimit } from '../modules/machine-store.mjs';

test('machine store preserves existing localStorage key',()=>{
  assert.equal(MACHINE_STORAGE_KEY,'cncFullMachineV1');
});

test('machine merge preserves nested hardware fields',()=>{
  const merged=deepMergeMachine(MACHINE_FALLBACK,{maxRpm:3500,chuckCylinder:{maxRpm:4200}});
  assert.equal(merged.maxRpm,3500);
  assert.equal(merged.chuckCylinder.maxRpm,4200);
  assert.equal(merged.chuckCylinder.model,'BK-1552');
  assert.equal(merged.motor.model,'1PH8137-1DD02-0CA1');
});

test('effective RPM limit uses lowest positive physical constraint',()=>{
  const p=deepMergeMachine(MACHINE_FALLBACK,{maxRpm:4000,setupMaxRpm:3200,chuckCylinder:{maxRpm:5000},motor:{maxRpm:8000}});
  assert.deepEqual(effectiveRpmLimit(p),['патрон/кулачки',3200]);
});
