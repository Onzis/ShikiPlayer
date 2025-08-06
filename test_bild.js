// ==UserScript==
// @name ShikiPlayer
// @namespace https://github.com/Onzis/ShikiPlayer
// @version 1.10
// @description Автоматически загружает видеоплеер для просмотра прямо на Shikimori (Kodik и Alloha) и выбирает следующую серию на основе просмотренных эпизодов
// @author Onzis
// @match https://shikimori.one/*
// @homepageURL https://github.com/Onzis/ShikiPlayer
// @updateURL https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @downloadURL https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @connect api.alloha.tv
// @connect kodikapi.com
// @connect shikimori.one
// @grant GM.xmlHttpRequest
// @license GPL-3.0 license
// ==/UserScript==

(function () {
  "use strict";

  let currentPath = location.pathname;
  let observer = null;
  let currentPlayer = "kodik";
  let isInserting = false;
  const KodikToken = "447d179e875efe44217f20d1ee2146be";
  const AllohaToken = "96b62ea8e72e7452b652e461ab8b89";
  const CACHE_DURATION = 60 * 60 * 1000;

  function getShikimoriID() {
    const match = location.pathname.match(/\/animes\/(?:[a-z])?(\d+)/);
    return match ? match[1] : null;
  }

  function removeOldElements() {
    const oldIframe = document.querySelector('iframe[src*="kodik.cc"], iframe[src*="alloha.tv"]');
    oldIframe?.remove();
  }

  function insertPlayerContainer() {
    if (isInserting || !/^\/animes\/[^/]+/.test(location.pathname) || document.querySelector(".kodik-container")) {
      return;
    }

    isInserting = true;
    removeOldElements();

    const relatedBlock = document.querySelector(".cc-related-authors");
    if (relatedBlock) {
      createAndInsertPlayer(relatedBlock).finally(() => {
        isInserting = false;
      });
    } else {
      isInserting = false;
    }
  }

  async function createAndInsertPlayer(relatedBlock) {
    if (!document.querySelector("style#kodik-styles")) {
      const style = document.createElement("style");
      style.id = "kodik-styles";
      style.textContent = `
        .kodik-container { margin: 20px auto; width: 100%; max-width: 900px; }
        .kodik-header { display: flex; justify-content: space-between; align-items: center; background: #e6e8ea; padding: 8px 12px; font-size: 14px; font-weight: 600; color: #333; border-radius: 6px 6px 0 0; }
        .kodik-links a { text-decoration: none; color: #333; font-size: 12px; }
        .player-selector { display: flex; gap: 8px; }
        .player-selector button { padding: 4px 8px; font-size: 12px; cursor: pointer; background: #f0f2f4; border: none; border-radius: 4px; }
        .player-selector button:hover { background: #d0d2d4; }
        .player-wrapper { position: relative; width: 100%; padding-bottom: 56.25%; overflow: hidden; border-radius: 0 0 6px 6px; }
        .player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
        .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #333; font-size: 14px; }
        .error-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; font-size: 14px; text-align: center; }
        @media (max-width: 768px) {
          .kodik-container { margin: 10px auto; }
          .kodik-header { padding: 6px 10px; font-size: 13px; }
          .kodik-links a, .player-selector button { font-size: 11px; }
          .player-wrapper { padding-bottom: 60%; }
        }
      `;
      document.head.appendChild(style);
    }

    const playerContainer = document.createElement("div");
    playerContainer.classList.add("kodik-container");
    playerContainer.innerHTML = `
      <div class="kodik-header">
        <span>ОНЛАЙН ПРОСМОТР</span>
        <div class="kodik-links">
          <a href="https://github.com/Onzicry/ShikiPlayer" target="_blank">GitHub</a>
        </div>
        <div class="player-selector">
          <button id="kodik-btn">Kodik</button>
          <button id="alloha-btn">Alloha</button>
        </div>
      </div>
      <div class="player-wrapper"><div class="loader">Загрузка...</div></div>
    `;

    const id = getShikimoriID();
    if (!id) return;

    relatedBlock.parentNode.insertBefore(playerContainer, relatedBlock);
    if (observer) observer.disconnect();

    let nextEpisode = 1;
    let totalEpisodes = 0;
    try {
      const shikimoriData = await getShikimoriAnimeData(id);
      if (shikimoriData) {
        totalEpisodes = shikimoriData.episodes || shikimoriData.episodes_aired || 0;
        if (shikimoriData.user_rate?.episodes) {
          nextEpisode = Math.min(shikimoriData.user_rate.episodes + 1, totalEpisodes || Infinity);
        }
      }
    } catch (error) {
      playerContainer.querySelector(".player-wrapper").innerHTML = `<div class="error-message">Ошибка загрузки данных. Эпизод 1.</div>`;
    }

    const kodikBtn = playerContainer.querySelector("#kodik-btn");
    const allohaBtn = playerContainer.querySelector("#alloha-btn");
    kodikBtn.addEventListener("click", () => switchPlayer("kodik", id, playerContainer, nextEpisode));
    allohaBtn.addEventListener("click", () => switchPlayer("alloha", id, playerContainer, nextEpisode));

    setupLazyLoading(playerContainer, () => switchPlayer(currentPlayer, id, playerContainer, nextEpisode));
  }

  async function getShikimoriAnimeData(id) {
    const cacheKey = `shikimori_anime_${id}`;
    let cachedData = getCachedData(cacheKey);
    if (cachedData) return cachedData;

    try {
      const response = await gmGet(`https://shikimori.one/api/animes/${id}`);
      const data = JSON.parse(response);
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error("[ShikiPlayer] Ошибка Shikimori API:", error);
      throw error;
    }
  }

  async function switchPlayer(playerType, id, playerContainer, episode) {
    currentPlayer = playerType;
    const playerWrapper = playerContainer.querySelector(".player-wrapper");
    playerWrapper.innerHTML = `<div class="loader">Загрузка...</div>`;

    try {
      const iframe = document.createElement("iframe");
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "autoplay *; fullscreen *");
      iframe.setAttribute("loading", "lazy");

      if (playerType === "kodik") {
        iframe.src = `https://kodik.cc/find-player?shikimoriID=${id}&episode=${episode}`;
      } else if (playerType === "alloha") {
        const iframeUrl = await loadAllohaPlayer(id, episode);
        iframe.src = iframeUrl;
      } else {
        throw new Error("Неизвестный тип плеера");
      }

      playerWrapper.innerHTML = "";
      playerWrapper.appendChild(iframe);
    } catch (error) {
      playerWrapper.innerHTML = `<div class="error-message">Ошибка загрузки плеера ${playerType}. Попробуйте позже.</div>`;
    }
  }

  function gmGet(url) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url,
        headers: { "Cache-Control": "no-cache" },
        onload: ({ status, responseText }) => status >= 200 && status < 300 ? resolve(responseText) : reject(new Error(`HTTP ${status}`)),
        onerror: reject
      });
    });
  }

  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) return data;
    }
    return null;
  }

  function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  }

  async function loadAllohaPlayer(id, episode) {
    const cacheKey = `alloha_${id}`;
    let iframeUrl = getCachedData(cacheKey);
    if (iframeUrl) return `${iframeUrl}&episode=${episode}&season=1`;

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      const kodikResponse = await gmGet(`https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`);
      kodikData = JSON.parse(kodikResponse);
      setCachedData(kodikCacheKey, kodikData);
    }

    const results = kodikData.results;
    if (!results?.length) throw new Error("Нет результатов от Kodik API");

    const { kinopoisk_id, imdb_id, last_season = 1 } = results[0];
    const allohaUrl = kinopoisk_id ? `https://api.alloha.tv?token=${AllohaToken}&kp=${kinopoisk_id}` : `https://api.alloha.tv?token=${AllohaToken}&imdb=${imdb_id}`;
    if (!allohaUrl) throw new Error("Kinopoisk ID или IMDB ID не найдены");

    const allohaResponse = await gmGet(allohaUrl);
    const allohaData = JSON.parse(allohaResponse);
    if (allohaData.status !== "success") throw new Error("Ошибка Alloha API");

    iframeUrl = allohaData.data.iframe;
    setCachedData(cacheKey, iframeUrl);
    return `${iframeUrl}&episode=${episode}&season=${last_season}`;
  }

  function setupLazyLoading(container, callback) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(container);
  }

  function setupDOMObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      if (document.querySelector(".kodik-container")) return;

      for (const mutation of mutations) {
        if ([...mutation.addedNodes].some(node => node.nodeType === 1 && node.querySelector?.(".cc-related-authors"))) {
          insertPlayerContainer();
          break;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  function watchURLChanges() {
    const checkURL = debounce(() => {
      if (location.pathname !== currentPath) {
        currentPath = location.pathname;
        document.querySelector(".kodik-container")?.remove();
        insertPlayerContainer();
      }
    }, 300);
    setInterval(checkURL, 300);
  }

  setupDOMObserver();
  watchURLChanges();
  insertPlayerContainer();
})();
