(() => {
  'use strict';

  const THEME_KEY = 'cnc-suite.theme';
  const app = document.getElementById('app');
  const offlineState = document.getElementById('offlineState');
  const themeToggle = document.getElementById('themeToggle');
  const toast = document.getElementById('toast');
  const backButton = document.getElementById('backButton');

  const moduleTitle = document.getElementById('moduleTitle');
  const moduleDescription = document.getElementById('moduleDescription');
  const moduleEyebrow = document.getElementById('moduleEyebrow');
  const moduleShellIcon = document.getElementById('moduleShellIcon');

  const modules = {
    modes: {
      eyebrow: 'МОЯ БАЗА · CNC REFERENCE',
      title: 'Режимы обработки',
      description: 'Проверенные режимы обработки, реальные детали, материалы и заметки. Исходный модуль будет перенесён без потери логики хранения записей.'
    },
    cutcalc: {
      eyebrow: 'CUT CALC CNC',
      title: 'Цеховые расчёты',
      description: 'Расход прутка, длина детали, отрезной рез, торцовка, количество и расчёт партии. Формулы останутся теми же, меняется только общая оболочка.'
    },
    box: {
      eyebrow: 'BOX · УКЛАДКА',
      title: 'Укладка заготовок',
      description: 'Количество деталей по X/Y/Z, габариты блока и технические проекции. Текущий Box сохранён отдельно и будет встроен сюда нативно после регрессии.'
    },
    geometry: {
      eyebrow: 'CNC GEOMETRY · FULL OFFLINE',
      title: 'Геометрия',
      description: 'Координаты, PCD, ось C, дуги, лепестки, пазы, куб, шар и другие геометрические расчёты — в общей системе.'
    },
    copilot: {
      eyebrow: 'CNC COPILOT',
      title: 'CNC Напарник',
      description: 'Маршрут обработки, инструмент, параметры станка и проверенные режимы. Модуль будет получать общие данные из профиля и остальных расчётов.'
    },
    codes: {
      eyebrow: 'SINUMERIK 828D · G/M',
      title: 'Справочник кодов',
      description: 'G-коды, M-коды, поиск, категории и избранное. Справочник останется полностью доступным без интернета.'
    }
  };

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  function setTheme(theme, announce = false) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    if (themeToggle) {
      themeToggle.textContent = next === 'dark' ? '☀︎' : '◐';
      themeToggle.setAttribute('aria-label', next === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    }
    if (announce) showToast(next === 'dark' ? 'Тёмная тема' : 'Светлая тема');
  }

  function activateRoute(route) {
    const target = ['home', 'tools', 'projects', 'profile'].includes(route) ? route : 'home';
    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('is-active', view.dataset.view === target);
    });
    document.querySelectorAll('.dock-item').forEach(button => {
      button.classList.toggle('is-active', button.dataset.route === target);
    });
    app.dataset.route = target;
    delete app.dataset.module;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openModule(key) {
    const meta = modules[key];
    if (!meta) return;

    const targetView = key === 'box' ? 'box' : key === 'modes' ? 'modes' : key === 'cutcalc' ? 'cutcalc' : key === 'geometry' ? 'geometry' : key === 'copilot' ? 'copilot' : 'module';

    if (targetView === 'module') {
      moduleEyebrow.textContent = meta.eyebrow;
      moduleTitle.textContent = meta.title;
      moduleDescription.textContent = meta.description;
      moduleShellIcon.className = 'module-shell-icon';
      moduleShellIcon.dataset.module = key;
    }

    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('is-active', view.dataset.view === targetView);
    });
    document.querySelectorAll('.dock-item').forEach(button => {
      button.classList.remove('is-active');
    });
    app.dataset.route = targetView;
    app.dataset.module = key;
    history.replaceState({ module: key }, '', '#'+key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateConnectivity() {
    if (!offlineState) return;
    if (!navigator.onLine) {
      offlineState.classList.remove('is-ready');
      offlineState.classList.add('is-offline');
      offlineState.querySelector('span').textContent = 'Офлайн';
      return;
    }

    offlineState.classList.remove('is-offline');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        offlineState.classList.add('is-ready');
        offlineState.querySelector('span').textContent = 'Готово офлайн';
      }).catch(() => {
        offlineState.classList.remove('is-ready');
        offlineState.querySelector('span').textContent = 'Онлайн';
      });
    } else {
      offlineState.querySelector('span').textContent = 'Онлайн';
    }
  }

  document.querySelectorAll('[data-module]').forEach(button => {
    button.addEventListener('click', () => openModule(button.dataset.module));
  });

  document.querySelectorAll('.dock-item').forEach(button => {
    button.addEventListener('click', () => {
      history.replaceState({}, '', location.pathname + location.search);
      activateRoute(button.dataset.route);
    });
  });

  document.querySelectorAll('[data-route-button]').forEach(button => {
    button.addEventListener('click', () => activateRoute(button.dataset.routeButton));
  });

  if (backButton) {
    backButton.addEventListener('click', () => {
      history.replaceState({}, '', location.pathname + location.search);
      activateRoute('home');
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  }

  window.addEventListener('online', updateConnectivity, { passive: true });
  window.addEventListener('offline', updateConnectivity, { passive: true });

  const savedTheme = localStorage.getItem(THEME_KEY) || document.documentElement.dataset.theme || 'dark';
  setTheme(savedTheme);
  updateConnectivity();

  const hashModule = location.hash.slice(1);
  if (modules[hashModule]) openModule(hashModule);
  else activateRoute('home');
})();
