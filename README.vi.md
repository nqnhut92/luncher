# Luncher

[English](README.md) · **Tiếng Việt**

Luncher giúp cá nhân và nhóm chọn món trưa và đồ uống buổi chiều—quay máy chọn món, chốt bữa trong ngày và giữ thực đơn cả tuần (thứ Hai–Chủ nhật) đa dạng mà không cần tài khoản hay chủ phòng.

[Mở Luncher](https://truanayangi.congtynhu.cc/) — Giao diện tiếng Việt, hỗ trợ chế độ Theo hệ thống, Sáng và Tối.

## Công nghệ

- **Frontend:** JavaScript (ES modules), CSS, Vite, `morphdom`, `@vercel/analytics`
- **API & Runtime:** Node.js (`>=22.12.0`), Vercel Functions (`api/`, `server/`)
- **Lưu trữ:** Neon Postgres (`@neondatabase/serverless`) cho nhóm ăn chung; `localStorage` của trình duyệt cho chế độ cá nhân
- **Kiểm thử:** Node.js test runner (`node --test`), PGlite (`@electric-sql/pglite`), Playwright

## Yêu cầu & Bắt đầu nhanh

- **Yêu cầu:** Node.js **22.12+** (khuyến nghị Node.js 24), `npm`, và chuỗi kết nối Neon Postgres (tùy chọn, chỉ cần khi phát triển nhóm ăn chung với Neon).

Cài đặt dependencies:

```sh
npm ci
```

Chạy cục bộ theo một trong ba chế độ:

```sh
# 1. Chỉ chế độ cá nhân (Vite frontend, không có API nhóm)
npm run dev

# 2. Đầy đủ app + API không cần Neon (PGlite trong bộ nhớ, dữ liệu xóa khi thoát)
npm run dev:local

# 3. Đầy đủ app + API với Neon (copy .env.example sang .env.local và điền DATABASE_URL trước)
npm run db:setup
npm run dev:full
```

## Tài liệu

- [Hướng dẫn sử dụng (EN)](docs/usage-guide.md) — Chế độ cá nhân, nhóm ăn chung (`/g/<code>`), đồ uống buổi chiều (`/chieunayuonggi`), đơn Grab, cài PWA và Web Share Target
- [Phát triển & triển khai (EN)](docs/development.md) — Công nghệ, danh sách món/quán, cài đặt cục bộ, kiểm thử và deploy Vercel
- [Thiết kế cơ sở dữ liệu (EN)](docs/database-design.md) — Sơ đồ bảng, ràng buộc, đồng bộ phiên bản và migration
- [Web Analytics (EN)](docs/vercel-analytics.md) — Bộ lọc chỉ đo trang chủ và cách kiểm tra
- [Nhật ký quyết định (EN)](docs/decisions.md) — Các quyết định kiến trúc và sản phẩm chính
- [Quy tắc cho AI agent (EN)](AGENTS.md) — Hướng dẫn chung khi đóng góp ([CLAUDE.md](CLAUDE.md) trỏ tới file này)

## Nguồn cảm hứng & Giấy phép

Lấy cảm hứng từ [truanayangi.com](https://truanayangi.com/), mã nguồn và tài nguyên được viết độc lập.

Mã nguồn, tài liệu và hình minh họa món ăn phát hành theo [giấy phép MIT](LICENSE). Logo các quán đồ uống trong [`public/images/drinks/`](public/images/drinks/) là nhãn hiệu của chủ sở hữu tương ứng và chỉ dùng để nhận diện quán.
