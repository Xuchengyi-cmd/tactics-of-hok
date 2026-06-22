/**
 * map.js — 地图 Canvas 引擎
 */

const MapEngine = {
  canvas: null,
  ctx: null,

  view: {
    x: 0, y: 0,
    zoom: 1,
    minZoom: 0.3, maxZoom: 5,
    canvasW: 0, canvasH: 0,
  },

  mapImage: null,
  mapLoaded: false,
  mapW: 1000,
  mapH: 1000,
  COORD_SCALE: 1000,
  _bgCache: null,
  _lastView: null,
  _bgDirty: true,
  mouseX: 0, mouseY: 0,  // current mouse screen coords on canvas

  isPanning: false,
  panStart: { x: 0, y: 0 },
  viewAtPanStart: { x: 0, y: 0 },
  _pendingPan: null,
  _lastClickPos: null,     // for cycling overlapping elements
  _lastClickTime: 0,
  _lastClickIdx: 0,

  renderCallbacks: [],

  // ===== init =====
  init() {
    this.canvas = document.getElementById('map-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.loadMapImage();
    this.bindEvents();

    this.renderCallbacks = [
      () => this.drawMapBackground(),
      () => this.drawOverlayLayer(),
      () => { if (window.MarkerEngine) window.MarkerEngine.render(); },
      () => { if (window.PathEngine) window.PathEngine.render(); },
      () => { if (window.Calibrate) window.Calibrate.render(); },
      () => { if (window.SkillEngine) window.SkillEngine.render(); },
      () => this.drawAnimationLayer(),
    ];

    this.startRenderLoop();
  },

  resize() {
    const area = document.getElementById('map-area');
    const rect = area.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.view.canvasW = rect.width;
    this.view.canvasH = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  // ===== map image =====
  loadMapImage() {
    this.mapImage = new Image();
    this.mapImage.onload = () => {
      this.mapLoaded = true;
      this.mapW = this.mapImage.width;
      this.mapH = this.mapImage.height;
      console.log('Map loaded: ' + this.mapW + 'x' + this.mapH);
      this.fitMapToView();
    };
    this.mapImage.onerror = () => {
      console.log('Map not found, using procedural');
      this.mapLoaded = false;
      this.mapW = 1000; this.mapH = 1000;
      this.fitMapToView();
    };
    this.mapImage.src = 'assets/王者峡谷_顶视图（新）.png';
  },

  fitMapToView() {
    const fitZoom = Math.min(
      this.view.canvasW / this.mapW,
      this.view.canvasH / this.mapH
    ) * 0.88;
    this.view.zoom = Math.max(this.view.minZoom, Math.min(this.view.maxZoom, fitZoom));
    this.view.x = (this.mapW * this.view.zoom - this.view.canvasW) / 2;
    this.view.y = (this.mapH * this.view.zoom - this.view.canvasH) / 2;
  },

  // ===== coordinate transforms =====
  mapToScreen(mx, my) {
    const sx = this.mapW / this.COORD_SCALE;
    const sy = this.mapH / this.COORD_SCALE;
    return {
      x: mx * sx * this.view.zoom - this.view.x,
      y: my * sy * this.view.zoom - this.view.y,
    };
  },

  screenToMap(sx, sy) {
    const scx = this.mapW / this.COORD_SCALE;
    const scy = this.mapH / this.COORD_SCALE;
    return {
      x: (sx + this.view.x) / this.view.zoom / scx,
      y: (sy + this.view.y) / this.view.zoom / scy,
    };
  },

  isVisible(mx, my, margin = 50) {
    const s = this.mapToScreen(mx, my);
    return s.x >= -margin && s.x <= this.view.canvasW + margin &&
           s.y >= -margin && s.y <= this.view.canvasH + margin;
  },

  // ===== events =====
  bindEvents() {
    // scroll zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const oldZoom = this.view.zoom;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.view.zoom = Math.max(this.view.minZoom, Math.min(this.view.maxZoom, this.view.zoom * zoomFactor));
      const worldX = (mouseX + this.view.x) / oldZoom;
      const worldY = (mouseY + this.view.y) / oldZoom;
      this.view.x = worldX * this.view.zoom - mouseX;
      this.view.y = worldY * this.view.zoom - mouseY;
      document.getElementById('zoom-level').textContent = Math.round(this.view.zoom * 100) + '%';
    }, { passive: false });

    // LEFT-CLICK: interact with element OR pan on empty space
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (window.Calibrate?.active) return;
      if (window.PathEngine?.drawing) return;
      if (window.SkillEngine?.active) return;

      const rect = this.canvas.getBoundingClientRect();
      const mapPos = this.screenToMap(e.clientX - rect.left, e.clientY - rect.top);
      const gs = window.GameState;

      // Check if clicking on a map element (camp, dragon, bush, etc.)
      const threshold = 12 / this.view.zoom;
      // support cycling through overlapping elements on repeated clicks
      const now = Date.now();
      const sameSpot = this._lastClickPos &&
        Math.abs(this._lastClickPos.x - mapPos.x) < 3 &&
        Math.abs(this._lastClickPos.y - mapPos.y) < 3 &&
        (now - this._lastClickTime) < 600;

      let el = null;
      if (sameSpot && window.findAllElementsAt) {
        // cycle to next overlapping element
        const all = window.findAllElementsAt(mapPos.x, mapPos.y, threshold);
        if (all.length > 1) {
          this._lastClickIdx = (this._lastClickIdx + 1) % all.length;
          el = all[this._lastClickIdx];
        } else if (all.length === 1) {
          el = all[0];
        }
      } else {
        // fresh click: pick closest element
        el = window.findElementAt && window.findElementAt(mapPos.x, mapPos.y, threshold);
        this._lastClickIdx = 0;
      }
      this._lastClickPos = { x: mapPos.x, y: mapPos.y };
      this._lastClickTime = now;

      if (el && !window.MarkerEngine?.findMarkerAt(mapPos.x, mapPos.y, 12)) {
        if (gs) {
          switch (el.type) {
            case 'camp':
              if (gs.isCampAlive(el.id)) gs.killedCamps[el.id] = { time: gs.time, team: gs.currentTeam };
              else delete gs.killedCamps[el.id];
              break;
            case 'dragon':
              if (gs.isDragonAlive(el.id)) gs.killedDragons[el.id] = { time: gs.time, team: gs.currentTeam };
              else delete gs.killedDragons[el.id];
              break;
            case 'special':
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
                if (!t1Alive) break; // T1 destroyed, no respawn
                if (!entry || (gs.time - entry.time) >= 75) {
                  gs.killedHpPacks[el.id] = { time: gs.time, team: gs.currentTeam };
                }
              }
              break;
            case 'bush':
              const cur = gs.bushControl[el.id];
              if (!cur) gs.bushControl[el.id] = gs.currentTeam;
              else if (cur === gs.currentTeam) delete gs.bushControl[el.id];
              else gs.bushControl[el.id] = gs.currentTeam;
              break;
          }
          gs.selectedElement = el;
          if (window.InfoPanel) { window.InfoPanel.showElementDetail(el); window.InfoPanel.update(gs.time); }
        }
        return;
      }

      // Click on empty space — clear selection
      if (gs) { gs.selectedElement = null; gs.hoveredElement = null; }
      if (window.InfoPanel) window.InfoPanel.update(gs?.time || 0);

      // Click on empty space → start delayed pan
      clearTimeout(this._pendingPan);
      this._pendingPan = setTimeout(() => {
        const blocked = (window.MarkerEngine && window.MarkerEngine.isDragging) ||
                        (window.Calibrate && window.Calibrate.draggedMarker);
        if (!blocked) {
          this.isPanning = true;
          this.panStart = { x: e.clientX, y: e.clientY };
          this.viewAtPanStart = { x: this.view.x, y: this.view.y };
          this.canvas.style.cursor = 'grabbing';
        }
      }, 80);
    });

    window.addEventListener('mousemove', (e) => {
      // always track mouse position on canvas
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      // skill editing: skip hover/cursor (handled by skills render loop)
      const editing = window.SkillEngine?.editing;
      if (this.isPanning) {
        this.view.x = this.viewAtPanStart.x - (e.clientX - this.panStart.x);
        this.view.y = this.viewAtPanStart.y - (e.clientY - this.panStart.y);
        return;
      }
      if (this.mouseX < 0 || this.mouseY < 0 || this.mouseX > this.view.canvasW || this.mouseY > this.view.canvasH) return;
      const sx = this.mouseX, sy = this.mouseY;
      const mapPos = this.screenToMap(sx, sy);

      // hover detection (skip during skill edit/drag)
      if (!editing && !window.Calibrate?.active && !window.MarkerEngine?.isDragging) {
        const gs = window.GameState;
        const threshold = 8 / this.view.zoom;
        const el = window.findElementAt(mapPos.x, mapPos.y, threshold);
        if (gs) gs.hoveredElement = el;
        if (!window.SkillEngine?.active) {
          this.canvas.style.cursor = el ? 'pointer' : (window.PathEngine?.drawing ? 'crosshair' : 'grab');
        }
      }

      document.getElementById('map-hint').textContent =
        '(' + Math.round(mapPos.x) + ',' + Math.round(mapPos.y) + ') | Left-drag pan | Scroll zoom';
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        clearTimeout(this._pendingPan);
        this.isPanning = false;
        if (this.canvas) this.canvas.style.cursor = 'default';
      }
    });

    // ===== TOUCH EVENTS (mobile) =====
    this._touchId = null;       // current tracking touch identifier
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this._touchMoved = false;
    this._longPressTimer = null;
    this.LONG_PRESS_MS = 600;

    // Pinch state
    this._pinchDist0 = 0;
    this._pinchZoom0 = 1;
    this._pinchMidX = 0;
    this._pinchMidY = 0;

    canvas.addEventListener('touchstart', (e) => {
      if (window.Calibrate?.active) return;

      if (e.touches.length === 1) {
        // Single finger
        e.preventDefault();
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        this._touchId = t.identifier;
        this._touchStartX = t.clientX;
        this._touchStartY = t.clientY;
        this._touchStartTime = Date.now();
        this._touchMoved = false;
        this.mouseX = t.clientX - rect.left;
        this.mouseY = t.clientY - rect.top;

        // Long-press timer for right-click simulation
        clearTimeout(this._longPressTimer);
        const mapPos = this.screenToMap(this.mouseX, this.mouseY);
        const threshold = 16 / this.view.zoom;
        const el = window.findElementAt && window.findElementAt(mapPos.x, mapPos.y, threshold);
        const hitMarker = window.MarkerEngine?.findMarkerAt(mapPos.x, mapPos.y, 14);

        this._longPressTimer = setTimeout(() => {
          if (!this._touchMoved) {
            // Long press on marker → context menu
            if (hitMarker && window.MarkerEngine) {
              window.MarkerEngine.showHeroContextMenu(hitMarker, t.clientX, t.clientY);
            }
            // Long press on map element → toggle (tower/camp/dragon)
            else if (el) {
              this._triggerElementToggle(el);
            }
            if (navigator.vibrate) navigator.vibrate(15);
          }
        }, this.LONG_PRESS_MS);
      }
      else if (e.touches.length === 2) {
        // Two fingers → cancel single-finger logic, init pinch
        clearTimeout(this._pendingPan);
        clearTimeout(this._longPressTimer);
        this.isPanning = false;
        const t0 = e.touches[0], t1 = e.touches[1];
        this._pinchDist0 = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        this._pinchZoom0 = this.view.zoom;
        this._pinchMidX = (t0.clientX + t1.clientX) / 2;
        this._pinchMidY = (t0.clientY + t1.clientY) / 2;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        // Pinch zoom
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const scale = dist / this._pinchDist0;
        const newZoom = Math.max(this.view.minZoom, Math.min(this.view.maxZoom, this._pinchZoom0 * scale));
        const rect = canvas.getBoundingClientRect();
        const mx = this._pinchMidX - rect.left;
        const my = this._pinchMidY - rect.top;
        const wx = (mx + this.view.x) / this.view.zoom;
        const wy = (my + this.view.y) / this.view.zoom;
        this.view.zoom = newZoom;
        this.view.x = wx * newZoom - mx;
        this.view.y = wy * newZoom - my;
        document.getElementById('zoom-level').textContent = Math.round(this.view.zoom * 100) + '%';
        return;
      }
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.identifier !== this._touchId) return;
      const dx = t.clientX - this._touchStartX;
      const dy = t.clientY - this._touchStartY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this._touchMoved = true;
        clearTimeout(this._longPressTimer);
        clearTimeout(this._pendingPan);
      }
      const rect = canvas.getBoundingClientRect();
      this.mouseX = t.clientX - rect.left;
      this.mouseY = t.clientY - rect.top;

      if (this.isPanning) {
        this.view.x = this.viewAtPanStart.x - (t.clientX - this.panStart.x);
        this.view.y = this.viewAtPanStart.y - (t.clientY - this.panStart.y);
        return;
      }
      if (this._touchMoved) {
        this.isPanning = true;
        this.panStart = { x: this._touchStartX, y: this._touchStartY };
        this.viewAtPanStart = { x: this.view.x, y: this.view.y };
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      clearTimeout(this._longPressTimer);
      clearTimeout(this._pendingPan);

      // Check if tracked touch ended
      let trackedEnded = true;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this._touchId) { trackedEnded = false; break; }
      }
      if (!trackedEnded && e.touches.length > 0) return;

      if (!this._touchMoved) {
        // Tap: simulate left-click on element
        const mapPos = this.screenToMap(this.mouseX, this.mouseY);
        const threshold = 16 / this.view.zoom;
        const el = window.findElementAt && window.findElementAt(mapPos.x, mapPos.y, threshold);
        const gs = window.GameState;

        // Tap on map element
        if (el && !window.MarkerEngine?.findMarkerAt(mapPos.x, mapPos.y, 14)) {
          this._triggerElementToggle(el);
          // Don't return — also update info panel
        }
        // Tap on empty → clear selection
        else if (!el) {
          if (gs) { gs.selectedElement = null; gs.hoveredElement = null; }
        }
        if (window.InfoPanel) window.InfoPanel.update(gs?.time || 0);
      }

      this.isPanning = false;
      this._touchId = null;
    });

    // Prevent double-tap zoom on canvas
    canvas.addEventListener('dblclick', (e) => {
      // Only allow on desktop (touch devices won't fire this)
    });

    // resize
    window.addEventListener('resize', () => { this.resize(); });
  },

  // Helper: toggle map element (used by both mouse click and touch tap/long-press)
  _triggerElementToggle(el) {
    const gs = window.GameState;
    if (!gs) return;
    switch (el.type) {
      case 'camp':
        if (gs.isCampAlive(el.id)) gs.killedCamps[el.id] = { time: gs.time, team: gs.currentTeam };
        else delete gs.killedCamps[el.id];
        break;
      case 'dragon':
        if (gs.isDragonAlive(el.id)) gs.killedDragons[el.id] = { time: gs.time, team: gs.currentTeam };
        else delete gs.killedDragons[el.id];
        break;
      case 'tower':
        const idx = gs.destroyedTowers.findIndex(
          t => t.team === el.data.team && t.lane === el.data.lane && t.tier === el.data.tier
        );
        if (idx >= 0) gs.destroyedTowers.splice(idx, 1);
        else gs.destroyedTowers.push({ team: el.data.team, lane: el.data.lane, tier: el.data.tier });
        break;
      case 'special':
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
          if (!t1Alive) break;
          if (!entry || (gs.time - entry.time) >= 75) {
            gs.killedHpPacks[el.id] = { time: gs.time, team: gs.currentTeam };
          }
        }
        break;
      case 'bush':
        const cur = gs.bushControl[el.id];
        if (!cur) gs.bushControl[el.id] = gs.currentTeam;
        else if (cur === gs.currentTeam) delete gs.bushControl[el.id];
        else gs.bushControl[el.id] = gs.currentTeam;
        break;
    }
    gs.selectedElement = el;
    if (window.InfoPanel) { window.InfoPanel.showElementDetail(el); window.InfoPanel.update(gs.time); }
  },

  // ===== render loop =====
  startRenderLoop() {
    const loop = () => { this.render(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },

  invalidateBg() { this._bgDirty = true; },

  render() {
    const ctx = this.ctx;
    const viewKey = this.view.zoom.toFixed(3) + '_' + Math.round(this.view.x) + '_' + Math.round(this.view.y);
    const viewChanged = this._lastView !== viewKey;

    if (viewChanged || this._bgDirty || !this._bgCache) {
      // redraw background layers to offscreen cache
      if (!this._bgCache || this._bgCache.width !== this.view.canvasW || this._bgCache.height !== this.view.canvasH) {
        this._bgCache = document.createElement('canvas');
        this._bgCache.width = this.view.canvasW;
        this._bgCache.height = this.view.canvasH;
      }
      const bctx = this._bgCache.getContext('2d');
      // clear
      bctx.clearRect(0, 0, this.view.canvasW, this.view.canvasH);
      // draw background + static overlays
      const origCtx = this.ctx;
      this.ctx = bctx;
      this.drawMapBackground();
      this.drawMinionPaths();
      this.drawBushes();
      this.drawTowers();
      this.drawJungleCamps();
      this.drawDragonPits();
      this.drawSpecialPoints();
      this.ctx = origCtx;
      this._lastView = viewKey;
      this._bgDirty = false;
    }

    // composite: cached background + dynamic layers
    ctx.clearRect(0, 0, this.view.canvasW, this.view.canvasH);
    ctx.drawImage(this._bgCache, 0, 0);
    // dynamic layers on top
    if (window.MarkerEngine) window.MarkerEngine.render();
    if (window.PathEngine) window.PathEngine.render();
    if (window.Calibrate) window.Calibrate.render();
    if (window.SkillEngine) window.SkillEngine.render();
    this.drawAnimationLayer();
  },

  // ===== Layer 1: background =====
  drawMapBackground() {
    const ctx = this.ctx;
    if (this.mapLoaded) {
      ctx.drawImage(this.mapImage, -this.view.x, -this.view.y,
        this.mapW * this.view.zoom, this.mapH * this.view.zoom);
    } else {
      this.drawProceduralMap(ctx);
    }
  },

  drawProceduralMap(ctx) {
    const z = this.view.zoom, ox = -this.view.x, oy = -this.view.y;
    const mw = 1000 * z, mh = 1000 * z;
    ctx.fillStyle = '#1a3a1a'; ctx.fillRect(ox, oy, mw, mh);
    // blue half
    ctx.fillStyle = 'rgba(30,80,180,0.15)';
    ctx.beginPath(); ctx.moveTo(ox, oy+mh); ctx.lineTo(ox+500*z, oy+300*z);
    ctx.lineTo(ox+500*z, oy+700*z); ctx.lineTo(ox, oy+mh); ctx.fill();
    // red half
    ctx.fillStyle = 'rgba(200,40,40,0.15)';
    ctx.beginPath(); ctx.moveTo(ox+mw, oy); ctx.lineTo(ox+500*z, oy+300*z);
    ctx.lineTo(ox+500*z, oy+700*z); ctx.lineTo(ox+mw, oy); ctx.fill();
    // river
    ctx.fillStyle = 'rgba(30,144,255,0.25)';
    ctx.beginPath(); ctx.moveTo(ox+400*z, oy+250*z); ctx.lineTo(ox+650*z, oy+250*z);
    ctx.lineTo(ox+650*z, oy+750*z); ctx.lineTo(ox+400*z, oy+750*z); ctx.closePath(); ctx.fill();
    // river lines
    ctx.strokeStyle = 'rgba(100,180,255,0.4)'; ctx.lineWidth = 1;
    ctx.setLineDash([8,8]); ctx.beginPath();
    ctx.moveTo(ox+400*z, oy+250*z); ctx.lineTo(ox+650*z, oy+750*z); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox+400*z, oy+750*z); ctx.lineTo(ox+650*z, oy+250*z); ctx.stroke();
    ctx.setLineDash([]);
    // bases
    ctx.strokeStyle = 'rgba(30,144,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox+80*z, oy+880*z, 60*z, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(30,144,255,0.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(233,69,96,0.5)';
    ctx.beginPath(); ctx.arc(ox+920*z, oy+120*z, 60*z, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(233,69,96,0.1)'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = Math.round(14*z) + 'px "Microsoft YaHei"';
    ctx.textAlign = 'center'; ctx.fillText('Blue Base', ox+80*z, oy+880*z);
    ctx.fillText('Red Base', ox+920*z, oy+120*z);
  },

  // ===== Layer 2: overlays =====
  drawOverlayLayer() {
    this.drawMinionPaths();
    this.drawBushes();
    this.drawTowers();
    this.drawJungleCamps();
    this.drawDragonPits();
    this.drawSpecialPoints();
  },

  drawMinionPaths() {
    const ctx = this.ctx;
    for (const path of MINION_PATHS) {
      ctx.save();
      ctx.strokeStyle = path.lane === 'clash' ? 'rgba(255,150,150,0.5)' :
                        path.lane === 'mid' ? 'rgba(255,255,150,0.5)' :
                        'rgba(150,200,255,0.5)';
      ctx.lineWidth = 1.5; ctx.setLineDash([6,4]); ctx.beginPath();
      for (let i = 0; i < path.points.length; i++) {
        const s = this.mapToScreen(path.points[i].x, path.points[i].y);
        i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (path.points.length > 2) {
        const mid = path.points[Math.floor(path.points.length / 2)];
        const sm = this.mapToScreen(mid.x, mid.y);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '10px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(path.lane === 'clash' ? 'Duel' : path.lane === 'mid' ? 'Mid' : 'Farm', sm.x, sm.y - 8);
      }
      ctx.restore();
    }
  },

  drawBushes() {
    const ctx = this.ctx;
    const gs = window.GameState;
    for (const bush of BUSH_ZONES) {
      const s = this.mapToScreen(bush.x, bush.y);
      const w = bush.w * this.view.zoom, h = bush.h * this.view.zoom;
      const control = gs?.bushControl ? gs.bushControl[bush.id] : null;

      // tint based on control, then team, then neutral green
      let tint, strokeTint, dotTint;
      if (control === 'blue') {
        tint = 'rgba(30,80,200,0.5)'; strokeTint = 'rgba(80,150,255,0.8)'; dotTint = 'rgba(100,180,255,0.3)';
      } else if (control === 'red') {
        tint = 'rgba(200,30,40,0.5)'; strokeTint = 'rgba(255,80,80,0.8)'; dotTint = 'rgba(255,100,100,0.3)';
      } else if (bush.team === 'blue') {
        tint = 'rgba(34,100,200,0.35)'; strokeTint = 'rgba(100,160,255,0.5)'; dotTint = 'rgba(80,150,255,0.2)';
      } else if (bush.team === 'red') {
        tint = 'rgba(200,40,40,0.35)'; strokeTint = 'rgba(255,100,100,0.5)'; dotTint = 'rgba(255,80,80,0.2)';
      } else {
        tint = 'rgba(34,139,34,0.50)'; strokeTint = 'rgba(144,238,144,0.5)'; dotTint = 'rgba(50,200,50,0.25)';
      }

      ctx.fillStyle = tint; ctx.fillRect(s.x, s.y, w, h);
      ctx.strokeStyle = strokeTint;
      ctx.lineWidth = control ? 2 : 1;
      ctx.setLineDash(control ? [] : [3,3]);
      ctx.strokeRect(s.x, s.y, w, h); ctx.setLineDash([]);

      // dots
      const seed = bush.id.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
      ctx.fillStyle = dotTint;
      const dotCount = Math.floor(w * h / 400);
      for (let i = 0; i < dotCount; i++) {
        const dx = s.x + ((seed * (i+1) * 137.5) % 1) * w;
        const dy = s.y + ((seed * (i+1) * 271.8) % 1) * h;
        ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI*2); ctx.fill();
      }

      // control icon
      if (control && this.view.zoom > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.font = Math.round(10*Math.min(this.view.zoom,1.3)) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(control === 'blue' ? '👁️' : '👁️', s.x + w/2, s.y + h/2);
      }
    }
  },

  drawTowers() {
    const ctx = this.ctx;
    const gs = window.GameState;
    const gameTime = gs ? gs.time : 0;
    const shieldActive = gameTime < 240;
    const destroyedSet = new Set(
      (gs?.destroyedTowers || []).map(t => t.team + '_' + t.lane + '_' + t.tier)
    );
    for (const tower of TOWERS) {
      const s = this.mapToScreen(tower.x, tower.y);
      if (!this.isVisible(tower.x, tower.y, 30)) continue;
      const baseR = 10;
      const size = baseR * Math.min(this.view.zoom, 2.2);
      const isDestroyed = destroyedSet.has(tower.team + '_' + tower.lane + '_' + tower.tier);
      const hovered = gs?.hoveredElement?.id === tower.id;

      if (hovered && !isDestroyed) {
        ctx.fillStyle = 'rgba(255,255,200,0.3)'; ctx.beginPath();
        ctx.arc(s.x, s.y, size+8, 0, Math.PI*2); ctx.fill();
      }
      if (isDestroyed) {
        ctx.fillStyle = 'rgba(80,80,80,0.4)'; ctx.beginPath();
        ctx.arc(s.x, s.y, size+4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,120,120,0.6)'; ctx.lineWidth = 1;
        ctx.setLineDash([3,3]); ctx.beginPath();
        ctx.arc(s.x, s.y, size+3, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,80,80,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(s.x-size*0.5, s.y-size*0.5); ctx.lineTo(s.x+size*0.5, s.y+size*0.5);
        ctx.moveTo(s.x+size*0.5, s.y-size*0.5); ctx.lineTo(s.x-size*0.5, s.y+size*0.5);
        ctx.stroke(); continue;
      }
      ctx.fillStyle = tower.team === 'blue' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)';
      ctx.beginPath(); ctx.arc(s.x, s.y, size+4, 0, Math.PI*2); ctx.fill();
      if (shieldActive) {
        ctx.strokeStyle = 'rgba(255,215,0,0.6)'; ctx.lineWidth = 2;
        ctx.setLineDash([3,2]); ctx.beginPath();
        ctx.arc(s.x, s.y, size+7, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = tower.team === 'blue' ? '#3b82f6' : '#ef4444';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
      const pts = [{x:s.x,y:s.y-size},{x:s.x+size*0.6,y:s.y},{x:s.x,y:s.y+size},{x:s.x-size*0.6,y:s.y}];
      ctx.moveTo(pts[0].x, pts[0].y); for (let i=1;i<4;i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (this.view.zoom > 0.5) {
        ctx.fillStyle = '#fff'; ctx.font = Math.round(9*Math.min(this.view.zoom,1.5)) + 'px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(['','1','2','H'][tower.tier], s.x, s.y-size-6);
      }
    }
  },

  drawJungleCamps() {
    const ctx = this.ctx;
    const gs = window.GameState;
    const iconMap = { blue:'蓝', red:'红', cheetah:'豹', lizard:'蜥', red_armor:'甲',
                      mountain_boar:'豪', mountain_monkey:'猕', fierce_pheasant:'雉' };
    for (const camp of JUNGLE_CAMPS) {
      const s = this.mapToScreen(camp.x, camp.y);
      if (!this.isVisible(camp.x, camp.y, 30)) continue;
      const isBuff = camp.type === 'buff';
      const baseR = 11; // 基础半径大幅增大
      const radius = baseR * Math.min(this.view.zoom, 2.2);
      const alive = gs ? gs.isCampAlive(camp.id) : true;

      // hover glow
      const hovered = gs?.hoveredElement?.id === camp.id;
      if (hovered && alive) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath();
        ctx.arc(s.x, s.y, radius+6, 0, Math.PI*2); ctx.fill();
      }

      if (!alive) {
        const entry = gs.killedCamps[camp.id];
        const secTeam = entry ? entry.team : null;
        const secColor = secTeam === 'red' ? 'rgba(200,50,50,0.5)' : 'rgba(50,100,200,0.5)';
        ctx.fillStyle = secColor; ctx.beginPath();
        ctx.arc(s.x, s.y, radius+2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = secTeam === 'red' ? 'rgba(255,100,100,0.7)' : 'rgba(100,150,255,0.7)';
        ctx.lineWidth = 2; ctx.setLineDash([3,3]); ctx.beginPath();
        ctx.arc(s.x, s.y, radius+3, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        const remain = gs.campRespawnIn(camp.id);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(10*Math.min(this.view.zoom,1.5)) + 'px "Microsoft YaHei"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(remain)+'s', s.x, s.y);
        continue;
      }

      const baseColor = camp.subType === 'blue' ? 'rgba(30,144,255,0.6)' :
                        camp.subType === 'red' ? 'rgba(233,69,96,0.6)' :
                        'rgba(180,160,130,0.5)';
      ctx.fillStyle = baseColor; ctx.beginPath();
      ctx.arc(s.x, s.y, isBuff ? radius+4 : radius, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

      // text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(13*Math.min(this.view.zoom,1.8)) + 'px "Microsoft YaHei"';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(iconMap[camp.subType] || '?', s.x, s.y);

      // selected
      if (gs?.selectedElement?.id === camp.id) {
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, radius+7, 0, Math.PI*2); ctx.stroke();
      }
    }
  },

  drawDragonPits() {
    const ctx = this.ctx;
    const gs = window.GameState;
    const gameTime = gs ? gs.time : 0;
    for (const pit of DRAGON_PITS) {
      const s = this.mapToScreen(pit.x, pit.y);
      if (!this.isVisible(pit.x, pit.y, 40)) continue;
      const baseR = 14;
      const size = baseR * Math.min(this.view.zoom, 2.2);
      const hovered = gs?.hoveredElement?.id === pit.id;

      if (hovered) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath();
        ctx.arc(s.x, s.y, size+10, 0, Math.PI*2); ctx.fill();
      }
      const alive = gs ? gs.isDragonAlive(pit.id) : true;

      // background
      ctx.fillStyle = alive ? 'rgba(0,0,0,0.4)' : 'rgba(40,0,0,0.5)';
      ctx.beginPath(); ctx.arc(s.x, s.y, size+6, 0, Math.PI*2); ctx.fill();

      if (!alive) {
        const entry = gs.killedDragons[pit.id];
        const secTeam = entry ? entry.team : null;
        const secColor = secTeam === 'red' ? 'rgba(200,50,50,0.5)' : 'rgba(50,100,200,0.5)';
        ctx.fillStyle = secColor; ctx.beginPath();
        ctx.arc(s.x, s.y, size+4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = secTeam === 'red' ? 'rgba(255,100,100,0.7)' : 'rgba(100,150,255,0.7)';
        ctx.lineWidth = 2; ctx.setLineDash([3,3]); ctx.beginPath();
        ctx.arc(s.x, s.y, size+5, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        const remain = gs.dragonRespawnIn(pit.id);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(11*Math.min(this.view.zoom,1.5)) + 'px "Microsoft YaHei"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(remain)+'s', s.x, s.y);
        if (this.view.zoom > 0.4) {
          ctx.fillStyle = secTeam === 'red' ? '#ffaaaa' : '#aaaaff';
          ctx.font = Math.round(9*Math.min(this.view.zoom,1)) + 'px "Microsoft YaHei"';
          ctx.fillText((secTeam==='red'?'红':'蓝')+'方击杀', s.x, s.y+size+10);
        }
        continue;
      }

      ctx.strokeStyle = pit.type === 'storm' ? 'rgba(255,20,147,0.8)' :
                        pit.type === 'tyrant' ? 'rgba(255,69,0,0.8)' :
                        'rgba(255,165,0,0.8)';
      ctx.lineWidth = 2; ctx.stroke();

      let currentStage = pit.stages[0];
      for (const stage of pit.stages) { if (gameTime >= stage.startTime) currentStage = stage; }

      // dragon icon text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(11*Math.min(this.view.zoom,1.8)) + 'px "Microsoft YaHei"';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const labels = { storm:'龙王', tyrant:'暴君', overlord:'主宰' };
      ctx.fillText(labels[pit.type] || pit.type, s.x, s.y);

      if (this.view.zoom > 0.4) {
        ctx.fillStyle = '#fff'; ctx.font = Math.round(9*Math.min(this.view.zoom,1.2)) + 'px "Microsoft YaHei"';
        ctx.fillText(currentStage.name, s.x, s.y+size+10);
      }

      // selected highlight
      if (gs?.selectedElement?.id === pit.id) {
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
        ctx.setLineDash([4,2]); ctx.beginPath();
        ctx.arc(s.x, s.y, size+10, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  },

  drawSpecialPoints() {
    const ctx = this.ctx;
    const gs = window.GameState;
    const gameTime = gs ? gs.time : 0;
    for (const sp of SPECIAL_POINTS) {
      if (sp.firstAppear && gameTime < sp.firstAppear) continue;
      if (sp.disappear && gameTime >= sp.disappear) continue;
      if (sp.type === 'vision_spirit' && sp.requiresT2Destroyed) {
        if (!gs || !gs.isT2Destroyed || !gs.isT2Destroyed(sp.team, sp.lane)) continue;
      }
      const s = this.mapToScreen(sp.x, sp.y);
      if (!this.isVisible(sp.x, sp.y, 20)) continue;
      const size = 6 * Math.min(this.view.zoom, 1.6);

      // check killed state with team
      let killed = false, respawnIn = 0, killTeam = null;
      if (sp.type === 'red_falcon' && gs?.killedRedFalcon) {
        killed = true; killTeam = gs.killedRedFalcon.team;
      }
      if (sp.type === 'teleport' && gs?.killedSpaceSpirit && gameTime < 240) {
        const elapsed = gameTime - gs.killedSpaceSpirit.time;
        if (elapsed < 60) { killed = true; respawnIn = 60 - elapsed; killTeam = gs.killedSpaceSpirit.team; }
      }
      if (sp.type === 'hp_pack' && gs?.killedHpPacks?.[sp.id]) {
        const entry = gs.killedHpPacks[sp.id];
        const t1Alive = !gs.destroyedTowers.some(
          t => t.team === sp.team && t.lane === sp.lane && t.tier === 1
        );
        const elapsed = gameTime - entry.time;
        if (t1Alive && elapsed < 75) { killed = true; respawnIn = 75 - elapsed; killTeam = entry.team; }
        else if (!t1Alive && elapsed < 75) { killed = true; respawnIn = -1; killTeam = entry.team; }
      }

      if (killed) {
        const tc = killTeam === 'red' ? 'rgba(200,50,50,0.5)' : 'rgba(50,100,200,0.5)';
        ctx.fillStyle = tc; ctx.beginPath();
        ctx.arc(s.x, s.y, size+2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(9*Math.min(this.view.zoom,1.3)) + 'px "Microsoft YaHei"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(respawnIn > 0 ? Math.ceil(respawnIn)+'s' : (respawnIn === -1 ? '🚫' : 'X'), s.x, s.y);
        continue;
      }

      let color, icon, label;
      switch (sp.type) {
        case 'teleport': color='rgba(255,105,180,0.7)'; icon='🌸'; label='传送阵'; break;
        case 'red_falcon': color='rgba(220,50,50,0.7)'; icon='🦅'; label='红隼'; break;
        case 'hp_pack': color='rgba(0,255,127,0.7)'; icon='💊'; label='血包'; break;
        case 'vision_spirit': color='rgba(138,43,226,0.7)'; icon='👁️'; label='视野'; break;
      }
      ctx.fillStyle = color; ctx.beginPath();
      ctx.arc(s.x, s.y, size+2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = Math.round(10*Math.min(this.view.zoom,1.5)) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, s.x, s.y);
      if (this.view.zoom > 0.5) {
        ctx.fillStyle = '#fff'; ctx.font = Math.round(8*Math.min(this.view.zoom,1)) + 'px "Microsoft YaHei"';
        ctx.fillText(label, s.x, s.y+size+8);
      }
    }
  },

  drawAnimationLayer() {},
};

// zoom buttons
document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
  MapEngine.view.zoom = Math.min(MapEngine.view.maxZoom, MapEngine.view.zoom * 1.25);
  document.getElementById('zoom-level').textContent = Math.round(MapEngine.view.zoom * 100) + '%';
});
document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
  MapEngine.view.zoom = Math.max(MapEngine.view.minZoom, MapEngine.view.zoom * 0.8);
  document.getElementById('zoom-level').textContent = Math.round(MapEngine.view.zoom * 100) + '%';
});
document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
  MapEngine.fitMapToView();
  document.getElementById('zoom-level').textContent = Math.round(MapEngine.view.zoom * 100) + '%';
});

window.MapEngine = MapEngine;
