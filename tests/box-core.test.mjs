import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBox, normalizePositive, normalizeCount } from '../modules/box-core.mjs';

test('straight one-layer layout keeps original Box arithmetic', () => {
  const r = computeBox({ d: 50, h: 20, x: 9, y: 5, z: null }, 'straight');
  assert.equal(r.valid, true);
  assert.equal(r.total, 45);
  assert.equal(r.length, 450);
  assert.equal(r.width, 250);
  assert.equal(r.height, 20);
});

test('straight multilayer layout multiplies count and height', () => {
  const r = computeBox({ d: 50, h: 20, x: 9, y: 5, z: 3 }, 'straight');
  assert.equal(r.total, 135);
  assert.equal(r.length, 450);
  assert.equal(r.width, 250);
  assert.equal(r.height, 60);
});

test('staggered layout preserves legacy half-diameter offset formula', () => {
  const r = computeBox({ d: 50, h: 20, x: 9, y: 5, z: null }, 'staggered');
  assert.equal(r.total, 45);
  assert.equal(r.length, 475);
  assert.ok(Math.abs(r.width - (50 + 4 * 50 * Math.sqrt(3) / 2)) < 1e-9);
  assert.equal(r.height, 20);
});

test('decimal comma is accepted', () => {
  assert.equal(normalizePositive('34,5'), 34.5);
});

test('invalid counts are rejected and large counts are clamped', () => {
  assert.equal(normalizeCount('0'), null);
  assert.equal(normalizeCount('10000'), 999);
});
