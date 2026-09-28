# ProstoPay Quick Access

Одноэкранная offline-first PWA для быстрого перехода к странице оплаты:

https://pay.prostopay.net/40133634/select

## Архитектура

- HTML/CSS — интерфейс, адаптивность и доступность.
- WebGL2 + GLSL — только главная Liquid Glass кнопка.
- CSS fallback — если WebGL2 недоступен.
- Service Worker — офлайн-загрузка оболочки приложения.
- Без Three.js и runtime-зависимостей.

## Производительность

- devicePixelRatio WebGL ограничен до 2.
- Canvas рисуется только когда кнопка видима.
- prefers-reduced-motion отключает временную анимацию шейдера.
- Платёжная страница не кэшируется и открывается напрямую у ProstoPay.
