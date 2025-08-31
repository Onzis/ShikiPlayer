// ==UserScript==
// @name         ShikiPlayer
// @namespace    https://github.com/Onzis/ShikiPlayer
// @version      1.29.1
// @description  видеоплеер для просмотра прямо на Shikimori (Turbo → Lumex → Alloha → Kodik)
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
  let isTheaterMode = false;
  const KodikToken = "447d179e875efe44217f20d1ee2146be";
  const AllohaToken = "96b62ea8e72e7452b652e461ab8b89";

  // Добавляем объект для хранения доступности плееров
  const playerAvailability = {
    turbo: false,
    lumex: false,
    alloha: false,
    kodik: false
  };

  function getShikimoriID() {
    const match = location.pathname.match(/\/animes\/(?:[a-z])?(\d+)/);
    return match ? match[1] : null;
  }

  function removeOldElements() {
    const oldIframe = document.querySelector(
      'iframe[src*="kodik.cc"], iframe[src*="alloha.tv"], iframe[src*="turbo.to"], iframe[src*="lumex.pro"]'
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
    let notifContainer = document.getElementById('shikip-notif-modern-container');
    if (!notifContainer) {
      notifContainer = document.createElement('div');
      notifContainer.id = 'shikip-notif-modern-container';
      notifContainer.className = 'shikip-notif-modern-container';
      document.body.appendChild(notifContainer);
    }
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

  // Обновленная функция для генерации HTML выпадающего списка
  function playerSelectorHTML(current) {
    let optionsHTML = '';

    // Добавляем только доступные плееры
    if (playerAvailability.turbo) {
      optionsHTML += `<option value="turbo" ${current === 'turbo' ? 'selected' : ''}>Turbo</option>`;
    }
    if (playerAvailability.lumex) {
      optionsHTML += `<option value="lumex" ${current === 'lumex' ? 'selected' : ''}>Lumex</option>`;
    }
    if (playerAvailability.alloha) {
      optionsHTML += `<option value="alloha" ${current === 'alloha' ? 'selected' : ''}>Alloha</option>`;
    }
    if (playerAvailability.kodik) {
      optionsHTML += `<option value="kodik" ${current === 'kodik' ? 'selected' : ''}>Kodik</option>`;
    }

    // Если ни один плеер не доступен
    if (optionsHTML === '') {
      optionsHTML = '<option value="" disabled>Нет доступных плееров</option>';
    }

    return `
      <div class="player-selector-dropdown">
        <select id="player-dropdown" style="padding:6px 16px;font-size:13px;border-radius:6px;border:1px solid #6961ff;outline:none;box-shadow:none;">
          ${optionsHTML}
        </select>
      </div>
    `;
  }

  if (!document.getElementById('shikip-dropdown-style')) {
    const style = document.createElement('style');
    style.id = 'shikip-dropdown-style';
    style.textContent = `
      .player-selector-dropdown {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      #player-dropdown {
        background: #000000;
        transition: background .2s, box-shadow .2s;
      }
      #player-dropdown:focus {
        background: #000000;
        box-shadow: 0 2px 8px #80b7ff33;
        border-color: #6961ff;
      }
      #player-dropdown:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .theater-mode-btn {
        background: rgba(105, 97, 255, 0.2);
        border: 1px solid #6961ff;
        color: #ffffff;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .theater-mode-btn:hover {
        background: rgba(105, 97, 255, 0.3);
      }
      .theater-mode-btn.active {
        background: rgba(105, 97, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }

  // Функция для проверки доступности плееров
  async function checkPlayerAvailability(id) {
    // Сбрасываем статус доступности
    playerAvailability.turbo = false;
    playerAvailability.lumex = false;
    playerAvailability.alloha = false;
    playerAvailability.kodik = false;

    // Проверяем Kodik (базовая проверка)
    try {
      const kodikResponse = await gmGetWithTimeout(`https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`);
      const kodikData = JSON.parse(kodikResponse);
      if (kodikData.results && kodikData.results.length > 0) {
        playerAvailability.kodik = true;
      }
    } catch (e) {
      console.warn("Kodik недоступен:", e);
    }

    // Проверяем Turbo
    try {
      await loadTurboPlayer(id, 1);
      playerAvailability.turbo = true;
    } catch (e) {
      console.warn("Turbo недоступен:", e);
    }

    // Проверяем Lumex
    try {
      await loadLumexPlayer(id, 1);
      playerAvailability.lumex = true;
    } catch (e) {
      console.warn("Lumex недоступен:", e);
    }

    // Проверяем Alloha
    try {
      await loadAllohaPlayer(id, 1);
      playerAvailability.alloha = true;
    } catch (e) {
      console.warn("Alloha недоступен:", e);
    }

    // Если текущий плеер недоступен, выбираем первый доступный
    if (!playerAvailability[currentPlayer]) {
      const availablePlayers = Object.keys(playerAvailability).filter(p => playerAvailability[p]);
      if (availablePlayers.length > 0) {
        currentPlayer = availablePlayers[0];
      }
    }
  }

  // Функция для переключения режима кинотеатра
  function toggleTheaterMode(playerContainer) {
    isTheaterMode = !isTheaterMode;
    const theaterBtn = playerContainer.querySelector('.theater-mode-btn');

    if (isTheaterMode) {
      // Включаем режим кинотеатра
      document.body.classList.add('shiki-theater-mode');
      theaterBtn.classList.add('active');
      theaterBtn.innerHTML = '🔍 Обычный режим';

      // Создаем оверлей для затемнения фона
      const overlay = document.createElement('div');
      overlay.className = 'shiki-theater-overlay';
      overlay.onclick = () => toggleTheaterMode(playerContainer);
      document.body.appendChild(overlay);

      // Перемещаем плеер в оверлей
      const playerWrapper = playerContainer.querySelector('.player-wrapper');
      const iframe = playerWrapper.querySelector('iframe');
      if (iframe) {
        const theaterPlayer = document.createElement('div');
        theaterPlayer.className = 'shiki-theater-player';
        theaterPlayer.appendChild(iframe.cloneNode(true));
        overlay.appendChild(theaterPlayer);

        // Скрываем оригинальный плеер
        playerWrapper.style.display = 'none';
      }

      showNotification("Режим кинотеатра включен", "info");
    } else {
      // Выключаем режим кинотеатра
      exitTheaterMode(playerContainer);
    }
  }

  // Функция для выхода из режима кинотеатра
  function exitTheaterMode(playerContainer) {
    isTheaterMode = false;
    document.body.classList.remove('shiki-theater-mode');

    const theaterBtn = playerContainer.querySelector('.theater-mode-btn');
    if (theaterBtn) {
      theaterBtn.classList.remove('active');
      theaterBtn.innerHTML = '🎬 Кинотеатр';
    }

    // Удаляем оверлей
    const overlay = document.querySelector('.shiki-theater-overlay');
    if (overlay) {
      // Возвращаем плеер на место
      const theaterPlayer = overlay.querySelector('.shiki-theater-player');
      const playerWrapper = playerContainer.querySelector('.player-wrapper');

      if (theaterPlayer && playerWrapper) {
        const iframe = theaterPlayer.querySelector('iframe');
        if (iframe) {
          playerWrapper.innerHTML = '';
          playerWrapper.appendChild(iframe);
          playerWrapper.style.display = '';
        }
      }

      overlay.remove();
    }

    showNotification("Режим кинотеатра выключен", "info");
  }

  async function createAndInsertPlayer(relatedBlock) {
    if (!document.querySelector("style#kodik-styles")) {
      const style = document.createElement("style");
      style.id = "kodik-styles";
      style.textContent = `
        .kodik-container { margin: 40px auto; width: 100%; max-width: 900px; }
        .kodik-header { display: flex; margin-bottom: 5px; justify-content: space-between; align-items: center; background: #000000; padding: 6px 10px; font-size: 13px; font-weight: 600; color: #ffffff; border-radius: 6px 6px 0 0; }
        .kodik-links a { text-decoration: none; color: #333; font-size: 11px; }
        .player-wrapper { position: relative; width: 100%; padding-bottom: 56.25%; overflow: hidden; border-radius: 0 0 6px 6px; background: #000; }
        .player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
        .loader {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #fff;
          font-size: 13px;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }
        .loader-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #6961ff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; font-size: 13px; text-align: center; z-index: 1; }
        .anime-gif-container {
          width: 100%;
          overflow: hidden;
        }
        .anime-gif {
          width: 14%;
          height: auto;
          display: block;
        }
        .shikip-changelog {
          margin-top: 5px;
          padding: 0;
          background: rgb(0 0 0);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          overflow: hidden;
          transition: all 0.3s ease;
          max-height: 40px;
        }
        .shikip-changelog.expanded {
          max-height: 300px;
          background: rgb(0 0 0);
        }
        .changelog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 1px solid rgba(224, 224, 224, 0.4);
        }
        .changelog-header:hover {
          background: rgb(0 0 0 / 15%);
        }
        .changelog-header span {
          font-weight: 600;
          color: #ffffffb5;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toggle-icon {
          font-size: 16px;
          transition: transform 0.3s ease;
        }
        .shikip-changelog.expanded .toggle-icon {
          transform: rotate(180deg);
        }
        .github-link {
          padding: 4px 10px;
          background: rgba(51, 51, 51, 0.8);
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 12px;
          transition: background 0.2s;
        }
        .github-link:hover {
          background: rgba(85, 85, 85, 0.9);
        }
        .changelog-content {
          padding: 0 15px;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }
        .shikip-changelog.expanded .changelog-content {
          max-height: 250px;
          padding: 15px;
          font-size: 16px;
          overflow: auto;
        }
        .shikip-changelog.expanded .changelog-content::-webkit-scrollbar {
          display: none;
        }
        .changelog-content ul {
          margin: 0;
          padding-left: 20px;
        }
        .changelog-content li {
          margin-bottom: 6px;
          color: #2b8acc;
          line-height: 1.4;
        }

        /* Стили для режима кинотеатра */
        .shiki-theater-mode {
          overflow: hidden !important;
        }
        .shiki-theater-mode .l-page,
        .shiki-theater-mode .l-footer,
        .shiki-theater-mode .l-menu {
          filter: blur(5px);
          opacity: 0.3;
          pointer-events: none;
          transition: all 0.3s ease;
        }
        .shiki-theater-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .shiki-theater-player {
          width: 100%;
          max-width: 1600px;
          aspect-ratio: 16/9;
          position: relative;
        }
        .shiki-theater-player iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 8px;
        }
        .shiki-theater-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          transition: background 0.2s;
        }
        .shiki-theater-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 600px) {
          .changelog-header {
            padding: 8px 12px;
          }
          .shikip-changelog.expanded .changelog-content {
            padding: 12px;
          }
          .shiki-theater-player {
            max-width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const playerContainer = document.createElement("div");
    playerContainer.classList.add("kodik-container");

    const id = getShikimoriID();
    if (!id) return;

    // Сначала показываем контейнер с анимацией загрузки
    playerContainer.innerHTML = `
      <div class="anime-gif-container">
        <img class="anime-gif" src="https://i.postimg.cc/1t6c0QDn/image.png" alt="Anime GIF">
      </div>
      <div class="kodik-header">
        <span>ОНЛАЙН ПРОСМОТР</span>
        <span style="color: #ffffff;">Проверка доступности плееров...</span>
      </div>
      <div class="player-wrapper">
        <div class="loader">
          <div class="loader-spinner"></div>
          <div>Загрузка...</div>
        </div>
      </div>
    `;

    relatedBlock.parentNode.insertBefore(playerContainer, relatedBlock);

    // Теперь проверяем доступность плееров
    await checkPlayerAvailability(id);

    // Если ни один плеер не доступен
    if (!Object.values(playerAvailability).some(Boolean)) {
      playerContainer.innerHTML = `
        <div class="anime-gif-container">
          <img class="anime-gif" src="https://i.postimg.cc/1t6c0QDn/image.png" alt="Anime GIF">
        </div>
        <div class="kodik-header">
          <span>ОНЛАЙН ПРОСМОТР</span>
          <span style="color: #ff6b6b;">Нет доступных плееров</span>
        </div>
        <div class="player-wrapper">
          <div class="error-message">К сожалению, ни один из плееров недоступен для этого аниме</div>
        </div>
      `;
      return;
    }

    // Обновляем контейнер с доступными плеерами
    playerContainer.innerHTML = `
      <div class="anime-gif-container">
        <img class="anime-gif" src="https://i.postimg.cc/1t6c0QDn/image.png" alt="Anime GIF">
      </div>
      <div class="kodik-header">
        <span>ОНЛАЙН ПРОСМОТР</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${playerSelectorHTML(currentPlayer)}
          <button class="theater-mode-btn">🎬 Кинотеатр</button>
        </div>
      </div>
      <div class="player-wrapper"><div class="loader"><div class="loader-spinner"></div><div>Загрузка...</div></div></div>
    `;

    // Добавляем блок с историей изменений
    const changelogBlock = document.createElement("div");
    changelogBlock.className = "shikip-changelog";
    changelogBlock.innerHTML = `
      <div class="changelog-header">
        <span>
          <span class="toggle-icon">▼</span>
          История изменений
        </span>
        <a href="https://github.com/Onzis/ShikiPlayer" target="_blank" class="github-link">
          GitHub
        </a>
      </div>
      <div class="changelog-content">
        <ul>
          <li><strong>v1.29.0</strong> - Обновлен интерфейс контейнера</li>
          <li><strong>v1.27.0</strong> - Добавлена поддержка Lumex плеера</li>
          <li><strong>v1.26.0</strong> - Улучшена система уведомлений</li>
          <li><strong>v1.25.0</strong> - Добавлен выбор плеера через выпадающий список</li>
          <li><strong>v1.24.0</strong> - Оптимизирована работа с API Kodik</li>
          <li><strong>v1.23.0</strong> - Исправлены ошибки в работе Turbo плеера</li>
          <li><strong>v1.22.0</strong> - Добавлено кеширование запросов</li>
          <li><strong>v1.21.0</strong> - Улучшена обработка ошибок</li>
        </ul>
      </div>
    `;
    playerContainer.appendChild(changelogBlock);

    // Добавляем обработчик для сворачивания/разворачивания
    const header = changelogBlock.querySelector('.changelog-header');
    header.addEventListener('click', () => {
      changelogBlock.classList.toggle('expanded');
    });

    if (observer) observer.disconnect();

    // Всегда используем первую серию
    const startEpisode = 1;

    // Выпадающий список выбора плеера
    const playerDropdown = playerContainer.querySelector("#player-dropdown");
    if (playerDropdown) {
      playerDropdown.addEventListener("change", (e) => {
        if (e.target.value) {
          manualSwitchPlayer(e.target.value, id, playerContainer, startEpisode);
        }
      });
    }

    // Кнопка режима кинотеатра
    const theaterBtn = playerContainer.querySelector('.theater-mode-btn');
    if (theaterBtn) {
      theaterBtn.addEventListener('click', () => toggleTheaterMode(playerContainer));
    }

    setupLazyLoading(playerContainer, () =>
    autoPlayerChain(id, playerContainer, startEpisode)
    );
  }

  // Обновленная функция автоматического переключения плееров
  async function autoPlayerChain(id, playerContainer, episode) {
    // Определяем порядок плееров в зависимости от доступности
    const playerOrder = ['turbo', 'lumex', 'alloha', 'kodik'].filter(p => playerAvailability[p]);

    if (playerOrder.length === 0) {
      showNotification("Нет доступных плееров для этого аниме", "error");
      return;
    }

    let lastError = null;

    for (const playerType of playerOrder) {
      try {
        currentPlayer = playerType;
        playerContainer.querySelector("#player-dropdown").value = playerType;
        await showPlayer(playerType, id, playerContainer, episode);
        return; // Успешно загружено, выходим из функции
      } catch (error) {
        lastError = error;
        console.warn(`Плеер ${playerType} недоступен:`, error);
        showNotification(`${playerType} недоступен, пробую следующий...`, "warning");
      }
    }

    // Если все плееры не сработали
    if (lastError) {
      showNotification(`Все плееры недоступны: ${lastError.message}`, "error");
    }
  }

  async function manualSwitchPlayer(playerType, id, playerContainer, episode) {
    if (!playerAvailability[playerType]) {
      showNotification(`Плеер ${playerType} недоступен`, "error");
      return;
    }

    currentPlayer = playerType;
    await showPlayer(playerType, id, playerContainer, episode);
  }

  async function showPlayer(playerType, id, playerContainer, episode) {
    const playerWrapper = playerContainer.querySelector(".player-wrapper");
    playerWrapper.innerHTML = `
      <div class="loader">
        <div class="loader-spinner"></div>
        <div>Загрузка плеера...</div>
      </div>
    `;

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
      } else if (playerType === "lumex") {
        try {
          const iframeUrl = await loadLumexPlayer(id, episode);
          iframe.src = iframeUrl;
          iframe.onerror = () => { throw new Error("Lumex 404"); };
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
          if (playerType === "lumex") throw new Error("Lumex 404");
        }
      }, 2000);
    } catch (error) {
      playerWrapper.innerHTML = `<div class="error-message">Ошибка загрузки плеера ${playerType}: ${error.message}. Попробуйте другой плеер.</div>`;
      showNotification(`Не работает плеер ${playerType}: ${error.message}.`, "error");
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
        onerror: (error) => { reject(error); }
      });
    });
  }

  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (cached) { const { data } = JSON.parse(cached); return data; }
    return null;
  }

  function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({ data }));
  }

  async function loadAllohaPlayer(id, episode) {
    const cacheKey = `alloha_${id}`;
    let iframeUrl = getCachedData(cacheKey);
    if (iframeUrl) { return `${iframeUrl}&episode=${episode}&season=1`; }

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      try {
        const kodikResponse = await gmGetWithTimeout(`https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`);
        kodikData = JSON.parse(kodikResponse); setCachedData(kodikCacheKey, kodikData);
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

    const { kinopoisk_id, imdb_id } = results[0];
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
          } else { throw new Error("Ошибка Alloha API: " + (allohaData.error_info || "Неизвестная ошибка")); }
        } catch (error) {
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
      return `${iframeUrl}&episode=${episode}&season=1}`;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      showNotification("Ошибка загрузки Alloha: " + error.message, "error");
      throw new Error("Ошибка загрузки Alloha: " + error.message);
    }
  }

  async function loadTurboPlayer(id, episode) {
    const cacheKey = `turbo_${id}`;
    let iframeUrl = getCachedData(cacheKey);
    if (iframeUrl) { return iframeUrl; }

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

  async function loadLumexPlayer(id, episode) {
    const cacheKey = `lumex_${id}_${episode}`;
    let iframeUrl = getCachedData(cacheKey);
    if (iframeUrl) { return iframeUrl; }

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      try {
        const kodikResponse = await gmGetWithTimeout(`https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`);
        kodikData = JSON.parse(kodikResponse);
        setCachedData(kodikCacheKey, kodikData);
      } catch (error) {
        showNotification("Ошибка загрузки данных Kodik API для Lumex.", "error");
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) {
      showNotification("Нет результатов от Kodik API для Lumex.", "error");
      throw new Error("Нет результатов от Kodik API");
    }

    const { kinopoisk_id } = results[0];
    if (!kinopoisk_id) {
      showNotification("Kinopoisk ID не найден для Lumex.", "error");
      throw new Error("Kinopoisk ID не найден");
    }

    const kinoboxUrl = `https://api.kinobox.tv/api/players?kinopoisk=${kinopoisk_id}`;

    async function tryFetchKinoboxLumex(retries = 3) {
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
          const lumexPlayer = kinoboxData.data?.find((player) => player.type === "Lumex");
          if (lumexPlayer?.iframeUrl) {
            let url = lumexPlayer.iframeUrl;
            if (episode) {
              url += (url.includes("?") ? "&" : "?") + "episode=" + episode;
            }
            return url;
          } else {
            throw new Error("Lumex плеер не найден в Kinobox API");
          }
        } catch (error) {
          if (i === retries - 1) {
            showNotification("Kinobox API недоступен для Lumex. Попробуйте позже.", "error");
            throw error;
          }
        }
      }
    }

    try {
      const iframeUrl = await tryFetchKinoboxLumex();
      setCachedData(cacheKey, iframeUrl);
      return iframeUrl;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      showNotification("Ошибка загрузки Lumex: " + error.message, "error");
      throw new Error("Ошибка загрузки Lumex: " + error.message);
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

    // Добавляем обработчик для выхода из режима кинотеатра по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isTheaterMode) {
        const playerContainer = document.querySelector(".kodik-container");
        if (playerContainer) {
          exitTheaterMode(playerContainer);
        }
      }
    });
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
