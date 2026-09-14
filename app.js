(() => {
  'use strict';

  const els = {
    name: document.querySelector('#presetName'),
    x: document.querySelector('#lengthCount'),
    y: document.querySelector('#widthCount'),
    z: document.querySelector('#heightCount'),
    total: document.querySelector('#totalCount'),
    layer: document.querySelector('#layerCount'),
    layers: document.querySelector('#layersCount'),
    formula: document.querySelector('#formula'),
    top: document.querySelector('#topProjection'),
    side: document.querySelector('#sideProjection'),
    end: document.querySelector('#endProjection'),
    topLabel: document.querySelector('#topLabel'),
    sideLabel: document.querySelector('#sideLabel'),
    endLabel: document.querySelector('#endLabel'),
    topCaption: document.querySelector('#topCaption'),
    sideCaption: document.querySelector('#sideCaption'),
    endCaption: document.querySelector('#endCaption'),
    save: document.querySelector('#savePreset'),
    clear: document.querySelector('#clearPresets'),
    list: document.querySelector('#presetList'),
    template: document.querySelector('#presetTemplate'),
    theme: document.querySelector('#themeToggle'),
    install: document.querySelector('#installButton'),
    offlineState: document.querySelector('#offlineState')
  };

  const STORAGE_KEY = 'box-pwa-presets-v1';
  const THEME_KEY = 'box-pwa-theme';
  const MAX_DRAW = 36;
  let deferredInstallPrompt = null;

  const clampInt = (value, min = 1, max = 99) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  };

  const state = () => ({
    name: (els.name.value || 'Ящик').trim().slice(0, 32),
    x: clampInt(els.x.value),
    y: clampInt(els.y.value),
    z: clampInt(els.z.value)
  });

  const svgEl = (name, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };

  function crateDefs(svg) {
    const defs = svgEl('defs');
    const partGrad = svgEl('linearGradient', { id: 'partGrad', x1: '0', x2: '0', y1: '0', y2: '1' });
    partGrad.append(svgEl('stop', { offset: '0%', 'stop-color': '#f4f6f8' }));
    partGrad.append(svgEl('stop', { offset: '100%', 'stop-color': '#aeb8c2' }));
    const greenGrad = svgEl('linearGradient', { id: 'crateGrad', x1: '0', x2: '1', y1: '0', y2: '1' });
    greenGrad.append(svgEl('stop', { offset: '0%', 'stop-color': '#11a96d', 'stop-opacity': '.28' }));
    greenGrad.append(svgEl('stop', { offset: '100%', 'stop-color': '#006f42', 'stop-opacity': '.46' }));
    defs.append(partGrad, greenGrad);
    svg.append(defs);
  }

  function addCrateFrame(svg, x, y, w, h, radius = 18) {
    svg.append(svgEl('rect', { x, y, width: w, height: h, rx: radius, fill: 'url(#crateGrad)', stroke: 'var(--crate-edge)', 'stroke-width': 6 }));
    svg.append(svgEl('rect', { x: x + 11, y: y + 11, width: w - 22, height: h - 22, rx: Math.max(6, radius - 7), fill: 'none', stroke: 'var(--crate-edge)', 'stroke-width': 2, 'stroke-opacity': .65 }));
    const ribs = 5;
    for (let i = 1; i < ribs; i += 1) {
      const px = x + (w / ribs) * i;
      svg.append(svgEl('line', { x1: px, y1: y + 4, x2: px, y2: y + h - 4, stroke: 'var(--crate-edge)', 'stroke-width': 2, 'stroke-opacity': .35 }));
    }
  }

  function addOverflowBadge(svg, hiddenCount, cx, cy) {
    const g = svgEl('g');
    g.append(svgEl('circle', { cx, cy, r: 24, fill: 'var(--blue)', opacity: .96 }));
    const t = svgEl('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 15, 'font-family': 'system-ui', 'font-weight': 800 });
    t.textContent = `+${hiddenCount}`;
    g.append(t);
    svg.append(g);
  }

  function drawTop(xCount, yCount) {
    const svg = svgEl('svg', { viewBox: '0 0 760 390', preserveAspectRatio: 'xMidYMid meet' });
    crateDefs(svg);
    const box = { x: 42, y: 34, w: 676, h: 322 };
    addCrateFrame(svg, box.x, box.y, box.w, box.h, 22);

    const drawX = Math.min(xCount, MAX_DRAW);
    const drawY = Math.min(yCount, MAX_DRAW);
    const pad = 28;
    const gapX = (box.w - pad * 2) / drawX;
    const gapY = (box.h - pad * 2) / drawY;
    const r = Math.max(3.5, Math.min(gapX, gapY) * 0.38);

    for (let row = 0; row < drawY; row += 1) {
      for (let col = 0; col < drawX; col += 1) {
        const cx = box.x + pad + gapX * (col + .5);
        const cy = box.y + pad + gapY * (row + .5);
        svg.append(svgEl('circle', { cx, cy, r, fill: 'url(#partGrad)', stroke: '#8e99a4', 'stroke-width': Math.max(1, r * .08) }));
        svg.append(svgEl('ellipse', { cx: cx - r * .18, cy: cy - r * .22, rx: r * .28, ry: r * .16, fill: '#fff', opacity: .36 }));
      }
    }
    const hidden = xCount * yCount - drawX * drawY;
    if (hidden > 0) addOverflowBadge(svg, hidden, box.x + box.w - 42, box.y + 42);
    els.top.replaceChildren(svg);
  }

  function drawSide(horizontalCount, heightCount, target) {
    const svg = svgEl('svg', { viewBox: '0 0 580 260', preserveAspectRatio: 'xMidYMid meet' });
    crateDefs(svg);
    const box = { x: 32, y: 24, w: 516, h: 208 };
    addCrateFrame(svg, box.x, box.y, box.w, box.h, 16);

    const drawH = Math.min(horizontalCount, MAX_DRAW);
    const drawZ = Math.min(heightCount, MAX_DRAW);
    const padX = 20;
    const padY = 22;
    const cellW = (box.w - padX * 2) / drawH;
    const cellH = (box.h - padY * 2) / drawZ;
    const pw = Math.max(4, cellW * .78);
    const ph = Math.max(3, cellH * .72);
    const rx = Math.min(8, ph * .25);

    for (let row = 0; row < drawZ; row += 1) {
      for (let col = 0; col < drawH; col += 1) {
        const x = box.x + padX + col * cellW + (cellW - pw) / 2;
        const y = box.y + box.h - padY - (row + 1) * cellH + (cellH - ph) / 2;
        svg.append(svgEl('rect', { x, y, width: pw, height: ph, rx, fill: 'url(#partGrad)', stroke: '#8e99a4', 'stroke-width': 1 }));
        svg.append(svgEl('ellipse', { cx: x + pw / 2, cy: y + Math.min(4, ph * .18), rx: pw * .43, ry: Math.max(1.5, ph * .12), fill: '#f5f7f8', opacity: .62 }));
      }
    }
    const hidden = horizontalCount * heightCount - drawH * drawZ;
    if (hidden > 0) addOverflowBadge(svg, hidden, box.x + box.w - 36, box.y + 36);
    target.replaceChildren(svg);
  }

  function update() {
    const s = state();
    els.x.value = s.x;
    els.y.value = s.y;
    els.z.value = s.z;
    const perLayer = s.x * s.y;
    const total = perLayer * s.z;

    els.total.textContent = total.toLocaleString('ru-RU');
    els.layer.textContent = `${perLayer.toLocaleString('ru-RU')} шт`;
    els.layers.textContent = s.z.toLocaleString('ru-RU');
    els.formula.textContent = `${s.x} × ${s.y} × ${s.z}`;
    els.topLabel.textContent = `${s.x} × ${s.y}`;
    els.sideLabel.textContent = `${s.x} × ${s.z}`;
    els.endLabel.textContent = `${s.y} × ${s.z}`;
    els.topCaption.textContent = `${perLayer.toLocaleString('ru-RU')} деталей в одном слое`;
    els.sideCaption.textContent = `${s.x} в длину × ${s.z} ${pluralLayers(s.z)}`;
    els.endCaption.textContent = `${s.y} в ширину × ${s.z} ${pluralLayers(s.z)}`;

    drawTop(s.x, s.y);
    drawSide(s.x, s.z, els.side);
    drawSide(s.y, s.z, els.end);
  }

  function pluralLayers(n) {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return 'слой';
    if ([2, 3, 4].includes(n10) && ![12, 13, 14].includes(n100)) return 'слоя';
    return 'слоёв';
  }

  function getPresets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 20) : [];
    } catch {
      return [];
    }
  }

  function setPresets(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
    renderPresets();
  }

  function savePreset() {
    const s = state();
    const preset = { ...s, id: Date.now(), createdAt: new Date().toISOString() };
    const items = getPresets();
    setPresets([preset, ...items]);
  }

  function loadPreset(preset) {
    els.name.value = preset.name || 'Ящик';
    els.x.value = clampInt(preset.x);
    els.y.value = clampInt(preset.y);
    els.z.value = clampInt(preset.z);
    update();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removePreset(id) {
    setPresets(getPresets().filter((item) => item.id !== id));
  }

  function renderPresets() {
    const items = getPresets();
    els.list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-presets';
      empty.textContent = 'Пока пусто. Настрой раскладку и нажми «Сохранить вариант».';
      els.list.append(empty);
      return;
    }

    items.forEach((preset) => {
      const fragment = els.template.content.cloneNode(true);
      const card = fragment.querySelector('.preset-card');
      const remove = fragment.querySelector('.preset-delete');
      const total = preset.x * preset.y * preset.z;
      fragment.querySelector('.preset-name').textContent = preset.name || 'Ящик';
      fragment.querySelector('.preset-total').textContent = `${total.toLocaleString('ru-RU')} шт`;
      fragment.querySelector('.preset-formula').textContent = `${preset.x} × ${preset.y} × ${preset.z}`;
      card.addEventListener('click', () => loadPreset(preset));
      remove.addEventListener('click', (event) => { event.stopPropagation(); removePreset(preset.id); });
      remove.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          removePreset(preset.id);
        }
      });
      els.list.append(fragment);
    });
  }

  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    els.theme.textContent = next === 'dark' ? '☀' : '◐';
    update();
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved || preferred);
  }

  function updateOnlineState() {
    els.offlineState.textContent = navigator.onLine ? 'Готов к офлайн-работе' : 'Офлайн-режим активен';
  }

  [els.x, els.y, els.z].forEach((input) => input.addEventListener('input', update));
  document.querySelectorAll('[data-step-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.stepTarget);
      input.value = clampInt(clampInt(input.value) + Number(button.dataset.step));
      update();
    });
  });
  els.save.addEventListener('click', savePreset);
  els.clear.addEventListener('click', () => setPresets([]));
  els.theme.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.install.classList.remove('is-hidden');
  });

  els.install.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.install.classList.add('is-hidden');
  });

  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
        els.offlineState.textContent = 'Service Worker не зарегистрирован';
      });
    });
  }

  initTheme();
  renderPresets();
  updateOnlineState();
  update();
})();
