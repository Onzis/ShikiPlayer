// ==UserScript==
// @name ShikiPlayer
// @namespace https://github.com/Onzis/ShikiPlayer
// @version 1.1
// @description Автоматически загружает видеоплеер kodik для просмотра прямо на Shikimori
// @author Onzis
// @match https://shikimori.one/*
// @homepageURL https://github.com/Onzis/ShikiPlayer
// @updateURL https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @downloadURL https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js
// @grant none
// ==/UserScript==

(function () {
  "use strict";

  let currentPath = location.pathname;
  let observer = null;

  function getShikimoriID() {
    const match = location.pathname.match(/\/animes\/(?:[a-z])?(\d+)/);
    const id = match ? match[1] : null;
    console.log("[WatchButton] Shikimori ID (из URL):", id);
    return id;
  }

  function removeOldElements() {
    const oldIframe = document.querySelector('iframe[src*="kodik.cc"]');
    if (oldIframe) {
      console.log("[WatchButton] Удаляю старый iframe");
      oldIframe.remove();
    }
  }

  function insertPlayerContainer() {
    console.log("[WatchButton] Попытка вставить плеер на", location.pathname);

    if (!/^\/animes\/[^/]+/.test(location.pathname)) {
      console.log("[WatchButton] Не страница аниме — пропуск");
      return;
    }

    removeOldElements();

    let relatedBlock = document.querySelector(".cc-related-authors"); // Попытка 1

    if (!relatedBlock) {
      console.log(
        '[WatchButton] Попытка 2 — блок "Связанное" не найден, жду 500 мс...'
      );
      setTimeout(() => {
        relatedBlock = document.querySelector(".cc-related-authors"); // Попытка 2
        if (!relatedBlock) {
          console.log('[WatchButton] Блок "Связанное" так и не был найден');
          return;
        }
        createAndInsertPlayer(relatedBlock);
      }, 500);
      return;
    }

    createAndInsertPlayer(relatedBlock);
  }

  function createAndInsertPlayer(relatedBlock) {
    console.log("[WatchButton] Создаю контейнер для плеера...");

    // Создаем новый контейнер
    const playerContainer = document.createElement("div");
    playerContainer.classList.add("kodik-container");
    playerContainer.innerHTML = `
        <div class="kodik-header">
            <span class="kodik-title">ОНЛАЙН ПРОСМОТР</span>
            <div class="kodik-links">
                <a href="https://github.com/Onzicry/ShikiPlayer" target="_blank">GitHub</a>
            </div>
        </div>
        <div class="player-wrapper"></div>
    `;

    // Добавляем стили
    const style = document.createElement("style");
    style.textContent = `
        .kodik-container {
            margin: 20px 0;
            width: 100%;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
        }

        .kodik-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #e6e8ea;
            padding: 8px 12px;
            font-weight: bold;
            color: #333;
            font-size: 14px;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
        }

        .kodik-title {
            font-size: 14px;
        }

        .kodik-links {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .kodik-links a {
            text-decoration: none;
            color: #333;
            font-size: 12px;
            font-weight: normal;
        }

        .player-wrapper {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%; /* 16:9 aspect ratio */
            overflow: hidden;
            border-bottom-left-radius: 6px;
            border-bottom-right-radius: 6px;
        }

        .player-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }

        /* Адаптация под мобильные */
        @media (max-width: 768px) {
            .kodik-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
                font-size: 13px;
            }

            .kodik-title {
                font-size: 13px;
            }

            .kodik-links a {
                font-size: 11px;
            }

            .player-wrapper {
                padding-bottom: 60%; /* Можно чуть больше, если нужно */
            }
        }
    `;
    document.head.appendChild(style);

    // Получаем ID
    const id = getShikimoriID();
    if (!id) {
      console.log("[WatchButton] ID не найден, прерывание");
      return;
    }

    console.log("[WatchButton] Создаю iframe для ID:", id);
    const iframe = document.createElement("iframe");
    iframe.src = `https://kodik.cc/find-player?shikimoriID=${id}`;
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "autoplay *; fullscreen *");
    iframe.setAttribute("loading", "lazy"); // Оптимизация

    const playerWrapper = playerContainer.querySelector(".player-wrapper");
    playerWrapper.appendChild(iframe);

    // Вставляем контейнер
    relatedBlock.parentNode.insertBefore(playerContainer, relatedBlock);
    console.log("[WatchButton] Контейнер с плеером вставлен");
  }

  function setupDOMObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          [...mutation.addedNodes].some(
            (node) =>
              node.nodeType === 1 && node.querySelector?.(".cc-related-authors")
          )
        ) {
          console.log(
            "[WatchButton] MutationObserver сработал — найдены изменения с .cc-related-authors"
          );
          setTimeout(insertPlayerContainer, 100);
          break;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[WatchButton] MutationObserver активирован");
  }

  function watchURLChanges() {
    setInterval(() => {
      if (location.pathname !== currentPath) {
        console.log(
          "[WatchButton] Обнаружено изменение URL:",
          location.pathname
        );
        currentPath = location.pathname;
        setTimeout(insertPlayerContainer, 500);
      }
    }, 300);
  }

  // Инициализация
  console.log("[WatchButton] Скрипт запущен");
  setupDOMObserver();
  watchURLChanges();
  insertPlayerContainer();
})();