"""The Meter Switcher Helper integration."""
from __future__ import annotations

import logging
from pathlib import Path
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .coordinator import MeterSwitcherCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.SWITCH]

CARD_URL = "/meter-switcher/card.js"
CARD_PATH = Path(__file__).parent / "www" / "meter-switcher-card.js"

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Meter Switcher Helper from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Đăng ký đường dẫn tĩnh cho Lovelace Card
    try:
        from homeassistant.components.http import StaticPathConfig
        await hass.http.async_register_static_paths([
            StaticPathConfig(CARD_URL, str(CARD_PATH), True)
        ])
        _LOGGER.info("Meter Switcher Card registered at %s", CARD_URL)
    except Exception as err:
        _LOGGER.warning("Could not register card static path: %s", err)

    coordinator = MeterSwitcherCoordinator(hass, entry)
    coordinator.async_setup_trackers()
    
    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok
