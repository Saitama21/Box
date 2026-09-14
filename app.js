(() => {
  'use strict';

  const STORAGE_KEY = 'box-pwa-presets-v4';
  const THEME_KEY = 'box-pwa-theme-v4';
  const MAX_COUNT = 999;
  let installPrompt = null;
  let copyTimer = 0;

  const CRATES = [
    { id: 'hp280', name: 'HP280', length: 600, width: 400, height: 280 },
    { id: 'euro-600-400-120', name: '600×400×120', length: 600, width: 400, height: 120 },
    { id: 'euro-600-400-170', name: '600×400×170', length: 600, width: 400, height: 170 },
    { id: 'euro-600-400-220', name: '600×400×220', length: 600, width: 400, height: 220 },
    { id: 'euro-600-400-280', name: '600×400×280', length: 600, width: 400, height: 280 },
    { id: 'euro-600-400-320', name: '600×400×320', length: 600, width: 400, height: 320 },
    { id: 'euro-600-400-400', name: '600×400×400', length: 600, width: 400, height: 400 },
    { id: 'mid-500-400-220', name: '500×400×220', length: 500, width: 400, height: 220 },
    { id: 'mid-500-400-280', name: '500×400×280', length: 500, width: 400, height: 280 },
    { id: 'mid-500-300-170', name: '500×300×170', length: 500, width: 300, height: 170 },
    { id: 'mid-500-300-220', name: '500×300×220', length: 500, width: 300, height: 220 },
    { id: 'compact-400-300-120', name: '400×300×120', length: 400, width: 300, height: 120 },
    { id: 'compact-400-300-170', name: '400×300×170', length: 400, width: 300, height: 170 },
    { id: 'compact-400-300-220', name: '400×300×220', length: 400, width: 300, height: 220 },
    { id: 'compact-400-300-280', name: '400×300×280', length: 400, width: 300, height: 280 },
    { id: 'small-300-200-120', name: '300×200×120', length: 300, width: 200, height: 120 },
    { id: 'small-300-200-170', name: '300×200×170', length: 300, width: 200, height: 170 },
    { id: 'large-800-600-220', name: '800×600×220', length: 800, width: 600, height: 220 },
    { id: 'large-800-600-320', name: '800×600×320', length: 800, width: 600, height: 320 },
    { id: 'large-800-600-420', name: '800×600×420', length: 800, width: 600, height: 420 }
  ];

  const DEFAULTS = { crateId: 'hp280', boxLength: 600, boxWidth: 400, boxHeight: 280, partDiameter: 50, partHeight: 20, x: 9, y: 5, z: 4 };
  const DEFAULT_PRESETS = [
    { id: 'demo-a', diameter: 50, height: 20, x: 9, y: 5, z: 4 },
    { id: 'demo-b', diameter: 50, height: 30, x: 9, y: 5, z: 3 },
    { id: 'demo-c', diameter: 40, height: 20, x: 12, y: 8, z: 4 },
    { id: 'demo-d', diameter: 32, height: 25, x: 16, y: 10, z: 6 },
    { id: 'demo-e', diameter: 30, height: 20, x: 19, y: 13, z: 4 }
  ];

  const $ = id => document.getElementById(id);
  const els = {
    cratePreset: $('cratePreset'), boxLength: $('boxLength'), boxWidth: $('boxWidth'), boxHeight: $('boxHeight'),
    partDiameter: $('partDiameter'), partHeight: $('partHeight'), countX: $('countX'), countY: $('countY'), countZ: $('countZ'),
    resetButton: $('resetButton'), maxFitButton: $('maxFitButton'), copyButton: $('copyButton'), savePreset: $('savePreset'), quickPresets: $('quickPresets'),
    totalCount: $('totalCount'), resultFormula: $('resultFormula'), infoBoxName: $('infoBoxName'), infoBoxSize: $('infoBoxSize'), infoPartSize: $('infoPartSize'),
    infoLayout: $('infoLayout'), infoPerLayer: $('infoPerLayer'), infoLayers: $('infoLayers'), infoTotal: $('infoTotal'),
    gapLength: $('gapLength'), gapWidth: $('gapWidth'), gapHeight: $('gapHeight'), fitStatus: $('fitStatus'), statusText: $('statusText'),
    topProjection: $('topProjection'), sideProjection: $('sideProjection'), endProjection: $('endProjection'),
    topCaption: $('topCaption'), sideCaption: $('sideCaption'), endCaption: $('endCaption'),
    themeDark: $('themeDark'), themeLight: $('themeLight'), offlineState: $('offlineState'), installButton: $('installButton'),
    heroCrateName: $('heroCrateName'), heroCrateSize: $('heroCrateSize')
  };

  const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const intFmt = new Intl.NumberFormat('ru-RU');

  function num(value, fallback = 1) {
    const parsed = Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(5000, Math.round(parsed * 100) / 100);
  }

  function int(value, fallback = 1) {
    const parsed = Math.trunc(Number(value));
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(MAX_COUNT, parsed);
  }

  function getState() {
    return {
      crateId: els.cratePreset.value,
      boxLength: num(els.boxLength.value, DEFAULTS.boxLength),
      boxWidth: num(els.boxWidth.value, DEFAULTS.boxWidth),
      boxHeight: num(els.boxHeight.value, DEFAULTS.boxHeight),
      partDiameter: num(els.partDiameter.value, DEFAULTS.partDiameter),
      partHeight: num(els.partHeight.value, DEFAULTS.partHeight),
      x: int(els.countX.value, DEFAULTS.x), y: int(els.countY.value, DEFAULTS.y), z: int(els.countZ.value, DEFAULTS.z)
    };
  }

  function selectedCrate() { return CRATES.find(c => c.id === els.cratePreset.value) || null; }
  function crateName() { return selectedCrate()?.name || 'Свой размер'; }

  function initCrates() {
    const groups = [
      ['HP', CRATES.filter(c => c.id.startsWith('hp'))],
      ['600 × 400', CRATES.filter(c => c.length === 600 && c.width === 400 && !c.id.startsWith('hp'))],
      ['500 × 400', CRATES.filter(c => c.length === 500 && c.width === 400)],
      ['500 × 300', CRATES.filter(c => c.length === 500 && c.width === 300)],
      ['400 × 300', CRATES.filter(c => c.length === 400 && c.width === 300)],
      ['300 × 200', CRATES.filter(c => c.length === 300 && c.width === 200)],
      ['800 × 600', CRATES.filter(c => c.length === 800 && c.width === 600)]
    ];
    const fragment = document.createDocumentFragment();
    groups.forEach(([label, list]) => {
      if (!list.length) return;
      const group = document.createElement('optgroup');
      group.label = label;
      list.forEach(crate => {
        const option = document.createElement('option');
        option.value = crate.id;
        option.textContent = `${crate.name} — ${crate.length} × ${crate.width} × ${crate.height} мм`;
        group.append(option);
      });
      fragment.append(group);
    });
    const custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'Свой размер';
    fragment.append(custom);
    els.cratePreset.replaceChildren(fragment);
    els.cratePreset.value = DEFAULTS.crateId;
  }

  function applyState(s, includeCrate = true) {
    if (includeCrate && s.crateId) els.cratePreset.value = s.crateId;
    els.boxLength.value = s.boxLength; els.boxWidth.value = s.boxWidth; els.boxHeight.value = s.boxHeight;
    els.partDiameter.value = s.partDiameter; els.partHeight.value = s.partHeight;
    els.countX.value = s.x; els.countY.value = s.y; els.countZ.value = s.z;
  }

  function matchCrateFromDimensions() {
    const l = num(els.boxLength.value), w = num(els.boxWidth.value), h = num(els.boxHeight.value);
    const match = CRATES.find(c => c.length === l && c.width === w && c.height === h);
    els.cratePreset.value = match ? match.id : 'custom';
  }

  function onCrateChange() {
    const crate = selectedCrate();
    if (crate) {
      els.boxLength.value = crate.length;
      els.boxWidth.value = crate.width;
      els.boxHeight.value = crate.height;
    }
    update();
  }

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    return node;
  }

  function defsFor(svg, prefix) {
    const defs = svgEl('defs');
    const green = svgEl('linearGradient', { id: `${prefix}-green`, x1: '0', y1: '0', x2: '0', y2: '1' });
    green.append(svgEl('stop', { offset: '0%', 'stop-color': '#32c982', 'stop-opacity': '.72' }), svgEl('stop', { offset: '52%', 'stop-color': '#13925c', 'stop-opacity': '.62' }), svgEl('stop', { offset: '100%', 'stop-color': '#06623f', 'stop-opacity': '.82' }));
    const greenDark = svgEl('linearGradient', { id: `${prefix}-greenDark`, x1: '0', y1: '0', x2: '1', y2: '0' });
    greenDark.append(svgEl('stop', { offset: '0%', 'stop-color': '#07593c' }), svgEl('stop', { offset: '50%', 'stop-color': '#169463' }), svgEl('stop', { offset: '100%', 'stop-color': '#064f36' }));
    const metal = svgEl('linearGradient', { id: `${prefix}-metal`, x1: '0', y1: '0', x2: '1', y2: '0' });
    metal.append(svgEl('stop', { offset: '0%', 'stop-color': '#88939e' }), svgEl('stop', { offset: '19%', 'stop-color': '#eef2f5' }), svgEl('stop', { offset: '51%', 'stop-color': '#c5ced6' }), svgEl('stop', { offset: '82%', 'stop-color': '#f4f6f8' }), svgEl('stop', { offset: '100%', 'stop-color': '#87929d' }));
    const metalTop = svgEl('radialGradient', { id: `${prefix}-metalTop`, cx: '38%', cy: '28%', r: '72%' });
    metalTop.append(svgEl('stop', { offset: '0%', 'stop-color': '#f7fafc' }), svgEl('stop', { offset: '48%', 'stop-color': '#d8e0e7' }), svgEl('stop', { offset: '100%', 'stop-color': '#9aa6b2' }));
    const shadow = svgEl('filter', { id: `${prefix}-shadow`, x: '-30%', y: '-40%', width: '160%', height: '200%' });
    shadow.append(svgEl('feDropShadow', { dx: '0', dy: '8', stdDeviation: '7', 'flood-color': '#183326', 'flood-opacity': '.18' }));
    const arrowStart = svgEl('marker', { id: `${prefix}-arrowStart`, markerWidth: '8', markerHeight: '8', refX: '6', refY: '4', orient: 'auto' });
    arrowStart.append(svgEl('path', { d: 'M8 1 L2 4 L8 7', fill: 'none', stroke: '#163f78', 'stroke-width': '1.6' }));
    const arrowEnd = svgEl('marker', { id: `${prefix}-arrowEnd`, markerWidth: '8', markerHeight: '8', refX: '2', refY: '4', orient: 'auto' });
    arrowEnd.append(svgEl('path', { d: 'M0 1 L6 4 L0 7', fill: 'none', stroke: '#163f78', 'stroke-width': '1.6' }));
    defs.append(green, greenDark, metal, metalTop, shadow, arrowStart, arrowEnd);
    svg.append(defs);
    return defs;
  }

  function addDimension(svg, prefix, { x1, y1, x2, y2, label, vertical = false }) {
    const line = svgEl('line', { x1, y1, x2, y2, stroke: '#163f78', 'stroke-width': 1.8, 'marker-start': `url(#${prefix}-arrowStart)`, 'marker-end': `url(#${prefix}-arrowEnd)` });
    svg.append(line);
    if (vertical) {
      svg.append(svgEl('line', { x1: x1 - 9, y1, x2: x1 + 9, y2: y1, stroke: '#163f78', 'stroke-width': 1.4 }), svgEl('line', { x1: x2 - 9, y1: y2, x2: x2 + 9, y2, stroke: '#163f78', 'stroke-width': 1.4 }));
      const tx = x1 - 18, ty = (y1 + y2) / 2;
      const text = svgEl('text', { x: tx, y: ty, class: 'dim-text', 'text-anchor': 'middle', transform: `rotate(-90 ${tx} ${ty})` }, label);
      svg.append(text);
    } else {
      svg.append(svgEl('line', { x1, y1: y1 - 9, x2: x1, y2: y1 + 9, stroke: '#163f78', 'stroke-width': 1.4 }), svgEl('line', { x1: x2, y1: y2 - 9, x2, y2: y2 + 9, stroke: '#163f78', 'stroke-width': 1.4 }));
      svg.append(svgEl('text', { x: (x1 + x2) / 2, y: y1 - 10, class: 'dim-text', 'text-anchor': 'middle' }, label));
    }
  }

  function fitRect(realW, realH, maxW, maxH) {
    const scale = Math.min(maxW / realW, maxH / realH);
    return { scale, w: realW * scale, h: realH * scale };
  }

  function addTopCrate(svg, prefix, box) {
    const outer = { x: box.x - 19, y: box.y - 19, w: box.w + 38, h: box.h + 38 };
    const group = svgEl('g', { filter: `url(#${prefix}-shadow)` });
    group.append(svgEl('rect', { x: outer.x, y: outer.y, width: outer.w, height: outer.h, rx: 18, fill: `url(#${prefix}-green)`, stroke: '#086443', 'stroke-width': 4 }));
    group.append(svgEl('rect', { x: outer.x + 7, y: outer.y + 7, width: outer.w - 14, height: outer.h - 14, rx: 14, fill: 'none', stroke: '#85e4b1', 'stroke-opacity': '.52', 'stroke-width': 2 }));
    group.append(svgEl('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 11, fill: '#d7f2e3', 'fill-opacity': '.18', stroke: '#0d7049', 'stroke-width': 3 }));
    const ribCountX = Math.max(5, Math.min(10, Math.round(box.w / 72)));
    const ribCountY = Math.max(4, Math.min(8, Math.round(box.h / 65)));
    for (let i = 1; i < ribCountX; i++) {
      const x = outer.x + (outer.w / ribCountX) * i;
      group.append(svgEl('rect', { x: x - 3.5, y: outer.y + 5, width: 7, height: 15, rx: 2, fill: '#096a45', 'fill-opacity': '.72' }));
      group.append(svgEl('rect', { x: x - 3.5, y: outer.y + outer.h - 20, width: 7, height: 15, rx: 2, fill: '#096a45', 'fill-opacity': '.72' }));
    }
    for (let i = 1; i < ribCountY; i++) {
      const y = outer.y + (outer.h / ribCountY) * i;
      group.append(svgEl('rect', { x: outer.x + 5, y: y - 3.5, width: 15, height: 7, rx: 2, fill: '#096a45', 'fill-opacity': '.72' }));
      group.append(svgEl('rect', { x: outer.x + outer.w - 20, y: y - 3.5, width: 15, height: 7, rx: 2, fill: '#096a45', 'fill-opacity': '.72' }));
    }
    const handleW = Math.min(86, box.w * .22);
    [outer.y + 4, outer.y + outer.h - 18].forEach(y => {
      group.append(svgEl('rect', { x: outer.x + outer.w / 2 - handleW / 2, y, width: handleW, height: 14, rx: 6, fill: '#e8fff2', 'fill-opacity': '.72', stroke: '#0a7048', 'stroke-width': 2 }));
    });
    const handleH = Math.min(72, box.h * .28);
    [outer.x + 4, outer.x + outer.w - 18].forEach(x => {
      group.append(svgEl('rect', { x, y: outer.y + outer.h / 2 - handleH / 2, width: 14, height: handleH, rx: 6, fill: '#e8fff2', 'fill-opacity': '.72', stroke: '#0a7048', 'stroke-width': 2 }));
    });
    group.append(svgEl('path', { d: `M${outer.x + 8} ${outer.y + 13} H${outer.x + outer.w - 8}`, stroke: '#b5f1cf', 'stroke-width': 2.5, 'stroke-opacity': '.7' }));
    svg.append(group);
    return outer;
  }

  function addTopParts(svg, defs, prefix, s, box, scale, overflow) {
    const d = Math.max(.25, s.partDiameter * scale);
    const patternId = `${prefix}-partPattern`;
    const pattern = svgEl('pattern', { id: patternId, patternUnits: 'userSpaceOnUse', width: d, height: d });
    const r = Math.max(.15, d / 2 - Math.min(1.2, d * .03));
    pattern.append(svgEl('circle', { cx: d / 2, cy: d / 2, r, fill: `url(#${prefix}-metalTop)`, stroke: '#7f8c99', 'stroke-width': Math.max(.25, Math.min(1.1, d * .03)) }));
    if (d >= 7) pattern.append(svgEl('ellipse', { cx: d * .38, cy: d * .34, rx: d * .14, ry: d * .10, fill: '#fff', 'fill-opacity': '.42' }));
    defs.append(pattern);
    const w = s.x * d, h = s.y * d;
    const x = box.x + (box.w - w) / 2, y = box.y + (box.h - h) / 2;
    const parts = svgEl('rect', { x, y, width: w, height: h, fill: `url(#${patternId})`, stroke: overflow ? '#d54a4a' : '#6d7e8d', 'stroke-opacity': overflow ? '.95' : '.25', 'stroke-width': overflow ? 2 : .8 });
    svg.append(parts);
  }

  function drawTop(s, fits) {
    const svg = svgEl('svg', { viewBox: '0 0 820 470', preserveAspectRatio: 'xMidYMid meet' });
    const prefix = 'top';
    const defs = defsFor(svg, prefix);
    const fitted = fitRect(s.boxLength, s.boxWidth, 625, 300);
    const box = { x: 112 + (625 - fitted.w) / 2, y: 102 + (300 - fitted.h) / 2, w: fitted.w, h: fitted.h };
    addTopCrate(svg, prefix, box);
    addTopParts(svg, defs, prefix, s, box, fitted.scale, !fits);
    addDimension(svg, prefix, { x1: box.x, y1: 56, x2: box.x + box.w, y2: 56, label: `${fmt.format(s.boxLength)} мм` });
    addDimension(svg, prefix, { x1: 68, y1: box.y, x2: 68, y2: box.y + box.h, label: `${fmt.format(s.boxWidth)} мм`, vertical: true });
    svg.append(svgEl('text', { x: 410, y: 446, class: 'note-text', 'text-anchor': 'middle' }, `Фактический шаг детали: Ø${fmt.format(s.partDiameter)} мм · ${s.x} × ${s.y} шт`));
    els.topProjection.replaceChildren(svg);
    els.topProjection.setAttribute('aria-label', `Вид сверху: ящик ${fmt.format(s.boxLength)} на ${fmt.format(s.boxWidth)} миллиметров, ${s.x} на ${s.y} деталей диаметром ${fmt.format(s.partDiameter)} миллиметров`);
  }

  function addSideCrate(svg, prefix, box, endView) {
    const outer = { x: box.x - 17, y: box.y - 12, w: box.w + 34, h: box.h + 26 };
    const group = svgEl('g', { filter: `url(#${prefix}-shadow)` });
    group.append(svgEl('rect', { x: outer.x, y: outer.y, width: outer.w, height: outer.h, rx: 9, fill: `url(#${prefix}-green)`, stroke: '#075c3d', 'stroke-width': 4 }));
    group.append(svgEl('rect', { x: outer.x - 4, y: outer.y - 4, width: outer.w + 8, height: 16, rx: 5, fill: `url(#${prefix}-greenDark)`, stroke: '#064b34', 'stroke-width': 2 }));
    group.append(svgEl('rect', { x: outer.x - 2, y: outer.y + outer.h - 15, width: outer.w + 4, height: 17, rx: 4, fill: `url(#${prefix}-greenDark)`, stroke: '#064b34', 'stroke-width': 2 }));
    group.append(svgEl('rect', { x: box.x, y: box.y, width: box.w, height: box.h, fill: '#d9f5e6', 'fill-opacity': '.13', stroke: '#0b7149', 'stroke-width': 2 }));
    const ribs = Math.max(4, Math.min(11, Math.round(box.w / 58)));
    for (let i = 0; i <= ribs; i++) {
      const x = outer.x + (outer.w / ribs) * i;
      group.append(svgEl('path', { d: `M${x} ${outer.y + 8} L${x + (i % 2 ? -3 : 3)} ${outer.y + outer.h - 10}`, stroke: '#086844', 'stroke-width': Math.max(2.2, Math.min(5, box.w / 110)), 'stroke-opacity': '.67' }));
    }
    group.append(svgEl('path', { d: `M${outer.x + 5} ${outer.y + 24} H${outer.x + outer.w - 5} M${outer.x + 5} ${outer.y + outer.h - 30} H${outer.x + outer.w - 5}`, stroke: '#78dba8', 'stroke-width': 2, 'stroke-opacity': '.45' }));
    const footW = Math.min(30, outer.w * .12);
    group.append(svgEl('rect', { x: outer.x + 8, y: outer.y + outer.h - 2, width: footW, height: 8, rx: 2, fill: '#064c34' }), svgEl('rect', { x: outer.x + outer.w - footW - 8, y: outer.y + outer.h - 2, width: footW, height: 8, rx: 2, fill: '#064c34' }));
    if (endView && box.w > 100) {
      const hw = Math.min(90, box.w * .38);
      group.append(svgEl('rect', { x: outer.x + outer.w / 2 - hw / 2, y: outer.y + 18, width: hw, height: 22, rx: 9, fill: '#e8fff2', 'fill-opacity': '.78', stroke: '#086a45', 'stroke-width': 3 }));
    }
    svg.append(group);
  }

  function addSideParts(svg, defs, prefix, s, box, scale, horizontalCount, endView, overflow) {
    const cellW = Math.max(.25, s.partDiameter * scale);
    const cellH = Math.max(.25, s.partHeight * scale);
    const patternId = `${prefix}-cylPattern`;
    const pattern = svgEl('pattern', { id: patternId, patternUnits: 'userSpaceOnUse', width: cellW, height: cellH });
    const rx = Math.max(.2, Math.min(cellW * .15, 5));
    pattern.append(svgEl('rect', { x: .35, y: Math.min(cellH * .12, 2.2), width: Math.max(.1, cellW - .7), height: Math.max(.1, cellH - Math.min(cellH * .12, 2.2) - .35), rx, fill: `url(#${prefix}-metal)`, stroke: '#798592', 'stroke-width': Math.max(.2, Math.min(.8, cellW * .02)) }));
    if (cellW >= 3 && cellH >= 2.5) {
      pattern.append(svgEl('ellipse', { cx: cellW / 2, cy: Math.max(.7, Math.min(cellH * .16, 2.5)), rx: Math.max(.4, cellW * .48 - .5), ry: Math.max(.35, Math.min(cellH * .14, 3.5)), fill: `url(#${prefix}-metalTop)`, stroke: '#89939e', 'stroke-width': .45 }));
    }
    defs.append(pattern);
    const w = horizontalCount * cellW, h = s.z * cellH;
    const x = box.x + (box.w - w) / 2, y = box.y + box.h - h;
    svg.append(svgEl('rect', { x, y, width: w, height: h, fill: `url(#${patternId})`, stroke: overflow ? '#d54a4a' : '#7c8894', 'stroke-opacity': overflow ? '.95' : '.2', 'stroke-width': overflow ? 2 : .7 }));
  }

  function drawSideProjection(s, fits, { realW, horizontalCount, target, prefix, endView }) {
    const svg = svgEl('svg', { viewBox: '0 0 620 330', preserveAspectRatio: 'xMidYMid meet' });
    const defs = defsFor(svg, prefix);
    const fitted = fitRect(realW, s.boxHeight, 455, 200);
    const box = { x: 105 + (455 - fitted.w) / 2, y: 88 + (200 - fitted.h), w: fitted.w, h: fitted.h };
    addSideParts(svg, defs, prefix, s, box, fitted.scale, horizontalCount, endView, !fits);
    addSideCrate(svg, prefix, box, endView);
    addDimension(svg, prefix, { x1: box.x, y1: 48, x2: box.x + box.w, y2: 48, label: `${fmt.format(realW)} мм` });
    addDimension(svg, prefix, { x1: 62, y1: box.y, x2: 62, y2: box.y + box.h, label: `${fmt.format(s.boxHeight)} мм`, vertical: true });
    svg.append(svgEl('text', { x: 310, y: 318, class: 'note-text', 'text-anchor': 'middle' }, `${horizontalCount} по горизонтали · ${s.z} по высоте`));
    target.replaceChildren(svg);
  }

  function gaps(s) {
    return {
      length: Math.round((s.boxLength - s.x * s.partDiameter) * 100) / 100,
      width: Math.round((s.boxWidth - s.y * s.partDiameter) * 100) / 100,
      height: Math.round((s.boxHeight - s.z * s.partHeight) * 100) / 100
    };
  }

  function isFit(g) { return g.length >= 0 && g.width >= 0 && g.height >= 0; }
  function gapText(value) { return `${value < 0 ? '−' : ''}${fmt.format(Math.abs(value))} мм`; }
  function rowsWord(n) { const n10 = n % 10, n100 = n % 100; if (n10 === 1 && n100 !== 11) return 'ряд'; if ([2,3,4].includes(n10) && ![12,13,14].includes(n100)) return 'ряда'; return 'рядов'; }

  function updateStatus(g, fits) {
    els.fitStatus.classList.toggle('is-fit', fits);
    els.fitStatus.classList.toggle('is-overflow', !fits);
    els.fitStatus.querySelector('.status-icon').textContent = fits ? '✓' : '!';
    els.statusText.textContent = fits ? 'Детали помещаются' : 'Укладка не помещается';
    els.gapLength.textContent = gapText(g.length); els.gapWidth.textContent = gapText(g.width); els.gapHeight.textContent = gapText(g.height);
  }

  function summaryText(s) {
    return `${crateName()} — ${fmt.format(s.boxLength)}×${fmt.format(s.boxWidth)}×${fmt.format(s.boxHeight)} мм | Деталь Ø${fmt.format(s.partDiameter)}×${fmt.format(s.partHeight)} мм | Укладка ${s.x}×${s.y}×${s.z} | Всего ${intFmt.format(s.x * s.y * s.z)} шт`;
  }

  function update() {
    const s = getState();
    const perLayer = s.x * s.y;
    const total = perLayer * s.z;
    const g = gaps(s);
    const fits = isFit(g);

    els.totalCount.textContent = intFmt.format(total);
    els.resultFormula.textContent = `${s.x} × ${s.y} × ${s.z}`;
    els.infoBoxName.textContent = crateName();
    els.infoBoxSize.textContent = `${fmt.format(s.boxLength)} × ${fmt.format(s.boxWidth)} × ${fmt.format(s.boxHeight)} мм`;
    els.infoPartSize.textContent = `Ø${fmt.format(s.partDiameter)} × ${fmt.format(s.partHeight)} мм`;
    els.infoLayout.textContent = `${s.x} × ${s.y} × ${s.z}`;
    els.infoPerLayer.textContent = `${intFmt.format(perLayer)} шт`;
    els.infoLayers.textContent = `${s.z}`;
    els.infoTotal.textContent = `${intFmt.format(total)} шт`;
    els.topCaption.textContent = `${s.x} шт в длину × ${s.y} шт в ширину (${intFmt.format(perLayer)} шт в слое)`;
    els.sideCaption.textContent = `${s.x} шт в длину × ${s.z} ${rowsWord(s.z)} в высоту`;
    els.endCaption.textContent = `${s.y} шт в ширину × ${s.z} ${rowsWord(s.z)} в высоту`;
    els.heroCrateName.textContent = `Ящик ${crateName()}`;
    els.heroCrateSize.textContent = `${fmt.format(s.boxLength)} × ${fmt.format(s.boxWidth)} × ${fmt.format(s.boxHeight)} мм`;

    updateStatus(g, fits);
    drawTop(s, fits);
    drawSideProjection(s, fits, { realW: s.boxLength, horizontalCount: s.x, target: els.sideProjection, prefix: 'side', endView: false });
    drawSideProjection(s, fits, { realW: s.boxWidth, horizontalCount: s.y, target: els.endProjection, prefix: 'end', endView: true });
    renderPresets(s);
  }

  function maxFit() {
    const s = getState();
    els.countX.value = Math.max(1, Math.min(MAX_COUNT, Math.floor(s.boxLength / s.partDiameter)));
    els.countY.value = Math.max(1, Math.min(MAX_COUNT, Math.floor(s.boxWidth / s.partDiameter)));
    els.countZ.value = Math.max(1, Math.min(MAX_COUNT, Math.floor(s.boxHeight / s.partHeight)));
    update();
  }

  async function copySummary() {
    const text = summaryText(getState());
    let copied = false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) { copied = false; }
    if (!copied) {
      const area = document.createElement('textarea');
      area.value = text; area.setAttribute('readonly', '');
      area.style.position = 'fixed'; area.style.opacity = '0'; area.style.pointerEvents = 'none';
      document.body.append(area); area.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      area.remove();
    }
    const label = els.copyButton.querySelector('b');
    clearTimeout(copyTimer);
    if (copied) {
      label.textContent = 'Скопировано ✓'; els.copyButton.classList.add('is-copied');
      copyTimer = window.setTimeout(() => { label.textContent = 'Скопировать'; els.copyButton.classList.remove('is-copied'); }, 1800);
    } else {
      label.textContent = 'Не удалось скопировать';
      copyTimer = window.setTimeout(() => { label.textContent = 'Скопировать'; }, 1800);
    }
  }

  function loadPresets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed.filter(p => p && Number.isFinite(Number(p.diameter))).slice(0, 16);
    } catch (_) {}
    return DEFAULT_PRESETS.slice();
  }

  function savePresets(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 16))); } catch (_) {}
  }

  function renderPresets(current) {
    const list = loadPresets();
    const frag = document.createDocumentFragment();
    list.forEach((p, index) => {
      const card = document.createElement('div');
      card.className = 'quick-card'; card.dataset.index = String(index);
      const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'quick-apply'; apply.dataset.index = String(index);
      const same = Number(p.diameter) === current.partDiameter && Number(p.height) === current.partHeight && Number(p.x) === current.x && Number(p.y) === current.y && Number(p.z) === current.z;
      if (same) card.classList.add('is-current');
      const title = document.createElement('strong'); title.textContent = `${fmt.format(Number(p.diameter))} × ${fmt.format(Number(p.height))}`;
      const layout = document.createElement('span'); layout.textContent = `${p.x} × ${p.y} × ${p.z}`;
      const total = document.createElement('b'); total.textContent = `${intFmt.format(Number(p.x) * Number(p.y) * Number(p.z))} шт`;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quick-remove'; remove.dataset.removeIndex = String(index); remove.setAttribute('aria-label', 'Удалить вариант'); remove.textContent = '×';
      apply.append(title, layout, total); card.append(apply, remove); frag.append(card);
    });
    els.quickPresets.replaceChildren(frag);
  }

  function saveCurrentPreset() {
    const s = getState();
    const list = loadPresets();
    const exists = list.some(p => Number(p.diameter) === s.partDiameter && Number(p.height) === s.partHeight && Number(p.x) === s.x && Number(p.y) === s.y && Number(p.z) === s.z);
    if (!exists) list.push({ id: `p-${Date.now()}`, diameter: s.partDiameter, height: s.partHeight, x: s.x, y: s.y, z: s.z });
    savePresets(list);
    renderPresets(s);
  }

  function activatePreset(index) {
    const p = loadPresets()[index];
    if (!p) return;
    els.partDiameter.value = p.diameter; els.partHeight.value = p.height; els.countX.value = p.x; els.countY.value = p.y; els.countZ.value = p.z;
    update();
  }

  function removePreset(index) {
    const list = loadPresets(); list.splice(index, 1); savePresets(list); renderPresets(getState());
  }

  function setTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    els.themeDark.classList.toggle('is-active', dark); els.themeLight.classList.toggle('is-active', !dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101821' : '#edf3f8');
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (_) {}
  }

  function initTheme() {
    let saved = 'light';
    try { saved = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (_) {}
    setTheme(saved);
  }

  function reset() {
    applyState(DEFAULTS);
    els.cratePreset.value = DEFAULTS.crateId;
    update();
  }

  function normalizeInputs() {
    const s = getState();
    els.boxLength.value = s.boxLength; els.boxWidth.value = s.boxWidth; els.boxHeight.value = s.boxHeight;
    els.partDiameter.value = s.partDiameter; els.partHeight.value = s.partHeight;
    els.countX.value = s.x; els.countY.value = s.y; els.countZ.value = s.z;
    update();
  }

  function bindEvents() {
    els.cratePreset.addEventListener('change', onCrateChange);
    [els.boxLength, els.boxWidth, els.boxHeight].forEach(input => {
      input.addEventListener('input', () => { matchCrateFromDimensions(); update(); });
      input.addEventListener('change', normalizeInputs);
    });
    [els.partDiameter, els.partHeight, els.countX, els.countY, els.countZ].forEach(input => {
      input.addEventListener('input', update); input.addEventListener('change', normalizeInputs);
    });
    document.querySelectorAll('[data-step-target]').forEach(button => {
      button.addEventListener('click', () => {
        const input = $(button.dataset.stepTarget); if (!input) return;
        input.value = Math.max(1, Math.min(MAX_COUNT, int(input.value) + Number(button.dataset.step || 0)));
        update();
      });
    });
    els.resetButton.addEventListener('click', reset);
    els.maxFitButton.addEventListener('click', maxFit);
    els.copyButton.addEventListener('click', copySummary);
    els.savePreset.addEventListener('click', saveCurrentPreset);
    els.quickPresets.addEventListener('click', event => {
      const remove = event.target.closest('[data-remove-index]');
      if (remove) { event.stopPropagation(); removePreset(Number(remove.dataset.removeIndex)); return; }
      const apply = event.target.closest('.quick-apply'); if (apply) activatePreset(Number(apply.dataset.index));
    });
    els.themeDark.addEventListener('click', () => setTheme('dark'));
    els.themeLight.addEventListener('click', () => setTheme('light'));
    window.addEventListener('online', updateOnlineState); window.addEventListener('offline', updateOnlineState);
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; els.installButton.classList.remove('is-hidden'); });
    window.addEventListener('appinstalled', () => { installPrompt = null; els.installButton.classList.add('is-hidden'); });
    els.installButton.addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch (_) {}
      installPrompt = null; els.installButton.classList.add('is-hidden');
    });
  }

  function updateOnlineState() {
    els.offlineState.textContent = navigator.onLine ? 'Готов к офлайн-работе' : 'Офлайн-режим';
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), { once: true });
  }

  initCrates();
  initTheme();
  bindEvents();
  updateOnlineState();
  update();
  registerServiceWorker();
})();
