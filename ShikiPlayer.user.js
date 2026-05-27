// ==UserScript==
// @name            ShikiPlayer
// @description     видеоплеер для просмотра прямо на Shikimori
// @namespace       https://github.com/Onzis/ShikiPlayer
// @author          Onzis
// @license         GPL-3.0 license
// @version         1.75.7
// @homepageURL     https://github.com/Onzis/ShikiPlayer
// @updateURL       https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @downloadURL     https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @icon            https://github.com/Onzis/ShikiPlayer/blob/main/public/ico.png
// @grant           GM.xmlHttpRequest
// @connect         shikimori.io
// @connect         kodikapi.com
// @connect         apicollaps.cc
// @connect         api.kinobox.tv
// @connect         fbphdplay.top
// @connect         kp.apiget.ru
// @connect         apiget.ru
// @connect         api.alloha.tv
// @connect         api.apbugall.org
// @connect         theatre.stravers.live
// @match           *://shikimori.io/*
// @match           *://beggins-as.pljjalgo.online/*
// @match           *://beggins-as.allarknow.online/*
// @match           *://beggins-as.algonoew.online/*
// @run-at          document-end
// ==/UserScript==
/* jshint -W097 */
"use strict";

// --- INJECTION OF DARK THEME CSS ---
const darkThemeCSS = `
/* ==ShikiPlayer Dark Theme== */
:root {
  /* Основные цвета (Obsidian Modern) */
  --sp-bg-primary: #0b0c10;
  --sp-bg-secondary: #121319;
  --sp-bg-tertiary: #1c1e27;
  --sp-bg-hover: #262936;
  --sp-bg-active: #2e3242;

  /* Текстовые цвета */
  --sp-text-primary: #f1f3f9;
  --sp-text-secondary: #a0aec0;
  --sp-text-muted: #718096;
  --sp-text-inverse: #0b0c10;

  /* Акцентные цвета */
  --sp-accent: #3b82f6;
  --sp-accent-hover: #60a5fa;
  --sp-accent-active: #2563eb;
  --sp-accent-light: rgba(59, 130, 246, 0.15);

  /* Статусные цвета */
  --sp-success: #10b981;
  --sp-warning: #f59e0b;
  --sp-error: #ef4444;
  --sp-online: #10b981;
  --sp-offline: #718096;
  --sp-loading: #3b82f6;

  /* Границы */
  --sp-border-color: rgba(255, 255, 255, 0.08);
  --sp-border-light: rgba(255, 255, 255, 0.15);

  /* Радиусы и отступы */
  --sp-radius-sm: 4px;
  --sp-radius-md: 8px;
  --sp-radius-lg: 12px;
  --sp-radius-xl: 16px;
  --sp-spacing-xs: 4px;
  --sp-spacing-sm: 8px;
  --sp-spacing-md: 10px;
  --sp-spacing-lg: 24px;
  --sp-spacing-xl: 32px;

  /* Тени */
  --sp-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --sp-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --sp-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --sp-shadow-premium: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* Анимации */
  --sp-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --sp-transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --sp-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Внешний контейнер для центрирования */
.sp-outer-wrapper {
  margin: var(--sp-spacing-xl) 0 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  animation: sp-fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* Контейнер для кнопок внизу */
.sp-button-container {
  background: var(--sp-bg-secondary) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-top: none !important;
  border-radius: 0 0 var(--sp-radius-lg) var(--sp-radius-lg) !important;
  padding: 12px 16px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  margin-top: -1px !important;
  gap: var(--sp-spacing-sm) !important;
  box-shadow: var(--sp-shadow-md) !important;
}

/* Базовые стили для ShikiPlayer */
.sp-wrapper {
  background: var(--sp-bg-primary) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-radius: var(--sp-radius-lg) var(--sp-radius-lg) 0 0 !important;
  overflow: hidden !important;
  transition: all var(--sp-transition-normal) !important;
  position: relative !important;
  box-shadow: var(--sp-shadow-lg) !important;
}

/* Контейнер плеера */
.sp-container {
  background: var(--sp-bg-secondary) !important;
  border-radius: var(--sp-radius-lg) var(--sp-radius-lg) 0 0 !important;
  overflow: hidden !important;
}

/* Заголовок плеера */
.sp-header {
  background: var(--sp-bg-secondary) !important;
  padding: var(--sp-spacing-md) var(--sp-spacing-lg) !important;
  border-bottom: 1px solid var(--sp-border-color) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.sp-title {
  color: var(--sp-text-primary) !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: var(--sp-spacing-sm) !important;
  letter-spacing: -0.01em !important;
}

.sp-title-icon {
  color: var(--sp-accent) !important;
  animation: sp-pulse-glow 2s infinite !important;
}

/* Выпадающий список плееров */
.sp-dropdown {
  position: relative !important;
  margin-left: auto !important;
}

.sp-dropdown-toggle {
  background: var(--sp-bg-tertiary) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-radius: var(--sp-radius-md) !important;
  color: var(--sp-text-primary) !important;
  padding: 8px 14px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: var(--sp-spacing-sm) !important;
  transition: all var(--sp-transition-fast) !important;
  font-size: 13.5px !important;
  font-weight: 500 !important;
  box-shadow: var(--sp-shadow-sm) !important;
}

.sp-dropdown-toggle:hover {
  background: var(--sp-bg-hover) !important;
  border-color: var(--sp-accent) !important;
  transform: translateY(-1px) !important;
  box-shadow: var(--sp-shadow-md), 0 0 10px rgba(59, 130, 246, 0.1) !important;
}

.sp-dropdown-toggle::after {
  content: "▼" !important;
  font-size: 9px !important;
  transition: transform var(--sp-transition-normal) !important;
  color: var(--sp-text-secondary) !important;
  margin-left: var(--sp-spacing-xs) !important;
}

.sp-dropdown.open .sp-dropdown-toggle::after {
  transform: rotate(180deg) !important;
  color: var(--sp-accent) !important;
}

.sp-dropdown-menu {
  position: absolute !important;
  top: 100% !important;
  right: 0 !important;
  background: rgba(28, 30, 39, 0.95) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-radius: var(--sp-radius-md) !important;
  min-width: 160px !important;
  z-index: 1000 !important;
  opacity: 0 !important;
  visibility: hidden !important;
  transform: translateY(-8px) scale(0.98) !important;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1) !important;
  margin-top: 6px !important;
  max-height: 300px !important;
  overflow-y: auto !important;
  backdrop-filter: blur(12px) !important;
  box-shadow: var(--sp-shadow-premium) !important;
  padding: 4px !important;
}

.sp-dropdown.open .sp-dropdown-menu {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) scale(1) !important;
}

.sp-dropdown-item {
  padding: 8px 12px !important;
  cursor: pointer !important;
  transition: all var(--sp-transition-fast) !important;
  display: flex !important;
  align-items: center !important;
  gap: var(--sp-spacing-sm) !important;
  color: var(--sp-text-secondary) !important;
  font-size: 13.5px !important;
  font-weight: 500 !important;
  border-radius: var(--sp-radius-sm) !important;
  border: none !important;
  margin-bottom: 2px !important;
}

.sp-dropdown-item:last-child {
  margin-bottom: 0 !important;
}

.sp-dropdown-item:hover {
  background: var(--sp-bg-hover) !important;
  color: var(--sp-text-primary) !important;
}

.sp-dropdown-item.active {
   background: var(--sp-accent) !important;
   color: #ffffff !important;
}

.sp-dropdown-item.loading {
  color: var(--sp-text-muted) !important;
  cursor: not-allowed !important;
}

/* Индикаторы статуса */
.sp-status-indicator {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  margin-left: auto !important;
  transition: all var(--sp-transition-fast) !important;
}

.sp-status-indicator.online {
  background: var(--sp-online) !important;
  box-shadow: 0 0 8px var(--sp-online) !important;
  animation: sp-pulse 2s infinite !important;
}

.sp-status-indicator.offline {
  background: var(--sp-offline) !important;
}

.sp-status-indicator.loading {
  background: var(--sp-loading) !important;
  animation: sp-spin 1s linear infinite !important;
  width: 10px !important;
  height: 10px !important;
  border: 2px solid rgba(59, 130, 246, 0.2) !important;
  border-top: 2px solid var(--sp-loading) !important;
}

/* Область просмотра плеера */
.sp-viewer {
  background: var(--sp-bg-primary) !important;
  min-height: 500px !important;
  height: 500px !important;
  position: relative !important;
  overflow: hidden !important;
}

.sp-viewer iframe {
  border: none !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 400px !important;
}

/* Оверлей загрузки */
.sp-loading-overlay {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(11, 12, 16, 0.85) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 100 !important;
  backdrop-filter: blur(8px) !important;
}

.sp-loading-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: var(--sp-spacing-md) !important;
}

.sp-loading-spinner {
  width: 44px !important;
  height: 44px !important;
  border: 3px solid rgba(255, 255, 255, 0.05) !important;
  border-top: 3px solid var(--sp-accent) !important;
  border-radius: 50% !important;
  animation: sp-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
}

.sp-loading-text {
  color: var(--sp-text-secondary) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  letter-spacing: 0.02em !important;
  animation: sp-pulse 1.5s ease-in-out infinite !important;
}

/* Кнопки управления */
.sp-theater-btn,
.sp-episode-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 48px !important;
  padding: 0 16px !important;
  background: var(--sp-bg-tertiary) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-radius: var(--sp-radius-md) !important;
  color: var(--sp-text-primary) !important;
  cursor: pointer !important;
  transition: all var(--sp-transition-fast) !important;
  font-size: 13.5px !important;
  font-weight: 500 !important;
  position: relative !important;
  box-shadow: var(--sp-shadow-sm) !important;
  gap: var(--sp-spacing-sm) !important;
}

.sp-theater-btn {
  width: 48px !important;
  padding: 0 !important;
}

.sp-episode-btn {
  flex-direction: column !important;
  width: 48px !important;
  padding: 4px !important;
  gap: 2px !important;
}

.sp-theater-btn:hover,
.sp-episode-btn:hover {
  background: var(--sp-bg-hover) !important;
  border-color: var(--sp-accent) !important;
  color: var(--sp-text-primary) !important;
  transform: translateY(-1.5px) !important;
  box-shadow: var(--sp-shadow-md) !important;
}

.sp-theater-btn:active,
.sp-episode-btn:active {
  transform: translateY(0) !important;
}

.sp-theater-btn svg,
.sp-episode-btn svg {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0 !important;
  color: var(--sp-text-secondary) !important;
  transition: color var(--sp-transition-fast) !important;
}

.sp-theater-btn:hover svg,
.sp-episode-btn:hover svg {
  color: var(--sp-accent) !important;
}

/* Обратная связь кнопок через классы */
.sp-episode-btn.success {
  background: var(--sp-success) !important;
  border-color: var(--sp-success) !important;
  color: #ffffff !important;
}
.sp-episode-btn.success svg {
  color: #ffffff !important;
}
.sp-episode-btn.success .sp-episode-count {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  border-color: transparent !important;
}

.sp-episode-btn.error {
  background: var(--sp-error) !important;
  border-color: var(--sp-error) !important;
  color: #ffffff !important;
}
.sp-episode-btn.error svg {
  color: #ffffff !important;
}
.sp-episode-btn.error .sp-episode-count {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  border-color: transparent !important;
}

/* Счетчик серий */
.sp-episode-count {
  background: var(--sp-bg-primary) !important;
  border: 1px solid var(--sp-border-color) !important;
  color: var(--sp-accent) !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  padding: 1px 6px !important;
  border-radius: 12px !important;
  margin-left: 0 !important;
  display: inline-block !important;
  line-height: normal !important;
  transition: all 0.2s ease !important;
}

.sp-episode-btn:hover .sp-episode-count {
  background: var(--sp-accent-light) !important;
  border-color: var(--sp-accent) !important;
}

/* Кнопка закрытия в режиме кинотеатра */
.sp-theater-close {
  position: absolute !important;
  top: 20px !important;
  right: 20px !important;
  width: 44px !important;
  height: 44px !important;
  background: rgba(18, 19, 25, 0.8) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-radius: var(--sp-radius-md) !important;
  display: none !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  z-index: 10000 !important;
  transition: all var(--sp-transition-fast) !important;
  backdrop-filter: blur(8px) !important;
}

.sp-theater-close:hover {
  background: rgba(239, 68, 68, 0.9) !important;
  border-color: var(--sp-error) !important;
  transform: scale(1.05) !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
}

.sp-theater-close svg {
  width: 20px !important;
  height: 20px !important;
  color: var(--sp-text-primary) !important;
  transition: transform var(--sp-transition-fast) !important;
}

.sp-theater-close:hover svg {
  transform: rotate(90deg) !important;
  color: #ffffff !important;
}

/* Режим кинотеатра */
.sp-wrapper.theater-mode {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 9999 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  background: var(--sp-bg-primary) !important;
}

.sp-wrapper.theater-mode .sp-viewer {
  height: 100vh !important;
  min-height: unset !important;
}

.sp-wrapper.theater-mode .sp-header {
  display: none !important;
}

.sp-wrapper.theater-mode .sp-theater-close {
  display: flex !important;
}

/* Стили для кастомных подсказок */
.sp-tooltip {
  position: absolute !important;
  background: rgba(28, 30, 39, 0.95) !important;
  color: var(--sp-text-primary) !important;
  padding: 6px 12px !important;
  border-radius: var(--sp-radius-md) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  z-index: 10000 !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transform: translateY(-4px) !important;
  transition: all var(--sp-transition-fast) !important;
  backdrop-filter: blur(8px) !important;
  border: 1px solid var(--sp-border-color) !important;
  box-shadow: var(--sp-shadow-premium) !important;
}

.sp-tooltip.visible {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

.sp-tooltip::before {
  content: "" !important;
  position: absolute !important;
  bottom: -4px !important;
  left: 50% !important;
  transform: translateX(-50%) rotate(45deg) !important;
  width: 8px !important;
  height: 8px !important;
  background: rgba(28, 30, 39, 0.95) !important;
  border-right: 1px solid var(--sp-border-color) !important;
  border-bottom: 1px solid var(--sp-border-color) !important;
}

/* Скроллбар */
.sp-dropdown-menu::-webkit-scrollbar {
  width: 4px !important;
}

.sp-dropdown-menu::-webkit-scrollbar-track {
  background: transparent !important;
}

.sp-dropdown-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 2px !important;
}

.sp-dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: var(--sp-accent) !important;
}

/* Адаптивность */
@media (max-width: 768px) {
  .sp-header {
    padding: var(--sp-spacing-sm) var(--sp-spacing-md) !important;
    flex-direction: column !important;
    gap: var(--sp-spacing-sm) !important;
    align-items: stretch !important;
  }

  .sp-dropdown {
    width: 100% !important;
    margin-left: 0 !important;
  }

  .sp-dropdown-toggle {
    width: 100% !important;
    justify-content: space-between !important;
  }

  .sp-dropdown-menu {
    left: 0 !important;
    width: 100% !important;
    max-width: none !important;
  }

  .sp-button-container {
    flex-direction: row !important;
    gap: var(--sp-spacing-sm) !important;
    padding: var(--sp-spacing-md) !important;
  }

  .sp-theater-btn,
  .sp-episode-btn {
    width: 48px !important;
  }
}

.sp-wrapper button,
.sp-wrapper select,
.sp-wrapper input {
  font-family: inherit !important;
}

/* Анимации */
@keyframes sp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes sp-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes sp-fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sp-pulse-glow {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

.sp-pulse {
  animation: sp-pulse-anim 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}

@keyframes sp-pulse-anim {
  0% { transform: scale(1); }
  50% { transform: scale(1.2) !important; }
  100% { transform: scale(1); }
}
`;

function injectDarkTheme() {
  if (document.getElementById("shikiplayer-dark-theme")) return;
  const style = document.createElement("style");
  style.id = "shikiplayer-dark-theme";
  style.textContent = darkThemeCSS;
  document.head.appendChild(style);
}

injectDarkTheme();
// --- END OF CSS INJECTION ---

// Класс для создания кастомных подсказок
class Tooltip {
  constructor() {
    this.tooltip = null;
    this.targetElement = null;
    this.showTimeout = null;
    this.hideTimeout = null;
    this.init();
  }

  init() {
    // Создаем элемент подсказки
    this.tooltip = document.createElement("div");
    this.tooltip.className = "sp-tooltip";
    document.body.appendChild(this.tooltip);
  }

  // Добавление подсказки к элементу
  attach(element, text) {
    // Удаляем стандартный атрибут title, чтобы избежать дублирования
    const title = element.getAttribute("title");
    if (title) {
      element.setAttribute("data-tooltip-text", title);
      element.removeAttribute("title");
    } else if (text) {
      element.setAttribute("data-tooltip-text", text);
    }

    // Добавляем обработчики событий
    element.addEventListener("mouseenter", this.show.bind(this));
    element.addEventListener("mouseleave", this.hide.bind(this));
    element.addEventListener("click", this.hide.bind(this));
  }

  // Показ подсказки
  show(event) {
    const element = event.currentTarget;
    const text = element.getAttribute("data-tooltip-text");
    if (!text) return;

    // Отменяем скрытие, если оно было запланировано
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Запланируем показ с минимальной задержкой
    this.showTimeout = setTimeout(() => {
      this.targetElement = element;
      this.tooltip.textContent = text;

      // Позиционирование подсказки
      const rect = element.getBoundingClientRect();
      const tooltipRect = this.tooltip.getBoundingClientRect();

      // Показываем подсказку снизу от элемента
      let top = rect.bottom + 10;
      let left = rect.left + (rect.width - tooltipRect.width) / 2;

      // Проверяем, не выходит ли подсказка за пределы экрана снизу
      if (top + tooltipRect.height > window.innerHeight) {
        // Если не помещается снизу, показываем сверху
        top = rect.top - tooltipRect.height - 10;
      }

      // Проверяем, не выходит ли подсказка за пределы экрана по горизонтали
      if (left < 0) {
        left = 5;
      } else if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 5;
      }

      this.tooltip.style.top = `${top + window.scrollY}px`;
      this.tooltip.style.left = `${left + window.scrollX}px`;

      // Показываем подсказку с анимацией
      this.tooltip.classList.add("visible");
    }, 100); // Уменьшенная задержка перед показом
  }

  // Скрытие подсказки
  hide() {
    // Отменяем показ, если он был запланирован
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    // Немедленно скрываем подсказку
    this.tooltip.classList.remove("visible");
    this.targetElement = null;
  }

  // Уничтожение подсказки
  destroy() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}

// Базовый класс для ошибок
class ErrorBase extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = new.target.name;
  }
}
// Ошибка для некорректных HTTP-ответов
class ResponseError extends ErrorBase {
  constructor(response) {
    super(
      `Received response with unsuccessful code ${response.status} ${response.statusText}`
    );
    this.response = response;
  }
}
// Простой полифил/обертка ответа, так как стандартный конструктор Response() в браузере
// падает с RangeError, если передать статус 0 (для сетевых ошибок), а также накладывает ограничения
// на передачу тела c определенными кодами (например, 204, 304).
class GMResponse {
  constructor(status, statusText, responseText, responseHeaders) {
    this.status = status;
    this.statusText = statusText || "";
    this.ok = status >= 200 && status <= 299;
    this._text = responseText || "";

    let parsedHeaders = {};
    if (Array.isArray(responseHeaders)) {
      for (let item of responseHeaders) {
        if (Array.isArray(item) && item[0]) {
          parsedHeaders[item[0].toLowerCase()] = item[1] || "";
        }
      }
    }
    this.headers = {
      get: (name) => parsedHeaders[name.toLowerCase()] || null,
      has: (name) => name.toLowerCase() in parsedHeaders,
    };
  }
  async text() {
    return this._text;
  }
  async json() {
    return JSON.parse(this._text);
  }
}

// HTTP-клиент для GM.xmlHttpRequest с таймаутом
class GMHttp {
  async fetch(input, init) {
    const methods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "TRACE",
      "OPTIONS",
      "CONNECT",
    ];
    let requestMethod = init?.method ?? "GET";
    if (!methods.includes(requestMethod)) {
      throw new Error(`HTTP method ${requestMethod} is not supported`);
    }
    let requestUrl = input.toString();

    let requestBody = init?.body;
    let requestHeaders = init?.headers
      ? Object.fromEntries(new Headers(init.headers))
      : {};

    // Handle FormData and other bodies correctly in Userscript environment
    if (requestBody instanceof FormData) {
      // GM.xmlHttpRequest natively supports FormData, and we should NOT set/override
      // Content-Type ourselves so that the underlying browser engine sets the correct multipart boundary.
      delete requestHeaders["content-type"];
      delete requestHeaders["Content-Type"];
    } else if (requestBody instanceof URLSearchParams) {
      requestBody = requestBody.toString();
      if (!requestHeaders["content-type"] && !requestHeaders["Content-Type"]) {
        requestHeaders["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      }
    } else if (requestBody && typeof requestBody !== "string") {
      requestBody = await new Response(requestBody).text();
    }

    // Добавляем таймаут по умолчанию 10 секунд
    const timeout = init?.timeout || 10000;
    let gmResponse = await new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        url: requestUrl,
        method: requestMethod,
        data: requestBody,
        headers: requestHeaders,
        timeout: timeout,
        onload: (response) => {
          resolve(response);
        },
        onerror: (error) => {
          // Возвращаем ответ с status 0 вместо throw, чтобы вызывающий код мог обработать
          resolve(error);
        },
        ontimeout: () => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        },
      });
    });
    // Если status = 0, запрос не дошёл — создаём пустой ответ
    if (gmResponse.status === 0) {
      return new GMResponse(0, "Network Error", "", []);
    }
    let responseHeaders = [];
    if (gmResponse.responseHeaders) {
      responseHeaders = gmResponse.responseHeaders
        .trim()
        .split(/\r?\n/)
        .map((line) => {
          let parts = line.split(/:\s*/, 2);
          return [parts[0], parts[1] || ""];
        });
    }
    return new GMResponse(
      gmResponse.status,
      gmResponse.statusText,
      gmResponse.response || "",
      responseHeaders
    );
  }
}
// Утилита для проверки JSON
class Json {
  static parse(text, type) {
    let value;
    try {
      value = JSON.parse(text);
    } catch (e) {
      throw new Error(`Error parsing JSON: ${text}`);
    }
    if (!type(value)) {
      throw new Error(`Invalid JSON type`);
    }
    return value;
  }
}
// Базовый класс плеера
class PlayerBase {
  getEpisode() {
    return 0;
  }
  setEpisode(value) {}
  getTime() {
    return 0;
  }
  setTime(value) {}
  getTranslation() {
    return "";
  }
  setTranslation(value) {}
  dispose() {}
}
// Kodik Player
class KodikPlayer extends PlayerBase {
  constructor(uid, results) {
    super();
    this.uid = uid;
    this._results = results;
    this.element = document.createElement("iframe");
    this.element.allowFullscreen = true;
    this.element.width = "100%";
    this.element.style.aspectRatio = "16 / 9";
    this._translation = results[0] || new Error("No translation found");
    this.rebuildIFrameSrc();
    addEventListener("message", this.onMessage);
  }
  name = "Kodik";
  element;
  _episode = 1;
  _time = 0;
  _translation;
  getEpisode() {
    return this._episode;
  }
  setEpisode(value) {
    this._episode = value;
    this.rebuildIFrameSrc();
  }
  getTime() {
    return this._time;
  }
  setTime(value) {
    this._time = value;
    this.rebuildIFrameSrc();
  }
  getTranslation() {
    return this._translation.translation.id + "";
  }
  setTranslation(value) {
    this._translation =
      this._results.find((r) => r.translation.id === +value) ||
      new Error(`Translation '${value}' not found`);
    this.rebuildIFrameSrc();
  }
  rebuildIFrameSrc() {
    let src = new URL(`https:${this._translation.link}`);
    src.searchParams.set("uid", this.uid);
    src.searchParams.set("episode", this._episode + "");
    src.searchParams.set("start_from", this._time + "");
    this.element.src = src.toString();
  }
  onMessage = (ev) => {
    if (ev.source !== this.element.contentWindow) return;
    let message;
    try {
      message = JSON.parse(ev.data);
    } catch (e) {
      return;
    }
    if (message.key === "kodik_player_time_update") {
      this._time = message.value;
    }
  };
  dispose() {
    removeEventListener("message", this.onMessage);
  }
}
// Kodik Factory
class KodikFactory {
  constructor(uid, api) {
    this.uid = uid;
    this._api = api;
  }
  name = "Kodik";
  async create(animeId, abort) {
    let results = await this._api.search(animeId, abort);
    if (results.length === 0) return null;
    return new KodikPlayer(this.uid, results);
  }
}
// IframePlayer — универсальный плеер для Kinobox источников
class IframePlayer extends PlayerBase {
  constructor(url, name, referrerPolicy = "origin") {
    super();
    this.name = name;
    this.element = document.createElement("iframe");
    this.element.allowFullscreen = true;
    this.element.setAttribute("allow", "autoplay *; fullscreen *; picture-in-picture *; xr-spatial-tracking *; clipboard-write *");
    this.element.setAttribute("frameborder", "0");
    this.element.setAttribute("referrerpolicy", referrerPolicy);
    this.element.width = "100%";
    this.element.style.aspectRatio = "16 / 9";

    let finalUrl = url;
    if (finalUrl) {
      if (finalUrl.startsWith("//")) {
        finalUrl = "https:" + finalUrl;
      } else if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }
      // Универсальное перенаправление Kodik доменов на рабочий kodikplayer.com в iframe url
      try {
        let u = new URL(finalUrl);
        if (u.hostname.includes("kodik") && !u.hostname.includes("kodikapi") && u.hostname !== "kodikplayer.com") {
          u.hostname = "kodikplayer.com";
          finalUrl = u.toString();
        }
      } catch(e) {}
    }
    this.element.src = finalUrl;
  }
}
// SimpleFactory — фабрика для создания IframePlayer по типу из Kinobox данных
class SimpleFactory {
  constructor(type) {
    this.name = type;
  }
  create(kodikResult, kinoboxPlayers) {
    if (!kodikResult?.kinopoisk_id) return null;
    
    // Поддержка синонимов названий плееров
    let targetNames = [this.name.toLowerCase()];
    if (this.name.toLowerCase() === "gendit") {
      targetNames.push("gencit");
    } else if (this.name.toLowerCase() === "gencit") {
      targetNames.push("gendit");
    }
    
    const p = kinoboxPlayers.find((x) => targetNames.includes(x.type?.toLowerCase()));
    if (p && p.iframeUrl) {
      let refPolicy = "origin";
      if (this.name.toLowerCase() === "gendit" || this.name.toLowerCase() === "gencit" || this.name.toLowerCase() === "flixcdn") {
        refPolicy = "no-referrer";
      }
      return new IframePlayer(p.iframeUrl, this.name, refPolicy);
    }
    
    // Резервный (fallback) вариант с прямой ссылкой, если плеер не вернулся от API
    if (this.name.toLowerCase() === "gendit" || this.name.toLowerCase() === "gencit") {
      return new IframePlayer(`https://horsez.org/lat/${kodikResult.kinopoisk_id}`, this.name, "no-referrer");
    }
    if (this.name.toLowerCase() === "flixcdn") {
      return new IframePlayer(`https://tarantino.factorios.live/show/kinopoisk/${kodikResult.kinopoisk_id}`, this.name, "no-referrer");
    }
    
    return null;
  }
}
// API для Alloha
class AllohaApi {
  constructor(http, token, baseUrl = "https://theatre.stravers.live") {
    this._http = http;
    this._token = token;
    this._baseUrl = baseUrl;
  }
  async getIframeUrl(kinopoiskId, abort) {
    const endpoints = [
      {
        url: `https://api.apbugall.org/?token=${this._token}&kp=${kinopoiskId}`,
        method: "POST"
      },
      {
        url: `https://api.alloha.tv/?token=${this._token}&kp=${kinopoiskId}`,
        method: "GET"
      },
      {
        url: `${this._baseUrl}/?token=${this._token}&kp=${kinopoiskId}`,
        method: "GET"
      }
    ];
    for (let end of endpoints) {
      try {
        let response = await this._http.fetch(end.url, {
          method: end.method,
          signal: abort,
          timeout: 5000,
        });
        if (response.ok) {
          let text = await response.text();
          let data = JSON.parse(text);
          if (data && data.status === "success" && data.data) {
            const iframeUrl = data.data.iframe || data.data.iframe_url;
            if (iframeUrl) {
              return iframeUrl;
            }
          }
        }
      } catch (e) {
        console.error(`Error querying Alloha API at ${end.url} (${end.method}):`, e);
      }
    }
    // Fallback: Direct iframe embed
    return `${this._baseUrl}/?token=${this._token}&kp=${kinopoiskId}`;
  }
}
// AllohaFactory — фабрика для создания Alloha плеера через AllohaApi
class AllohaFactory {
  constructor(api) {
    this._api = api;
  }
  name = "Alloha";
  async create(kodikResult, kinoboxPlayers, abort) {
    if (!kodikResult?.kinopoisk_id) return null;
    let url = await this._api.getIframeUrl(kodikResult.kinopoisk_id, abort);
    if (!url) return null;
    return new IframePlayer(url, this.name);
  }
}
// API для Kodik
class KodikApi {
  constructor(http, token) {
    this._http = http;
    this._token = token;
  }
  async search(shikimoriId, abort) {
    let url = new URL("https://kodikapi.com/search");
    url.searchParams.set("token", this._token);
    url.searchParams.set("shikimori_id", shikimoriId + "");
    let response = await this._http.fetch(url, {
      signal: abort,
      timeout: 10000,
    });
    if (response.status === 0) {
      throw new Error("Kodik API network error (status 0)");
    }
    if (!response.ok) throw new ResponseError(response);
    let text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Kodik API: invalid JSON response");
    }
    if (!data || !Array.isArray(data.results)) {
      return [];
    }
    return data.results;
  }
}
// API для Kinobox (используется для Turbo, Alloha и Collaps)
class KinoboxApi {
  constructor(http) {
    this._http = http;
  }
  async players(kinopoisk, abort) {
    let url = new URL("https://fbphdplay.top/api/players");
    url.searchParams.set("kinopoisk", kinopoisk + "");
    let response = await this._http.fetch(url, {
      headers: {
        Origin: "https://fbphdplay.top",
      },
      signal: abort,
      timeout: 5000,
    });
    if (!response.ok) throw new ResponseError(response);
    let text = await response.text();
    let data = JSON.parse(text);
    return Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
  }
}

// API для KpApiget
class KpApigetApi {
  constructor(http) {
    this._http = http;
    this._cache = new Map();
  }
  async players(kinopoiskId, abort) {
    if (this._cache.has(kinopoiskId)) return this._cache.get(kinopoiskId);

    let url = new URL("https://kp.apiget.ru/array_player.php");
    let uidKp = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      uidKp += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let manifestData = {
      "manifest_version": 3,
      "name": "Kinopoisk Player - фильмы/сериалы",
      "version": "16.3.0",
      "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6IgiHmdoj2e2dq8mlC31K30rxGtuCpqkP/nZT76SVd9psyIq3bUYQRrQVmroRSdSB8b2jAhUxiXMIbPkWp+7v19hMwKdLf5UI3QowRK5bLEYmguP6/z+Qt6lVcDXOflgP4k3U0j6gvC0Ryd78Ko3O4I1en0cVIiSmTnCZfgSfugu1UO6O8ppyHohMkNMht7j2EDdightoeqGhIt33XTO5z5bABAQ82MVtPbJvIw4EMZbunLcw+aMxwnItrCYgw8Np8Un/InlrfduNAzQNiCgqaU3+WOycVPhvj3WqMVIi1pbq5SmPg6Xk94BqdyR5eQtzQ6ornROU8+KsRGSRTA0pQIDAQAB",
      "description": ""
    };

    let html_code = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Фильм/Сериал на Кинопоиске</title>
  <meta property="og:url" content="https://www.kinopoisk.ru/film/${kinopoiskId}/">
  <link rel="canonical" href="https://www.kinopoisk.ru/film/${kinopoiskId}/" />
</head>
<body>
  <div id="inlineFilmContainer" data-film-id="${kinopoiskId}"></div>
</body>
</html>`;

    let data = new URLSearchParams();
    data.append("id", kinopoiskId + "");
    data.append("version_extension", "16.3.0");
    data.append("Manifest_extension", JSON.stringify(manifestData));
    data.append("uid", "");
    data.append("yandex_login", "");
    data.append("UID_KP", uidKp);
    data.append("html_code", html_code);

    let response = await this._http.fetch(url, {
      method: "POST",
      body: data,
      signal: abort,
      timeout: 8000,
    });
    if (!response.ok) throw new ResponseError(response);
    let text = await response.text();
    let resData;
    try {
      resData = JSON.parse(text);
    } catch (e) {
      throw new Error("KpApiget API: invalid JSON response");
    }

    let result = [];
    if (resData.error === 0 && Array.isArray(resData.all_player)) {
      result = resData.all_player;
    }

    this._cache.set(kinopoiskId, result);
    return result;
  }
}


// Утилита для получения имени плеера из URL
function getPlayerNameFromUrl(url) {
  if (!url) return "Unknown";
  
  let link = url.toLowerCase();
  try {
    let parsedUrl = new URL(url);
    let innerLink = parsedUrl.searchParams.get("link") || parsedUrl.searchParams.get("url");
    if (innerLink) {
      link = innerLink.toLowerCase();
    }
  } catch (e) {}

  if (link.includes("lumex")) return "Lumex";
  if (link.includes("vibix") || link.includes("vidio.xyz") || link.includes("vidio.click")) return "Vibix";
  if (link.includes("veoveo")) return "Veoveo";
  if (link.includes("alloha") || link.includes("stravers")) return "Alloha";
  if (link.includes("collaps") || link.includes("ortified") || link.includes("variyt")) return "Collaps";
  if (link.includes("turbo") || link.includes("obrut") || link.includes("tubofilm")) return "Turbo";
  if (link.includes("horsez.org") || link.includes("ylitron.pro") || link.includes("gendit") || link.includes("gencit")) return "Gendit";
  if (link.includes("tarantino.factorios.live") || link.includes("factorios.live") || link.includes("kinohd.co") || link.includes("flixcdn")) return "Flixcdn";
  if (link.includes("kodik")) return "Kodik";
  if (link.includes("cdnmovies")) return "Cdnmovies";
  if (link.includes("ruapi") || link.includes("rstprg")) return "Kinopoisk";
  if (link.includes("kinopoisk")) return "Lumex";

  try {
      let domain = new URL(url).hostname.replace("www.", "");
      let rawName = domain.split(".")[0];
      if (rawName === "horsez" || rawName === "ylitron") return "Gendit";
      if (rawName === "factorios" || rawName === "kinohd") return "Flixcdn";
      
      if (rawName === "api" || rawName === "api2") {
        let parts = domain.split(".");
        if (parts.length > 2) {
          rawName = parts[1];
        }
      }
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  } catch(e) {
      return "Unknown";
  }
}

// API для Collaps (оставлен для обратной совместимости, не используется)
class CollapsApi {
  constructor(http, token) {
    this._http = http;
    this._token = token;
  }
  async list(kinopoiskId, abort) {
    let url = new URL("https://apicollaps.cc/list");
    url.searchParams.set("token", this._token);
    url.searchParams.set("kinopoisk_id", kinopoiskId);
    let response = await this._http.fetch(url, {
      signal: abort,
      timeout: 5000,
    });
    if (!response.ok) throw new ResponseError(response);
    let text = await response.text();
    let data = Json.parse(
      text,
      (v) =>
        typeof v === "object" &&
        v !== null &&
        Array.isArray(v.results) &&
        v.results.every(
          (e) =>
            typeof e === "object" &&
            e !== null &&
            typeof e.iframe_url === "string" &&
            (typeof e.seasons === "undefined" ||
              (Array.isArray(e.seasons) &&
                e.seasons.every(
                  (s) =>
                    typeof s === "object" &&
                    s !== null &&
                    Array.isArray(s.episodes) &&
                    typeof s.season === "number"
                )))
        )
    );
    return data.results;
  }
}
// Основной класс Shikiplayer
class Shikiplayer {
  constructor(playerFactories, kodikApi, kinoboxApi, kpApi) {
    this._playerFactories = playerFactories;
    this._kodikApi = kodikApi;
    this._kinoboxApi = kinoboxApi;
    this._kpApi = kpApi;
    // Создаем внешний контейнер
    this.element = document.createElement("div");
    this.element.className = "sp-outer-wrapper";

    // ИСПРАВЛЕННАЯ HTML СТРУКТУРА: кнопка в отдельном контейнере
    this.element.innerHTML = `
<div class="sp-wrapper">
  <div class="sp-container">
    <div class="sp-header">
      <div class="sp-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="sp-title-icon">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Онлайн-просмотр</span>
      </div>
      <div class="sp-dropdown">
        <div class="sp-dropdown-toggle">
          <span class="sp-selected-player">Выберите плеер</span>
        </div>
        <div class="sp-dropdown-menu"></div>
      </div>
    </div>
    <div class="sp-viewer">
      <div class="sp-loading-overlay">
        <div class="sp-loading-content">
          <div class="sp-loading-spinner"></div>
          <div class="sp-loading-text">Загрузка видеоплеера...</div>
        </div>
      </div>
    </div>
  </div>
  <button class="sp-theater-close" title="Закрыть режим кинотеатра">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>
</div>
<div class="sp-button-container">
  <button class="sp-theater-btn" title="Театральный режим">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    </svg>
  </button>
  <button class="sp-episode-btn" title="Отметить серию как просмотренную">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span class="sp-episode-count">0/0</span>
  </button>
</div>
        `;
    this._wrapper = this.element.querySelector(".sp-wrapper");
    this._container = this.element.querySelector(".sp-container");
    this._dropdown = this.element.querySelector(".sp-dropdown");
    this._dropdownToggle = this.element.querySelector(".sp-dropdown-toggle");
    this._dropdownMenu = this.element.querySelector(".sp-dropdown-menu");
    this._selectedPlayerText = this.element.querySelector(
      ".sp-selected-player"
    );
    this._viewer = this.element.querySelector(".sp-viewer");
    this._loadingOverlay = this.element.querySelector(".sp-loading-overlay");
    this._theaterBtn = this.element.querySelector(".sp-theater-btn");
    this._theaterCloseBtn = this.element.querySelector(".sp-theater-close");
    this._episodeBtn = this.element.querySelector(".sp-episode-btn");
    this._currentPlayer = null;
    this._playerInstances = new Map();
    this._isTheaterMode = false;

    // Инициализация системы подсказок
    this._tooltip = new Tooltip();

    // Обработчики событий для выпадающего списка
    this._dropdownToggle.addEventListener("click", () => {
       this._dropdown.classList.toggle("open");
    });
    // Закрытие выпадающего списка при клике вне его
    document.addEventListener("click", (e) => {
      if (!this._dropdown.contains(e.target)) {
        this._dropdown.classList.remove("open");
      }
    });
    // Обработчик для кнопки режима кинотеатра
    this._theaterBtn.addEventListener("click", () => {
      this.toggleTheaterMode();
    });
    // Обработчик для кнопки закрытия режима кинотеатра
    this._theaterCloseBtn.addEventListener("click", () => {
      this.toggleTheaterMode();
    });
    // Обработчик для кнопки добавления эпизода
    this._episodeBtn.addEventListener("click", () => {
      this.incrementEpisode();
    });
    // Обработчик для закрытия режима кинотеатра по клавише Esc
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isTheaterMode) {
        this.toggleTheaterMode();
      }
    });
  }

  toggleTheaterMode() {
    this._isTheaterMode = !this._isTheaterMode;
    if (this._isTheaterMode) {
      this._wrapper.classList.add("theater-mode");
      // Сохраняем текущую позицию прокрутки
      this._scrollPosition = window.pageYOffset;
      // Блокируем прокрутку страницы
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${this._scrollPosition}px`;
      document.body.style.width = "100%";
    } else {
      this._wrapper.classList.remove("theater-mode");
      // Восстанавливаем прокрутку страницы
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, this._scrollPosition);
    }
  }

  incrementEpisode() {
    // ИСПРАВЛЕНИЕ: Улучшенный поиск кнопки увеличения эпизода
    // Пробуем несколько возможных селекторов для кнопки
    let incrementButton = document.querySelector(".item-add.increment");
    if (!incrementButton) {
      incrementButton = document.querySelector(".b-user_rate .increment");
    }
    if (!incrementButton) {
      incrementButton = document.querySelector(".b-add_to_list .increment");
    }

    if (incrementButton) {
      // Кликаем по ней
      incrementButton.click();

      // Добавляем визуальную обратную связь
      this._episodeBtn.classList.add("success");
      setTimeout(() => {
        this._episodeBtn.classList.remove("success");
      }, 800);

      // ИСПРАВЛЕНИЕ: Увеличиваем задержку и добавляем несколько попыток обновления счетчика
      // Обновляем счетчик серий с увеличенной задержкой
      setTimeout(() => {
        this.updateEpisodeCount();
      }, 1000);

      // Вторая попытка обновления счетчика
      setTimeout(() => {
        this.updateEpisodeCount();
      }, 2000);
    } else {
      // Если кнопка не найдена, показываем ошибку
      this._episodeBtn.classList.add("error");
      setTimeout(() => {
        this._episodeBtn.classList.remove("error");
      }, 800);
    }
  }

  updateEpisodeCount() {
    // ИСПРАВЛЕНИЕ: Улучшенный поиск элемента с количеством просмотренных серий
    // Пробуем несколько возможных селекторов
    let rateNumber = document.querySelector(".rate-number");
    if (!rateNumber) {
      rateNumber = document.querySelector(".b-user_rate .rate-number");
    }
    if (!rateNumber) {
      rateNumber = document.querySelector(".b-add_to_list .rate-number");
    }

    if (!rateNumber) {
      console.error(
        "Не удалось найти элемент с количеством просмотренных серий"
      );
      return;
    }

    // Получаем текст из элемента
    const rateText = rateNumber.textContent;

    // Находим элемент счетчика в нашей кнопке
    const episodeCount = this._episodeBtn.querySelector(".sp-episode-count");
    if (!episodeCount) return;

    // ИСПРАВЛЕНИЕ: Добавляем анимацию при обновлении счетчика
    // Сохраняем старое значение для сравнения
    const oldValue = episodeCount.textContent;

    // Обновляем текст счетчика
    episodeCount.textContent = rateText;

    // Если значение изменилось, добавляем анимацию
    if (oldValue !== rateText) {
      episodeCount.classList.add("sp-pulse");
      setTimeout(() => {
        episodeCount.classList.remove("sp-pulse");
      }, 300);
    }
  }

  async start(abort) {
    // Очищаем предыдущий контейнер, если он существует
    let existing = document.querySelector(".sp-outer-wrapper");
    if (existing) existing.remove();
    let before = document.querySelector(".b-db_entry");
    if (before) before.after(this.element);
    let entryText = document
      .querySelector(".b-db_entry .b-user_rate")
      ?.getAttribute("data-entry");
    if (!entryText) return;
    let entry = JSON.parse(entryText);
    if (!entry || typeof entry.id !== "number") return;

    // Добавляем подсказки только к кнопкам
    this._tooltip.attach(this._theaterBtn, "Театральный режим");
    this._tooltip.attach(
      this._theaterCloseBtn,
      "Закрыть режим кинотеатра (Esc)"
    );
    this._tooltip.attach(this._episodeBtn, "Отметить серию как просмотренную");

    // Обновляем счетчик серий
    this.updateEpisodeCount();

    // Создаем элементы для всех плееров в выпадающем списке
    for (let factory of this._playerFactories) {
      let item = document.createElement("div");
      item.className = "sp-dropdown-item loading";
      item.innerHTML = `
 ${factory.name}
<span class="sp-status-indicator loading"></span>
            `;
      item.dataset.playerName = factory.name;
      this._dropdownMenu.appendChild(item);
    }
    // Загружаем Kodik немедленно и отображаем его
    let kodikFactory = this._playerFactories.find((f) => f.name === "Kodik");
    if (kodikFactory) {
      try {
        let kodikPlayer = await kodikFactory.create(entry.id, abort);
        if (kodikPlayer) {
          this._playerInstances.set("Kodik", kodikPlayer);
          this.switchPlayer("Kodik", kodikPlayer);
          // Обновляем элемент Kodik в выпадающем списке
          let kodikItem = this._dropdownMenu.querySelector(
            "[data-player-name='Kodik']"
          );
          if (kodikItem) {
            kodikItem.classList.remove("loading");
            kodikItem.classList.add("active");
            kodikItem
              .querySelector(".sp-status-indicator")
              .classList.remove("loading");
            kodikItem
              .querySelector(".sp-status-indicator")
              .classList.add("online");
            kodikItem.addEventListener("click", () => {
              this.switchPlayer("Kodik", kodikPlayer);
              this._dropdown.classList.remove("open");
            });
          }
        } else {
          // Если Kodik не загрузился, убираем его из списка
          let kodikItem = this._dropdownMenu.querySelector(
            "[data-player-name='Kodik']"
          );
          if (kodikItem) {
            kodikItem
              .querySelector(".sp-status-indicator")
              .classList.remove("loading");
            kodikItem
              .querySelector(".sp-status-indicator")
              .classList.add("offline");
            kodikItem.classList.remove("loading");
          }
        }
      } catch (e) {
        console.error(`Error in Kodik:`, e);
        // Если Kodik не загрузился, убираем его из списка
        let kodikItem = this._dropdownMenu.querySelector(
          "[data-player-name='Kodik']"
        );
        if (kodikItem) {
          kodikItem
            .querySelector(".sp-status-indicator")
            .classList.remove("loading");
          kodikItem
            .querySelector(".sp-status-indicator")
            .classList.add("offline");
          kodikItem.classList.remove("loading");
        }
      }
    }

    // Централизованная загрузка данных для Kinobox плееров
    // Сначала пробуем получить kinopoisk_id со страницы Shikimori как fallback
    let kinopoiskId = null;
    let kodikResult = null;

    // Fallback: извлекаем kinopoisk_id напрямую со страницы Shikimori
    const kpLink = document.querySelector("a[href*='kinopoisk']");
    if (kpLink) {
      const match = kpLink.href.match(/(\d+)/);
      if (match) kinopoiskId = match[0];
    }

    // Пробуем получить данные от Kodik API
    try {
      let kodikResults = await this._kodikApi.search(entry.id, abort);
      kodikResult = kodikResults[0];
      // Если Kodik вернул kinopoisk_id, используем его (приоритет)
      if (kodikResult && kodikResult.kinopoisk_id) {
        kinopoiskId = kodikResult.kinopoisk_id;
      }
    } catch (e) {
      console.error("Kodik API error (will try fallback):", e);
      // Продолжаем даже если Kodik API не доступен — используем kinopoisk_id со страницы
    }

    if (kinopoiskId) {
      // Запускаем запросы к Kinobox API и KP API параллельно
      let kinoboxPromise = this._kinoboxApi.players(kinopoiskId, abort).catch((e) => {
        console.error("Kinobox API error:", e);
        return [];
      });
      let kpPromise = this._kpApi ? this._kpApi.players(kinopoiskId, abort).catch((e) => {
        console.error("KP API error:", e);
        return [];
      }) : Promise.resolve([]);

      try {
        let [kinoboxPlayers, kpPlayers] = await Promise.all([kinoboxPromise, kpPromise]);

        // Создаём фиктивный kodikResult если Kodik API не сработал
        if (!kodikResult) {
          kodikResult = { kinopoisk_id: kinopoiskId };
        }

        // Создаем все базовые плееры, используя полученные данные из Kinobox
        for (let factory of this._playerFactories) {
          if (factory.name === "Kodik") continue;

          let item = this._dropdownMenu.querySelector(
            `[data-player-name='${factory.name}']`
          );
          if (!item) continue;

          try {
            let player = await factory.create(kodikResult, kinoboxPlayers, abort);
            item.classList.remove("loading");
            if (!player) {
              item
                .querySelector(".sp-status-indicator")
                .classList.remove("loading");
              item.querySelector(".sp-status-indicator").classList.add("offline");
              continue;
            }
            this._playerInstances.set(factory.name, player);
            item
              .querySelector(".sp-status-indicator")
              .classList.remove("loading");
            item.querySelector(".sp-status-indicator").classList.add("online");
            item.addEventListener("click", () => {
              this.switchPlayer(factory.name, player);
              this._dropdown.classList.remove("open");
            });
          } catch (e) {
            console.error(`Error in ${factory.name}:`, e);
            item
              .querySelector(".sp-status-indicator")
              .classList.remove("loading");
            item.querySelector(".sp-status-indicator").classList.add("offline");
            item.classList.remove("loading");
          }
        }

        // Динамически регистрируем и выводим все остальные плееры из Kinobox (из Tape Operator)
        if (kinoboxPlayers && kinoboxPlayers.length > 0) {
          kinoboxPlayers.forEach((p) => {
            if (!p || !p.type || !p.iframeUrl) return;

            let finalUrl = p.iframeUrl;
            if (finalUrl.startsWith("//")) {
              finalUrl = "https:" + finalUrl;
            }

            // Если такой плеер уже зарегистрирован и работающий
            if (this._playerInstances.has(p.type)) return;

            // Предотвращаем дублирование дефолтных
            let baseName = p.type;
            let normName = baseName.toLowerCase();
            if (normName === "alloha" && this._playerInstances.has("Alloha")) return;
            if (normName === "collaps" && this._playerInstances.has("Collaps")) return;
            if (normName === "kodik" && this._playerInstances.has("Kodik")) return;
            if (normName === "turbo" && this._playerInstances.has("Turbo")) return;
            if (normName === "gendit" && this._playerInstances.has("Gendit")) return;
            if (normName === "gencit" && this._playerInstances.has("Gendit")) return;
            if (normName === "flixcdn" && this._playerInstances.has("Flixcdn")) return;

            // Если инстанса нет, но пункт меню уже есть (для заводского плеера который завершился офлайн)
            let existingItem = this._dropdownMenu.querySelector(`[data-player-name='${p.type}']`);
            if (existingItem) {
              let refPolicy = "origin";
              if (normName === "gendit" || normName === "gencit" || normName === "flixcdn" || finalUrl.includes("ylitron.pro") || finalUrl.includes("horsez.org")) {
                refPolicy = "no-referrer";
              }
              let player = new IframePlayer(finalUrl, p.type, refPolicy);
              this._playerInstances.set(p.type, player);
              
              existingItem.classList.remove("loading");
              let indicator = existingItem.querySelector(".sp-status-indicator");
              if (indicator) {
                indicator.className = "sp-status-indicator online";
              }
              // Перезаписываем событие клика
              let newItem = existingItem.cloneNode(true);
              newItem.addEventListener("click", () => {
                this.switchPlayer(p.type, player);
                this._dropdown.classList.remove("open");
              });
              existingItem.parentNode.replaceChild(newItem, existingItem);
              return;
            }

            // Пропускаем неопределенные названия
            if (["api", "api2", "unknown"].includes(normName)) return;

            let displayName = p.type;
            if (normName === "gencit" || normName === "gendit") displayName = "Gendit";
            if (normName === "flixcdn") displayName = "Flixcdn";

            let refPolicy = "origin";
            if (normName === "gendit" || normName === "gencit" || normName === "flixcdn" || finalUrl.includes("ylitron.pro") || finalUrl.includes("horsez.org")) {
              refPolicy = "no-referrer";
            }
            let player = new IframePlayer(finalUrl, displayName, refPolicy);
            this._playerInstances.set(displayName, player);

            // Создаем и добавляем элемент в меню выпадающего списка
            let item = document.createElement("div");
            item.className = "sp-dropdown-item";
            item.dataset.playerName = displayName;
            item.innerHTML = `
 ${displayName}
<span class="sp-status-indicator online"></span>
            `;
            item.addEventListener("click", () => {
              this.switchPlayer(displayName, player);
              this._dropdown.classList.remove("open");
            });
            this._dropdownMenu.appendChild(item);
          });
        }

        // Динамически регистрируем и выводим плееры из базы Кинопоиска (lumex и другие)
        if (kpPlayers && kpPlayers.length > 0) {
          kpPlayers.forEach((url) => {
            let baseName = getPlayerNameFromUrl(url);
            if (baseName.toLowerCase().includes("кп api") || baseName.toLowerCase().includes("kp api")) return;
            if (baseName.toLowerCase() === "api" || baseName.toLowerCase() === "unknown") return;

            let finalName = baseName;
            let counter = 2;

            // Обеспечиваем абсолютную уникальность имени плеера в списке
            while (this._playerInstances.has(finalName)) {
              finalName = `${baseName} ${counter}`;
              counter++;
            }

            if (["api2", "lumex 2"].includes(finalName.toLowerCase())) return;

            let player = new IframePlayer(url, finalName);
            this._playerInstances.set(finalName, player);

            // Создаем и стилизуем элемент в выпадающем списке
            let item = document.createElement("div");
            item.className = "sp-dropdown-item";
            item.dataset.playerName = finalName;
            item.innerHTML = `
 ${finalName}
<span class="sp-status-indicator online"></span>
            `;
            item.addEventListener("click", () => {
              this.switchPlayer(finalName, player);
              this._dropdown.classList.remove("open");
            });
            this._dropdownMenu.appendChild(item);
          });
        }
      } catch (e) {
        console.error("General API error:", e);
        for (let factory of this._playerFactories) {
          if (factory.name === "Kodik") continue;
          let item = this._dropdownMenu.querySelector(
            `[data-player-name='${factory.name}']`
          );
          if (item) {
            item.classList.remove("loading");
            item
              .querySelector(".sp-status-indicator")
              .classList.remove("loading");
            item.querySelector(".sp-status-indicator").classList.add("offline");
          }
        }
      }
    } else {
      // Нет kinopoisk_id — помечаем все Kinobox плееры как офлайн
      for (let factory of this._playerFactories) {
        if (factory.name === "Kodik") continue;
        let item = this._dropdownMenu.querySelector(
          `[data-player-name='${factory.name}']`
        );
        if (item) {
          item.classList.remove("loading");
          item
            .querySelector(".sp-status-indicator")
            .classList.remove("loading");
          item.querySelector(".sp-status-indicator").classList.add("offline");
        }
      }
    }
  }

  switchPlayer(playerName, player) {
    // Показываем индикатор загрузки
    this._loadingOverlay.style.display = "flex";
    // Удаляем текущий плеер из viewport
    this._viewer.innerHTML = "";
    if (this._currentPlayer) {
      this._currentPlayer.dispose();
    }
    // Устанавливаем новый плеер
    this._viewer.appendChild(player.element);
    this._currentPlayer = player;
    // Обновляем текст в выпадающем списке
    this._selectedPlayerText.textContent = playerName;
    // Обновляем активный элемент в выпадающем списке
    for (let item of this._dropdownMenu.children) {
      item.classList.toggle("active", item.dataset.playerName === playerName);
    }
    // Скрываем индикатор загрузки с небольшой задержкой для плавности
    setTimeout(() => {
      this._loadingOverlay.style.display = "none";
    }, 500);
  }

  dispose() {
    if (this._currentPlayer) {
      this._currentPlayer.dispose();
      this._currentPlayer = null;
    }
    this._playerInstances.clear();

    // Уничтожаем систему подсказок
    if (this._tooltip) {
      this._tooltip.destroy();
    }

    this.element.remove();
    // Восстанавливаем прокрутку страницы, если был режим кинотеатра
    if (this._isTheaterMode) {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, this._scrollPosition);
    }
  }
}
// Запуск Alloha Helper
async function startAllohaHelper() {
  let hostnames = [
    "beggins-as.pljjalgo.online",
    "beggins-as.allarknow.online",
    "beggins-as.algonoew.online",
  ];
  if (!hostnames.includes(location.hostname)) return;
  new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      let target = mutation.target;
      if (target.matches(".select__drop-item.active")) {
        let event;
        if (target.closest("[data-select='seasonType1']")) {
          event = { event: "sp_season", season: +target.dataset.id };
        } else if (target.closest("[data-select='episodeType1']")) {
          event = { event: "sp_episode", episode: +target.dataset.id };
        } else if (target.closest("[data-select='translationType1']")) {
          event = {
            event: "sp_translation",
            translation: +target.dataset.id.match(/(?<=t)\d+/)[0],
          };
        }
        if (event) parent.postMessage(JSON.stringify(event), "*");
      }
    }
  }).observe(document, { subtree: true, attributeFilter: ["class"] });
}
// Запуск Shikiplayer с поддержкой Turbolinks
async function startShikiplayer() {
  const allowedHosts = ["shikimori.io"];
  if (!allowedHosts.includes(location.hostname)) return;
  
  const kodikToken = "a0457eb45312af80bbb9f3fb33de3e93";
  const kodikUid = "";
  let http = new GMHttp();
  let kodikApi = new KodikApi(http, kodikToken);
  let kinoboxApi = new KinoboxApi(http);
  let kpApi = new KpApigetApi(http);
  let allohaApi = new AllohaApi(http, "45e20a5f584becf7a64dffb7174ddf");
  let factories = [
    // new KodikFactory(kodikUid, kodikApi),
    new AllohaFactory(allohaApi),
    new SimpleFactory("Collaps"),
    // new SimpleFactory("Gendit"),
    new SimpleFactory("Flixcdn"),
    new SimpleFactory("Turbo")
  ];

  let shikiplayer = null;
  // Функция инициализации плеера
  async function initializePlayer() {
    if (shikiplayer) {
      shikiplayer.dispose(); // Очищаем текущий плеер
      shikiplayer = null;
    }
    
    // Перепроверяем URL при каждом событии turbolinks:load
    if (!location.pathname.startsWith("/animes/")) return;

    shikiplayer = new Shikiplayer(factories, kodikApi, kinoboxApi, kpApi);
    await shikiplayer.start(new AbortController().signal);
  }

  // Первичный запуск
  initializePlayer();
  // Обработка события Turbolinks
  document.addEventListener("turbolinks:load", initializePlayer);
}
void startAllohaHelper();
void startShikiplayer();