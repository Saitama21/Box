export const SQRT3_OVER_2 = Math.sqrt(3) / 2;

export function normalizePositive(value, max = 3000) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(max, Math.round(n * 100) / 100);
}

export function normalizeCount(value, max = 999) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(max, n);
}

export function computeBox(state, mode = 'straight') {
  const d = normalizePositive(state?.d);
  const h = normalizePositive(state?.h);
  const x = normalizeCount(state?.x);
  const y = normalizeCount(state?.y);
  const zRaw = state?.z === null || state?.z === undefined || String(state.z).trim() === '' ? null : normalizeCount(state.z);

  if (d === null || h === null || x === null || y === null || (state?.z != null && String(state.z).trim() !== '' && zRaw === null)) {
    return { valid: false };
  }

  const z = zRaw ?? 1;
  const staggered = mode === 'staggered' && y > 1;
  const length = x * d + (staggered ? d / 2 : 0);
  const width = staggered ? d + (y - 1) * d * SQRT3_OVER_2 : y * d;
  const height = z * h;
  const total = x * y * z;

  return {
    valid: true,
    d, h, x, y,
    z: zRaw,
    layers: z,
    mode: staggered ? 'staggered' : 'straight',
    length,
    width,
    height,
    total,
    perLayer: x * y
  };
}

export function layerLabel(layers) {
  if (layers === 1) return '1 слой';
  if (layers >= 2 && layers <= 4) return `${layers} слоя`;
  return `${layers} слоёв`;
}

export function layoutText(result) {
  if (!result?.valid) return '—';
  return result.z === null ? `${result.x} × ${result.y}` : `${result.x} × ${result.y} × ${result.z}`;
}
