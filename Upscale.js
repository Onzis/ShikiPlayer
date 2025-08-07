// ==UserScript==
// @name         Kodik Realtime Upscale 720p -> pseudo 1080p (Sharpen + Controls)
// @namespace    onzi.kodik.upscaler
// @version      1.0.0
// @description  Реалтайм резкость и апскейл для HTML5 video на Kodik. Панель управления, тонкая настройка, без внешних библиотек.
// @author       You
// @match        *://*.kodik.*/*
// @match        *://*.kodik.cc/*
// @match        *://*.kodik.ws/*
// @match        *://*.kodik.info/*
// @all-frames   true
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ---------- Настройки по умолчанию ----------
  const DEFAULTS = {
    enabled: true,
    sharpen: 0.6, // 0.0–2.0 (рекомендую 0.4–0.9)
    contrast: 1.05, // 0.5–2.0
    saturate: 1.05, // 0.5–2.0
    maxWidth: "100%", // оставь '100%' чтобы вписываться в плеер
    maxHeight: "100%", // можно поставить '1080px', но чаще лучше авто
  };

  const STORAGE_KEY = "kodik_upscale_settings_v1";

  // ---------- Хранилище ----------
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const s = JSON.parse(raw);
      return { ...DEFAULTS, ...s };
    } catch {
      return { ...DEFAULTS };
    }
  }
  function saveSettings(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }

  let settings = loadSettings();

  // ---------- SVG-фильтр (Convolution Sharpen) ----------
  function ensureSVGFilter() {
    if (document.getElementById("tm-kodik-svg-filter")) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "tm-kodik-svg-filter");
    svg.setAttribute(
      "style",
      "position:fixed;width:0;height:0;pointer-events:none;"
    );

    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "tm-kodik-sharpen");

    const convolve = document.createElementNS(svgNS, "feConvolveMatrix");
    convolve.setAttribute("id", "tm-kodik-conv");
    convolve.setAttribute("order", "3");
    convolve.setAttribute("edgeMode", "duplicate");
    convolve.setAttribute("preserveAlpha", "true");

    // Инициализация ядра
    const kernel = makeSharpenKernel(settings.sharpen);
    convolve.setAttribute("kernelMatrix", kernel.join(" "));

    filter.appendChild(convolve);
    svg.appendChild(filter);
    document.documentElement.appendChild(svg);
  }

  // s: 0..2. Ядро: центр 1+4s, соседи -s (классическое sharpen)
  function makeSharpenKernel(s) {
    s = Math.max(0, Math.min(2, s));
    const c = 1 + 4 * s;
    const n = -s;
    return [0, n, 0, n, c, n, 0, n, 0];
  }

  function updateSharpenStrength(s) {
    const conv = document.getElementById("tm-kodik-conv");
    if (!conv) return;
    const kernel = makeSharpenKernel(s);
    conv.setAttribute("kernelMatrix", kernel.join(" "));
  }

  // ---------- Применение к видео ----------
  const processed = new WeakSet();

  function applyFiltersToVideo(v) {
    if (!v || processed.has(v)) return;
    processed.add(v);

    // Вписывание под контейнер
    v.style.maxWidth = settings.maxWidth;
    v.style.maxHeight = settings.maxHeight;

    // Триггерим GPU-композитинг
    v.style.willChange = "filter, transform";
    v.style.transform = "translateZ(0)";

    // Композиция фильтров: SVG sharpen + контраст + насыщенность
    setVideoFilter(v);

    // На всякий случай — переустановка при смене src/attach
    const ro = new ResizeObserver(() => setVideoFilter(v));
    try {
      ro.observe(v);
    } catch {}
  }

  function setVideoFilter(v) {
    const chain = [
      "url(#tm-kodik-sharpen)",
      `contrast(${settings.contrast})`,
      `saturate(${settings.saturate})`,
    ].join(" ");
    v.style.filter = settings.enabled ? chain : "none";
  }

  // ---------- Поиск <video> ----------
  function findVideos(root = document) {
    return Array.from(root.querySelectorAll("video"));
  }

  function scanAndApply(root = document) {
    ensureSVGFilter();
    findVideos(root).forEach(applyFiltersToVideo);
  }

  // Наблюдатель за DOM (добавление видео динамически)
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName && node.tagName.toLowerCase() === "video") {
          scanAndApply(node.ownerDocument || document);
        } else {
          const vids = node.querySelectorAll
            ? node.querySelectorAll("video")
            : [];
          if (vids.length) scanAndApply(node);
        }
      }
    }
  });

  // ---------- UI Панель ----------
  function createUI() {
    if (document.getElementById("tm-kodik-panel")) return;

    const wrap = document.createElement("div");
    wrap.id = "tm-kodik-panel";
    wrap.innerHTML = `
      <style>
        #tm-kodik-panel {
          position: fixed;
          left: 14px;
          bottom: 14px;
          z-index: 2147483647;
          background: rgba(17,17,17,0.85);
          color: #fff;
          font: 12px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.35);
          backdrop-filter: blur(6px);
          user-select: none;
        }
        #tm-kodik-panel input[type="range"] { width: 150px; }
        #tm-kodik-panel .row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
        #tm-kodik-panel .title { font-weight: 700; margin-bottom: 6px; letter-spacing: .2px; }
        #tm-kodik-panel .val { width: 42px; text-align: right; opacity: .9; }
        #tm-kodik-panel .muted { opacity: .7; }
        #tm-kodik-panel button {
          background: #2b5cff; color:#fff; border:0; border-radius:8px; padding:6px 10px; cursor:pointer;
        }
        #tm-kodik-panel button.secondary {
          background: transparent; border:1px solid rgba(255,255,255,0.25); color:#ddd;
        }
        #tm-kodik-panel .grid { display:grid; grid-template-columns: auto auto; gap: 8px 10px; }
        #tm-kodik-panel .small { font-size: 11px; }
      </style>
      <div class="title">Upscale & Sharpen</div>
      <div class="row">
        <button id="tm-kodik-toggle">${
          settings.enabled ? "Вкл" : "Выкл"
        }</button>
        <button id="tm-kodik-reset" class="secondary">Сброс</button>
      </div>
      <div class="grid">
        <label>Резкость</label>
        <div class="row">
          <input id="tm-kodik-sharpen" type="range" min="0" max="2" step="0.05" value="${
            settings.sharpen
          }">
          <span class="val" id="tm-kodik-sharpen-val">${settings.sharpen.toFixed(
            2
          )}</span>
        </div>

        <label>Контраст</label>
        <div class="row">
          <input id="tm-kodik-contrast" type="range" min="0.5" max="2" step="0.01" value="${
            settings.contrast
          }">
          <span class="val" id="tm-kodik-contrast-val">${settings.contrast.toFixed(
            2
          )}</span>
        </div>

        <label>Насыщенность</label>
        <div class="row">
          <input id="tm-kodik-saturate" type="range" min="0.5" max="2" step="0.01" value="${
            settings.saturate
          }">
          <span class="val" id="tm-kodik-saturate-val">${settings.saturate.toFixed(
            2
          )}</span>
        </div>
      </div>
      <div class="small muted" style="margin-top:6px;">
        Подсказка: 0.4–0.9 резкости обычно даёт эффект «1080p‑like» без перешарпа.
      </div>
    `;

    document.documentElement.appendChild(wrap);

    const qs = (id) => wrap.querySelector(id);
    const $toggle = qs("#tm-kodik-toggle");
    const $reset = qs("#tm-kodik-reset");
    const $sh = qs("#tm-kodik-sharpen");
    const $shv = qs("#tm-kodik-sharpen-val");
    const $ct = qs("#tm-kodik-contrast");
    const $ctv = qs("#tm-kodik-contrast-val");
    const $st = qs("#tm-kodik-saturate");
    const $stv = qs("#tm-kodik-saturate-val");

    $toggle.addEventListener("click", () => {
      settings.enabled = !settings.enabled;
      saveSettings(settings);
      $toggle.textContent = settings.enabled ? "Вкл" : "Выкл";
      document.querySelectorAll("video").forEach(setVideoFilter);
    });

    $reset.addEventListener("click", () => {
      settings = { ...DEFAULTS };
      saveSettings(settings);
      $sh.value = settings.sharpen;
      $ct.value = settings.contrast;
      $st.value = settings.saturate;
      $shv.textContent = settings.sharpen.toFixed(2);
      $ctv.textContent = settings.contrast.toFixed(2);
      $stv.textContent = settings.saturate.toFixed(2);
      updateSharpenStrength(settings.sharpen);
      document.querySelectorAll("video").forEach(setVideoFilter);
    });

    $sh.addEventListener("input", () => {
      const v = Number($sh.value);
      settings.sharpen = v;
      $shv.textContent = v.toFixed(2);
      updateSharpenStrength(v);
      saveSettings(settings);
    });

    $ct.addEventListener("input", () => {
      const v = Number($ct.value);
      settings.contrast = v;
      $ctv.textContent = v.toFixed(2);
      document.querySelectorAll("video").forEach(setVideoFilter);
      saveSettings(settings);
    });

    $st.addEventListener("input", () => {
      const v = Number($st.value);
      settings.saturate = v;
      $stv.textContent = v.toFixed(2);
      document.querySelectorAll("video").forEach(setVideoFilter);
      saveSettings(settings);
    });
  }

  // ---------- Инициализация ----------
  function init() {
    ensureSVGFilter();
    createUI();
    scanAndApply();

    mo.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });

    // Обработка фуллскрина — иногда плеер перестраивает DOM
    [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ].forEach((evt) => {
      document.addEventListener(
        evt,
        () => {
          setTimeout(() => scanAndApply(), 150);
        },
        true
      );
    });
  }

  // Стартуем, когда DOM готов
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
