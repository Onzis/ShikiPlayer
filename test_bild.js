// ==UserScript==
// @name         ShikiPlayer
// @namespace    https://github.com/Onzis/ShikiPlayer
// @version      1.24
// @description  Автоматически загружает видеоплеер для просмотра прямо на Shikimori (Turbo → Alloha → Kodik, с современными уведомлениями)
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
      if (attempts > 0) {
        setTimeout(() => insertPlayerContainer(attempts - 1, delay), delay);
      }
      return;
    }

    isInserting = true;
    removeOldElements();

    createAndInsertPlayer(relatedBlock).finally(() => {
      isInserting = false;
    });
  }

  // Современное уведомление — снизу по центру, черное, прозрачное, с блюром
  function showNotification(message, type = "info") {
    if (!document.getElementById('shikip-notif-style-modern')) {
      const style = document.createElement('style');
      style.id = 'shikip-notif-style-modern';
      style.textContent = `
        .shikip-notif-modern-container {
          position: fixed;
          left: 50%;
          bottom: 32px;
          transform: translateX(-50%);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 96vw;
          pointer-events: none;
        }
        .shikip-notif-modern {
          background: rgba(20,20,20,0.8);
          color: #fff;
          padding: 18px 32px;
          border-radius: 14px;
          font-size: 1.08rem;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          box-shadow: 0 8px 32px rgba(50,50,65,.16);
          opacity: 0;
          margin-top: 8px;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: opacity .5s, transform .5s;
          pointer-events: auto;
          backdrop-filter: blur(8px);
          border: 2px solid transparent;
        }
        .shikip-notif-modern.success { border-color: #43e97b33; }
        .shikip-notif-modern.error   { border-color: #e7382733; }
        .shikip-notif-modern.info    { border-color: #396afc33; }
        .shikip-notif-modern.warning { border-color: #ffd20033; }
        .shikip-notif-modern .notif-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .shikip-notif-modern .notif-close {
          margin-left: auto;
          background: none;
          border: none;
          color: #fff;
          font-size: 1.3rem;
          cursor: pointer;
          opacity: .65;
        }
        .shikip-notif-modern .notif-close:hover {
          opacity: 1;
        }
        @media (max-width: 600px) {
          .shikip-notif-modern {
            padding: 12px 18px;
            font-size: .97rem;
            gap: 10px;
          }
          .shikip-notif-modern-container {
            max-width: 99vw;
            bottom: 10px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Контейнер для стэка уведомлений (1, максимум 2 шт одновременно)
    let notifContainer = document.getElementById('shikip-notif-modern-container');
    if (!notifContainer) {
      notifContainer = document.createElement('div');
      notifContainer.id = 'shikip-notif-modern-container';
      notifContainer.className = 'shikip-notif-modern-container';
      document.body.appendChild(notifContainer);
    }

    // Удалить все предыдущие уведомления (чтобы не накладывались)
    while (notifContainer.firstChild) {
      notifContainer.removeChild(notifContainer.firstChild);
    }

    const icons = {
      success: "✅",
      error: "⛔",
      info: "ℹ️",
      warning: "⚠️"
    };
    const notifType = ['success','error','info','warning'].includes(type) ? type : 'info';
    const notif = document.createElement("div");
    notif.className = `shikip-notif-modern ${notifType}`;
    notif.innerHTML = `
      <span class="notif-icon">${icons[notifType]}</span>
      <span>${message}</span>
      <button class="notif-close" title="Закрыть">&times;</button>
    `;
    notifContainer.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = "1";
      notif.style.transform = "none";
    }, 10);

    const hide = () => {
      notif.style.opacity = "0";
      notif.style.transform = "translateY(20px)";
      setTimeout(() => notif.remove(), 500);
    };
    setTimeout(hide, 4500);
    notif.querySelector('.notif-close').onclick = hide;
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
        .player-selector button.active { background: #80b7ff; color: #fff; }
        .player-wrapper { position: relative; width: 100%; padding-bottom: 56.25%; overflow: hidden; border-radius: 0 0 6px 6px; background: #000; }
        .player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
        .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 13px; z-index: 1; }
        .error-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; font-size: 13px; text-align: center; z-index: 1; }
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
          <button id="turbo-btn" class="${currentPlayer === 'turbo' ? 'active' : ''}">Turbo</button>
          <button id="alloha-btn" class="${currentPlayer === 'alloha' ? 'active' : ''}">Alloha</button>
          <button id="kodik-btn" class="${currentPlayer === 'kodik' ? 'active' : ''}">Kodik</button>
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
      showNotification("Не удалось загрузить данные аниме. Попробуйте обновить страницу.", "error");
    }

    const turboBtn = playerContainer.querySelector("#turbo-btn");
    const kodikBtn = playerContainer.querySelector("#kodik-btn");
    const allohaBtn = playerContainer.querySelector("#alloha-btn");
    turboBtn.addEventListener("click", () =>
      manualSwitchPlayer("turbo", id, playerContainer, nextEpisode)
    );
    kodikBtn.addEventListener("click", () =>
      manualSwitchPlayer("kodik", id, playerContainer, nextEpisode)
    );
    allohaBtn.addEventListener("click", () =>
      manualSwitchPlayer("alloha", id, playerContainer, nextEpisode)
    );

    setupLazyLoading(playerContainer, () =>
      autoPlayerChain(id, playerContainer, nextEpisode)
    );
  }

  async function autoPlayerChain(id, playerContainer, episode) {
    // Turbo → Alloha → Kodik, с уведомлениями
    try {
      currentPlayer = "turbo";
      await showPlayer("turbo", id, playerContainer, episode);
    } catch (e1) {
      showNotification("Turbo недоступен, переключаю на Alloha", "warning");
      try {
        currentPlayer = "alloha";
        await showPlayer("alloha", id, playerContainer, episode);
      } catch (e2) {
        showNotification("Alloha недоступен, переключаю на Kodik", "warning");
        currentPlayer = "kodik";
        await showPlayer("kodik", id, playerContainer, episode);
      }
    }
  }

  async function manualSwitchPlayer(playerType, id, playerContainer, episode) {
    currentPlayer = playerType;
    await showPlayer(playerType, id, playerContainer, episode);
  }

  async function showPlayer(playerType, id, playerContainer, episode) {
    const playerWrapper = playerContainer.querySelector(".player-wrapper");
    playerWrapper.innerHTML = `<div class="loader">Загрузка...</div>`;

    // Update button active states
    const turboBtn = playerContainer.querySelector("#turbo-btn");
    const kodikBtn = playerContainer.querySelector("#kodik-btn");
    const allohaBtn = playerContainer.querySelector("#alloha-btn");
    turboBtn.classList.toggle("active", playerType === "turbo");
    kodikBtn.classList.toggle("active", playerType === "kodik");
    allohaBtn.classList.toggle("active", playerType === "alloha");

    try {
      if (playerType === "alloha" && !checkVideoCodecSupport()) {
        showNotification("Ваш браузер не поддерживает необходимые кодеки для Alloha плеера.", "error");
        throw new Error("Ваш браузер не поддерживает необходимые кодеки для Alloha");
      }

      const iframe = document.createElement("iframe");
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "autoplay *; fullscreen *; encrypted-media");
      iframe.setAttribute("playsinline", "true");
      iframe.setAttribute("loading", "lazy");

      if (playerType === "turbo") {
        try {
          const iframeUrl = await loadTurboPlayer(id, episode);
          iframe.src = iframeUrl;
          iframe.onerror = () => { throw new Error("Turbo 404"); };
        } catch (error) {
          throw error;
        }
      } else if (playerType === "kodik") {
        iframe.src = `https://kodik.cc/find-player?shikimoriID=${id}&episode=${episode}`;
      } else if (playerType === "alloha") {
        try {
          const iframeUrl = await loadAllohaPlayer(id, episode);
          iframe.src = iframeUrl;
          iframe.onerror = () => { throw new Error("Alloha 404"); };
        } catch (error) {
          throw error;
        }
      } else {
        showNotification("Неизвестный тип плеера.", "error");
        throw new Error("Неизвестный тип плеера");
      }

      playerWrapper.innerHTML = "";
      playerWrapper.appendChild(iframe);

      setTimeout(() => {
        if (!iframe.contentWindow || (iframe.contentDocument && iframe.contentDocument.body.innerHTML.trim() === "")) {
          if (playerType === "turbo") throw new Error("Turbo 404");
          if (playerType === "alloha") throw new Error("Alloha 404");
        }
      }, 2000);

    } catch (error) {
      playerWrapper.innerHTML = `<div class="error-message">Ошибка загрузки плеера ${playerType}: ${error.message}. Попробуйте другой плеер.</div>`;
      showNotification(`Не работает плеер ${playerType}: ${error.message}.`, "error");
      throw error;
    }
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
      throw error;
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
        showNotification("Ошибка загрузки данных Kodik API для Alloha.", "error");
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) {
      showNotification("Нет результатов от Kodik API для Alloha.", "error");
      throw new Error("Нет результатов от Kodik API");
    }

    const { kinopoisk_id, imdb_id, last_season = 1 } = results[0];
    const allohaUrl = kinopoisk_id
      ? `https://api.alloha.tv?token=${AllohaToken}&kp=${kinopoisk_id}`
      : `https://api.alloha.tv?token=${AllohaToken}&imdb=${imdb_id}`;

    if (!allohaUrl) {
      showNotification("Kinopoisk ID или IMDB ID не найдены для Alloha.", "error");
      throw new Error("Kinopoisk ID или IMDB ID не найдены");
    }

    async function tryFetchAlloha(retries = 3, delayMs = 1000) {
      for (let i = 0; i < retries; i++) {
        try {
          const allohaResponse = await gmGetWithTimeout(allohaUrl);
          const allohaData = JSON.parse(allohaResponse);
          if (allohaData.status === "success" && allohaData.data?.iframe) {
            return allohaData.data.iframe;
          } else if (
            allohaData.error_info &&
            allohaData.error_info.includes('К сожалению, запрашиваемая серия отсутствует')
          ) {
            throw new Error('NO_EPISODE');
          } else {
            throw new Error("Ошибка Alloha API: " + (allohaData.error_info || "Неизвестная ошибка"));
          }
        } catch (error) {
          if (error.message === 'NO_EPISODE') throw error;
          if (i === retries - 1) {
            showNotification("Alloha API недоступен. Попробуйте позже.", "error");
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
      if (error.message === 'NO_EPISODE') {
        throw new Error('NO_EPISODE');
      }
      showNotification("Ошибка загрузки Alloha: " + error.message, "error");
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
        showNotification("Ошибка загрузки данных Kodik API для Turbo.", "error");
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) {
      showNotification("Нет результатов от Kodik API для Turbo.", "error");
      throw new Error("Нет результатов от Kodik API");
    }

    const { kinopoisk_id } = results[0];
    if (!kinopoisk_id) {
      showNotification("Kinopoisk ID не найден для Turbo.", "error");
      throw new Error("Kinopoisk ID не найден");
    }

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
            showNotification("Kinobox API недоступен для Turbo. Попробуйте позже.", "error");
            throw error;
          }
        }
      }
    }

    try {
      const iframeUrl = await tryFetchKinobox();
      setCachedData(cacheKey, iframeUrl);
      return iframeUrl;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      showNotification("Ошибка загрузки Turbo: " + error.message, "error");
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

    observer = new MutationObserver(() => {
      if (document.querySelector(".kodik-container")) return;
      if (/^\/animes\/[^/]+/.test(location.pathname)) {
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
    document.querySelector(".kodik-container")?.remove();
    insertPlayerContainer();
  };

  document.addEventListener("turbolinks:load", () => {
    document.querySelector(".kodik-container")?.remove();
    insertPlayerContainer();
  });

  setupDOMObserver();
  watchURLChanges();
  insertPlayerContainer();
})();
