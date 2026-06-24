/**
 * skills.js — skill range overlay drawing + editing
 * Circle AoE / Line beam / Cone. Drag to move. Right-click to delete.
 * Editing uses render-loop for frame-synced smooth dragging.
 */

const SkillEngine = {
  active: false,
  skillType: 'circle',
  placing: false,
  placeStart: null,
  currentPreview: null,
  skills: [],
  editing: null,
  editStartMap: null,
  _colorIdx: 0,
  _presetColors: ['#e94560','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#06b6d4','#ffffff'],

  _advanceColor() {
    this._colorIdx = (this._colorIdx + 1) % this._presetColors.length;
    const next = this._presetColors[this._colorIdx];
    const clrInput = document.getElementById('skill-color');
    if (clrInput) clrInput.value = next;
    const swatches = document.querySelectorAll('#skill-options span[data-color]');
    swatches.forEach(s => { s.style.borderColor = s.dataset.color === next ? '#fff' : 'transparent'; });
  },
  editSkillSnap: null,

  init() { this.createPanel(); this.bindEvents(); },

  createPanel() {
    const tools = document.getElementById('tools-section');
    const btn = document.createElement('button');
    btn.id = 'btn-skill'; btn.className = 'tool-btn'; btn.textContent = '🎯 技能范围';
    tools.appendChild(btn);

    const sel = document.createElement('div');
    sel.id = 'skill-options';
    sel.style.display = 'none';
    sel.style.marginTop = '4px';

    // row1: type buttons
    const r1 = document.createElement('div');
    r1.style.cssText = 'display:flex;gap:3px;margin-bottom:4px;';
    ['circle','line','cone','rect'].forEach((t, i) => {
      const b = document.createElement('button');
      b.dataset.type = t;
      b.className = 'skill-type-btn' + (i === 0 ? ' active' : '');
      b.textContent = t === 'circle' ? '⭕ 圆形' : t === 'line' ? '➖ 直线' : t === 'cone' ? '🔻 扇形' : '⬜ 矩形';
      b.style.cssText = 'flex:1;padding:3px 4px;font-size:10px;background:'+(i===0?'#3b82f6':'#1e2740')+';border:'+(i===0?'none':'1px solid #2a3350')+';color:'+(i===0?'#fff':'#ccc')+';border-radius:3px;cursor:pointer;';
      r1.appendChild(b);
    });
    sel.appendChild(r1);

    // row2: label + width
    const r2 = document.createElement('div');
    r2.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;align-items:center;';
    const inp = document.createElement('input');
    inp.id = 'skill-label'; inp.placeholder = '技能名称';
    inp.style.cssText = 'flex:1;padding:4px 6px;font-size:11px;background:#1e2740;border:1px solid #2a3350;color:#ccc;border-radius:3px;';
    r2.appendChild(inp);
    const wlbl = document.createElement('label');
    wlbl.style.cssText = 'font-size:10px;color:#8892a8;white-space:nowrap;display:flex;align-items:center;gap:2px;';
    wlbl.textContent = '宽';
    const w = document.createElement('input');
    w.id = 'skill-width'; w.type = 'range'; w.min = '3'; w.max = '200'; w.value = '25';
    w.style.cssText = 'width:44px;vertical-align:middle;';
    wlbl.appendChild(w);
    r2.appendChild(wlbl);
    sel.appendChild(r2);

    // row2.5: preset color swatches + custom
    const rColor = document.createElement('div');
    rColor.style.cssText = 'display:flex;gap:3px;margin-bottom:6px;align-items:center;flex-wrap:wrap;';
    const colorLabel = document.createElement('span');
    colorLabel.textContent = '颜色';
    colorLabel.style.cssText = 'font-size:10px;color:#8892a8;margin-right:2px;';
    rColor.appendChild(colorLabel);

    const presetColors = [
      '#e94560','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#06b6d4','#ffffff',
    ];
    let activeColor = presetColors[0];
    presetColors.forEach((c, i) => {
      const sw = document.createElement('span');
      sw.style.cssText = `width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${i===0?'#fff':'transparent'};flex-shrink:0;transition:0.15s;`;
      sw.title = c;
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        rColor.querySelectorAll('span[data-color]').forEach(s => s.style.borderColor = 'transparent');
        sw.style.borderColor = '#fff';
        activeColor = c;
        document.getElementById('skill-color').value = c;
      });
      rColor.appendChild(sw);
    });
    // custom color input (small)
    const clr = document.createElement('input');
    clr.id = 'skill-color'; clr.type = 'color'; clr.value = presetColors[0];
    clr.style.cssText = 'width:22px;height:22px;border:none;cursor:pointer;background:transparent;flex-shrink:0;';
    clr.addEventListener('input', () => {
      activeColor = clr.value;
      rColor.querySelectorAll('span[data-color]').forEach(s => s.style.borderColor = 'transparent');
    });
    rColor.appendChild(clr);
    sel.appendChild(rColor);

    // row3: follow checkbox
    const r3 = document.createElement('div');
    r3.style.cssText = 'margin-bottom:4px;';
    const fLbl = document.createElement('label');
    fLbl.style.cssText = 'font-size:11px;color:#ccc;cursor:pointer;display:flex;align-items:center;gap:4px;';
    const fCb = document.createElement('input');
    fCb.type = 'checkbox'; fCb.id = 'skill-follow';
    fLbl.appendChild(fCb);
    fLbl.appendChild(document.createTextNode('👤 跟随英雄（自身AOE）'));
    r3.appendChild(fLbl);
    sel.appendChild(r3);

    // clear button
    const clrBtn = document.createElement('button');
    clrBtn.id = 'btn-skill-clear';
    clrBtn.textContent = '🗑️ 清除所有技能';
    clrBtn.style.cssText = 'width:100%;padding:3px 6px;font-size:10px;background:#1e2740;border:1px solid #2a3350;color:#e94560;border-radius:3px;cursor:pointer;';
    sel.appendChild(clrBtn);

    tools.appendChild(sel);
  },

  bindEvents() {
    document.getElementById('btn-skill')?.addEventListener('click', () => this.toggle());
    document.querySelectorAll('.skill-type-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.skill-type-btn').forEach(x => { x.style.background='#1e2740'; x.style.color='#ccc'; x.classList.remove('active'); });
        b.style.background='#3b82f6'; b.style.color='#fff'; b.classList.add('active');
        this.skillType = b.dataset.type;
      });
    });
    document.getElementById('btn-skill-clear')?.addEventListener('click', () => { this.skills = []; });

    // --- Canvas events (capture phase to beat map.js) ---
    MapEngine.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);

      if (this.active) {
        this.placing = true;
        this.placeStart = { x: mapPos.x, y: mapPos.y };
        this.currentPreview = null;
        e.stopPropagation(); e.preventDefault();
        return;
      }

      if (e.ctrlKey || e.altKey) return;
      if (window.MarkerEngine?.findMarkerAt(mapPos.x, mapPos.y, 14)) return;
      const hit = this.findSkillAt(mapPos.x, mapPos.y);
      if (hit) {
        this.editing = hit.skill;
        this.editStartMap = { x: mapPos.x, y: mapPos.y };
        this.editSkillSnap = { startX: hit.skill.startX, startY: hit.skill.startY, endX: hit.skill.endX, endY: hit.skill.endY };
        MapEngine.canvas.style.cursor = 'grabbing';
        e.stopPropagation(); e.preventDefault();
      }
    }, true);

    window.addEventListener('mousemove', () => {
      // mouse tracking handled by MapEngine.mouseX/mouseY
      if (this.active && this.placing) {
        const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
        this.currentPreview = { type: this.skillType, startX: this.placeStart.x, startY: this.placeStart.y, endX: mapPos.x, endY: mapPos.y };
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.active && this.placing) {
        this.placing = false;
        if (this.currentPreview) {
          const label = document.getElementById('skill-label')?.value || '技能';
          const color = document.getElementById('skill-color')?.value || '#e94560';
          const dist = Math.hypot(this.currentPreview.endX - this.currentPreview.startX, this.currentPreview.endY - this.currentPreview.startY);
          if (dist > 5) {
            const lineWidth = parseInt(document.getElementById('skill-width')?.value) || 25;
            const follow = document.getElementById('skill-follow')?.checked;
            let followHeroId = null;
            if (follow && window.MarkerEngine) {
              // Find closest hero to click point (within 40 units)
              let best = null, bestD = 40;
              for (const m of window.MarkerEngine.markers) {
                const d = Math.hypot(m.x - this.currentPreview.startX, m.y - this.currentPreview.startY);
                if (d < bestD) { best = m; bestD = d; }
              }
              if (best) followHeroId = best.id;
            }
            // auto-cycle to next preset color for next skill
            this._advanceColor();
            // 矩形跟随英雄时记录半宽半高，保证英雄始终在矩形中心
            let halfW = 0, halfH = 0;
            if (this.skillType === 'rect' && followHeroId) {
              halfW = Math.abs(this.currentPreview.endX - this.currentPreview.startX) / 2;
              halfH = Math.abs(this.currentPreview.endY - this.currentPreview.startY) / 2;
            }
            window.UndoManager?.push();
            this.skills.push({
              id:'sk_'+Date.now(), type:this.skillType, label, color, lineWidth,
              followHeroId, halfW, halfH,
              team:window.GameState?.currentTeam||'blue',
              ...this.currentPreview
            });
          }
          this.currentPreview = null; this.placeStart = null;
        }
      }
      if (this.editing) { MapEngine.canvas.style.cursor = 'default'; }
      this.editing = null; this.editStartMap = null; this.editSkillSnap = null;
    });

    // right-click to delete (works even on hero for follow skills)
    MapEngine.canvas.addEventListener('contextmenu', (e) => {
      if (this.active || this.editing) return;
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
      const hit = this.findSkillAt(mapPos.x, mapPos.y);
      if (hit) {
        e.preventDefault(); e.stopPropagation();
        window.UndoManager?.push();
        this.skills = this.skills.filter(s => s.id !== hit.skill.id);
      }
    }, true);

    // dblclick to rename (skip if on hero)
    MapEngine.canvas.addEventListener('dblclick', (e) => {
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
      if (window.MarkerEngine?.findMarkerAt(mapPos.x, mapPos.y, 14)) return;
      const hit = this.findSkillAt(mapPos.x, mapPos.y);
      if (hit) { e.stopPropagation(); const name = prompt('技能名称:', hit.skill.label); if (name !== null) hit.skill.label = name; }
    }, true);
  },

  toggle() {
    this.active = !this.active;
    const btn = document.getElementById('btn-skill');
    btn?.classList.toggle('active', this.active);
    const opts = document.getElementById('skill-options');
    if (opts) opts.style.display = this.active ? 'block' : 'none';
    MapEngine.canvas.style.cursor = this.active ? 'crosshair' : 'default';
    if (!this.active) { this.placing = false; this.currentPreview = null; }
  },

  findSkillAt(mapX, mapY) {
    const margin = 18 / MapEngine.view.zoom;
    for (let i = this.skills.length - 1; i >= 0; i--) {
      const sk = this.skills[i];
      const cx = sk.startX, cy = sk.startY;
      const ex = sk.endX, ey = sk.endY;
      const dist = Math.hypot(ex - cx, ey - cy);
      if (dist < 8) continue;
      if (sk.type === 'rect') {
        const rx = Math.min(cx, ex), ry = Math.min(cy, ey);
        const rw = Math.abs(ex - cx), rh = Math.abs(ey - cy);
        if (mapX >= rx - margin && mapX <= rx + rw + margin && mapY >= ry - margin && mapY <= ry + rh + margin) {
          return { skill: sk, mode: 'move' };
        }
      } else if (sk.type === 'circle' || sk.type === 'cone') {
        if (Math.hypot(mapX - cx, mapY - cy) <= dist + margin) return { skill: sk, mode: 'move' };
      } else if (sk.type === 'line') {
        const angle = Math.atan2(ey - cy, ex - cx);
        const dx = mapX - cx, dy = mapY - cy;
        const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
        const perp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
        const lw = (sk.lineWidth || 25) + margin;
        if (proj >= -margin && proj <= dist + margin && perp < lw) return { skill: sk, mode: 'move' };
      }
    }
    return null;
  },

  // --- Called every frame by map.js render loop ---
  render() {
    const ctx = MapEngine.ctx;

    // FRAME-SYNCED drag update: move skill with mouse
    if (this.editing && this.editSkillSnap) {
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
      const dx = mapPos.x - this.editStartMap.x;
      const dy = mapPos.y - this.editStartMap.y;
      this.editing.startX = this.editSkillSnap.startX + dx;
      this.editing.startY = this.editSkillSnap.startY + dy;
      this.editing.endX = this.editSkillSnap.endX + dx;
      this.editing.endY = this.editSkillSnap.endY + dy;
    }

    // hover cursor: don't override if hovering a hero marker
    if (!this.active && !this.editing) {
      const mapPos = MapEngine.screenToMap(MapEngine.mouseX, MapEngine.mouseY);
      const onHero = window.MarkerEngine?.findMarkerAt(mapPos.x, mapPos.y, 14);
      if (!onHero) {
        const hit = this.findSkillAt(mapPos.x, mapPos.y);
        if (hit) MapEngine.canvas.style.cursor = 'move';
      }
    }

    // draw placed skills
    for (const sk of this.skills) {
      // if follows a hero, snap to hero position
      if (sk.followHeroId && window.MarkerEngine) {
        let hero = window.MarkerEngine.markers.find(m => m.id === sk.followHeroId);
        // Fallback: if ID not found (e.g. after save/load), find by position
        if (!hero) {
          let best = null, bestD = 50;
          for (const m of window.MarkerEngine.markers) {
            const d = Math.hypot(m.x - sk.startX, m.y - sk.startY);
            if (d < bestD) { best = m; bestD = d; }
          }
          if (best) { hero = best; sk.followHeroId = best.id; }
        }
        if (hero) {
          if (sk.type === 'rect' && sk.halfW) {
            // 矩形：英雄在中心，根据半宽半高重新计算两个角点
            sk.startX = hero.x - sk.halfW;
            sk.startY = hero.y - sk.halfH;
            sk.endX   = hero.x + sk.halfW;
            sk.endY   = hero.y + sk.halfH;
          } else {
            // 圆形/直线/扇形：起点跟随英雄
            const dx = hero.x - sk.startX;
            const dy = hero.y - sk.startY;
            sk.startX = hero.x; sk.startY = hero.y;
            sk.endX += dx; sk.endY += dy;
          }
        }
      }
      const isEditing = this.editing && this.editing.id === sk.id;
      this.drawSkill(ctx, sk, sk.color, isEditing ? 0.4 : 0.25);
      if (isEditing) {
        const c = MapEngine.mapToScreen(sk.startX, sk.startY);
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5;
        ctx.setLineDash([4,2]); ctx.beginPath();
        ctx.arc(c.x, c.y, 8 * MapEngine.view.zoom, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      }
      // indicate following
      if (sk.followHeroId) {
        const c = MapEngine.mapToScreen(sk.startX, sk.startY);
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Microsoft YaHei"'; ctx.textAlign = 'center';
        ctx.fillText('👤跟随', c.x, c.y - 16 * MapEngine.view.zoom);
      }
    }

    // draw preview
    if (this.currentPreview && this.placeStart) {
      this.drawSkill(ctx, this.currentPreview, 'rgba(255,255,255,0.6)', 0.15);
    }
  },

  drawSkill(ctx, sk, color, alpha) {
    ctx.save();
    const c = MapEngine.mapToScreen(sk.startX, sk.startY);
    const e = MapEngine.mapToScreen(sk.endX, sk.endY);
    const r = Math.hypot(e.x - c.x, e.y - c.y);

    let fill = color;
    if (color.startsWith('#')) {
      const rc = parseInt(color.slice(1,3),16), gc = parseInt(color.slice(3,5),16), bc = parseInt(color.slice(5,7),16);
      fill = 'rgba('+rc+','+gc+','+bc+','+alpha+')';
    } else if (color.startsWith('rgb')) {
      fill = color.replace(')', ','+alpha+')').replace('rgb', 'rgba');
    }

    if (sk.type === 'rect') {
      const x = Math.min(c.x, e.x), y = Math.min(c.y, e.y);
      const w = Math.abs(e.x - c.x), h = Math.abs(e.y - c.y);
      ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6,3]);
      ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      if (sk.label) { ctx.fillStyle='#fff'; ctx.font='bold 11px "Microsoft YaHei"'; ctx.textAlign='center'; ctx.fillText(sk.label, x+w/2, y-8); }
    } else if (sk.type === 'circle') {
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      if (sk.label) { ctx.fillStyle='#fff'; ctx.font='bold 11px "Microsoft YaHei"'; ctx.textAlign='center'; ctx.fillText(sk.label, c.x, c.y - r - 6); }
    } else if (sk.type === 'line') {
      const angle = Math.atan2(e.y - c.y, e.x - c.x);
      const lw = (sk.lineWidth || 25) * MapEngine.view.zoom;
      ctx.fillStyle = fill; ctx.beginPath();
      ctx.moveTo(c.x+Math.cos(angle+Math.PI/2)*lw/2, c.y+Math.sin(angle+Math.PI/2)*lw/2);
      ctx.lineTo(e.x+Math.cos(angle+Math.PI/2)*lw/2, e.y+Math.sin(angle+Math.PI/2)*lw/2);
      ctx.lineTo(e.x+Math.cos(angle-Math.PI/2)*lw/2, e.y+Math.sin(angle-Math.PI/2)*lw/2);
      ctx.lineTo(c.x+Math.cos(angle-Math.PI/2)*lw/2, c.y+Math.sin(angle-Math.PI/2)*lw/2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6,3]); ctx.stroke(); ctx.setLineDash([]);
      if (sk.label) { ctx.fillStyle='#fff'; ctx.font='bold 11px "Microsoft YaHei"'; ctx.textAlign='center'; ctx.fillText(sk.label, (c.x+e.x)/2, (c.y+e.y)/2); }
    } else if (sk.type === 'cone') {
      const angle = Math.atan2(e.y - c.y, e.x - c.x);
      const ca = Math.PI/3;
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(c.x, c.y);
      ctx.arc(c.x, c.y, r, angle-ca/2, angle+ca/2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.arc(c.x, c.y, r, angle-ca/2, angle+ca/2); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      if (sk.label) { ctx.fillStyle='#fff'; ctx.font='bold 11px "Microsoft YaHei"'; ctx.textAlign='center'; ctx.fillText(sk.label, c.x+Math.cos(angle)*r/2, c.y+Math.sin(angle)*r/2); }
    }
    ctx.restore();
  },

  clearAll() { window.UndoManager?.push(); this.skills = []; },
};

window.SkillEngine = SkillEngine;
