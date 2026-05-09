# ⚡ Meter Switcher Card for Home Assistant

**Meter Switcher Card** là Lovelace Card giúp quản lý và đảo nguồn giữa 2 công tơ điện EVN với quy trình an toàn 3 bước. Tự tính toán bậc thang, chi phí và dự báo tiền điện cuối tháng — không cần cài thêm bất kỳ Integration nào.

## ✨ Tính năng chính

- 🛡️ **Quy trình An toàn 3 Bước:** Chuẩn bị (5s) → Cảnh báo + Xác nhận (10s tự hủy) → Thực thi (3s).
- 📊 **Tính toán thông minh:** Tự động tính bậc thang EVN, chi phí, tiết kiệm và dự báo cuối tháng.
- 🔌 **Không phụ thuộc Backend:** Chỉ cần sensor kWh từ NPC integration, không cần cài thêm Custom Integration.
- 📱 **Mobile-First:** Tối ưu cho ứng dụng Home Assistant Mobile.

## 🚀 Cài đặt qua HACS

1. Mở **HACS** -> **Frontend**.
2. Nhấn menu 3 chấm -> **Custom repositories**.
3. Nhập `https://github.com/kubosiro/ha-meter-switcher-pro` và chọn Category là **Frontend**.
4. Nhấn **Download**.
5. Khởi động lại Home Assistant (hoặc xóa cache trình duyệt).

> HACS sẽ tự động đăng ký Resource. Không cần thêm thủ công.

## 📊 Cấu hình Card

```yaml
type: custom:meter-switcher-card
title: "TRẠM ĐIỀU KHIỂN ĐIỆN"
billing_day: 7        # Ngày chốt hóa đơn hàng tháng
vat: 8                # % VAT (mặc định 8%)
switch_on_is: meter1  # Khi switch ON thì đang dùng công tơ nào (meter1 hoặc meter2)
entities:
  meter1_name: "Tên công tơ 1"
  meter2_name: "Tên công tơ 2"
  meter1_kwh: sensor.tieu_thu_ky_nay_tieu_thu
  meter2_kwh: sensor.tieu_thu_ky_nay_2_tieu_thu
  physical_switch: switch.sonoff_device
  auto_mode: switch.che_do_tu_dong        # Optional: toggle switch cho chế độ tự động
```

## ⚡ Tự động hóa đảo công tơ lúc 12h

```yaml
alias: "Tự động đảo công tơ lúc 12h"
trigger:
  - platform: time
    at: "12:00:00"
condition:
  - condition: numeric_state
    entity_id: sensor.tieu_thu_ky_nay_tieu_thu  # sensor công tơ đang dùng
    above: 380   # ngưỡng đảo (ví dụ: gần hết bậc 6 = 400 kWh)
action:
  - service: switch.toggle
    target:
      entity_id: switch.sonoff_device
```

## 📄 Bản quyền
Phát triển bởi Antigravity AI. Released under the MIT License.
