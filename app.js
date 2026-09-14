(() => {
  'use strict';

  const THEME_KEY = 'box-pwa-theme-v6';
  const MAX_COUNT = 999;
  let installPrompt = null;
  let copyTimer = 0;

  const $ = id => document.getElementById(id);
  const els = {
    partDiameter: $('partDiameter'), partHeight: $('partHeight'), countX: $('countX'), countY: $('countY'), countZ: $('countZ'),
    calculateButton: $('calculateButton'), newButton: $('newButton'), copyButton: $('copyButton'),
    totalCount: $('totalCount'), miniTotal: $('miniTotal'), miniFormula: $('miniFormula'),
    resultPart: $('resultPart'), resultLayout: $('resultLayout'), resultBlock: $('resultBlock'),
    topSize: $('topSize'), sideSize: $('sideSize'), endSize: $('endSize'), previewLabel: $('previewLabel'),
    topProjection: $('topProjection'), sideProjection: $('sideProjection'), endProjection: $('endProjection'), isoProjection: $('isoProjection'),
    themeLight: $('themeLight'), themeDark: $('themeDark'), offlineState: $('offlineState'), installButton: $('installButton')
  };

  const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const intFmt = new Intl.NumberFormat('ru-RU');

  function positive(value, max = 3000) {
    const raw = String(value ?? '').trim().replace(',', '.');
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(max, Math.round(n * 100) / 100);
  }

  function count(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.min(MAX_COUNT, n);
  }

  function state() {
    return {
      d: positive(els.partDiameter.value),
      h: positive(els.partHeight.value),
      x: count(els.countX.value),
      y: count(els.countY.value),
      z: count(els.countZ.value)
    };
  }

  function complete(s) { return s.d !== null && s.h !== null && s.x !== null && s.y !== null && s.z !== null; }

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
    if (text) node.textContent = text;
    return node;
  }

  function addStops(gradient, stops) {
    stops.forEach(([offset, color, opacity]) => {
      const attrs = { offset, 'stop-color': color };
      if (opacity !== undefined) attrs['stop-opacity'] = opacity;
      gradient.append(svgEl('stop', attrs));
    });
    return gradient;
  }

  function defs(svg, prefix) {
    const d = svgEl('defs');

    const metal = addStops(svgEl('linearGradient', { id: `${prefix}-metal`, x1: '0', y1: '0', x2: '1', y2: '0' }), [
      ['0%', '#5e6871'], ['8%', '#9aa4ac'], ['20%', '#f6f8f9'], ['34%', '#bac3ca'], ['48%', '#8f9aa3'],
      ['60%', '#eef2f4'], ['73%', '#c0c8ce'], ['88%', '#f7f9fa'], ['100%', '#69737c']
    ]);

    const top = addStops(svgEl('radialGradient', { id: `${prefix}-top`, cx: '34%', cy: '26%', r: '78%' }), [
      ['0%', '#ffffff'], ['25%', '#eef2f4'], ['57%', '#c9d1d6'], ['82%', '#a0abb3'], ['100%', '#747f88']
    ]);

    const rim = addStops(svgEl('linearGradient', { id: `${prefix}-rim`, x1: '0', y1: '0', x2: '0', y2: '1' }), [
      ['0%', '#ffffff', .95], ['42%', '#cbd3d8', .92], ['100%', '#77828a', .95]
    ]);

    const floor = addStops(svgEl('linearGradient', { id: `${prefix}-floor`, x1: '0', y1: '0', x2: '1', y2: '1' }), [
      ['0%', '#e7eef0', .58], ['100%', '#93a4ab', .18]
    ]);

    const shadow = svgEl('filter', { id: `${prefix}-shadow`, x: '-35%', y: '-45%', width: '170%', height: '205%' });
    shadow.append(svgEl('feDropShadow', { dx: 0, dy: 5, stdDeviation: 5, 'flood-color': '#10232c', 'flood-opacity': '.24' }));

    const softShadow = svgEl('filter', { id: `${prefix}-soft`, x: '-30%', y: '-50%', width: '160%', height: '220%' });
    softShadow.append(svgEl('feGaussianBlur', { stdDeviation: 5 }));

    const start = svgEl('marker', { id: `${prefix}-start`, markerWidth: 8, markerHeight: 8, refX: 6, refY: 4, orient: 'auto' });
    start.append(svgEl('path', { d: 'M8 1 L2 4 L8 7', fill: 'none', stroke: '#3b6076', 'stroke-width': 1.4 }));
    const end = svgEl('marker', { id: `${prefix}-end`, markerWidth: 8, markerHeight: 8, refX: 2, refY: 4, orient: 'auto' });
    end.append(svgEl('path', { d: 'M0 1 L6 4 L0 7', fill: 'none', stroke: '#3b6076', 'stroke-width': 1.4 }));

    const brush = svgEl('pattern', { id: `${prefix}-brush`, patternUnits: 'userSpaceOnUse', width: 8, height: 8 });
    brush.append(
      svgEl('path', { d: 'M0 2 H8 M0 6 H8', stroke: '#fff', 'stroke-opacity': '.11', 'stroke-width': .55 }),
      svgEl('path', { d: 'M0 4 H8', stroke: '#4a5963', 'stroke-opacity': '.08', 'stroke-width': .45 })
    );

    d.append(metal, top, rim, floor, shadow, softShadow, start, end, brush);
    svg.append(d);
    return d;
  }

  function dimension(svg, prefix, x1, y1, x2, y2, label, vertical = false) {
    const lineAttrs = {
      stroke: '#3b6076', 'stroke-width': 1.45,
      'marker-start': `url(#${prefix}-start)`, 'marker-end': `url(#${prefix}-end)`
    };
    svg.append(svgEl('line', { x1, y1, x2, y2, ...lineAttrs }));
    if (vertical) {
      svg.append(
        svgEl('line', { x1: x1 - 7, y1, x2: x1 + 7, y2: y1, stroke: '#3b6076', 'stroke-width': 1 }),
        svgEl('line', { x1: x2 - 7, y1: y2, x2: x2 + 7, y2, stroke: '#3b6076', 'stroke-width': 1 })
      );
      const tx = x1 - 15, ty = (y1 + y2) / 2;
      svg.append(svgEl('text', { x: tx, y: ty, class: 'dim-text', 'text-anchor': 'middle', transform: `rotate(-90 ${tx} ${ty})` }, label));
    } else {
      svg.append(
        svgEl('line', { x1, y1: y1 - 7, x2: x1, y2: y1 + 7, stroke: '#3b6076', 'stroke-width': 1 }),
        svgEl('line', { x1: x2, y1: y2 - 7, x2, y2: y2 + 7, stroke: '#3b6076', 'stroke-width': 1 })
      );
      svg.append(svgEl('text', { x: (x1 + x2) / 2, y: y1 - 10, class: 'dim-text', 'text-anchor': 'middle' }, label));
    }
  }

  function addGrid(svg, x, y, w, h, step = 24) {
    const g = svgEl('g', { class: 'cad-grid', opacity: .28, stroke: '#6f8791', 'stroke-width': .55 });
    for (let gx = x; gx <= x + w; gx += step) g.append(svgEl('line', { x1: gx, y1: y, x2: gx, y2: y + h }));
    for (let gy = y; gy <= y + h; gy += step) g.append(svgEl('line', { x1: x, y1: gy, x2: x + w, y2: gy }));
    svg.append(g);
  }

  function empty(target, title = 'Заполните параметры') {
    const svg = svgEl('svg', { viewBox: '0 0 640 300' });
    addGrid(svg, 76, 52, 488, 196, 28);
    svg.append(svgEl('rect', { x: 76, y: 52, width: 488, height: 196, rx: 16, fill: 'none', stroke: 'currentColor', 'stroke-opacity': '.14', 'stroke-width': 2, 'stroke-dasharray': '7 7' }));
    svg.append(svgEl('text', { x: 320, y: 143, class: 'empty-title', 'text-anchor': 'middle' }, title));
    svg.append(svgEl('text', { x: 320, y: 170, class: 'empty-sub', 'text-anchor': 'middle' }, 'Превью появится автоматически'));
    target.replaceChildren(svg);
  }

  function addTopCell(pattern, prefix, cell) {
    const cx = cell / 2, cy = cell / 2;
    const r = Math.max(.12, cell / 2 - Math.min(1.2, cell * .04));
    pattern.append(svgEl('circle', { cx, cy, r, fill: `url(#${prefix}-top)`, stroke: '#66747d', 'stroke-width': Math.max(.22, Math.min(1, cell * .024)) }));
    if (cell >= 7) {
      pattern.append(
        svgEl('circle', { cx, cy, r: r * .78, fill: 'none', stroke: '#fff', 'stroke-opacity': .25, 'stroke-width': Math.max(.25, cell * .018) }),
        svgEl('circle', { cx, cy, r: r * .9, fill: 'none', stroke: '#4f5c64', 'stroke-opacity': .16, 'stroke-width': Math.max(.2, cell * .012) })
      );
    }
    if (cell >= 11) {
      pattern.append(
        svgEl('ellipse', { cx: cell * .37, cy: cell * .33, rx: cell * .13, ry: cell * .08, fill: '#fff', 'fill-opacity': .56 }),
        svgEl('path', { d: `M${cell * .24} ${cell * .58} Q${cell * .5} ${cell * .72} ${cell * .76} ${cell * .56}`, fill: 'none', stroke: '#5c6870', 'stroke-opacity': .18, 'stroke-width': Math.max(.3, cell * .014) })
      );
    }
  }

  function drawTop(s) {
    const svg = svgEl('svg', { viewBox: '0 0 640 300', preserveAspectRatio: 'xMidYMid meet' });
    const prefix = 'top';
    const d = defs(svg, prefix);
    addGrid(svg, 87, 73, 492, 196, 28);

    const realW = s.x * s.d, realH = s.y * s.d;
    const scale = Math.min(470 / realW, 175 / realH);
    const cell = Math.max(.18, s.d * scale);
    const w = realW * scale, h = realH * scale;
    const x0 = 95 + (470 - w) / 2, y0 = 86 + (175 - h) / 2;

    svg.append(svgEl('rect', { x: x0 - 5, y: y0 - 5, width: w + 10, height: h + 10, rx: 8, fill: '#81939b', 'fill-opacity': .08, stroke: '#6f828b', 'stroke-opacity': .18 }));

    const pattern = svgEl('pattern', { id: 'top-cells', patternUnits: 'userSpaceOnUse', width: cell, height: cell });
    addTopCell(pattern, prefix, cell);
    d.append(pattern);

    const parts = svgEl('rect', { x: x0, y: y0, width: w, height: h, fill: 'url(#top-cells)', filter: `url(#${prefix}-shadow)` });
    svg.append(parts);

    if (cell >= 14) {
      svg.append(svgEl('rect', { x: x0, y: y0, width: w, height: h, fill: `url(#${prefix}-brush)`, opacity: .42, 'pointer-events': 'none' }));
    }

    dimension(svg, prefix, x0, 48, x0 + w, 48, `${fmt.format(realW)} мм · ${s.x} × Ø${fmt.format(s.d)}`);
    dimension(svg, prefix, 55, y0, 55, y0 + h, `${fmt.format(realH)} мм · ${s.y} × Ø${fmt.format(s.d)}`, true);
    svg.append(svgEl('text', { x: 320, y: 286, class: 'dim-note', 'text-anchor': 'middle' }, `${s.x} × ${s.y} = ${intFmt.format(s.x * s.y)} шт. в одном слое`));
    els.topProjection.replaceChildren(svg);
  }

  function addSideCell(pattern, prefix, cellW, cellH) {
    const topH = Math.max(.5, Math.min(cellH * .22, cellW * .16, 5.2));
    const bottomH = Math.max(.35, Math.min(topH * .72, 3.6));
    const bodyTop = topH * .7;
    const bodyH = Math.max(.5, cellH - bodyTop - bottomH * .3);
    const inset = Math.max(.25, Math.min(1.05, cellW * .018));
    const width = Math.max(.25, cellW - inset * 2);
    const rx = Math.max(.4, Math.min(4.5, cellW * .09));

    pattern.append(svgEl('ellipse', { cx: cellW / 2, cy: cellH - bottomH * .65, rx: width / 2, ry: bottomH, fill: '#65717a', 'fill-opacity': .46 }));
    pattern.append(svgEl('rect', { x: inset, y: bodyTop, width, height: bodyH, rx, fill: `url(#${prefix}-metal)`, stroke: '#68747d', 'stroke-width': Math.max(.2, Math.min(.75, cellW * .016)) }));
    pattern.append(svgEl('rect', { x: inset, y: bodyTop, width, height: bodyH, rx, fill: `url(#${prefix}-brush)`, opacity: .55 }));
    pattern.append(svgEl('ellipse', { cx: cellW / 2, cy: bodyTop, rx: width / 2, ry: topH, fill: `url(#${prefix}-top)`, stroke: '#707c85', 'stroke-width': Math.max(.2, Math.min(.65, cellW * .014)) }));

    if (cellW > 9 && cellH > 5) {
      pattern.append(
        svgEl('ellipse', { cx: cellW * .37, cy: bodyTop - topH * .18, rx: cellW * .1, ry: Math.max(.35, topH * .28), fill: '#fff', 'fill-opacity': .48 }),
        svgEl('path', { d: `M${cellW * .14} ${bodyTop + bodyH * .23} V${bodyTop + bodyH * .78}`, stroke: '#fff', 'stroke-opacity': .42, 'stroke-width': Math.max(.45, cellW * .018) }),
        svgEl('path', { d: `M${cellW * .86} ${bodyTop + bodyH * .2} V${bodyTop + bodyH * .82}`, stroke: '#3f4b53', 'stroke-opacity': .24, 'stroke-width': Math.max(.35, cellW * .014) })
      );
    }
  }

  function drawSide(target, s, horizontal, realW, prefix) {
    const svg = svgEl('svg', { viewBox: '0 0 640 300', preserveAspectRatio: 'xMidYMid meet' });
    const d = defs(svg, prefix);
    addGrid(svg, 87, 73, 492, 196, 28);

    const realH = s.z * s.h;
    const scale = Math.min(470 / realW, 175 / realH);
    const cellW = Math.max(.18, s.d * scale), cellH = Math.max(.18, s.h * scale);
    const w = realW * scale, h = realH * scale;
    const x0 = 95 + (470 - w) / 2, y0 = 86 + (175 - h) / 2;

    svg.append(svgEl('ellipse', { cx: x0 + w / 2, cy: y0 + h + 7, rx: Math.max(12, w * .42), ry: 7, fill: '#20313a', 'fill-opacity': .12, filter: `url(#${prefix}-soft)` }));

    const pattern = svgEl('pattern', { id: `${prefix}-cells`, patternUnits: 'userSpaceOnUse', width: cellW, height: cellH });
    addSideCell(pattern, prefix, cellW, cellH);
    d.append(pattern);

    svg.append(svgEl('rect', { x: x0, y: y0, width: w, height: h, fill: `url(#${prefix}-cells)`, filter: `url(#${prefix}-shadow)` }));

    dimension(svg, prefix, x0, 48, x0 + w, 48, `${fmt.format(realW)} мм · ${horizontal} × Ø${fmt.format(s.d)}`);
    dimension(svg, prefix, 55, y0, 55, y0 + h, `${fmt.format(realH)} мм · ${s.z} × ${fmt.format(s.h)}`, true);
    svg.append(svgEl('text', { x: 320, y: 286, class: 'dim-note', 'text-anchor': 'middle' }, `${horizontal} по горизонтали × ${s.z} по высоте`));
    target.replaceChildren(svg);
  }

  function drawIsoCylinder(group, prefix, x, y, w, bodyH, ellH, opacity = 1) {
    const bodyY = y - bodyH;
    group.append(svgEl('ellipse', { cx: x + w / 2, cy: y + 2, rx: w * .47, ry: ellH * .82, fill: '#2a3840', 'fill-opacity': .16 * opacity }));
    group.append(svgEl('ellipse', { cx: x + w / 2, cy: y - ellH * .05, rx: w / 2, ry: ellH, fill: '#65717a', 'fill-opacity': .55 * opacity }));
    group.append(svgEl('rect', { x, y: bodyY, width: w, height: bodyH, rx: Math.min(5, w * .12), fill: `url(#${prefix}-metal)`, stroke: '#64717a', 'stroke-width': .65, opacity }));
    group.append(svgEl('rect', { x, y: bodyY, width: w, height: bodyH, rx: Math.min(5, w * .12), fill: `url(#${prefix}-brush)`, opacity: .46 * opacity }));
    group.append(svgEl('ellipse', { cx: x + w / 2, cy: bodyY, rx: w / 2, ry: ellH, fill: `url(#${prefix}-top)`, stroke: '#6d7982', 'stroke-width': .65, opacity }));
    group.append(svgEl('ellipse', { cx: x + w * .36, cy: bodyY - ellH * .18, rx: w * .105, ry: Math.max(.6, ellH * .28), fill: '#fff', 'fill-opacity': .46 * opacity }));
    group.append(svgEl('path', { d: `M${x + w * .14} ${bodyY + bodyH * .2} V${bodyY + bodyH * .78}`, stroke: '#fff', 'stroke-opacity': .34 * opacity, 'stroke-width': .7 }));
  }

  function drawIso(s) {
    const svg = svgEl('svg', { viewBox: '0 0 640 300', preserveAspectRatio: 'xMidYMid meet' });
    const prefix = 'iso';
    defs(svg, prefix);

    const total = s.x * s.y * s.z;
    const maxVisible = 360;
    const visible = Math.min(total, maxVisible);
    const ratio = Math.max(.14, Math.min(1.65, s.h / s.d));
    const w = 28;
    const ellH = 4.8;
    const bodyH = Math.max(5.2, Math.min(24, 17 * ratio));
    const stepX = w * .82;
    const stepYx = w * .45;
    const stepYy = 10.5;
    const stepZ = bodyH + 3.2;

    const spanW = Math.max(w, (s.x - 1) * stepX + (s.y - 1) * stepYx + w);
    const spanH = Math.max(bodyH + ellH * 2, (s.y - 1) * stepYy + (s.z - 1) * stepZ + bodyH + ellH * 2);
    const scale = Math.min(535 / spanW, 205 / spanH, 1.25);
    const left = 320 - spanW * scale / 2;
    const bottom = 246;

    const base = svgEl('g', { transform: `translate(${left} ${bottom}) scale(${scale})` });
    const floorW = Math.max(w, (s.x - 1) * stepX + w);
    const floorDx = (s.y - 1) * stepYx;
    const floorDy = (s.y - 1) * stepYy;
    base.append(svgEl('polygon', {
      points: `0,0 ${floorW},0 ${floorW + floorDx},${-floorDy} ${floorDx},${-floorDy}`,
      fill: `url(#${prefix}-floor)`, stroke: '#788b94', 'stroke-opacity': .32, 'stroke-width': .8
    }));

    const grid = svgEl('g', { opacity: .24, stroke: '#627781', 'stroke-width': .55 });
    for (let ix = 0; ix <= s.x; ix++) {
      const gx = Math.min(floorW, ix * stepX);
      grid.append(svgEl('line', { x1: gx, y1: 0, x2: gx + floorDx, y2: -floorDy }));
    }
    for (let iy = 0; iy <= s.y; iy++) {
      const dx = Math.min(floorDx, iy * stepYx);
      const dy = Math.min(floorDy, iy * stepYy);
      grid.append(svgEl('line', { x1: dx, y1: -dy, x2: floorW + dx, y2: -dy }));
    }
    base.append(grid);
    svg.append(base);

    const group = svgEl('g', { transform: `translate(${left} ${bottom}) scale(${scale})`, filter: `url(#${prefix}-shadow)` });
    let drawn = 0;

    outer: for (let z = 0; z < s.z; z++) {
      for (let y = s.y - 1; y >= 0; y--) {
        for (let x = 0; x < s.x; x++) {
          if (drawn >= maxVisible) break outer;
          const px = x * stepX + y * stepYx;
          const py = -y * stepYy - z * stepZ;
          drawIsoCylinder(group, prefix, px, py, w, bodyH, ellH, 1);
          drawn++;
        }
      }
    }
    svg.append(group);

    const blockL = s.x * s.d, blockW = s.y * s.d, blockH = s.z * s.h;
    svg.append(svgEl('text', { x: 320, y: 276, class: 'dim-note', 'text-anchor': 'middle' },
      total > visible
        ? `Показано ${intFmt.format(visible)} из ${intFmt.format(total)} · блок ${fmt.format(blockL)} × ${fmt.format(blockW)} × ${fmt.format(blockH)} мм`
        : `${s.x} × ${s.y} × ${s.z} · блок ${fmt.format(blockL)} × ${fmt.format(blockW)} × ${fmt.format(blockH)} мм`
    ));
    els.isoProjection.replaceChildren(svg);
  }

  function summary(s) {
    const length = s.x * s.d, width = s.y * s.d, height = s.z * s.h;
    return `Деталь Ø${fmt.format(s.d)}×${fmt.format(s.h)} мм | Укладка ${s.x}×${s.y}×${s.z} | Всего ${intFmt.format(s.x * s.y * s.z)} шт | Габариты ${fmt.format(length)}×${fmt.format(width)}×${fmt.format(height)} мм`;
  }

  function render() {
    const s = state();
    const ok = complete(s);
    els.calculateButton.disabled = !ok;
    els.copyButton.disabled = !ok;

    if (!ok) {
      els.totalCount.textContent = '—';
      els.miniTotal.textContent = '—';
      els.miniFormula.textContent = 'Заполните поля';
      els.resultPart.textContent = 'Деталь: —';
      els.resultLayout.textContent = 'Укладка: —';
      els.resultBlock.textContent = 'Габариты блока: —';
      els.topSize.textContent = '—';
      els.sideSize.textContent = '—';
      els.endSize.textContent = '—';
      els.previewLabel.textContent = '—';
      empty(els.topProjection);
      empty(els.sideProjection);
      empty(els.endProjection);
      empty(els.isoProjection);
      return;
    }

    const total = s.x * s.y * s.z;
    const blockL = s.x * s.d, blockW = s.y * s.d, blockH = s.z * s.h;
    els.totalCount.textContent = intFmt.format(total);
    els.miniTotal.textContent = intFmt.format(total);
    els.miniFormula.textContent = `${s.x} × ${s.y} × ${s.z}`;
    els.resultPart.textContent = `Деталь: Ø${fmt.format(s.d)} × ${fmt.format(s.h)} мм`;
    els.resultLayout.textContent = `Укладка: ${s.x} × ${s.y} × ${s.z} · в слое ${intFmt.format(s.x * s.y)} шт`;
    els.resultBlock.textContent = `Габариты блока: ${fmt.format(blockL)} × ${fmt.format(blockW)} × ${fmt.format(blockH)} мм`;
    els.topSize.textContent = `${fmt.format(blockL)} × ${fmt.format(blockW)} мм`;
    els.sideSize.textContent = `${fmt.format(blockL)} × ${fmt.format(blockH)} мм`;
    els.endSize.textContent = `${fmt.format(blockW)} × ${fmt.format(blockH)} мм`;
    els.previewLabel.textContent = `${intFmt.format(total)} деталей`;

    drawTop(s);
    drawSide(els.sideProjection, s, s.x, blockL, 'side');
    drawSide(els.endProjection, s, s.y, blockW, 'end');
    drawIso(s);
  }

  function newCalculation() {
    [els.partDiameter, els.partHeight, els.countX, els.countY, els.countZ].forEach(input => { input.value = ''; });
    els.partDiameter.focus();
    render();
  }

  async function copySummary() {
    const s = state();
    if (!complete(s)) return;
    const text = summary(s);
    let copied = false;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) {}

    if (!copied) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      try { copied = document.execCommand('copy'); } catch (_) {}
      area.remove();
    }

    const label = els.copyButton.querySelector('b');
    clearTimeout(copyTimer);
    if (copied) {
      label.textContent = 'Скопировано ✓';
      els.copyButton.classList.add('is-copied');
      copyTimer = setTimeout(() => {
        label.textContent = 'Скопировать';
        els.copyButton.classList.remove('is-copied');
      }, 1800);
    }
  }

  function setTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    els.themeDark.classList.toggle('is-active', dark);
    els.themeLight.classList.toggle('is-active', !dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101718' : '#f4f7f6');
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (_) {}
  }

  function initTheme() {
    let theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (_) {}
    setTheme(theme);
  }

  function updateOnline() {
    els.offlineState.textContent = navigator.onLine ? 'Работает офлайн' : 'Офлайн-режим';
  }

  function bind() {
    [els.partDiameter, els.partHeight, els.countX, els.countY, els.countZ].forEach(input => {
      input.addEventListener('input', render);
      input.addEventListener('change', () => {
        const s = state();
        if (input === els.countX && s.x !== null) input.value = s.x;
        if (input === els.countY && s.y !== null) input.value = s.y;
        if (input === els.countZ && s.z !== null) input.value = s.z;
        render();
      });
    });

    els.calculateButton.addEventListener('click', render);
    els.newButton.addEventListener('click', newCalculation);
    els.copyButton.addEventListener('click', copySummary);
    els.themeLight.addEventListener('click', () => setTheme('light'));
    els.themeDark.addEventListener('click', () => setTheme('dark'));
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      els.installButton.classList.remove('is-hidden');
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      els.installButton.classList.add('is-hidden');
    });
    els.installButton.addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch (_) {}
      installPrompt = null;
      els.installButton.classList.add('is-hidden');
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), { once: true });
  }

  initTheme();
  bind();
  updateOnline();
  render();
  registerSW();
})();