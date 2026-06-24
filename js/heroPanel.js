/**
 * heroPanel.js — 左侧英雄面板
 * 英雄列表渲染、搜索过滤、拖拽到地图
 */

const HeroPanel = {
  currentTeam: 'blue',
  filterText: '',
  filterLane: '',
  draggedHero: null,

  init() {
    this.createLaneFilter();
    this.renderHeroList();
    this.bindEvents();
  },

  createLaneFilter() {
    const searchEl = document.getElementById('hero-search');
    const div = document.createElement('div');
    div.id = 'lane-filter';
    const lanes = ['全部','打野','中路','边路','发育路','辅助'];
    lanes.forEach(l => {
      const btn = document.createElement('button');
      btn.className = 'lane-filter-btn' + (l === '全部' ? ' active' : '');
      btn.textContent = l;
      btn.addEventListener('click', () => {
        div.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterLane = l === '全部' ? '' : l;
        this.renderHeroList();
      });
      div.appendChild(btn);
    });
    searchEl.parentNode.insertBefore(div, searchEl);
  },

  // ===== 渲染英雄列表 =====
  renderHeroList() {
    const container = document.getElementById('hero-list');
    const searchText = this.filterText.toLowerCase();

    let filtered = HEROES;
    // lane filter
    if (this.filterLane) {
      filtered = filtered.filter(h => h.positions && h.positions.includes(this.filterLane));
    }
    // text filter
    if (searchText) {
      filtered = filtered.filter(h =>
        h.name.includes(searchText) || h.icon.includes(searchText) ||
        (ROLE_NAMES[h.role]||'').includes(searchText) || (h.positions||'').includes(searchText)
      );
    }

    container.innerHTML = filtered.map(h => `
      <div class="hero-icon"
           draggable="true"
           data-hero-id="${h.id}"
           title="${h.name} · ${ROLE_NAMES[h.role]||h.role} · ${h.positions||''}"
           style="border-color:${ROLE_COLORS[h.role]||'#888'}">
        <span>${h.icon}</span>
        <span class="hero-tooltip">${h.name}</span>
      </div>
    `).join('');

    // count display
    const existing = document.getElementById('hero-count');
    const label = (existing) || (() => { const el = document.createElement('div'); el.id='hero-count'; el.style.cssText='font-size:10px;color:#5a6380;margin-top:2px;text-align:right;'; container.parentNode.appendChild(el); return el; })();
    label.textContent = filtered.length + '/' + HEROES.length;

    this.bindHeroDragEvents();
  },

  // ===== 事件绑定 =====
  bindEvents() {
    // 阵营切换
    document.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.team-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTeam = tab.dataset.team;
        window.GameState.currentTeam = this.currentTeam;
      });
    });

    // 搜索
    const searchInput = document.getElementById('hero-search');
    searchInput.addEventListener('input', () => {
      this.filterText = searchInput.value;
      this.renderHeroList();
    });

    // 清除按钮
    document.getElementById('btn-erase')?.addEventListener('click', () => {
      if (confirm('确定要清除所有英雄标记吗？')) {
        window.MarkerEngine.clearAllMarkers();
      }
    });
  },

  // ===== 拖拽事件 + 点击放置 =====
  bindHeroDragEvents() {
    const icons = document.querySelectorAll('#hero-list .hero-icon');
    icons.forEach(icon => {
      // Desktop: drag
      icon.addEventListener('dragstart', (e) => {
        const heroId = icon.dataset.heroId;
        const hero = HEROES.find(h => h.id === heroId);
        if (hero) {
          this.draggedHero = { ...hero, team: this.currentTeam };
          e.dataTransfer.setData('text/plain', heroId);
          e.dataTransfer.effectAllowed = 'copy';
          icon.classList.add('dragging');
        }
      });

      icon.addEventListener('dragend', (e) => {
        icon.classList.remove('dragging');
        this.draggedHero = null;
      });
    });
  },

  // ===== 通过点击放置英雄 =====
  placeHeroOnMap(heroId) {
    const hero = HEROES.find(h => h.id === heroId);
    if (!hero) return;
    const defaultX = 400 + Math.random() * 100;
    const defaultY = 550 + Math.random() * 80;
    window.MarkerEngine.addMarker({ ...hero, team: this.currentTeam }, defaultX, defaultY);
  },
};

// Canvas 接收拖放
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('map-canvas');
  canvas?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  canvas?.addEventListener('drop', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const mapPos = window.MapEngine.screenToMap(sx, sy);

    if (window.HeroPanel.draggedHero) {
      window.MarkerEngine.addMarker(window.HeroPanel.draggedHero, mapPos.x, mapPos.y);
      window.HeroPanel.draggedHero = null;
    }
  });
});

window.HeroPanel = HeroPanel;
