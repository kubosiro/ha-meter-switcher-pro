# ⚡ Meter Switcher Pro for Home Assistant

**Meter Switcher Pro** là một giải pháp tích hợp (All-in-one) dành cho người dùng Home Assistant tại Việt Nam để quản lý và đảo nguồn giữa 2 công tơ điện. Giải pháp giúp tối ưu hóa hóa đơn tiền điện dựa trên các bậc thang của EVN và đảm bảo an toàn tuyệt đối khi vận hành điện lưới.

![Preview](https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/preview.png)

## ✨ Tính năng nổi bật

- 🧠 **Tối ưu hóa bậc thang:** Tự động tính toán và đảo công tơ vào thời điểm tối ưu (12h trưa) khi đạt ngưỡng tiêu thụ.
- 🛡️ **Quy trình An toàn 3 Bước:** Giao diện điều khiển thủ công với quy trình xác nhận kép và cảnh báo tải lớn để tránh hư hỏng thiết bị.
- 📊 **Dashboard Chuyên nghiệp:** Tích hợp sẵn Lovelace Card với thanh tiến độ thông minh (đổi màu theo bậc) và dự báo tiền điện cuối tháng.
- 💰 **Theo dõi tài chính:** Tính toán số tiền tiết kiệm được so với phương án dùng 1 công tơ.
- 📱 **Mobile Friendly:** Giao diện được tối ưu hoàn hảo cho App Home Assistant trên iOS và Android.

## 🚀 Hướng dẫn cài đặt

### Cách 1: Cài đặt qua HACS (Khuyến khích)
1. Mở **HACS** trong Home Assistant.
2. Nhấn vào dấu 3 chấm góc trên bên phải -> **Custom repositories**.
3. Dán link GitHub của bạn vào và chọn Category là **Integration**.
4. Nhấn **Install**.
5. Khởi động lại Home Assistant.

### Cách 2: Cài đặt thủ công
1. Tải thư mục `custom_components/meter_switcher` và dán vào thư mục `config/custom_components/` của bạn.
2. Khởi động lại Home Assistant.

## 🛠️ Cấu hình

Sau khi cài đặt, hãy vào **Settings -> Devices & Services -> Add Integration** và tìm kiếm **Meter Switcher Pro**. Làm theo hướng dẫn trên màn hình để ánh xạ các cảm biến từ EVN NPC/Hanoi và công tắc Sonoff của bạn.

## 📊 Cấu hình Lovelace Card

Thêm thẻ mới vào Dashboard và sử dụng cấu hình sau:

```yaml
type: custom:meter-switcher-card
title: "QUẢN LÝ ĐIỆN NHÀ"
entities:
  meter1_name: "Công tơ 1"
  meter2_name: "Công tơ 2"
  meter1_kwh: sensor.tieu_thu_ky_nay_tieu_thu
  meter1_bac: sensor.tieu_thu_ky_nay_bac
  meter1_cost: sensor.tieu_thu_ky_nay_tien_dien
  meter2_kwh: sensor.tieu_thu_ky_nay_2_tieu_thu
  meter2_bac: sensor.tieu_thu_ky_nay_2_bac
  meter2_cost: sensor.ky_nay_2_tien_dien
  active_meter: sensor.cong_to_dang_dung
  physical_switch: switch.sonoff_id
  auto_mode: switch.che_do_tu_dong_dao_cong_to
  total_kwh: sensor.tong_tieu_thu
  total_cost: sensor.tong_tien_dien
  savings: sensor.tien_tiet_kiem
  forecast_kwh: sensor.du_bao_tieu_thu_cuoi_thang
  forecast_cost: sensor.du_bao_tien_dien_cuoi_thang
```

## 📄 Bản quyền
Phát triển bởi Antigravity AI. Released under the MIT License.
