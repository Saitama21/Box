# CNC Copilot — unified offline PWA

Единая offline-first CNC-система, которая объединяет существующие приложения без уничтожения их расчётной логики и локальных данных.

## Архитектура

- корень репозитория — единая оболочка CNC Copilot;
- `modules/module-registry.mjs` — единый реестр CNC-модулей и их маршрутов;
- `modules/machine-store.mjs` — единый профиль станка с сохранением ключа `cncFullMachineV1`;
- расчётные ядра (`*-core.mjs`) отделены от интерфейса;
- Projects не создаёт вторую копию данных: он агрегирует существующие хранилища модулей;
- `modules/workspace-store.mjs` хранит только текущую рабочую деталь и связывает результаты модулей в один техпроцесс;
- исходный Box сохранён в `legacy-box/` до завершения миграции и регрессии;
- GitHub Pages публикует новую оболочку из корня.

## Модули

1. Режимы обработки / CNC Reference
2. Цеховые расчёты / CutCalc CNC
3. Укладка заготовок / Box
4. CNC Geometry
5. CNC Copilot / Напарник
6. Справочник G/M-кодов
7. Общий инструментальный шкаф
8. Projects / сводка локальных данных
9. Общий профиль станка
10. Сквозной Workflow / текущая деталь

## Данные

Сохраняются существующие контракты, чтобы миграция не обнуляла пользовательские данные:

- CNC Reference: IndexedDB `operating-modes-828d`;
- Machine profile: `cncFullMachineV1`;
- Tool cupboard: `cncFullToolsV2`;
- CutCalc history: `cutcalc.history.v3`;
- Geometry projects: `cnc-geometry-projects-v1`;
- Copilot route: `cnc-suite.copilot.route-v1`;
- Active workspace: `cnc-suite.workspace-v1`;
- Saved workspace library: `cnc-suite.saved-workspaces-v1`.

## UI contract — Bottom Dock

Dock принадлежит viewport приложения и не зависит от геометрии Safari:

```css
position: fixed;
left: 50%;
transform: translateX(-50%);
bottom: 2px;
width: 87%;
height: 68px;
```

`safe-area-inset-bottom` используется только для нижнего запаса контента и никогда не двигает dock.

## Offline-first

Критическая оболочка, модули, общие stores, Workflow и локальные WebP-ассеты входят в precache собственного Service Worker. После успешной первой загрузки основные рабочие разделы доступны без сети.

Новые визуальные PWA-иконки не добавляются автоматически: графические ассеты сначала утверждаются визуально, затем внедряются.

## Release gate

GitHub Pages deploy запускается только после:

```
node --test tests/*.test.mjs
```

Тесты защищают расчётные ядра, dock-контракт, offline app shell, реестр модулей, профиль станка и совместимость локальных данных.


## Saved Projects

Projects хранит отдельные снимки активного Workflow. При открытии сохранённой детали активный workspace восстанавливается, а Geometry, CutCalc, Box, CNC Reference, инструмент и CNC Co-Pilot подхватывают данные этого проекта при открытии соответствующего раздела.
