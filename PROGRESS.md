# VietTour — Tiến độ & Nhật ký cập nhật

> **Mục đích:** tóm tắt những gì đã làm / đang làm / còn lại để khi mở phiên làm việc mới, bạn chỉ cần gửi file này cho AI kèm yêu cầu tiếp theo.
>
> **Quy ước:** sau mỗi thay đổi hoàn thành → đánh dấu `[x]` trong checklist, thêm một mục vào **Lịch sử cập nhật** ở cuối file (ngày, việc đã làm, file liên quan, cách kiểm tra).

---

## 1. Trạng thái hiện tại

- **Cập nhật gần nhất:** 2026-11-02
- **Backend:** Express + MySQL (`db_viet_travel`, port `3307`), chạy `npm run dev` trong `backend/`.
- **Frontend:** React + Vite, chạy `npm run dev` trong `frontend/` (proxy `/api` → `http://localhost:3000`).
- **Đăng nhập admin test:** `admin@viettour.vn` / `123456` (field là `username`).
- **Đã hoàn thành:** dashboard `/admin/bookings` đọc dữ liệu thật từ DB; đã có trang chi tiết `/admin/bookings/:id` (bấm dòng trong bảng để mở); chức năng đề xuất tour AI tại `/contact` + duyệt tại `/admin/tour-requests` (chờ test AI khi có Ollama).

---

## 2. Checklist công việc

### ✅ Hoàn thiện tính năng Quên mật khẩu & Đặt lại mật khẩu (2026-11-02)

- [x] Thêm hàm `forgotPassword(email)` và `resetPassword(token, newPassword, confirmPassword)` vào `frontend/src/features/auth/auth.api.js`
- [x] Hoàn thiện `frontend/src/features/auth/ForgotPassword.jsx`: validate email chặt chẽ (độ dài 5-100, regex email), gọi API thật, xử lý lỗi từ backend, hiển thị thông báo phản hồi
- [x] Thêm giao diện thông báo gửi email thành công với đếm ngược 60s cooldown gửi lại (`resend`) và tùy chọn đổi email
- [x] Tạo mới trang `frontend/src/features/auth/ResetPassword.jsx`: xử lý nhận token từ URL query, validate mật khẩu mới, gọi API reset-password, thông báo kết quả và chuyển hướng đăng nhập
- [x] Khai báo route `/reset-password` trong `frontend/src/routes/AppRoutes.jsx`
- [x] Chạy `npm run lint` (pass) và `npm run build` (pass)

### ✅ Admin Bookings — Dashboard `/admin/bookings` (hoàn thành 2026-10-19)

- [x] Tạo backend feature `backend/src/features/admin/bookings/`
- [x] API danh sách booking + search + lọc status + phân trang
- [x] API thống kê 3 thẻ (Total Booking / Participants / Earnings)
- [x] API Trips Overview theo range (`7d | 30d | 3m | 12m`)
- [x] API Top Packages (top 5 tour theo số khách)
- [x] API chi tiết booking + danh sách hành khách
- [x] API đổi trạng thái booking (kèm hoàn/trừ ghế trong transaction)
- [x] Mount route `/api/admin/bookings` vào `backend/src/app.js`
- [x] Frontend API client `bookings.api.js`
- [x] `DashboardBooking` tải stats + top packages thật
- [x] `TripsOverview` đổi range hoạt động thật, trục Y co giãn
- [x] `BookingsTable` search + phân trang phía server
- [x] Xóa `frontend/src/features/admin/bookings/data/mockData.js`
- [x] Chạy `npm run lint` + `npm run build` (pass)
- [x] Test API bằng tài khoản admin thật (20 bookings / 63 khách / 0 đ earnings)

### ✅ Cập nhật giao diện tiếng Việt + bộ lọc (2026-10-19)

- [x] Đổi toàn bộ nhãn dashboard sang tiếng Việt (StatCards, Trips Overview, Top Packages, bảng booking)
- [x] Top Packages: tính theo **số lượt đặt trong 12 tháng**, xếp tour nhiều booking nhất lên đầu
- [x] Đổi % Top Packages = số booking của tour / tổng booking trong năm
- [x] Nhãn % Top Packages: chữ trắng, nền trùng đúng màu lát donut tương ứng
- [x] Bảng booking: đưa **Mã booking** lên cột đầu, **Tên khách** cột thứ hai
- [x] Bỏ nút **Add Booking**
- [x] Thay nút **Today** bằng bộ lọc **Từ ngày / Đến ngày** (ngày khởi hành)
- [x] Thêm bộ lọc **Trạng thái** (Chờ xử lý / Đã xác nhận / Đã hủy)
- [x] Backend list hỗ trợ `fromDate`, `toDate`
- [x] Trả về `status` (raw) + `status_label` (tiếng Việt)
- [x] `npm run lint` + `npm run build` pass; test API lọc ngày + trạng thái

### ✅ Admin Booking Detail `/admin/bookings/:id` (hoàn thành 2026-10-19)

- [x] Thêm route `/admin/bookings/:id` + nút bấm được trên từng dòng bảng booking
- [x] Tạo thư mục `frontend/src/features/admin/bookings/BookingDetail/` tách nhỏ component
- [x] Header chi tiết: mã booking, ngày đặt, trạng thái, link quay lại
- [x] Thông tin tour, thông tin khách hàng (gồm ghi chú), danh sách hành khách
- [x] Component **Tổng tiền** (giống ảnh): dòng người lớn/trẻ em, tổng cộng, khối ĐÃ THU / CHƯA THU / ĐÃ HOÀN TIỀN
- [x] Component **Lịch sử hoạt động**: timeline dot màu, mới nhất trên cùng
- [x] Backend detail trả thêm `history` (suy ra từ `created_at`, `updated_at`, `status`, `payment_status`)
- [x] Modal **In hóa đơn** dùng `print-only` có sẵn + `window.print()`
- [x] Skeleton khi tải, alert + nút thử lại khi lỗi
- [x] `npm run lint` + `npm run build` pass; test API `GET /:id` có `history`

### ✅ Seed DB thực tế — users + 50 bookings + passengers (2026-10-20)

- [x] `00_reset.js`: xóa theo thứ tự FK + reset `AUTO_INCREMENT` để id sạch từ 1
- [x] `01_users.js`: 3 tài khoản nội bộ **giữ nguyên email** + 30 khách hàng tên thật, email theo tên thật, SĐT/địa chỉ đầy đủ
- [x] `04_bookings.js`: 50 booking, `total_price` tính đúng từ giá tour + phụ thu lịch khởi hành
- [x] `created_at` trải 13 tháng (luôn trước ngày khởi hành ≥ 5 ngày); `updated_at` sau `created_at` (xác nhận/thanh toán/hủy)
- [x] Nhiều tổ hợp trạng thái: `confirmed/paid`, `confirmed/unpaid`, `pending/unpaid`, `cancelled/refunded`, `cancelled/unpaid`
- [x] `contact_name/phone/email/dob/gender` lấy từ tài khoản khách thật (15% đơn khách vãng lai)
- [x] `passengers` khớp đúng `adults + children`, đủ tên/giới tính/ngày sinh/loại khách
- [x] Trừ `seats_available` của lịch khởi hành theo số khách đã đặt (không tính đơn hủy)
- [x] `05_reviews.js`: đánh giá chỉ cho đơn đã xác nhận & đã đi, ngày sau khởi hành, nội dung đa dạng
- [x] `seed-config.js`: `users: 30`, `services: 10`, `bookings: 50`, `reviews: 40`
- [x] Chạy `npm run seed` + verify: 33 users / 50 bookings / 172 passengers; 0 đơn lệch giá; 0 sai ngày; 0 lệch passenger
- [x] Test API admin: `/stats`, `/trips`, `/top-packages`, list, `/:id` đều `success=true` với dữ liệu mới

### ✅ Fix UI — thẻ Doanh thu không tràn khung (2026-10-20)

- [x] `.stat-card-body`: khối chữ được phép co lại (`min-width: 0`, `flex: 1 1 auto`) thay vì đẩy sparkline ra ngoài
- [x] Sparkline thu nhỏ theo bề rộng thẻ (72 → 60 → 48 → 38 → 32px)
- [x] Dùng container query trên `.stat-card` để giảm cỡ số tiền ở thẻ hẹp (22 → 18 → 16 → 14 → 13px), ẩn ghi chú khi quá hẹp
- [x] `npm run lint` + `npm run build` pass

### ✅ Bổ sung chuyến khởi hành cho seed (2026-10-20)

- [x] Thêm `backend/db/seed-data/departures.js` (`EXTRA_DEPARTURES`) — 36 chuyến mới (2/tour), trải 11/2026 → 01/2027
- [x] `02_tours.js` gộp chuyến gốc + chuyến bổ sung, **chống trùng ngày** (`uk_tour_date`)
- [x] Chuẩn hoá `status` chỉ lưu `open`/`closed` (không ghi `full`)
- [x] Verify: 170 departures, 0 trùng `(tour_id, departure_date)`; 50 booking vẫn toàn vẹn (0 lệch giá/ngày/passenger)
- [x] Test API admin: tạo trùng ngày → `409`, tạo mới hợp lệ → `201`, xoá chuyến không có booking → `200`

### ✅ Đề xuất tour do AI gợi ý (hoàn thành code 2026-10-31, chờ test AI)

- [x] Migration `20261031_000013_create_tour_requests.js` tạo bảng `tour_requests`
- [x] Cập nhật `db.sql` + `00_reset.js` cho bảng mới
- [x] Backend feature `tour-request`: AI draft + gửi đề xuất + danh sách của tôi
- [x] Admin API + trang `/admin/tour-requests`
- [x] Trang `/contact`: form + chat chỉnh sửa + gửi admin + đề xuất của tôi
- [x] Test API CRUD (tạo/gửi, mine, admin list/detail/status) + `npm run lint` + `npm run build`
- [ ] Test AI draft bằng Ollama (chưa cài Ollama — endpoint fail-fast, không chặn phần còn lại)

### ✅ Dashboard Admin mới — Sidebar + Header dùng chung (2026-11-01)

- [x] Tạo `frontend/src/features/admin/dashboard/` (Layout, Sidebar, Header, Overview, menuConfig, guard)
- [x] Sidebar: logo Vietravel, menu nhóm theo role, badge, banner nâng cấp, tài khoản + đăng xuất
- [x] Header: breadcrumb + tiêu đề, tìm kiếm nhanh (Ctrl/Cmd+K), chuông thông báo, menu tài khoản
- [x] Menu theo role: `tour-staff` chỉ nhóm tour; `booking-staff` chỉ Booking; `admin` thấy tất cả (gồm Hình ảnh tour + Tài khoản nhân viên)
- [x] Guard frontend chặn chưa đăng nhập / sai role; đăng nhập staff tự vào đúng trang chủ theo role
- [x] Trang Tổng quan `/admin` dựng đủ widget theo thiết kế (KPI, doanh thu, top điểm đến, chuyến đi, gói tour, tin nhắn, booking, lịch, chuyến sắp đi, hoạt động)
- [x] Dữ liệu dashboard hard-code trong `data/mockData.js` (một chỗ duy nhất để thay API sau này)
- [x] Giữ nguyên toàn bộ nội dung các trang quản trị cũ; chỉ thay vỏ `AdminLayout`
- [x] Thêm `/admin/profile` dùng lại trang hồ sơ người dùng
- [x] `npm run lint` + `npm run build` pass

### ⬜ Việc có thể làm tiếp (backlog, chưa làm)

- [ ] Nút **Add Booking** trên dashboard — đã bỏ theo yêu cầu, chỉ thêm lại khi cần
- [ ] Sắp xếp theo cột (Name / Date / Price…) — backend chưa hỗ trợ sort
- [ ] Đổi trạng thái booking ngay trên UI — API `PUT /api/admin/bookings/:id/status` đã sẵn sàng
- [ ] Xử lý 401 → chuyển về `/login` (hiện chỉ hiện toast lỗi)
- [x] Thêm booking `payment_status = 'paid'` / `refunded` để thấy Earnings + sparkline nhiều tháng
- [ ] Đồng bộ `TripsOverview` và `TopPackages` dùng chung một range

---

## 3. API Admin Bookings

Base: `/api/admin/bookings` — tất cả yêu cầu header `Authorization: Bearer <token>` và role `admin` hoặc `booking-staff`.

| Method | Endpoint        | Query / Body                                              | Mô tả                                                                   |
| ------ | --------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/`             | `page`, `limit`, `search`, `status`, `fromDate`, `toDate` | Danh sách + tìm kiếm + lọc trạng thái + lọc ngày khởi hành + phân trang |
| GET    | `/stats`        | —                                                         | 3 thẻ thống kê + sparkline 12 tháng                                     |
| GET    | `/trips`        | `range=7d\|30d\|3m\|12m`                                  | Số chuyến `done` / `canceled` theo thời gian                            |
| GET    | `/top-packages` | `range=12m`, `limit=5`                                    | Top tour theo số lượt đặt                                               |
| GET    | `/:id`          | —                                                         | Chi tiết booking + passengers + `history` (lịch sử suy ra)              |
| PUT    | `/:id/status`   | `{ "status": "pending\|confirmed\|cancelled" }`           | Đổi trạng thái, tự hoàn/trừ ghế                                         |

### Quy tắc nghiệp vụ đã chốt

- **Earnings** = `SUM(total_price)` với `payment_status = 'paid'`.
- **Trục thời gian thống kê** = `bookings.created_at`.
- **Tên khách** = `users.fullname`, fallback `bookings.contact_name` nếu `user_id` null.
- **Trạng thái hiển thị** chỉ có 3 nhãn tiếng Việt: `Chờ xử lý`, `Đã xác nhận`, `Đã hủy` (không có `Hoàn thành`). API trả thêm `status` raw (`pending/confirmed/cancelled`) để lọc.
- **Trips Overview:** `done = confirmed`, `canceled = cancelled`.
- **Top Packages:** đếm **số lượt đặt** (`COUNT(bookings.id)`) theo tour trong **12 tháng**, xếp tour nhiều booking nhất lên đầu; `% = số booking của tour / tổng booking trong kỳ`.
- **Lọc ngày trên bảng:** `fromDate` / `toDate` áp lên `tour_departures.departure_date` (cột Ngày khởi hành), định dạng `YYYY-MM-DD`.
- **% thay đổi:** tháng hiện tại vs tháng trước; kỳ trước = 0 → `0%` (hoặc `100%` nếu kỳ này có dữ liệu).
- **Đổi trạng thái:** hủy booking → hoàn ghế; mở lại booking đã hủy → kiểm tra đủ chỗ rồi trừ ghế; tất cả trong transaction.
- **Lịch sử hoạt động:** suy ra (DB chưa có bảng audit) từ `created_at` (khởi tạo), `updated_at` + `status`/`payment_status` (xác nhận/thanh toán/hủy/hoàn tiền). Trùng thời điểm thì ưu tiên: hủy/hoàn tiền → thanh toán → xác nhận → khởi tạo.
- **Bảng giá chi tiết:** đơn giá = `price_default + price_moving` (người lớn), `price_child + price_moving_child` (trẻ em). Nếu tổng các dòng lệch `total_price` → thêm dòng "Ưu đãi / điều chỉnh".

### Response mẫu

```json
// GET /api/admin/bookings
{
	"success": true,
	"data": [
		{
			"id": 18,
			"code": "BK-00018",
			"name": "Trần Quốc Lan",
			"package": "Tour Quy Nhơn – Phú Yên 3N2Đ",
			"duration": "3 ngày 2 đêm",
			"date": "05/10/2026",
			"price": 5729895,
			"status": "confirmed",
			"status_label": "Đã xác nhận",
			"payment_status": "unpaid",
			"adults": 4,
			"children": 0,
			"created_at": "2026-10-17T09:26:18.000Z"
		}
	],
	"pagination": { "currentPage": 1, "totalPages": 2, "total": 20, "limit": 10 }
}
```

---

## 4. File quan trọng

### Backend (mới)

| File                                                        | Vai trò                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `backend/src/features/admin/bookings/booking.routes.js`     | Khai báo route, phân quyền                                        |
| `backend/src/features/admin/bookings/booking.controller.js` | HTTP handler, format response                                     |
| `backend/src/features/admin/bookings/booking.service.js`    | Nghiệp vụ, map DTO, tính %, transaction đổi trạng thái            |
| `backend/src/features/admin/bookings/booking.repository.js` | Knex query builder (list/stats/trips/top/detail/passengers/seats) |
| `backend/src/features/admin/bookings/booking.validate.js`   | Validate query/param/body                                         |

### Backend (sửa)

| File                                                     | Thay đổi                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `backend/src/app.js`                                     | Import + mount `/api/admin/bookings`                         |
| `backend/src/features/admin/bookings/booking.service.js` | Thêm `buildHistory()` + trả `history` trong chi tiết booking |

### Frontend (mới)

| File                                                   | Vai trò                                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/features/admin/bookings/bookings.api.js` | Gọi 6 endpoint admin bookings                                                                                                                                                                                 |
| `frontend/src/features/admin/bookings/BookingDetail/`  | Trang chi tiết booking: `index.jsx`, `BookingHeader`, `TourInfoSection`, `CustomerSection`, `PassengersSection`, `TotalPriceCard`, `ActivityHistory`, `InvoiceModal`, `common`, `bookingMeta`, `detailFormat` |

### Frontend (sửa)

| File                                                                | Thay đổi                                                                                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/features/admin/bookings/DashboardBooking.jsx`         | Tải stats + top packages thật, nhãn thẻ tiếng Việt                                                                                  |
| `frontend/src/features/admin/bookings/components/TripsOverview.jsx` | Tự fetch theo range, trục Y động, tiêu đề/chú thích tiếng Việt                                                                      |
| `frontend/src/features/admin/bookings/components/BookingsTable.jsx` | Mã booking cột đầu (link chi tiết), cả dòng bấm được để mở chi tiết, search debounce, lọc ngày + trạng thái, phân trang server-side |
| `frontend/src/features/admin/bookings/components/TopPackages.jsx`   | Top tour theo lượt đặt trong 12 tháng, nhãn tiếng Việt                                                                              |
| `frontend/src/features/admin/bookings/dashboard.css`                | Style bộ lọc `.filter-box`, `.filter-select`, trạng thái tải/rỗng, dòng bấm được `.row-clickable`, link mã `.booking-code-link`     |
| `frontend/src/routes/AdminRoutes.jsx`                               | Thêm route `bookings/:id` → trang chi tiết booking                                                                                  |

### Tour Requests (mới 2026-10-31)

| File                                                             | Vai trò                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `backend/src/features/tour-request/tourRequest.routes.js`        | Route user: draft (public, rate-limit 8/15ph), create, mine, mine/:id   |
| `backend/src/features/tour-request/tourRequest.service.js`       | Nghiệp vụ, sanitize `request_data`, map DTO, `pickRequestData`          |
| `backend/src/features/tour-request/tourRequest.repository.js`    | Knex: create/list/detail, join users, tìm tour tương tự                 |
| `backend/src/features/tour-request/proposal.ai.js`               | Gọi Ollama `qwen2.5:3b`, prompt JSON, normalize draft, retry 1 lần      |
| `backend/src/features/admin/tour-requests/tourRequest.routes.js` | Route admin: list, detail, đổi status + ghi chú                         |
| `frontend/src/pages/Contact.jsx`                                 | Trang user: form, AI draft, refine chat, gửi admin, khôi phục sau login |
| `frontend/src/features/tour-requests/`                           | API + component dùng chung + `MyRequests`                               |
| `frontend/src/features/admin/tour-requests/`                     | API admin + trang danh sách + modal chi tiết/duyệt/từ chối              |
| `frontend/src/routes/AdminRoutes.jsx`                            | Thêm route `/admin/tour-requests`                                       |
| `frontend/src/components/AdminSidebar.jsx`                       | Thêm menu "Đề xuất tour"                                                |
| `frontend/src/features/chat/ChatWidget.jsx`                      | Thêm CTA "Tạo đề xuất với AI" → `/contact#de-xuat-tour`                 |

### Đã xóa

- `frontend/src/features/admin/bookings/data/mockData.js` (và thư mục `data/`)

---

## 5. Lưu ý khi làm tiếp

- Backend dùng DB **`db_viet_travel`** trên port **`3307`** (xem `backend/.env`). MySQL MCP trong `~/.config/opencode/opencode.jsonc` đã trỏ đúng `MYSQL_DB=db_viet_travel` (2026-11-01); trước đó trỏ `db_viet_tour` ⇒ server MCP chết với "MCP server process exited with code 1" (thực chất là `ER_BAD_DB_ERROR: Unknown database`). Nếu gặp lại: bật `ENABLE_LOGGING=true` trong env của MCP để thấy lỗi thật, và **đừng sửa dữ liệu test qua MCP** — kiểm tra bằng chính backend/Knex.
- `mysql2` trả `DECIMAL`/`SUM` dạng **string** → luôn `Number(...)` trước khi tính toán/format.
- Route tĩnh (`/stats`, `/trips`, `/top-packages`) phải khai báo **trước** `/:id`.
- Seed hiện tại: **33 user** (3 nội bộ + 30 khách), **50 booking**, **172 passenger**, trải 13 tháng với đủ trạng thái `confirmed/paid`, `confirmed/unpaid`, `pending/unpaid`, `cancelled/refunded`, `cancelled/unpaid`. Chạy `cd backend; npm run seed` để dựng lại DB sạch (reset id từ 1).
- Login dùng field `username` (không phải `email`).
- Khi thêm endpoint mới: giữ format response `{ success, data?, message? }` và cập nhật file này.

---

## 6. Cách kiểm tra nhanh

```powershell
# Backend (port 3000)
cd backend
npm run dev

# Frontend (Vite)
cd frontend
npm run dev
npm run lint
npm run build
```

Test API nhanh (PowerShell):

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"admin@viettour.vn","password":"123456"}'

$headers = @{ Authorization = "Bearer $($login.data.token)" }

Invoke-RestMethod -Uri "http://localhost:3000/api/admin/bookings?page=1&limit=10" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/bookings?fromDate=2026-10-01&toDate=2026-12-31&status=confirmed" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/bookings/stats" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/bookings/trips?range=12m" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/bookings/top-packages?range=12m&limit=5" -Headers $headers
```

---

## 7. Lịch sử cập nhật

### 2026-11-01 — Sửa MCP `mysql` chết với "MCP server process exited with code 1"

**Đã làm:**

- [x] Chẩn đoán: MCP `pdf` vẫn `mcp connected tools=9`; chỉ MCP `mysql` chết ngay sau `initialize`. Log OpenCode chỉ báo `MCP server process exited with code 1` (không có stderr) vì `@benborla29/mcp-server-mysql` tắt log trừ khi `ENABLE_LOGGING=true`.
- [x] Chạy tay với `ENABLE_LOGGING=true` → lộ nguyên nhân thật: `Error: Unknown database 'db_viet_tour'` (`ER_BAD_DB_ERROR`, errno 1049). `dist/index.js` test connection khi khởi động và `safeExit(1)` nếu fail ⇒ OpenCode thấy process exit 1.
- [x] Nguyên nhân gốc: `~/.config/opencode/opencode.jsonc` → `mcp.mysql.environment.MYSQL_DB = "db_viet_tour"` (tên cũ từ project `travel-website-api`), trong khi DB thật là `db_viet_travel` (`backend/.env`).
- [x] Sửa `MYSQL_DB` → `db_viet_travel`, thêm `ENABLE_LOGGING: "true"` để lần sau lỗi hiện rõ.

**File liên quan:**

- Sửa: `C:\Users\HELLO\.config\opencode\opencode.jsonc` (ngoài repo), `AGENTS.md` (làm rõ tên DB default vs thực tế), `PROGRESS.md`. Không đổi code backend/frontend.

**Kiểm tra:**

- Spawn thủ công: `Server started and listening on stdio` (không còn exit 1).
- MCP reconnect tự động; gọi `mysql_query` → `{"tours": 18, "bookings": 50, "db": "db_viet_travel"}`.

**Ghi chú / việc còn lại:**

- Không đổi default `db_viet_tour` trong `db.sql` / `knexfile.js` / `.env.example` / `README.md` (giữ làm template) — `.env` luôn thắng.
- Nếu MCP lại fail: bật `ENABLE_LOGGING=true` rồi xem stderr trước khi đoán.

### 2026-11-01 — Sửa lỗi không kết nối được trợ lý AI (Ollama thiếu model)

**Đã làm:**

- [x] Chẩn đoán: container `ollama` vẫn chạy (port 11434), nhưng volume `ollama_data` chỉ có `qwen2.5:latest` (7B) — **thiếu `nomic-embed-text`** nên RAG không build được (`/api/embed` → 404) ⇒ `/api/chat` luôn trả 503 "Trợ lý du lịch đang khởi tạo dữ liệu"; **thiếu `qwen2.5:3b`** đúng như `.env` (`OLLAMA_MODEL=qwen2.5:3b`).
- [x] Pull lại trong container: `docker exec ollama ollama pull nomic-embed-text` và `docker exec ollama ollama pull qwen2.5:3b`.
- [x] Test: `/api/embed` 200 (768 dims), `/api/chat` với `qwen2.5:3b` 200, `POST /api/chat` qua backend 200 trả lời + `sources`.

**File liên quan:**

- Sửa: `AGENTS.md` (thêm mục kiểm tra/khắc phục model thiếu), `PROGRESS.md`. Không đổi code.

**Kiểm tra:**

- `docker exec ollama ollama list` → có `qwen2.5:3b` (1.9 GB) + `nomic-embed-text` (274 MB).
- `curl -X POST localhost:3000/api/chat` với câu hỏi tour → 200, có nội dung + danh sách tour nguồn.

**Ghi chú / việc còn lại:**

- `Dockerfile.ollama` chỉ copy model vào volume khi volume **trống**; nếu volume đã tồn tại (máy khác/phiên bản cũ) thì `--build` không thêm model ⇒ phải pull thủ công như trên.

### 2026-11-01 — Khôi phục DB local sau lỗi "Unknown database"

**Đã làm:**

- [x] `npm run db:reset` lỗi `Error: Unknown database 'db_viet_travel'` vì MySQL tại `localhost:3307` chưa có DB này (không phải lỗi cấu hình — `.env` dùng `DB_NAME=db_viet_travel`, port `3307`).
- [x] Tạo lại DB: `CREATE DATABASE IF NOT EXISTS db_viet_travel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`.
- [x] Chạy lại `npm run db:reset` → 14 migration + 6 seed file thành công.

**File liên quan:**

- Sửa: `PROGRESS.md`. Không sửa code/`.env`.

**Kiểm tra:**

- `npm run db:reset` pass: `Batch 1 run: 14 migrations`, `Ran 6 seed files`.
- Đếm bản ghi: users 33, tours 18, tour_images 90, tour_departures 170, bookings 50, reviews 28, services 10.

**Ghi chú / việc còn lại:**

- Nếu MySQL bị reset/xóa DB lần nữa, tạo DB trước rồi mới chạy migrate (`knex` không tự tạo database).

### 2026-10-31 — Hoàn thiện chức năng đề xuất tour do AI gợi ý

**Đã làm:**

- [x] Backend feature `tour-request`: repository, AI draft, service, validate, controller, routes.
- [x] Admin feature `admin/tour-requests`: list + thống kê, detail, đổi trạng thái + ghi chú.
- [x] API:
  - `POST /api/tour-requests/draft` — public, rate-limit 8 lần/15 phút.
  - `POST /api/tour-requests` — user gửi đề xuất.
  - `GET /api/tour-requests/mine`, `GET /api/tour-requests/mine/:id`.
  - `GET /api/admin/tour-requests`, `GET /api/admin/tour-requests/:id`.
  - `PUT /api/admin/tour-requests/:id/status`.
- [x] AI dùng Ollama `qwen2.5:3b`, prompt JSON, nguồn tour tương tự, normalize draft; lỗi AI fail-fast nếu Ollama không chạy.
- [x] Trang `/contact`: form nhu cầu, tạo nháp AI, chat chỉnh sửa, đăng nhập để gửi, khôi phục nháp qua `sessionStorage`, danh sách đề xuất của tôi.
- [x] Trang admin `/admin/tour-requests`: thống kê, lọc trạng thái/tìm kiếm, phân trang, modal chi tiết, duyệt/từ chối + ghi chú, copy nội dung, link tạo tour thủ công.
- [x] Admin detail join `users` để hiển thị khách hàng; sanitize `request_data`; validate chặt hơn.
- [x] Thêm route admin, menu sidebar "Đề xuất tour", CTA chat widget.

**File liên quan:**

- Thêm: `backend/src/features/tour-request/*`, `backend/src/features/admin/tour-requests/*`, `frontend/src/features/tour-requests/*`, `frontend/src/features/admin/tour-requests/*`.
- Sửa: `backend/src/app.js`, `db.sql`, `backend/db/seeds/00_reset.js`, `frontend/src/pages/Contact.jsx`, `frontend/src/routes/AdminRoutes.jsx`, `frontend/src/components/AdminSidebar.jsx`, `frontend/src/components/Modal.jsx`, `frontend/src/features/chat/ChatWidget.jsx`, `PROGRESS.md`.

**Kiểm tra:**

- `node --check` pass toàn bộ file backend mới/sửa.
- Test API với admin `admin@viettour.vn` / `123456` và customer `at3@gmail.com` / `123456`: tạo đề xuất, mine list/detail, admin list/detail, duyệt + ghi chú; DB request id 1 đúng dữ liệu.
- `npm run lint` + `npm run build` pass.
- **Chưa test AI draft** vì chưa cài Ollama; endpoint fail nhanh (~0.1s) và không chặn phần gửi đề xuất.

**Ghi chú / việc còn lại:**

- Cài Ollama + `docker compose up -d --build` rồi test `/api/tour-requests/draft` và luồng chat refine.
- Admin detail `user` join đã sửa nhưng chưa restart server để verify lại.
- `npm run seed` sẽ reset `tour_requests` (chưa có seed demo); request test id 1 sẽ bị xóa nếu seed.
- `status = approved` chỉ là đồng ý tổ chức; admin vẫn tạo tour thủ công.

---

### 2026-10-31 — Bắt đầu chức năng đề xuất tour (migration + schema)

**Đã làm:**

- [x] Tạo migration `20261031_000013_create_tour_requests.js` với bảng `tour_requests` (thông tin đề xuất, `request_data`/`ai_draft` JSON, trạng thái admin, FK user/reviewed_by).
- [x] Cập nhật `db.sql` để DB tạo mới có bảng `tour_requests`.
- [x] Cập nhật `backend/db/seeds/00_reset.js` xóa `tour_requests` trước `users`.

**File liên quan:**

- Thêm: `backend/db/migrations/20261031_000013_create_tour_requests.js`
- Sửa: `db.sql`, `backend/db/seeds/00_reset.js`

**Kiểm tra:**

- `cd backend; npm run migrate` → batch 2 chạy 3 migration (gồm migration mới).
- Query `information_schema` xác nhận bảng `tour_requests` đủ cột + JSON + FK.
- **Chưa chạy `npm run seed`** để tránh xóa dữ liệu hiện tại.

**Ghi chú / việc còn lại:**

- Đã hoàn thiện tiếp ở mục **2026-10-31 — Hoàn thiện chức năng đề xuất tour do AI gợi ý** phía trên.
- Khi chạy `npm run seed`, bảng `tour_requests` sẽ được reset (chưa có seed demo).

---

### 2026-10-20 — Bổ sung chuyến khởi hành (tour_departures) vào seed

**Đã làm:**

- [x] Tạo `backend/db/seed-data/departures.js` — `EXTRA_DEPARTURES` key theo slug tour, 2 chuyến/tour (36 chuyến), trải `2026-11-20` → `2027-01-30`.
- [x] Sửa `02_tours.js`: gộp `t.departures` (tours.js) + `EXTRA_DEPARTURES[slug]`, **chặn trùng ngày** bằng `Set` trước khi insert (DB unique `uk_tour_date`).
- [x] Chuẩn hoá `status` khi seed: chỉ lưu `open`/`closed`, không ghi `full` (hệ thống tự suy ra từ `seats_available <= 0`).

**File liên quan:**

- Thêm: `backend/db/seed-data/departures.js`
- Sửa: `backend/db/seeds/02_tours.js`, `AGENTS.md`

**Kiểm tra:**

- `cd backend; npm run seed` → 170 departures; query 0 cặp `(tour_id, departure_date)` trùng; status lưu DB chỉ `open`/`closed`.
- Toàn vẹn booking sau seed: 50 booking, 173 passenger, 0 lệch `total_price`, 0 đơn tạo sau ngày khởi hành, 0 lệch số passenger.
- API admin: `GET /api/admin/departures` thấy chuyến mới; POST trùng ngày → `409`; POST hợp lệ → `201`; DELETE chuyến test → `200` (đã xoá, DB về 170).

**Ghi chú / quy tắc khi thêm chuyến:**

- `(tour_id, departure_date)` **duy nhất** → không trùng ngày cho cùng tour.
- Ngày ≥ hôm nay + 3 (`MIN_LEAD_DAYS`); `seats_total ≥ 1`; `0 ≤ seats_available ≤ seats_total`; `price_moving* ≥ 0`; `status` chỉ `open`/`closed`.
- Chuyến đã có booking thì **không xoá được** (FK RESTRICT) → dùng `status = "closed"`.
- Thêm trực tiếp vào `EXTRA_DEPARTURES` rồi `npm run seed` là xong.

---

### 2026-10-20 — Fix thẻ Doanh thu bị tràn khung

**Đã làm:**

- [x] Xác định nguyên nhân: `.stat-card-body` là flex nhưng khối chữ không được phép co (`min-width: auto`) nên số tiền dài đẩy sparkline/tràn card.
- [x] Cho khối chữ co lại: `min-width: 0`, `flex: 1 1 auto`; giảm gap 12 → 8px.
- [x] Sparkline co theo thẻ: `72 → 60 → 48 → 38 → 32px`.
- [x] `.stat-card { container-type: inline-size }` + container query giảm cỡ `.stat-value` ở thẻ hẹp (`22 → 18 → 16 → 14 → 13px`), ẩn `.stat-note` khi thẻ < 190px.
- [x] `.stat-change` cho phép xuống dòng để không tràn ngang.

**File liên quan:**

- Sửa: `frontend/src/features/admin/bookings/dashboard.css`

**Kiểm tra:**

- `npm run lint` pass, `npm run build` pass.
- Đã kiểm tra CSS sau build vẫn giữ `container-type` + `@container`.

---

### 2026-10-20 — Seed DB thực tế: user thật + 50 booking + passenger khớp

**Đã làm:**

- [x] `00_reset.js`: xóa theo thứ tự FK rồi `ALTER TABLE ... AUTO_INCREMENT = 1` → id sạch bắt đầu từ 1.
- [x] `01_users.js`: **giữ nguyên email admin/staff** (`admin@`, `tourstaff@`, `bookingstaff@viettour.vn`); thay 30 khách hàng bằng tên thật + email theo tên thật (vd `nguyenvanan@gmail.com`) + SĐT/địa chỉ đầy đủ, ngày đăng ký trải đều.
- [x] `04_bookings.js`: 50 booking sinh theo PRNG có seed (chạy lại ổn định):
  - `total_price` = `adults*(price_default + price_moving) + children*(price_child + price_moving_child)` — **tính toán, không bịa**.
  - `created_at` trải 13 tháng gần nhất, luôn **trước** ngày khởi hành ≥ 5 ngày; `updated_at` = lúc xác nhận/thanh toán/hủy (sau `created_at`).
  - Đủ trạng thái: `confirmed/paid` (28), `confirmed/unpaid` (7), `pending/unpaid` (7), `cancelled/refunded` (6), `cancelled/unpaid` (2).
  - `contact_name/phone/email/dob/gender` lấy từ tài khoản khách thật; ~15% đơn là khách vãng lai nhưng vẫn đủ thông tin.
  - `passengers` khớp đúng `adults + children` (172 hành khách), đủ tên/giới tính/ngày sinh/`passenger_type`.
  - Cập nhật `seats_available` của `tour_departures` theo số khách đã đặt (bỏ qua đơn hủy).
- [x] `05_reviews.js`: chỉ đánh giá đơn đã xác nhận & đã đi, ngày sau khởi hành, rating/nội dung đa dạng, phủ tối thiểu mỗi tour.
- [x] `seed-config.js`: `users: 30`, `services: 10`, `bookings: 50`, `reviews: 40`.

**File liên quan:**

- Sửa: `backend/db/seeds/00_reset.js`, `01_users.js`, `04_bookings.js`, `05_reviews.js`, `backend/db/seed-config.js`

**Kiểm tra:**

- `cd backend; npm run seed` → `Ran 6 seed files`.
- Query verify: 33 users / 30 customers / 50 bookings / 172 passengers / 30 reviews; **0** đơn lệch `total_price`; **0** đơn `created_at >= departure_date`; **0** đơn `updated_at < created_at`; **0** đơn lệch số passenger.
- Test API admin: `/stats` (50 bookings, 172 khách, earnings `402.660.000 đ`, sparkline 12 tháng), `/trips`, `/top-packages`, list, `/:id` (có `history` 3 mốc cho đơn `cancelled/refunded`) đều `success=true`.

**Ghi chú:**

- Chạy `npm run seed` sẽ **xóa toàn bộ** dữ liệu hiện có và dựng lại DB sạch; redis không cần cho bước seed.

---

### 2026-10-19 — Chỉnh nền header card + màu khối "Chưa thu"

**Đã làm:**

- [x] Header các card (Thông tin tour, Thông tin khách hàng, Danh sách hành khách, Tổng tiền, Lịch sử hoạt động) dùng nền xanh nhạt `bg-primary-50/60`.
- [x] Khối **Chưa thu** đổi từ nền vàng (amber) sang xanh dương (`bg-sky-100`, chữ `text-sky-700`).
- [x] Đưa tiêu đề Tổng tiền / Lịch sử hoạt động vào header card thống nhất với các card còn lại.

**File liên quan:**

- Sửa: `frontend/src/features/admin/bookings/BookingDetail/common.jsx`, `TotalPriceCard.jsx`, `ActivityHistory.jsx`

**Kiểm tra:**

- `npm run lint` pass, `npm run build` pass.

---

### 2026-10-19 — Trang Admin Booking Detail + click dòng mở chi tiết

**Đã làm:**

- [x] Thêm route `/admin/bookings/:id`; bấm một dòng (hoặc mã booking) trong bảng sẽ mở chi tiết đúng `id`.
- [x] Tạo thư mục `frontend/src/features/admin/bookings/BookingDetail/` và tách component: header, thông tin tour, khách hàng, hành khách, tổng tiền, lịch sử hoạt động, modal hóa đơn.
- [x] Component **Tổng tiền**: dòng người lớn/trẻ em + dòng "Ưu đãi / điều chỉnh" khi lệch tổng, tổng cộng, khối thu tiền theo `payment_status` (ĐÃ THU / CHƯA THU / ĐÃ HOÀN TIỀN).
- [x] Component **Lịch sử hoạt động**: timeline dot màu, sắp xếp mới nhất trên cùng.
- [x] Backend `getBookingDetailService` trả thêm `history` (suy ra, không cần migration).
- [x] Modal **In hóa đơn** dùng `print-only` có sẵn.
- [x] Skeleton khi tải + alert/nút thử lại khi lỗi.

**File liên quan:**

- Thêm: `frontend/src/features/admin/bookings/BookingDetail/` (index, BookingHeader, TourInfoSection, CustomerSection, PassengersSection, TotalPriceCard, ActivityHistory, InvoiceModal, common, bookingMeta, detailFormat)
- Sửa: `backend/src/features/admin/bookings/booking.service.js`, `frontend/src/routes/AdminRoutes.jsx`, `frontend/src/features/admin/bookings/components/BookingsTable.jsx`, `frontend/src/features/admin/bookings/dashboard.css`

**Kiểm tra:**

- `npm run lint` pass, `npm run build` pass.
- Test API `GET /api/admin/bookings/:id`: booking hủy trả `history` 2 mốc (hủy + khởi tạo) đúng thứ tự; kèm `passengers` và `status_label`.

**Ghi chú:**

- Lịch sử là **suy ra** từ `created_at`/`updated_at` + trạng thái; chưa có bảng audit riêng. Booking seed đều `unpaid` nên khối thu tiền hiển thị "CHƯA THU".
- Trang chi tiết hiện chỉ hiển thị, chưa có nút đổi trạng thái.

---

### 2026-10-19 — Chỉnh độ tương phản nhãn % Top Packages

**Đã làm:**

- [x] Nhãn phần trăm trong Top Packages dùng **chữ trắng**.
- [x] Nền nhãn giữ đúng **màu tương ứng với lát donut** của từng tour.
- [x] Thêm bóng chữ nhẹ để chữ trắng dễ đọc hơn trên nền sáng.
- [x] Giữ nguyên màu lát donut.

**File liên quan:**

- Sửa: `TopPackages.jsx`, `dashboard.css`

**Kiểm tra:**

- `npm run lint` pass, `npm run build` pass.

---

### 2026-10-19 — Việt hóa dashboard + bộ lọc ngày/trạng thái + Top Packages theo lượt đặt

**Đã làm:**

- [x] Việt hóa toàn bộ nhãn: thẻ thống kê, Tổng quan chuyến đi, Tour đặt nhiều nhất, bảng booking, phân trang.
- [x] Top Packages: tính tổng lượt đặt trong 12 tháng, xếp tour nhiều booking nhất lên đầu, `%` theo tổng lượt đặt.
- [x] Bảng booking: cột **Mã booking** đầu tiên, **Tên khách** thứ hai.
- [x] Bỏ nút **Add Booking**.
- [x] Thay nút **Today** bằng bộ lọc **Từ ngày / Đến ngày** + **Trạng thái**.
- [x] Backend list nhận `fromDate`, `toDate` và trả `status` raw + `status_label` tiếng Việt.

**File liên quan:**

- Sửa backend: `booking.repository.js`, `booking.service.js`, `booking.validate.js`
- Sửa frontend: `DashboardBooking.jsx`, `TripsOverview.jsx`, `TopPackages.jsx`, `BookingsTable.jsx`, `dashboard.css`

**Kiểm tra:**

- `npm run lint` pass, `npm run build` pass.
- Test API: lọc `fromDate=2026-10-01&toDate=2026-12-31&status=confirmed` → 4 booking đúng.
- Test validate: ngày sai định dạng / from > to → 400.
- Test top-packages: `totalBookings = 20`, tour top 3 booking (15%).

**Ghi chú:**

- TopPackages hiện cố định range `12m` trong `DashboardBooking`.
- Bộ lọc ngày áp lên `tour_departures.departure_date` (Ngày khởi hành).

---

### 2026-10-19 — Nối dashboard Admin Bookings với DB thật

**Đã làm:**

- Tạo mới toàn bộ backend feature `admin/bookings` với 6 endpoint.
- Nối `DashboardBooking`, `TripsOverview`, `BookingsTable`, `TopPackages` với API thật.
- Xóa mock data.
- Kiểm tra: `npm run lint` pass, `npm run build` pass.
- Test API thật: 20 bookings, 63 khách, 0 đ earnings; trips 12 tháng; top 5 tour.
- Test đổi trạng thái `confirmed → cancelled → confirmed`, ghế được hoàn/trừ đúng và đã khôi phục dữ liệu test.

**File liên quan:**

- Thêm: `backend/src/features/admin/bookings/*` (5 file), `frontend/src/features/admin/bookings/bookings.api.js`
- Sửa: `backend/src/app.js`, `DashboardBooking.jsx`, `TripsOverview.jsx`, `BookingsTable.jsx`, `TopPackages.jsx`, `dashboard.css`
- Xóa: `frontend/src/features/admin/bookings/data/mockData.js`

**Ghi chú:**

- Earnings = `0 đ` vì toàn bộ booking seed là `unpaid`.
- Sparkline chỉ có 1 tháng có dữ liệu vì mọi booking được tạo cùng ngày `2026-10-17`.

---

### 2026-11-02 — Hoàn thiện tính năng Quên mật khẩu & Đặt lại mật khẩu

**Đã làm:**

- Bổ sung 2 hàm API `forgotPassword` và `resetPassword` trong `auth.api.js` kết nối với các endpoint Express backend.
- Hoàn thiện toàn bộ logic & giao diện trang `ForgotPassword.jsx`: form validation, gọi API, hiển thị loading spinner, thông báo lỗi nếu email không tồn tại hoặc tài khoản Google, chuyển sang màn hình thông báo gửi email thành công với đếm ngược 60 giây gửi lại.
- Tạo mới trang `ResetPassword.jsx` và gắn route `/reset-password` trong `AppRoutes.jsx` để người dùng khi nhấn link trong email có thể đặt lại mật khẩu thành công.
- Kiểm tra `npm run lint` và `npm run build` trên frontend đều pass.

**File liên quan:**

- Thêm: `frontend/src/features/auth/ResetPassword.jsx`
- Sửa: `frontend/src/features/auth/ForgotPassword.jsx`, `frontend/src/features/auth/auth.api.js`, `frontend/src/routes/AppRoutes.jsx`, `PROGRESS.md`

**Kiểm tra:**

- `npm run lint` pass, `npm run build` pass.

---

### 2026-11-02 — Biểu đồ Use Case module Đề xuất tour

**Đã làm:**

- [x] Dựng biểu đồ use case tổng quát cho module `tour_requests` (2 actor chính + 1 actor phụ, 11 use case, 2 gói nghiệp vụ Khách hàng / Admin).
- [x] Dựng biểu đồ chi tiết nhóm Khách hàng: `UC-KH-01..06` + các use case include (`Sinh bản nháp AI`, `Kiểm tra dữ liệu đầu vào`, `Tìm tour tương tự`) và extend (`Chỉnh sửa bản nháp`).
- [x] Dựng biểu đồ chi tiết nhóm Admin: `UC-AD-01..05` + include (`Xem chi tiết`, `Ghi nhận người duyệt`) và extend (`Duyệt`, `Từ chối`, `Đánh dấu đang xem xét`).
- [x] Viết tài liệu `README.md`: bảng actor, bảng use case, giải thích lý do từng quan hệ include/extend, ánh xạ UC → API → bảng dữ liệu, sơ đồ trạng thái đề xuất.
- [x] Ghi rõ 5 điểm **chưa triển khai** (không thông báo cho admin, duyệt xong không tạo tour, khách không hủy/sửa đề xuất, chưa chặn chuyển trạng thái ngược, chưa có log xử lý).
- [x] Render sẵn PNG bằng PlantUML + Graphviz; thêm `.gitignore` cho `plantuml.jar` và `docs/uc/tools/` (binary nặng).

**File liên quan:**

- Thêm: `docs/uc/tong-quat.puml`, `docs/uc/chi-tiet-khach-hang.puml`, `docs/uc/chi-tiet-admin.puml`, `docs/uc/README.md`, `docs/uc/images/UC_TongQuat_DeXuatTour.png`, `docs/uc/images/UC_ChiTiet_KhachHang.png`, `docs/uc/images/UC_ChiTiet_Admin.png`.
- Sửa: `.gitignore`, `PROGRESS.md`.

**Kiểm tra:**

- Render lại bằng `java -jar docs/uc/plantuml.jar -tpng -charset UTF-8 -o images docs/uc/*.puml` (cần `GRAPHVIZ_DOT` trỏ tới `docs/uc/tools/Graphviz-12.0.0-win64/bin/dot.exe`) → 3 file PNG tạo thành công, tiếng Việt hiển thị đúng dấu.
- Đối chiếu từng use case với endpoint thật trong `backend/src/features/tour-request/tourRequest.routes.js` và `backend/src/features/admin/tour-requests/tourRequest.routes.js`.

**Ghi chú / việc còn lại:**

- Sơ đồ chỉ vẽ use case **đã có trong code**; `UC-AD-06 (Tạo tour từ đề xuất đã duyệt)` và thông báo cho admin vẫn nằm ở phần "chưa triển khai".
- Nếu trường yêu cầu đúng chuẩn UML không kèm công cụ, có thể xuất SVG/PNG từ `.puml` để dán vào Word.

---

### 2026-11-03 — Cập nhật toàn bộ bộ lọc trạng thái booking (Loại bỏ "Chờ xử lý")

**Đã làm:**

- [x] **Bộ lọc Admin (`BookingsTable.jsx`):** Bỏ tùy chọn "Chờ xử lý" (`pending`). Bộ lọc hiện tại gồm: **Tất cả trạng thái**, **Đã xác nhận** (`confirmed`), **Yêu cầu hủy** (`cancel_requested`), **Đã hủy** (`cancelled`).
- [x] **Các tab bộ lọc User (`BookingHistory.jsx`):** Bỏ tab "Đang chờ" (`pending`). Chuyển thành 4 tab chuẩn: **Tất cả**, **Đã xác nhận**, **Yêu cầu hủy**, **Đã hủy**.
- [x] **Bảng Booking gần đây (`RecentBookings.jsx`):** Cập nhật nhãn trạng thái đồng bộ, thay thế `pending` bằng `cancel_requested` ("Yêu cầu hủy").
- [x] Chạy `npm run lint` pass 100%.

**File liên quan:**

- Sửa:
  - `frontend/src/features/admin/bookings/components/BookingsTable.jsx`
  - `frontend/src/features/user/bookings/BookingHistory.jsx`
  - `frontend/src/features/admin/dashboard/components/RecentBookings.jsx`

### 2026-11-03 — Cập nhật dữ liệu mẫu (Seed) chuẩn nghiệp vụ mới

**Đã làm:**

- [x] Chỉnh sửa file seed `backend/db/seeds/04_bookings.js`: loại bỏ hoàn toàn các đơn mẫu có trạng thái "Chờ xử lý" (`pending`) và "Chưa thu" (`unpaid` 0 đ).
- [x] Phân bổ lại dữ liệu mẫu 50 đơn thực tế theo 3 nhóm chuẩn nghiệp vụ:
  - **Đã xác nhận & Đã thanh toán full 100% (`confirmed + paid`):** 25 đơn (paid_amount = total_price).
  - **Đã xác nhận & Đã cọc 30% (`confirmed + deposit_paid`):** 10 đơn (paid_amount = deposit_amount 30%, có hạn thanh toán balance_due_at trong tương lai).
  - **Yêu cầu hủy (`cancel_requested + paid`):** 7 đơn (được tạo từ đơn đã trả đủ, đang chờ Admin duyệt).
  - **Đã hủy & Đã hoàn tiền (`cancelled + refunded`):** 8 đơn (đã thanh toán trước đó và được hoàn tiền).
- [x] Đồng bộ các bản ghi trong `booking_payments` tương ứng với từng giao dịch cọc / full.
- [x] Chạy lại thành công toàn bộ `npm run seed` vào cơ sở dữ liệu.

**File liên quan:**

- Sửa: `backend/db/seeds/04_bookings.js`

### 2026-11-03 — Cập nhật sắp xếp danh sách booking theo thời gian cập nhật mới nhất

**Đã làm:**

- [x] Đổi thứ tự sắp xếp danh sách booking ở Admin (`AdminBooking.list`) từ `created_at desc` sang `updated_at desc, id desc`.
- [x] Đổi thứ tự sắp xếp danh sách booking của User (`Booking.getAll` và `Booking.getByUserId`) sang `updated_at desc`.
- [x] Khi khách hàng vừa đặt đơn mới, thanh toán, hoặc gửi yêu cầu hủy, `updated_at` được cập nhật và booking đó sẽ ngay lập tức được đẩy lên đầu danh sách để Admin/User dễ theo dõi nhất.

**File liên quan:**

- Sửa:
  - `backend/src/features/admin/bookings/booking.repository.js`
  - `backend/src/features/booking/booking.repository.js`

### 2026-11-03 — Quy trình Hủy booking & Hoàn tiền (User yêu cầu & Admin phê duyệt)

**Đã làm:**

- [x] **Backend User Booking:** Sửa logic hủy đơn `cancelBookingService` trong `backend/src/features/booking/booking.service.js`. Chỉ hiển thị và cho phép gửi yêu cầu hủy khi `payment_status === 'paid'`. Khi gửi, đơn chuyển sang trạng thái `cancel_requested` và tự động tính số tiền hoàn dự kiến dựa trên mốc ngày khởi hành.
- [x] **Backend Refund info API:** Thêm `GET /api/bookings/:id/refund-info` để frontend hiển thị trước cho khách thông tin phạt/hoàn tiền trước khi bấm xác nhận hủy.
- [x] **Backend Admin Booking:** Cập nhật `refundBookingService` và `rejectCancelBookingService` trong `backend/src/features/admin/bookings/` để admin phê duyệt hoặc từ chối yêu cầu hủy. Khi phê duyệt: chuyển `status = 'cancelled'`, `payment_status = 'refunded'` và hoàn lại ghế cho tour trong transaction mà không thêm cột dữ liệu mới vào DB.
- [x] **Frontend User:** Thêm Modal xác nhận hủy tour `CancelModal.jsx` kèm chi tiết chính sách hoàn tiền (≥15 ngày: phạt 10%, 10-14 ngày: phạt 50%, 7-9 ngày: phạt 70%, <7 ngày: phạt 100%). Cập nhật `BookingHeader.jsx` chỉ hiện nút hủy khi khách đã trả đủ (`paid`) và chưa gửi yêu cầu.
- [x] **Frontend Admin:** Tạo modal `AdminRefundModal.jsx` cho ban quản trị xem bảng tính hoàn tiền, duyệt hoàn tiền (ghi nhận thủ công) hoặc từ chối yêu cầu hủy. Cập nhật thẻ trạng thái tổng tiền (`TotalPriceCard.jsx`) và bộ lọc danh sách booking (`BookingsTable.jsx`).
- [x] **Chạy lint & build:** `npm run lint` pass 100%, `npm run build` pass 100%.

**File liên quan:**

- Thêm: `frontend/src/features/admin/bookings/BookingDetail/AdminRefundModal.jsx`
- Sửa: 
  - `backend/src/features/booking/booking.service.js`
  - `backend/src/features/booking/booking.controller.js`
  - `backend/src/features/booking/booking.routes.js`
  - `backend/src/features/admin/bookings/booking.service.js`
  - `backend/src/features/admin/bookings/booking.controller.js`
  - `backend/src/features/admin/bookings/booking.routes.js`
  - `backend/src/features/admin/bookings/booking.repository.js`
  - `backend/src/features/admin/bookings/booking.validate.js`
  - `frontend/src/features/user/bookings/booking.api.js`
  - `frontend/src/features/user/bookings/bookingStatus.js`
  - `frontend/src/features/user/bookings/BookingDetail/BookingHeader.jsx`
  - `frontend/src/features/user/bookings/BookingDetail/CancelModal.jsx`
  - `frontend/src/features/user/bookings/BookingDetail/index.jsx`
  - `frontend/src/features/admin/bookings/bookings.api.js`
  - `frontend/src/features/admin/bookings/BookingDetail/bookingMeta.js`
  - `frontend/src/features/admin/bookings/BookingDetail/TotalPriceCard.jsx`
  - `frontend/src/features/admin/bookings/BookingDetail/index.jsx`
  - `frontend/src/features/admin/bookings/components/BookingsTable.jsx`

**Kiểm tra:**

- `npm run lint` (frontend) pass không còn lỗi.
- `npm run build` (frontend) hoàn tất thành công (2715 modules).

---

## 8. Mẫu ghi cho lần cập nhật sau

```md
### YYYY-MM-DD — <Tên việc>

**Đã làm:**

- [x] ...
- [x] ...

**File liên quan:**

- Thêm: ...
- Sửa: ...
- Xóa: ...

**Kiểm tra:**

- `npm run lint` / `npm run build` / test API ...

**Ghi chú / việc còn lại:**

- ...
```
