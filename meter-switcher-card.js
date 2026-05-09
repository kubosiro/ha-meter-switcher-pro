class MeterSwitcherCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div id="container" style="padding: 16px; font-family: 'Roboto', sans-serif; color: var(--primary-text-color); position: relative;">
            <style>
              .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
              .card-title { font-weight: 900; font-size: 15px; letter-spacing: 0.5px; color: var(--primary-color); margin: 0; white-space: nowrap; }
              
              /* Custom Small Switch */
              .switch-wrap { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; padding: 4px 10px; background: rgba(255,255,255,0.06); border-radius: 15px; }
              .switch-label { font-size: 10px; font-weight: 900; color: #aaa; }
              .switch-label.active { color: #2196f3; }
              
              .custom-switch { position: relative; width: 30px; height: 16px; background: #444; border-radius: 10px; transition: 0.3s; }
              .custom-switch::after { content: ""; position: absolute; width: 12px; height: 12px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: 0.3s; }
              .switch-wrap.on .custom-switch { background: #2196f3; }
              .switch-wrap.on .custom-switch::after { left: 16px; }
              
              .meter-box { padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.03); margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.5s; cursor: pointer; position: relative; overflow: hidden; }
              .meter-box.active { background: rgba(33, 150, 243, 0.08); border-color: rgba(33, 150, 243, 0.4); box-shadow: 0 4px 20px rgba(33, 150, 243, 0.15); }
              
              .meter-data { display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; margin-bottom: 8px; pointer-events: none; }
              .meter-left { flex: 1; }
              .meter-right { text-align: right; }
              .meter-box.active .meter-left { color: #2196f3; }
              
              .bar-outer { height: 10px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden; margin-right: 10px; flex: 1; pointer-events: none; }
              .bar-inner { height: 100%; transition: width 1s; position: relative; }
              
              .meter-box.active .bar-inner::after {
                content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shimmer 2s infinite;
              }
              @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
              
              .tier-row { display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
              .tier-text { font-size: 11px; font-weight: 900; opacity: 0.8; }
              
              .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 15px 0; }
              .stat-card { background: rgba(255,255,255,0.02); padding: 10px 4px; border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.04); }
              .stat-label { font-size: 9px; opacity: 0.5; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
              .stat-value { font-size: 12px; font-weight: 900; }
              
              .forecast { padding: 12px; background: rgba(255, 152, 0, 0.05); border-radius: 12px; border: 1px solid rgba(255, 152, 0, 0.15); display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
              .forecast-val { font-weight: 900; color: #ff9800; }

              .safety-zone { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.96); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; border-radius: 12px; animation: fadeIn 0.3s; box-sizing: border-box; border: 2px solid #ff9800; }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              .safety-msg { font-size: 13px; font-weight: 900; color: #ff9800; margin-bottom: 15px; line-height: 1.4; }
              .safety-btn { padding: 12px 24px; border-radius: 24px; border: none; font-weight: 900; cursor: pointer; margin: 8px; font-size: 12px; width: 100%; max-width: 220px; }
              .btn-confirm { background: #f44336; color: white; box-shadow: 0 4px 10px rgba(244, 67, 54, 0.4); }
              .btn-cancel { background: #424242; color: white; }
              .blink { animation: blinker 1s linear infinite; }
              @keyframes blinker { 50% { opacity: 0.4; } }
            </style>
            <div id="safety-layer"></div>
            <div id="card-content"></div>
          </div>
        </ha-card>
      `;
      this.content = this.querySelector('#card-content');
      this.safetyLayer = this.querySelector('#safety-layer');
    }

    this._render();
  }

  _render() {
    const hass = this._hass;
    const config = this._config;
    const entities = config.entities;
    if (!hass || !config) return;

    const getVal = (eid) => hass.states[eid] ? hass.states[eid].state : 'N/A';
    const formatMoney = (val) => isNaN(val) ? 'N/A' : new Intl.NumberFormat('vi-VN').format(Math.round(parseFloat(val))) + 'đ';
    const formatKwh = (val) => isNaN(val) ? 'N/A' : parseFloat(val).toFixed(1) + ' kWh';

    const m1_val = getVal(entities.meter1_kwh); const m1_tier = getVal(entities.meter1_bac); const m1_cost = getVal(entities.meter1_cost);
    const m2_val = getVal(entities.meter2_kwh); const m2_tier = getVal(entities.meter2_bac); const m2_cost = getVal(entities.meter2_cost);
    
    const active_raw = getVal(entities.active_meter);
    const auto_mode = getVal(entities.auto_mode) === 'on';
    const m1_name = config.entities.meter1_name || "ĐH 1"; const m2_name = config.entities.meter2_name || "ĐH 2";
    const is_m1_active = active_raw.includes('4676') || active_raw.includes(m1_name);
    const is_m2_active = active_raw.includes('72144') || active_raw.includes(m2_name);

    // Render Safety Layer
    if (this._safetyState > 0) {
      let msg = "", buttons = "";
      if (this._safetyState === 1) {
        msg = `<div class="safety-msg">ĐANG CHUẨN BỊ CHUYỂN SANG<br><span style="color:#fff; font-size:18px;">${this._targetName}</span><br><br><span style="font-size:32px;">${this._timer}s</span></div>`;
        buttons = `<button class="safety-btn btn-cancel" id="safety-cancel">HỦY LỆNH</button>`;
      } else if (this._safetyState === 2) {
        msg = `<div class="safety-msg blink" style="color:#f44336; font-size:15px;">⚠️ CẢNH BÁO NGUY HIỂM<br><span style="color:#fff; font-size:13px;">Cẩn trọng nếu đang có tải lớn!</span></div>`;
        buttons = `<button class="safety-btn btn-confirm" id="safety-confirm">XÁC NHẬN ĐẢO ĐIỆN (${this._timer}s)</button><button class="safety-btn btn-cancel" id="safety-cancel">HỦY</button>`;
      } else if (this._safetyState === 3) {
        msg = `<div class="safety-msg">⚡ ĐANG THỰC THI ĐẢO ĐIỆN<br><span style="font-size:32px; color:#fff;">${this._timer}s</span></div>`;
        buttons = `<button class="safety-btn btn-cancel" id="safety-cancel">DỪNG NGAY</button>`;
      }
      this.safetyLayer.innerHTML = `<div class="safety-zone" style="border-color: ${this._safetyState === 2 ? '#f44336' : '#ff9800'};">${msg}${buttons}</div>`;
      this.safetyLayer.querySelector('#safety-cancel')?.addEventListener('click', (e) => { e.stopPropagation(); this._resetSafety(); });
      this.safetyLayer.querySelector('#safety-confirm')?.addEventListener('click', (e) => { e.stopPropagation(); this._startExecution(); });
    } else {
      this.safetyLayer.innerHTML = "";
    }

    this.content.innerHTML = `
      <div class="header-row">
        <h3 class="card-title">${config.title || "METER SWITCHER PRO"}</h3>
        <div class="switch-wrap ${auto_mode ? 'on' : ''}" id="auto-trigger">
          <span class="switch-label ${auto_mode ? 'active' : ''}">${auto_mode ? '🤖 TỰ ĐỘNG' : '✋ THỦ CÔNG'}</span>
          <div class="custom-switch"></div>
        </div>
      </div>

      <div class="meter-box ${is_m1_active ? 'active' : ''}" id="m1-click">
        <div class="meter-data"><div class="meter-left">${m1_name}</div><div class="meter-right">${formatKwh(m1_val)} | ${formatMoney(m1_cost)}</div></div>
        <div class="tier-row">
          <div class="bar-outer"><div class="bar-inner" style="width:${this._calcProg(m1_val, m1_tier).percent}%; background:${this._calcProg(m1_val, m1_tier).color};"></div></div>
          <div class="tier-text">Bậc ${m1_tier}</div>
        </div>
      </div>

      <div class="meter-box ${is_m2_active ? 'active' : ''}" id="m2-click">
        <div class="meter-data"><div class="meter-left">${m2_name}</div><div class="meter-right">${formatKwh(m2_val)} | ${formatMoney(m2_cost)}</div></div>
        <div class="tier-row">
          <div class="bar-outer"><div class="bar-inner" style="width:${this._calcProg(m2_val, m2_tier).percent}%; background:${this._calcProg(m2_val, m2_tier).color};"></div></div>
          <div class="tier-text">Bậc ${m2_tier}</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Tổng điện</div><div class="stat-value">${formatKwh(getVal(entities.total_kwh))}</div></div>
        <div class="stat-card"><div class="stat-label">Tổng tiền</div><div class="stat-value" style="color:#2196f3;">${formatMoney(getVal(entities.total_cost))}</div></div>
        <div class="stat-card"><div class="stat-label">Tiết kiệm</div><div class="stat-value" style="color:#4caf50;">${formatMoney(getVal(entities.savings))}</div></div>
      </div>

      <div class="forecast">
        <span style="font-weight:900; opacity:0.6;">DỰ BÁO CUỐI THÁNG</span>
        <div class="forecast-val">${formatKwh(getVal(entities.forecast_kwh))} | ${formatMoney(getVal(entities.forecast_cost))}</div>
      </div>
    `;

    this.content.querySelector('#m1-click').addEventListener('click', () => this._handleMeterClick(m1_name, 'on', is_m1_active));
    this.content.querySelector('#m2-click').addEventListener('click', () => this._handleMeterClick(m2_name, 'off', is_m2_active));
    this.content.querySelector('#auto-trigger').addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleAuto(hass, entities.auto_mode);
    });
  }

  _calcProg(kwh, tier) {
    const val = parseFloat(kwh); const t = parseInt(tier);
    let min = 0, max = 50, color = '#4caf50';
    if (t === 2) { min = 50; max = 100; color = '#4caf50'; }
    else if (t === 3) { min = 100; max = 200; color = '#ffeb3b'; }
    else if (t === 4) { min = 200; max = 300; color = '#ff9800'; }
    else if (t === 5) { min = 300; max = 400; color = '#f44336'; }
    else if (t >= 6) { min = 400; max = 1000; color = '#b71c1c'; }
    return { percent: Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)), color };
  }

  _handleMeterClick(name, targetState, isActive) {
    if (isActive || this._safetyState > 0) return;
    this._targetName = name; this._targetState = targetState;
    this._safetyState = 1; this._timer = 5;
    this._startTimer(() => {
      this._safetyState = 2; this._timer = 10;
      this._startTimer(() => { this._resetSafety(); });
    });
  }

  _startExecution() {
    this._safetyState = 3; this._timer = 5;
    this._startTimer(() => { this._executeSwitch(); });
  }

  _executeSwitch() {
    const switchId = this._config.entities.physical_switch;
    if (this._hass.states[switchId].state !== this._targetState) {
      this._hass.callService('switch', 'toggle', { entity_id: switchId });
    }
    this._resetSafety();
  }

  _startTimer(onComplete) {
    clearInterval(this._interval); this._render();
    this._interval = setInterval(() => {
      this._timer--;
      if (this._timer <= 0) { clearInterval(this._interval); onComplete(); } else { this._render(); }
    }, 1000);
  }

  _resetSafety() { clearInterval(this._interval); this._safetyState = 0; this._render(); }
  _toggleAuto(hass, eid) { hass.callService('switch', 'toggle', { entity_id: eid }); }
  setConfig(config) { this._config = config; }
  getCardSize() { return 8; }
}
customElements.define('meter-switcher-card', MeterSwitcherCard);
