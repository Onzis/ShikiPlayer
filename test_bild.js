// ==UserScript==
// @name         ShikiPlayer
// @namespace    https://github.com/Onzis/ShikiPlayer
// @version      1.24
// @description  Автоматически загружает видеоплеер для просмотра прямо на Shikimori (Kodik, Alloha, Turbo) с уведомлениями об ошибках.
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
  let currentPlayer = "turbo";
  let isInserting = false;
  const KodikToken = "447d179e875efe44217f20d1ee2146be";
  const AllohaToken = "96b62ea8e72e7452b652e461ab8b89";

  /**
   * Показывает всплывающее уведомление.
   * @param {string} message - Текст уведомления.
   * @param {string} [type='error'] - Тип уведомления ('error', 'info', 'success').
   * @param {number} [duration=5000] - Длительность показа в миллисекундах.
   */
  function showToast(message, type = 'error', duration = 5000) {
    let toastContainer = document.getElementById('shiki-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'shiki-toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = `shiki-toast shiki-toast--${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);

    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
  }


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

  function insertPlayerContainer(attempts = 10, delay = 200) {
    console.log(`[ShikiPlayer] Попытка создать контейнер, попыток осталось: ${attempts}, URL: ${location.pathname}`);
    if (
      isInserting ||
      !/^\/animes\/[^/]+/.test(location.pathname) ||
      document.querySelector(".kodik-container")
    ) {
      console.log("[ShikiPlayer] Создание контейнера прервано: уже существует или неверный URL");
      return;
    }

    const relatedBlock =
      document.querySelector(".cc-related-authors") || document.querySelector(".sidebar");

    if (!relatedBlock) {
      console.log("[ShikiPlayer] relatedBlock не найден, повтор через", delay, "мс");
      if (attempts > 0) {
        setTimeout(() => insertPlayerContainer(attempts - 1, delay), delay);
      }
      return;
    }

    console.log("[ShikiPlayer] relatedBlock найден, создаём плеер");
    isInserting = true;
    removeOldElements();

    createAndInsertPlayer(relatedBlock).finally(() => {
      isInserting = false;
      console.log("[ShikiPlayer] Плеер создан или ошибка");
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
        .player-selector select { padding: 4px 6px; font-size: 11px; cursor: pointer; background: #f0f2f4; border: none; border-radius: 4px; }
        .player-selector select:focus { outline: none; background: #d0d2d4; }
        .player-wrapper { position: relative; width: 100%; padding-bottom: 56.25%; overflow: hidden; border-radius: 0 0 6px 6px; background: #000; }
        .player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
        .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 13px; z-index: 1; }
        .error-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; font-size: 13px; text-align: center; z-index: 1; }
        @media (max-width: 768px) {
          .kodik-container { margin: 5px auto; }
          .kodik-header { padding: 5px 8px; font-size: 12px; }
          .kodik-links a, .player-selector select { font-size: 10px; }
          .player-wrapper { padding-bottom: 60%; }
        }

        /* === ИЗМЕНЕННЫЕ СТИЛИ УВЕДОМЛЕНИЙ === */
        #shiki-toast-container {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            display: flex;
            flex-direction: column-reverse;
            gap: 10px;
            align-items: center;
        }
        .shiki-toast {
            background-color: rgba(25, 25, 25, 0.65);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px 20px;
            border-radius: 8px;
            color: #f0f0f0;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            opacity: 0;
            transform: translateY(100%);
            transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .shiki-toast.show {
            opacity: 1;
            transform: translateY(0);
        }
        .shiki-toast--error { border-left: 4px solid #e74c3c; }
        .shiki-toast--info { border-left: 4px solid #3498db; }
        .shiki-toast--success { border-left: 4px solid #2ecc71; }
      `;
      document.head.appendChild(style);
    }

    const playerContainer = document.createElement("div");
    playerContainer.classList.add("kodik-container");
    playerContainer.innerHTML = `
      <div class="kodik-header">
        <span>ОНЛАЙН ПРОСМОТР</span>
        <div class="kodik-links">
          <a href="https://github.com/Onzis/ShikiPlayer" target="_blank">GitHub</a>
        </div>
        <div class="player-selector">
          <select id="player-select">
            <option value="turbo" ${currentPlayer === 'turbo' ? 'selected' : ''}>Turbo</option>
            <option value="alloha" ${currentPlayer === 'alloha' ? 'selected' : ''}>Alloha</option>
            <option value="kodik" ${currentPlayer === 'kodik' ? 'selected' : ''}>Kodik</option>
          </select>
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
      showToast('Ошибка загрузки данных с Shikimori.');
    }

    const playerSelect = playerContainer.querySelector("#player-select");
    playerSelect.addEventListener("change", () =>
      switchPlayer(playerSelect.value, id, playerContainer, nextEpisode)
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

    const playerSelect = playerContainer.querySelector("#player-select");
    playerSelect.value = playerType;

    try {
      const iframe = document.createElement("iframe");
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "autoplay *; fullscreen *; encrypted-media");
      iframe.setAttribute("playsinline", "true");
      iframe.setAttribute("loading", "lazy");

      // Try Turbo first
      if (playerType === "turbo") {
        try {
          const iframeUrl = await loadTurboPlayer(id, episode);
          iframe.src = iframeUrl;
          playerWrapper.innerHTML = "";
          playerWrapper.appendChild(iframe);
          return;
        } catch (error) {
          console.warn("[ShikiPlayer] Turbo unavailable, falling back to Alloha");
          showToast('Плеер Turbo недоступен, переключаюсь на Alloha.', 'info');
          currentPlayer = "alloha";
          playerSelect.value = "alloha";
        }
      }

      // Try Alloha if Turbo fails or if Alloha was selected
      if (currentPlayer === "alloha") {
        if (!checkVideoCodecSupport()) {
          console.warn("[ShikiPlayer] Alloha codecs not supported, falling back to Kodik");
          showToast('Ваш браузер не поддерживает кодеки Alloha, переключаюсь на Kodik.', 'info');
          currentPlayer = "kodik";
          playerSelect.value = "kodik";
        } else {
          try {
            const iframeUrl = await loadAllohaPlayer(id, episode);
            iframe.src = iframeUrl;
            playerWrapper.innerHTML = "";
            playerWrapper.appendChild(iframe);
            return;
          } catch (error) {
            console.warn("[ShikiPlayer] Alloha unavailable, falling back to Kodik");
            showToast('Плеер Alloha недоступен, переключаюсь на Kodik.', 'info');
            currentPlayer = "kodik";
            playerSelect.value = "kodik";
          }
        }
      }

      // Fallback to Kodik
      if (currentPlayer === "kodik") {
        iframe.src = `https://kodik.cc/find-player?shikimoriID=${id}&episode=${episode}`;
        playerWrapper.innerHTML = "";
        playerWrapper.appendChild(iframe);
        return;
      }

      throw new Error("Неизвестный тип плеера");
    } catch (error) {
        const displayMessage = `Ошибка: ${error.message}. Попробуйте другой плеер.`;
        playerWrapper.innerHTML = `<div class="error-message">${displayMessage}</div>`;
        showToast(displayMessage);
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

    if (!kinopoisk_id && !imdb_id) throw new Error("Kinopoisk ID или IMDB ID не найдены");

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
      iframeUrl = await tryFetchAlloha();
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

    async function tryFetchKinobox(retries = 3) {
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
        }
      }
    }

    try {
      iframeUrl = await tryFetchKinobox();
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

      if (/^\/animes\/[^/]+/.test(location.pathname)) {
        console.log("[ShikiPlayer] DOM изменился, пытаемся создать контейнер");
        insertPlayerContainer();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function watchURLChanges() {
    let lastPath = location.pathname;

    const checkUrlChange = () => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        console.log("[ShikiPlayer] URL изменился:", lastPath);
        document.querySelector(".kodik-container")?.remove();
        insertPlayerContainer();
      }
    };

    setInterval(checkUrlChange, 300);

    const pushState = history.pushState;
    history.pushState = function () {
      pushState.apply(this, arguments);
      checkUrlChange();
    };

    const replaceState = history.replaceState;
    history.replaceState = function () {
      replaceState.apply(this, arguments);
      checkUrlChange();
    };

    window.addEventListener("popstate", checkUrlChange);
  }

  window.manualInsertPlayer = function () {
    console.log("[ShikiPlayer] Ручной вызов insertPlayerContainer");
    document.querySelector(".kodik-container")?.remove();
    insertPlayerContainer();
  };

  document.addEventListener("turbolinks:load", () => {
    console.log("[ShikiPlayer] Turbolinks: страница загружена");
    document.querySelector(".kodik-container")?.remove();
    insertPlayerContainer();
  });

  setupDOMObserver();
  watchURLChanges();
  insertPlayerContainer();
})();
