/**
 * minion.js — 兵线部署引擎
 * Drag-and-drop minion deployment (like hero placement)
 */

const MinionEngine = {
  minions: [],
  draggedType: null,
  isDragging: false,
  dragTarget: null,
  dragOffset: {x:0, y:0},

  init() {
    this.createPanel();
    this.bindEvents();
  },

  createPanel() {
    const tools = document.getElementById('tools-section');

    // Section header
    const sec = document.createElement('section');
    sec.id = 'minion-section';
    sec.innerHTML = '<h3>⚔️ 兵线部署</h3>';
    tools.parentNode.insertBefore(sec, tools.nextSibling);

    // Minion type palette (draggable icons, like hero list)
    const palette = document.createElement('div');
    palette.id = 'minion-palette';
    palette.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;';

    const types = window.MINION_TYPES || [];
    types.forEach(t => {
      const el = document.createElement('div');
      el.className = 'hero-icon';
      el.draggable = true;
      el.dataset.type = t.id;
      el.title = t.name + (t.desc ? '\n' + t.desc : '');
      el.style.cssText = 'width:38px;height:38px;border-radius:50%;background:var(--bg-elevated);border:2px solid ' + t.color + ';cursor:grab;display:flex;align-items:center;justify-content:center;font-size:16px;transition:0.15s;user-select:none;';
      el.innerHTML = '<span>' + t.icon + '</span>';
      el.addEventListener('dragstart', (e) => {
        this.draggedType = t;
        e.dataTransfer.setData('text/plain', t.id);
        e.dataTransfer.effectAllowed = 'copy';
        el.style.opacity = '0.5';
      });
      el.addEventListener('dragend', () => {
        this.draggedType = null;
        el.style.opacity = '1';
      });
      palette.appendChild(el);
    });
    sec.appendChild(palette);

    // Quick wave buttons
    const quickRow = document.createElement('div');
    quickRow.style.cssText = 'display:flex;gap:3px;';
    ['clash','mid','farm'].forEach(lane => {
      const names = {clash:'对抗路',mid:'中路',farm:'发育路'};
      const b = document.createElement('button');
      b.textContent = '🌊 ' + names[lane];
      b.style.cssText = 'flex:1;padding:4px 2px;font-size:10px;background:var(--bg-elevated);border:1px solid var(--border-default);color:var(--text-secondary);border-radius:4px;cursor:pointer;';
      b.addEventListener('click', () => this.addQuickWave(lane));
      quickRow.appendChild(b);
    });
    sec.appendChild(quickRow);

    // Clear button
    const clr = document.createElement('button');
    clr.textContent = '🗑️ 清除全部兵线';
    clr.style.cssText = 'width:100%;margin-top:4px;padding:4px;font-size:10px;background:#1e2740;border:1px solid #2a3350;color:#e94560;border-radius:3px;cursor:pointer;';
    clr.addEventListener('click', () => { window.UndoManager?.push(); this.minions = []; });
    sec.appendChild(clr);
  },

  bindEvents() {
    // Canvas accepts minion drops
    const canvas = document.getElementById('map-canvas');
    canvas?.addEventListener('dragover', (e) => {
      if (!this.draggedType) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvas?.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this.draggedType) return;
      const rect = canvas.getBoundingClientRect();
      const mapPos = MapEngine.screenToMap(e.clientX - rect.left, e.clientY - rect.top);

      // Snap to nearest point on path LINE (not just waypoints)
      let bestPath = null, bestDist = Infinity, bestPt = null;
      for (const path of MINION_PATHS) {
        for (let i = 1; i < path.points.length; i++) {
          const a = path.points[i - 1], b = path.points[i];
          const abx = b.x - a.x, aby = b.y - a.y;
          const apx = mapPos.x - a.x, apy = mapPos.y - a.y;
          let t = (apx * abx + apy * aby) / (abx * abx + aby * aby);
          t = Math.max(0, Math.min(1, t));
          const cx = a.x + t * abx, cy = a.y + t * aby;
          const d = Math.hypot(cx - mapPos.x, cy - mapPos.y);
          if (d < bestDist) { bestDist = d; bestPath = path; bestPt = {x: cx, y: cy}; }
        }
      }
      if (!bestPath || bestDist > 60) return;

      window.UndoManager?.push();
      const t = this.draggedType;
      const team = window.GameState?.currentTeam || 'blue';

      // 大主宰先锋：清除该路敌方兵线
      if (t.id === 'overlord_enhanced') {
        const enemyTeam = team === 'blue' ? 'red' : 'blue';
        this.minions = this.minions.filter(m =>
          !(m.lane === bestPath.lane && m.team === enemyTeam)
        );
      }

      this.minions.push({
        id: 'mn_' + Date.now(),
        type: t.id,
        x: bestPt.x, y: bestPt.y,
        team: team, lane: bestPath.lane,
        icon: t.icon, color: t.color, size: t.size,
      });
      this.draggedType = null;
    });

    // Drag already-placed minions
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (window.Calibrate?.active || window.SkillEngine?.active || window.PathEngine?.drawing) return;
      if (window.MarkerEngine?.isDragging || MapEngine.isPanning) return;
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
      const hit = this.findMinionAt(mapPos.x, mapPos.y);
      if (hit) {
        // Prevent map pan from kicking in
        clearTimeout(MapEngine._pendingPan);
        MapEngine.isPanning = false;
        this.isDragging = true;
        this.dragTarget = hit;
        this.dragOffset = { x: hit.x - mapPos.x, y: hit.y - mapPos.y };
        e.stopPropagation();
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', () => {
      if (!this.isDragging || !this.dragTarget) return;
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
      // Follow mouse freely during drag, snap to path on release
      this.dragTarget.x = mapPos.x + this.dragOffset.x;
      this.dragTarget.y = mapPos.y + this.dragOffset.y;
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging && this.dragTarget) {
        // Snap to nearest path line on release
        let bestDist = Infinity, bx = this.dragTarget.x, by = this.dragTarget.y;
        for (const path of MINION_PATHS) {
          for (let i = 1; i < path.points.length; i++) {
            const a = path.points[i-1], b = path.points[i];
            const abx = b.x-a.x, aby = b.y-a.y;
            const apx = this.dragTarget.x-a.x, apy = this.dragTarget.y-a.y;
            let t = (apx*abx+apy*aby)/(abx*abx+aby*aby);
            t = Math.max(0, Math.min(1, t));
            const cx = a.x+t*abx, cy = a.y+t*aby;
            const d = Math.hypot(cx-this.dragTarget.x, cy-this.dragTarget.y);
            if (d < bestDist) { bestDist = d; bx = cx; by = cy; this.dragTarget.lane = path.lane; }
          }
        }
        if (bestDist < 50) { this.dragTarget.x = bx; this.dragTarget.y = by; }
        window.UndoManager?.push();
        this.isDragging = false;
        this.dragTarget = null;
      }
    });

    // Right-click to delete minion
    canvas.addEventListener('contextmenu', (e) => {
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
      const hit = this.findMinionAt(mapPos.x, mapPos.y);
      if (hit) {
        e.preventDefault(); e.stopPropagation();
        window.UndoManager?.push();
        this.minions = this.minions.filter(m => m.id !== hit.id);
      }
    });
  },

  findMinionAt(mx, my, threshold = 18) {
    const t = threshold / MapEngine.view.zoom;
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      if (Math.hypot(m.x - mx, m.y - my) < t) return m;
    }
    return null;
  },

  addQuickWave(lane) {
    window.UndoManager?.push();
    const team = window.GameState?.currentTeam || 'blue';
    const time = window.GameState?.time || 0;
    const types = window.MINION_TYPES || [];

    let comp = [];
    let enhancedLane = null;

    if (time >= 1200) {
      comp = [{id:'storm', n:3}];
    } else if (time >= 600) {
      enhancedLane = lane;
    } else {
      const hasOverlord = window.GameState?.killedDragons?.overlord_pit;
      if (hasOverlord && time >= 120) {
        comp = [{id:'overlord', n:2}];
      } else if (time >= 240) {
        comp = [{id:'siege', n:1}, {id:'melee', n:2}];
      } else {
        comp = [{id:'melee', n:3}];
      }
    }

    for (const path of MINION_PATHS) {
      if (enhancedLane) {
        const tdOvl = types.find(t => t.id === 'overlord') || types[0];
        this._placeMinionCluster(path, team, 'overlord', tdOvl, 3);
        if (path.lane === enhancedLane) {
          const enemyTeam = team === 'blue' ? 'red' : 'blue';
          this.minions = this.minions.filter(m =>
            !(m.lane === enhancedLane && m.team === enemyTeam)
          );
          const tdEnh = types.find(t => t.id === 'overlord_enhanced') || types[0];
          this._placeMinionCluster(path, team, 'overlord_enhanced', tdEnh, 1);
        }
        continue;
      }

      // Spread minions along the first 30% of the path segment for natural look
      const a = team === 'blue' ? path.points[0] : path.points[path.points.length - 1];
      const b = team === 'blue' ? path.points[1] : path.points[path.points.length - 2];
      const totalCount = comp.reduce((s, x) => s + x.n, 0);
      let offset = 0;
      for (const c of comp) {
        const td = types.find(t => t.id === c.id) || types[0];
        for (let i = 0; i < c.n; i++) {
          const frac = 0.15 + (offset / Math.max(totalCount - 1, 1)) * 0.5;
          this.minions.push({
            id: 'mn_' + Date.now() + '_' + path.lane + '_' + offset,
            type: c.id,
            x: a.x + (b.x - a.x) * frac + (offset - totalCount / 2) * 6,
            y: a.y + (b.y - a.y) * frac + offset * 3,
            team: team, lane: path.lane,
            icon: td.icon, color: td.color, size: td.size,
          });
          offset++;
        }
      }
    }
  },

  _placeMinionCluster(path, team, typeId, typeDef, count) {
    // Spread minions along first segment of path for a natural look
    const a = team === 'blue' ? path.points[0] : path.points[path.points.length - 1];
    const b = team === 'blue' ? path.points[1] : path.points[path.points.length - 2];
    for (let i = 0; i < count; i++) {
      const t = 0.2 + (i / Math.max(count - 1, 1)) * 0.6; // spread along 20%-80% of segment
      this.minions.push({
        id: 'mn_' + Date.now() + '_' + path.lane + '_' + i,
        type: typeId,
        x: a.x + (b.x - a.x) * t + (i - count / 2) * 6,
        y: a.y + (b.y - a.y) * t + i * 3,
        team: team, lane: path.lane,
        icon: typeDef.icon, color: typeDef.color, size: typeDef.size,
      });
    }
  },

  render() {
    const ctx = MapEngine.ctx;
    for (const m of this.minions) {
      const s = MapEngine.mapToScreen(m.x, m.y);
      const z = Math.min(MapEngine.view.zoom, 2.2);
      const r = (m.size || 4) * z;
      const tc = m.team === 'red' ? 'rgba(239,68,68,0.7)' : 'rgba(59,130,246,0.7)';
      ctx.fillStyle = tc;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = Math.round((m.size || 4) * 2.5 * z) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.icon, s.x, s.y);
    }
  },

  clearAll() { this.minions = []; },
};

window.MinionEngine = MinionEngine;
