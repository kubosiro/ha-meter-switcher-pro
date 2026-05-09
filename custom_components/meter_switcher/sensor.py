"""Sensor platform for Meter Switcher Helper."""
from __future__ import annotations

from homeassistant.components.sensor import (
    SensorEntity,
    SensorStateClass,
    SensorDeviceClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import slugify

from .const import DOMAIN

async def async_setup_entry(hass, entry, async_add_entities):
    """Set up the sensor platform."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    
    entities = []
    # Per-meter sensors
    for entity_id in coordinator.meter_entities:
        entities.append(MeterTierSensor(coordinator, entity_id))
        entities.append(MeterConsumptionSensor(coordinator, entity_id))
        entities.append(MeterCostSensor(coordinator, entity_id))
        entities.append(MeterRemainingSensor(coordinator, entity_id))
    
    # Aggregate and Forecast sensors
    entities.append(MeterRecommendationSensor(coordinator))
    entities.append(TotalConsumptionSensor(coordinator))
    entities.append(TotalCostSensor(coordinator))
    entities.append(SavingsSensor(coordinator))
    entities.append(ForecastConsumptionSensor(coordinator))
    entities.append(ForecastCostSensor(coordinator))
    entities.append(ActiveMeterSensor(coordinator))
    entities.append(RemainingToSwitchSensor(coordinator))
    
    async_add_entities(entities)

class MeterTierSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, entity_id):
        super().__init__(coordinator); self.target_entity_id = entity_id
        slug = slugify(entity_id.split(".")[-1])
        self._attr_name = f"Tier {slug}"; self._attr_unique_id = f"{coordinator.entry.entry_id}_tier_{entity_id}"
        self.entity_id = f"sensor.{slug}_bac"
    @property
    def state(self): return self.coordinator.data["meters"].get(self.target_entity_id, {}).get("tier")

class MeterConsumptionSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, entity_id):
        super().__init__(coordinator); self.target_entity_id = entity_id
        slug = slugify(entity_id.split(".")[-1])
        self._attr_name = f"Usage {slug}"; self._attr_unique_id = f"{coordinator.entry.entry_id}_kwh_{entity_id}"
        self.entity_id = f"sensor.{slug}_tieu_thu"
        self._attr_native_unit_of_measurement = "kWh"; self._attr_state_class = SensorStateClass.TOTAL
    @property
    def native_value(self): return round(self.coordinator.data["meters"].get(self.target_entity_id, {}).get("val", 0), 2)

class MeterCostSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, entity_id):
        super().__init__(coordinator); self.target_entity_id = entity_id
        slug = slugify(entity_id.split(".")[-1])
        self._attr_name = f"Cost {slug}"; self._attr_unique_id = f"{coordinator.entry.entry_id}_cost_{entity_id}"
        self.entity_id = f"sensor.{slug}_tien_dien"
        self._attr_native_unit_of_measurement = "VND"; self._attr_device_class = SensorDeviceClass.MONETARY
    @property
    def native_value(self): return int(self.coordinator.data["meters"].get(self.target_entity_id, {}).get("cost", 0))

class MeterRemainingSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, entity_id):
        super().__init__(coordinator); self.target_entity_id = entity_id
        slug = slugify(entity_id.split(".")[-1])
        self._attr_name = f"Remaining {slug}"; self._attr_unique_id = f"{coordinator.entry.entry_id}_rem_{entity_id}"
        self.entity_id = f"sensor.{slug}_con_lai"
        self._attr_native_unit_of_measurement = "kWh"
    @property
    def native_value(self): return round(self.coordinator.data["meters"].get(self.target_entity_id, {}).get("remaining", 0), 2)

class TotalConsumptionSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Tổng tiêu thụ"; self._attr_unique_id = f"{coordinator.entry.entry_id}_total_consumption"
        self.entity_id = "sensor.tong_tieu_thu"
        self._attr_native_unit_of_measurement = "kWh"; self._attr_device_class = SensorDeviceClass.ENERGY
    @property
    def native_value(self): return round(self.coordinator.data["total_consumption"], 2)

class TotalCostSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Tổng tiền điện"; self._attr_unique_id = f"{coordinator.entry.entry_id}_total_cost"
        self.entity_id = "sensor.tong_tien_dien"
        self._attr_native_unit_of_measurement = "VND"
    @property
    def native_value(self): return int(self.coordinator.data["total_cost"])

class SavingsSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Tiền tiết kiệm"; self._attr_unique_id = f"{coordinator.entry.entry_id}_savings"
        self.entity_id = "sensor.tien_tiet_kiem"
        self._attr_native_unit_of_measurement = "VND"
    @property
    def native_value(self): return int(self.coordinator.data["savings"])

class ForecastConsumptionSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Dự báo tiêu thụ"; self._attr_unique_id = f"{coordinator.entry.entry_id}_forecast_kwh"
        self.entity_id = "sensor.du_bao_tieu_thu_cuoi_thang"
        self._attr_native_unit_of_measurement = "kWh"
    @property
    def native_value(self): return round(self.coordinator.data["forecast_kwh"], 2)

class ForecastCostSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Dự báo tiền điện"; self._attr_unique_id = f"{coordinator.entry.entry_id}_forecast_cost"
        self.entity_id = "sensor.du_bao_tien_dien_cuoi_thang"
        self._attr_native_unit_of_measurement = "VND"
    @property
    def native_value(self): return int(self.coordinator.data["forecast_cost"])

class ActiveMeterSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Công tơ đang dùng"; self._attr_unique_id = f"{coordinator.entry.entry_id}_active_meter"
        self.entity_id = "sensor.cong_to_dang_dung"
    @property
    def state(self): 
        eid = self.coordinator.data["active_meter"]
        if not eid: return "Không xác định"
        state = self.hass.states.get(eid)
        return state.name if state else eid

class RemainingToSwitchSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Số điện còn lại cần đổi"; self._attr_unique_id = f"{coordinator.entry.entry_id}_rem_to_switch"
        self.entity_id = "sensor.so_dien_con_lai_can_doi"
        self._attr_native_unit_of_measurement = "kWh"
    @property
    def native_value(self): return round(self.coordinator.data["remaining_to_switch"], 2)

class MeterRecommendationSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator); self._attr_name = "Khuyến nghị sử dụng"; self._attr_unique_id = f"{coordinator.entry.entry_id}_recommendation"
        self.entity_id = "sensor.khuyen_nghi_su_dung"
    @property
    def state(self): return self.coordinator.data["recommendation"]
