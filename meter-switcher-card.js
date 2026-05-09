/**
 * Meter Switcher Card for Home Assistant
 * Pure frontend card - no backend integration required
 * https://github.com/kubosiro/ha-meter-switcher-pro
 * Developed by Antigravity AI
 */

const EVN_TIERS = [
  { limit: 50,   price: 1893 },
  { limit: 100,  price: 1956 },
  { limit: 200,  price: 2271 },
  { limit: 300,  price: 2860 },
  { limit: 400,  price: 3197 },
  { limit: null, price: 3302 },
];

function calcTierAndCost(kwh, vat = 8) {
  let cost = 0, tier = 1, remaining = 0, prev = 0;
  for (let i = 0; i < EVN_TIERS.length; i++) {
    const { limit, price } = EVN_TIERS[i];
    tier = i + 1;
    if (limit === null || kwh < limit) {
      cost += Math.max(0, kwh - prev) * price;
      remaining = limit !== null ? limit - kwh : 0;
      break;
    }
    cost += (limit - prev) * price;
    prev = limit;
  }
  return { tier, cost: Math.round(cost * (1 + vat / 100)), remaining };
}

function getDayInfo(billingDay) {
  const now = new Date();
  const day = now.getDate();
  let start, end;
  if (day >= billingDay) {
    start = new Date(now.getFullYear(), now.getMonth(), billingDay);
    end   = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
    end   = new Date(now.getFullYear(), now.getMonth(), billingDay);
  }
  const passed = Math.max(0.1, (now - start) / 86400000);
  const total  = (end - start) / 86400000;
  return { passed, total };
}

function fmt(n) { return Math.round(n).toLocaleString('vi-VN') + 'đ'; }
function fmtKwh(n) { return (+n).toFixed(1) + ' kWh'; }

class MeterSwitcherCard extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._safetyState = 0;
    this._interval = null;
    this._countdown = 0;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._initialized) {
      this._initialized = true;
      this.attachShadow({ mode: 'open' });
      this._buildDOM();
    }
    this._update();
  }

  _buildDOM() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        :host { display: block; font-family: 'Inter', sans-serif; }
        ha-card { background: var(--ha-card-background, #1c1c1e); border-radius: 16px; overflow: hidden; padding: 16px; }

        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .title { font-size: 13px; font-weight: 900; letter-spacing: 0.8px; color: var(--primary-color, #2196f3); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Toggle switch */
        .toggle-wrap { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; flex-shrink: 0; }
        .toggle-label { font-size: 9px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.3s; }
        .toggle-label.active { color: var(--primary-color, #2196f3); }
        .toggle-track { position: relative; width: 28px; height: 15px; background: #444; border-radius: 8px; transition: background 0.3s; }
        .toggle-track.on { background: var(--primary-color, #2196f3); }
        .toggle-thumb { position: absolute; width: 11px; height: 11px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: left 0.3s; }
        .toggle-track.on .toggle-thumb { left: 15px; }

        /* Meter boxes */
        .meter { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
        .meter.active { background: rgba(33,150,243,0.12); border-color: rgba(33,150,243,0.4); }
        .meter-row { display: flex; justify-content: space-between; align-items: center; }
        .meter-name { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); }
        .meter.active .meter-name { color: #2196f3; }
        .meter-value { font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.9); text-align: right; }
        .meter-sub { font-size: 10px; color: rgba(255,255,255,0.4); text-align: right; margin-top: 1px; }

        /* Progress bar */
        .bar-wrap { margin-top: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; height: 5px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; transition: width 1s ease; position: relative; }
        .bar-fill.t1,.bar-fill.t2 { background: #4caf50; }
        .bar-fill.t3 { background: #8bc34a; }
        .bar-fill.t4 { background: #ffc107; }
        .bar-fill.t5 { background: #ff9800; }
        .bar-fill.t6 { background: #f44336; }
        .meter.active .bar-fill::after {
          content: '';position:absolute;top:0;left:-60%;width:40%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent);
          animation: shimmer 1.8s infinite;
        }
        @keyframes shimmer { 100% { left: 140%; } }

        /* Stats */
        .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 10px 0; }
        .stat { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.04); }
        .stat-label { font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.9); margin-top: 3px; }
        .stat-value.savings { color: #4caf50; }
        .stat-value.cost { color: #ff9800; }

        /* Forecast */
        .forecast { background: rgba(255,152,0,0.08); border: 1px solid rgba(255,152,0,0.2); border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
        .forecast-label { font-size: 9px; font-weight: 700; color: rgba(255,152,0,0.8); text-transform: uppercase; letter-spacing: 0.5px; }
        .forecast-value { font-size: 11px; font-weight: 900; color: #ff9800; }

        /* Safety Overlay */
        .overlay { display:none; position:absolute; inset:0; background:rgba(0,0,0,0.9); z-index:10; flex-direction:column; align-items:center; justify-content:center; padding:20px; border-radius:16px; }
        .overlay.show { display:flex; }
        .ov-title { font-size:13px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; text-align:center; }
        .ov-sub { font-size:11px; color:rgba(255,255,255,0.6); margin-bottom:16px; text-align:center; }
        .ov-count { font-size:40px; font-weight:900; margin-bottom:16px; }
        .ov-msg { font-size:12px; background:rgba(244,67,54,0.15); border:1px solid rgba(244,67,54,0.4); border-radius:8px; padding:10px 14px; color:#f44336; margin-bottom:16px; text-align:center; line-height:1.6; }
        .ov-btn-row { display:flex; gap:10px; width:100%; }
        .ov-btn { flex:1; padding:10px; border:none; border-radius:10px; font-size:12px; font-weight:900; cursor:pointer; letter-spacing:0.5px; text-transform:uppercase; }
        .ov-btn.cancel { background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7); }
        .ov-btn.confirm { background:#f44336; color:#fff; }
        .ov-timeout { font-size:10px; color:rgba(255,255,255,0.4); margin-top:10px; }
      </style>
      <ha-card>
        <div style="position:relative;">
          <div class="header">
            <div class="title" id="title"></div>
            <div class="toggle-wrap" id="toggle-wrap">
              <span class="toggle-label" id="lbl-manual">THỦ CÔNG</span>
              <div class="toggle-track" id="toggle-track"><div class="toggle-thumb"></div></div>
              <span class="toggle-label active" id="lbl-auto">TỰ ĐỘNG</span>
            </div>
          </div>

          <div class="meter" id="meter1" data-meter="1">
            <div class="meter-row">
              <div class="meter-name" id="m1-name"></div>
              <div style="text-align:right">
                <div class="meter-value" id="m1-val"></div>
                <div class="meter-sub" id="m1-sub"></div>
              </div>
            </div>
            <div class="bar-wrap"><div class="bar-fill" id="m1-bar"></div></div>
          </div>

          <div class="meter" id="meter2" data-meter="2">
            <div class="meter-row">
              <div class="meter-name" id="m2-name"></div>
              <div style="text-align:right">
                <div class="meter-value" id="m2-val"></div>
                <div class="meter-sub" id="m2-sub"></div>
              </div>
            </div>
            <div class="bar-wrap"><div class="bar-fill" id="m2-bar"></div></div>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-label">TỔNG ĐIỆN</div>
              <div class="stat-value" id="s-kwh"></div>
            </div>
            <div class="stat">
              <div class="stat-label">TỔNG TIỀN</div>
              <div class="stat-value cost" id="s-cost"></div>
            </div>
            <div class="stat">
              <div class="stat-label">TIẾT KIỆM</div>
              <div class="stat-value savings" id="s-save"></div>
            </div>
          </div>

          <div class="forecast">
            <div class="forecast-label">🔮 DỰ BÁO CUỐI THÁNG</div>
            <div class="forecast-value" id="s-forecast"></div>
          </div>

          <!-- Safety Overlay -->
          <div class="overlay" id="overlay">
            <div class="ov-title" id="ov-title"></div>
            <div class="ov-sub" id="ov-sub"></div>
            <div class="ov-count" id="ov-count"></div>
            <div class="ov-msg" id="ov-msg" style="display:none"></div>
            <div class="ov-btn-row" id="ov-btns" style="display:none">
              <button class="ov-btn cancel" id="ov-cancel">✕ HỦY</button>
              <button class="ov-btn confirm" id="ov-confirm">⚡ XÁC NHẬN ĐẢO</button>
            </div>
            <div class="ov-timeout" id="ov-timeout"></div>
          </div>
        </div>
      </ha-card>`;

    // Toggle auto/manual
    this.shadowRoot.getElementById('toggle-wrap').addEventListener('click', () => {
      const cfg = this._config;
      if (cfg.entities?.auto_mode) {
        this._hass.callService('switch', 'toggle', { entity_id: cfg.entities.auto_mode });
      }
    });

    // Meter click → safety protocol
    ['meter1','meter2'].forEach(id => {
      this.shadowRoot.getElementById(id).addEventListener('click', () => {
        if (this._safetyState !== 0) return;
        this._startSafety();
      });
    });

    this.shadowRoot.getElementById('ov-cancel').addEventListener('click', () => this._resetSafety());
    this.shadowRoot.getElementById('ov-confirm').addEventListener('click', () => this._phase3());
  }

  _getState(eid) {
    if (!eid || !this._hass) return null;
    const s = this._hass.states[eid];
    return s ? s.state : null;
  }

  _getNum(eid) { return parseFloat(this._getState(eid)) || 0; }

  _update() {
    if (!this._initialized || this._safetyState !== 0) return;
    const cfg = this._config;
    const e = cfg.entities || {};
    const vat = cfg.vat ?? 8;
    const billingDay = cfg.billing_day ?? 1;
    const switchOnIs = cfg.switch_on_is ?? 'meter1';

    const kwh1 = this._getNum(e.meter1_kwh);
    const kwh2 = this._getNum(e.meter2_kwh);
    const calc1 = calcTierAndCost(kwh1, vat);
    const calc2 = calcTierAndCost(kwh2, vat);
    const totalKwh = kwh1 + kwh2;
    const totalCost = calc1.cost + calc2.cost;
    const singleCost = calcTierAndCost(totalKwh, vat).cost;
    const savings = singleCost - totalCost;

    const { passed, total } = getDayInfo(billingDay);
    const forecastKwh = (totalKwh / passed) * total;
    const forecastCost = calcTierAndCost(forecastKwh, vat).cost;

    // Determine active meter from switch state
    const swState = this._getState(e.physical_switch);
    let activeMeter = null;
    if (swState === 'on') activeMeter = switchOnIs;
    else if (swState === 'off') activeMeter = switchOnIs === 'meter1' ? 'meter2' : 'meter1';

    // Auto mode
    const autoOn = this._getState(e.auto_mode) === 'on';

    // Progress bar width (capped at tier limit)
    const barPct = (kwh, info) => {
      const tierLimits = [50, 100, 200, 300, 400];
      const tierMax = tierLimits[info.tier - 1] ?? 400;
      const tierMin = info.tier > 1 ? tierLimits[info.tier - 2] : 0;
      return Math.min(100, Math.round(((kwh - tierMin) / (tierMax - tierMin)) * 100));
    };

    const $ = id => this.shadowRoot.getElementById(id);
    $('title').textContent = cfg.title || 'ĐIỀU KHIỂN ĐIỆN';

    // Toggle
    const track = $('toggle-track');
    track.className = 'toggle-track' + (autoOn ? ' on' : '');
    $('lbl-auto').className = 'toggle-label' + (autoOn ? ' active' : '');
    $('lbl-manual').className = 'toggle-label' + (!autoOn ? ' active' : '');

    // Meter 1
    $('m1-name').textContent = e.meter1_name || 'Công tơ 1';
    $('m1-val').textContent = `${fmtKwh(kwh1)} | ${fmt(calc1.cost)}`;
    $('m1-sub').textContent = `Bậc ${calc1.tier}`;
    const b1 = $('m1-bar');
    b1.style.width = barPct(kwh1, calc1) + '%';
    b1.className = `bar-fill t${calc1.tier}`;
    $('meter1').className = 'meter' + (activeMeter === 'meter1' ? ' active' : '');

    // Meter 2
    $('m2-name').textContent = e.meter2_name || 'Công tơ 2';
    $('m2-val').textContent = `${fmtKwh(kwh2)} | ${fmt(calc2.cost)}`;
    $('m2-sub').textContent = `Bậc ${calc2.tier}`;
    const b2 = $('m2-bar');
    b2.style.width = barPct(kwh2, calc2) + '%';
    b2.className = `bar-fill t${calc2.tier}`;
    $('meter2').className = 'meter' + (activeMeter === 'meter2' ? ' active' : '');

    // Stats
    $('s-kwh').textContent = fmtKwh(totalKwh);
    $('s-cost').textContent = fmt(totalCost);
    $('s-save').textContent = fmt(Math.max(0, savings));
    $('s-forecast').textContent = `${fmtKwh(forecastKwh)} | ${fmt(forecastCost)}`;
  }

  _startSafety() {
    this._safetyState = 1;
    this._countdown = 5;
    const $ = id => this.shadowRoot.getElementById(id);
    $('overlay').className = 'overlay show';
    $('ov-title').textContent = '⚡ CHUẨN BỊ ĐẢO NGUỒN';
    $('ov-title').style.color = '#ff9800';
    $('ov-sub').textContent = 'Chờ đếm ngược để tránh nhấn nhầm';
    $('ov-msg').style.display = 'none';
    $('ov-btns').style.display = 'none';
    $('ov-timeout').textContent = '';

    clearInterval(this._interval);
    this._interval = setInterval(() => {
      $('ov-count').textContent = this._countdown + 's';
      $('ov-count').style.color = '#ff9800';
      if (this._countdown-- <= 0) {
        clearInterval(this._interval);
        this._phase2();
      }
    }, 1000);
  }

  _phase2() {
    this._safetyState = 2;
    this._countdown = 10;
    const $ = id => this.shadowRoot.getElementById(id);
    $('ov-title').textContent = '⚠️ XÁC NHẬN ĐẢO ĐIỆN';
    $('ov-title').style.color = '#f44336';
    $('ov-sub').textContent = 'Hành động này sẽ ngắt điện tạm thời';
    $('ov-msg').style.display = 'block';
    $('ov-msg').textContent = '⚠️ Đảm bảo không có thiết bị nhạy cảm đang hoạt động. Tắt điều hòa, máy tính trước khi đảo nguồn!';
    $('ov-btns').style.display = 'flex';

    clearInterval(this._interval);
    this._interval = setInterval(() => {
      $('ov-count').textContent = this._countdown + 's';
      $('ov-count').style.color = '#f44336';
      $('ov-timeout').textContent = `Tự động hủy sau ${this._countdown}s`;
      if (this._countdown-- <= 0) {
        clearInterval(this._interval);
        this._resetSafety();
      }
    }, 1000);
  }

  _phase3() {
    clearInterval(this._interval);
    this._safetyState = 3;
    this._countdown = 3;
    const $ = id => this.shadowRoot.getElementById(id);
    $('ov-title').textContent = '🔄 ĐANG THỰC HIỆN ĐẢO ĐIỆN';
    $('ov-title').style.color = '#4caf50';
    $('ov-sub').textContent = 'Vui lòng không tắt điện nguồn...';
    $('ov-msg').style.display = 'none';
    $('ov-btns').style.display = 'none';
    $('ov-timeout').textContent = '';

    this._interval = setInterval(() => {
      $('ov-count').textContent = this._countdown + 's';
      $('ov-count').style.color = '#4caf50';
      if (this._countdown-- <= 0) {
        clearInterval(this._interval);
        const sw = this._config.entities?.physical_switch;
        if (sw) this._hass.callService('switch', 'toggle', { entity_id: sw });
        setTimeout(() => this._resetSafety(), 1000);
      }
    }, 1000);
  }

  _resetSafety() {
    clearInterval(this._interval);
    this._safetyState = 0;
    this.shadowRoot.getElementById('overlay').className = 'overlay';
    this._update();
  }

  getCardSize() { return 6; }
}

customElements.define('meter-switcher-card', MeterSwitcherCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'meter-switcher-card',
  name: 'Meter Switcher Card',
  description: 'Quản lý và đảo nguồn giữa 2 công tơ điện với quy trình an toàn 3 bước.',
  preview: false,
});
