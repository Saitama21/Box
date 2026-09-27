import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCutCalc} from '../modules/cutcalc-core.mjs';

test('direct CutCalc mode preserves original formula',()=>{
  const r=calculateCutCalc({partLength:10,quantity:160,kerf:4,faceA:.5,faceB:0});
  assert.equal(r.valid,true);
  assert.equal(r.mode,'direct');
  assert.equal(r.cycleLength,14.5);
  assert.equal(r.purchaseLength,2320);
  assert.equal(r.processLoss,720);
});

test('bar mode respects 46 mm chuck grip',()=>{
  const r=calculateCutCalc({partLength:10,quantity:160,kerf:4,faceA:.5,faceB:0,stockLength:1000,stockFace:0,minChuckGrip:46});
  assert.equal(r.valid,true);
  assert.equal(r.partsPerBar,65);
  assert.equal(r.bars,3);
  assert.equal(r.purchaseLength,3000);
  assert.equal(r.fullBarGripTail,57.5);
  assert.equal(r.reusableRemainder,565);
});

test('reserve percent increases target quantity',()=>{
  const r=calculateCutCalc({partLength:10,quantity:100,kerf:2,reservePct:10});
  assert.equal(r.targetQuantity,111);
});

test('invalid input is rejected',()=>{
  const r=calculateCutCalc({partLength:0,quantity:0});
  assert.equal(r.valid,false);
  assert.equal(r.errors.length,2);
});
