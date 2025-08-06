// ==UserScript==
// @name ShikiPlayer
// @namespace https://github.com/Onzis/ShikiPlayer
// @version 1.10
// @description Автоматически загружает видеоплеер для просмотра прямо на Shikimori (Kodik и Alloha), выбирает следующую серию на основе просмотренных эпизодов и отмечает серию как просмотренную после 15 минут просмотра, если эпизод новый
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
  let currentPlayer = "kodik"; // Плеер по умолчанию
  const KodikToken = "447d179e875efe44217f20d1ee2146be";
  const AllohaToken = "96b62ea8e72e7452b652e461ab8b89";
  const CACHE_DURATION = 60 * 60 * 1000; // 1 час в миллисекундах
  const WATCH_THRESHOLD = 15 * 60 * 1000; // 15 минут в миллисекундах
  let watchTimer = null; // Таймер для отслеживания времени просмотра

  function getShikimoriID() {
    const match = location.pathname.match(/\/animes\/(?:[a-z])?(\d+)/);
    const id = match ? match[1] : null;
    console.log("[WatchButton] Shikimori ID (из URL):", id);
    return id;
  }

  function removeOldElements() {
    // Удаляем старые iframe
    const oldIframes = document.querySelectorAll('iframe[src*="kodik.cc"], iframe[src*="alloha.tv"]');
    oldIframes.forEach(iframe => {
      console.log("[WatchButton] Удаляю старый iframe");
      iframe.remove();
    });
    // Удаляем старые контейнеры
    const oldContainers = document.querySelectorAll('.kodik-container');
    oldContainers.forEach(container => {
      console.log("[WatchButton] Удаляю старый контейнер .kodik-container");
      container.remove();
    });
    // Останавливаем таймер
    if (watchTimer) {
      clearTimeout(watchTimer);
      watchTimer = null;
      console.log("[WatchButton] Таймер просмотра остановлен");
    }
  }

  function insertPlayerContainer() {
    console.log("[WatchButton] Попытка вставить плеер на", location.pathname);

    if (!/^\/animes\/[^/]+/.test(location.pathname)) {
      console.log("[WatchButton] Не страница аниме — пропуск");
      return;
    }

    // Удаляем старые элементы перед вставкой нового
    removeOldElements();

    let relatedBlock = document.querySelector(".cc-related-authors");
    if (relatedBlock) {
      createAndInsertPlayer(relatedBlock);
    } else {
      console.log('[WatchButton] Блок "Связанное" не найден, жду через MutationObserver...');
    }
  }

  async function createAndInsertPlayer(relatedBlock) {
    console.log("[WatchButton] Создаю контейнер для плеера...");

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

    const style = document.createElement("style");
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
    `;
    // Проверяем, не существует ли уже стиль, чтобы не дублировать
    if (!document.querySelector('style[data-shikiplayer]')) {
      style.setAttribute('data-shikiplayer', 'true');
      document.head.appendChild(style);
    }

    const id = getShikimoriID();
    if (!id) {
      console.log("[WatchButton] ID не найден, прерывание");
      return;
    }

    relatedBlock.parentNode.insertBefore(playerContainer, relatedBlock);
    console.log("[WatchButton] Контейнер с плеером вставлен");

    // Получаем данные о просмотренных эпизодах
    let nextEpisode = 1; // По умолчанию начинаем с первого эпизода
    let totalEpisodes = 0;
    let userRateId = null;
    let currentWatchedEpisodes = 0;
    try {
      const shikimoriData = await getShikimoriAnimeData(id, true); // Force refresh to avoid stale cache
      if (shikimoriData) {
        totalEpisodes = shikimoriData.episodes || shikimoriData.episodes_aired || 0;
        console.log("[WatchButton] Общее количество эпизодов:", totalEpisodes);
        if (shikimoriData.user_rate && typeof shikimoriData.user_rate.episodes === 'number') {
          currentWatchedEpisodes = shikimoriData.user_rate.episodes;
          nextEpisode = currentWatchedEpisodes + 1;
          userRateId = shikimoriData.user_rate.id;
          console.log("[WatchButton] Просмотрено эпизодов (user_rate.episodes):", currentWatchedEpisodes);
          console.log("[WatchButton] Следующий эпизод на основе Shikimori:", nextEpisode);
          console.log("[WatchButton] User Rate ID:", userRateId);
          // Проверяем, не превышает ли следующий эпизод общее количество эпизодов
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
    kodikBtn.addEventListener("click", () => switchPlayer("kodik", id, playerContainer, nextEpisode, userRateId, totalEpisodes, currentWatchedEpisodes));
    allohaBtn.addEventListener("click", () => switchPlayer("alloha", id, playerContainer, nextEpisode, userRateId, totalEpisodes, currentWatchedEpisodes));

    switchPlayer(currentPlayer, id, playerContainer, nextEpisode, userRateId, totalEpisodes, currentWatchedEpisodes);
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

  async function updateShikimoriUserRate(animeId, episode, userRateId, totalEpisodes) {
    if (episode > totalEpisodes && totalEpisodes > 0) {
      console.log("[WatchButton] Эпизод", episode, "превышает общее количество эпизодов (", totalEpisodes, "), пропускаем обновление user_rate");
      return;
    }

    try {
      // Проверяем, авторизован ли пользователь
      const userInfo = await getShikimoriUserInfo();
      if (!userInfo) {
        console.log("[WatchButton] Пользователь не авторизован, обновление user_rate невозможно");
        return;
      }

      const url = userRateId ? `https://shikimori.one/api/v2/user_rates/${userRateId}` : `https://shikimori.one/api/v2/user_rates`;
      const method = userRateId ? "PATCH" : "POST";
      const payload = {
        user_rate: {
          user_id: userInfo.id,
          target_id: animeId,
          target_type: "Anime",
          episodes: episode,
          status: episode === totalEpisodes && totalEpisodes > 0 ? "completed" : "watching"
        }
      };

      await gmPost(url, payload, method);
      console.log("[WatchButton] Эпизод", episode, "отмечен как просмотренный для аниме ID:", animeId);
      
      // Сбрасываем кэш Shikimori данных
      localStorage.removeItem(`shikimori_anime_${animeId}`);
      console.log("[WatchButton] Кэш Shikimori для ID", animeId, "сброшен");
    } catch (error) {
      console.error("[WatchButton] Ошибка при обновлении user_rate:", error);
    }
  }

  async function getShikimoriUserInfo() {
    try {
      const url = `https://shikimori.one/api/users/whoami`;
      const response = await gmGet(url);
      const data = JSON.parse(response);
      console.log("[WatchButton] Данные пользователя:", data);
      return data;
    } catch (error) {
      console.error("[WatchButton] Ошибка при получении информации о пользователе:", error);
      return null;
    }
  }

  async function switchPlayer(playerType, id, playerContainer, episode, userRateId, totalEpisodes, currentWatchedEpisodes) {
    currentPlayer = playerType;
    const playerWrapper = playerContainer.querySelector(".player-wrapper");
    playerWrapper.innerHTML = `<div class="loader">Загрузка плеера...</div>`;

    // Останавливаем предыдущий таймер
    if (watchTimer) {
      clearTimeout(watchTimer);
      watchTimer = null;
      console.log("[WatchButton] Предыдущий таймер просмотра остановлен");
    }

    try {
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

        // Запускаем таймер только если эпизод новый
        if (episode > currentWatchedEpisodes) {
          watchTimer = setTimeout(() => {
            updateShikimoriUserRate(id, episode, userRateId, totalEpisodes);
          }, WATCH_THRESHOLD);
          console.log("[WatchButton] Запущен таймер на 15 минут для эпизода:", episode);
        } else {
          console.log("[WatchButton] Эпизод", episode, "уже просмотрен или ранее, обновление user_rate не требуется");
        }
      } else if (playerType === "alloha") {
        await loadAllohaPlayer(id, playerWrapper, episode, userRateId, totalEpisodes, currentWatchedEpisodes);
      } else {
        console.error("[WatchButton] Неизвестный тип плеера:", playerType);
      }
    } catch (error) {
      console.error("[WatchButton] Ошибка при загрузке плеера:", error);
      playerWrapper.innerHTML = `<div class="error-message">Ошибка загрузки плеера ${playerType}. Попробуйте позже.</div>`;
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

  function gmPost(url, data, method) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: method,
        url: url,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        data: JSON.stringify(data),
        onload: function(response) {
          if (response.status >= 200 && response.status < 300) {
            resolve(response.responseText);
          } else {
            reject(new Error(`HTTP ${response.status}: ${response.responseText}`));
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

  async function loadAllohaPlayer(id, playerWrapper, episode, userRateId, totalEpisodes, currentWatchedEpisodes) {
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

      // Запускаем таймер только если эпизод новый
      if (episode > currentWatchedEpisodes) {
        watchTimer = setTimeout(() => {
          updateShikimoriUserRate(id, episode, userRateId, totalEpisodes);
        }, WATCH_THRESHOLD);
        console.log("[WatchButton] Запущен таймер на 15 минут для эпизода:", episode);
      } else {
        console.log("[WatchButton] Эпизод", episode, "уже просмотрен или ранее, обновление user_rate не требуется");
      }
    } catch (error) {
      console.error("[WatchButton] Ошибка загрузки плеера Alloha:", error);
      playerWrapper.innerHTML = "<p>Ошибка загрузки плеера Alloha. Попробуйте позже.</p>";
    }
  }

  function setupDOMObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      // Проверяем, нет ли уже контейнера
      if (document.querySelector('.kodik-container')) {
        console.log("[WatchButton] Контейнер .kodik-container уже существует, пропускаем MutationObserver");
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
        insertPlayerContainer();
      }
    }, 300);
  }

  console.log("[WatchButton] Скрипт запущен");
  setupDOMObserver();
  watchURLChanges();
  insertPlayerContainer();
})();
