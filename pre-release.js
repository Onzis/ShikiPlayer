// ==UserScript==
// @name            ShikiPlayer
// @description     видеоплеер для просмотра прямо на Shikimori
// @namespace       https://github.com/Onzis/ShikiPlayer
// @author          Onzis
// @license         GPL-3.0 license
// @version         1.51.1
// @homepageURL     https://github.com/Onzis/ShikiPlayer
// @updateURL       https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @downloadURL     https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
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
    this.element = document.createElement("div");
    this.element.innerHTML = `
      <style>
        .sp-container {
          margin: 20px 0;
          background: linear-gradient(135deg, #2c3e50, #4a69bd);
          border-radius: 12px;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .sp-container:hover {
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
          transform: translateY(-2px);
        }
        
        .sp-header {
          padding: 5px 20px;
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .sp-title {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        
        .sp-dropdown {
          position: relative;
          width: 100px;
        }
        
        .sp-dropdown-toggle {
          width: 100%;
          padding: 10px 15px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
        }
        
        .sp-dropdown-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .sp-dropdown-toggle::after {
          content: '';
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #fff;
          transition: transform 0.2s ease;
        }
        
        .sp-dropdown.open .sp-dropdown-toggle::after {
          transform: rotate(180deg);
        }
        
        .sp-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 5px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s ease;
          z-index: 1000;
        }
        
        .sp-dropdown.open .sp-dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .sp-dropdown-item {
          padding: 12px 15px;
          color: #333;
          cursor: pointer;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
        }
        
        .sp-dropdown-item:hover {
          background: #f5f5f5;
        }
        
        .sp-dropdown-item.active {
          background: #4a69bd;
          color: #fff;
        }
        
        .sp-dropdown-item.loading {
          color: #999;
          cursor: default;
        }
        
        .sp-dropdown-item.loading::after {
          content: '';
          display: inline-block;
          width: 12px;
          height: 12px;
          margin-left: 8px;
          border: 2px solid #ddd;
          border-top-color: #4a69bd;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .sp-viewer {
          position: relative;
          width: 100%;
          background: #000;
          overflow: hidden;
        }
        
        .sp-viewer iframe {
          display: block;
          width: 100%;
          border: none;
        }
        
        .sp-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 16px;
          z-index: 100;
        }
        
        .sp-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 15px;
        }
        
        .sp-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
        }
        
        .sp-status-indicator.online {
          background: #2ecc71;
        }
        
        .sp-status-indicator.offline {
          background: #e74c3c;
        }
        
        .sp-status-indicator.loading {
          background: #f39c12;
        }
      </style>
      <div class="sp-container">
        <div class="sp-header">
          <h3 class="sp-title">онлайн просмотр</h3>
          <div class="sp-dropdown">
            <div class="sp-dropdown-toggle">
              <span class="sp-selected-player">Выберите плеер</span>
            </div>
            <div class="sp-dropdown-menu"></div>
          </div>
        </div>
        <div class="sp-viewer">
          <div class="sp-loading-overlay">
            <div class="sp-loading-spinner"></div>
            <span>Загрузка плеера...</span>
          </div>
        </div>
      </div>
    `;

    this._dropdown = this.element.querySelector(".sp-dropdown");
    this._dropdownToggle = this.element.querySelector(".sp-dropdown-toggle");
    this._dropdownMenu = this.element.querySelector(".sp-dropdown-menu");
    this._selectedPlayerText = this.element.querySelector(
      ".sp-selected-player"
    );
    this._viewer = this.element.querySelector(".sp-viewer");
    this._loadingOverlay = this.element.querySelector(".sp-loading-overlay");

    this._currentPlayer = null;
    this._playerInstances = new Map();

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
  }

  async start(abort) {
    // Очищаем предыдущий контейнер, если он существует
    let existing = document.querySelector(".sp-container");
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
        <span class="sp-status-indicator loading"></span>
        <span>${factory.name}</span>
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
