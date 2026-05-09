"""Coordinator for Meter Switcher Helper."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
import calendar

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_change
from homeassistant.components.switch import DOMAIN as SWITCH_DOMAIN, SERVICE_TOGGLE

from .const import (
    DOMAIN,
    DEFAULT_TIERS,
    CONF_METERS,
    CONF_WARNING_THRESHOLD,
    CONF_VAT,
    CONF_BILLING_DAY,
    CONF_PHYSICAL_SWITCH,
    CONF_AUTO_SWITCH,
    CONF_ON_METER,
)

_LOGGER = logging.getLogger(__name__)

class MeterSwitcherCoordinator(DataUpdateCoordinator):
    """Data coordinator for Meter Switcher Helper."""

    def __init__(self, hass: HomeAssistant, entry) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(minutes=30),
        )
        self.entry = entry
        self.meter_entities = entry.data[CONF_METERS]
        self.warning_threshold = entry.data.get(CONF_WARNING_THRESHOLD, 10.0)
        self.vat = entry.data.get(CONF_VAT, 8.0)
        self.billing_day = entry.data.get(CONF_BILLING_DAY, 1)
        self.physical_switch = entry.data.get(CONF_PHYSICAL_SWITCH)
        self.on_meter = entry.data.get(CONF_ON_METER)
        self.auto_switch_enabled = entry.data.get(CONF_AUTO_SWITCH, False)
        self.tiers = DEFAULT_TIERS
        
        self.data = {
            "meters": {},
            "recommendation": "N/A",
            "switch_warning": False,
            "total_consumption": 0.0,
            "total_cost": 0.0,
            "savings": 0.0,
            "forecast_kwh": 0.0,
            "forecast_cost": 0.0,
            "active_meter": None,
            "remaining_to_switch": 0.0
        }

    @callback
    def async_setup_trackers(self):
        """Set up trackers for the input sensors and switch."""
        entities_to_track = list(self.meter_entities)
        if self.physical_switch:
            entities_to_track.append(self.physical_switch)

        @callback
        def _handle_state_change(event):
            self.async_calculate_logic()

        self.entry.async_on_unload(
            async_track_state_change_event(
                self.hass, entities_to_track, _handle_state_change
            )
        )
        self.entry.async_on_unload(
            async_track_time_change(
                self.hass, self.async_check_auto_switch, hour=12, minute=0, second=0
            )
        )
        self.async_calculate_logic()

    async def async_check_auto_switch(self, _now=None):
        """Perform automatic switch if enabled and needed at 12:00 PM."""
        if not self.auto_switch_enabled or not self.physical_switch:
            return

        if self.data.get("switch_warning"):
            _LOGGER.info("Auto-switching meter at 12:00 PM due to threshold reached")
            await self.hass.services.async_call(
                SWITCH_DOMAIN,
                SERVICE_TOGGLE,
                {"entity_id": self.physical_switch},
            )

    async def _async_update_data(self):
        self.async_calculate_logic()
        return self.data

    def calculate_cost_and_tier(self, val):
        """Calculate cost, tier, and remaining kWh."""
        cost = 0.0
        current_tier = 1
        remaining = 0.0
        prev_limit = 0
        for i, tier in enumerate(self.tiers):
            limit = tier["limit"]
            price = tier["price"]
            if limit is None or val < limit:
                consumption_in_tier = max(0, val - prev_limit)
                cost += consumption_in_tier * price
                current_tier = i + 1
                remaining = limit - val if limit is not None else 0.0
                break
            else:
                consumption_in_tier = limit - prev_limit
                cost += consumption_in_tier * price
                prev_limit = limit
        total_cost = cost * (1 + self.vat / 100)
        warn = (remaining > 0 and remaining <= self.warning_threshold)
        return {"val": val, "tier": current_tier, "remaining": remaining, "warn": warn, "cost": total_cost}

    def get_days_in_cycle(self):
        now = datetime.now()
        year, month = now.year, now.month
        if now.day >= self.billing_day:
            start_date = datetime(year, month, self.billing_day)
        else:
            prev_m = month - 1 if month > 1 else 12
            prev_y = year if month > 1 else year - 1
            start_date = datetime(prev_y, prev_m, min(self.billing_day, calendar.monthrange(prev_y, prev_m)[1]))
        next_m = month + 1 if month < 12 else 1
        next_y = year if month < 12 else year + 1
        if now.day >= self.billing_day:
            end_date = datetime(next_y, next_m, min(self.billing_day, calendar.monthrange(next_y, next_m)[1]))
        else:
            end_date = datetime(year, month, min(self.billing_day, calendar.monthrange(year, month)[1]))
        return max(0.1, (now - start_date).total_seconds() / 86400), (end_date - start_date).total_seconds() / 86400

    @callback
    def async_calculate_logic(self):
        meters_data = {}
        total_consumption = 0.0
        total_cost = 0.0
        
        for entity_id in self.meter_entities:
            state = self.hass.states.get(entity_id)
            try:
                val = float(state.state) if state and state.state not in ['unknown', 'unavailable'] else 0.0
            except ValueError:
                val = 0.0
            info = self.calculate_cost_and_tier(val)
            meters_data[entity_id] = info
            total_consumption += val
            total_cost += info["cost"]

        single_meter_info = self.calculate_cost_and_tier(total_consumption)
        savings = single_meter_info["cost"] - total_cost

        days_passed, total_days = self.get_days_in_cycle()
        forecast_kwh = (total_consumption / days_passed) * total_days
        forecast_info = self.calculate_cost_and_tier(forecast_kwh)

        active_meter = None
        remaining_to_switch = 0.0
        if self.physical_switch:
            switch_state = self.hass.states.get(self.physical_switch)
            if switch_state:
                # Use mapping from config
                if switch_state.state == 'on':
                    active_meter = self.on_meter
                elif switch_state.state == 'off':
                    # Active meter is the one that's NOT self.on_meter
                    others = [m for m in self.meter_entities if m != self.on_meter]
                    active_meter = others[0] if others else None
                
                if active_meter in meters_data:
                    remaining_to_switch = meters_data[active_meter]["remaining"]

        best_meter = None
        min_tier = 99
        min_val = 999999
        for eid, data in meters_data.items():
            if data["tier"] < min_tier or (data["tier"] == min_tier and data["val"] < min_val):
                min_tier, best_meter, min_val = data["tier"], eid, data["val"]

        rec_name = "N/A"
        if best_meter:
            best_state = self.hass.states.get(best_meter)
            rec_name = best_state.name if best_state else best_meter

        switch_warning = False
        if active_meter and active_meter in meters_data:
            if meters_data[active_meter]["warn"] and best_meter != active_meter:
                switch_warning = True

        self.data = {
            "meters": meters_data,
            "recommendation": rec_name,
            "switch_warning": switch_warning,
            "total_consumption": total_consumption,
            "total_cost": total_cost,
            "savings": savings,
            "forecast_kwh": forecast_kwh,
            "forecast_cost": forecast_info["cost"],
            "active_meter": active_meter,
            "remaining_to_switch": remaining_to_switch
        }
        self.async_set_updated_data(self.data)
