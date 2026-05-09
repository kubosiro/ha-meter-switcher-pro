"""Config flow for Meter Switcher Helper integration."""
from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
import homeassistant.helpers.config_validation as cv

from .const import (
    DOMAIN,
    CONF_METERS,
    CONF_WARNING_THRESHOLD,
    DEFAULT_WARNING_THRESHOLD,
    CONF_VAT,
    DEFAULT_VAT,
    CONF_BILLING_DAY,
    DEFAULT_BILLING_DAY,
    CONF_PHYSICAL_SWITCH,
    CONF_ON_METER,
)

class MeterSwitcherConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Meter Switcher Helper."""

    VERSION = 1

    def __init__(self):
        self.data = {}

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if user_input is not None:
            self.data.update(user_input)
            if self.data.get(CONF_PHYSICAL_SWITCH):
                return await self.async_step_mapping()
            return self.async_create_entry(title="Meter Switcher Advisor", data=self.data)

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_METERS): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="sensor", multiple=True)
                ),
                vol.Optional(CONF_PHYSICAL_SWITCH): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="switch")
                ),
                vol.Optional(CONF_BILLING_DAY, default=DEFAULT_BILLING_DAY): vol.All(vol.Coerce(int), vol.Range(min=1, max=31)),
                vol.Optional(CONF_WARNING_THRESHOLD, default=DEFAULT_WARNING_THRESHOLD): vol.Coerce(float),
                vol.Optional(CONF_VAT, default=DEFAULT_VAT): vol.Coerce(float),
            }),
        )

    async def async_step_mapping(self, user_input=None):
        """Step to map switch state to meters."""
        if user_input is not None:
            self.data.update(user_input)
            return self.async_create_entry(title="Meter Switcher Advisor", data=self.data)

        meter_options = []
        for eid in self.data[CONF_METERS]:
            state = self.hass.states.get(eid)
            name = state.name if state else eid
            meter_options.append({"value": eid, "label": name})

        return self.async_show_form(
            step_id="mapping",
            data_schema=vol.Schema({
                vol.Required(CONF_ON_METER): selector.SelectSelector(
                    selector.SelectSelectorConfig(options=meter_options)
                ),
            }),
            description_placeholders={"info": "Chọn công tơ sẽ hoạt động khi Switch ở trạng thái ON"},
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return MeterSwitcherOptionsFlowHandler(config_entry)


class MeterSwitcherOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for Meter Switcher Helper."""

    def __init__(self, config_entry):
        self.options = dict(config_entry.data)

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        if user_input is not None:
            self.options.update(user_input)
            if self.options.get(CONF_PHYSICAL_SWITCH):
                return await self.async_step_mapping()
            return self.async_create_entry(title="", data=self.options)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_METERS,
                    default=self.options.get(CONF_METERS, []),
                ): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="sensor", multiple=True)
                ),
                vol.Optional(
                    CONF_PHYSICAL_SWITCH,
                    default=self.options.get(CONF_PHYSICAL_SWITCH),
                ): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="switch")
                ),
                vol.Optional(
                    CONF_BILLING_DAY,
                    default=self.options.get(CONF_BILLING_DAY, DEFAULT_BILLING_DAY)
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=31)),
                vol.Optional(
                    CONF_WARNING_THRESHOLD,
                    default=self.options.get(CONF_WARNING_THRESHOLD, DEFAULT_WARNING_THRESHOLD),
                ): vol.Coerce(float),
                vol.Optional(
                    CONF_VAT,
                    default=self.options.get(CONF_VAT, DEFAULT_VAT)
                ): vol.Coerce(float),
            }),
        )

    async def async_step_mapping(self, user_input=None):
        """Step to map switch state to meters."""
        if user_input is not None:
            self.options.update(user_input)
            return self.async_create_entry(title="", data=self.options)

        meter_options = []
        for eid in self.options[CONF_METERS]:
            state = self.hass.states.get(eid)
            name = state.name if state else eid
            meter_options.append({"value": eid, "label": name})

        return self.async_show_form(
            step_id="mapping",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_ON_METER,
                    default=self.options.get(CONF_ON_METER)
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(options=meter_options)
                ),
            }),
        )
