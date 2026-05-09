/**
 * Meter Switcher Card - Pure Frontend for Home Assistant
 * Version: 2.1.2
 */

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'meter-switcher-card')) {
  window.customCards.push({
    type: 'meter-switcher-card',
    name: 'Meter Switcher Card',
    description: 'Quản lý và đảo nguồn giữa 2 công tơ điện EVN với quy trình an toàn 3 bước.',
    preview: true,
    documentationURL: 'https://github.com/kubosiro/ha-meter-switcher-pro',
  });
}

const EVN_TIERS = [
  { limit: 50,   price: 1984 },
  { limit: 100,  price: 2050 },
  { limit: 200,  price: 2380 },
  { limit: 300,  price: 2998 },
  { limit: 400,  price: 3350 },
  { limit: null, price: 3460 },
];

function calcTierAndCost(kwh, vat = 8, tiers = EVN_TIERS) {
  let cost = 0, tier = 1, remaining = 0, prev = 0;
  for (let i = 0; i < tiers.length; i++) {
    const { limit, price } = tiers[i];
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

function getDayInfo(billingDay = 1) {
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
  const passed = Math.max(0.5, (now - start) / 86400000);
  const total  = (end - start) / 86400000;
  return { passed, total };
}

const fmt     = n => Math.round(n).toLocaleString('vi-VN') + 'đ';
const fmtKwh  = n => (+n || 0).toFixed(1) + ' kWh';
const tierCls = t => ['t1','t2','t3','t4','t5','t6'][Math.min(t-1,5)];

const CARD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
  :host { display: block; }
  ha-card {
    background: var(--ha-card-background, #1c1c1e);
    border-radius: 16px; padding: 14px 16px;
    font-family: 'Roboto', sans-serif; position: relative; overflow: hidden;
  }

  /* Header */
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:8px; }
  .title { font-size:13px; font-weight:900; letter-spacing:0.8px; color:var(--primary-color,#2196f3); text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* Toggle */
  .toggle-wrap { display:flex; align-items:center; gap:5px; cursor:pointer; user-select:none; flex-shrink:0; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); }
  .toggle-lbl { font-size:9px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.5px; transition:color .3s; }
  .toggle-lbl.on { color:var(--primary-color,#2196f3); }
  .toggle-track { position:relative; width:26px; height:14px; background:#444; border-radius:7px; transition:background .3s; flex-shrink:0; }
  .toggle-track.on { background:var(--primary-color,#2196f3); }
  .toggle-thumb { position:absolute; width:10px; height:10px; background:#fff; border-radius:50%; top:2px; left:2px; transition:left .3s; box-shadow:0 1px 3px rgba(0,0,0,.4); }
  .toggle-track.on .toggle-thumb { left:14px; }

  /* Meter box */
  .meter { border-radius:12px; padding:10px 12px; margin-bottom:8px; cursor:pointer; transition:all .3s; position:relative; overflow:hidden; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); }
  .meter.active { background:rgba(33,150,243,.12); border-color:rgba(33,150,243,.4); }
  .meter.warning { border-color:rgba(255,152,0,.5); background:rgba(255,152,0,.07); }
  .meter-row { display:flex; justify-content:space-between; align-items:center; }
  .meter-name { font-size:13px; font-weight:700; color:rgba(255,255,255,.85); }
  .meter.active .meter-name { color:#2196f3; }
  .meter.warning .meter-name { color:#ff9800; }
  .meter-info { text-align:right; }
  .meter-val { font-size:13px; font-weight:900; color:rgba(255,255,255,.95); }
  .meter-sub { font-size:10px; color:rgba(255,255,255,.45); margin-top:2px; display:flex; align-items:center; justify-content:flex-end; gap:6px; }
  .warn-badge { font-size:9px; font-weight:700; color:#ff4444; background:rgba(255,68,68,0.15); padding:1px 5px; border-radius:4px; }
  .warn-dot { width: 8px; height: 8px; background: #ff4444; border-radius: 50%; box-shadow: 0 0 8px #ff4444; animation: warn-pulse 1.2s infinite; display: inline-block; margin-left: 6px; vertical-align: middle; }
  @keyframes warn-pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }

  /* Bar */
  .bar-wrap { height:5px; background:rgba(255,255,255,.08); border-radius:3px; margin-top:8px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:3px; transition:width 1.2s ease; position:relative; }
  .bar-fill.t1,.bar-fill.t2 { background:#4caf50; }
  .bar-fill.t3 { background:#8bc34a; }
  .bar-fill.t4 { background:#ffc107; }
  .bar-fill.t5 { background:#ff9800; }
  .bar-fill.t6 { background:#f44336; }
  .bar-fill.is-warning { background: #ff4444 !important; box-shadow: 0 0 10px rgba(255,68,68,0.5); }
  .meter.active .bar-fill::after {
    content:''; position:absolute; top:0; left:-60%; width:40%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
    animation:shimmer 1.8s infinite;
  }
  @keyframes shimmer { 100% { left:140%; } }

  /* Stats */
  .stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:7px; margin:8px 0; }
  .stat { background:rgba(255,255,255,.05); border-radius:10px; padding:8px 6px; text-align:center; border:1px solid rgba(255,255,255,.04); }
  .stat-lbl { font-size:8px; font-weight:700; color:rgba(255,255,255,.4); text-transform:uppercase; letter-spacing:.5px; }
  .stat-val { font-size:13px; font-weight:900; color:rgba(255,255,255,.9); margin-top:3px; }
  .stat-val.cost { color:#ff9800; }
  .stat-val.save { color:#4caf50; }

  /* Forecast */
  .forecast { background:rgba(255,152,0,.08); border:1px solid rgba(255,152,0,.2); border-radius:10px; padding:9px 12px; display:flex; justify-content:space-between; align-items:center; }
  .fc-lbl { font-size:9px; font-weight:700; color:rgba(255,152,0,.8); text-transform:uppercase; letter-spacing:.5px; }
  .fc-val { font-size:12px; font-weight:900; color:#ff9800; }

  /* Auto-switch info */
  .auto-info { margin-top:7px; background:rgba(33,150,243,.06); border:1px solid rgba(33,150,243,.15); border-radius:10px; padding:7px 12px; display:flex; justify-content:space-between; align-items:center; }
  .ai-lbl { font-size:9px; font-weight:700; color:rgba(33,150,243,.7); text-transform:uppercase; letter-spacing:.5px; }
  .ai-val { font-size:11px; font-weight:900; color:#2196f3; }

  /* Safety Overlay */
  .overlay { display:none; position:absolute; inset:0; background:rgba(0,0,0,.93); z-index:10; flex-direction:column; align-items:center; justify-content:center; padding:20px; }
  .overlay.show { display:flex; }
  .ov-title { font-size:13px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; text-align:center; }
  .ov-sub { font-size:11px; color:rgba(255,255,255,.55); margin-bottom:14px; text-align:center; }
  .ov-count { font-size:46px; font-weight:900; margin-bottom:14px; line-height:1; }
  .ov-msg { font-size:12px; background:rgba(244,67,54,.12); border:1px solid rgba(244,67,54,.35); border-radius:8px; padding:10px 14px; color:#f44336; margin-bottom:14px; text-align:center; line-height:1.6; display:none; }
  .ov-btns { display:none; gap:10px; width:100%; }
  .ov-btn { flex:1; padding:10px; border:none; border-radius:10px; font-size:12px; font-weight:900; cursor:pointer; letter-spacing:.5px; text-transform:uppercase; font-family:'Roboto',sans-serif; }
  .ov-btn.cancel { background:rgba(255,255,255,.1); color:rgba(255,255,255,.7); }
  .ov-btn.confirm { background:#f44336; color:#fff; }
  .ov-hint { font-size:10px; color:rgba(255,255,255,.35); margin-top:10px; }
`;

const CARD_HTML = `
  <ha-card>
    <div class="header">
      <div class="title" id="title"></div>
      <div class="toggle-wrap" id="toggle-wrap">
        <span class="toggle-lbl" id="lbl-manual">THỦ CÔNG</span>
        <div class="toggle-track" id="toggle-track"><div class="toggle-thumb"></div></div>
        <span class="toggle-lbl" id="lbl-auto">TỰ ĐỘNG</span>
      </div>
    </div>

    <div class="meter" id="meter1">
      <div class="meter-row">
        <div class="meter-name" id="m1-name"></div>
        <div class="meter-info">
          <div class="meter-val" id="m1-val"></div>
          <div class="meter-sub"><span id="m1-tier"></span><div class="warn-dot" id="m1-dot" style="display:none"></div><span class="warn-badge" id="m1-warn" style="display:none">⚠ GẦN ĐẦY</span></div>
        </div>
      </div>
      <div class="bar-wrap"><div class="bar-fill" id="m1-bar"></div></div>
    </div>

    <div class="meter" id="meter2">
      <div class="meter-row">
        <div class="meter-name" id="m2-name"></div>
        <div class="meter-info">
          <div class="meter-val" id="m2-val"></div>
          <div class="meter-sub"><span id="m2-tier"></span><div class="warn-dot" id="m2-dot" style="display:none"></div><span class="warn-badge" id="m2-warn" style="display:none">⚠ GẦN ĐẦY</span></div>
        </div>
      </div>
      <div class="bar-wrap"><div class="bar-fill" id="m2-bar"></div></div>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-lbl">TỔNG ĐIỆN</div><div class="stat-val" id="s-kwh"></div></div>
      <div class="stat"><div class="stat-lbl">TỔNG TIỀN</div><div class="stat-val cost" id="s-cost"></div></div>
      <div class="stat"><div class="stat-lbl">TIẾT KIỆM</div><div class="stat-val save" id="s-save"></div></div>
    </div>

    <div class="forecast">
      <div class="fc-lbl">🔮 DỰ BÁO CUỐI THÁNG</div>
      <div class="fc-val" id="s-forecast"></div>
    </div>

    <div class="auto-info" id="auto-info">
      <div class="ai-lbl">⏰ TỰ ĐỘNG ĐẢO LÚC</div>
      <div class="ai-val" id="ai-val"></div>
    </div>

    <div class="overlay" id="overlay">
      <div class="ov-title" id="ov-title"></div>
      <div class="ov-sub" id="ov-sub"></div>
      <div class="ov-count" id="ov-count"></div>
      <div class="ov-msg" id="ov-msg"></div>
      <div class="ov-btns" id="ov-btns">
        <button class="ov-btn cancel" id="ov-cancel">✕ HỦY</button>
        <button class="ov-btn confirm" id="ov-confirm">⚡ XÁC NHẬN ĐẢO</button>
      </div>
      <div class="ov-hint" id="ov-hint"></div>
    </div>
  </ha-card>
`;

// ─── Visual Editor ──────────────────────────────────────────────────────────

class MeterSwitcherCardEditor extends HTMLElement {
  constructor() {
    super();
    this._curTab = 'config';
  }

  set hass(hass) { this._hass = hass; this._renderPickers(); }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    this._render();
  }

  _fire(cfg) {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }

  _set(path, value) {
    const cfg = JSON.parse(JSON.stringify(this._config || {}));
    const keys = path.split('.');
    let obj = cfg;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    if (value === '' || value === null || value === undefined) {
      delete obj[keys[keys.length - 1]];
    } else {
      obj[keys[keys.length - 1]] = value;
    }
    this._config = cfg;
    this._fire(cfg);
  }

  _render() {
    if (!this._config) return;
    const c = this._config;
    const e = c.entities || {};
    const tiers = c.tier_prices || EVN_TIERS;

    this.innerHTML = `
      <style>
        .editor { padding: 8px; font-family: var(--primary-font-family, sans-serif); }
        .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--divider-color); }
        .tab { padding: 8px 16px; cursor: pointer; font-size: 12px; font-weight: 700; color: var(--secondary-text-color); border-bottom: 2px solid transparent; transition: all .2s; }
        .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
        
        .section-title { font-size: 11px; font-weight: 700; color: var(--primary-color); text-transform: uppercase; letter-spacing: 0.8px; margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .field-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end; }
        .field { flex: 1; }
        label { display: block; font-size: 10px; color: var(--secondary-text-color); margin-bottom: 3px; font-weight: 600; }
        input[type=text], input[type=number], select {
          width: 100%; box-sizing: border-box; padding: 8px 10px;
          background: var(--secondary-background-color, #2c2c2e);
          border: 1px solid var(--divider-color, rgba(255,255,255,.1));
          border-radius: 8px; color: var(--primary-text-color); font-size: 12px;
        }
        .picker-slot { margin-bottom: 8px; }
        .tier-row { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; }
        .tier-num { font-size: 10px; color: var(--primary-color); font-weight: 700; width: 40px; }
        .btn-add { background: var(--primary-color); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; width: 100%; }
        .btn-del { background: rgba(255,68,68,0.2); color: #ff4444; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .hidden { display: none; }
      </style>
      <div class="editor">
        <div class="tabs">
          <div class="tab ${this._curTab === 'config' ? 'active' : ''}" data-tab="config">🔌 CẤU HÌNH</div>
          <div class="tab ${this._curTab === 'tiers' ? 'active' : ''}" data-tab="tiers">⚡ BẬC ĐIỆN</div>
          <div class="tab ${this._curTab === 'display' ? 'active' : ''}" data-tab="display">🎨 HIỂN THỊ</div>
        </div>

        <div id="tab-config" class="${this._curTab === 'config' ? '' : 'hidden'}">
          <div class="section-title">Thực thể bắt buộc</div>
          <div class="picker-slot"><label>Công tơ 1 kWh</label><div id="pk-meter1_kwh"></div></div>
          <div class="picker-slot"><label>Công tơ 2 kWh</label><div id="pk-meter2_kwh"></div></div>
          <div class="picker-slot"><label>Switch vật lý đảo nguồn</label><div id="pk-physical_switch"></div></div>
          
          <div class="section-title">Thực thể tùy chọn</div>
          <div class="picker-slot"><label>Tiền CT1 (NPC)</label><div id="pk-meter1_cost"></div></div>
          <div class="picker-slot"><label>Tiền CT2 (NPC)</label><div id="pk-meter2_cost"></div></div>
          <div class="picker-slot"><label>Công suất lưới (Grid)</label><div id="pk-grid_power"></div></div>
          <div class="picker-slot"><label>Switch chế độ Tự động</label><div id="pk-auto_mode"></div></div>
        </div>

        <div id="tab-tiers" class="${this._curTab === 'tiers' ? '' : 'hidden'}">
          <div class="section-title">Quản lý biểu giá điện</div>
          <div id="tiers-container">
            ${tiers.map((t, i) => `
              <div class="tier-row">
                <span class="tier-num">Bậc ${i+1}</span>
                <div class="field"><label>Đến (kWh)</label><input type="number" class="t-limit" data-idx="${i}" value="${t.limit || ''}" placeholder="Vô hạn"></div>
                <div class="field"><label>Giá (VNĐ)</label><input type="number" class="t-price" data-idx="${i}" value="${t.price}"></div>
                <button class="btn-del" data-idx="${i}">✕</button>
              </div>
            `).join('')}
          </div>
          <button class="btn-add" id="btn-add-tier">+ THÊM BẬC MỚI</button>
        </div>

        <div id="tab-display" class="${this._curTab === 'display' ? '' : 'hidden'}">
          <div class="section-title">Giao diện & Cảnh báo</div>
          <div class="field"><label>Tiêu đề Card</label><input type="text" id="title" value="${c.title || ''}"></div>
          <div class="field-row" style="margin-top:12px;">
            <div class="field"><label>Ngày chốt HĐ</label><input type="number" id="billing_day" value="${c.billing_day ?? 1}"></div>
            <div class="field"><label>Thuế VAT (%)</label><input type="number" id="vat" value="${c.vat ?? 8}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Chế độ cảnh báo</label>
              <select id="warning_mode">
                <option value="auto" ${(c.warning_mode || 'auto') === 'auto' ? 'selected' : ''}>Tự lấy trung bình ngày</option>
                <option value="manual" ${c.warning_mode === 'manual' ? 'selected' : ''}>Thủ công</option>
              </select>
            </div>
            ${c.warning_mode === 'manual' ? `<div class="field"><label>Ngưỡng (kWh)</label><input type="number" id="warning_threshold" value="${c.warning_threshold ?? 10}"></div>` : ''}
          </div>
          <div class="field-row">
             <div class="field"><label>Giờ tự động đảo</label><input type="number" id="auto_switch_hour" value="${c.auto_switch_hour ?? ''}"></div>
             <div class="field"><label>Switch ON là</label>
               <select id="switch_on_is">
                 <option value="meter1" ${(c.switch_on_is || 'meter1') === 'meter1' ? 'selected' : ''}>CT 1</option>
                 <option value="meter2" ${c.switch_on_is === 'meter2' ? 'selected' : ''}>CT 2</option>
               </select>
             </div>
          </div>
          <div class="section-title">Tên hiển thị</div>
          <div class="field-row">
            <div class="field"><label>Tên CT 1</label><input type="text" id="meter1_name" value="${e.meter1_name || ''}"></div>
            <div class="field"><label>Tên CT 2</label><input type="text" id="meter2_name" value="${e.meter2_name || ''}"></div>
          </div>
        </div>
      </div>`;

    this.querySelectorAll('.tab').forEach(t => {
      t.onclick = () => { this._curTab = t.dataset.tab; this._render(); };
    });

    const bind = (id, path, type) => {
      const el = this.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('change', () => {
        const v = type === 'number' ? (el.value === '' ? undefined : +el.value) : el.value;
        this._set(path, v);
      });
    };
    bind('title', 'title', 'text');
    bind('billing_day', 'billing_day', 'number');
    bind('vat', 'vat', 'number');
    bind('switch_on_is', 'switch_on_is', 'text');
    bind('warning_mode', 'warning_mode', 'text');
    bind('warning_threshold', 'warning_threshold', 'number');
    bind('auto_switch_hour', 'auto_switch_hour', 'number');
    bind('meter1_name', 'entities.meter1_name', 'text');
    bind('meter2_name', 'entities.meter2_name', 'text');

    this.querySelector('#btn-add-tier')?.addEventListener('click', () => {
      this._set('tier_prices', [...tiers, { limit: null, price: 0 }]);
    });
    this.querySelectorAll('.btn-del').forEach(btn => {
      btn.onclick = () => {
        this._set('tier_prices', tiers.filter((_, i) => i !== +btn.dataset.idx));
      };
    });
    this.querySelectorAll('.t-limit, .t-price').forEach(input => {
      input.addEventListener('change', () => {
        const newTiers = Array.from(this.querySelectorAll('.tier-row')).map(row => ({
          limit: row.querySelector('.t-limit').value === '' ? null : +row.querySelector('.t-limit').value,
          price: +row.querySelector('.t-price').value
        }));
        this._set('tier_prices', newTiers);
      });
    });

    this._renderPickers();
  }

  _renderPickers() {
    if (!this._hass || !this._config) return;
    const e = this._config.entities || {};
    const PICKERS = [
      { id: 'meter1_kwh',      domain: 'sensor' },
      { id: 'meter2_kwh',      domain: 'sensor' },
      { id: 'physical_switch', domain: 'switch' },
      { id: 'meter1_cost',     domain: 'sensor' },
      { id: 'meter2_cost',     domain: 'sensor' },
      { id: 'grid_power',      domain: 'sensor' },
      { id: 'auto_mode',       domain: 'switch' },
    ];
    for (const { id, domain } of PICKERS) {
      const slot = this.querySelector('#pk-' + id);
      if (!slot) continue;
      if (!slot.firstChild) {
        const pk = document.createElement('ha-entity-picker');
        pk.setAttribute('allow-custom-entity', '');
        pk.includeDomains = [domain];
        pk.value = e[id] || '';
        pk.hass  = this._hass;
        pk.addEventListener('value-changed', ev => this._set('entities.' + id, ev.detail.value));
        slot.appendChild(pk);
      } else {
        slot.firstChild.hass = this._hass;
        slot.firstChild.value = e[id] || '';
      }
    }
  }
}

customElements.define('meter-switcher-card-editor', MeterSwitcherCardEditor);


// ─── Main Card ──────────────────────────────────────────────────────────────

class MeterSwitcherCard extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._safetyState = 0;
    this._interval = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._initialized) {
      this._initialized = true;
      this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = CARD_CSS;
      this.shadowRoot.appendChild(style);
      const tpl = document.createElement('div');
      tpl.innerHTML = CARD_HTML;
      this.shadowRoot.appendChild(tpl.firstElementChild);
      this._bindEvents();
    }
    if (this._safetyState === 0) this._update();
  }

  _q(id) { return this.shadowRoot.getElementById(id); }

  _getNum(eid) {
    if (!eid) return 0;
    const s = this._hass.states[eid];
    return s ? (parseFloat(s.state) || 0) : 0;
  }

  _getSt(eid) {
    if (!eid) return null;
    const s = this._hass.states[eid];
    return s ? s.state : null;
  }

  _bindEvents() {
    this._q('toggle-wrap').addEventListener('click', () => {
      const am = this._config.entities?.auto_mode;
      if (am) this._hass.callService('switch', 'toggle', { entity_id: am });
    });
    ['meter1','meter2'].forEach(id => {
      this._q(id).addEventListener('click', () => {
        if (this._safetyState === 0) this._checkGridThenStart();
      });
    });
    this._q('ov-cancel').addEventListener('click', () => this._reset());
    this._q('ov-confirm').addEventListener('click', () => this._phase3());
  }

  _update() {
    const c  = this._config;
    const e  = c.entities || {};
    const vat         = c.vat         ?? 8;
    const billingDay  = c.billing_day  ?? 1;
    const autoHour    = c.auto_switch_hour ?? null;
    const tiers       = c.tier_prices || EVN_TIERS;
    const switchOnIs  = c.switch_on_is ?? 'meter1';

    const kwh1  = this._getNum(e.meter1_kwh);
    const kwh2  = this._getNum(e.meter2_kwh);
    const { passed, total } = getDayInfo(billingDay);

    // Dynamic Warning Threshold
    const avgDaily = Math.max(10, (kwh1 + kwh2) / passed);
    const threshold = c.warning_mode === 'manual' ? (c.warning_threshold ?? 10) : avgDaily;
    const calc1 = calcTierAndCost(kwh1, vat, tiers);
    const calc2 = calcTierAndCost(kwh2, vat, tiers);
    const cost1 = e.meter1_cost ? this._getNum(e.meter1_cost) : calc1.cost;
    const cost2 = e.meter2_cost ? this._getNum(e.meter2_cost) : calc2.cost;

    const totalKwh  = kwh1 + kwh2;
    const totalCost = cost1 + cost2;
    const savings   = Math.max(0, calcTierAndCost(totalKwh, vat, tiers).cost - totalCost);

    const { passed, total } = getDayInfo(billingDay);
    const fcKwh  = (totalKwh / passed) * total;
    const fcCost = calcTierAndCost(fcKwh, vat, tiers).cost;

    const swSt       = this._getSt(e.physical_switch);
    const activeMeter = swSt === 'on' ? switchOnIs : (switchOnIs === 'meter1' ? 'meter2' : 'meter1');
    const autoOn      = this._getSt(e.auto_mode) === 'on';

    const barPct = (kwh, calc) => {
      const tops = [50,100,200,300,400];
      const bot  = calc.tier > 1 ? tops[calc.tier-2] : 0;
      const top  = tops[calc.tier-1] ?? 400;
      return Math.min(100, Math.round(((kwh-bot)/(top-bot))*100));
    };

    const Q = id => this._q(id);

    Q('title').textContent = c.title || 'ĐIỀU KHIỂN ĐIỆN';

    // Toggle
    const isAuto = autoOn;
    Q('toggle-track').className = 'toggle-track' + (isAuto ? ' on' : '');
    Q('lbl-auto').className   = 'toggle-lbl' + (isAuto ? ' on' : '');
    Q('lbl-manual').className = 'toggle-lbl' + (!isAuto ? ' on' : '');

    // Meters
    const renderMeter = (n, kwh, calcR, costVal, active) => {
      const isWarn = calcR.remaining > 0 && calcR.remaining <= threshold;
      Q(`m${n}-name`).textContent = e[`meter${n}_name`] || `Công tơ ${n}`;
      Q(`m${n}-val`).textContent  = `${fmtKwh(kwh)} | ${fmt(costVal)}`;
      Q(`m${n}-tier`).textContent = `Bậc ${calcR.tier}`;
      Q(`m${n}-warn`).style.display = isWarn ? 'inline-block' : 'none';
      Q(`m${n}-dot`).style.display  = isWarn ? 'inline-block' : 'none';
      const bar = Q(`m${n}-bar`);
      bar.style.width = barPct(kwh, calcR) + '%';
      bar.className   = `bar-fill ${tierCls(calcR.tier)}` + (isWarn ? ' is-warning' : '');
      const box = Q(`meter${n}`);
      box.className = 'meter' + (active ? ' active' : '') + (isWarn ? ' warning' : '');
    };

    renderMeter(1, kwh1, calc1, cost1, activeMeter === 'meter1');
    renderMeter(2, kwh2, calc2, cost2, activeMeter === 'meter2');

    Q('s-kwh').textContent  = fmtKwh(totalKwh);
    Q('s-cost').textContent = fmt(totalCost);
    Q('s-save').textContent = fmt(savings);
    Q('s-forecast').textContent = `${fmtKwh(fcKwh)} | ${fmt(fcCost)}`;

    const ai = Q('auto-info');
    if (autoHour !== null) {
      ai.style.display = 'flex';
      const lbl = c.warning_mode === 'manual' ? `Báo trước ${threshold} kWh` : `Cảnh báo Auto (${threshold.toFixed(1)} kWh/ngày)`;
      Q('ai-val').textContent = `${String(autoHour).padStart(2,'0')}:00  •  ${lbl}`;
    } else {
      ai.style.display = 'none';
    }
  }

  _getGridWatts() {
    const eid = this._config.entities?.grid_power;
    if (!eid) return 0;
    const s = this._hass.states[eid];
    if (!s) return 0;
    const val  = parseFloat(s.state) || 0;
    const unit = (s.attributes?.unit_of_measurement || '').toLowerCase();
    return (unit === 'kw' || unit === 'kwh') ? val * 1000 : val;
  }

  _checkGridThenStart() {
    const watts = this._getGridWatts();
    if (watts > 0) {
      this._showGridWarning(watts);
      return;
    }
    this._phase1();
  }

  _showGridWarning(watts) {
    const Q = id => this._q(id);
    Q('overlay').className    = 'overlay show';
    Q('ov-title').textContent  = '⛔ ĐANG CÓ TẢI ĐIỆN';
    Q('ov-title').style.color  = '#f44336';
    Q('ov-count').textContent  = Math.round(watts) + ' W';
    Q('ov-count').style.color  = '#f44336';
    Q('ov-msg').style.display  = 'block';
    Q('ov-msg').textContent    = '⚠️ Vui lòng tắt tải điện trước khi đảo nguồn để tránh hư hỏng thiết bị và công tơ.';
    Q('ov-btns').style.display = 'none';
    Q('ov-hint').textContent   = 'Đang theo dõi tải... Sẽ thông báo khi tải về 0.';
    Q('ov-sub').textContent    = 'Chưa thể đảo nguồn';

    clearInterval(this._gridPollInterval);
    this._gridPollInterval = setInterval(() => {
      const w = this._getGridWatts();
      Q('ov-count').textContent = Math.round(w) + ' W';
      if (w <= 0) {
        clearInterval(this._gridPollInterval);
        Q('ov-title').textContent  = '✅ TẢI ĐÃ VỀ 0';
        Q('ov-title').style.color  = '#4caf50';
        Q('ov-count').style.color  = '#4caf50';
        Q('ov-sub').textContent    = 'Có thể tiến hành đảo nguồn';
        Q('ov-msg').style.display  = 'none';
        Q('ov-hint').textContent   = '';
        // Hiện nút Tiếp tục thay vì nút Xác nhận
        Q('ov-btns').style.display = 'flex';
        Q('ov-confirm').textContent = '▶ TIẾP TỤC ĐẢO';
        Q('ov-confirm').onclick = () => { Q('overlay').className = 'overlay'; this._phase1(); };
      }
    }, 2000);
  }

  _phase1() {
    this._safetyState = 1;
    this._countdown   = 5;
    const Q = id => this._q(id);
    Q('overlay').className   = 'overlay show';
    Q('ov-title').textContent = '⚡ CHUẨN BỊ ĐẢO NGUỒN';
    Q('ov-title').style.color = '#ff9800';
    Q('ov-sub').textContent   = 'Chờ đếm ngược để tránh thao tác nhầm';
    Q('ov-count').style.color = '#ff9800';
    Q('ov-msg').style.display  = 'none';
    Q('ov-btns').style.display = 'none';
    Q('ov-hint').textContent   = '';

    clearInterval(this._interval);
    this._interval = setInterval(() => {
      Q('ov-count').textContent = this._countdown-- + 's';
      if (this._countdown < 0) { clearInterval(this._interval); this._phase2(); }
    }, 1000);
  }

  _phase2() {
    this._safetyState = 2;
    this._countdown   = 10;
    const Q = id => this._q(id);
    Q('ov-title').textContent  = '⚠️ XÁC NHẬN ĐẢO ĐIỆN';
    Q('ov-title').style.color  = '#f44336';
    Q('ov-sub').textContent    = 'Hành động này sẽ ngắt điện tạm thời';
    Q('ov-count').style.color  = '#f44336';
    Q('ov-msg').style.display  = 'block';
    Q('ov-msg').textContent    = '⚠️ Đảm bảo không có thiết bị nhạy cảm đang hoạt động. Tắt điều hòa, máy tính trước khi đảo nguồn!';
    Q('ov-btns').style.display = 'flex';

    clearInterval(this._interval);
    this._interval = setInterval(() => {
      Q('ov-count').textContent = this._countdown + 's';
      Q('ov-hint').textContent  = `Tự động hủy sau ${this._countdown}s`;
      if (this._countdown-- <= 0) { clearInterval(this._interval); this._reset(); }
    }, 1000);
  }

  _phase3() {
    clearInterval(this._interval);
    this._safetyState = 3;
    this._countdown   = 3;
    const Q = id => this._q(id);
    Q('ov-title').textContent  = '🔄 ĐANG THỰC HIỆN';
    Q('ov-title').style.color  = '#4caf50';
    Q('ov-sub').textContent    = 'Vui lòng không tắt nguồn điện...';
    Q('ov-count').style.color  = '#4caf50';
    Q('ov-msg').style.display  = 'none';
    Q('ov-btns').style.display = 'none';
    Q('ov-hint').textContent   = '';

    this._interval = setInterval(() => {
      Q('ov-count').textContent = this._countdown + 's';
      if (this._countdown-- <= 0) {
        clearInterval(this._interval);
        const sw = this._config.entities?.physical_switch;
        if (sw) this._hass.callService('switch', 'toggle', { entity_id: sw });
        setTimeout(() => this._reset(), 1200);
      }
    }, 1000);
  }

  _reset() {
    clearInterval(this._interval);
    clearInterval(this._gridPollInterval);
    this._safetyState = 0;
    this._q('overlay').className = 'overlay';
    // Reset confirm button text in case it was changed by grid warning
    this._q('ov-confirm').textContent = '⚡ XÁC NHẬN ĐẢO';
    this._q('ov-confirm').onclick = () => this._phase3();
    this._update();
  }

  getCardSize() { return 6; }

  static getStubConfig() {
    return {
      title: 'TRẠM ĐIỀU KHIỂN ĐIỆN',
      billing_day: 1,
      vat: 8,
      switch_on_is: 'meter1',
      warning_mode: 'auto',
      entities: {
        meter1_name: 'Ông Mỵ',
        meter2_name: 'Hùng',
      }
    };
  }

  static getConfigElement() {
    return document.createElement('meter-switcher-card-editor');
  }
}

customElements.define('meter-switcher-card', MeterSwitcherCard);

// ─── HACS Registration ───────────────────────────────────────────────────────

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'meter-switcher-card',
  name: 'Meter Switcher Card',
  description: 'Quản lý và đảo nguồn giữa 2 công tơ điện EVN với quy trình an toàn 3 bước.',
  preview: false,
  documentationURL: 'https://github.com/kubosiro/ha-meter-switcher-pro',
});


