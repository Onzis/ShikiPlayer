// ==UserScript==
// @name         ShikiPlayer
// @namespace    https://github.com/Onzis/ShikiPlayer
// @version      1.49
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
  const KodikToken = "7f129085d2f372833fcc5e2116e4d0a4";
  const AllohaToken = "96b62ea8e72e7452b652e461ab8b89";

  // Объект для хранения настроек
  const playerSettings = {
    rememberQuality: localStorage.getItem("shiki-remember-quality") === "true",
    defaultQuality: localStorage.getItem("shiki-default-quality") || "auto",
    defaultPlayer: localStorage.getItem("shiki-default-player") || "turbo",
    playerOrder: JSON.parse(localStorage.getItem("shiki-player-order")) || [
      "turbo",
      "lumex",
      "alloha",
      "kodik",
    ],
    disableNotifications:
      localStorage.getItem("shiki-disable-notifications") === "true",
    theme: localStorage.getItem("shiki-theme") || "dark",
    debugMode: localStorage.getItem("shiki-debug-mode") === "true",
  };
  // Добавляем объект для хранения доступности плееров
  const playerAvailability = {
    turbo: false,
    lumex: false,
    alloha: false,
    kodik: false,
  };
  // Функция для отладки
  function debugLog(message, data = null) {
    if (playerSettings.debugMode) {
      console.log(`[ShikiPlayer Debug] ${message}`, data || "");
    }
  }
  // Функция для определения текущего сезона
  function getCurrentSeason() {
    const seasonMatch = location.pathname.match(
      /\/animes\/[a-z]?(\d+)(?:-s(\d+))?/
    );
    return seasonMatch && seasonMatch[2] ? parseInt(seasonMatch[2]) : 1;
  }
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
      document.querySelector(".cc-related-authors") ||
      document.querySelector(".sidebar");
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
    if (playerSettings.disableNotifications) return;

    if (!document.getElementById("shikip-notif-style-modern")) {
      const style = document.createElement("style");
      style.id = "shikip-notif-style-modern";
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
          background: rgba(255, 255, 255, 0.85);
          color: #ffffff;
          padding: 18px 32px;
          border-radius: 16px;
          font-size: 1.08rem;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          opacity: 0;
          margin-top: 8px;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: opacity .5s, transform .5s;
          pointer-events: auto;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          transform: translateY(20px);
        }
        .shikip-notif-modern.show {
          opacity: 1;
          transform: translateY(0);
        }
        .shikip-notif-modern.success { border-color: rgb(0 255 86 / 40%); background: rgb(0 0 0 / 40%); }
        .shikip-notif-modern.error   { border-color: rgb(255 23 0 / 40%); background: rgb(0 0 0 / 40%); }
        .shikip-notif-modern.info    { border-color: rgb(0 64 255 / 40%); background: rgb(0 0 0 / 40%); }
        .shikip-notif-modern.warning { border-color: rgb(255 210 0 / 40%); background: rgb(0 0 0 / 40%); }
        .shikip-notif-modern .notif-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          animation: iconPulse 0.6s ease-in-out;
        }
        .shikip-notif-modern .notif-close {
          margin-left: auto;
          background: none;
          border: none;
          color: #666;
          font-size: 1.3rem;
          cursor: pointer;
          opacity: .65;
          transition: all 0.2s;
        }
        .shikip-notif-modern .notif-close:hover {
          opacity: 1;
          transform: rotate(90deg);
        }
        @keyframes iconPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
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
    let notifContainer = document.getElementById(
      "shikip-notif-modern-container"
    );
    if (!notifContainer) {
      notifContainer = document.createElement("div");
      notifContainer.id = "shikip-notif-modern-container";
      notifContainer.className = "shikip-notif-modern-container";
      document.body.appendChild(notifContainer);
    }
    while (notifContainer.firstChild) {
      notifContainer.removeChild(notifContainer.firstChild);
    }
    const icons = {
      success: "✅",
      error: "⛔",
      info: "ℹ️",
      warning: "⚠️",
    };
    const notifType = ["success", "error", "info", "warning"].includes(type)
      ? type
      : "info";
    const notif = document.createElement("div");
    notif.className = `shikip-notif-modern ${notifType}`;
    notif.innerHTML = `
      <span class="notif-icon">${icons[notifType]}</span>
      <span>${message}</span>
      <button class="notif-close" title="Закрыть">&times;</button>
    `;
    notifContainer.appendChild(notif);
    setTimeout(() => {
      notif.classList.add("show");
    }, 10);
    const hide = () => {
      notif.classList.remove("show");
      setTimeout(() => notif.remove(), 500);
    };
    setTimeout(hide, 4500);
    notif.querySelector(".notif-close").onclick = hide;
  }
  // ИСПРАВЛЕНА ФУНКЦИЯ: Теперь использует порядок из настроек
  function playerSelectorHTML(current) {
    let optionsHTML = "";
    // Перебираем плееры в порядке, установленном в настройках
    for (const player of playerSettings.playerOrder) {
      if (playerAvailability[player]) {
        const isSelected = player === current ? "selected" : "";
        const playerName = player.charAt(0).toUpperCase() + player.slice(1);
        optionsHTML += `<option value="${player}" ${isSelected}>${playerName}</option>`;
      }
    }
    if (optionsHTML === "") {
      optionsHTML = '<option value="" disabled>Нет доступных плееров</option>';
    }
    return `
      <div class="player-selector-dropdown">
        <select id="player-dropdown">
          ${optionsHTML}
        </select>
      </div>
    `;
  }
  if (!document.getElementById("shikip-dropdown-style")) {
    const style = document.createElement("style");
    style.id = "shikip-dropdown-style";
    style.textContent = `
      .player-selector-dropdown {
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(10px);
        animation: fadeInUp 0.6s ease forwards 0.3s;
      }
      #player-dropdown {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.5);
        color: #333;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 14px;
        outline: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }
      #player-dropdown:focus {
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 4px 16px rgba(105, 97, 255, 0.2);
        border-color: rgba(105, 97, 255, 0.5);
        transform: translateY(-2px);
      }
      #player-dropdown:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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
    document.head.appendChild(style);
  }
  async function checkPlayerAvailability(id) {
    playerAvailability.turbo = false;
    playerAvailability.lumex = false;
    playerAvailability.alloha = false;
    playerAvailability.kodik = false;
    debugLog(`Проверка доступности плееров для аниме ID: ${id}`);
    try {
      const kodikResponse = await gmGetWithTimeout(
        `https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`
      );
      const kodikData = JSON.parse(kodikResponse);
      debugLog(`Ответ Kodik API:`, kodikData);
      if (kodikData.results && kodikData.results.length > 0) {
        playerAvailability.kodik = true;
        debugLog("Kodik доступен");
      }
    } catch (e) {
      console.warn("Kodik недоступен:", e);
      debugLog("Ошибка при проверке Kodik:", e);
    }
    try {
      const turboUrl = await loadTurboPlayer(id, 1);
      if (turboUrl) {
        playerAvailability.turbo = true;
        debugLog("Turbo доступен");
      }
    } catch (e) {
      console.warn("Turbo недоступен:", e);
      debugLog("Ошибка при проверке Turbo:", e);
    }
    try {
      const lumexUrl = await loadLumexPlayer(id, 1);
      if (lumexUrl) {
        playerAvailability.lumex = true;
        debugLog("Lumex доступен");
      }
    } catch (e) {
      console.warn("Lumex недоступен:", e);
      debugLog("Ошибка при проверке Lumex:", e);
    }
    try {
      const allohaUrl = await loadAllohaPlayer(id, 1);
      if (allohaUrl) {
        playerAvailability.alloha = true;
        debugLog("Alloha доступен");
      }
    } catch (e) {
      console.warn("Alloha недоступен:", e);
      debugLog("Ошибка при проверке Alloha:", e);
    }
    // ИСПРАВЛЕНО: Теперь выбираем первый доступный плеер в порядке настроек
    if (!playerAvailability[currentPlayer]) {
      debugLog(
        `Текущий плеер ${currentPlayer} недоступен, ищем замену в порядке настроек`
      );
      for (const player of playerSettings.playerOrder) {
        if (playerAvailability[player]) {
          currentPlayer = player;
          debugLog(`Выбран новый текущий плеер: ${currentPlayer}`);
          break;
        }
      }
    }
    debugLog("Итоговая доступность плееров:", playerAvailability);
    debugLog("Текущий плеер после проверки:", currentPlayer);
  }
  // Функция для настройки drag and drop
  function setupDragAndDrop(container) {
    let draggedItem = null;

    container.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("player-order-item")) {
        draggedItem = e.target;
        e.target.classList.add("dragging");
      }
    });

    container.addEventListener("dragend", (e) => {
      if (e.target.classList.contains("player-order-item")) {
        e.target.classList.remove("dragging");
      }
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(draggedItem);
      } else {
        container.insertBefore(draggedItem, afterElement);
      }
    });
  }
  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".player-order-item:not(.dragging)"),
    ];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }
  // Функция для обновления порядка плееров в модальном окне
  function updatePlayerOrderInModal(settingsModal) {
    const playerOrderContainer = settingsModal.querySelector(
      "#player-order-container"
    );
    if (playerOrderContainer) {
      playerOrderContainer.innerHTML = playerSettings.playerOrder
        .map(
          (player) => `
        <div class="player-order-item" draggable="true" data-player="${player}">
          <span class="drag-handle">☰</span>
          <span class="player-name">${
            player.charAt(0).toUpperCase() + player.slice(1)
          }</span>
        </div>
      `
        )
        .join("");

      // Настройка drag and drop для новых элементов
      setupDragAndDrop(playerOrderContainer);
    }
  }

  // Добавляем функцию для получения информации о просмотренных сериях
  function getWatchedEpisodesInfo() {
    const rateNumberElement = document.querySelector(".rate-number");
    if (rateNumberElement) {
      return rateNumberElement.textContent.trim();
    }
    return "";
  }

  async function createAndInsertPlayer(relatedBlock) {
    if (!document.querySelector("style#kodik-styles")) {
      const style = document.createElement("style");
      style.id = "kodik-styles";
      style.textContent = `
        .kodik-container {
          margin: 40px auto;
          width: 100%;
          max-width: 900px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgb(0 0 0 / 40%);
          opacity: 0;
          transform: translateY(30px);
          animation: containerAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes containerAppear {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .kodik-header {
          display: flex;
          margin-bottom: 0;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.7);
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }
        .kodik-header span:first-child {
          opacity: 0;
          animation: textFadeIn 0.6s ease forwards 0.2s;
        }
        @keyframes textFadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .kodik-links a {
          text-decoration: none;
          color: #333;
          font-size: 11px;
        }
        .player-wrapper {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%;
          overflow: hidden;
          background: #000;
          opacity: 0;
          transform: scale(0.95);
          animation: playerAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 0.5s;
        }
        @keyframes playerAppear {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .player-wrapper iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .loader {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #fff;
          font-size: 14px;
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
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ff6b6b;
          font-size: 14px;
          text-align: center;
          z-index: 1;
          background: rgba(255, 255, 255, 0.9);
          padding: 16px 24px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          25% { transform: translate(-52%, -50%) rotate(-1deg); }
          75% { transform: translate(-48%, -50%) rotate(1deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        .shikip-changelog {
          margin-top: 0;
          padding: 0;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border-top: 1px solid #0000004f;
          -webkit-backdrop-filter: blur(12px);
          border-radius: 0 0 16px 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          max-height: 40px;
          opacity: 0;
          animation: fadeIn 0.6s ease forwards 0.7s;
        }
        .shikip-changelog.expanded {
          max-height: 300px;
        }
        .changelog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1px 16px;
          margin-top: 1px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          transition: background 0.3s ease;
        }
        .changelog-header:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        .changelog-header span {
          font-weight: 600;
          color: #333;
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
          padding: 6px 12px;
          background: rgba(105, 97, 255, 0.2);
          color: #6961ff;
          text-decoration: none;
          border-radius: 6px;
          font-size: 12px;
          transition: all 0.2s;
          border: 1px solid rgba(105, 97, 255, 0.3);
        }
        .github-link:hover {
          background: rgba(105, 97, 255, 0.3);
          transform: translateY(-2px);
        }
        .changelog-content {
          padding: 0 16px;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }
        .shikip-changelog.expanded .changelog-content {
          max-height: 250px;
          padding: 16px;
          font-size: 14px;
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
          margin-bottom: 8px;
          color: #6961ff;
          line-height: 1.5;
          opacity: 0;
          transform: translateX(-10px);
          animation: slideInLeft 0.4s ease forwards;
        }
        .changelog-content li:nth-child(1) { animation-delay: 0.1s; }
        .changelog-content li:nth-child(2) { animation-delay: 0.2s; }
        .changelog-content li:nth-child(3) { animation-delay: 0.3s; }
        .changelog-content li:nth-child(4) { animation-delay: 0.4s; }
        .changelog-content li:nth-child(5) { animation-delay: 0.5s; }
        .changelog-content li:nth-child(6) { animation-delay: 0.6s; }
        .changelog-content li:nth-child(7) { animation-delay: 0.7s; }
        .changelog-content li:nth-child(8) { animation-delay: 0.8s; }
        @keyframes slideInLeft {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        /* Темная тема (по умолчанию) */
        .kodik-container.dark-theme {
          background: rgba(30, 30, 40, 0.9);
        }
        .kodik-container.dark-theme .kodik-header {
          background: rgba(40, 40, 50, 0.8);
          color: #fff;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .kodik-container.dark-theme .player-wrapper {
          background: #000;
        }
        .kodik-container.dark-theme .loader {
          color: #fff;
        }
        .kodik-container.dark-theme .loader-spinner {
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: #6961ff;
        }
        .kodik-container.dark-theme .shikip-changelog {
          background: rgba(40, 40, 50, 0.8);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .kodik-container.dark-theme .changelog-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .kodik-container.dark-theme .changelog-header:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .kodik-container.dark-theme .changelog-header span {
          color: #fff;
        }
        .kodik-container.dark-theme .changelog-content li {
          color: #a99bff;
        }
        .kodik-container.dark-theme .player-selector-dropdown #player-dropdown {
          background: rgba(40, 40, 50, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .kodik-container.dark-theme .player-selector-dropdown #player-dropdown:focus {
          background: rgba(50, 50, 60, 0.9);
          border-color: #6961ff;
        }
        /* Светлая тема */
        .kodik-container.light-theme {
          background: rgba(245, 245, 250, 0.95);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .kodik-container.light-theme .kodik-header {
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .kodik-container.light-theme .player-wrapper {
          background: #fff;
        }
        .kodik-container.light-theme .loader {
          color: #333;
        }
        .kodik-container.light-theme .loader-spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-top-color: #6961ff;
        }
        .kodik-container.light-theme .shikip-changelog {
          background: rgba(255, 255, 255, 0.95);
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }
        .kodik-container.light-theme .changelog-header {
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .kodik-container.light-theme .changelog-header:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        .kodik-container.light-theme .changelog-header span {
          color: #333;
        }
        .kodik-container.light-theme .changelog-content li {
          color: #6961ff;
        }
        .kodik-container.light-theme .player-selector-dropdown #player-dropdown {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #333;
        }
        .kodik-container.light-theme .player-selector-dropdown #player-dropdown:focus {
          background: #fff;
          border-color: #6961ff;
        }
        @media (max-width: 600px) {
          .changelog-header {
            padding: 10px 12px;
          }
          .shikip-changelog.expanded .changelog-content {
            padding: 12px;
          }
          .kodik-header {
            padding: 10px 12px;
            font-size: 13px;
          }
          #player-dropdown {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      `;
      document.head.appendChild(style);
    }
    if (!document.getElementById("shikip-theater-btn-style")) {
      const style = document.createElement("style");
      style.id = "shikip-theater-btn-style";
      style.textContent = `
        .player-buttons-container {
          display: flex;
          justify-content: center;
          margin: 12px 0;
          opacity: 0;
          transform: translateY(10px);
          animation: fadeInUp 0.6s ease forwards 0.7s;
        }
        .add-to-list-btn,
        .settings-btn,
        .theater-btn,
        .status-btn {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 8px;
          width: 44px;
          height: 44px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #000;
        }
        .add-to-list-btn svg,
        .settings-btn svg,
        .theater-btn svg,
        .status-btn svg {
          width: 24px;
          height: 24px;
          pointer-events: none;
        }
        .add-to-list-btn:hover,
        .settings-btn:hover,
        .theater-btn:hover,
        .status-btn:hover {
          background-color: rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 12px rgba(105, 97, 255, 0.2);
          border-color: rgba(105, 97, 255, 0.5);
          transform: translateY(-2px);
        }
        /* Изменяем порядок отступов для кнопок */
        .status-btn {
          /* Первая кнопка, без левого отступа */
        }
        .theater-btn {
          margin-left: 10px; /* Вторая кнопка, с левым отступом */
        }
        .add-to-list-btn {
          margin-left: 10px; /* Третья кнопка, с левым отступом */
        }
        .settings-btn {
          margin-left: 10px; /* Четвертая кнопка, с левым отступом */
        }
        .tooltip {
          position: fixed;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 14px;
          white-space: pre-line;
          z-index: 10000;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s, transform 0.3s;
          transform: translateX(-50%) translateY(-10px);
          text-align: center;
          line-height: 1.6;
        }
        .tooltip.show {
          opacity: 1;
          transform: translateX(-50%) translateY(5px);
        }
        .settings-modal {
          display: none;
          position: fixed;
          z-index: 10000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          animation: fadeIn 0.3s ease;
        }
        .settings-modal-content {
          background-color: rgba(255, 255, 255, 0.95);
          margin: 5% auto;
          padding: 25px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          width: 90%;
          max-width: 600px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.4s ease;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
        }
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .settings-header h2 {
          margin: 0;
          color: #333;
          font-size: 24px;
        }
        .close-settings {
          color: #666;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .close-settings:hover {
          color: #333;
          transform: rotate(90deg);
        }
        .settings-body {
          overflow-y: auto;
          flex-grow: 1;
          padding-right: 5px;
        }
        .settings-body::-webkit-scrollbar {
          width: 8px;
        }
        .settings-body::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        .settings-body::-webkit-scrollbar-thumb {
          background: rgba(105, 97, 255, 0.3);
          border-radius: 4px;
        }
        .settings-body::-webkit-scrollbar-thumb:hover {
          background: rgba(105, 97, 255, 0.5);
        }
        .settings-section {
          margin-bottom: 25px;
        }
        .settings-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #444;
          font-size: 18px;
        }
        .settings-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .settings-option:last-child {
          border-bottom: none;
        }
        .settings-option label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #333;
        }
        .settings-option input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        .settings-option select {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.8);
          color: #333;
          font-size: 14px;
          cursor: pointer;
        }
        .settings-info {
          background: rgba(105, 97, 255, 0.1);
          border-left: 4px solid #6961ff;
          padding: 15px;
          border-radius: 0 8px 8px 0;
          margin-top: 20px;
          font-size: 14px;
          color: #555;
        }
        .settings-save-btn {
          background: #6961ff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 15px;
          width: 100%;
        }
        .settings-save-btn:hover {
          background: #5a52e0;
          transform: translateY(-2px);
        }
        .player-order-container {
          margin-top: 10px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.8);
        }
        .player-order-item {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          cursor: move;
          transition: background 0.2s;
        }
        .player-order-item:last-child {
          border-bottom: none;
        }
        .player-order-item:hover {
          background: rgba(105, 97, 255, 0.1);
        }
        .player-order-item.dragging {
          opacity: 0.5;
        }
        .player-order-item.drag-over {
          border-top: 2px solid #6961ff;
        }
        .drag-handle {
          margin-right: 10px;
          color: #999;
          cursor: grab;
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .player-name {
          flex-grow: 1;
          font-weight: 500;
        }
        .theme-selector {
          display: flex;
          gap: 10px;
        }
        .theme-option {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.8);
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .theme-option:hover {
          border-color: #6961ff;
        }
        .theme-option.selected {
          border-color: #6961ff;
          background: rgba(105, 97, 255, 0.1);
        }
        .theme-icon {
          font-size: 24px;
          margin-bottom: 5px;
        }
        /* Темная тема для модального окна настроек */
        .settings-modal.dark-theme .settings-modal-content {
          background-color: rgba(40, 40, 50, 0.95);
          color: #fff;
        }
        .settings-modal.dark-theme .settings-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .settings-modal.dark-theme .settings-header h2 {
          color: #fff;
        }
        .settings-modal.dark-theme .close-settings {
          color: #ccc;
        }
        .settings-modal.dark-theme .close-settings:hover {
          color: #fff;
        }
        .settings-modal.dark-theme .settings-section h3 {
          color: #ddd;
        }
        .settings-modal.dark-theme .settings-option {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .settings-modal.dark-theme .settings-option label {
          color: #fff;
        }
        .settings-modal.dark-theme .settings-option select {
          background: rgba(50, 50, 60, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .settings-modal.dark-theme .player-order-container {
          background: rgba(50, 50, 60, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .settings-modal.dark-theme .player-order-item {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .settings-modal.dark-theme .player-order-item:hover {
          background: rgba(105, 97, 255, 0.2);
        }
        .settings-modal.dark-theme .theme-option {
          background: rgba(50, 50, 60, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .settings-modal.dark-theme .theme-option:hover {
          border-color: #6961ff;
        }
        .settings-modal.dark-theme .theme-option.selected {
          background: rgba(105, 97, 255, 0.2);
          border-color: #6961ff;
        }
        .settings-modal.dark-theme .settings-info {
          background: rgba(105, 97, 255, 0.2);
          border-left: 4px solid #6961ff;
          color: #ddd;
        }
        .settings-modal.dark-theme .settings-body::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .settings-modal.dark-theme .settings-body::-webkit-scrollbar-thumb {
          background: rgba(105, 97, 255, 0.4);
        }
        .settings-modal.dark-theme .settings-body::-webkit-scrollbar-thumb:hover {
          background: rgba(105, 97, 255, 0.6);
        }
        /* Темная тема для кнопок */
        .kodik-container.dark-theme .add-to-list-btn,
        .kodik-container.dark-theme .settings-btn,
        .kodik-container.dark-theme .theater-btn,
        .kodik-container.dark-theme .status-btn {
          background: rgba(40, 40, 50, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .kodik-container.dark-theme .add-to-list-btn:hover,
        .kodik-container.dark-theme .settings-btn:hover,
        .kodik-container.dark-theme .theater-btn:hover,
        .kodik-container.dark-theme .status-btn:hover {
          background: rgba(50, 50, 60, 0.9);
          border-color: #6961ff;
        }
        /* Светлая тема для кнопок */
        .kodik-container.light-theme .add-to-list-btn,
        .kodik-container.light-theme .settings-btn,
        .kodik-container.light-theme .theater-btn,
        .kodik-container.light-theme .status-btn {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #000;
        }
        .kodik-container.light-theme .add-to-list-btn:hover,
        .kodik-container.light-theme .settings-btn:hover,
        .kodik-container.light-theme .theater-btn:hover,
        .kodik-container.light-theme .status-btn:hover {
          background: #fff;
          border-color: #6961ff;
        }
        /* Стили для режима кинотеатра */
        .kodik-container.theater-mode {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          max-width: none;
          z-index: 9999;
          margin: 0;
          border-radius: 0;
          background: rgba(0, 0, 0, 0.95);
        }
        .kodik-container.theater-mode .kodik-header,
        .kodik-container.theater-mode .player-buttons-container,
        .kodik-container.theater-mode .shikip-changelog {
          display: none;
        }
        .kodik-container.theater-mode .player-wrapper {
          height: 100vh;
          padding-bottom: 0;
          width: 100%;
        }
        .kodik-container.theater-mode .player-wrapper iframe {
          width: 100%;
          height: 100%;
        }
        .close-theater-btn {
          position: fixed;
          top: 15px;
          right: 15px;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .close-theater-btn:hover {
          background: rgba(105, 97, 255, 0.8);
          transform: scale(1.1);
        }
        /* Класс для запрета скролла страницы в режиме кинотеатра */
        .theater-mode-active {
          overflow: hidden !important;
        }
        /* Класс для запрета скролла страницы при открытых настройках */
        .settings-modal-open {
          overflow: hidden !important;
        }
        /* Стили для выпадающего меню статуса */
        .status-dropdown {
          position: fixed;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          min-width: 160px;
          z-index: 10000;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.3s ease;
        }
        .status-dropdown.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .status-dropdown-item {
          padding: 10px 15px;
          cursor: pointer;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          font-size: 14px;
          text-align: center;
        }
        .status-dropdown-item:first-child {
          border-radius: 8px 8px 0 0;
        }
        .status-dropdown-item:last-child {
          border-radius: 0 0 8px 8px;
        }
        .status-dropdown-item:hover {
          background: rgba(105, 97, 255, 0.1);
        }
        /* Темная тема для выпадающего меню статуса */
        .status-dropdown.dark-theme {
          background: rgba(40, 40, 50, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .status-dropdown.dark-theme .status-dropdown-item {
          color: #fff !important;
        }
        .status-dropdown.dark-theme .status-dropdown-item:hover {
          background: rgba(105, 97, 255, 0.2) !important;
        }
        @media (max-width: 600px) {
          .add-to-list-btn, .settings-btn, .theater-btn, .status-btn {
            width: 40px;
            height: 40px;
          }
          .add-to-list-btn svg,
          .settings-btn svg,
          .theater-btn svg,
          .status-btn svg {
            width: 20px;
            height: 20px;
          }
          .settings-modal-content {
            width: 95%;
            margin: 10% auto;
            padding: 20px;
            max-height: 90vh;
          }
          .settings-header h2 {
            font-size: 20px;
          }
          .settings-option {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .settings-option select {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }
    const playerContainer = document.createElement("div");
    playerContainer.classList.add("kodik-container");
    // Применяем сохраненную тему
    playerContainer.classList.add(
      playerSettings.theme === "light" ? "light-theme" : "dark-theme"
    );

    const id = getShikimoriID();
    if (!id) return;

    playerContainer.innerHTML = `
      <div class="kodik-header">
        <span>ОНЛАЙН ПРОСМОТР</span>
        <span style="color: #333;">Загрузка...</span>
      </div>
      <div class="player-wrapper">
        <div class="loader">
          <div class="loader-spinner"></div>
          <div>Загрузка...</div>
        </div>
      </div>
    `;

    relatedBlock.parentNode.insertBefore(playerContainer, relatedBlock);

    const checkPromise = checkPlayerAvailability(id);
    checkPromise
      .then(() => {
        if (!Object.values(playerAvailability).some(Boolean)) {
          playerContainer.innerHTML = `
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

        const headerElement = document.createElement("div");
        headerElement.className = "kodik-header";
        headerElement.innerHTML = `
        <span>ОНЛАЙН ПРОСМОТР</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${playerSelectorHTML(currentPlayer)}
        </div>
      `;

        const playerWrapper = document.createElement("div");
        playerWrapper.className = "player-wrapper";
        playerWrapper.innerHTML = `
        <div class="loader">
          <div class="loader-spinner"></div>
          <div>Загрузка...</div>
        </div>
      `;

        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "player-buttons-container";

        // Создаем новую кнопку для изменения статуса (теперь первая)
        const statusBtn = document.createElement("button");
        statusBtn.className = "status-btn";
        statusBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

        // Создаем кнопку кинотеатра
        const theaterBtn = document.createElement("button");
        theaterBtn.className = "theater-btn";
        theaterBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;

        // Создаем кнопки с SVG иконками
        const addToListBtn = document.createElement("button");
        addToListBtn.className = "add-to-list-btn";
        addToListBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

        const settingsBtn = document.createElement("button");
        settingsBtn.className = "settings-btn";
        settingsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

        // Изменяем порядок добавления кнопок (статус-кнопка теперь первая)
        buttonsContainer.appendChild(statusBtn);
        buttonsContainer.appendChild(theaterBtn);
        buttonsContainer.appendChild(addToListBtn);
        buttonsContainer.appendChild(settingsBtn);

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
            <li><strong>v1.49</strong> - Обновлен токен для Кодик</li>
            <li><strong>v1.47</strong> - Добавлена новая кнопка для изменения статуса аниме</li>
            <li><strong>v1.46</strong> - Исправлены ошибки с режимом кинотеатра и прокрутки настроек</li>
            <li><strong>v1.44</strong> - Исправлена анимация загрузчика (круг теперь крутится)</li>
            <li><strong>v1.43</strong> - Исправлена подсветка блока "История изменений" в темной теме</li>
            <li><strong>v1.42</strong> - Исправлена прокрутка страницы в настройках плеера</li>
            <li><strong>v1.41</strong> - Исправлено отображение порядка плееров в выпадающем списке</li>
            <li><strong>v1.40</strong> - Исправлена работа порядка плееров в настройках</li>
            <li><strong>v1.39</strong> - Исправлена работа плееров Turbo и Lumex, добавлена отладка</li>
            <li><strong>v1.38</strong> - Исправлены иконки кнопок и тема настроек</li>
            <li><strong>v1.37</strong> - Исправлено переключение тем плеера</li>
            <li><strong>v1.36</strong> - Добавлена возможность выбора темы плеера (светлая/темная)</li>
            <li><strong>v1.34</strong> - Исправлен порядок блоков в настройках | Добавлена прокрутка для настроек</li>
            <li><strong>v1.33</strong> - Добавлены настройки: плеер по умолчанию, порядок плееров, отключение уведомлений</li>
            <li><strong>v1.32</strong> - Обновлена иконка кнопки настроек | Упрощены настройки плеера</li>
            <li><strong>v1.31</strong> - Добавлена кнопка настроек плеера с возможностью сохранения предпочтений</li>
            <li><strong>v1.30</strong> - Исправлена работа с Alloha | Добавлены кнопки с добавлением серии в просмотрено (+1) | Добавлены анимации | Теперь недоступные плееры будут скрываться </li>
          </ul>
        </div>
      `;

        playerContainer.innerHTML = "";
        playerContainer.appendChild(headerElement);
        playerContainer.appendChild(playerWrapper);
        playerContainer.appendChild(buttonsContainer);
        playerContainer.appendChild(changelogBlock);

        const header = changelogBlock.querySelector(".changelog-header");
        header.addEventListener("click", () => {
          changelogBlock.classList.toggle("expanded");
        });

        if (observer) observer.disconnect();

        const startEpisode = 1;
        const playerDropdown =
          playerContainer.querySelector("#player-dropdown");
        if (playerDropdown) {
          playerDropdown.addEventListener("change", (e) => {
            if (e.target.value) {
              manualSwitchPlayer(
                e.target.value,
                id,
                playerContainer,
                startEpisode
              );
            }
          });
        }

        if (addToListBtn) {
          addToListBtn.addEventListener("click", () => {
            const incrementButton = document.querySelector(
              ".item-add.increment"
            );
            if (incrementButton) {
              incrementButton.click();
              showNotification("Добавлена серия в просмотрено", "success");

              // Обновляем подсказку после добавления серии
              setTimeout(() => {
                const watchedInfo = getWatchedEpisodesInfo();
                if (watchedInfo) {
                  addToListTooltip.textContent = `Добавить серию в просмотрено\n${watchedInfo}`;
                }
              }, 500); // Небольшая задержка для обновления DOM
            } else {
              showNotification(
                "Не найдена кнопка добавления серии в просмотрено",
                "warning"
              );
            }
          });

          // Создаем всплывающую подсказку для кнопки добавления в список
          const addToListTooltip = document.createElement("div");
          addToListTooltip.className = "tooltip";

          // Получаем текущую информацию о просмотренных сериях
          const watchedInfo = getWatchedEpisodesInfo();
          addToListTooltip.textContent = watchedInfo
            ? `Добавить серию в просмотрено\n${watchedInfo}`
            : "Добавить серию в просмотрено";

          document.body.appendChild(addToListTooltip);

          addToListBtn.addEventListener("mouseenter", () => {
            // Обновляем информацию при каждом наведении на случай изменений
            const watchedInfo = getWatchedEpisodesInfo();
            addToListTooltip.textContent = watchedInfo
              ? `Добавить серию в просмотрено\n${watchedInfo}`
              : "Добавить серию в просмотрено";

            const rect = addToListBtn.getBoundingClientRect();
            addToListTooltip.style.left = `${rect.left + rect.width / 2}px`;
            addToListTooltip.style.top = `${rect.bottom + 5}px`;
            addToListTooltip.classList.add("show");
          });

          addToListBtn.addEventListener("mouseleave", () => {
            addToListTooltip.classList.remove("show");
          });
        }

        // Добавляем обработчики для кнопки изменения статуса
        if (statusBtn) {
          // Создаем выпадающее меню для статуса и добавляем его в body, а не в кнопку
          const statusDropdown = document.createElement("div");
          statusDropdown.className = "status-dropdown";
          // Применяем класс темы к выпадающему меню
          statusDropdown.classList.add(
            playerSettings.theme === "light" ? "light-theme" : "dark-theme"
          );

          statusDropdown.innerHTML = `
          <div class="status-dropdown-item" data-status="watching">Смотрю</div>
          <div class="status-dropdown-item" data-status="planned">Запланировано</div>
          <div class="status-dropdown-item" data-status="dropped">Брошено</div>
          <div class="status-dropdown-item" data-status="remove">Удалить из списка</div>
        `;

          document.body.appendChild(statusDropdown);

          // Функция для позиционирования выпадающего меню
          function positionStatusDropdown() {
            const rect = statusBtn.getBoundingClientRect();
            // Центрируем меню по горизонтали относительно кнопки
            const dropdownWidth = statusDropdown.offsetWidth;
            const buttonCenter = rect.left + rect.width / 2;
            statusDropdown.style.left = `${buttonCenter - dropdownWidth / 2}px`;
            statusDropdown.style.top = `${rect.bottom + 5}px`;
          }

          // Обработчики для кнопки статуса
          statusBtn.addEventListener("mouseenter", () => {
            positionStatusDropdown();
            statusDropdown.classList.add("active");
          });

          statusBtn.addEventListener("mouseleave", (e) => {
            // Проверяем, не уходит ли мышь на выпадающее меню
            setTimeout(() => {
              if (!statusDropdown.matches(":hover")) {
                statusDropdown.classList.remove("active");
              }
            }, 100);
          });

          // Обработчики для выпадающего меню
          statusDropdown.addEventListener("mouseenter", () => {
            statusDropdown.classList.add("active");
          });

          statusDropdown.addEventListener("mouseleave", () => {
            statusDropdown.classList.remove("active");
          });

          // Обработчики для элементов выпадающего меню
          const statusItems = statusDropdown.querySelectorAll(
            ".status-dropdown-item"
          );
          statusItems.forEach((item) => {
            item.addEventListener("click", (e) => {
              e.stopPropagation();
              const status = item.dataset.status;

              // Находим соответствующий элемент на странице и кликаем на него
              let selector;
              switch (status) {
                case "watching":
                  selector = 'span.status-name[data-text="Смотрю"]';
                  break;
                case "planned":
                  selector = 'span.status-name[data-text="Запланировано"]';
                  break;
                case "dropped":
                  selector = 'span.status-name[data-text="Брошено"]';
                  break;
                case "remove":
                  selector = 'span.status-name[data-text="Удалить из списка"]';
                  break;
              }

              if (selector) {
                const statusElement = document.querySelector(selector);
                if (statusElement) {
                  statusElement.click();
                  showNotification(
                    `Статус изменен на "${item.textContent}"`,
                    "success"
                  );
                } else {
                  showNotification(
                    "Не удалось найти элемент для изменения статуса",
                    "error"
                  );
                }
              }

              // Скрываем выпадающее меню после выбора
              statusDropdown.classList.remove("active");
            });
          });

          // Обновляем позицию при прокрутке страницы
          window.addEventListener("scroll", () => {
            if (statusDropdown.classList.contains("active")) {
              positionStatusDropdown();
            }
          });

          // Обновляем позицию при изменении размера окна
          window.addEventListener("resize", () => {
            if (statusDropdown.classList.contains("active")) {
              positionStatusDropdown();
            }
          });

          // Функция для обновления темы выпадающего меню
          window.updateStatusDropdownTheme = function () {
            // Удаляем оба класса темы
            statusDropdown.classList.remove("light-theme");
            statusDropdown.classList.remove("dark-theme");
            // Добавляем класс выбранной темы
            if (playerSettings.theme === "light") {
              statusDropdown.classList.add("light-theme");
            } else {
              statusDropdown.classList.add("dark-theme");
            }
            // Обновляем позицию
            positionStatusDropdown();
          };
        }

        if (settingsBtn) {
          // Создаем модальное окно настроек
          let settingsModal = document.getElementById("player-settings-modal");
          if (!settingsModal) {
            settingsModal = document.createElement("div");
            settingsModal.id = "player-settings-modal";
            settingsModal.className = "settings-modal";
            // Применяем тему к модальному окну
            settingsModal.classList.add(
              playerSettings.theme === "light" ? "light-theme" : "dark-theme"
            );

            settingsModal.innerHTML = `
            <div class="settings-modal-content">
              <div class="settings-header">
                <h2>Настройки плеера</h2>
                <span class="close-settings">&times;</span>
              </div>
              <div class="settings-body">
                <div class="settings-section">
                  <h3>Плееры</h3>
                  <div class="settings-option">
                    <label>
                      Плеер по умолчанию:
                      <select id="default-player">
                        <option value="turbo" ${
                          playerSettings.defaultPlayer === "turbo"
                            ? "selected"
                            : ""
                        }>Turbo</option>
                        <option value="lumex" ${
                          playerSettings.defaultPlayer === "lumex"
                            ? "selected"
                            : ""
                        }>Lumex</option>
                        <option value="alloha" ${
                          playerSettings.defaultPlayer === "alloha"
                            ? "selected"
                            : ""
                        }>Alloha</option>
                        <option value="kodik" ${
                          playerSettings.defaultPlayer === "kodik"
                            ? "selected"
                            : ""
                        }>Kodik</option>
                      </select>
                    </label>
                  </div>
                  <div class="settings-option">
                    <label>
                      Порядок плееров:
                    </label>
                  </div>
                  <div class="player-order-container" id="player-order-container">
                    ${playerSettings.playerOrder
                      .map(
                        (player) => `
                      <div class="player-order-item" draggable="true" data-player="${player}">
                        <span class="drag-handle">☰</span>
                        <span class="player-name">${
                          player.charAt(0).toUpperCase() + player.slice(1)
                        }</span>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
                <div class="settings-section">
                  <h3>Воспроизведение</h3>
                  <div class="settings-option">
                    <label>
                      <input type="checkbox" id="remember-quality" ${
                        playerSettings.rememberQuality ? "checked" : ""
                      }>
                      Запоминать качество видео
                    </label>
                  </div>
                  <div class="settings-option">
                    <label>
                      Качество по умолчанию:
                      <select id="default-quality">
                        <option value="auto" ${
                          playerSettings.defaultQuality === "auto"
                            ? "selected"
                            : ""
                        }>Авто</option>
                        <option value="1080" ${
                          playerSettings.defaultQuality === "1080"
                            ? "selected"
                            : ""
                        }>1080p</option>
                        <option value="720" ${
                          playerSettings.defaultQuality === "720"
                            ? "selected"
                            : ""
                        }>720p</option>
                        <option value="480" ${
                          playerSettings.defaultQuality === "480"
                            ? "selected"
                            : ""
                        }>480p</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div class="settings-section">
                  <h3>Внешний вид</h3>
                  <div class="settings-option">
                    <label>
                      Тема плеера:
                    </label>
                  </div>
                  <div class="theme-selector">
                    <div class="theme-option ${
                      playerSettings.theme === "dark" ? "selected" : ""
                    }" data-theme="dark">
                      <div class="theme-icon">🌙</div>
                      <div>Темная</div>
                    </div>
                    <div class="theme-option ${
                      playerSettings.theme === "light" ? "selected" : ""
                    }" data-theme="light">
                      <div class="theme-icon">☀️</div>
                      <div>Светлая</div>
                    </div>
                  </div>
                </div>
                <div class="settings-section">
                  <h3>Уведомления</h3>
                  <div class="settings-option">
                    <label>
                      <input type="checkbox" id="disable-notifications" ${
                        playerSettings.disableNotifications ? "checked" : ""
                      }>
                      Отключить уведомления
                    </label>
                  </div>
                </div>
                <div class="settings-section">
                  <h3>Диагностика</h3>
                  <div class="settings-option">
                    <label>
                      <input type="checkbox" id="debug-mode" ${
                        playerSettings.debugMode ? "checked" : ""
                      }>
                      Режим отладки (вывод в консоль)
                    </label>
                  </div>
                </div>
                <div class="settings-info">
                  <p>Примечание: Некоторые настройки могут не поддерживаться всеми плеерами.</p>
                </div>
              </div>
              <button class="settings-save-btn">Сохранить настройки</button>
            </div>
          `;

            document.body.appendChild(settingsModal);

            // Настройка drag and drop для порядка плееров
            const playerOrderContainer = settingsModal.querySelector(
              "#player-order-container"
            );
            setupDragAndDrop(playerOrderContainer);

            // Обработчики событий для выбора темы
            const themeOptions =
              settingsModal.querySelectorAll(".theme-option");
            themeOptions.forEach((option) => {
              option.addEventListener("click", () => {
                themeOptions.forEach((opt) => opt.classList.remove("selected"));
                option.classList.add("selected");
              });
            });

            // Обработчики событий
            const closeBtn = settingsModal.querySelector(".close-settings");
            closeBtn.addEventListener("click", () => {
              settingsModal.style.display = "none";
              // Разблокируем прокрутку страницы
              document.body.classList.remove("settings-modal-open");
            });

            window.addEventListener("click", (e) => {
              if (e.target === settingsModal) {
                settingsModal.style.display = "none";
                // Разблокируем прокрутку страницы
                document.body.classList.remove("settings-modal-open");
              }
            });

            const saveBtn = settingsModal.querySelector(".settings-save-btn");
            saveBtn.addEventListener("click", () => {
              // Сохранение настроек
              playerSettings.rememberQuality =
                document.getElementById("remember-quality").checked;
              playerSettings.defaultQuality =
                document.getElementById("default-quality").value;
              playerSettings.defaultPlayer =
                document.getElementById("default-player").value;
              playerSettings.disableNotifications = document.getElementById(
                "disable-notifications"
              ).checked;
              playerSettings.debugMode =
                document.getElementById("debug-mode").checked;

              // Сохранение темы
              const selectedTheme = settingsModal.querySelector(
                ".theme-option.selected"
              );
              if (selectedTheme) {
                playerSettings.theme = selectedTheme.dataset.theme;
              }

              // Сохранение порядка плееров
              const playerOrderItems =
                document.querySelectorAll(".player-order-item");
              playerSettings.playerOrder = Array.from(playerOrderItems).map(
                (item) => item.dataset.player
              );
              debugLog(
                "Сохраняемый порядок плееров:",
                playerSettings.playerOrder
              );

              // Сохранение в localStorage
              localStorage.setItem(
                "shiki-remember-quality",
                playerSettings.rememberQuality
              );
              localStorage.setItem(
                "shiki-default-quality",
                playerSettings.defaultQuality
              );
              localStorage.setItem(
                "shiki-default-player",
                playerSettings.defaultPlayer
              );
              localStorage.setItem(
                "shiki-player-order",
                JSON.stringify(playerSettings.playerOrder)
              );
              localStorage.setItem(
                "shiki-disable-notifications",
                playerSettings.disableNotifications
              );
              localStorage.setItem("shiki-theme", playerSettings.theme);
              localStorage.setItem(
                "shiki-debug-mode",
                playerSettings.debugMode
              );

              // Применение темы
              applyTheme(playerContainer, playerSettings.theme);
              // Применение темы к модальному окну
              applyModalTheme(settingsModal, playerSettings.theme);
              // Применение темы к выпадающему меню статуса
              if (window.updateStatusDropdownTheme) {
                window.updateStatusDropdownTheme();
              }

              // Обновляем выпадающий список плееров после сохранения настроек
              updatePlayerDropdown(playerContainer, currentPlayer);

              showNotification("Настройки сохранены", "success");
              settingsModal.style.display = "none";
              // Разблокируем прокрутку страницы
              document.body.classList.remove("settings-modal-open");
            });

            // Добавляем обработчик клавиши Escape для закрытия модального окна
            document.addEventListener("keydown", function handleEscKey(e) {
              if (
                e.key === "Escape" &&
                settingsModal.style.display === "block"
              ) {
                settingsModal.style.display = "none";
                // Разблокируем прокрутку страницы
                document.body.classList.remove("settings-modal-open");
              }
            });
          }

          settingsBtn.addEventListener("click", () => {
            // Обновляем порядок плееров в модальном окне перед открытием
            updatePlayerOrderInModal(settingsModal);
            // Обновляем тему модального окна перед открытием
            applyModalTheme(settingsModal, playerSettings.theme);
            settingsModal.style.display = "block";
            // Блокируем прокрутку страницы
            document.body.classList.add("settings-modal-open");

            // Сбрасываем скролл модального окна в начало
            const settingsBody = settingsModal.querySelector(".settings-body");
            if (settingsBody) {
              settingsBody.scrollTop = 0;
            }
          });

          // Создаем всплывающую подсказку для кнопки настроек
          const settingsTooltip = document.createElement("div");
          settingsTooltip.className = "tooltip";
          settingsTooltip.textContent = "Настройки плеера";
          document.body.appendChild(settingsTooltip);

          settingsBtn.addEventListener("mouseenter", () => {
            const rect = settingsBtn.getBoundingClientRect();
            settingsTooltip.style.left = `${rect.left + rect.width / 2}px`;
            settingsTooltip.style.top = `${rect.bottom + 5}px`;
            settingsTooltip.classList.add("show");
          });

          settingsBtn.addEventListener("mouseleave", () => {
            settingsTooltip.classList.remove("show");
          });
        }

        // Добавляем обработчик для кнопки кинотеатра
        if (theaterBtn) {
          theaterBtn.addEventListener("click", () => {
            playerContainer.classList.toggle("theater-mode");

            if (playerContainer.classList.contains("theater-mode")) {
              // Запрещаем скролл страницы
              document.body.classList.add("theater-mode-active");

              // Создаем кнопку закрытия режима кинотеатра
              const closeTheaterBtn = document.createElement("button");
              closeTheaterBtn.className = "close-theater-btn";
              closeTheaterBtn.innerHTML = "&times;";

              // Функция для выхода из режима кинотеатра
              const exitTheaterMode = () => {
                playerContainer.classList.remove("theater-mode");
                closeTheaterBtn.remove();
                // Разрешаем скролл страницы
                document.body.classList.remove("theater-mode-active");
                // Удаляем обработчик Escape
                document.removeEventListener("keydown", handleEscape);
              };

              closeTheaterBtn.addEventListener("click", exitTheaterMode);
              document.body.appendChild(closeTheaterBtn);

              // Добавляем обработчик клавиши Escape для выхода из режима
              const handleEscape = (e) => {
                if (
                  e.key === "Escape" &&
                  playerContainer.classList.contains("theater-mode")
                ) {
                  exitTheaterMode();
                }
              };
              document.addEventListener("keydown", handleEscape);

              // Убираем уведомление о входе в режим кинотеатра
            } else {
              // Удаляем кнопку закрытия, если она существует
              const closeBtn = document.querySelector(".close-theater-btn");
              if (closeBtn) closeBtn.remove();
              // Разрешаем скролл страницы
              document.body.classList.remove("theater-mode-active");
            }
          });

          // Создаем всплывающую подсказку для кнопки кинотеатра
          const theaterTooltip = document.createElement("div");
          theaterTooltip.className = "tooltip";
          theaterTooltip.textContent = "Режим кинотеатра";
          document.body.appendChild(theaterTooltip);

          theaterBtn.addEventListener("mouseenter", () => {
            const rect = theaterBtn.getBoundingClientRect();
            theaterTooltip.style.left = `${rect.left + rect.width / 2}px`;
            theaterTooltip.style.top = `${rect.bottom + 5}px`;
            theaterTooltip.classList.add("show");
          });

          theaterBtn.addEventListener("mouseleave", () => {
            theaterTooltip.classList.remove("show");
          });
        }

        setupLazyLoading(playerContainer, () =>
          autoPlayerChain(id, playerContainer, startEpisode)
        );
      })
      .catch((error) => {
        console.error("Ошибка при проверке доступности плееров:", error);
        playerContainer.innerHTML = `
        <div class="kodik-header">
          <span>ОНЛАЙН ПРОСМОТР</span>
          <span style="color: #ff6b6b;">Ошибка загрузки</span>
        </div>
        <div class="player-wrapper">
          <div class="error-message">Произошла ошибка при загрузке плееров</div>
        </div>
      `;
      });
  }
  // Функция для применения темы к плееру
  function applyTheme(playerContainer, theme) {
    // Удаляем оба класса темы
    playerContainer.classList.remove("light-theme");
    playerContainer.classList.remove("dark-theme");
    // Добавляем класс выбранной темы
    if (theme === "light") {
      playerContainer.classList.add("light-theme");
    } else {
      playerContainer.classList.add("dark-theme");
    }
  }
  // Функция для применения темы к модальному окну настроек
  function applyModalTheme(settingsModal, theme) {
    // Удаляем оба класса темы
    settingsModal.classList.remove("light-theme");
    settingsModal.classList.remove("dark-theme");
    // Добавляем класс выбранной темы
    if (theme === "light") {
      settingsModal.classList.add("light-theme");
    } else {
      settingsModal.classList.add("dark-theme");
    }
  }
  // НОВАЯ ФУНКЦИЯ: Обновление выпадающего списка плееров
  function updatePlayerDropdown(playerContainer, current) {
    const playerDropdown = playerContainer.querySelector("#player-dropdown");
    if (playerDropdown) {
      // Сохраняем текущее значение
      const currentValue = playerDropdown.value;
      // Обновляем HTML выпадающего списка
      let optionsHTML = "";
      // Перебираем плееры в порядке, установленном в настройках
      for (const player of playerSettings.playerOrder) {
        if (playerAvailability[player]) {
          const isSelected = player === current ? "selected" : "";
          const playerName = player.charAt(0).toUpperCase() + player.slice(1);
          optionsHTML += `<option value="${player}" ${isSelected}>${playerName}</option>`;
        }
      }
      if (optionsHTML === "") {
        optionsHTML =
          '<option value="" disabled>Нет доступных плееров</option>';
      }
      playerDropdown.innerHTML = optionsHTML;
      // Восстанавливаем выбранное значение, если оно все еще доступно
      if (playerAvailability[currentValue]) {
        playerDropdown.value = currentValue;
      }
    }
  }
  async function autoPlayerChain(id, playerContainer, episode) {
    // Используем порядок из настроек, но фильтруем только доступные плееры
    const playerOrder = playerSettings.playerOrder.filter(
      (p) => playerAvailability[p]
    );
    debugLog("Доступные плееры в порядке приоритета:", playerOrder);

    if (playerOrder.length === 0) {
      showNotification("Нет доступных плееров для этого аниме", "error");
      return;
    }

    // Если есть плеер по умолчанию и он доступен, начинаем с него
    let startIndex = 0;
    if (playerAvailability[playerSettings.defaultPlayer]) {
      startIndex = playerOrder.indexOf(playerSettings.defaultPlayer);
      if (startIndex === -1) startIndex = 0;
    }

    // Создаем новый порядок, начиная с плеера по умолчанию
    const orderedPlayers = [
      ...playerOrder.slice(startIndex),
      ...playerOrder.slice(0, startIndex),
    ];
    debugLog("Итоговый порядок воспроизведения:", orderedPlayers);

    let lastError = null;
    for (const playerType of orderedPlayers) {
      try {
        currentPlayer = playerType;
        playerContainer.querySelector("#player-dropdown").value = playerType;
        await showPlayer(playerType, id, playerContainer, episode);
        return;
      } catch (error) {
        lastError = error;
        console.warn(`Плеер ${playerType} недоступен:`, error);
        showNotification(
          `${playerType} недоступен, пробую следующий...`,
          "warning"
        );
      }
    }

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
        <div>Загрузка...</div>
      </div>
    `;

    try {
      if (playerType === "alloha" && !checkVideoCodecSupport()) {
        showNotification(
          "Ваш браузер не поддерживает необходимые кодеки для Alloha плеера.",
          "error"
        );
        throw new Error(
          "Ваш браузер не поддерживает необходимые кодеки для Alloha"
        );
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
          iframe.onerror = () => {
            throw new Error("Turbo 404");
          };
        } catch (error) {
          throw error;
        }
      } else if (playerType === "kodik") {
        iframe.src = `https://kodik.cc/find-player?shikimoriID=${id}&episode=${episode}`;
      } else if (playerType === "alloha") {
        try {
          const iframeUrl = await loadAllohaPlayer(id, episode);
          iframe.src = iframeUrl;
          iframe.onerror = () => {
            throw new Error("Alloha 404");
          };
          // Добавляем обработчик для проверки ошибки "сезон недоступен"
          iframe.addEventListener("load", function () {
            try {
              const iframeContent =
                iframe.contentDocument || iframe.contentWindow.document;
              const errorElements = iframeContent.querySelectorAll(
                ".error, .warning, .not-found"
              );
              for (const el of errorElements) {
                if (
                  el.textContent.includes("сезон недоступен") ||
                  el.textContent.includes("сезон не найден") ||
                  el.textContent.includes("season not available")
                ) {
                  showNotification(
                    "Alloha: запрашиваемый сезон недоступен, переключаюсь на другой плеер...",
                    "warning"
                  );
                  throw new Error("Сезон недоступен в Alloha");
                }
              }
            } catch (e) {
              // Игнорируем ошибки доступа к iframe (из-за CORS)
              console.warn("Не удалось проверить содержимое iframe:", e);
            }
          });
        } catch (error) {
          throw error;
        }
      } else if (playerType === "lumex") {
        try {
          const iframeUrl = await loadLumexPlayer(id, episode);
          iframe.src = iframeUrl;
          iframe.onerror = () => {
            throw new Error("Lumex 404");
          };
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
        if (
          !iframe.contentWindow ||
          (iframe.contentDocument &&
            iframe.contentDocument.body.innerHTML.trim() === "")
        ) {
          if (playerType === "turbo") throw new Error("Turbo 404");
          if (playerType === "alloha") throw new Error("Alloha 404");
          if (playerType === "lumex") throw new Error("Lumex 404");
        }
      }, 2000);
    } catch (error) {
      playerWrapper.innerHTML = `<div class="error-message">Ошибка загрузки плеера ${playerType}: ${error.message}. Попробуйте другой плеер.</div>`;
      showNotification(
        `Не работает плеер ${playerType}: ${error.message}.`,
        "error"
      );
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
          status >= 200 && status < 300
            ? resolve(responseText)
            : reject(new Error(`HTTP ${status}`));
        },
        onerror: (error) => {
          reject(error);
        },
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
    const season = getCurrentSeason();
    const cacheKey = `alloha_${id}_s${season}`;
    let iframeUrl = getCachedData(cacheKey);
    if (iframeUrl) {
      return `${iframeUrl}&episode=${episode}&season=${season}`;
    }

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      try {
        const kodikResponse = await gmGetWithTimeout(
          `https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`
        );
        kodikData = JSON.parse(kodikResponse);
        setCachedData(kodikCacheKey, kodikData);
      } catch (error) {
        debugLog("Ошибка загрузки данных Kodik API для Alloha:", error);
        showNotification(
          "Ошибка загрузки данных Kodik API для Alloha.",
          "error"
        );
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) {
      debugLog("Нет результатов от Kodik API для Alloha");
      showNotification("Нет результатов от Kodik API для Alloha.", "error");
      throw new Error("Нет результатов от Kodik API");
    }

    const { kinopoisk_id, imdb_id } = results[0];
    const allohaUrl = kinopoisk_id
      ? `https://api.alloha.tv?token=${AllohaToken}&kp=${kinopoisk_id}`
      : `https://api.alloha.tv?token=${AllohaToken}&imdb=${imdb_id}`;

    if (!allohaUrl) {
      debugLog("Kinopoisk ID или IMDB ID не найдены для Alloha");
      showNotification(
        "Kinopoisk ID или IMDB ID не найдены для Alloha.",
        "error"
      );
      throw new Error("Kinopoisk ID или IMDB ID не найдены");
    }

    async function tryFetchAlloha(retries = 3, delayMs = 1000) {
      for (let i = 0; i < retries; i++) {
        try {
          const allohaResponse = await gmGetWithTimeout(allohaUrl);
          const allohaData = JSON.parse(allohaResponse);
          debugLog("Ответ Alloha API:", allohaData);

          if (allohaData.status === "success" && allohaData.data?.iframe) {
            return allohaData.data.iframe;
          } else {
            throw new Error(
              "Ошибка Alloha API: " +
                (allohaData.error_info || "Неизвестная ошибка")
            );
          }
        } catch (error) {
          debugLog(`Попытка ${i + 1} загрузки Alloha не удалась:`, error);
          if (i === retries - 1) {
            showNotification(
              "Alloha API недоступен. Попробуйте позже.",
              "error"
            );
            throw error;
          }
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }

    try {
      const allohaIframeUrl = await tryFetchAlloha();
      setCachedData(cacheKey, allohaIframeUrl);
      return `${allohaIframeUrl}&episode=${episode}&season=${season}`;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      debugLog("Ошибка загрузки Alloha:", error);
      showNotification("Ошибка загрузки Alloha: " + error.message, "error");
      throw new Error("Ошибка загрузки Alloha: " + error.message);
    }
  }
  async function loadTurboPlayer(id, episode) {
    debugLog(`Загрузка Turbo плеера для аниме ID: ${id}, серия: ${episode}`);
    const cacheKey = `turbo_${id}`;
    let iframeUrl = getCachedData(cacheKey);
    if (iframeUrl) {
      debugLog("Используем кешированный URL для Turbo");
      return iframeUrl;
    }

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      try {
        const kodikResponse = await gmGetWithTimeout(
          `https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`
        );
        kodikData = JSON.parse(kodikResponse);
        setCachedData(kodikCacheKey, kodikData);
        debugLog("Получены данные от Kodik API для Turbo");
      } catch (error) {
        debugLog("Ошибка загрузки данных Kodik API для Turbo:", error);
        showNotification(
          "Ошибка загрузки данных Kodik API для Turbo.",
          "error"
        );
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) {
      debugLog("Нет результатов от Kodik API для Turbo");
      showNotification("Нет результатов от Kodik API для Turbo.", "error");
      throw new Error("Нет результатов от Kodik API");
    }

    const { kinopoisk_id, worldart_id, shikimori_id } = results[0];
    debugLog(
      `ID из Kodik API: kinopoisk_id=${kinopoisk_id}, worldart_id=${worldart_id}, shikimori_id=${shikimori_id}`
    );

    // Пробуем разные варианты получения данных
    let kinoboxUrl = null;
    if (kinopoisk_id) {
      kinoboxUrl = `https://api.kinobox.tv/api/players?kinopoisk=${kinopoisk_id}`;
    } else if (worldart_id) {
      kinoboxUrl = `https://api.kinobox.tv/api/players?worldart=${worldart_id}`;
    } else if (shikimori_id) {
      kinoboxUrl = `https://api.kinobox.tv/api/players?shikimori=${shikimori_id}`;
    }

    if (!kinoboxUrl) {
      debugLog("Не найден подходящий ID для запроса к Kinobox API");
      showNotification("Не найден подходящий ID для Turbo.", "error");
      throw new Error("Не найден подходящий ID");
    }

    debugLog(`URL для запроса к Kinobox API: ${kinoboxUrl}`);

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
          debugLog("Ответ Kinobox API:", kinoboxData);

          // Проверяем наличие данных и ищем Turbo плеер
          if (!kinoboxData.data || !Array.isArray(kinoboxData.data)) {
            throw new Error("Некорректный формат ответа от Kinobox API");
          }

          // Ищем плеер с типом "Turbo" или похожим названием
          const turboPlayer = kinoboxData.data.find(
            (player) =>
              player.type && player.type.toLowerCase().includes("turbo")
          );

          if (turboPlayer?.iframeUrl) {
            return turboPlayer.iframeUrl;
          } else {
            // Если Turbo не найден, пробуем использовать первый доступный плеер
            if (kinoboxData.data.length > 0 && kinoboxData.data[0].iframeUrl) {
              debugLog(
                "Turbo плеер не найден, используем первый доступный:",
                kinoboxData.data[0].type
              );
              return kinoboxData.data[0].iframeUrl;
            }
            throw new Error("Turbo плеер не найден в Kinobox API");
          }
        } catch (error) {
          debugLog(`Попытка ${i + 1} загрузки Kinobox не удалась:`, error);
          if (i === retries - 1) {
            showNotification(
              "Kinobox API недоступен для Turbo. Попробуйте позже.",
              "error"
            );
            throw error;
          }
        }
      }
    }

    try {
      const iframeUrl = await tryFetchKinobox();
      setCachedData(cacheKey, iframeUrl);
      debugLog("Turbo плеер успешно загружен");
      return iframeUrl;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      debugLog("Ошибка загрузки Turbo:", error);
      showNotification("Ошибка загрузки Turbo: " + error.message, "error");
      throw new Error("Ошибка загрузки Turbo: " + error.message);
    }
  }
  async function loadLumexPlayer(id, episode) {
    debugLog(`Загрузка Lumex плеера для аниме ID: ${id}, серия: ${episode}`);
    const cacheKey = `lumex_${id}_${episode}`;
    let iframeUrl = getCachedData(cacheKey);
    if (iframeUrl) {
      debugLog("Используем кешированный URL для Lumex");
      return iframeUrl;
    }

    const kodikCacheKey = `kodik_${id}`;
    let kodikData = getCachedData(kodikCacheKey);
    if (!kodikData) {
      try {
        const kodikResponse = await gmGetWithTimeout(
          `https://kodikapi.com/search?token=${KodikToken}&shikimori_id=${id}`
        );
        kodikData = JSON.parse(kodikResponse);
        setCachedData(kodikCacheKey, kodikData);
        debugLog("Получены данные от Kodik API для Lumex");
      } catch (error) {
        debugLog("Ошибка загрузки данных Kodik API для Lumex:", error);
        showNotification(
          "Ошибка загрузки данных Kodik API для Lumex.",
          "error"
        );
        throw new Error("Ошибка загрузки данных Kodik API");
      }
    }

    const results = kodikData.results;
    if (!results?.length) {
      debugLog("Нет результатов от Kodik API для Lumex");
      showNotification("Нет результатов от Kodik API для Lumex.", "error");
      throw new Error("Нет результатов от Kodik API");
    }

    const { kinopoisk_id, worldart_id, shikimori_id } = results[0];
    debugLog(
      `ID из Kodik API: kinopoisk_id=${kinopoisk_id}, worldart_id=${worldart_id}, shikimori_id=${shikimori_id}`
    );

    // Пробуем разные варианты получения данных
    let kinoboxUrl = null;
    if (kinopoisk_id) {
      kinoboxUrl = `https://api.kinobox.tv/api/players?kinopoisk=${kinopoisk_id}`;
    } else if (worldart_id) {
      kinoboxUrl = `https://api.kinobox.tv/api/players?worldart=${worldart_id}`;
    } else if (shikimori_id) {
      kinoboxUrl = `https://api.kinobox.tv/api/players?shikimori=${shikimori_id}`;
    }

    if (!kinoboxUrl) {
      debugLog("Не найден подходящий ID для запроса к Kinobox API");
      showNotification("Не найден подходящий ID для Lumex.", "error");
      throw new Error("Не найден подходящий ID");
    }

    debugLog(`URL для запроса к Kinobox API: ${kinoboxUrl}`);

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
          debugLog("Ответ Kinobox API для Lumex:", kinoboxData);

          // Проверяем наличие данных и ищем Lumex плеер
          if (!kinoboxData.data || !Array.isArray(kinoboxData.data)) {
            throw new Error("Некорректный формат ответа от Kinobox API");
          }

          // Ищем плеер с типом "Lumex" или похожим названием
          const lumexPlayer = kinoboxData.data.find(
            (player) =>
              player.type && player.type.toLowerCase().includes("lumex")
          );

          if (lumexPlayer?.iframeUrl) {
            let url = lumexPlayer.iframeUrl;
            if (episode) {
              url += (url.includes("?") ? "&" : "?") + "episode=" + episode;
            }
            return url;
          } else {
            // Если Lumex не найден, пробуем использовать первый доступный плеер
            if (kinoboxData.data.length > 0 && kinoboxData.data[0].iframeUrl) {
              debugLog(
                "Lumex плеер не найден, используем первый доступный:",
                kinoboxData.data[0].type
              );
              let url = kinoboxData.data[0].iframeUrl;
              if (episode) {
                url += (url.includes("?") ? "&" : "?") + "episode=" + episode;
              }
              return url;
            }
            throw new Error("Lumex плеер не найден в Kinobox API");
          }
        } catch (error) {
          debugLog(
            `Попытка ${i + 1} загрузки Kinobox для Lumex не удалась:`,
            error
          );
          if (i === retries - 1) {
            showNotification(
              "Kinobox API недоступен для Lumex. Попробуйте позже.",
              "error"
            );
            throw error;
          }
        }
      }
    }

    try {
      const iframeUrl = await tryFetchKinoboxLumex();
      setCachedData(cacheKey, iframeUrl);
      debugLog("Lumex плеер успешно загружен");
      return iframeUrl;
    } catch (error) {
      localStorage.removeItem(cacheKey);
      debugLog("Ошибка загрузки Lumex:", error);
      showNotification("Ошибка загрузки Lumex: " + error.message, "error");
      throw new Error("Ошибка загрузки Lumex: " + error.message);
    }
  }
  function checkVideoCodecSupport() {
    const video = document.createElement("video");
    return (
      video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') ===
        "probably" ||
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
