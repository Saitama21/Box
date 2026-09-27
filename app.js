import { MODULE_REGISTRY, SHELL_ROUTES, moduleIds, moduleMeta, resolveView, isShellRoute } from './modules/module-registry.mjs';

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

  function setActiveView(target) {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('is-active', view.dataset.view === target);
    });
  }

  function syncDock(route = '') {
    document.querySelectorAll('.dock-item').forEach(button => {
      button.classList.toggle('is-active', button.dataset.route === route);
    });
  }

  function activateRoute(route, { updateHistory = false } = {}) {
    const target = isShellRoute(route) ? route : 'home';
    setActiveView(target);
    syncDock(target);
    app.dataset.route = target;
    delete app.dataset.module;

    if (updateHistory) {
      history.replaceState({ route: target }, '', location.pathname + location.search + (target === 'home' ? '' : '#route='+target));
    }

    window.dispatchEvent(new CustomEvent('cnc-route-opened',{detail:{route:target}}));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openModule(key, { updateHistory = true } = {}) {
    const meta = moduleMeta(key);
    if (!meta) return false;

    const targetView = resolveView(key);
    if (!document.querySelector(`.view[data-view="${CSS.escape(targetView)}"]`)) {
      moduleEyebrow.textContent = meta.eyebrow;
      moduleTitle.textContent = meta.title;
      moduleDescription.textContent = meta.description;
      moduleShellIcon.className = 'module-shell-icon';
      moduleShellIcon.dataset.module = key;
      setActiveView('module');
      app.dataset.route = 'module';
    } else {
      setActiveView(targetView);
      app.dataset.route = targetView;
    }

    syncDock('');
    app.dataset.module = key;

    if (updateHistory) {
      history.replaceState({ module: key }, '', '#'+key);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('cnc-module-opened',{detail:{id:key,view:targetView}}));
    return true;
  }

  function routeFromLocation() {
    const hash = location.hash.replace(/^#/,'');
    if (MODULE_REGISTRY[hash]) return { type:'module', value:hash };
    if (hash.startsWith('route=')) {
      const route = hash.slice(6);
      if (SHELL_ROUTES.includes(route)) return { type:'route', value:route };
    }
    return { type:'route', value:'home' };
  }

  function applyLocation() {
    const target = routeFromLocation();
    if (target.type === 'module') openModule(target.value,{updateHistory:false});
    else activateRoute(target.value,{updateHistory:false});
  }

  function updateConnectivity() {
    if (!offlineState) return;
    const label = offlineState.querySelector('span');

    if (!navigator.onLine) {
      offlineState.classList.remove('is-ready');
      offlineState.classList.add('is-offline');
      if (label) label.textContent = 'Офлайн';
      return;
    }

    offlineState.classList.remove('is-offline');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        offlineState.classList.add('is-ready');
        if (label) label.textContent = 'Готово офлайн';
      }).catch(() => {
        offlineState.classList.remove('is-ready');
        if (label) label.textContent = 'Онлайн';
      });
    } else if (label) {
      label.textContent = 'Онлайн';
    }
  }

  document.querySelectorAll('[data-module]').forEach(button => {
    button.addEventListener('click', () => openModule(button.dataset.module));
  });

  document.querySelectorAll('.dock-item').forEach(button => {
    button.addEventListener('click', () => activateRoute(button.dataset.route,{updateHistory:true}));
  });

  document.querySelectorAll('[data-route-button]').forEach(button => {
    button.addEventListener('click', () => activateRoute(button.dataset.routeButton,{updateHistory:true}));
  });

  if (backButton) {
    backButton.addEventListener('click', () => activateRoute('home',{updateHistory:true}));
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  }

  window.addEventListener('online', updateConnectivity, { passive: true });
  window.addEventListener('offline', updateConnectivity, { passive: true });
  window.addEventListener('hashchange', applyLocation, { passive: true });

  const savedTheme = localStorage.getItem(THEME_KEY) || document.documentElement.dataset.theme || 'dark';
  setTheme(savedTheme);
  updateConnectivity();

  window.CNCShell = Object.freeze({
    openModule,
    activateRoute,
    moduleIds,
    modules: MODULE_REGISTRY,
    shellRoutes: SHELL_ROUTES
  });

  applyLocation();
})();
