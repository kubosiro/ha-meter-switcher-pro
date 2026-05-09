"""The Meter Switcher Helper integration."""
from __future__ import annotations

import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .coordinator import MeterSwitcherCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.SWITCH]

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Meter Switcher Helper from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    coordinator = MeterSwitcherCoordinator(hass, entry)
    coordinator.async_setup_trackers()
    
    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Đăng ký đường dẫn tĩnh cho Card
    hass.http.register_static_path(
        "/meter-switcher/card.js",
        hass.config.path("custom_components/meter_switcher/www/meter-switcher-card.js"),
    )

    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok
