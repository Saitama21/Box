(() => {
  'use strict';

  const LAST_KEY = 'box-pwa-last-v1';
  const MODE_KEY = 'box-pwa-pack-mode-v1';
  const MAX_COUNT = 999;
  const SQRT3_OVER_2 = Math.sqrt(3) / 2;
  const $ = id => document.getElementById(id);

  const els = {
    d: $('partDiameter'), h: $('partHeight'), x: $('countX'), y: $('countY'), z: $('countZ'),
    calculateButton: $('calculateButton'), newButton: $('newButton'), copyButton: $('copyButton'),
    totalCount: $('totalCount'), miniTotal: $('miniTotal'),
    topSize: $('topSize'), sideSize: $('sideSize'), endSize: $('endSize'), previewLabel: $('previewLabel'),
    topProjection: $('topProjection'), sideProjection: $('sideProjection'), endProjection: $('endProjection'), isoProjection: $('isoProjection'),
    resultLayout: $('resultLayout'), resultBlock: $('resultBlock'), miniFormula: $('miniFormula')
  };

  if (!els.d || !els.x || !els.topProjection) return;

  const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const intFmt = new Intl.NumberFormat('ru-RU');
  let mode = readMode();
  let zOptional = String(els.z.value || '').trim() === '';
  let copyTimer = 0;
  let saveTimer = 0;
  let proxyRestoreQueued = false;
  let proxyingZ = false;

  function num(input) {
    const n = Number(String(input.value || '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function integer(input) {
    const raw = String(input.value || '').trim();
    if (!raw) return null;
    const n = Math.trunc(Number(raw));
    return Number.isFinite(n) && n >= 1 ? Math.min(MAX_COUNT, n) : null;
  }

  function state() {
    return {
      d: num(els.d),
      h: num(els.h),
      x: integer(els.x),
      y: integer(els.y),
      z: zOptional ? null : integer(els.z)
    };
  }

  function layers(s) {
    return s.z ?? 1;
  }

  function complete(s) {
    return s.d !== null && s.h !== null && s.x !== null && s.y !== null;
  }

  function layoutText(s) {
    return s.z === null ? `${s.x} × ${s.y}` : `${s.x} × ${s.y} × ${s.z}`;
  }

  function layerLabel(s) {
    const z = layers(s);
    if (z === 1) return '1 слой';
    if (z >= 2 && z <= 4) return `${z} слоя`;
    return `${z} слоёв`;
  }

  function dimensions(s) {
    const staggered = mode === 'staggered' && s.y > 1;
    return {
      length: s.x * s.d + (staggered ? s.d / 2 : 0),
      width: staggered ? s.d + (s.y - 1) * s.d * SQRT3_OVER_2 : s.y * s.d,
      height: layers(s) * s.h
    };
  }

  function readMode() {
    try { return localStorage.getItem(MODE_KEY) === 'staggered' ? 'staggered' : 'straight'; }
    catch (_) { return 'straight'; }
  }

  function saveMode() {
    try { localStorage.setItem(MODE_KEY, mode); } catch (_) {}
  }

  function restoreLast() {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
      if (!saved) {
        zOptional = String(els.z.value || '').trim() === '';
        return;
      }
      const pairs = [[els.d, saved.d], [els.h, saved.h], [els.x, saved.x], [els.y, saved.y]];
      for (const [input, value] of pairs) {
        if (value !== undefined && value !== null && value !== '') input.value = value;
      }
      if (saved.z !== undefined && saved.z !== null && saved.z !== '') {
        els.z.value = saved.z;
        zOptional = false;
      } else {
        els.z.value = '';
        zOptional = true;
      }
    } catch (_) {
      zOptional = String(els.z.value || '').trim() === '';
    }
  }

  function saveLast() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const s = state();
      if (!complete(s)) return;
      try { localStorage.setItem(LAST_KEY, JSON.stringify(s)); } catch (_) {}
    }, 120);
  }

  function clearLast() {
    clearTimeout(saveTimer);
    try { localStorage.removeItem(LAST_KEY); } catch (_) {}
  }

  function installOptionalZProxy() {
    const watched = new Set([els.d, els.h, els.x, els.y, els.z]);
    const proxy = event => {
      if (!watched.has(event.target)) return;
      if (event.target === els.z && !proxyingZ) zOptional = String(els.z.value || '').trim() === '';
      if (!zOptional) return;

      els.z.value = '1';
      proxyingZ = true;
      if (proxyRestoreQueued) return;
      proxyRestoreQueued = true;
      queueMicrotask(() => {
        proxyRestoreQueued = false;
        proxyingZ = false;
        if (zOptional) els.z.value = '';
        scheduleRefresh();
      });
    };
    document.addEventListener('input', proxy, true);
    document.addEventListener('change', proxy, true);
  }

  function createStepper(input) {
    const label = input.closest('label');
    if (!label || label.querySelector('.count-adjust')) return;

    const wrap = document.createElement('div');
    wrap.className = 'count-adjust';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'count-step';
    minus.setAttribute('aria-label', 'Уменьшить');
    minus.textContent = '−';
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'count-step';
    plus.setAttribute('aria-label', 'Увеличить');
    plus.textContent = '+';

    input.before(wrap);
    wrap.append(minus, input, plus);

    const bump = delta => {
      const isZ = input === els.z;
      const current = isZ && zOptional ? 1 : (integer(input) ?? 1);
      const next = Math.max(1, Math.min(MAX_COUNT, current + delta));

      if (isZ && next === 1) {
        zOptional = true;
        input.value = '';
      } else {
        if (isZ) zOptional = false;
        input.value = next;
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus({ preventScroll: true });
    };
    minus.addEventListener('click', () => bump(-1));
    plus.addEventListener('click', () => bump(1));
  }

  function createPackingSwitch() {
    const section = els.x.closest('.control-section');
    const grid = els.x.closest('.field-grid');
    if (!section || !grid || section.querySelector('.packing-control')) return;

    const block = document.createElement('div');
    block.className = 'packing-control';
    block.innerHTML = `
      <div class="packing-caption"><span>Схема укладки</span><small id="packingNote"></small></div>
      <div class="packing-switch" role="group" aria-label="Схема укладки">
        <button type="button" data-pack="straight">Ровная</button>
        <button type="button" data-pack="staggered">Шахматная</button>
      </div>`;
    grid.before(block);

    block.querySelectorAll('[data-pack]').forEach(button => {
      button.addEventListener('click', () => {
        mode = button.dataset.pack === 'staggered' ? 'staggered' : 'straight';
        saveMode();
        updatePackingButtons();
        triggerCoreRender();
      });
    });
  }

  function updatePackingButtons() {
    document.querySelectorAll('[data-pack]').forEach(button => {
      const active = button.dataset.pack === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const note = $('packingNote');
    if (note) note.textContent = mode === 'staggered' ? 'ряды смещены на ½ Ø' : 'ряды без смещения';
  }

  function metalDefs() {
    return `
      <defs>
        <radialGradient id="enh-top" cx="34%" cy="26%" r="78%">
          <stop offset="0%" stop-color="#fff"/><stop offset="28%" stop-color="#eef2f4"/>
          <stop offset="62%" stop-color="#c7d0d5"/><stop offset="100%" stop-color="#7a858d"/>
        </radialGradient>
        <filter id="enh-shadow" x="-30%" y="-40%" width="160%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#15252d" flood-opacity=".22"/>
        </filter>
      </defs>`;
  }

  function drawStaggeredTop(s) {
    const dims = dimensions(s);
    const viewW = 640, viewH = 300;
    const maxW = 470, maxH = 175;
    const scale = Math.min(maxW / dims.length, maxH / dims.width);
    const d = Math.max(.3, s.d * scale);
    const rowPitch = d * SQRT3_OVER_2;
    const w = dims.length * scale;
    const h = dims.width * scale;
    const x0 = 95 + (maxW - w) / 2;
    const y0 = 86 + (maxH - h) / 2;
    const maxVisible = 1200;
    let drawn = 0;
    let circles = '';

    outer: for (let y = 0; y < s.y; y++) {
      const offset = y % 2 ? d / 2 : 0;
      const cy = y0 + d / 2 + y * rowPitch;
      for (let x = 0; x < s.x; x++) {
        if (drawn >= maxVisible) break outer;
        const cx = x0 + d / 2 + offset + x * d;
        circles += `<g filter="url(#enh-shadow)"><circle cx="${cx}" cy="${cy}" r="${Math.max(.2, d / 2 - Math.min(1.1, d * .04))}" fill="url(#enh-top)" stroke="#68757d" stroke-width="${Math.max(.25, Math.min(.9, d * .022))}"/>`;
        if (d > 12) circles += `<ellipse cx="${cx - d * .12}" cy="${cy - d * .14}" rx="${d * .11}" ry="${d * .07}" fill="#fff" fill-opacity=".5"/>`;
        circles += '</g>';
        drawn++;
      }
    }

    const total = s.x * s.y;
    const note = drawn < total
      ? `шахматная · показано ${intFmt.format(drawn)} из ${intFmt.format(total)} шт. в слое`
      : `шахматная · ${s.x} × ${s.y} = ${intFmt.format(total)} шт. в одном слое`;

    els.topProjection.innerHTML = `
      <svg viewBox="0 0 ${viewW} ${viewH}" preserveAspectRatio="xMidYMid meet" aria-label="Шахматная укладка, вид сверху">
        ${metalDefs()}
        <g opacity=".23" stroke="#71868f" stroke-width=".55">
          ${Array.from({length:18},(_,i)=>`<line x1="${88+i*28}" y1="73" x2="${88+i*28}" y2="269"/>`).join('')}
          ${Array.from({length:8},(_,i)=>`<line x1="87" y1="${73+i*28}" x2="579" y2="${73+i*28}"/>`).join('')}
        </g>
        <rect x="${x0-5}" y="${y0-5}" width="${w+10}" height="${h+10}" rx="8" fill="#81939b" fill-opacity=".07" stroke="#6f828b" stroke-opacity=".18"/>
        ${circles}
        <line x1="${x0}" y1="48" x2="${x0+w}" y2="48" stroke="#3b6076" stroke-width="1.4"/>
        <text x="${x0+w/2}" y="37" text-anchor="middle" class="dim-text">${fmt.format(dims.length)} мм</text>
        <line x1="55" y1="${y0}" x2="55" y2="${y0+h}" stroke="#3b6076" stroke-width="1.4"/>
        <text x="40" y="${y0+h/2}" text-anchor="middle" class="dim-text" transform="rotate(-90 40 ${y0+h/2})">${fmt.format(dims.width)} мм</text>
        <text x="320" y="286" text-anchor="middle" class="dim-note">${note}</text>
      </svg>`;
  }

  function patchProjectionNotes(s, dims) {
    const sideTexts = els.sideProjection.querySelectorAll('text.dim-text');
    const endTexts = els.endProjection.querySelectorAll('text.dim-text');
    if (sideTexts[0]) sideTexts[0].textContent = `${fmt.format(dims.length)} мм · габарит X`;
    if (endTexts[0]) endTexts[0].textContent = `${fmt.format(dims.width)} мм · габарит Y`;
    if (sideTexts[1]) sideTexts[1].textContent = `${fmt.format(dims.height)} мм · ${layerLabel(s)}`;
    if (endTexts[1]) endTexts[1].textContent = `${fmt.format(dims.height)} мм · ${layerLabel(s)}`;

    const sideTitle = els.sideProjection.closest('.projection-card')?.querySelector('h3 span');
    const endTitle = els.endProjection.closest('.projection-card')?.querySelector('h3 span');
    if (sideTitle) sideTitle.textContent = s.z === null ? '(X × 1 слой)' : '(X × Z)';
    if (endTitle) endTitle.textContent = s.z === null ? '(Y × 1 слой)' : '(Y × Z)';

    const isoNote = els.isoProjection.querySelector('text.dim-note');
    if (isoNote) {
      isoNote.textContent = `${mode === 'staggered' ? 'шахматная' : 'ровная'} · ${layoutText(s)} · ${layerLabel(s)} · блок ${fmt.format(dims.length)} × ${fmt.format(dims.width)} × ${fmt.format(dims.height)} мм`;
    }
  }

  function refreshPacking() {
    const s = state();
    updatePackingButtons();

    if (!complete(s)) {
      if (els.calculateButton) els.calculateButton.disabled = true;
      if (els.copyButton) els.copyButton.disabled = true;
      return;
    }

    const dims = dimensions(s);
    const z = layers(s);
    const total = s.x * s.y * z;

    if (els.calculateButton) els.calculateButton.disabled = false;
    if (els.copyButton) els.copyButton.disabled = false;
    if (els.totalCount) els.totalCount.textContent = intFmt.format(total);
    if (els.miniTotal) els.miniTotal.textContent = intFmt.format(total);

    els.topSize.textContent = `${fmt.format(dims.length)} × ${fmt.format(dims.width)} мм`;
    els.sideSize.textContent = `${fmt.format(dims.length)} × ${fmt.format(dims.height)} мм`;
    els.endSize.textContent = `${fmt.format(dims.width)} × ${fmt.format(dims.height)} мм`;
    els.previewLabel.textContent = `${intFmt.format(total)} деталей · ${layerLabel(s)}`;
    els.resultLayout.textContent = `Укладка: ${layoutText(s)} · ${layerLabel(s)} · ${mode === 'staggered' ? 'шахматная' : 'ровная'} · в слое ${intFmt.format(s.x * s.y)} шт`;
    els.resultBlock.textContent = `Габариты блока: ${fmt.format(dims.length)} × ${fmt.format(dims.width)} × ${fmt.format(dims.height)} мм`;
    els.miniFormula.textContent = `${layoutText(s)} · ${layerLabel(s)}`;

    if (mode === 'staggered') drawStaggeredTop(s);
    patchProjectionNotes(s, dims);
  }

  function scheduleRefresh() {
    requestAnimationFrame(() => requestAnimationFrame(refreshPacking));
  }

  function triggerCoreRender() {
    els.x.dispatchEvent(new Event('input', { bubbles: true }));
    scheduleRefresh();
  }

  async function copyCurrent() {
    const s = state();
    if (!complete(s)) return;
    const dims = dimensions(s);
    const z = layers(s);
    const layout = s.z === null ? `${s.x}×${s.y} (1 слой)` : `${s.x}×${s.y}×${s.z}`;
    const text = `Деталь Ø${fmt.format(s.d)}×${fmt.format(s.h)} мм | Укладка ${layout} (${mode === 'staggered' ? 'шахматная' : 'ровная'}) | Всего ${intFmt.format(s.x * s.y * z)} шт | Габариты ${fmt.format(dims.length)}×${fmt.format(dims.width)}×${fmt.format(dims.height)} мм`;
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
    const label = els.copyButton?.querySelector('b');
    if (copied && label) {
      clearTimeout(copyTimer);
      label.textContent = 'Скопировано ✓';
      els.copyButton.classList.add('is-copied');
      copyTimer = setTimeout(() => {
        label.textContent = 'Скопировать';
        els.copyButton.classList.remove('is-copied');
      }, 1800);
    }
  }

  restoreLast();
  installOptionalZProxy();
  createPackingSwitch();
  [els.x, els.y, els.z].forEach(createStepper);
  updatePackingButtons();

  [els.d, els.h, els.x, els.y, els.z].forEach(input => {
    input.addEventListener('input', () => { saveLast(); scheduleRefresh(); });
    input.addEventListener('change', () => { saveLast(); scheduleRefresh(); });
  });

  els.newButton?.addEventListener('click', () => {
    clearLast();
    zOptional = true;
    els.z.value = '';
    mode = 'straight';
    saveMode();
    updatePackingButtons();
    scheduleRefresh();
  });

  els.copyButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    copyCurrent();
  }, true);

  triggerCoreRender();
})();
