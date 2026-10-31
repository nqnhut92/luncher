# Luncher

[English](README.md) · **Tiếng Việt**

**Bớt phân vân. Thêm ngon miệng.**

Luncher giúp bạn hoặc cả nhóm chọn món trưa bằng vòng quay. Quay thử, chốt món và giữ thực đơn trong tuần đa dạng mà không cần tài khoản hay chủ phòng.

[Mở Luncher](https://truanayangi.congtynhu.cc/)

Giao diện sử dụng tiếng Việt, hỗ trợ chế độ sáng và tối.

## Tính năng

- **Máy quay món dọc:** ô quay kiểu máy jackpot hiện ba hàng, tên món nằm ngang và có hình minh họa đồng bộ. Bấm quay hoặc bấm cần bên cạnh (hỗ trợ bàn phím) để chọn món; chuyển động chậm dần rồi dừng ở món được chọn. Chế độ giảm chuyển động bỏ qua hoạt ảnh. Có bộ lọc cơm và bún/mì. Hình món nằm bên trái, tên căn giữa trong phần còn lại; Bún chả / Bún thịt nướng luôn hiện đúng hai dòng trong ô quay. Thân máy có ô quay lõm viền đồng, nút quay nằm trên bệ và cụm cần gạt riêng bên hông với ổ trục rõ ràng; bấm cần sẽ tạo chuyển động gạt gọn trong khoảng bên hông trước khi ô quay dừng. Cần trở về thẳng đứng và giữ nguyên khi con trỏ còn nằm trên cần hoặc sau thao tác chạm.
- **Chế độ cá nhân:** lưu lịch sử ngay trên trình duyệt bằng `localStorage`.
- **Chiều nay uống gì (`/chieunayuonggi`):** một vòng quay riêng, chỉ dùng cá nhân, chọn quán trà sữa/trà cho buổi chiều. Trang này không có nhóm, không chốt, không lịch sử, không áp quy tắc trong tuần và không lưu gì; tải lại trang là kết quả mất. Mỗi lượt quay rút không hoàn lại: mọi quán đều ra một lần trước khi có quán lặp, và vòng mới không bắt đầu bằng quán vừa ra. Thanh đầu trang có nút chuyển qua lại giữa trang ăn trưa và trang đồ uống.
- **Nhóm ăn chung:** tạo nhóm một lần và chia sẻ link cố định. Ai có link cũng có thể xem, sửa tên nhóm, chốt hoặc đổi món trong ngày.
- **Bố cục ổn định:** thực đơn có bảy dòng cố định; nhật ký tách riêng và cuộn bên trong, không kéo giãn khung vòng quay.
- **Ưu tiên món hôm nay:** khi đã chốt, thẻ món ăn hiện lên đầu và vòng quay thu nhỏ lại; danh sách món được thu gọn cho tới khi mở ra. Trong nhóm, thẻ đơn Grab nằm cạnh vòng quay, có mã QR và nút **Mở đơn Grab**.
- **Không quay trùng liên tục:** hai vòng quay dùng chung một bộ chọn rút không hoàn lại (`src/spin-bag.js`). Trong một lần mở trang, mỗi món hoặc quán đang có sẽ ra đúng một lần rồi mới lặp, nên quay nhiều lần không còn cảm giác chỉ quanh quẩn vài lựa chọn. Việc "đã rút" chỉ nằm trong bộ nhớ trang, tải lại là bắt đầu vòng mới; nó tách biệt với món đã chốt, quy tắc không lặp trong tuần và dữ liệu nhóm.
- **Tránh lặp trong tuần:** món đã chốt được loại khỏi các lần quay tiếp trong tuần, trừ khi bật tùy chọn cho phép lặp.
- **Nhật ký thay đổi:** giữ lại từng lần chốt và đổi món, gồm thời gian, món cũ và món mới.
- **Đơn nhóm Grab:** dán link đơn nhóm Grab (`https://…grab.com/…`) vào nhóm. Luncher đọc thông tin chia sẻ mà Grab công bố cho link đó: tiêu đề và ảnh có tên quán, địa chỉ, số sao. Trang nhóm hiện các thông tin này kèm mã QR. Khi chia sẻ link `/g/<code>` vào Zalo/Messenger/Slack/Teams, ảnh preview gồm ảnh quán và mã QR (Open Graph).
- **Xem nhanh món hôm nay:** tiêu đề và mô tả preview của link nhóm ghi rõ món đã chốt hôm nay và giờ chốt, ví dụ "Hôm nay ăn Mì Quảng 🍜 · Hội ăn trưa".
- **Xử lý thao tác đồng thời:** lượt chốt từ dữ liệu cũ không tự ghi đè quyết định mới của nhóm.
- **Header cố định khi cuộn:** logo, nút mã nguồn GitHub và nút đổi giao diện luôn hiện ở đầu màn hình. Nút GitHub mở [repository của dự án](https://github.com/nqnhut92/luncher) trong tab mới trên cả trang ăn trưa và trang đồ uống. Header nổi bo góc dùng nền kính bán trong suốt ở cả sáng/tối; trình duyệt không hỗ trợ blur hoặc thiết bị yêu cầu giảm độ trong suốt dùng nền đặc.
- **Giao diện linh hoạt:** hỗ trợ điện thoại, ghi nhớ chế độ sáng/tối, giảm chuyển động theo thiết bị và không có âm thanh. Giao diện theo phong cách Liquid Glass: nút dạng viên thuốc, thẻ trong mờ và máy quay bằng kính trên nền màu dịu; phần chứa chữ dùng lớp kính đặc hơn để vẫn đạt độ tương phản WCAG AA. Vùng bấm cao tối thiểu 44px, và các lớp kính chuyển sang nền đặc khi thiết bị bật giảm độ trong suốt.

## Cách dùng nhóm ăn chung

1. Nhập tên nhóm ở trang chính.
2. Copy link `/g/<code>` được tạo và ghim trong nhóm chat.
3. Quay thử để tìm món phù hợp. Việc quay diễn ra riêng trên từng máy, chưa thay đổi món của nhóm.
4. Chốt món để lưu cho cả nhóm. Vòng quay được khóa cho ngày đó.
5. Muốn đổi, bấm **Đổi món hôm nay**. Món cũ vẫn được giữ cho tới khi chốt món mới; hủy đổi không thay đổi thực đơn.
6. Mở **Lịch sử thay đổi** để xem các lần chốt/đổi cùng thời gian. Không còn thao tác xóa món bằng “Bỏ chốt”.

Mã nhóm gồm sáu ký tự chữ/số, phân biệt hoa thường, ví dụ `/g/Ab3xY9`. Link UUID cũ không còn được hỗ trợ. Đổi tên nhóm không làm thay đổi link.

Mỗi nhóm có lịch sử riêng và một món được chốt mỗi ngày. Link nhóm dùng được qua các ngày và tuần, miễn là bản ghi tương ứng còn được giữ trong cơ sở dữ liệu.

Tuần bắt đầu từ thứ Hai và kết thúc vào Chủ nhật. Nhóm dùng múi giờ **Asia/Ho_Chi_Minh** để mọi thành viên theo cùng một lịch; chế độ cá nhân dùng ngày trên thiết bị. Sang tuần mới, món của tuần trước tự được đưa vào vòng quay lại.

Bấm **Tải lại kết quả** để lấy thay đổi từ người khác. App cũng tải lại dữ liệu nhóm khi bạn quay về tab. Hiện chưa có cập nhật đẩy theo thời gian thực.

## Vào lại nhóm

Homepage hiển thị tối đa **10 nhóm gần đây** mà bạn đã mở trên trình duyệt này. Bấm thẻ để vào lại, không cần nhớ hay nhập mã. Khi mở nhóm thành công, app lưu tên hiện tại; những lần đọc dữ liệu hoặc đổi tên sau đó cập nhật tên đã lưu.

Desktop hiển thị tối đa hai hàng. Màn hình hẹp cuộn ngang trong danh sách, mobile chỉ có một hàng. Bỏ một thẻ chỉ xóa lối tắt trên trình duyệt; link, thực đơn và nhật ký trong Neon vẫn còn. Mở lại link sẽ thêm nhóm vào danh sách lại.

Nhóm gần đây lưu bằng `localStorage`, không có danh sách nhóm công khai từ DB. Trình duyệt hoặc thiết bị khác có danh sách riêng; xóa dữ liệu trình duyệt sẽ mất các lối tắt này. Bạn vẫn nên ghim link trong nhóm chat.

## Đơn nhóm Grab và ảnh preview

Trong nhóm, thêm link đơn nhóm Grab, lưu rồi chia sẻ link nhóm Luncher. Ai có link nhóm cũng có thể sửa hoặc xóa link Grab. Link hợp lệ phải dùng HTTPS trên `grab.com`, tên miền con của `grab.com` hoặc `grab.onelink.me`, không chứa tên đăng nhập/mật khẩu và dài tối đa 500 ký tự. Xóa link sẽ bỏ mã QR, không thay đổi thực đơn hay nhật ký.

Khi lưu link, server đọc thông tin chia sẻ của Grab, từ link chuyển hướng của link rút gọn Grab hoặc từ thẻ Open Graph của trang Grab. Server chỉ đi theo chuyển hướng HTTPS trên các tên miền Grab được phép, trong 4 giây và tối đa 256 KB. Server chỉ giữ tiêu đề (tối đa 120 ký tự) và ảnh chia sẻ đặt trên `grab.com`. Grab không công bố tên quán dạng chữ, nên tên quán, địa chỉ và số sao chỉ nằm trong ảnh chia sẻ của Grab. Nếu không đọc được, link vẫn được lưu và preview chỉ có mã QR.

Trang nhóm hiện ảnh chia sẻ và mã QR dẫn tới link Grab đã lưu. `/g/<code>` trả giao diện cùng metadata Open Graph được tạo trên server. Tiêu đề và mô tả ghi món đã chốt hôm nay, giờ chốt và tiêu đề từ Grab. `/api/qr?id=<code>` tạo ảnh PNG 1200×630, với ảnh chia sẻ của Grab bên trái và mã QR bên phải. Khi không có ảnh dùng được, ảnh chỉ có mã QR; ảnh của Grab phải là PNG tối đa 2 MB và 2000×2000 pixel. Ứng dụng chat có thể dùng ảnh này làm preview, nhưng cũng có thể giữ ảnh cũ trong cache hoặc không hiển thị ảnh. Đổi link Grab sẽ đổi URL phiên bản ảnh; thao tác này không ép ứng dụng chat làm mới tin nhắn đã gửi.

Link đã lưu không tự đặt lại mỗi ngày. Hãy thay hoặc xóa khi đơn kết thúc. Luncher không tạo đơn Grab, kiểm tra hạn đơn hoặc gom đơn từng người. Chia sẻ link nhóm cũng cho người nhận và dịch vụ tạo preview khả năng truy cập link Grab và ảnh chia sẻ đã lưu. Luncher không theo dõi trạng thái đơn Grab. Thông tin chia sẻ được lấy lúc lưu link, còn nội dung preview phản ánh món đã chốt tại thời điểm ứng dụng chat tải preview.

## Web Analytics

Bản build production khởi tạo Vercel Web Analytics một lần cho lượt mở homepage công khai đủ điều kiện. Link nhóm/quyền truy cập, mọi đường dẫn khác homepage, query string, fragment và referrer không an toàn đều bị loại. App tôn trọng Do Not Track và Global Privacy Control. Không thêm custom event, Speed Insights hay ghi lại phiên sử dụng.

Xem [hướng dẫn Web Analytics bằng tiếng Anh](docs/vercel-analytics.md) để tra cách lọc dữ liệu, kiểm thử local và các bước trên dashboard Vercel. Kiểm thử local **không xác nhận** sự kiện thực đã được thu thập; cần kiểm tra riêng việc bật dịch vụ và sự kiện xuất hiện trên dashboard. Thay đổi này không bật tính năng trả phí.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | JavaScript, CSS, Vite, morphdom |
| API | Vercel Functions |
| Dữ liệu nhóm | Neon Postgres qua Neon serverless driver |
| Sở thích và lịch sử cá nhân | `localStorage` trên trình duyệt |
| Kiểm thử | Node.js test runner, PGlite, Playwright |

Danh sách món mặc định nằm trong [`src/foods.json`](src/foods.json). Giao diện không kết nối trực tiếp tới Postgres.

Thực đơn hiện có tám lựa chọn: Bún bò, Bún chả / Bún thịt nướng (gộp một lựa chọn), Cơm gà, Bánh canh cua, Mì Quảng, Cơm tấm, Mì hoành thánh và Bún mọc. Bộ hình minh họa được tạo sẵn và đóng gói tại `public/images/food-atlas.png`; app không gọi tạo ảnh khi sử dụng. Món có `active: false` được ẩn khỏi lượt quay mới và thực đơn nhưng vẫn dùng để đọc các bữa ăn và nhật ký đã lưu. ID cũ được giữ nguyên; phiên bản app cũ vẫn có thể chốt ID món cũ qua API.

Danh sách quán đồ uống nằm trong [`src/drinks.json`](src/drinks.json): Koi Thé, Một Chút Chút ALittle, Phúc Long, TEA JOY, BY JOY, Bông Trà, Gong Cha, Phong Trà, Dabacha, Lam Trà, Yên Bản và Phê La. Mỗi quán hiện logo lấy từ [`public/images/drinks/`](public/images/drinks/), là ảnh JPEG 320×320 đặt tên theo `id` của quán (ví dụ `phe-la.jpg`); ảnh gốc không vuông được đệm thành vuông bằng chính màu nền của nó. Logo thuộc về chủ sở hữu và chỉ dùng để nhận diện từng quán. Quán nào chưa có `logo` thì trang dùng huy hiệu chữ viết tắt có màu, tạo từ hai trường tùy chọn `mark` và `color`. Muốn thêm quán, thêm một mục với `id` và `name` không trùng, kèm một logo vuông và đường dẫn `logo` của nó.

## Phát triển local

### Yêu cầu

- Node.js **22.12 trở lên**; khuyến nghị Node.js 24.
- npm.
- Kết nối Neon nếu phát triển tính năng nhóm. Chế độ cá nhân và kiểm thử tự động không cần Neon.

### Chế độ cá nhân

```sh
npm ci
npm run dev
```

Lệnh này chạy giao diện Vite. Để sử dụng API nhóm, chạy server đầy đủ theo hướng dẫn bên dưới.

### Nhóm ăn chung

Copy [`.env.example`](.env.example) thành `.env.local`, rồi đặt `DATABASE_URL` bằng chuỗi kết nối Postgres của Neon. App cũng hỗ trợ `POSTGRES_URL` nếu không có `DATABASE_URL`. Các file cấu hình môi trường local được Git bỏ qua.

```sh
npm run db:setup
npm run dev:full
```

Server phát triển chạy cả Vite và API trên cổng `5173`.

Chạy `npm run db:setup` cho cả DB mới lẫn DB hiện có. Lệnh này áp dụng [`db/schema.sql`](db/schema.sql), cấp mã công khai cho nhóm cũ và đặt ràng buộc mã không được rỗng. Chỉ chạy file SQL chưa hoàn tất bước chuyển dữ liệu. Có thể chạy lại lệnh setup mà vẫn giữ nguyên các bản ghi hiện có.

Chuỗi kết nối là thông tin bí mật chỉ dùng phía server. Không commit hoặc đưa vào biến có tiền tố `VITE_`.

### Xem thử không cần Neon

```sh
npm run dev:local
```

Lệnh này chạy đầy đủ app và API với cơ sở dữ liệu tạm trong bộ nhớ (PGlite), rồi in ra link của hai nhóm mẫu: một nhóm chưa chốt món hôm nay, một nhóm đã chốt và có link Grab giả lập. Đặt biến `PORT` nếu muốn dùng cổng khác. Dữ liệu mất khi tắt lệnh.

## Deploy lên Vercel

1. Import repository vào Vercel và kết nối cơ sở dữ liệu Neon.
2. Cấu hình `DATABASE_URL` cho đúng môi trường deploy, chẳng hạn Production. Sử dụng **chuỗi kết nối Postgres**, không dùng API key quản trị Neon.
3. Sử dụng các thiết lập sau:

   | Thiết lập | Giá trị |
   | --- | --- |
   | Framework preset | Vite |
   | Install command | `npm ci` |
   | Build command | `npm run build:vercel` |
   | Output directory | `dist` |

4. Deploy. Lệnh build chuẩn bị schema trước khi build giao diện. Tài khoản kết nối DB cần quyền tạo bảng ứng dụng ở lần triển khai đầu tiên.
5. Mở trang production, tạo nhóm và dùng một phiên trình duyệt khác để kiểm tra việc chốt món chung.

[`vercel.json`](vercel.json) khai báo lệnh build, rewrite cho `/g/:id` và rewrite `/chieunayuonggi` tới trang đồ uống mà Vite build từ [`chieunayuonggi/index.html`](chieunayuonggi/index.html) (xem [`vite.config.js`](vite.config.js)). Vercel chuyển `/g/:id` tới [`api/group-page.js`](api/group-page.js) để tạo metadata preview và phục vụ ảnh QR qua [`api/qr.js`](api/qr.js). [`api/rooms.js`](api/rooms.js) xử lý dữ liệu nhóm; cả ba dùng chung store Neon phía server. Nếu dashboard đang ghi đè lệnh build, cập nhật theo giá trị ở trên. Cần redeploy sau khi thay đổi biến môi trường.

Chia sẻ link nhóm từ **domain production cố định** thay vì URL preview của từng deployment. Nên dùng Neon branch riêng cho Production và Preview để tách dữ liệu thử nghiệm.

## Kiểm thử

```sh
npm test          # Kiểm tra lịch, API và truy vấn SQL bằng PGlite
npm run test:e2e  # App đầy đủ với các phiên trình duyệt độc lập và DB cô lập
npm run test:analytics # Kiểm tra SDK/filter production bằng bộ nhận giả lập chỉ dành cho test
npm run build     # Build giao diện production, không cần kết nối DB
npm run preview   # Xem bản build giao diện, không chạy API nhóm
```

Kiểm thử trình duyệt sử dụng `/usr/bin/chromium` nếu có. Để dùng bản cài khác, đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Nếu chưa có trình duyệt phù hợp, cài bằng Playwright:

```sh
npx playwright install chromium
```

Kiểm thử tự động dùng cơ sở dữ liệu tương thích Postgres trong bộ nhớ, không thay đổi dữ liệu Neon. Các trường hợp kiểm thử gồm tách biệt dữ liệu giữa nhóm, xung đột khi ghi, khóa món đã chốt, hủy đổi món, nhật ký thay đổi, tránh lặp trong tuần, giữ dữ liệu sau khi tải lại trang và xử lý lỗi. Kết nối API và Neon trên bản deploy cần được kiểm tra riêng sau khi triển khai.

## Dữ liệu và quyền truy cập

Xem [thiết kế cơ sở dữ liệu](docs/database-design.md) để tra sơ đồ quan hệ, các cột, ràng buộc, luồng ghi và quy trình chuyển dữ liệu.

- `luncher_rooms` lưu UUID nội bộ, mã công khai sáu ký tự duy nhất, tên và phiên bản dữ liệu của nhóm.
- `luncher_meal_events` giữ các lần chốt/đổi; món cũ không rõ giờ chốt được ghi nhãn là dữ liệu có sẵn khi bật nhật ký. Chưa ghi nhận danh tính người thao tác.
- `luncher_meal_choices` lưu món đã chốt. Khóa chính `(room_id, meal_date)` bảo đảm mỗi nhóm chỉ có một món mỗi ngày.
- Thao tác ghi SQL nguyên tử kiểm tra phiên bản nhóm trước khi nhận thay đổi. Server cũng kiểm tra ID món, ngày của nhóm và những món đã dùng trong tuần.
- Link nhóm cấp cả quyền xem và chỉnh sửa. Không có chủ phòng, mật khẩu hoặc tài khoản để khôi phục. Chỉ chia sẻ link trong nhóm dự định và tránh đặt thông tin nhạy cảm trong tên nhóm.
- Thực đơn và nhật ký cá nhân được lưu cùng nhau trong `luncher-personal-v2`; dữ liệu local cũ được chuyển sang mà không xóa lịch sử.
- Lịch sử cá nhân nằm trên thiết bị, không tự chuyển vào nhóm, đồng bộ giữa thiết bị hoặc khôi phục sau khi xóa dữ liệu trình duyệt.
- Khi yêu cầu nhóm thất bại, app không chuyển sang lưu local. Thao tác ghi không được tự thử lại vì yêu cầu hết thời gian chờ có thể đã được lưu trên server.

Phiên bản hiện tại chưa có sửa danh sách món riêng, nhập/xuất JSON, bình chọn, gom đơn từng người hoặc cập nhật đẩy theo thời gian thực.

## Đóng góp bằng AI agent

Đọc [AGENTS.md](AGENTS.md) trước khi sửa repo. Claude Code nạp cùng bộ quy tắc qua [CLAUDE.md](CLAUDE.md). Khi đổi hành vi, cập nhật tài liệu liên quan trong cùng thay đổi, gồm cả hai bản README và tài liệu database/API nếu bị ảnh hưởng. Báo rõ kiểm tra đã chạy và giải thích nếu thay đổi không cần cập nhật docs.

## Nguồn cảm hứng

Lấy cảm hứng từ ý tưởng chọn món trưa của [truanayangi.com](https://truanayangi.com/). Mã nguồn, giao diện và danh sách món của Luncher được viết độc lập; không tái sử dụng mã hoặc tài nguyên từ repository tham khảo.

## Giấy phép

Mã nguồn, tài liệu và hình minh họa món ăn của Luncher được phát hành theo [giấy phép MIT](LICENSE). Logo các quán đồ uống trong [`public/images/drinks/`](public/images/drinks/) không thuộc giấy phép này: đó là nhãn hiệu của chủ sở hữu từng quán và chỉ dùng để nhận diện quán. Muốn dùng lại các logo này, hãy xin phép chủ sở hữu.
