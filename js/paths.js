/**
 * paths.js — 路径绘制模式
 * 点击按钮进入绘制模式，鼠标移动画线，左键点击保存线段并开始新线段，ESC退出
 */

const PathEngine = {
  drawing: false,
  currentPath: null,
  paths: [],

  init() {
    this.bindEvents();
    this.setupCanvasHook();
  },

  bindEvents() {
    const btn = document.getElementById('btn-path');
    btn?.addEventListener('click', () => {
      if (this.drawing) {
        this.stopDrawing();
      } else {
        this.startDrawing();
      }
    });

    // ESC = exit drawing mode
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drawing) {
        this.stopDrawing();
      }
    });
  },

  // Hook into map.js mousedown to handle clicks during drawing
  setupCanvasHook() {
    MapEngine.canvas.addEventListener('mousedown', (e) => {
      if (!this.drawing || e.button !== 0) return;
      // Left click while drawing = save current segment, start new one
      if (this.currentPath && this.currentPath.points.length > 1) {
        this.saveSegment();
      }
      e.stopPropagation();
      e.preventDefault();
    }, true); // capture phase to beat map.js handler

    // Touch: tap to save segment during drawing
    MapEngine.canvas.addEventListener('touchstart', (e) => {
      if (!this.drawing) return;
      if (this.currentPath && this.currentPath.points.length > 1) {
        this.saveSegment();
      }
    }, true);
  },

  startDrawing() {
    this.drawing = true;
    const btn = document.getElementById('btn-path');
    btn?.classList.add('active');
    btn.textContent = '✏️ 绘制中...';
    MapEngine.canvas.style.cursor = 'crosshair';
    document.getElementById('map-hint').textContent = '✏️ 移动鼠标绘制路径 | 点击保存线段 | ESC退出';
    this.startNewSegment();
  },

  stopDrawing() {
    // save last segment if any
    if (this.currentPath && this.currentPath.points.length > 1) {
      this.saveSegment();
    }
    this.drawing = false;
    this.currentPath = null;
    const btn = document.getElementById('btn-path');
    btn?.classList.remove('active');
    btn.textContent = '✏️ 路径绘制';
    MapEngine.canvas.style.cursor = 'default';
    document.getElementById('map-hint').textContent = 'Left-drag pan | Scroll zoom';
  },

  startNewSegment() {
    this.currentPath = {
      id: 'path_' + Date.now(),
      points: [],
      color: this.randomColor(),
      label: '',
      team: window.GameState?.currentTeam || 'blue',
      lineWidth: 2,
    };
  },

  handleMouseMove(mapX, mapY) {
    if (!this.drawing || !this.currentPath) return;
    const last = this.currentPath.points[this.currentPath.points.length - 1];
    if (!last || Math.hypot(mapX - last.x, mapY - last.y) > 5) {
      this.currentPath.points.push({ x: mapX, y: mapY });
    }
  },

  saveSegment() {
    const pts = this.currentPath.points;
    if (pts.length < 2) return;
    const label = prompt('路径名称 (留空=不保存, 取消=丢弃):', this.currentPath.label || '');
    if (label === null) { this.currentPath = null; this.startNewSegment(); return; }
    if (label.trim() === '') { this.currentPath = null; this.startNewSegment(); return; }
    this.currentPath.label = label;
    this.paths.push(this.currentPath);
    this.startNewSegment();
  },

  clearAllPaths() { this.paths = []; this.currentPath = null; },
  deletePath(id) { this.paths = this.paths.filter(p => p.id !== id); },

  // ===== render =====
  render() {
    const ctx = MapEngine.ctx;
    for (const path of this.paths) this.drawPath(ctx, path);
    if (this.currentPath && this.currentPath.points.length > 1) {
      this.drawPath(ctx, this.currentPath, true);
    }
  },

  drawPath(ctx, path, isDrawing = false) {
    if (path.points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // glow
    ctx.strokeStyle = (path.color || 'rgb(255,255,255)').replace(')', ',0.3)').replace('rgb', 'rgba');
    ctx.lineWidth = (path.lineWidth || 2) * MapEngine.view.zoom + 4;
    ctx.beginPath();
    for (let i = 0; i < path.points.length; i++) {
      const s = MapEngine.mapToScreen(path.points[i].x, path.points[i].y);
      i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();

    // main line
    ctx.strokeStyle = path.color || 'rgb(255,255,255)';
    ctx.lineWidth = (path.lineWidth || 2) * MapEngine.view.zoom;
    if (isDrawing) ctx.setLineDash([8, 4]);
    ctx.beginPath();
    for (let i = 0; i < path.points.length; i++) {
      const s = MapEngine.mapToScreen(path.points[i].x, path.points[i].y);
      i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // arrow
    if (path.points.length >= 2) {
      const a = path.points[path.points.length - 2], b = path.points[path.points.length - 1];
      const s1 = MapEngine.mapToScreen(a.x, a.y), s2 = MapEngine.mapToScreen(b.x, b.y);
      const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
      const headLen = 10 * Math.min(MapEngine.view.zoom, 2);
      ctx.fillStyle = path.color;
      ctx.beginPath();
      ctx.moveTo(s2.x, s2.y);
      ctx.lineTo(s2.x - headLen * Math.cos(angle - Math.PI/6), s2.y - headLen * Math.sin(angle - Math.PI/6));
      ctx.lineTo(s2.x - headLen * Math.cos(angle + Math.PI/6), s2.y - headLen * Math.sin(angle + Math.PI/6));
      ctx.closePath(); ctx.fill();
    }

    // label
    if (path.label && MapEngine.view.zoom > 0.4) {
      const mid = path.points[Math.floor(path.points.length / 2)];
      const sm = MapEngine.mapToScreen(mid.x, mid.y);
      ctx.fillStyle = '#fff'; ctx.font = '11px "Microsoft YaHei"';
      ctx.textAlign = 'center'; ctx.fillText(path.label, sm.x, sm.y - 8);
    }
    ctx.restore();
  },

  randomColor() {
    const c = ['rgb(233,69,96)','rgb(59,130,246)','rgb(245,158,11)','rgb(16,185,129)','rgb(139,92,246)','rgb(6,182,212)','rgb(255,255,255)'];
    return c[Math.floor(Math.random() * c.length)];
  },
};

window.PathEngine = PathEngine;
