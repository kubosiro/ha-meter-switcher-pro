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

# --- Thông số tính toán ---
billing_day: 1            # Ngày chốt hóa đơn hàng tháng (1-31)
vat: 8                    # % VAT (mặc định: 8)
switch_on_is: meter1      # Công tơ đang dùng khi switch ON: meter1 hoặc meter2

# --- Cảnh báo & Hiển thị ---
warning_threshold: 10     # Cảnh báo "Gần đầy" khi còn <= X kWh trước bậc tiếp (mặc định: 10)
auto_switch_hour: 12      # Giờ tự động đảo hiển thị trên card (mặc định: 12)

entities:
  # Tên hiển thị trên card
  meter1_name: "Công tơ 1"
  meter2_name: "Công tơ 2"

  # BẮT BUỘC — Sensor kWh tiêu thụ kỳ này
  meter1_kwh: sensor.tieu_thu_ky_nay_tieu_thu
  meter2_kwh: sensor.tieu_thu_ky_nay_2_tieu_thu

  # BẮT BUỘC — Công tắc vật lý điều khiển đảo nguồn
  physical_switch: switch.sonoff_device

  # TÙY CHỌN — Sensor tiền điện từ NPC (ưu tiên dùng thay vì tự tính)
  meter1_cost: sensor.tieu_thu_ky_nay_tien_dien
  meter2_cost: sensor.tieu_thu_ky_nay_2_tien_dien

  # TÙY CHỌN — Khóa an toàn: chặn đảo nguồn khi đang có tải điện
  grid_power: sensor.grid_power   # W hoặc kW, chặn khi giá trị > 0

  # TÙY CHỌN — Công tắc chế độ tự động
  auto_mode: switch.che_do_tu_dong
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
