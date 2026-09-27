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
  assert.match(index,/data-view="copilot"/);
  assert.match(index,/data-view="codes"/);
  assert.match(index,/modules\/box\.js/);
  assert.match(index,/modules\/modes\.js/);
  assert.match(index,/modules\/cutcalc\.js/);
  assert.match(index,/modules\/geometry\.js/);
  assert.match(index,/modules\/copilot\.js/);
  assert.match(index,/modules\/codes\.js/);
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
  for(const path of ['./modules/box.css','./modules/box.js','./modules/box-core.mjs','./modules/modes.css','./modules/modes.js','./modules/modes-data.mjs','./modules/cutcalc.css','./modules/cutcalc.js','./modules/cutcalc-core.mjs','./modules/geometry.css','./modules/geometry.js','./modules/geometry-core.mjs','./modules/copilot.css','./modules/copilot.js','./modules/copilot-core.mjs','./modules/copilot-materials.mjs','./modules/copilot-data.js','./modules/codes.css','./modules/codes.js','./modules/codes-data.mjs','./modules/profile.css','./modules/profile.js','./modules/module-registry.mjs','./modules/machine-store.mjs','./modules/tools.css','./modules/tools.js','./modules/projects.css','./modules/projects.js','./modules/workspace-store.mjs','./modules/workflow.css','./modules/workflow.js']){
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


test('shared machine profile is wired to unified shell',()=>{
  assert.match(index,/id="profileSave"/);
  assert.match(index,/id="homeMachineName"/);
  assert.match(index,/modules\/profile\.js/);
});


test('Projects hub is wired and offline-ready',()=>{
  assert.match(index,/modules\/projects\.css/);
  assert.match(index,/modules\/projects\.js/);
  assert.match(index,/id="projectsList"/);
  assert.match(index,/id="projectsExport"/);
  assert.ok(sw.includes('./modules/projects.css'));
  assert.ok(sw.includes('./modules/projects.js'));
});

test('shell uses central module registry and shared machine store',()=>{
  const app=fs.readFileSync('app.js','utf8');
  const profile=fs.readFileSync('modules/profile.js','utf8');
  const copilot=fs.readFileSync('modules/copilot.js','utf8');
  assert.match(app,/module-registry\.mjs/);
  assert.doesNotMatch(app,/key === 'box'.*key === 'modes'/s);
  assert.match(profile,/machine-store\.mjs/);
  assert.match(copilot,/machine-store\.mjs/);
  assert.doesNotMatch(profile,/localStorage\.getItem\(['"]cncFullMachineV1/);
  assert.doesNotMatch(copilot,/localStorage\.getItem\(['"]cncFullMachineV1/);
});


test('unified workflow is wired into shell and offline cache',()=>{
  assert.match(index,/data-view="workflow"/);
  assert.match(index,/id="workflowTitle"/);
  assert.match(index,/id="homeWorkflowRing"/);
  assert.match(index,/modules\/workflow\.css/);
  assert.match(index,/modules\/workflow\.js/);
  for(const path of ['./modules/workspace-store.mjs','./modules/workflow.css','./modules/workflow.js']){
    assert.ok(sw.includes(path),`Missing workflow offline cache entry: ${path}`);
  }
});

test('production modules publish results into active workspace',()=>{
  const geometry=fs.readFileSync('modules/geometry.js','utf8');
  const cutcalc=fs.readFileSync('modules/cutcalc.js','utf8');
  const box=fs.readFileSync('modules/box.js','utf8');
  const modes=fs.readFileSync('modules/modes.js','utf8');
  const tools=fs.readFileSync('modules/tools.js','utf8');
  const copilot=fs.readFileSync('modules/copilot.js','utf8');

  assert.match(geometry,/workspace-store\.mjs/);
  assert.match(cutcalc,/workspace-store\.mjs/);
  assert.match(box,/workspace-store\.mjs/);
  assert.match(modes,/workspace-store\.mjs/);
  assert.match(tools,/workspace-store\.mjs/);
  assert.match(copilot,/workspace-store\.mjs/);
});


test('Copilot does not overwrite workspace during boot',()=>{
  const copilot=fs.readFileSync('modules/copilot.js','utf8');
  assert.match(copilot,/workspaceSyncReady:false/);
  assert.match(copilot,/if\(state\.workspaceSyncReady\)syncWorkspaceRoute\(\)/);
  assert.match(copilot,/state\.workspaceSyncReady=true/);
});


test('service worker prevents mixed shell versions in Safari',()=>{
  assert.match(sw,/const VERSION = '1\.0\.2'/);
  assert.match(sw,/async function freshFirst/);
  assert.match(sw,/cache:\s*'reload'/);
  assert.match(sw,/request\.destination === 'script'/);
  assert.match(sw,/request\.destination === 'style'/);
  assert.match(index,/serviceWorker\.addEventListener\('controllerchange'/);
  assert.match(index,/location\.reload\(\)/);
});

test('production modules never fall back to placeholder view',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.doesNotMatch(app,/setActiveView\('module'\)/);
  assert.match(app,/CNC module view is missing/);
});
