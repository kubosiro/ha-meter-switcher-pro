"""Binary sensor platform for Meter Switcher Helper."""
from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorDeviceClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN

async def async_setup_entry(hass, entry, async_add_entities):
    """Set up the binary sensor platform."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    
    async_add_entities([MeterSwitchWarningSensor(coordinator)])

class MeterSwitchWarningSensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor for switch warning."""

    def __init__(self, coordinator):
        """Initialize."""
        super().__init__(coordinator)
        self._attr_name = "Cảnh báo đổi công tơ"
        self._attr_unique_id = f"{coordinator.entry.entry_id}_switch_warning"
        self._attr_device_class = BinarySensorDeviceClass.PROBLEM
        self._attr_icon = "mdi:alert-decagram"

    @property
    def is_on(self):
        """Return true if warning is active."""
        return self.coordinator.data["switch_warning"]
