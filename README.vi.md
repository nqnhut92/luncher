# Luncher

[English](README.md) · **Tiếng Việt**

**Bớt phân vân. Thêm ngon miệng.**

Luncher giúp cá nhân và nhóm chọn món trưa và đồ uống buổi chiều—quay máy chọn món, chốt bữa trong ngày và giữ thực đơn cả tuần đa dạng mà không cần tài khoản hay chủ phòng.

[Mở Luncher](https://truanayangi.congtynhu.cc/)

Giao diện sử dụng tiếng Việt, hỗ trợ chế độ Theo hệ thống, Sáng và Tối.

## Tính năng

- **Máy quay món dọc:** Ô quay kiểu máy jackpot có bộ lọc cơm và bún/mì, cần gạt bên hông, hỗ trợ bàn phím và giảm chuyển động.
- **Không quay trùng liên tục:** Bộ chọn rút không hoàn lại (`src/spin-bag.js`) cho mỗi lựa chọn xuất hiện một lần trước khi lặp lại.
- **Chế độ cá nhân:** Lưu món đã chốt và nhật ký thay đổi ngay trên trình duyệt bằng `localStorage`.
- **Chiều nay uống gì (`/chieunayuonggi`):** Vòng quay cá nhân chọn quán trà sữa/trà, không lưu lịch sử hay quy tắc tuần.
- **Nhóm ăn chung (`/g/<code>`):** Link nhóm 6 ký tự cố định, khóa món theo ngày, hỗ trợ đổi món và kiểm tra xung đột ghi đồng thời.
- **Tránh lặp trong tuần & nhật ký:** Loại món đã chốt khỏi các ngày còn lại trong tuần (thứ Hai–Chủ nhật) và ghi lại lịch sử chốt/đổi.
- **Đơn nhóm Grab & ảnh preview:** Lưu link Grab hợp lệ kèm mã QR, thông tin chia sẻ lấy từ server và metadata Open Graph.
- **App nhóm PWA & nhận chia sẻ:** Cài từng nhóm thành app riêng trên màn hình chính và nhận link Grab từ bảng chia sẻ trên Android Chrome/Chromium.
- **Nhóm gần đây & giao diện linh hoạt:** Lưu tối đa 10 lối tắt nhóm trên trình duyệt với giao diện Liquid Glass và 3 chế độ sáng/tối.

## Yêu cầu

- Node.js **22.12 trở lên** (khuyến nghị Node.js 24)
- npm
- Chuỗi kết nối Neon Postgres (tùy chọn; chỉ cần khi phát triển nhóm ăn chung với Neon)

## Bắt đầu nhanh

Cài đặt dependencies:

```sh
npm ci
```

Chạy chế độ cá nhân (chỉ frontend):

```sh
npm run dev
```

Chạy đầy đủ app + API không cần Neon (PGlite trong bộ nhớ):

```sh
npm run dev:local
```

Chạy đầy đủ app + API với Neon (copy [`.env.example`](.env.example) sang `.env.local` và điền `DATABASE_URL` trước):

```sh
npm run db:setup
npm run dev:full
```

## Tài liệu

- [Hướng dẫn sử dụng (EN)](docs/usage-guide.md) — Nhóm ăn chung, đơn Grab, cài PWA, Web Share Target và giao diện
- [Phát triển & triển khai (EN)](docs/development.md) — Công nghệ, danh sách món/quán, kiểm thử và deploy Vercel
- [Thiết kế cơ sở dữ liệu (EN)](docs/database-design.md) — Sơ đồ bảng, ràng buộc, đồng bộ phiên bản và migration
- [Web Analytics (EN)](docs/vercel-analytics.md) — Bộ lọc chỉ đo trang chủ và cách kiểm tra
- [Nhật ký quyết định (EN)](docs/decisions.md) — Các quyết định kiến trúc và sản phẩm chính
- [Quy tắc cho AI agent (EN)](AGENTS.md) — Hướng dẫn chung khi đóng góp ([CLAUDE.md](CLAUDE.md) trỏ tới file này)

## Nguồn cảm hứng và giấy phép

Lấy cảm hứng từ [truanayangi.com](https://truanayangi.com/), mã nguồn và tài nguyên được viết độc lập.

Mã nguồn, tài liệu và hình minh họa món ăn phát hành theo [giấy phép MIT](LICENSE). Logo các quán đồ uống trong [`public/images/drinks/`](public/images/drinks/) là nhãn hiệu của chủ sở hữu tương ứng và chỉ dùng để nhận diện quán.
