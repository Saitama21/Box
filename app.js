import { mountLiquidGlass } from './liquid-glass.js';

const PAYMENT_URL = 'https://pay.prostopay.net/40133634/select';
const canvas = document.querySelector('#liquidCanvas');
const payButton = document.querySelector('#payButton');
const shareButton = document.querySelector('#shareButton');
const toast = document.querySelector('#toast');

try {
  const renderer = mountLiquidGlass(canvas, payButton);
  if (!renderer) document.documentElement.classList.add('no-webgl');
} catch (error) {
  console.warn('Liquid Glass fallback enabled:', error);
  document.documentElement.classList.add('no-webgl');
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

shareButton.addEventListener('click', async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'ProstoPay', text: 'Быстрый переход к оплате', url: PAYMENT_URL });
      return;
    }
    await navigator.clipboard.writeText(PAYMENT_URL);
    showToast('Ссылка скопирована');
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Не удалось скопировать');
  }
});

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), {once:true});
}
