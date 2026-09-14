(() => {
  const STORAGE_KEY = 'box-pwa-presets-v2';
  const THEME_KEY = 'box-pwa-theme-v2';
  const MAX_DRAW = 14;
  let deferredInstallPrompt = null;

  const els = {
    boxLength: document.getElementById('boxLength'),
    boxWidth: document.getElementById('boxWidth'),
    boxHeight: document.getElementById('boxHeight'),
    partDiameter: document.getElementById('partDiameter'),
    partHeight: document.getElementById('partHeight'),
    countX: document.getElementById('countX'),
    countY: document.getElementById('countY'),
    countZ: document.getElementById('countZ'),
    topProjection: document.getElementById('topProjection'),
    sideProjection: document.getElementById('sideProjection'),
    endProjection: document.getElementById('endProjection'),
    topCaption: document.getElementById('topCaption'),
    sideCaption: document.getElementById('sideCaption'),
    endCaption: document.getElementById('endCaption'),
    totalCount: document.getElementById('totalCount'),
    resultFormula: document.getElementById('resultFormula'),
    infoBoxSize: document.getElementById('infoBoxSize'),
    infoPartSize: document.getElementById('infoPartSize'),
    infoLayout: document.getElementById('infoLayout'),
    infoPerLayer: document.getElementById('infoPerLayer'),
    infoLayers: document.getElementById('infoLayers'),
    infoTotal: document.getElementById('infoTotal'),
    gapLength: document.getElementById('gapLength'),
    gapWidth: document.getElementById('gapWidth'),
    gapHeight: document.getElementById('gapHeight'),
    fitStatus: document.getElementById('fitStatus'),
    statusText: document.getElementById('statusText'),
    presetName: document.getElementById('presetName'),
    savePreset: document.getElementById('savePreset'),
    quickPresets: document.getElementById('quickPresets'),
    quickPresetTemplate: document.getElementById('quickPresetTemplate'),
    resetButton: document.getElementById('resetButton'),
    offlineState: document.getElementById('offlineState'),
    installButton: document.getElementById('installButton'),
    themeDark: document.getElementById('themeDark'),
    themeLight: document.getElementById('themeLight')
  };

  const defaults = {
    boxLength: 600,
    boxWidth: 400,
    boxHeight: 280,
    partDiameter: 50,
    partHeight: 20,
    countX: 9,
    countY: 5,
    countZ: 4
  };

  const fmt = new Intl.NumberFormat('ru-RU');

  function sanitizeNumber(value, fallback = 1) {
    const number = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(number) || number <= 0) return fallback;
    return Math.round(number * 100) / 100;
  }

  function sanitizeInt(value, fallback = 1) {
    const number = Math.trunc(Number(value));
    if (!Number.isFinite(number) || number < 1) return fallback;
    return Math.min(999, number);
  }

  function state() {
    return {
      boxLength: sanitizeNumber(els.boxLength.value, defaults.boxLength),
      boxWidth: sanitizeNumber(els.boxWidth.value, defaults.boxWidth),
      boxHeight: sanitizeNumber(els.boxHeight.value, defaults.boxHeight),
      partDiameter: sanitizeNumber(els.partDiameter.value, defaults.partDiameter),
      partHeight: sanitizeNumber(els.partHeight.value, defaults.partHeight),
      x: sanitizeInt(els.countX.value, defaults.countX),
      y: sanitizeInt(els.countY.value, defaults.countY),
      z: sanitizeInt(els.countZ.value, defaults.countZ)
    };
  }

  function applyStateToInputs(s) {
    els.boxLength.value = s.boxLength;
    els.boxWidth.value = s.boxWidth;
    els.boxHeight.value = s.boxHeight;
    els.partDiameter.value = s.partDiameter;
    els.partHeight.value = s.partHeight;
    els.countX.value = s.x;
    els.countY.value = s.y;
    els.countZ.value = s.z;
  }

  function svgEl(name, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function ensureDefs(svg) {
    const defs = svgEl('defs');

    const partGrad = svgEl('linearGradient', { id: 'partGradient', x1: '0', y1: '0', x2: '0', y2: '1' });
    partGrad.append(svgEl('stop', { offset: '0%', 'stop-color': '#f6f8fa' }));
    partGrad.append(svgEl('stop', { offset: '55%', 'stop-color': '#d6dde4' }));
    partGrad.append(svgEl('stop', { offset: '100%', 'stop-color': '#aab4bf' }));

    const crateFill = svgEl('linearGradient', { id: 'crateFill', x1: '0', y1: '0', x2: '1', y2: '1' });
    crateFill.append(svgEl('stop', { offset: '0%', 'stop-color': 'rgba(33, 188, 118, 0.26)' }));
    crateFill.append(svgEl('stop', { offset: '100%', 'stop-color': 'rgba(6, 111, 66, 0.44)' }));

    defs.append(partGrad, crateFill);
    svg.append(defs);
  }

  function addMeasure(svg, { x1, y1, x2, y2, label, labelX, labelY, orientation = 'horizontal' }) {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#126ae6';
    svg.append(svgEl('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 2 }));

    if (orientation === 'horizontal') {
      svg.append(svgEl('line', { x1, y1: y1 - 10, x2: x1, y2: y1 + 10, stroke: color, 'stroke-width': 2 }));
      svg.append(svgEl('line', { x1: x2, y1: y2 - 10, x2, y2: y2 + 10, stroke: color, 'stroke-width': 2 }));
    } else {
      svg.append(svgEl('line', { x1: x1 - 10, y1, x2: x1 + 10, y2: y1, stroke: color, 'stroke-width': 2 }));
      svg.append(svgEl('line', { x1: x2 - 10, y1: y2, x2: x2 + 10, y2, stroke: color, 'stroke-width': 2 }));
    }

    const text = svgEl('text', {
      x: labelX,
      y: labelY,
      fill: color,
      'font-size': 15,
      'font-weight': 800,
      'text-anchor': 'middle'
    });
    if (orientation === 'vertical') {
      text.setAttribute('transform', `rotate(-90 ${labelX} ${labelY})`);
    }
    text.textContent = label;
    svg.append(text);
  }

  function addTopCrateFrame(svg, box) {
    svg.append(svgEl('rect', {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      rx: 22,
      fill: 'url(#crateFill)',
      stroke: 'rgba(10, 125, 78, 0.82)',
      'stroke-width': 6
    }));
    svg.append(svgEl('rect', {
      x: box.x + 14,
      y: box.y + 14,
      width: box.w - 28,
      height: box.h - 28,
      rx: 18,
      fill: 'none',
      stroke: 'rgba(71, 211, 148, 0.5)',
      'stroke-width': 2
    }));

    const ribCount = 5;
    for (let i = 1; i < ribCount; i += 1) {
      const px = box.x + (box.w / ribCount) * i;
      svg.append(svgEl('line', {
        x1: px,
        y1: box.y + 6,
        x2: px,
        y2: box.y + box.h - 6,
        stroke: 'rgba(16, 122, 77, 0.28)',
        'stroke-width': 2
      }));
    }

    const handleY = box.y + box.h * 0.36;
    ['left', 'right'].forEach((side) => {
      const rect = svgEl('rect', {
        x: side === 'left' ? box.x + 14 : box.x + box.w - 44,
        y: handleY,
        width: 30,
        height: 16,
        rx: 7,
        fill: 'rgba(255,255,255,0.85)'
      });
      svg.append(rect);
    });
  }

  function addFrontCrateFrame(svg, box) {
    svg.append(svgEl('rect', {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      rx: 18,
      fill: 'url(#crateFill)',
      stroke: 'rgba(10, 125, 78, 0.82)',
      'stroke-width': 5
    }));
    svg.append(svgEl('rect', {
      x: box.x + 12,
      y: box.y + 12,
      width: box.w - 24,
      height: box.h - 24,
      rx: 12,
      fill: 'none',
      stroke: 'rgba(71, 211, 148, 0.45)',
      'stroke-width': 2
    }));

    const ribCount = 5;
    for (let i = 1; i < ribCount; i += 1) {
      const px = box.x + (box.w / ribCount) * i;
      svg.append(svgEl('line', {
        x1: px,
        y1: box.y + 6,
        x2: px,
        y2: box.y + box.h - 6,
        stroke: 'rgba(16, 122, 77, 0.25)',
        'stroke-width': 2
      }));
    }
  }

  function addEndCrateFrame(svg, box) {
    addFrontCrateFrame(svg, box);
    svg.append(svgEl('rect', {
      x: box.x + box.w / 2 - 32,
      y: box.y + 8,
      width: 64,
      height: 14,
      rx: 6,
      fill: 'rgba(255,255,255,0.9)'
    }));
  }

  function drawTopView(s) {
    const svg = svgEl('svg', { viewBox: '0 0 760 420', preserveAspectRatio: 'xMidYMid meet' });
    ensureDefs(svg);

    const box = { x: 76, y: 74, w: 540, h: 248 };
    addTopCrateFrame(svg, box);
    addMeasure(svg, { x1: box.x, y1: 40, x2: box.x + box.w, y2: 40, label: `${fmt.format(s.boxLength)} мм`, labelX: box.x + box.w / 2, labelY: 30, orientation: 'horizontal' });
    addMeasure(svg, { x1: 34, y1: box.y, x2: 34, y2: box.y + box.h, label: `${fmt.format(s.boxWidth)} мм`, labelX: 22, labelY: box.y + box.h / 2, orientation: 'vertical' });

    const drawX = Math.min(s.x, MAX_DRAW);
    const drawY = Math.min(s.y, MAX_DRAW);
    const padX = 24;
    const padY = 24;
    const cellW = (box.w - padX * 2) / drawX;
    const cellH = (box.h - padY * 2) / drawY;
    const radius = Math.max(6, Math.min(cellW, cellH) * 0.42);

    for (let row = 0; row < drawY; row += 1) {
      for (let col = 0; col < drawX; col += 1) {
        const cx = box.x + padX + cellW * (col + 0.5);
        const cy = box.y + padY + cellH * (row + 0.5);
        svg.append(svgEl('circle', {
          cx,
          cy,
          r: radius,
          fill: 'url(#partGradient)',
          stroke: '#99a4af',
          'stroke-width': 1.2
        }));
        svg.append(svgEl('ellipse', {
          cx: cx - radius * 0.2,
          cy: cy - radius * 0.25,
          rx: radius * 0.26,
          ry: radius * 0.16,
          fill: '#ffffff',
          opacity: 0.42
        }));
      }
    }

    if (s.x > MAX_DRAW || s.y > MAX_DRAW) {
      const hidden = s.x * s.y - drawX * drawY;
      const badge = svgEl('g');
      badge.append(svgEl('circle', { cx: box.x + box.w - 34, cy: box.y + 32, r: 22, fill: '#126ae6' }));
      const text = svgEl('text', { x: box.x + box.w - 34, y: box.y + 38, fill: '#fff', 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800 });
      text.textContent = `+${hidden}`;
      badge.append(text);
      svg.append(badge);
    }

    els.topProjection.replaceChildren(svg);
  }

  function drawSideView({ horizontal, vertical, horizontalLabel, verticalLabel, target, isEnd = false }) {
    const svg = svgEl('svg', { viewBox: '0 0 580 290', preserveAspectRatio: 'xMidYMid meet' });
    ensureDefs(svg);

    const box = { x: 68, y: 62, w: 430, h: 168 };
    if (isEnd) addEndCrateFrame(svg, box);
    else addFrontCrateFrame(svg, box);

    addMeasure(svg, { x1: box.x, y1: 34, x2: box.x + box.w, y2: 34, label: horizontalLabel, labelX: box.x + box.w / 2, labelY: 24, orientation: 'horizontal' });
    addMeasure(svg, { x1: 38, y1: box.y, x2: 38, y2: box.y + box.h, label: verticalLabel, labelX: 24, labelY: box.y + box.h / 2, orientation: 'vertical' });

    const drawH = Math.min(horizontal, MAX_DRAW);
    const drawV = Math.min(vertical, MAX_DRAW);
    const padX = 18;
    const padY = 20;
    const cellW = (box.w - padX * 2) / drawH;
    const cellH = (box.h - padY * 2) / drawV;
    const partW = Math.max(6, cellW * 0.78);
    const partH = Math.max(6, cellH * 0.74);
    const rx = Math.min(9, partH * 0.24);

    for (let row = 0; row < drawV; row += 1) {
      for (let col = 0; col < drawH; col += 1) {
        const x = box.x + padX + col * cellW + (cellW - partW) / 2;
        const y = box.y + box.h - padY - (row + 1) * cellH + (cellH - partH) / 2;
        svg.append(svgEl('rect', {
          x,
          y,
          width: partW,
          height: partH,
          rx,
          fill: 'url(#partGradient)',
          stroke: '#99a4af',
          'stroke-width': 1
        }));
        svg.append(svgEl('ellipse', {
          cx: x + partW / 2,
          cy: y + Math.max(3, partH * 0.18),
          rx: partW * 0.42,
          ry: Math.max(2, partH * 0.12),
          fill: '#ffffff',
          opacity: 0.58
        }));
      }
    }

    target.replaceChildren(svg);
  }

  function pluralRows(n) {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return 'ряд';
    if ([2, 3, 4].includes(n10) && ![12, 13, 14].includes(n100)) return 'ряда';
    return 'рядов';
  }

  function setTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    els.themeDark.classList.toggle('is-active', next === 'dark');
    els.themeLight.classList.toggle('is-active', next === 'light');
  }

  function getPresets() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.slice(0, 12) : [];
    } catch {
      return [];
    }
  }

  function setPresets(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 12)));
    renderPresets();
  }

  function loadPreset(preset) {
    applyStateToInputs({
      boxLength: preset.boxLength,
      boxWidth: preset.boxWidth,
      boxHeight: preset.boxHeight,
      partDiameter: preset.partDiameter,
      partHeight: preset.partHeight,
      x: preset.x,
      y: preset.y,
      z: preset.z
    });
    els.presetName.value = preset.title;
    update();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deletePreset(id) {
    setPresets(getPresets().filter((item) => item.id !== id));
  }

  function savePreset() {
    const s = state();
    const title = (els.presetName.value || `${s.partDiameter} × ${s.partHeight}`).trim().slice(0, 32);
    const items = getPresets().filter((item) => item.title !== title);
    items.unshift({
      id: Date.now(),
      title,
      boxLength: s.boxLength,
      boxWidth: s.boxWidth,
      boxHeight: s.boxHeight,
      partDiameter: s.partDiameter,
      partHeight: s.partHeight,
      x: s.x,
      y: s.y,
      z: s.z
    });
    setPresets(items);
  }

  function renderPresets() {
    const presets = getPresets();
    els.quickPresets.replaceChildren();

    const current = state();
    const currentTitle = `${current.partDiameter} × ${current.partHeight}`;

    if (!presets.length) {
      const seed = [
        { id: 1, title: '50 × 20', boxLength: 600, boxWidth: 400, boxHeight: 280, partDiameter: 50, partHeight: 20, x: 9, y: 5, z: 4 },
        { id: 2, title: '50 × 30', boxLength: 600, boxWidth: 400, boxHeight: 280, partDiameter: 50, partHeight: 30, x: 9, y: 5, z: 3 },
        { id: 3, title: '40 × 20', boxLength: 600, boxWidth: 400, boxHeight: 280, partDiameter: 40, partHeight: 20, x: 12, y: 8, z: 4 },
        { id: 4, title: '40 × 20', boxLength: 600, boxWidth: 400, boxHeight: 280, partDiameter: 40, partHeight: 20, x: 12, y: 13, z: 4 },
        { id: 5, title: '30 × 20', boxLength: 600, boxWidth: 400, boxHeight: 280, partDiameter: 30, partHeight: 20, x: 19, y: 13, z: 4 }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return renderPresets();
    }

    presets.forEach((preset) => {
      const node = els.quickPresetTemplate.content.firstElementChild.cloneNode(true);
      const total = preset.x * preset.y * preset.z;
      node.querySelector('.quick-card-title').textContent = preset.title;
      node.querySelector('.quick-card-layout').textContent = `${preset.x} × ${preset.y} × ${preset.z}`;
      node.querySelector('.quick-card-total').textContent = `${fmt.format(total)} шт`;
      if (preset.title === currentTitle && preset.x === current.x && preset.y === current.y && preset.z === current.z) {
        node.classList.add('is-selected');
      }
      node.addEventListener('click', () => loadPreset(preset));
      const remove = node.querySelector('.quick-card-delete');
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        deletePreset(preset.id);
      });
      remove.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          deletePreset(preset.id);
        }
      });
      els.quickPresets.append(node);
    });
  }

  function updateStatus(gaps) {
    const fits = gaps.length >= 0 && gaps.width >= 0 && gaps.height >= 0;
    els.fitStatus.classList.toggle('is-fit', fits);
    els.fitStatus.classList.toggle('is-overflow', !fits);
    els.statusText.textContent = fits ? 'Детали помещаются' : 'Детали не помещаются';
    document.querySelector('.status-dot').textContent = fits ? '✓' : '!';
  }

  function update() {
    const s = state();
    applyStateToInputs(s);

    const perLayer = s.x * s.y;
    const total = perLayer * s.z;
    const gaps = {
      length: Math.round((s.boxLength - s.x * s.partDiameter) * 100) / 100,
      width: Math.round((s.boxWidth - s.y * s.partDiameter) * 100) / 100,
      height: Math.round((s.boxHeight - s.z * s.partHeight) * 100) / 100
    };

    els.totalCount.textContent = fmt.format(total);
    els.resultFormula.textContent = `(${s.x} × ${s.y} × ${s.z})`;
    els.infoBoxSize.textContent = `${fmt.format(s.boxLength)} × ${fmt.format(s.boxWidth)} × ${fmt.format(s.boxHeight)} мм`;
    els.infoPartSize.textContent = `Ø${fmt.format(s.partDiameter)} × ${fmt.format(s.partHeight)} мм`;
    els.infoLayout.textContent = `${s.x} × ${s.y} × ${s.z}`;
    els.infoPerLayer.textContent = `${fmt.format(perLayer)} шт`;
    els.infoLayers.textContent = `${fmt.format(s.z)}`;
    els.infoTotal.textContent = `${fmt.format(total)} шт`;
    els.gapLength.textContent = `${fmt.format(gaps.length)} мм`;
    els.gapWidth.textContent = `${fmt.format(gaps.width)} мм`;
    els.gapHeight.textContent = `${fmt.format(gaps.height)} мм`;

    els.topCaption.textContent = `${s.x} шт в длину × ${s.y} шт в ширину (${fmt.format(perLayer)} шт в слое)`;
    els.sideCaption.textContent = `${s.x} шт в длину × ${s.z} ${pluralRows(s.z)} в высоту`;
    els.endCaption.textContent = `${s.y} шт в ширину × ${s.z} ${pluralRows(s.z)} в высоту`;

    if (!els.presetName.matches(':focus')) {
      els.presetName.value = `${s.partDiameter} × ${s.partHeight}`;
    }

    updateStatus(gaps);
    drawTopView(s);
    drawSideView({ horizontal: s.x, vertical: s.z, horizontalLabel: `${fmt.format(s.boxLength)} мм`, verticalLabel: `${fmt.format(s.boxHeight)} мм`, target: els.sideProjection });
    drawSideView({ horizontal: s.y, vertical: s.z, horizontalLabel: `${fmt.format(s.boxWidth)} мм`, verticalLabel: `${fmt.format(s.boxHeight)} мм`, target: els.endProjection, isEnd: true });

    renderPresets();
  }

  function resetAll() {
    applyStateToInputs({
      boxLength: defaults.boxLength,
      boxWidth: defaults.boxWidth,
      boxHeight: defaults.boxHeight,
      partDiameter: defaults.partDiameter,
      partHeight: defaults.partHeight,
      x: defaults.countX,
      y: defaults.countY,
      z: defaults.countZ
    });
    els.presetName.value = '50 × 20';
    update();
  }

  function updateOnlineState() {
    els.offlineState.textContent = navigator.onLine ? 'Готов к офлайн-работе' : 'Офлайн-режим активен';
  }

  [
    els.boxLength,
    els.boxWidth,
    els.boxHeight,
    els.partDiameter,
    els.partHeight,
    els.countX,
    els.countY,
    els.countZ
  ].forEach((input) => input.addEventListener('input', update));

  document.querySelectorAll('[data-step-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.stepTarget);
      const next = sanitizeInt(input.value, 1) + Number(button.dataset.step || 0);
      input.value = Math.max(1, next);
      update();
    });
  });

  els.savePreset.addEventListener('click', savePreset);
  els.resetButton.addEventListener('click', resetAll);
  els.themeDark.addEventListener('click', () => { setTheme('dark'); update(); });
  els.themeLight.addEventListener('click', () => { setTheme('light'); update(); });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installButton.classList.remove('is-hidden');
  });

  els.installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installButton.classList.add('is-hidden');
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

  const savedTheme = localStorage.getItem(THEME_KEY);
  setTheme(savedTheme || 'light');
  updateOnlineState();
  update();
})();
