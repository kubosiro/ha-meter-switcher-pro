"""Switch platform for Meter Switcher Helper."""
from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, CONF_AUTO_SWITCH

async def async_setup_entry(hass, entry, async_add_entities):
    """Set up the switch platform."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([AutoSwitchMode(coordinator)])

class AutoSwitchMode(CoordinatorEntity, SwitchEntity):
    """Switch to enable/disable auto switching."""

    def __init__(self, coordinator):
        super().__init__(coordinator)
        self._attr_name = "Chế độ tự động đảo công tơ"
        self._attr_unique_id = f"{coordinator.entry.entry_id}_auto_switch_mode"
        self.entity_id = "switch.che_do_tu_dong_dao_cong_to"
        self._attr_icon = "mdi:robot"

    @property
    def is_on(self):
        return self.coordinator.auto_switch_enabled

    async def async_turn_on(self, **kwargs):
        self.coordinator.auto_switch_enabled = True
        # Update entry data so it persists
        new_data = dict(self.coordinator.entry.data)
        new_data[CONF_AUTO_SWITCH] = True
        self.hass.config_entries.async_update_entry(self.coordinator.entry, data=new_data)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs):
        self.coordinator.auto_switch_enabled = False
        new_data = dict(self.coordinator.entry.data)
        new_data[CONF_AUTO_SWITCH] = False
        self.hass.config_entries.async_update_entry(self.coordinator.entry, data=new_data)
        self.async_write_ha_state()
