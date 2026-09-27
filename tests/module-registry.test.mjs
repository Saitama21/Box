import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_REGISTRY, SHELL_ROUTES, moduleIds, resolveView } from '../modules/module-registry.mjs';

test('module registry preserves approved CNC order',()=>{
  assert.deepEqual(moduleIds(),['modes','cutcalc','box','geometry','copilot','codes']);
});

test('every production module resolves to its own native view',()=>{
  for(const id of moduleIds())assert.equal(resolveView(id),MODULE_REGISTRY[id].view);
});

test('shell routes stay separate from CNC modules',()=>{
  assert.deepEqual(SHELL_ROUTES,['home','workflow','tools','projects','profile']);
});
