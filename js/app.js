/* ==========================================================================
   Cálculo IV (SMA0356 - ICMC/USP) — Interactive Textbook Core Engine
   Features:
   - Light/Dark theme persistence + canvas redraw broadcast
   - localStorage progress tracking (topics & exercises across all blocks)
   - Collapsible solutions + progressive step-by-step revealer
   - ScrollSpy TOC, reading progress bar, mobile drawer
   - KaTeX auto-render initialization
   - HiDPI reusable Canvas plotting toolkit (window.Calc4Plot)
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_THEME_KEY = 'calc4_theme_v1';
  const STORAGE_PROGRESS_KEY = 'calc4_progress_v1';

  /* Registry of all blocks (expected totals updated automatically when pages load) */
  const BLOCK_CATALOG = {
    bloco0: { title: 'Bloco 0 · Nivelamento Obrigatório', topics: 3, exercises: 12, ready: true },
    bloco1: { title: 'Bloco 1 · Motor das Séries de Potências', topics: 3, exercises: 12, ready: true },
    bloco2: { title: 'Bloco 2 · Convergência, Erros, Binomiais e EDOs', topics: 3, exercises: 12, ready: true },
    bloco3: { title: 'Bloco 3 · Fundamentos e Cálculos de Fourier', topics: 4, exercises: 14, ready: true },
    bloco4: { title: 'Bloco 4 · Extensões Periódicas, Pares e Ímpares', topics: 2, exercises: 6, ready: true },
    bloco5: { title: 'Bloco 5 · Aplicações em EDPs: Calor e Onda', topics: 4, exercises: 12, ready: true }
  };

  /* -------------------- Storage Helpers -------------------- */
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
      if (!raw) return { items: {}, totals: {} };
      const parsed = JSON.parse(raw);
      return {
        items: parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
        totals: parsed.totals && typeof parsed.totals === 'object' ? parsed.totals : {}
      };
    } catch (_) {
      return { items: {}, totals: {} };
    }
  }

  function saveProgress(data) {
    try {
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(data));
    } catch (_) {
      /* Ignore storage quota / privacy mode errors gracefully */
    }
  }

  /* -------------------- Theme Management -------------------- */
  function getPreferredTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch (_) {}

    const buttons = document.querySelectorAll('[data-theme-toggle]');
    buttons.forEach((btn) => {
      const icon = btn.querySelector('.theme-icon');
      const label = btn.querySelector('.theme-label');
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
      if (label) label.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    });

    window.dispatchEvent(new CustomEvent('calc4:themechange', { detail: { theme } }));
  }

  function initTheme() {
    applyTheme(getPreferredTheme());
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    });
  }

  /* -------------------- Sidebar Drawer & Reading Bar -------------------- */
  function initNavigationUI() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('[data-sidebar-toggle]');
    const backdrop = document.querySelector('.sidebar-backdrop');

    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('open', isOpen);
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    if (sidebar) {
      sidebar.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 980) closeSidebar();
        });
      });
    }

    /* Reading progress line */
    const fill = document.querySelector('.reading-progress-fill');
    if (fill) {
      const updateReadingBar = () => {
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - doc.clientHeight;
        const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
        fill.style.width = `${(ratio * 100).toFixed(1)}%`;
      };
      window.addEventListener('scroll', updateReadingBar, { passive: true });
      window.addEventListener('resize', updateReadingBar, { passive: true });
      updateReadingBar();
    }

    /* ScrollSpy for sidebar TOC */
    const tocLinks = Array.from(document.querySelectorAll('.toc-link[href^="#"]'));
    if (tocLinks.length > 0 && 'IntersectionObserver' in window) {
      const targetMap = new Map();
      tocLinks.forEach((link) => {
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) targetMap.set(target, link);
      });

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting);
          if (visible.length > 0) {
            tocLinks.forEach((l) => l.classList.remove('active'));
            const topMost = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            const link = targetMap.get(topMost.target);
            if (link) link.classList.add('active');
          }
        },
        { rootMargin: '-80px 0px -65% 0px', threshold: 0.01 }
      );

      targetMap.forEach((_, el) => observer.observe(el));
    }
  }

  /* -------------------- Progress Tracking -------------------- */
  function computeBlockStats(progress, blockId) {
    const meta = BLOCK_CATALOG[blockId] || { topics: 0, exercises: 0, ready: true };
    const storedTotals = progress.totals[blockId];
    const totalTopics = storedTotals ? storedTotals.topics : meta.topics;
    const totalExercises = storedTotals ? storedTotals.exercises : meta.exercises;

    let doneTopics = 0;
    let doneExercises = 0;

    Object.entries(progress.items).forEach(([, rec]) => {
      if (rec && rec.block === blockId && rec.done) {
        if (rec.type === 'topic') doneTopics += 1;
        else if (rec.type === 'exercise') doneExercises += 1;
      }
    });

    const total = totalTopics + totalExercises;
    const done = Math.min(total, doneTopics + doneExercises);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return { doneTopics, totalTopics, doneExercises, totalExercises, done, total, pct };
  }

  function computeGlobalStats(progress) {
    let doneTopics = 0;
    let totalTopics = 0;
    let doneExercises = 0;
    let totalExercises = 0;

    Object.keys(BLOCK_CATALOG).forEach((blockId) => {
      const s = computeBlockStats(progress, blockId);
      doneTopics += s.doneTopics;
      totalTopics += s.totalTopics;
      doneExercises += s.doneExercises;
      totalExercises += s.totalExercises;
    });

    const total = totalTopics + totalExercises;
    const done = doneTopics + doneExercises;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { doneTopics, totalTopics, doneExercises, totalExercises, done, total, pct };
  }

  function refreshProgressUI() {
    const progress = loadProgress();
    const currentBlock = document.body.getAttribute('data-block-id');

    /* Update checkboxes visual state */
    document.querySelectorAll('input[data-track-id]').forEach((cb) => {
      const id = cb.getAttribute('data-track-id');
      const isDone = Boolean(progress.items[id] && progress.items[id].done);
      cb.checked = isDone;
      const label = cb.closest('.study-checkbox-label');
      if (label) label.classList.toggle('checked', isDone);

      /* Update matching TOC badge if linked */
      const tocTag = document.querySelector(`[data-toc-track="${id}"]`);
      if (tocTag) {
        tocTag.textContent = isDone ? '✓' : '';
        tocTag.classList.toggle('done', isDone);
        tocTag.style.display = isDone ? 'inline-block' : 'none';
      }
    });

    /* Current block progress widgets (sidebar + header pill) */
    if (currentBlock && BLOCK_CATALOG[currentBlock]) {
      const stats = computeBlockStats(progress, currentBlock);
      document.querySelectorAll('[data-block-progress-pct]').forEach((el) => {
        el.textContent = `${stats.pct}%`;
      });
      document.querySelectorAll('[data-block-progress-bar]').forEach((el) => {
        el.style.width = `${stats.pct}%`;
        el.classList.toggle('complete', stats.pct === 100);
      });
      document.querySelectorAll('[data-block-progress-detail]').forEach((el) => {
        el.textContent = `${stats.doneTopics}/${stats.totalTopics} tópicos · ${stats.doneExercises}/${stats.totalExercises} exercícios`;
      });
    }

    /* Index page global & per-block progress */
    const globalStats = computeGlobalStats(progress);
    const globalPctEl = document.querySelector('[data-global-progress-pct]');
    if (globalPctEl) globalPctEl.textContent = `${globalStats.pct}%`;

    const globalBarEl = document.querySelector('[data-global-progress-bar]');
    if (globalBarEl) {
      globalBarEl.style.width = `${globalStats.pct}%`;
      globalBarEl.classList.toggle('complete', globalStats.pct === 100);
    }

    const globalTopicsEl = document.querySelector('[data-global-topics]');
    if (globalTopicsEl) globalTopicsEl.textContent = `${globalStats.doneTopics}/${globalStats.totalTopics}`;

    const globalExEl = document.querySelector('[data-global-exercises]');
    if (globalExEl) globalExEl.textContent = `${globalStats.doneExercises}/${globalStats.totalExercises}`;

    const globalMsgEl = document.querySelector('[data-global-status-msg]');
    if (globalMsgEl) {
      if (globalStats.done === 0) {
        globalMsgEl.textContent = 'Comece pelo Bloco 0 — cada passo marcado fica salvo automaticamente neste navegador.';
      } else if (globalStats.pct < 30) {
        globalMsgEl.textContent = 'Excelente começo! Continue construindo sua base sem pular exercícios.';
      } else if (globalStats.pct < 70) {
        globalMsgEl.textContent = 'Ritmo sólido! Você já dominou uma parte importante da matéria da P2.';
      } else if (globalStats.pct < 100) {
        globalMsgEl.textContent = 'Reta final para a P2! Revise os alertas de pegadinha e finalize os últimos exercícios.';
      } else {
        globalMsgEl.textContent = 'Parabéns! Você concluiu 100% da apostila e está pronto para a P2.';
      }
    }

    /* Per-block cards on index.html */
    document.querySelectorAll('[data-card-block]').forEach((card) => {
      const bId = card.getAttribute('data-card-block');
      const s = computeBlockStats(progress, bId);
      const pctEl = card.querySelector('[data-card-pct]');
      const detailEl = card.querySelector('[data-card-detail]');
      const barEl = card.querySelector('[data-card-bar]');
      if (pctEl) pctEl.textContent = `${s.pct}%`;
      if (detailEl) detailEl.textContent = `${s.done}/${s.total} concluídos`;
      if (barEl) {
        barEl.style.width = `${s.pct}%`;
        barEl.classList.toggle('complete', s.pct === 100);
      }
    });
  }

  function initProgressTracking() {
    const progress = loadProgress();
    const currentBlock = document.body.getAttribute('data-block-id');
    const checkboxes = Array.from(document.querySelectorAll('input[data-track-id]'));

    /* Sync exact counts for the currently visited block */
    if (currentBlock && checkboxes.length > 0) {
      let topics = 0;
      let exercises = 0;
      checkboxes.forEach((cb) => {
        const type = cb.getAttribute('data-track-type');
        if (type === 'topic') topics += 1;
        else if (type === 'exercise') exercises += 1;
      });
      progress.totals[currentBlock] = { topics, exercises };
      saveProgress(progress);
    }

    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        const data = loadProgress();
        const id = cb.getAttribute('data-track-id');
        const type = cb.getAttribute('data-track-type') || 'topic';
        const block = cb.getAttribute('data-block') || currentBlock || 'bloco0';
        data.items[id] = { done: cb.checked, type, block };
        saveProgress(data);
        refreshProgressUI();
      });
    });

    const resetBtn = document.querySelector('[data-reset-progress]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const ok = window.confirm(
          'Tem certeza que deseja zerar todo o seu progresso salvo (tópicos estudados e exercícios resolvidos)?'
        );
        if (!ok) return;
        saveProgress({ items: {}, totals: {} });
        refreshProgressUI();
      });
    }

    refreshProgressUI();
  }

  /* -------------------- Collapsible Solutions & Progressive Steps -------------------- */
  function initSolutions() {
    document.querySelectorAll('[data-solution-wrapper]').forEach((wrapper) => {
      const panel = wrapper.querySelector('.solution-panel');
      const toggleBtn = wrapper.querySelector('[data-action="toggle-solution"]');
      const nextStepBtn = wrapper.querySelector('[data-action="next-step"]');
      const steps = panel ? Array.from(panel.querySelectorAll('.reveal-step')) : [];

      if (!panel || !toggleBtn) return;

      let revealedCount = 0;

      function updateButtons() {
        const isOpen = panel.classList.contains('open');
        const allRevealed = steps.length === 0 || revealedCount >= steps.length;

        if (isOpen && allRevealed) {
          toggleBtn.textContent = 'Ocultar Resolução';
          toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          toggleBtn.textContent = 'Mostrar Resolução Completa';
          toggleBtn.setAttribute('aria-expanded', 'false');
        }

        if (nextStepBtn && steps.length > 0) {
          if (revealedCount >= steps.length) {
            nextStepBtn.textContent = `Todos os ${steps.length} passos revelados ✓`;
            nextStepBtn.disabled = true;
          } else {
            nextStepBtn.textContent = `Revelar Passo ${revealedCount + 1} de ${steps.length}`;
            nextStepBtn.disabled = false;
          }
        }
      }

      /* Hide steps initially if progressive mode is enabled */
      if (steps.length > 0) {
        steps.forEach((st) => {
          st.hidden = true;
        });
      }

      toggleBtn.addEventListener('click', () => {
        const isOpen = panel.classList.contains('open');
        const allRevealed = steps.length === 0 || revealedCount >= steps.length;

        if (isOpen && allRevealed) {
          panel.classList.remove('open');
          revealedCount = 0;
          steps.forEach((st) => {
            st.hidden = true;
            st.classList.remove('revealed');
          });
        } else {
          panel.classList.add('open');
          revealedCount = steps.length;
          steps.forEach((st) => {
            st.hidden = false;
            st.classList.add('revealed');
          });
        }
        updateButtons();
      });

      if (nextStepBtn && steps.length > 0) {
        nextStepBtn.addEventListener('click', () => {
          if (revealedCount < steps.length) {
            panel.classList.add('open');
            const st = steps[revealedCount];
            st.hidden = false;
            st.classList.add('revealed');
            revealedCount += 1;
            updateButtons();
          }
        });
      }

      updateButtons();
    });
  }

  /* -------------------- KaTeX Auto-Render -------------------- */
  function renderMath(root) {
    if (typeof window.renderMathInElement !== 'function') return;
    window.renderMathInElement(root || document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      strict: false,
      trust: false
    });
  }

  /* -------------------- Reusable Canvas Plotting Toolkit -------------------- */
  const registeredCharts = [];

  function getThemeColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback;
    return {
      bg: v('--chart-bg', '#ffffff'),
      grid: v('--chart-grid', '#eceae3'),
      axis: v('--chart-axis', '#4c5560'),
      text: v('--chart-text', '#37404a'),
      primary: v('--chart-primary', '#1d4e89'),
      secondary: v('--chart-secondary', '#c95d1c'),
      success: v('--chart-success', '#1e7a52'),
      danger: v('--chart-danger', '#b83232'),
      band: v('--chart-band', 'rgba(29, 78, 137, 0.14)'),
      monoFont: v('--font-mono', 'monospace'),
      sansFont: v('--font-sans', 'sans-serif')
    };
  }

  function setupCanvas(canvas, aspectHeight) {
    const parentWidth = Math.max(280, Math.floor(canvas.parentElement ? canvas.parentElement.clientWidth : 680));
    const width = parentWidth;
    const height = aspectHeight || Math.round(Math.min(360, Math.max(230, width * 0.44)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function createMapper(width, height, xMin, xMax, yMin, yMax, pad) {
    const p = Object.assign({ left: 52, right: 22, top: 22, bottom: 38 }, pad || {});
    const plotW = Math.max(10, width - p.left - p.right);
    const plotH = Math.max(10, height - p.top - p.bottom);
    return {
      pad: p,
      plotW,
      plotH,
      xMin,
      xMax,
      yMin,
      yMax,
      toX: (x) => p.left + ((x - xMin) / (xMax - xMin)) * plotW,
      toY: (y) => p.top + ((yMax - y) / (yMax - yMin)) * plotH
    };
  }

  function drawGridAndAxes(ctx, map, colors, opts) {
    const o = Object.assign({ xTicks: 6, yTicks: 5, xLabel: '', yLabel: '', integerX: false }, opts || {});
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, map.plotW + map.pad.left + map.pad.right, map.plotH + map.pad.top + map.pad.bottom);

    /* Grid lines */
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i <= o.xTicks; i++) {
      const xv = map.xMin + (i / o.xTicks) * (map.xMax - map.xMin);
      const px = Math.round(map.toX(xv)) + 0.5;
      ctx.moveTo(px, map.pad.top);
      ctx.lineTo(px, map.pad.top + map.plotH);
    }
    for (let j = 0; j <= o.yTicks; j++) {
      const yv = map.yMin + (j / o.yTicks) * (map.yMax - map.yMin);
      const py = Math.round(map.toY(yv)) + 0.5;
      ctx.moveTo(map.pad.left, py);
      ctx.lineTo(map.pad.left + map.plotW, py);
    }
    ctx.stroke();

    /* Plot frame border */
    ctx.strokeStyle = colors.grid;
    ctx.strokeRect(map.pad.left, map.pad.top, map.plotW, map.plotH);

    /* Main axes if 0 is in view */
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (map.yMin <= 0 && map.yMax >= 0) {
      const y0 = map.toY(0);
      ctx.moveTo(map.pad.left, y0);
      ctx.lineTo(map.pad.left + map.plotW, y0);
    }
    if (map.xMin <= 0 && map.xMax >= 0) {
      const x0 = map.toX(0);
      ctx.moveTo(x0, map.pad.top);
      ctx.lineTo(x0, map.pad.top + map.plotH);
    }
    ctx.stroke();

    /* Tick labels */
    ctx.fillStyle = colors.text;
    ctx.font = `11px ${colors.monoFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= o.xTicks; i++) {
      const xv = map.xMin + (i / o.xTicks) * (map.xMax - map.xMin);
      const txt = o.integerX ? `${Math.round(xv)}` : `${Number(xv.toFixed(2))}`;
      ctx.fillText(txt, map.toX(xv), map.pad.top + map.plotH + 6);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let j = 0; j <= o.yTicks; j++) {
      const yv = map.yMin + (j / o.yTicks) * (map.yMax - map.yMin);
      const txt = Math.abs(yv) < 1e-9 ? '0' : `${Number(yv.toFixed(2))}`;
      ctx.fillText(txt, map.pad.left - 8, map.toY(yv));
    }

    if (o.xLabel) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.font = `600 11px ${colors.sansFont}`;
      ctx.fillText(o.xLabel, map.pad.left + map.plotW, map.pad.top + map.plotH + 34);
    }
    if (o.yLabel) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `600 11px ${colors.sansFont}`;
      ctx.fillText(o.yLabel, map.pad.left + 6, map.pad.top + 4);
    }
  }

  function plotCurve(ctx, map, fn, opts) {
    const o = Object.assign({ color: '#1d4e89', lineWidth: 2.2, samples: 400, dash: [] }, opts || {});
    ctx.save();
    ctx.beginPath();
    ctx.rect(map.pad.left, map.pad.top, map.plotW, map.plotH);
    ctx.clip();

    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.lineWidth;
    ctx.setLineDash(o.dash);
    ctx.beginPath();

    let started = false;
    let prevY = null;
    for (let i = 0; i <= o.samples; i++) {
      const x = map.xMin + (i / o.samples) * (map.xMax - map.xMin);
      const y = fn(x);
      if (!Number.isFinite(y)) {
        started = false;
        prevY = null;
        continue;
      }
      const px = map.toX(x);
      const py = map.toY(y);
      if (!started || (prevY !== null && Math.abs(py - prevY) > map.plotH * 0.75)) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
      prevY = py;
    }
    ctx.stroke();
    ctx.restore();
  }

  function registerChart(renderFn) {
    if (typeof renderFn !== 'function') return;
    registeredCharts.push(renderFn);
    renderFn();
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      registeredCharts.forEach((fn) => fn());
    }, 80);
  });

  window.addEventListener('calc4:themechange', () => {
    registeredCharts.forEach((fn) => fn());
  });

  window.Calc4Plot = {
    getThemeColors,
    setupCanvas,
    createMapper,
    drawGridAndAxes,
    plotCurve,
    registerChart
  };

  window.Calc4App = {
    renderMath,
    refreshProgressUI
  };

  /* -------------------- Bootstrap -------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigationUI();
    initProgressTracking();
    initSolutions();
    renderMath(document.body);
  });
})();
