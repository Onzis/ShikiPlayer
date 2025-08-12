// ==UserScript==
// @name         ShikiPlayer
// @namespace    https://github.com/Onzis/ShikiPlayer
// @version      1.17
// @description  Автоматически загружает видеоплеер для просмотра прямо на Shikimori (Kodik, Alloha, Turbo) и выбирает следующую серию на основе просмотренных эпизодов
// @author       Onzis
// @match        https://shikimori.one/*
// @homepageURL  https://github.com/Onzis/ShikiPlayer
// @updateURL    https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @downloadURL  https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @connect      api.alloha.tv
// @connect      kodikapi.com
// @connect      shikimori.one
// @connect      api.kinobox.tv
// @grant        GM.xmlHttpRequest
// @license      GPL-3.0 license
// ==/UserScript==

(function () {
  "use strict";

  let currentPath = location.pathname;
  let observer = null;
  let currentPlayer = "kodik";
  let isInserting = false;
  const KodikToken = "447d179e875efe44217f20d1ee2146be";
  const AllohaToken = "96b62ea8e72e7452b652e461ab8b89";

  function getShikimoriID() {
    const match = location.pathname.match(/\/animes\/(?:[a-z])?(\d+)/);
    return match ? match[1] : null;
  }

  function removeOldElements() {
    const oldIframe = document.querySelector(
      'iframe[src*="kodik.cc"], iframe[src*="alloha.tv"], iframe[src*="turbo.to"]'
    );
    oldIframe?.remove();
  }

  function insertPlayerContainer() {
    if (
      isInserting ||
      !/^\/animes\/[^/]+/.test(location.pathname) ||
      document.querySelector(".kodik-container")
    ) {
      return;
    }

    const relatedBlock =
      document.querySelector(".cc-related-authors") || document.querySelector(".sidebar");

    if (!relatedBlock) {
      setTimeout(insertPlayerContainer, 500);
      return;
    }

    isInserting = true;
    removeOldElements();

    createAndInsertPlayer(relatedBlock).finally(() => {
      isInserting = false;
    });
  }

  async function createAndInsertPlayer(relatedBlock) {
    if (!document.querySelector("style#kodik-styles")) {
      const style = document.createElement("style");
      style.id = "kodik-styles";
      style.textContent = `
        .kodik-container { margin: 10px auto; width: 100%; max-width: 900px; }
        .kodik-header { display: flex; justify-content: space-between; align-items: center; background: #e6e8ea; padding: 6px 10px; font-size: 13px; font-weight: 600; color: #333; border-radius: 6px 6px 0 0; }
        .kodik-links a { text-decoration: none; color: #333; font-size: 11px; }
        .player-selector { display: flex; gap: 6px; }
        .player-selector button { padding: 4px 6px; font-size: 11px; cursor: pointer; background: #f0f2f4; border: none; border-radius: 4px; }
        .player-selector button:hover { background: #d0d2d4; }
        .player-wrapper { position: relative; width: 100%; padding-bottom: 56.25%; overflow: hidden; border-radius: 0 0 6px 6px; background: #000; }
        .player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
        .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 13px; z-index: 1; }
        .error-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; font-size: 13px; text-align: center; z-index: 1; }
        @media (max-width: 768px) {
          .kodik-container { margin: 5px auto; }
          .kodik-header { padding: 5px 8px; font-size: 12px; }
          .kodik-links a, .player-selector button { font-size: 10px; }
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
          <button id="turbo-btn">Turbo</button>
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
      playerContainer.querySelector(
        ".player-wrapper"
      ).innerHTML = `<div class="error-message">Ошибка загрузки данных. Эпизод 1.</div>`;
    }

    const kodikBtn = playerContainer.querySelector("#kodik-btn");
    const allohaBtn = playerContainer.querySelector("#alloha-btn");
    const turboBtn = playerContainer.querySelector("#turbo-btn");
    kodikBtn.addEventListener("click", () =>
      switchPlayer("kodik", id, playerContainer, nextEpisode)
    );
    allohaBtn.addEventListener("click", () =>
      switchPlayer("alloha", id, playerContainer, nextEpisode)
    );
    turboBtn.addEventListener("click", () =>
      switchPlayer("turbo", id, playerContainer, nextEpisode)
    );

    setupLazyLoading(playerContainer, () =>
      switchPlayer(currentPlayer, id, playerContainer, nextEpisode)
    );
  }

  async function getShikimoriAnimeData(id) {
    const cacheKey = `shikimori_anime_${id}`;
    let cachedData = getCachedData(cacheKey);
    if (cachedData) return cachedData;

    try {
      const response = await gmGetWithTimeout(`https://shikimori.one/api/animes/${id}`);
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
      if (playerType === "alloha" && !checkVideoCodecSupport()) {
        throw new Error("Ваш браузер не поддерживает необходимые кодеки для Alloha");
      }

      const iframe = document.createElement("iframe");
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "autoplay *; fullscreen *; encrypted-media");
      iframe.setAttribute("playsinline", "true");
      iframe.setAttribute("loading", "lazy");

      if (playerType === "kodik") {
        iframe.src = `https://kodik.cc/find-player?shikimoriID=${id}&episode=${episode}`;
      } else if (playerType === "alloha") {
        const iframeUrl = await loadAllohaPlayer(id, episode);
        iframe.src = iframeUrl;
      } else if (playerType === "turbo") {
        const iframeUrl = await loadTurboPlayer(id, episode);
        iframe.src = iframeUrl;
      } else {
        throw new Error("Неизвестный тип плеера");
      }

      playerWrapper.innerHTML = "";
      playerWrapper.appendChild(iframe);
    } catch (error) {
      playerWrapper.innerHTML = `<div class="error-message">Ошибка загрузки плеера ${playerType}: ${error.message}. Попробуйте другой плеер.</div>`;
    }
  }

  function gmGetWithTimeout(url, options = {}) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url,
        headers: { "Cache-Control": "no-cache", ...options.headers },
        onload: ({ status, responseText }) => {
          status >= 200 && status < 300 ? resolve(responseText) : reject(new Error(`HTTP ${status}`));
        },
        onerror: (error) => {
          reject(error);
        }
      });
    });
  }

  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return null;
  }

  function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({ data }));
  }

  async function loadAllohaPlayer(id, episode) {
    const cacheKey = `alloha_${id}`;
    let iframeUrl = getCachedData(cacheKey);

    if (iframeUrl) {
      return `${iframeUrl}&episode=${episode}&season=1`;
    }

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      try {
        const kodikResponse = await gmGetWithTimeout(`https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`);
        kodikData = JSON.parse(kodikResponse);
        setCachedData(kodikCacheKey, kodikData);
      } catch (error) {
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) throw new Error("Нет результатов от Kodik API");

    const { kinopoisk_id, imdb_id, last_season = 1 } = results[0];
    const allohaUrl = kinopoisk_id
      ? `https://api.alloha.tv?token=${AllohaToken}&kp=${kinopoisk_id}`
      : `https://api.alloha.tv?token=${AllohaToken}&imdb=${imdb_id}`;

    if (!allohaUrl) throw new Error("Kinopoisk ID или IMDB ID не найдены");

    async function tryFetchAlloha(retries = 3, delayMs = 1000) {
      for (let i = 0; i < retries; i++) {
        try {
          const allohaResponse = await gmGetWithTimeout(allohaUrl);
          const allohaData = JSON.parse(allohaResponse);
          if (allohaData.status === "success" && allohaData.data?.iframe) {
            return allohaData.data.iframe;
          } else {
            throw new Error("Ошибка Alloha API: " + (allohaData.error_info || "Неизвестная ошибка"));
          }
        } catch (error) {
          if (i === retries - 1) {
            throw error;
          }
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }

    try {
      const iframeUrl = await tryFetchAlloha();
      setCachedData(cacheKey, iframeUrl);
      return `${iframeUrl}&episode=${episode}&season=${last_season}`;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      throw new Error("Ошибка загрузки Alloha: " + error.message);
    }
  }

  async function loadTurboPlayer(id, episode) {
    const cacheKey = `turbo_${id}`;
    let iframeUrl = getCachedData(cacheKey);

    if (iframeUrl) {
      return iframeUrl;
    }

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      try {
        const kodikResponse = await gmGetWithTimeout(`https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`);
        kodikData = JSON.parse(kodikResponse);
        setCachedData(kodikCacheKey, kodikData);
      } catch (error) {
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) throw new Error("Нет результатов от Kodik API");

    const { kinopoisk_id } = results[0];
    if (!kinopoisk_id) throw new Error("Kinopoisk ID не найден");

    const kinoboxUrl = `https://api.kinobox.tv/api/players?kinopoisk=${kinopoisk_id}`;

    async function tryFetchKinobox(retries = 3, delayMs = 1000) {
      for (let i = 0; i < retries; i++) {
        try {
          const kinoboxResponse = await gmGetWithTimeout(kinoboxUrl, {
            headers: {
              Referer: "https://kinohost.web.app/",
              Origin: "https://kinohost.web.app",
              "Sec-Fetch-Site": "same-origin",
            },
          });
          const kinoboxData = JSON.parse(kinoboxResponse);
          const turboPlayer = kinoboxData.data?.find((player) => player.type === "Turbo");
          if (turboPlayer?.iframeUrl) {
            return turboPlayer.iframeUrl;
          } else {
            throw new Error("Turbo плеер не найден в Kinobox API");
          }
        } catch (error) {
          if (i === retries - 1) {
            throw error;
          }
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }

    try {
      const iframeUrl = await tryFetchKinobox();
      setCachedData(cacheKey, iframeUrl);
      return iframeUrl;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      throw new Error("Ошибка загрузки Turbo: " + error.message);
    }
  }

  function checkVideoCodecSupport() {
    const video = document.createElement("video");
    return (
      video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') === "probably" ||
      video.canPlayType('video/webm; codecs="vp9, vorbis"') === "probably"
    );
  }

  function setupLazyLoading(container, callback) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );
    observer.observe(container);
  }

  function setupDOMObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      if (document.querySelector(".kodik-container")) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === 1 &&
            (node.matches(".cc-related-authors, .sidebar") ||
              node.querySelector(".cc-related-authors, .sidebar"))
          ) {
            insertPlayerContainer();
            return;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function watchURLChanges() {
    let lastPath = location.pathname;

    const onUrlChange = () => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        document.querySelector(".kodik-container")?.remove();
        insertPlayerContainer();
      }
    };

    const pushState = history.pushState;
    history.pushState = function () {
      pushState.apply(this, arguments);
      onUrlChange();
    };

    const replaceState = history.replaceState;
    history.replaceState = function () {
      replaceState.apply(this, arguments);
      onUrlChange();
    };

    window.addEventListener("popstate", onUrlChange);
  }

  setupDOMObserver();
  watchURLChanges();
  insertPlayerContainer();
})();
