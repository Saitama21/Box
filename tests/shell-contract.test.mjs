import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const styles = fs.readFileSync('styles.css','utf8');
const index = fs.readFileSync('index.html','utf8');
const sw = fs.readFileSync('sw.js','utf8');

function cssBlock(selector){
  const start=styles.indexOf(selector+'{');
  assert.notEqual(start,-1,`Missing CSS block: ${selector}`);
  const open=styles.indexOf('{',start);
  let depth=0;
  for(let i=open;i<styles.length;i++){
    if(styles[i]==='{')depth++;
    if(styles[i]==='}'){
      depth--;
      if(depth===0)return styles.slice(open+1,i);
    }
  }
  throw new Error('Unclosed CSS block '+selector);
}

test('bottom dock keeps CutCalc viewport contract',()=>{
  const dock=cssBlock('.dock');
  assert.match(dock,/position\s*:\s*fixed/);
  assert.match(dock,/left\s*:\s*50%/);
  assert.match(dock,/transform\s*:\s*translateX\(-50%\)/);
  assert.match(dock,/bottom\s*:\s*2px/);
  assert.match(dock,/width\s*:\s*87%/);
  assert.match(dock,/height\s*:\s*68px/);
  assert.doesNotMatch(dock,/safe-area-inset-bottom|visualViewport|innerHeight|100dvh/);
});

test('app shell reserves safe-area only as content space',()=>{
  const shell=cssBlock('.app-shell');
  assert.match(shell,/min-height\s*:\s*100dvh/);
  assert.match(shell,/safe-bottom/);
});

test('native Box and Modes modules are wired into root shell',()=>{
  assert.match(index,/data-view="box"/);
  assert.match(index,/data-view="modes"/);
  assert.match(index,/data-view="cutcalc"/);
  assert.match(index,/data-view="geometry"/);
  assert.match(index,/modules\/box\.js/);
  assert.match(index,/modules\/modes\.js/);
  assert.match(index,/modules\/cutcalc\.js/);
  assert.match(index,/modules\/geometry\.js/);
});

test('approved material cards are real WebP files and cached offline',()=>{
  for(const name of ['card-aisi304.webp','card-steel.webp','card-polyamide.webp','card-brass.webp']){
    const path='assets/modes/'+name;
    const data=fs.readFileSync(path);
    assert.equal(data.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
    assert.ok(sw.includes('./'+path),`Service worker does not cache ${path}`);
  }
});

test('critical native modules are part of offline app shell',()=>{
  for(const path of ['./modules/box.css','./modules/box.js','./modules/box-core.mjs','./modules/modes.css','./modules/modes.js','./modules/cutcalc.css','./modules/cutcalc.js','./modules/cutcalc-core.mjs','./modules/geometry.css','./modules/geometry.js','./modules/geometry-core.mjs']){
    assert.ok(sw.includes(path),`Missing offline cache entry: ${path}`);
  }
});


test('CutCalc approved WebP graphics are real files and cached offline',()=>{
  for(const name of ['result-rod.webp','rod-brass.webp','rod-steel.webp']){
    const path='assets/cutcalc/'+name;
    const data=fs.readFileSync(path);
    assert.equal(data.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
    assert.ok(sw.includes('./'+path),`Service worker does not cache ${path}`);
  }
});
