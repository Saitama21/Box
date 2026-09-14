(() => {
  'use strict';

  const THEME_KEY = 'box-pwa-theme-v5';
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

  function defs(svg, prefix) {
    const d = svgEl('defs');
    const metal = svgEl('linearGradient', { id: `${prefix}-metal`, x1: '0', y1: '0', x2: '1', y2: '0' });
    metal.append(
      svgEl('stop', { offset: '0%', 'stop-color': '#6f7982' }),
      svgEl('stop', { offset: '18%', 'stop-color': '#eef2f4' }),
      svgEl('stop', { offset: '46%', 'stop-color': '#bcc5cb' }),
      svgEl('stop', { offset: '74%', 'stop-color': '#f5f7f8' }),
      svgEl('stop', { offset: '100%', 'stop-color': '#747e86' })
    );
    const top = svgEl('radialGradient', { id: `${prefix}-top`, cx: '35%', cy: '30%', r: '72%' });
    top.append(
      svgEl('stop', { offset: '0%', 'stop-color': '#fafcfd' }),
      svgEl('stop', { offset: '48%', 'stop-color': '#d9dfe3' }),
      svgEl('stop', { offset: '100%', 'stop-color': '#949fa7' })
    );
    const shadow = svgEl('filter', { id: `${prefix}-shadow`, x: '-30%', y: '-30%', width: '160%', height: '180%' });
    shadow.append(svgEl('feDropShadow', { dx: 0, dy: 5, stdDeviation: 5, 'flood-color': '#1a252c', 'flood-opacity': '.22' }));
    const start = svgEl('marker', { id: `${prefix}-start`, markerWidth: 8, markerHeight: 8, refX: 6, refY: 4, orient: 'auto' });
    start.append(svgEl('path', { d: 'M8 1 L2 4 L8 7', fill: 'none', stroke: '#29495f', 'stroke-width': 1.4 }));
    const end = svgEl('marker', { id: `${prefix}-end`, markerWidth: 8, markerHeight: 8, refX: 2, refY: 4, orient: 'auto' });
    end.append(svgEl('path', { d: 'M0 1 L6 4 L0 7', fill: 'none', stroke: '#29495f', 'stroke-width': 1.4 }));
    d.append(metal, top, shadow, start, end);
    svg.append(d);
    return d;
  }

  function dimension(svg, prefix, x1, y1, x2, y2, label, vertical = false) {
    svg.append(svgEl('line', { x1, y1, x2, y2, stroke: '#29495f', 'stroke-width': 1.5, 'marker-start': `url(#${prefix}-start)`, 'marker-end': `url(#${prefix}-end)` }));
    if (vertical) {
      svg.append(svgEl('line', { x1: x1 - 7, y1, x2: x1 + 7, y2: y1, stroke: '#29495f' }), svgEl('line', { x1: x2 - 7, y1: y2, x2: x2 + 7, y2, stroke: '#29495f' }));
      const tx = x1 - 14, ty = (y1 + y2) / 2;
      svg.append(svgEl('text', { x: tx, y: ty, class: 'dim-text', 'text-anchor': 'middle', transform: `rotate(-90 ${tx} ${ty})` }, label));
    } else {
      svg.append(svgEl('line', { x1, y1: y1 - 7, x2: x1, y2: y1 + 7, stroke: '#29495f' }), svgEl('line', { x1: x2, y1: y2 - 7, x2, y2: y2 + 7, stroke: '#29495f' }));
      svg.append(svgEl('text', { x: (x1 + x2) / 2, y: y1 - 10, class: 'dim-text', 'text-anchor': 'middle' }, label));
    }
  }

  function empty(target, title = 'Заполните параметры') {
    const svg = svgEl('svg', { viewBox: '0 0 640 300' });
    svg.append(svgEl('rect', { x: 76, y: 52, width: 488, height: 196, rx: 16, fill: 'none', stroke: 'currentColor', 'stroke-opacity': '.14', 'stroke-width': 2, 'stroke-dasharray': '7 7' }));
    svg.append(svgEl('text', { x: 320, y: 143, class: 'empty-title', 'text-anchor': 'middle' }, title));
    svg.append(svgEl('text', { x: 320, y: 170, class: 'empty-sub', 'text-anchor': 'middle' }, 'Превью появится автоматически'));
    target.replaceChildren(svg);
  }

  function drawTop(s) {
    const svg = svgEl('svg', { viewBox: '0 0 640 300', preserveAspectRatio: 'xMidYMid meet' });
    const prefix = 'top';
    const d = defs(svg, prefix);
    const realW = s.x * s.d, realH = s.y * s.d;
    const scale = Math.min(470 / realW, 175 / realH);
    const cell = Math.max(.18, s.d * scale);
    const w = realW * scale, h = realH * scale;
    const x0 = 95 + (470 - w) / 2, y0 = 86 + (175 - h) / 2;
    const pattern = svgEl('pattern', { id: 'top-cells', patternUnits: 'userSpaceOnUse', width: cell, height: cell });
    pattern.append(svgEl('circle', { cx: cell / 2, cy: cell / 2, r: Math.max(.12, cell / 2 - Math.min(1.2, cell * .04)), fill: `url(#${prefix}-top)`, stroke: '#7e8991', 'stroke-width': Math.max(.2, Math.min(.9, cell * .025)) }));
    if (cell > 10) pattern.append(svgEl('ellipse', { cx: cell * .36, cy: cell * .32, rx: cell * .13, ry: cell * .09, fill: '#fff', 'fill-opacity': '.42' }));
    d.append(pattern);
    svg.append(svgEl('rect', { x: x0, y: y0, width: w, height: h, fill: 'url(#top-cells)', filter: `url(#${prefix}-shadow)` }));
    dimension(svg, prefix, x0, 48, x0 + w, 48, `${fmt.format(realW)} мм (${s.x} × ${fmt.format(s.d)})`);
    dimension(svg, prefix, 55, y0, 55, y0 + h, `${fmt.format(realH)} мм (${s.y} × ${fmt.format(s.d)})`, true);
    svg.append(svgEl('text', { x: 320, y: 286, class: 'dim-note', 'text-anchor': 'middle' }, `${s.x} × ${s.y} = ${intFmt.format(s.x * s.y)} шт. в одном слое`));
    els.topProjection.replaceChildren(svg);
  }

  function drawSide(target, s, horizontal, realW, prefix) {
    const svg = svgEl('svg', { viewBox: '0 0 640 300', preserveAspectRatio: 'xMidYMid meet' });
    const d = defs(svg, prefix);
    const realH = s.z * s.h;
    const scale = Math.min(470 / realW, 175 / realH);
    const cellW = Math.max(.18, s.d * scale), cellH = Math.max(.18, s.h * scale);
    const w = realW * scale, h = realH * scale;
    const x0 = 95 + (470 - w) / 2, y0 = 86 + (175 - h) / 2;
    const pattern = svgEl('pattern', { id: `${prefix}-cells`, patternUnits: 'userSpaceOnUse', width: cellW, height: cellH });
    const bodyY = Math.min(2.3, cellH * .14);
    pattern.append(svgEl('rect', { x: .3, y: bodyY, width: Math.max(.2, cellW - .6), height: Math.max(.2, cellH - bodyY - .3), rx: Math.min(4, cellW * .12), fill: `url(#${prefix}-metal)`, stroke: '#737e87', 'stroke-width': Math.max(.2, Math.min(.7, cellW * .018)) }));
    if (cellW > 5 && cellH > 3) pattern.append(svgEl('ellipse', { cx: cellW / 2, cy: Math.max(.8, bodyY), rx: Math.max(.5, cellW * .48 - .4), ry: Math.max(.4, Math.min(3.4, cellH * .14)), fill: `url(#${prefix}-top)`, stroke: '#818c94', 'stroke-width': .4 }));
    d.append(pattern);
    svg.append(svgEl('rect', { x: x0, y: y0, width: w, height: h, fill: `url(#${prefix}-cells)`, filter: `url(#${prefix}-shadow)` }));
    dimension(svg, prefix, x0, 48, x0 + w, 48, `${fmt.format(realW)} мм (${horizontal} × ${fmt.format(s.d)})`);
    dimension(svg, prefix, 55, y0, 55, y0 + h, `${fmt.format(realH)} мм (${s.z} × ${fmt.format(s.h)})`, true);
    svg.append(svgEl('text', { x: 320, y: 286, class: 'dim-note', 'text-anchor': 'middle' }, `${horizontal} по горизонтали × ${s.z} по высоте`));
    target.replaceChildren(svg);
  }

  function drawIso(s) {
    const svg = svgEl('svg', { viewBox: '0 0 640 300', preserveAspectRatio: 'xMidYMid meet' });
    const prefix = 'iso';
    defs(svg, prefix);
    const maxVisible = 320;
    const total = s.x * s.y * s.z;
    const sx = 27, sy = 14, layer = 14;
    const spanX = (s.x - 1) * sx + (s.y - 1) * sx * .6 + 36;
    const spanY = (s.y - 1) * sy + (s.z - 1) * layer + 52;
    const scale = Math.min(520 / Math.max(spanX, 1), 205 / Math.max(spanY, 1), 1.15);
    const cx = 320, baseY = 238;
    const group = svgEl('g', { transform: `translate(${cx - spanX * scale / 2} ${baseY}) scale(${scale})`, filter: `url(#${prefix}-shadow)` });
    let drawn = 0;
    outer: for (let z = 0; z < s.z; z++) {
      for (let y = s.y - 1; y >= 0; y--) {
        for (let x = 0; x < s.x; x++) {
          if (drawn >= maxVisible) break outer;
          const px = x * sx + y * sx * .6;
          const py = -y * sy - z * layer;
          const w = 32, hh = 15;
          group.append(svgEl('rect', { x: px, y: py - hh, width: w, height: hh, rx: 5, fill: `url(#${prefix}-metal)`, stroke: '#6f7a82', 'stroke-width': .65 }));
          group.append(svgEl('ellipse', { cx: px + w / 2, cy: py - hh, rx: w / 2, ry: 5.5, fill: `url(#${prefix}-top)`, stroke: '#768189', 'stroke-width': .65 }));
          drawn++;
        }
      }
    }
    svg.append(group);
    if (total > maxVisible) svg.append(svgEl('text', { x: 320, y: 282, class: 'dim-note', 'text-anchor': 'middle' }, `Показана часть раскладки · всего ${intFmt.format(total)} шт.`));
    else svg.append(svgEl('text', { x: 320, y: 282, class: 'dim-note', 'text-anchor': 'middle' }, `Полная раскладка · ${intFmt.format(total)} шт.`));
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
      els.totalCount.textContent = '—'; els.miniTotal.textContent = '—'; els.miniFormula.textContent = 'Заполните поля';
      els.resultPart.textContent = 'Деталь: —'; els.resultLayout.textContent = 'Укладка: —'; els.resultBlock.textContent = 'Габариты блока: —';
      els.topSize.textContent = '—'; els.sideSize.textContent = '—'; els.endSize.textContent = '—'; els.previewLabel.textContent = '—';
      empty(els.topProjection); empty(els.sideProjection); empty(els.endProjection); empty(els.isoProjection);
      return;
    }
    const total = s.x * s.y * s.z;
    const blockL = s.x * s.d, blockW = s.y * s.d, blockH = s.z * s.h;
    els.totalCount.textContent = intFmt.format(total); els.miniTotal.textContent = intFmt.format(total); els.miniFormula.textContent = `${s.x} × ${s.y} × ${s.z}`;
    els.resultPart.textContent = `Деталь: Ø${fmt.format(s.d)} × ${fmt.format(s.h)} мм`;
    els.resultLayout.textContent = `Укладка: ${s.x} × ${s.y} × ${s.z}`;
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
    const s = state(); if (!complete(s)) return;
    const text = summary(s);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) { await navigator.clipboard.writeText(text); copied = true; }
    } catch (_) {}
    if (!copied) {
      const area = document.createElement('textarea');
      area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.append(area); area.select();
      try { copied = document.execCommand('copy'); } catch (_) {}
      area.remove();
    }
    const label = els.copyButton.querySelector('b');
    clearTimeout(copyTimer);
    if (copied) {
      label.textContent = 'Скопировано ✓'; els.copyButton.classList.add('is-copied');
      copyTimer = setTimeout(() => { label.textContent = 'Скопировать'; els.copyButton.classList.remove('is-copied'); }, 1800);
    }
  }

  function setTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    els.themeDark.classList.toggle('is-active', dark); els.themeLight.classList.toggle('is-active', !dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101718' : '#f4f7f6');
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (_) {}
  }

  function initTheme() {
    let theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (_) {}
    setTheme(theme);
  }

  function updateOnline() { els.offlineState.textContent = navigator.onLine ? 'Работает офлайн' : 'Офлайн-режим'; }

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
    window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; els.installButton.classList.remove('is-hidden'); });
    window.addEventListener('appinstalled', () => { installPrompt = null; els.installButton.classList.add('is-hidden'); });
    els.installButton.addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch (_) {}
      installPrompt = null; els.installButton.classList.add('is-hidden');
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), { once: true });
  }

  initTheme(); bind(); updateOnline(); render(); registerSW();
})();
