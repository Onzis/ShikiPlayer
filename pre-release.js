// ==UserScript==
// @name            ShikiPlayer (Dark Theme - Centered Button)
// @description     видеоплеер для просмотра прямо на Shikimori с тёмной темой
// @namespace       https://github.com/Onzis/ShikiPlayer
// @author          Onzis (Theme by AI Assistant)
// @license         GPL-3.0 license
// @version         1.51.3
// @homepageURL     https://github.com/Onzis/ShikiPlayer
// @updateURL       https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/pre-release.js
// @downloadURL     https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/pre-release.js
// @grant           GM.xmlHttpRequest
// @connect         shikimori.me
// @connect         kodikapi.com
// @connect         apicollaps.cc
// @connect         api.apbugall.org
// @connect         api.kinobox.tv
// @match           *://shikimori.one/*
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
  /* Основные цвета тёмной темы */
  --sp-bg-primary: #0a0a0a;
  --sp-bg-secondary: #1a1a1a;
  --sp-bg-tertiary: #252525;
  --sp-bg-hover: #2a2a2a;
  --sp-bg-active: #333333;
  
  /* Текстовые цвета */
  --sp-text-primary: #e0e0e0;
  --sp-text-secondary: #b0b0b0;
  --sp-text-muted: #808080;
  --sp-text-inverse: #000000;
  
  /* Акцентные цвета */
  --sp-accent: #6366f1;
  --sp-accent-hover: #818cf8;
  --sp-accent-active: #4f46e5;
  --sp-accent-light: #e0e7ff;
  
  /* Статусные цвета */
  --sp-success: #10b981;
  --sp-warning: #f59e0b;
  --sp-error: #ef4444;
  --sp-online: #22c55e;
  --sp-offline: #64748b;
  --sp-loading: #3b82f6;
  
  /* Границы и тени */
  --sp-border-color: #333333;
  --sp-border-light: #404040;
  --sp-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --sp-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --sp-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  --sp-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.6);
  
  /* Радиусы и отступы */
  --sp-radius-sm: 4px;
  --sp-radius-md: 8px;
  --sp-radius-lg: 12px;
  --sp-radius-xl: 16px;
  --sp-spacing-xs: 4px;
  --sp-spacing-sm: 8px;
  --sp-spacing-md: 16px;
  --sp-spacing-lg: 24px;
  --sp-spacing-xl: 32px;
  
  /* Анимации */
  --sp-transition-fast: 150ms ease;
  --sp-transition-normal: 250ms ease;
  --sp-transition-slow: 350ms ease;
}

/* Внешний контейнер для центрирования кнопки */
.sp-outer-wrapper {
  margin: var(--sp-spacing-lg) 0 !important;
}

/* Контейнер для кнопки с фоном как у плеера */
.sp-button-container {
  background: var(--sp-bg-primary) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-top: none !important;
  border-radius: 0 0 var(--sp-radius-lg) var(--sp-radius-lg) !important;
  padding: var(--sp-spacing-md) !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  margin-top: -1px !important;
}

/* Базовые стили для ShikiPlayer */
.sp-wrapper {
  background: var(--sp-bg-primary) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-radius: var(--sp-radius-lg) var(--sp-radius-lg) 0 0 !important;
  box-shadow: var(--sp-shadow-lg) !important;
  overflow: hidden !important;
  transition: all var(--sp-transition-normal) !important;
  position: relative !important;
}

.sp-wrapper:hover {
  box-shadow: var(--sp-shadow-xl) !important;
}

/* Контейнер плеера */
.sp-container {
  background: var(--sp-bg-secondary) !important;
  border-radius: var(--sp-radius-lg) var(--sp-radius-lg) 0 0 !important;
  overflow: hidden !important;
}

/* Заголовок плеера */
.sp-header {
  background: linear-gradient(135deg, var(--sp-bg-secondary) 0%, var(--sp-bg-tertiary) 100%) !important;
  padding: var(--sp-spacing-md) var(--sp-spacing-lg) !important;
  border-bottom: 1px solid var(--sp-border-color) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.sp-title {
  color: var(--sp-text-primary) !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: var(--sp-spacing-sm) !important;
}

.sp-title::before {
  content: "🎬" !important;
  font-size: 20px !important;
}

/* Выпадающий список плееров */
.sp-dropdown {
  position: relative !important;
  margin-left: auto !important;
}

.sp-dropdown-toggle {
  background: var(--sp-bg-tertiary) !important;
  border: 1px solid var(--sp-border-light) !important;
  border-radius: var(--sp-radius-md) !important;
  color: var(--sp-text-primary) !important;
  padding: var(--sp-spacing-sm) var(--sp-spacing-md) !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: var(--sp-spacing-sm) !important;
  transition: all var(--sp-transition-fast) !important;
  font-size: 14px !important;
  font-weight: 500 !important;
}

.sp-dropdown-toggle:hover {
  background: var(--sp-bg-hover) !important;
  border-color: var(--sp-accent) !important;
  transform: translateY(-1px) !important;
}

.sp-dropdown-toggle::after {
  content: "▼" !important;
  font-size: 12px !important;
  transition: transform var(--sp-transition-fast) !important;
}

.sp-dropdown.open .sp-dropdown-toggle::after {
  transform: rotate(180deg) !important;
}

.sp-dropdown-menu {
  position: absolute !important;
  top: 100% !important;
  right: 0 !important;
  background: var(--sp-bg-tertiary) !important;
  border: 1px solid var(--sp-border-light) !important;
  border-radius: var(--sp-radius-md) !important;
  box-shadow: var(--sp-shadow-xl) !important;
  min-width: 200px !important;
  z-index: 1000 !important;
  opacity: 0 !important;
  visibility: hidden !important;
  transform: translateY(-10px) !important;
  transition: all var(--sp-transition-fast) !important;
  margin-top: var(--sp-spacing-xs) !important;
  max-height: 300px !important;
  overflow-y: auto !important;
}

.sp-dropdown.open .sp-dropdown-menu {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
}

.sp-dropdown-item {
  padding: var(--sp-spacing-sm) var(--sp-spacing-md) !important;
  cursor: pointer !important;
  transition: all var(--sp-transition-fast) !important;
  display: flex !important;
  align-items: center !important;
  gap: var(--sp-spacing-sm) !important;
  color: var(--sp-text-secondary) !important;
  font-size: 14px !important;
  border-bottom: 1px solid var(--sp-border-color) !important;
}

.sp-dropdown-item:last-child {
  border-bottom: none !important;
}

.sp-dropdown-item:hover {
  background: var(--sp-bg-hover) !important;
  color: var(--sp-text-primary) !important;
}

.sp-dropdown-item.active {
  background: var(--sp-accent) !important;
  color: var(--sp-text-inverse) !important;
}

.sp-dropdown-item.loading {
  color: var(--sp-text-muted) !important;
  cursor: not-allowed !important;
}

/* Индикаторы статуса */
.sp-status-indicator {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  margin-left: auto !important;
  transition: all var(--sp-transition-fast) !important;
}

.sp-status-indicator.online {
  background: var(--sp-online) !important;
  box-shadow: 0 0 8px var(--sp-online) !important;
  animation: pulse 2s infinite !important;
}

.sp-status-indicator.offline {
  background: var(--sp-offline) !important;
}

.sp-status-indicator.loading {
  background: var(--sp-loading) !important;
  animation: spin 1s linear infinite !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Область просмотра плеера */
.sp-viewer {
  background: var(--sp-bg-primary) !important;
  min-height: 400px !important;
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
  background: rgba(10, 10, 10, 0.9) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 100 !important;
  backdrop-filter: blur(4px) !important;
}

.sp-loading-overlay::after {
  content: "" !important;
  width: 40px !important;
  height: 40px !important;
  border: 3px solid var(--sp-border-color) !important;
  border-top: 3px solid var(--sp-accent) !important;
  border-radius: 50% !important;
  animation: spin 1s linear infinite !important;
}

/* Кнопка режима кинотеатра - квадратная с закругленными углами */
.sp-theater-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 48px !important;
  height: 48px !important;
  padding: var(--sp-spacing-sm) !important;
  background: var(--sp-bg-tertiary) !important;
  border: 1px solid var(--sp-border-light) !important;
  border-radius: var(--sp-radius-md) !important;
  color: var(--sp-text-primary) !important;
  cursor: pointer !important;
  transition: all var(--sp-transition-fast) !important;
  box-shadow: var(--sp-shadow-sm) !important;
}

.sp-theater-btn:hover {
  background: var(--sp-bg-hover) !important;
  border-color: var(--sp-accent) !important;
  transform: translateY(-2px) !important;
  box-shadow: var(--sp-shadow-md) !important;
}

.sp-theater-btn:active {
  transform: translateY(0) !important;
  box-shadow: var(--sp-shadow-sm) !important;
}

.sp-theater-btn svg {
  width: 24px !important;
  height: 24px !important;
  flex-shrink: 0 !important;
}

/* Кнопка закрытия в режиме кинотеатра */
.sp-theater-close {
  position: absolute !important;
  top: var(--sp-spacing-md) !important;
  right: var(--sp-spacing-md) !important;
  width: 40px !important;
  height: 40px !important;
  background: rgba(0, 0, 0, 0.7) !important;
  border: 1px solid var(--sp-border-color) !important;
  border-radius: var(--sp-radius-md) !important;
  display: none !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  z-index: 10000 !important;
  transition: all var(--sp-transition-fast) !important;
  backdrop-filter: blur(4px) !important;
}

.sp-theater-close:hover {
  background: rgba(239, 68, 68, 0.8) !important;
  border-color: var(--sp-error) !important;
  transform: scale(1.1) !important;
}

.sp-theater-close svg {
  width: 20px !important;
  height: 20px !important;
  color: var(--sp-text-primary) !important;
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

/* Скроллбар */
.sp-dropdown-menu::-webkit-scrollbar {
  width: 6px !important;
}

.sp-dropdown-menu::-webkit-scrollbar-track {
  background: var(--sp-bg-secondary) !important;
}

.sp-dropdown-menu::-webkit-scrollbar-thumb {
  background: var(--sp-border-light) !important;
  border-radius: 3px !important;
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
  }
  
  .sp-dropdown {
    width: 100% !important;
  }
  
  .sp-dropdown-toggle {
    width: 100% !important;
    justify-content: space-between !important;
  }
  
  .sp-dropdown-menu {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 90% !important;
    max-width: 300px !important;
  }
}

/* Дополнительные улучшения */
.sp-wrapper * {
  box-sizing: border-box !important;
}

.sp-wrapper button,
.sp-wrapper select,
.sp-wrapper input {
  background: var(--sp-bg-tertiary) !important;
  border: 1px solid var(--sp-border-light) !important;
  border-radius: var(--sp-radius-sm) !important;
  color: var(--sp-text-primary) !important;
  padding: var(--sp-spacing-xs) var(--sp-spacing-sm) !important;
  transition: all var(--sp-transition-fast) !important;
}

.sp-wrapper button:hover,
.sp-wrapper select:hover,
.sp-wrapper input:hover {
  border-color: var(--sp-accent) !important;
}

.sp-wrapper button:focus,
.sp-wrapper select:focus,
.sp-wrapper input:focus {
  outline: none !important;
  border-color: var(--sp-accent) !important;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
}

/* Анимация появления */
.sp-outer-wrapper {
  animation: fadeInUp 0.5s ease-out !important;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

function injectDarkTheme() {
    if (document.getElementById('shikiplayer-dark-theme')) return;
    const style = document.createElement('style');
    style.id = 'shikiplayer-dark-theme';
    style.textContent = darkThemeCSS;
    document.head.appendChild(style);
}

injectDarkTheme();
// --- END OF CSS INJECTION ---


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
        let requestBody = init?.body
            ? await new Response(init.body).text()
            : undefined;
        let requestHeaders = init?.headers
            ? Object.fromEntries(new Headers(init.headers))
            : {};
        // Добавляем таймаут по умолчанию 5 секунд
        const timeout = init?.timeout || 5000;
        const timeoutId = setTimeout(() => {
            throw new Error(`Request timeout after ${timeout}ms`);
        }, timeout);
        let gmResponse = await new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                url: requestUrl,
                method: requestMethod,
                data: requestBody,
                headers: requestHeaders,
                responseType: "blob",
                timeout: timeout,
                onload: (response) => {
                    clearTimeout(timeoutId);
                    resolve(response);
                },
                onerror: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                },
                ontimeout: () => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Request timeout after ${timeout}ms`));
                },
            });
        });
        let responseHeaders = gmResponse.responseHeaders
            .trim()
            .split(/\r?\n/)
            .map((line) => line.split(/:\s*/, 2));
        return new Response(gmResponse.response, {
            status: gmResponse.status,
            statusText: gmResponse.statusText,
            headers: responseHeaders,
        });
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
// Alloha Player
class AllohaPlayer extends PlayerBase {
    constructor(url, season, lastEpisode) {
        super();
        this._url = url;
        this._season = season;
        this._lastEpisode = lastEpisode;
        this.element = document.createElement("iframe");
        this.element.allowFullscreen = true;
        this.element.width = "100%";
        this.element.style.aspectRatio = "16 / 9";
        this.rebuildIFrameSrc();
        addEventListener("message", this.onMessage);
    }
    name = "Alloha";
    element;
    _translation = "";
    _episode = 1;
    _season;
    _lastEpisode;
    _time = 0;
    getEpisode() {
        return this._episode;
    }
    setEpisode(value) {
        this._episode = Math.min(value, this._lastEpisode);
        this.rebuildIFrameSrc();
    }
    getSeason() {
        return this._season;
    }
    setSeason(value) {
        this._season = value;
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
        return this._translation;
    }
    setTranslation(value) {
        this._translation = value;
        this.rebuildIFrameSrc();
    }
    rebuildIFrameSrc() {
        let src = new URL(this._url);
        src.searchParams.set("season", this._season + "");
        src.searchParams.set("translation", this._translation);
        src.searchParams.set("episode", this._episode + "");
        src.searchParams.set("start", this._time + "");
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
        if (message.event === "timeupdate") {
            this._time = message.time;
        } else if (message.event === "sp_season") {
            this.setSeason(message.season);
        } else if (message.event === "sp_episode") {
            this.setEpisode(message.episode);
        } else if (message.event === "sp_translation") {
            this.setTranslation(message.translation);
        }
    };
    dispose() {
        removeEventListener("message", this.onMessage);
    }
}
// Alloha Factory
class AllohaFactory {
    constructor(kodikApi, allohaApi) {
        this._kodikApi = kodikApi;
        this._allohaApi = allohaApi;
    }
    name = "Alloha";
    async create(animeId, abort) {
        let kodikResults = await this._kodikApi.search(animeId);
        let kodikResult = kodikResults[0];
        if (!kodikResult) return null;
        let kinopoiskId = kodikResult.kinopoisk_id;
        let imdbId = kodikResult.imdb_id;
        let allohaResult = null;
        if (kinopoiskId)
            allohaResult = await this._allohaApi.index(kinopoiskId, undefined, abort);
        if (!allohaResult && imdbId)
            allohaResult = await this._allohaApi.index(undefined, imdbId, abort);
        if (
            !allohaResult ||
            allohaResult.status !== "success" ||
            !allohaResult.data?.iframe
        ) {
            console.error("Alloha: Invalid API response", allohaResult);
            return null;
        }
        let season = kodikResult.last_season || 1;
        let lastEpisode = allohaResult.data.seasons
            ? Object.keys(allohaResult.data.seasons[season]?.episodes || {}).length
            : 1;
        return new AllohaPlayer(allohaResult.data.iframe, season, lastEpisode);
    }
}
// Collaps Player
class CollapsPlayer extends PlayerBase {
    constructor(url, season, lastEpisode) {
        super();
        this._url = url;
        this._season = season;
        this._lastEpisode = lastEpisode;
        this.element = document.createElement("iframe");
        this.element.allowFullscreen = true;
        this.element.width = "100%";
        this.element.style.aspectRatio = "16 / 9";
        this.rebuildIFrameSrc();
    }
    name = "Collaps";
    element;
    _episode = 1;
    _time = 0;
    getEpisode() {
        return this._episode;
    }
    setEpisode(value) {
        this._episode = Math.min(value, this._lastEpisode);
        this.rebuildIFrameSrc();
    }
    getTime() {
        return this._time;
    }
    setTime(value) {
        this._time = value;
        this.rebuildIFrameSrc();
    }
    rebuildIFrameSrc() {
        let src = new URL(this._url);
        src.searchParams.set("season", this._season + "");
        src.searchParams.set("episode", this._episode + "");
        src.searchParams.set("time", this._time + "");
        this.element.src = src.toString();
    }
}
// Collaps Factory
class CollapsFactory {
    constructor(kodikApi, collapsApi) {
        this._kodikApi = kodikApi;
        this._collapsApi = collapsApi;
    }
    name = "Collaps";
    async create(animeId, abort) {
        let kodikResults = await this._kodikApi.search(animeId);
        let kodikResult = kodikResults[0];
        if (!kodikResult || !kodikResult.kinopoisk_id) return null;
        let collapsResults = await this._collapsApi.list(
            kodikResult.kinopoisk_id,
            abort
        );
        let collapsResult = collapsResults[0];
        if (!collapsResult) return null;
        let season = kodikResult.last_season || 1;
        let lastEpisode =
            collapsResult.seasons?.find((s) => s.season === season)?.episodes
                .length || 1;
        return new CollapsPlayer(collapsResult.iframe_url, season, lastEpisode);
    }
}
// Turbo Player
class TurboPlayer extends PlayerBase {
    constructor(url, season) {
        super();
        this._url = url;
        this._season = season;
        this.element = document.createElement("iframe");
        this.element.allowFullscreen = true;
        this.element.width = "100%";
        this.element.style.aspectRatio = "16 / 9";
        this.rebuildIFrameSrc();
    }
    name = "Turbo";
    element;
    rebuildIFrameSrc() {
        let src = new URL(this._url);
        this.element.src = src.toString();
    }
}
// Turbo Factory
class TurboFactory {
    constructor(kodikApi, kinoboxApi) {
        this._kodikApi = kodikApi;
        this._kinoboxApi = kinoboxApi;
    }
    name = "Turbo";
    async create(animeId, abort) {
        let kodikResults = await this._kodikApi.search(animeId);
        let kodikResult = kodikResults[0];
        if (!kodikResult || !kodikResult.kinopoisk_id) return null;
        let kinoboxResult = await this._kinoboxApi.players(
            kodikResult.kinopoisk_id,
            abort
        );
        let turbo = kinoboxResult.data.find((p) => p.type === "Turbo");
        if (!turbo || !turbo.iframeUrl) return null;
        let season = kodikResult.last_season || 1;
        return new TurboPlayer(turbo.iframeUrl, season);
    }
}
// Lumex Player
class LumexPlayer extends PlayerBase {
    constructor(url) {
        super();
        this._url = url;
        this.element = document.createElement("iframe");
        this.element.allowFullscreen = true;
        this.element.width = "100%";
        this.element.style.aspectRatio = "16 / 9";
        this.rebuildIFrameSrc();
    }
    name = "Lumex";
    element;
    rebuildIFrameSrc() {
        let src = new URL(this._url);
        this.element.src = src.toString();
    }
}
// Lumex Factory
class LumexFactory {
    constructor(kodikApi, kinoboxApi) {
        this._kodikApi = kodikApi;
        this._kinoboxApi = kinoboxApi;
    }
    name = "Lumex";
    async create(animeId, abort) {
        let kodikResults = await this._kodikApi.search(animeId);
        let kodikResult = kodikResults[0];
        if (!kodikResult || !kodikResult.kinopoisk_id) return null;
        let kinoboxResult = await this._kinoboxApi.players(
            kodikResult.kinopoisk_id,
            abort
        );
        let lumex = kinoboxResult.data.find((p) => p.type === "Lumex");
        if (!lumex || !lumex.iframeUrl) return null;
        return new LumexPlayer(lumex.iframeUrl);
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
            timeout: 3000,
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
                        typeof e.link === "string" &&
                        (typeof e.kinopoisk_id === "undefined" ||
                            typeof e.kinopoisk_id === "string") &&
                        (typeof e.imdb_id === "undefined" ||
                            typeof e.imdb_id === "string") &&
                        typeof e.translation === "object" &&
                        e.translation !== null &&
                        typeof e.translation.id === "number" &&
                        (typeof e.last_season === "undefined" ||
                            typeof e.last_season === "number")
                )
        );
        return data.results;
    }
}
// API для Alloha
class AllohaApi {
    constructor(http, token) {
        this._http = http;
        this._token = token;
    }
    async index(kinopoiskId, imdbId, abort) {
        let url = new URL("https://api.apbugall.org");
        url.searchParams.set("token", this._token);
        if (kinopoiskId) url.searchParams.set("kp", kinopoiskId);
        if (imdbId) url.searchParams.set("imdb", imdbId);
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
                typeof v.status === "string" &&
                typeof v.data === "object" &&
                v.data !== null &&
                typeof v.data.iframe === "string" &&
                (typeof v.data.seasons === "undefined" ||
                    (typeof v.data.seasons === "object" &&
                        v.data.seasons !== null &&
                        Object.values(v.data.seasons).every(
                            (s) =>
                                typeof s === "object" &&
                                s !== null &&
                                typeof s.episodes === "object" &&
                                s.episodes !== null
                        )))
        );
        return data;
    }
}
// API для Collaps
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
// API для Kinobox (используется для Turbo и Lumex)
class KinoboxApi {
    constructor(http) {
        this._http = http;
    }
    _sessionId = Math.trunc(Math.random() * 100);
    async players(kinopoisk, abort) {
        let url = new URL("https://api.kinobox.tv/api/players");
        url.searchParams.set("kinopoisk", kinopoisk + "");
        url.searchParams.set("ts", this.getTs());
        let response = await this._http.fetch(url, {
            headers: {
                Referer: "https://kinohost.web.app/",
                Origin: "https://kinohost.web.app",
                "Sec-Fetch-Site": "cross-site",
            },
            signal: abort,
            timeout: 5000,
        });
        if (!response.ok) throw new ResponseError(response);
        let text = await response.text();
        return Json.parse(
            text,
            (v) =>
                typeof v === "object" &&
                v !== null &&
                Array.isArray(v.data) &&
                v.data.every(
                    (e) =>
                        typeof e === "object" &&
                        e !== null &&
                        typeof e.type === "string" &&
                        (e.iframeUrl === null || typeof e.iframeUrl === "string")
                )
        );
    }
    getTs() {
        let s = Math.ceil(Date.now() / 1e3) % 1e5;
        let i = s % 100;
        let r = i - (i % 3);
        return s - i + r + "." + this._sessionId;
    }
}
// Основной класс Shikiplayer
class Shikiplayer {
    constructor(playerFactories) {
        this._playerFactories = playerFactories;
        // Создаем внешний контейнер
        this.element = document.createElement("div");
        this.element.className = "sp-outer-wrapper";

        // ИСПРАВЛЕННАЯ HTML СТРУКТУРА: кнопка в отдельном контейнере
        this.element.innerHTML = `
<div class="sp-wrapper">
  <div class="sp-container">
    <div class="sp-header">
      <div class="sp-title">Онлайн-просмотр</div>
      <div class="sp-dropdown">
        <div class="sp-dropdown-toggle">
          <span class="sp-selected-player">Выберите плеер</span>
        </div>
        <div class="sp-dropdown-menu"></div>
      </div>
    </div>
    <div class="sp-viewer">
      <div class="sp-loading-overlay"></div>
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
  <button class="sp-theater-btn" title="Режим кинотеатра">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    </svg>
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
        this._currentPlayer = null;
        this._playerInstances = new Map();
        this._isTheaterMode = false;
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
        // Загружаем остальные плееры в фоновом режиме
        for (let factory of this._playerFactories) {
            if (factory.name === "Kodik") continue; // Пропускаем Kodik, уже загружен
            let item = this._dropdownMenu.querySelector(
                `[data-player-name='${factory.name}']`
            );
            if (!item) continue;
            // Используем Promise без await, чтобы не блокировать выполнение
            factory
                .create(entry.id, abort)
                .then((player) => {
                    item.classList.remove("loading");
                    if (!player) {
                        item
                            .querySelector(".sp-status-indicator")
                            .classList.remove("loading");
                        item.querySelector(".sp-status-indicator").classList.add("offline");
                        return;
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
                })
                .catch((e) => {
                    console.error(`Error in ${factory.name}:`, e);
                    item
                        .querySelector(".sp-status-indicator")
                        .classList.remove("loading");
                    item.querySelector(".sp-status-indicator").classList.add("offline");
                    item.classList.remove("loading");
                });
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
    if (location.hostname !== "shikimori.one") return;
    const kodikToken = "a0457eb45312af80bbb9f3fb33de3e93";
    const kodikUid = "neBQ6J";
    const allohaToken = "96b62ea8e72e7452b652e461ab8b89";
    const collapsToken = "4c250f7ac0a8c8a658c789186b9a58a5";
    let http = new GMHttp();
    let kodikApi = new KodikApi(http, kodikToken);
    let allohaApi = new AllohaApi(http, allohaToken);
    let collapsApi = new CollapsApi(http, collapsToken);
    let kinoboxApi = new KinoboxApi(http);
    let factories = [
        new KodikFactory(kodikUid, kodikApi),
        new AllohaFactory(kodikApi, allohaApi),
        new TurboFactory(kodikApi, kinoboxApi),
        new LumexFactory(kodikApi, kinoboxApi),
        new CollapsFactory(kodikApi, collapsApi),
    ];
    let shikiplayer = null;
    // Функция инициализации плеера
    async function initializePlayer() {
        if (shikiplayer) {
            shikiplayer.dispose(); // Очищаем текущий плеер
        }
        shikiplayer = new Shikiplayer(factories);
        await shikiplayer.start(new AbortController().signal);
    }
    // Первичный запуск
    initializePlayer();
    // Обработка события Turbolinks
    document.addEventListener("turbolinks:load", initializePlayer);
}
void startAllohaHelper();
void startShikiplayer();
