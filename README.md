# ⚡ Meter Switcher Pro for Home Assistant

**Meter Switch Pro** là giải pháp tích hợp (All-in-one) quản lý và đảo nguồn giữa 2 công tơ điện. Tối ưu hóa hóa đơn tiền điện dựa trên các bậc thang tiêu thụ và đảm bảo an toàn vận hành điện lưới.

## ✨ Tính năng chính

- 🚀 **Zero-Config:** Tự động đăng ký Lovelace Card ngay sau khi cài đặt.
- 🧠 **Tối ưu hóa bậc thang:** Tự động tính toán và đảo nguồn tại thời điểm tối ưu khi đạt ngưỡng tiêu thụ.
- 🛡️ **Quy trình An toàn 3 Bước:** Giao diện xác nhận kép và cảnh báo tải lớn ngăn ngừa hư hỏng thiết bị.
- 📊 **Dashboard Chuyên nghiệp:** Lovelace Card tích hợp thanh tiến độ đổi màu theo bậc và dự báo tiền điện cuối tháng.
- 💰 **Theo dõi tài chính:** Tính toán chi phí tiết kiệm so với phương án sử dụng 1 công tơ.
- 📱 **Tối ưu Mobile:** Giao diện tương thích hoàn hảo trên ứng dụng Home Assistant Mobile.

## 🚀 Cài đặt

### Qua HACS (Khuyến nghị)
1. Mở **HACS** -> **Integrations**.
2. Nhấn menu 3 chấm (góc trên bên phải) -> **Custom repositories**.
3. Nhập link GitHub và chọn Category là **Integration**.
4. Nhấn **Install**.
5. Khởi động lại Home Assistant.

## 🛠️ Cấu hình Integration

Vào **Settings -> Devices & Services -> Add Integration** -> Tìm kiếm **Meter Switcher Pro**. Ánh xạ các thực thể cảm biến và công tắc điều khiển theo hướng dẫn.

## 📊 Dashboard (Lovelace Card)

1. Vào **Settings -> Dashboards -> 3 chấm (Resources)**.
2. Thêm Resource mới:
   - URL: `/meter-switcher/card.js`
   - Loại: `JavaScript Module`
3. Thêm thẻ mới (Custom Card) vào Dashboard với cấu hình mẫu:

```yaml
type: custom:meter-switcher-card
title: "ĐIỀU KHIỂN ĐIỆN"
entities:
  meter1_name: "Công tơ 1"
  meter2_name: "Công tơ 2"
  meter1_kwh: sensor.tieu_thu_m1
  meter1_bac: sensor.bac_m1
  meter1_cost: sensor.tien_m1
  meter2_kwh: sensor.tieu_thu_m2
  meter2_bac: sensor.bac_m2
  meter2_cost: sensor.tien_m2
  active_meter: sensor.cong_to_dang_dung
  physical_switch: switch.sonoff_device
  auto_mode: switch.che_do_tu_dong
  total_kwh: sensor.tong_tieu_thu
  total_cost: sensor.tong_tien_dien
  savings: sensor.tien_tiet_kiem
  forecast_kwh: sensor.du_bao_tieu_thu
  forecast_cost: sensor.du_bao_tien_dien
```

## 📄 Bản quyền
Phát triển bởi Antigravity AI. Released under the MIT License.
