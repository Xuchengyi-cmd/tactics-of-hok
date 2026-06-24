/**
 * main.js — entry point + global state + element interaction
 */

// ===== Undo/Redo Manager =====
window.UndoManager = {
  undoStack: [],
  redoStack: [],
  maxSize: 50,
  _skipNext: false,  // set to skip snapshot after undo/redo restore

  snapshot() {
    const gs = window.GameState;
    return JSON.parse(JSON.stringify({
      time: gs.time,
      currentTeam: gs.currentTeam,
      markers: window.MarkerEngine?.markers || [],
      paths: window.PathEngine?.paths || [],
      skills: window.SkillEngine?.skills || [],
      minions: window.MinionEngine?.minions || [],
      killedCamps: gs.killedCamps,
      killedDragons: gs.killedDragons,
      killedRedFalcon: gs.killedRedFalcon,
      killedSpaceSpirit: gs.killedSpaceSpirit,
      killedHpPacks: gs.killedHpPacks,
      destroyedTowers: gs.destroyedTowers,
      bushControl: gs.bushControl,
      suppressionLinks: gs.suppressionLinks,
      carryLinks: gs.carryLinks,
      duelLinks: gs.duelLinks,
    }));
  },

  restore(snap) {
    const gs = window.GameState;
    gs.time = snap.time;
    gs.currentTeam = snap.currentTeam;
    gs.killedCamps = snap.killedCamps;
    gs.killedDragons = snap.killedDragons;
    gs.killedRedFalcon = snap.killedRedFalcon;
    gs.killedSpaceSpirit = snap.killedSpaceSpirit;
    gs.killedHpPacks = snap.killedHpPacks;
    gs.destroyedTowers = snap.destroyedTowers;
    gs.bushControl = snap.bushControl;
    gs.suppressionLinks = snap.suppressionLinks;
    gs.carryLinks = snap.carryLinks;
    gs.duelLinks = snap.duelLinks || [];
    if (window.MarkerEngine) window.MarkerEngine.markers = snap.markers.map(m => ({...m}));
    if (window.PathEngine) window.PathEngine.paths = snap.paths.map(p => ({...p, points: p.points.map(pt=>({...pt}))}));
    if (window.SkillEngine) window.SkillEngine.skills = snap.skills.map(s => ({...s}));
    if (window.MinionEngine) window.MinionEngine.minions = (snap.minions || []).map(m => ({...m}));
    if (window.MarkerEngine) window.MarkerEngine.selectedMarker = null;
    if (window.InfoPanel) { window.InfoPanel.update(gs.time); window.InfoPanel.updatePlacedList(); }
    if (window.Timeline) window.Timeline.syncUI();
  },

  push() {
    if (this._skipNext) { this._skipNext = false; return; }
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = [];
  },

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(this.snapshot());
    this._skipNext = true;
    this.restore(this.undoStack.pop());
    MapEngine.invalidateBg();
    this._toast('↩ 已撤销 (' + this.undoStack.length + '步可撤)');
  },

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(this.snapshot());
    this._skipNext = true;
    this.restore(this.redoStack.pop());
    MapEngine.invalidateBg();
    this._toast('↪ 已恢复 (' + this.undoStack.length + '步可撤)');
  },

  _toast(msg) {
    const el = document.getElementById('undo-toast');
    if (el) { el.textContent = msg; el.style.opacity = '1'; clearTimeout(el._timer); }
    else {
      const d = document.createElement('div');
      d.id = 'undo-toast';
      d.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#ffd700;padding:6px 20px;border-radius:20px;font-size:12px;z-index:999;pointer-events:none;transition:opacity 0.3s;';
      d.textContent = msg;
      document.body.appendChild(d);
    }
    const toast = document.getElementById('undo-toast');
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 1500);
  },
};

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
  carryLinks: [],        // [{ carrierId: markerId, carriedId: markerId }]
  duelLinks: [],         // [{ casterId: markerId, targetId: markerId }]  海月幻境

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
  MarkerEngine.init();
  setupRightClick();
  HeroPanel.init();
  InfoPanel.init();
  Timeline.init();
  PathEngine.init();
  MinionEngine.init();
  Storage.init();
  Calibrate.init();
  document.getElementById('btn-calibrate')?.addEventListener('click', () => Calibrate.toggle());
  document.getElementById('btn-undo')?.addEventListener('click', () => window.UndoManager.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => window.UndoManager.redo());
  SkillEngine.init();
  AiEngine.init();
  console.log('  + skills + ai');
  InfoPanel.update(0);
  InfoPanel.updatePlacedList();
  setupKeyboardShortcuts();
  window.addEventListener('resize', () => MapEngine.resize());
  console.log('Ready.');
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); Timeline.togglePlay(); }
    if (e.code === 'ArrowLeft' && e.target === document.body) { e.preventDefault(); document.getElementById('btn-step-back').click(); }
    if (e.code === 'ArrowRight' && e.target === document.body) { e.preventDefault(); document.getElementById('btn-step-fwd').click(); }
    if (e.code === 'KeyP' && e.target === document.body) { document.getElementById('btn-path').click(); }
    if (e.code === 'KeyR' && e.ctrlKey && e.target === document.body) { e.preventDefault(); document.getElementById('btn-reset-time').click(); }
    if (e.code === 'KeyS' && e.ctrlKey && e.target === document.body) { e.preventDefault(); Storage.saveTactics(); }
    if (e.code === 'KeyZ' && e.ctrlKey && !e.shiftKey && e.target === document.body) { e.preventDefault(); window.UndoManager.undo(); }
    if ((e.code === 'KeyY' && e.ctrlKey) || (e.code === 'KeyZ' && e.ctrlKey && e.shiftKey)) {
      if (e.target === document.body) { e.preventDefault(); window.UndoManager.redo(); }
    }
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

    window.UndoManager.push();
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
