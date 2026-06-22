/**
 * main.js — entry point + global state + element interaction
 */

window.GameState = {
  time: 0,
  mode: 'realtime',
  speed: 1,
  isRunning: false,
  currentTeam: 'blue',
  destroyedTowers: [],
  killedCamps: {},       // { campId: { time, team } }
  killedDragons: {},     // { dragonId: { time, team } }
  killedRedFalcon: null,
  killedSpaceSpirit: null,
  killedHpPacks: {},        // { hpPackId: { time, team } }
  selectedElement: null,
  hoveredElement: null,
  bushControl: {},
  suppressionLinks: [],  // [{ from: markerId, to: markerId }]
  carryLinks: [],        // [{ carrierId: markerId, carriedId: markerId }]  shield mountain (盾山) carry

  isT2Destroyed: function(team, lane) {
    return this.destroyedTowers.some(t => t.team === team && t.lane === lane && t.tier === 2);
  },
  isCampAlive: function(campId) {
    const entry = this.killedCamps[campId];
    if (!entry) return this.time >= 30;
    const camp = JUNGLE_CAMPS.find(c => c.id === campId);
    return camp ? (this.time - entry.time) >= camp.respawn : true;
  },
  isDragonAlive: function(dragonId) {
    const entry = this.killedDragons[dragonId];
    const dragon = DRAGON_PITS.find(d => d.id === dragonId);
    if (!dragon) return true;
    if (!entry) return this.time >= dragon.stages[0].startTime;
    return (this.time - entry.time) >= dragon.respawn;
  },
  campRespawnIn: function(campId) {
    const entry = this.killedCamps[campId];
    if (!entry) return Math.max(0, 30 - this.time);
    const camp = JUNGLE_CAMPS.find(c => c.id === campId);
    return camp ? Math.max(0, camp.respawn - (this.time - entry.time)) : 0;
  },
  dragonRespawnIn: function(dragonId) {
    const entry = this.killedDragons[dragonId];
    const dragon = DRAGON_PITS.find(d => d.id === dragonId);
    if (!dragon) return 0;
    if (!entry) return Math.max(0, dragon.stages[0].startTime - this.time);
    return Math.max(0, dragon.respawn - (this.time - entry.time));
  },
};

function initApp() {
  console.log('Honor of Kings Tactics Board init...');
  MapEngine.init();
  setupRightClick();
  MarkerEngine.init();
  HeroPanel.init();
  InfoPanel.init();
  Timeline.init();
  PathEngine.init();
  Storage.init();
  Calibrate.init();
  document.getElementById('btn-calibrate')?.addEventListener('click', () => Calibrate.toggle());
  SkillEngine.init();
  console.log('  + skills');
  InfoPanel.update(0);
  InfoPanel.updatePlacedList();
  setupKeyboardShortcuts();
  setupMobileUI();
  setupDynamicHints();
  window.addEventListener('resize', () => MapEngine.resize());
  console.log('Ready.');
}

// ===== Mobile UI handlers =====
function setupMobileUI() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // Hamburger menu → toggle left drawer
  const btnMenu = document.getElementById('btn-menu');
  btnMenu?.addEventListener('click', () => {
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    leftPanel?.classList.toggle('open');
    // Close right panel when opening left
    if (leftPanel?.classList.contains('open')) {
      rightPanel?.classList.remove('open');
    }
  });

  // Drawer handle → also toggles left panel
  const handle = document.getElementById('drawer-handle');
  handle?.addEventListener('click', () => {
    document.getElementById('left-panel')?.classList.toggle('open');
  });

  // Info panel toggle button
  const btnInfo = document.getElementById('btn-toggle-info');
  btnInfo?.addEventListener('click', () => {
    const rightPanel = document.getElementById('right-panel');
    const leftPanel = document.getElementById('left-panel');
    rightPanel?.classList.toggle('open');
    if (rightPanel?.classList.contains('open')) {
      leftPanel?.classList.remove('open');
    }
  });

  // Mobile indicator tap → open info panel
  const indicator = document.getElementById('mobile-info-indicator');
  indicator?.addEventListener('click', () => {
    document.getElementById('right-panel')?.classList.add('open');
    indicator.style.display = 'none';
  });

  // Suppress link button (mobile替代Shift+点击)
  let suppressMode = false;
  const btnSuppress = document.getElementById('btn-suppress');
  btnSuppress?.addEventListener('click', () => {
    suppressMode = !suppressMode;
    btnSuppress.classList.toggle('active', suppressMode);
    btnSuppress.textContent = suppressMode ? '🔗 连线中...' : '🔗 压制连线';
    document.getElementById('map-hint').textContent = suppressMode
      ? '🔗 点击英雄A → 再点英雄B 建立连线 | 再次点击按钮退出'
      : isMobile ? '👆 单指滑动平移 · 双指缩放 · 长按切换状态' : '🖱️ 左键拖拽平移 · 滚轮缩放 · 左键拖动英雄';
  });

  // Intercept marker selection for suppress mode
  const origBindCanvas = MarkerEngine.bindCanvasEvents;
  // We hook via a flag on MarkerEngine that mousedown handler checks
  const origMousedown = MapEngine.canvas.onmousedown;
  // Use a global flag
  window._suppressMode = function() { return suppressMode; };

  // When suppress mode is active, tap on hero A selects it, tap hero B creates link
  // This is handled by modifying the mousedown logic in markers.js
  // We set a global helper
  window._handleSuppressTap = function(markerHit) {
    if (!suppressMode) return false;
    const gs = window.GameState;
    const sel = MarkerEngine.selectedMarker;
    if (sel && sel.id !== markerHit.id) {
      const existing = gs.suppressionLinks.findIndex(
        l => l.from === sel.id && l.to === markerHit.id
      );
      if (existing >= 0) {
        gs.suppressionLinks.splice(existing, 1);
      } else {
        gs.suppressionLinks.push({ from: sel.id, to: markerHit.id });
      }
      MarkerEngine.selectedMarker = null;
    } else {
      MarkerEngine.selectedMarker = markerHit;
    }
    return true;
  };
}

// ===== Dynamic hints based on device =====
function setupDynamicHints() {
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hint = document.getElementById('map-hint');
  if (isMobile && hint) {
    hint.textContent = '👆 单指滑动平移 · 双指缩放 · 长按切换状态';
  }
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); Timeline.togglePlay(); }
    if (e.code === 'ArrowLeft' && e.target === document.body) { e.preventDefault(); document.getElementById('btn-step-back').click(); }
    if (e.code === 'ArrowRight' && e.target === document.body) { e.preventDefault(); document.getElementById('btn-step-fwd').click(); }
    if (e.code === 'KeyP' && e.target === document.body) { document.getElementById('btn-path').click(); }
    if (e.code === 'KeyR' && e.ctrlKey && e.target === document.body) { e.preventDefault(); document.getElementById('btn-reset-time').click(); }
    if (e.code === 'KeyS' && e.ctrlKey && e.target === document.body) { e.preventDefault(); Storage.saveTactics(); }
  });
}

// Right-click = tower destroy + camp/dragon kill with current team
// Moved into setupRightClick() called from initApp() to ensure canvas is ready
function setupRightClick() {
  const canvas = MapEngine.canvas;
  if (!canvas) { console.warn('setupRightClick: canvas not ready'); return; }

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mapPos = MapEngine.screenToMap(e.clientX - rect.left, e.clientY - rect.top);
    const threshold = 12 / MapEngine.view.zoom;
    const el = window.findElementAt(mapPos.x, mapPos.y, threshold);
    if (!el) return;
    const gs = window.GameState;

    if (el.type === 'tower') {
      const idx = gs.destroyedTowers.findIndex(
        t => t.team === el.data.team && t.lane === el.data.lane && t.tier === el.data.tier
      );
      if (idx >= 0) gs.destroyedTowers.splice(idx, 1);
      else gs.destroyedTowers.push({ team: el.data.team, lane: el.data.lane, tier: el.data.tier });
    }
    if (el.type === 'camp') {
      if (gs.isCampAlive(el.id)) gs.killedCamps[el.id] = { time: gs.time, team: gs.currentTeam };
      else delete gs.killedCamps[el.id];
    }
    if (el.type === 'dragon') {
      if (gs.isDragonAlive(el.id)) gs.killedDragons[el.id] = { time: gs.time, team: gs.currentTeam };
      else delete gs.killedDragons[el.id];
    }
    if (el.type === 'special') {
      if (el.data.type === 'red_falcon') {
        gs.killedRedFalcon = gs.killedRedFalcon ? null : { time: gs.time, team: gs.currentTeam };
      } else if (el.data.type === 'teleport') {
        if (!gs.killedSpaceSpirit || (gs.time - gs.killedSpaceSpirit.time) >= 60) {
          gs.killedSpaceSpirit = { time: gs.time, team: gs.currentTeam };
        }
      } else if (el.data.type === 'hp_pack') {
        const entry = gs.killedHpPacks[el.id];
        const t1Alive = !gs.destroyedTowers.some(
          t => t.team === el.data.team && t.lane === el.data.lane && t.tier === 1
        );
        if (!t1Alive) return;
        if (!entry || (gs.time - entry.time) >= 75) {
          gs.killedHpPacks[el.id] = { time: gs.time, team: gs.currentTeam };
        }
      }
    }
    if (InfoPanel) InfoPanel.update(gs.time);
  });
}

document.addEventListener('DOMContentLoaded', initApp);
