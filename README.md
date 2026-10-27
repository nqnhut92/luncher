# Luncher ✳

Chọn bữa trưa bằng vòng quay, cho riêng bạn hoặc cả nhóm. JavaScript + Vite, Vercel Functions và Neon Postgres. Không âm thanh, không tài khoản, không chủ phòng.

## Dùng thử

- **Cá nhân** tại `/`: lịch sử lưu trong localStorage của trình duyệt.
- **Nhóm**: nhập tên nhóm ở trang chính, nhận link cố định `/g/<uuid>`, copy và ghim trong chat. Không cần tạo lại mỗi ngày hay mỗi tuần.
- Ai có link đều xem, chốt, đổi hoặc bỏ chốt được. Chia sẻ link chỉ với người cùng nhóm. Không có danh sách nhóm công khai.
- Quay thử diễn ra riêng trên từng máy; chỉ nút **Chốt cho nhóm** mới lưu chung vào DB.
- Mỗi nhóm có một món được chốt mỗi ngày. Khi đã chốt, nút **Đổi món đã chốt** thể hiện rõ việc thay lựa chọn chung.
- Nếu hai người chốt cùng một phiên bản, chỉ một lượt thành công. Lượt còn lại nhận kết quả mới, không tự ghi đè.
- Món đã chốt không quay lại trong tuần (thứ Hai–Chủ nhật), trừ khi bật **Cho phép lặp**. Danh sách hiển thị ngày đã chọn.
- Lịch nhóm dùng **Asia/Ho_Chi_Minh** thống nhất, dù thành viên ở múi giờ khác. Cá nhân dùng giờ trên thiết bị.
- Bấm **Tải lại kết quả** để lấy thay đổi từ người khác. App cũng tải lại khi quay về tab. Chưa có realtime/polling nền.
- Light/dark, hỗ trợ mobile và giảm chuyển động. Danh sách mặc định ở `src/foods.json`.

## Deploy Vercel + Neon

1. Connect Neon với project Vercel. Đảm bảo có **`DATABASE_URL`** (hoặc `POSTGRES_URL`) cho môi trường deploy tương ứng, ví dụ Production. Dùng connection string Postgres từ Neon; không dùng Neon API key. Không đặt tiền tố `VITE_`.
2. Import repository, preset **Vite**, output **`dist`**, install command **`npm ci`**.
3. `vercel.json` đặt build command **`npm run build:vercel`**. Nếu project có override build command trong dashboard, cập nhật cùng lệnh này.
4. Build chạy `npm run db:setup` rồi build frontend. Schema ở `db/schema.sql` tạo hai bảng `luncher_rooms` và `luncher_meal_choices` nếu chưa có, không xóa dữ liệu cũ. Kết nối DB cần quyền tạo bảng ở lần triển khai đầu.
5. Vercel tự deploy `api/rooms.js` thành server function; rewrite `/g/:id` giữ link nhóm hoạt động khi mở trực tiếp hoặc reload.
6. Sau khi thay biến môi trường, redeploy. Mở app, tạo nhóm và mở link ở trình duyệt khác để kiểm tra chốt chung.

Dùng **domain production cố định** để tạo/share link nhóm. URL preview gắn với từng deployment không phù hợp làm link nhóm lâu dài. Production và Preview nên dùng Neon branch riêng để không lẫn dữ liệu thử nghiệm.

### Dữ liệu

- Danh sách món mặc định là JSON trong repo; lịch sử nhóm nằm trong Neon, không phải filesystem Vercel.
- Khóa chính `(room_id, meal_date)` bảo đảm mỗi nhóm chỉ có một món/ngày.
- Revision của nhóm + ghi SQL nguyên tử ngăn lượt chốt cũ ghi đè lượt mới; phía server kiểm tra món đã dùng trong tuần và ngày Việt Nam.
- ID nhóm là UUID ngẫu nhiên. Quyền truy cập nằm ở link: không có vai trò, không có đăng nhập/khôi phục nếu mất link. Dữ liệu nhóm không được coi là dữ liệu riêng tư nhạy cảm.
- Lỗi mạng không chuyển nhóm sang lưu local; app báo lỗi và cho tải lại. Không tự thử lại thao tác ghi, vì request timeout có thể đã được lưu ở server.

## Phát triển local

Node.js 22.12+ (khuyến nghị Node 24) và npm:

```sh
npm ci
npm run dev            # Giao diện + chế độ cá nhân; không có API nhóm
```

Để chạy cả nhóm với Neon, copy `.env.example` thành **`.env.local`**, nhập connection string vào đó (file được gitignore), rồi:

```sh
npm run db:setup
npm run dev:full        # Vite + API cùng cổng 5173
```

Hoặc chạy nội dung `db/schema.sql` trực tiếp trong Neon SQL Editor. Không commit connection string hoặc gửi giá trị lên chat.

## Kiểm tra

```sh
npm test               # Logic cá nhân + API và truy vấn SQL trên Postgres nhúng (PGlite)
npm run test:e2e       # Hai browser context độc lập, app thật + API + PGlite
npm run build          # Build frontend, không yêu cầu DB
npm run preview
```

E2E dùng Chromium có sẵn ở `/usr/bin/chromium`, hoặc đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; nếu chưa có browser thì chạy `npx playwright install chromium`. Các kiểm thử dùng DB cô lập trong bộ nhớ, không đụng dữ liệu Neon thực. Chúng không thay thế việc kiểm tra kết nối Neon/Vercel sau deploy.

Chưa có thêm/sửa món cá nhân, nhập/xuất JSON, vote hoặc gom đơn từng người.

Lấy cảm hứng từ ý tưởng chọn món của truanayangi.com; mã, giao diện và dữ liệu được viết riêng, không dùng source hay tài nguyên của repo tham khảo.
