"""Constants for the Meter Switcher Helper integration."""

DOMAIN = "meter_switcher"

CONF_METERS = "meters"
CONF_WARNING_THRESHOLD = "warning_threshold"
CONF_VAT = "vat"
CONF_BILLING_DAY = "billing_day"
CONF_PHYSICAL_SWITCH = "physical_switch" 
CONF_ON_METER = "on_meter" # Which meter is active when switch is ON
CONF_AUTO_SWITCH = "auto_switch" # This will be managed by the switch entity, not the config flow

DEFAULT_WARNING_THRESHOLD = 10.0
DEFAULT_VAT = 8.0
DEFAULT_BILLING_DAY = 1

DEFAULT_TIERS = [
    {"limit": 50, "price": 1984},
    {"limit": 100, "price": 2050},
    {"limit": 200, "price": 2380},
    {"limit": 300, "price": 2998},
    {"limit": 400, "price": 3350},
    {"limit": None, "price": 3460},
]
