# Luncher ✳

POC chọn bữa trưa bằng vòng quay tròn, không âm thanh. React không cần thiết cho POC này: ứng dụng dùng JavaScript thuần và Vite.

## Chạy local

Cần Node.js 22.12+ và npm.

```sh
npm ci
npm run dev
```

```sh
npm test       # Kiểm tra logic ngày/tuần, chốt món và dữ liệu lưu
npm run build # Build production vào dist/
npm run preview
```

## Tính năng

- Vòng quay chọn đều trong các món phù hợp; hỗ trợ giảm chuyển động theo thiết bị.
- Lọc cơm, bún/mì, ăn nhẹ, ăn chay.
- Chỉ khi chốt món mới lưu lịch sử. Mỗi ngày một món; chốt món mới sẽ thay món hôm nay.
- Không lặp món đã chốt trong tuần, từ thứ Hai đến Chủ nhật theo giờ trên thiết bị. Có tùy chọn cho phép lặp và bỏ chốt hôm nay.
- Món đã chốt làm mờ kèm ngày chọn, lịch sử tuần hiện bên cạnh.
- Light/dark mặc định theo hệ thống ở lần mở đầu; ghi nhớ lựa chọn thủ công.
- `src/foods.json` chứa danh sách món mặc định. Lịch sử và theme lưu bằng localStorage; không đồng bộ giữa thiết bị, xóa dữ liệu trình duyệt sẽ mất lịch sử. Nếu không lưu được, app báo và vẫn hoạt động trong phiên hiện tại.

## Deploy Vercel

Import repository vào Vercel, chọn preset **Vite**:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Không cần environment variables, database hay server functions.

Chưa có thêm/sửa món cá nhân, nhập/xuất JSON hoặc đồng bộ thiết bị trong POC.

Lấy cảm hứng từ ý tưởng chọn món của truanayangi.com; mã, giao diện và dữ liệu POC được viết riêng, không dùng source hoặc tài nguyên của repo tham khảo.
