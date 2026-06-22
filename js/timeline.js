/**
 * timeline.js — 时间系统
 * 实时计时 / 手动滑块 / 事件触发 / 播放控制
 */

const Timeline = {
  isRunning: false,
  mode: 'realtime',      // 'realtime' | 'manual'
  speed: 1,
  lastFrameTime: 0,
  triggeredEvents: new Set(),
  maxTime: 1200,         // 20分钟 = 1200秒

  init() {
    this.renderTimelineMarkers();
    this.renderTimelineLabels();
    this.bindEvents();
  },

  // ===== 事件绑定 =====
  bindEvents() {
    // 播放/暂停
    document.getElementById('btn-play').addEventListener('click', () => {
      if (this.mode === 'manual') {
        // 从手动切到实时
        this.mode = 'realtime';
        document.querySelector('input[name="timeMode"][value="realtime"]').checked = true;
      }
      this.togglePlay();
    });

    // 后退30秒
    document.getElementById('btn-step-back').addEventListener('click', () => {
      if (this.isRunning) this.togglePlay();
      window.GameState.time = Math.max(0, window.GameState.time - 30);
      this.syncUI();
      this.triggerTimeEvents(window.GameState.time);
      if (window.InfoPanel) window.InfoPanel.update(window.GameState.time);
    });

    // 前进30秒
    document.getElementById('btn-step-fwd').addEventListener('click', () => {
      if (this.isRunning) this.togglePlay();
      window.GameState.time = Math.min(this.maxTime, window.GameState.time + 30);
      this.syncUI();
      this.triggerTimeEvents(window.GameState.time);
      if (window.InfoPanel) window.InfoPanel.update(window.GameState.time);
    });

    // 归零
    document.getElementById('btn-reset-time').addEventListener('click', () => {
      if (this.isRunning) this.togglePlay();
      window.GameState.time = 0;
      this.triggeredEvents.clear();
      this.syncUI();
      this.triggerTimeEvents(0);
      if (window.InfoPanel) window.InfoPanel.update(0);
    });

    // 时间模式切换
    document.querySelectorAll('input[name="timeMode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.mode = radio.value;
          if (this.mode === 'manual' && this.isRunning) {
            this.togglePlay();
          }
        }
      });
    });

    // 速度
    document.getElementById('speed-select').addEventListener('change', (e) => {
      this.speed = parseFloat(e.target.value);
    });

    // 手动滑块
    const slider = document.getElementById('timeline-slider');
    slider.addEventListener('input', () => {
      if (this.mode === 'manual') {
        window.GameState.time = parseInt(slider.value);
        this.syncUI();
        this.triggerTimeEvents(window.GameState.time);
        if (window.InfoPanel) window.InfoPanel.update(window.GameState.time);
      }
    });
  },

  // ===== 播放控制 =====
  togglePlay() {
    this.isRunning = !this.isRunning;
    const btn = document.getElementById('btn-play');
    if (this.isRunning) {
      btn.textContent = '⏸';
      btn.classList.add('playing');
      this.lastFrameTime = performance.now();
      this.tick();
    } else {
      btn.textContent = '▶';
      btn.classList.remove('playing');
    }
  },

  tick() {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000; // 秒
    this.lastFrameTime = now;

    // 推进时间
    window.GameState.time += delta * this.speed;
    if (window.GameState.time > this.maxTime) {
      window.GameState.time = this.maxTime;
      this.togglePlay();
    }

    // 同步UI
    this.syncUI();

    // 触发事件
    this.triggerTimeEvents(window.GameState.time);

    // 更新信息面板
    if (window.InfoPanel) window.InfoPanel.update(window.GameState.time);

    requestAnimationFrame(() => this.tick());
  },

  syncUI() {
    const t = window.GameState.time;

    // 顶部时间
    document.getElementById('game-time-display').textContent =
      '⏱ ' + InfoPanel.formatTime(t);

    // 阶段描述
    let phase = '';
    if (t < 30) phase = '开局准备';
    else if (t < 120) phase = '对线期';
    else if (t < 240) phase = '前期';
    else if (t < 600) phase = '中期';
    else if (t < 1200) phase = '后期';
    else phase = '风暴龙王降临';
    document.getElementById('game-phase-display').textContent = phase;

    // 滑块
    document.getElementById('timeline-slider').value = Math.floor(t);
  },

  // ===== 时间事件触发 =====
  triggerTimeEvents(currentTime) {
    for (const event of TIME_EVENTS) {
      const eventKey = event.type + '_' + event.time;

      // 首次触发
      if (currentTime >= event.time && !this.triggeredEvents.has(eventKey)) {
        this.triggeredEvents.add(eventKey);
        this.onEventTrigger(event, currentTime);
      }

      // 重复事件
      if (event.repeat && currentTime >= event.time) {
        const lastTriggerTime = this.getLastTriggerTime(event);
        if (lastTriggerTime === null || (currentTime - lastTriggerTime) >= event.repeat) {
          // 检查是否超过结束时间
          if (event.endRepeat && currentTime > event.endRepeat) continue;
          const repeatKey = event.type + '_repeat_' + Math.floor(currentTime / event.repeat);
          if (!this.triggeredEvents.has(repeatKey)) {
            this.triggeredEvents.add(repeatKey);
            // 重复事件不做动画通知，只更新数据
          }
        }
      }
    }
  },

  getLastTriggerTime(event) {
    let last = null;
    const prefix = event.type + '_repeat_';
    for (const key of this.triggeredEvents) {
      if (key.startsWith(prefix)) {
        const t = parseInt(key.replace(prefix, ''));
        if (!isNaN(t) && t > (last || 0)) last = t;
      }
    }
    return last !== null ? last * (event.repeat || 1) : null;
  },

  onEventTrigger(event, currentTime) {
    console.log(`[Event] ${InfoPanel.formatTime(event.time)} - ${event.name}`);

    // 特殊处理
    switch (event.type) {
      case 'shield_off':
        // 移除护盾视觉效果
        break;
      case 'dragon_enhance':
        // 更新龙形态
        break;
      case 'storm_dragon_spawn':
        // 风暴龙王特效
        this.showNotification('🌪️ 风暴龙王降临！');
        break;
    }
  },

  // ===== 时间轴可视化 =====
  renderTimelineMarkers() {
    const container = document.getElementById('timeline-markers');
    let html = '';

    for (const event of TIME_EVENTS) {
      const pct = (event.time / this.maxTime) * 100;
      const isMajor = event.type === 'dragon_spawn' || event.type === 'dragon_enhance' ||
                      event.type === 'shield_off' || event.type === 'storm_dragon_spawn';
      const color = event.type === 'storm_dragon_spawn' ? '#ff1493' :
                    event.type === 'dragon_enhance' ? '#ff4500' :
                    event.type === 'shield_off' ? '#ff6347' :
                    event.type === 'dragon_spawn' ? '#ffd700' :
                    event.type === 'minion_spawn' ? '#aaa' :
                    '#888';

      html += `<div class="timeline-marker ${isMajor ? 'major' : ''}"
                     style="left:${pct}%;background:${color}"
                     title="${InfoPanel.formatTime(event.time)} - ${event.name}"></div>`;
    }

    container.innerHTML = html;
  },

  renderTimelineLabels() {
    const container = document.getElementById('timeline-labels');
    const labels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '15:00', '20:00'];
    container.innerHTML = labels.map(l => `<span>${l}</span>`).join('');
  },

  // ===== 通知 =====
  showNotification(message) {
    // 简单的地图中央通知
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); color: #ffd700; padding: 8px 20px;
      border-radius: 20px; font-size: 16px; font-weight: bold; z-index: 100;
      pointer-events: none; animation: fadeInOut 3s ease forwards;
    `;
    notification.textContent = message;
    document.getElementById('map-area').appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  },
};

// 添加通知动画
const notifStyle = document.createElement('style');
notifStyle.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
`;
document.head.appendChild(notifStyle);

window.Timeline = Timeline;
