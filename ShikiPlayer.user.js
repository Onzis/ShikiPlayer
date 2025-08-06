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
    const id = match ? match[1] : null;
    console.log("[WatchButton] Shikimori ID (из URL):", id);
    return id;
  }

  function removeOldElements() {
    const oldIframe = document.querySelector('iframe[src*="kodik.cc"], iframe[src*="alloha.tv"]');
    if (oldIframe) {
      console.log("[WatchButton] Удаляю старый iframe");
      oldIframe.remove();
    }
  }

  function insertPlayerContainer() {
    if (isInserting) {
      console.log("[WatchButton] Вставка уже выполняется, пропускаю");
      return;
    }

    isInserting = true;
    console.log("[WatchButton] Попытка вставить плеер на", location.pathname);

    if (!/^\/animes\/[^/]+/.test(location.pathname)) {
      console.log("[WatchButton] Не страница аниме — пропуск");
      isInserting = false;
      return;
    }

    if (document.querySelector(".kodik-container")) {
      console.log("[WatchButton] Контейнер уже существует, пропускаю создание");
      isInserting = false;
      return;
    }

    removeOldElements();

    let relatedBlock = document.querySelector(".cc-related-authors");
    if (relatedBlock) {
      createAndInsertPlayer(relatedBlock).finally(() => {
        isInserting = false;
      });
    } else {
      console.log('[WatchButton] Блок "Связанное" не найден, жду через MutationObserver...');
      isInserting = false;
    }
  }

  async function createAndInsertPlayer(relatedBlock) {
    console.log("[WatchButton] Создаю контейнер для плеера...");

    if (!document.querySelector("style#kodik-styles")) {
      const style = document.createElement("style");
      style.id = "kodik-styles";
      style.textContent = `
        .kodik-container { margin: 20px 0; width: 100%; max-width: 900px; margin-left: auto; margin-right: auto; }
        .kodik-header { display: flex; justify-content: space-between; align-items: center; background-color: #e6e8ea; padding: 8px 12px; font-weight: bold; color: #333; font-size: 14px; border-top-left-radius: 6px; border-top-right-radius: 6px; }
        .kodik-title { font-size: 14px; }
        .kodik-links { display: flex; align-items: center; gap: 12px; }
        .kodik-links a { text-decoration: none; color: #333; font-size: 12px; font-weight: normal; }
        .player-selector { display: flex; gap: 8px; }
        .player-selector button { padding: 4px 8px; font-size: 12px; cursor: pointer; background-color: #f0f2f4; border: none; border-radius: 4px; }
        .player-selector button:hover { background-color: #d0d2d4; }
        .player-wrapper { position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; }
        .player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
        .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #333; font-size: 14px; }
        .error-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; font-size: 14px; text-align: center; }
        @media (max-width: 768px) {
            .kodik-header { flex-direction: column; align-items: flex-start; gap: 4px; font-size: 13px; }
            .kodik-title { font-size: 13px; }
            .kodik-links a { font-size: 11px; }
            .player-selector { margin-top: 4px; }
            .player-wrapper { padding-bottom: 60%; }
        }
      `;
      document.head.appendChild(style);
    }

    const playerContainer = document.createElement("div");
    playerContainer.classList.add("kodik-container");
    playerContainer.innerHTML = `
      <div class="kodik-header">
        <span class="kodik-title">ОНЛАЙН ПРОСМОТР</span>
        <div class="kodik-links">
          <a href="https://github.com/Onzicry/ShikiPlayer" target="_blank">GitHub</a>
        </div>
        <div class="player-selector">
          <button id="kodik-btn">Kodik</button>
          <button id="alloha-btn">Alloha</button>
        </div>
      </div>
      <div class="player-wrapper"><div class="loader">Загрузка плеера...</div></div>
    `;

    const id = getShikimoriID();
    if (!id) {
      console.log("[WatchButton] ID не найден, прерывание");
      return;
    }

    relatedBlock.parentNode.insertBefore(playerContainer, relatedBlock);
    console.log("[WatchButton] Контейнер с плеером вставлен");

    if (observer) {
      observer.disconnect();
      console.log("[WatchButton] MutationObserver отключен после вставки контейнера");
    }

    let nextEpisode = 1;
    let totalEpisodes = 0;
    try {
      const shikimoriData = await getShikimoriAnimeData(id, true);
      if (shikimoriData) {
        totalEpisodes = shikimoriData.episodes || shikimoriData.episodes_aired || 0;
        console.log("[WatchButton] Общее количество эпизодов:", totalEpisodes);
        if (shikimoriData.user_rate && typeof shikimoriData.user_rate.episodes === 'number') {
          nextEpisode = shikimoriData.user_rate.episodes + 1;
          console.log("[WatchButton] Просмотрено эпизодов (user_rate.episodes):", shikimoriData.user_rate.episodes);
          console.log("[WatchButton] Следующий эпизод на основе Shikimori:", nextEpisode);
          if (totalEpisodes > 0 && nextEpisode > totalEpisodes) {
            nextEpisode = totalEpisodes;
            console.log("[WatchButton] Следующий эпизод скорректирован до последнего доступного:", nextEpisode);
          }
        } else {
          console.log("[WatchButton] Данные user_rate не найдены или пользователь не авторизован, использую эпизод 1");
        }
      } else {
        console.log("[WatchButton] Данные Shikimori не получены, использую эпизод 1");
      }
    } catch (error) {
      console.error("[WatchButton] Ошибка при получении данных Shikimori:", error);
      playerContainer.querySelector(".player-wrapper").innerHTML = `<div class="error-message">Ошибка загрузки данных Shikimori. Используется эпизод 1.</div>`;
    }

    const kodikBtn = playerContainer.querySelector("#kodik-btn");
    const allohaBtn = playerContainer.querySelector("#alloha-btn");
    kodikBtn.addEventListener("click", () => switchPlayer("kodik", id, playerContainer, nextEpisode));
    allohaBtn.addEventListener("click", () => switchPlayer("alloha", id, playerContainer, nextEpisode));

    switchPlayer(currentPlayer, id, playerContainer, nextEpisode);
  }

  async function getShikimoriAnimeData(id, forceRefresh = false) {
    const cacheKey = `shikimori_anime_${id}`;
    if (!forceRefresh) {
      let cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log("[WatchButton] Использую кэшированные данные Shikimori для ID:", id);
        return cachedData;
      }
    }

    try {
      const url = `https://shikimori.one/api/animes/${id}`;
      const response = await gmGet(url);
      const data = JSON.parse(response);
      console.log("[WatchButton] Данные Shikimori API:", data);
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error("[WatchButton] Ошибка при запросе к Shikimori API:", error);
      throw error;
    }
  }

  async function switchPlayer(playerType, id, playerContainer, episode) {
    currentPlayer = playerType;
    const playerWrapper = playerContainer.querySelector(".player-wrapper");
    playerWrapper.innerHTML = `<div class="loader">Загрузка плеера...</div>`;

    if (playerType === "kodik") {
      const iframeSrc = `https://kodik.cc/find-player?shikimoriID=${id}&episode=${episode}`;
      const iframe = document.createElement("iframe");
      iframe.src = iframeSrc;
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "autoplay *; fullscreen *");
      iframe.setAttribute("loading", "lazy");
      playerWrapper.innerHTML = "";
      playerWrapper.appendChild(iframe);
      console.log("[WatchButton] Плеер Kodik загружен для ID:", id, "Эпизод:", episode);
    } else if (playerType === "alloha") {
      await loadAllohaPlayer(id, playerWrapper, episode);
    } else {
      console.error("[WatchButton] Неизвестный тип плеера:", playerType);
    }
  }

  function gmGet(url) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url: url,
        headers: { "Cache-Control": "no-cache" },
        onload: function(response) {
          if (response.status >= 200 && response.status < 300) {
            resolve(response.responseText);
          } else {
            reject(new Error(`HTTP ${response.status}`));
          }
        },
        onerror: function(error) {
          reject(error);
        }
      });
    });
  }

  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log("[WatchButton] Использую кэшированные данные для:", key);
        return data;
      } else {
        console.log("[WatchButton] Кэш устарел для:", key);
      }
    }
    return null;
  }

  function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  }

  async function loadAllohaPlayer(id, playerWrapper, episode) {
    try {
      const cacheKey = `alloha_${id}`;
      let iframeUrl = getCachedData(cacheKey);
      let season = 1;
      if (!iframeUrl) {
        const kodikCacheKey = `kodik_${id}`;
        let kodikData = getCachedData(kodikCacheKey);
        if (!kodikData) {
          const kodikUrl = `https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`;
          const kodikResponse = await gmGet(kodikUrl);
          kodikData = JSON.parse(kodikResponse);
          setCachedData(kodikCacheKey, kodikData);
        }
        const results = kodikData.results;
        if (!results || results.length === 0) {
          throw new Error("Нет результатов от Kodik API");
        }
        const firstResult = results[0];
        const kinopoiskId = firstResult.kinopoisk_id;
        const imdbId = firstResult.imdb_id;
        season = firstResult.last_season || 1;

        let allohaUrl;
        if (kinopoiskId) {
          allohaUrl = `https://api.alloha.tv?token=${AllohaToken}&kp=${kinopoiskId}`;
        } else if (imdbId) {
          allohaUrl = `https://api.alloha.tv?token=${AllohaToken}&imdb=${imdbId}`;
        } else {
          throw new Error("Kinopoisk ID или IMDB ID не найдены");
        }
        const allohaResponse = await gmGet(allohaUrl);
        const allohaData = JSON.parse(allohaResponse);
        if (allohaData.status !== "success") {
          throw new Error("Ошибка Alloha API: " + allohaData.error_info);
        }
        iframeUrl = allohaData.data.iframe;
        setCachedData(cacheKey, iframeUrl);
      }

      const finalIframeUrl = `${iframeUrl}&episode=${episode}&season=${season}`;
      const iframe = document.createElement("iframe");
      iframe.src = finalIframeUrl;
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "autoplay *; fullscreen *");
      iframe.setAttribute("loading", "lazy");
      playerWrapper.innerHTML = "";
      playerWrapper.appendChild(iframe);
      console.log("[WatchButton] Плеер Alloha загружен для ID:", id, "Эпизод:", episode, "Сезон:", season);
    } catch (error) {
      console.error("[WatchButton] Ошибка загрузки плеера Alloha:", error);
      playerWrapper.innerHTML = "<p>Ошибка загрузки плеера Alloha. Попробуйте позже.</p>";
    }
  }

  function setupDOMObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      if (document.querySelector(".kodik-container")) {
        console.log("[WatchButton] Контейнер уже существует, пропускаю MutationObserver");
        return;
      }

      for (const mutation of mutations) {
        if (
          [...mutation.addedNodes].some(
            (node) =>
              node.nodeType === 1 && node.querySelector?.(".cc-related-authors")
          )
        ) {
          console.log("[WatchButton] MutationObserver сработал");
          insertPlayerContainer();
          break;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log("[WatchButton] MutationObserver активирован");
  }

  function watchURLChanges() {
    setInterval(() => {
      if (location.pathname !== currentPath) {
        console.log("[WatchButton] Обнаружено изменение URL:", location.pathname);
        currentPath = location.pathname;
        const oldContainer = document.querySelector(".kodik-container");
        if (oldContainer) {
          console.log("[WatchButton] Удаляю старый контейнер перед созданием нового");
          oldContainer.remove();
        }
        insertPlayerContainer();
      }
    }, 300);
  }

  console.log("[WatchButton] Скрипт запущен");
  setupDOMObserver();
  watchURLChanges();
  insertPlayerContainer();
})();
