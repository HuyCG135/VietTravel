# VietTour

Du lịch web app: `backend/` (Express + MySQL) và `frontend/` (React + Vite). Hai package độc lập, mỗi package có `package.json` riêng — **không có** root `package.json` / workspaces.

## Commands

Backend (port 3000):
- `cd backend; npm run dev` — dev với nodemon; `npm start` chạy `server.js`.
- Không có lint/test (test script là placeholder). Verify bằng cách chạy server + gọi API.

Frontend (Vite):
- `cd frontend; npm run dev` — dev server, proxy `/api` → `http://localhost:3000` (xem `vite.config.js`).
- `npm run lint` — eslint (đây là check duy nhất; không có typecheck/test).
- `npm run build` — xuất ra `frontend/dist`.

## Architecture

- Backend feature-based: `backend/src/features/<name>/{*.routes.js, *.controller.js, *.service.js, *.repository.js, *.validate.js}`; middleware dùng chung ở `backend/src/middlewares/`, mail ở `shared/mailService.js`. Controller chỉ lo HTTP (nhận req → gọi service → trả res); **service** chứa nghiệp vụ; **repository** là data access thuần (Knex/raw SQL). Feature dành cho admin đặt trong `backend/src/features/admin/<name>/` (vd: `admin/tours/`) — đồng bộ với frontend `frontend/src/features/admin/<name>/`.
- `backend/src/app.js` phục vụ luôn `frontend/dist` nếu đã build (kèm SPA fallback cho route không phải `/api`); nếu chưa build, `/` trả 503. => Trong dev, chạy frontend riêng qua Vite, không dựa vào backend serve.
- Routes mount tại `/api/auth`, `/api/tours`, `/api/bookings` (rate-limiter chung 100 req/15min áp lên `/api`).
- API response wrap: `{ success: boolean, data?, message? }` — frontend `useFetch.js` đọc `response.success`/`response.data`. Giữ format này khi thêm endpoint.
- Auth: JWT. Frontend lưu `token` + `user` trong `localStorage` (`features/auth/auth.api.js`); gửi header `Bearer <token>`. Backend middleware ở `middlewares/auth.js` gắn `req.user`.
- Backend `middlewares/auth.js` throw nếu thiếu `JWT_SECRET` (server không khởi động được).

## Setup & env

- MySQL: tạo DB bằng `db.sql` hoặc migration Knex (utf8mb4). Lưu ý tên DB: `db.sql`/`knexfile.js` dùng default `db_viet_tour`, nhưng **DB thực tế của máy dev là `db_viet_travel`** (port `3307`) — luôn lấy `DB_NAME` trong `backend/.env` làm chuẩn. Backend dùng pool `mysql2` promise (`src/config/db.js`), đọc `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME`. Migration/seed Knex đọc cùng env trong `backend/knexfile.js`.

### Database (Knex migration + seed)

Lệnh chạy trong `backend/` (cần MySQL đang chạy + `DB_PASSWORD` đúng trong `backend/.env`):
- `npm run migrate` — chạy các migration trong `db/migrations/` (mỗi bảng 1 file, theo thứ tự khóa ngoại; khớp `db.sql`).
- `npm run migrate:rollback` — rollback lượt migration gần nhất.
- `npm run seed` — chạy mọi file `.js` trong `db/seeds/` theo thứ tự tên (Knex-native, mỗi file 1 seed độc lập; mỗi file phải export `seed(knex)`).
- `npm run migrate:make <name>` — tạo migration mới; tự đặt số thứ tự theo thứ tự bảng (bảng con phải sau bảng cha vì FK).

Seed structure (`backend/db/`):
- `seeds/00_reset.js` → xóa toàn bộ dữ liệu (thứ tự FK) + reset `AUTO_INCREMENT` để id bắt đầu từ 1. `01..05` seed từng nhóm: users, tours(+images/itineraries/departures), services, bookings, reviews.
- Vì Knex chạy từng file độc lập (không share id), mỗi seed tự query lại id FK theo field duy nhất (email/slug) chứ không nhận id truyền vào.
- `db/seed-data/tours.js` — `TOUR_SEED`: **18 tour thật** chắt lọc từ file `db_vietravel_KTPM.sql` (đồ án KTPM), gồm description, images (cloudinary), itineraries, departures. Seeder `02_tours.js` đọc từ đây.
- `db/seed-data/departures.js` — `EXTRA_DEPARTURES`: chuyến khởi hành **bổ sung** key theo slug tour; `02_tours.js` gộp thêm và chống trùng ngày (DB có unique `uk_tour_date` = `(tour_id, departure_date)`). Khi thêm chuyến: ngày ≥ hôm nay + 3, `seats_total ≥ 1`, `0 ≤ seats_available ≤ seats_total`, `price_moving* ≥ 0`, `status` chỉ `open`/`closed` (không ghi `full`).
- `db/factories.js` — hàm sinh dữ liệu mẫu bằng faker (`makeService`; `makeUser` không còn dùng vì users seed từ danh sách thật); `db/seed-config.js` — tập trung số lượng (users/services/bookings/reviews; `tours` không còn dùng vì đã dùng data thật). **KHÔNG đặt file không-có-seed-fn trong `db/seeds/`** (Knex sẽ báo "must have a seed function").
- Muốn thêm bảng mới: thêm migration + tạo `seeds/0X_<ten>.js` (số X sau các bảng nó phụ thuộc).

> ✅ **Repository dùng Knex query builder** (`src/config/knex.js`), khớp schema mới (`price_default`, `cover_image`, `departure_id`, `adults`/`children`, `contact_*`).
>
> - `bookings` đã khớp schema mới (`departure_id`, `adults`/`children`, `contact_*`, `payment_status`); bảng `passengers` thêm qua migration `20260912_000014_create_passengers.js` (PK `booking_id` → `bookings(id)` ON DELETE CASCADE, `gender` ENUM('Nam','Nữ','Khác'), `passenger_type` ENUM('adult','child'), `dob` nullable).
> - VNPay: dùng package `vnpay@^2.5.0`; endpoints trong `booking.payment.controller.js` (`POST /create-payment-url`, `GET /vnpay-return` — route public, đặt trước route param). Env cần: `VNP_TMN_CODE`, `VNP_SECURE_SECRET`, `VNP_HOST`, `VNP_RETURN_URL` (xem `backend/.env`). Flow: **tạo booking `unpaid/pending` trước → tạo URL VNPay → callback xác nhận `paid/confirmed`**.
- Env backend bắt buộc: `JWT_SECRET`, `DB_*`. Khác: `PORT`, `VERIFY_EMAIL_SECRET`, `RESET_PASS_SECRET`, `FRONTEND_URL`, `SMTP_*` (email không bắt buộc — nếu thiếu SMTP, link verify/reset chỉ log ra console).
- Frontend: `VITE_API_URL` (mặc định `/api`).
- Backend `.env.example` có sẵn các biến bắt buộc + tùy chọn. Frontend `.env.example` có `VITE_API_URL`.

## Local AI Chatbot (Ollama + Docker)

Chatbot nội bộ chạy local, dùng Ollama trong Docker với GPU acceleration. Model: **Qwen2.5-3B Q4_K_M** (~2.2 GB VRAM) + **nomic-embed-text** (~274 MB, embedding).

### Yêu cầu phần cứng (mỗi developer)

- GPU NVIDIA có tối thiểu **4 GB VRAM** (RTX 2050 trở lên)
- RAM tối thiểu **8 GB** (16 GB khuyến nghị)
- Dung lượng ổ cứng trống **~5 GB** (model + Docker image)

### Cài đặt lần đầu (bắt buộc)

**1. NVIDIA Driver (Windows)**
- Tải từ https://www.nvidia.com/drivers
- Chọn GPU series → Windows → Game Ready hoặc Studio driver
- Cài đặt Express → Restart máy
- Verify: mở PowerShell → `nvidia-smi` → thấy tên GPU

**2. Docker Desktop (Windows)**
- Tải từ https://www.docker.com/products/docker-desktop/
- Cài đặt → bật **WSL 2 backend** (mặc định)
- Khởi động Docker Desktop → đợi icon docker xanh (running)
- Verify: `docker --version`

> ⚠️ **KHÔNG** cài CUDA Toolkit hay NVIDIA Linux driver bên trong WSL2 — Windows driver đã tự share GPU vào WSL2. Nếu cài đè sẽ phá vỡ GPU passthrough.

### Chạy chatbot

```bash
# 1. Khởi động container Ollama (từ backend/) — build sẽ tự pull model ~1.9 GB vào image
cd backend; docker compose up -d --build

# 2. Test trong container (model đã có sẵn, không cần pull riêng)
docker exec -it ollama ollama run qwen2.5:3b

# 3. Test API từ host
curl http://localhost:11434/api/generate -d "{\"model\":\"qwen2.5:3b\",\"prompt\":\"Xin chào\",\"stream\":false}"
```

> Model được bake vào image qua `backend/Dockerfile.ollama` (`RUN ollama serve & ... && ollama pull qwen2.5:3b && ollama pull nomic-embed-text`). Mỗi developer chỉ cần `docker compose up -d --build` 1 lần là có sẵn model.

### Quy tắc

- Model lưu trong Docker volume `ollama_data` — không commit vào git, không share giữa developer.
- Khi build lại image (`--build`), model mới sẽ copy vào volume nếu volume trống; nếu volume đã có model thì dùng model trong volume.
- Ollama API tại `http://localhost:11434` — không auth, chỉ dùng local/internal.
- Nếu cần stop: `docker compose down` (volume giữ nguyên model).
- Nếu muốn xóa model: `docker exec ollama ollama rm qwen2.5:3b`.

### Troubleshooting: chatbot trả 503 "đang khởi tạo dữ liệu" / "Không kết nối được chatbot"

1. Container có chạy không: `docker ps` (phải có `ollama` Up, port 11434).
2. **Đủ model chưa** (nguyên nhân phổ biến nhất — volume cũ chỉ có 1 phần model):
   ```bash
   docker exec ollama ollama list   # cần qwen2.5:3b + nomic-embed-text
   ```
   Thiếu thì pull (không cần build lại image):
   ```bash
   docker exec ollama ollama pull qwen2.5:3b
   docker exec ollama ollama pull nomic-embed-text
   ```
   Lưu ý: `qwen2.5:latest` là bản 7B, **không** thay thế `qwen2.5:3b` (khác tag, tốn VRAM hơn).
3. Test nhanh: `curl http://localhost:11434/api/tags` và
   `curl -X POST localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Xin chào"}]}'`.
4. RAG tự build lại tối đa 10 lần, mỗi lần cách 60s; nếu đã pull model sau khi hết lượt retry thì **khởi động lại backend** (`npm run dev`).


## Tự hủy đơn hết hạn thanh toán (BullMQ + Redis)

Backend hẹn giờ hủy đơn **đã cọc nhưng quá hạn trả nốt** qua BullMQ — **yêu cầu Redis đang chạy**:

```bash
cd backend; docker compose up -d redis   # chỉ cần 1 lần / sau khi reboot
```

- **Không có rule tự hủy 24h cho đơn chưa cọc.** Đơn `pending + unpaid` giữ chỗ cho tới khi user thanh toán / user hủy / admin hủy.
- Job `expire-balance` (hẹn đúng `balance_due_at`) + sweep đối soát mỗi 5 phút + lazy-check khi user chạm đơn — cả 3 gọi chung `expireOrCancelIfDue()` (idempotent, chỉ hủy đơn `deposit_paid + confirmed` quá hạn).
- **Redis chết không làm hỏng nghiệp vụ**: tạo đơn vẫn OK (log warning), sweep + lazy-check lo bù.
- **Email không gửi lúc tạo đơn**: email xác nhận chỉ gửi sau khi thanh toán thành công (cọc / trả đủ / trả nốt); nhắc trả nốt trước hạn 48h.
- Test: `cd backend; node test_bullmq_expire.js` (cần Redis + MySQL).

## Conventions

- Code comment và message API/UI bằng **Tiếng Việt**. Giữ nguyên ngôn ngữ khi sửa.
- Frontend route: `/admin/*` và `/user/*` là layout riêng (`AdminRoutes.jsx` / `UserRoutes.jsx`); routes public nằm trong `MainLayout`. Tour detail dùng `:id` (không phải slug).
- Frontend theme (Tailwind v4): design tokens khai báo trong `frontend/src/assets/styles/index.css` dùng `@theme` — `--color-primary[-light|-dark|-50|-100]` (blue family, giá trị hex cố định), `--color-accent` (amber, điểm nhấn travel), `--color-background`, `--color-surface`, `--color-foreground` (text chính), `--color-muted` (text phụ), `--color-border`, `--color-success/-warning/-danger/-info`, `--font-sans` ("Lexend Deca"). Muốn đổi brand chỉ sửa ở `@theme`; code cũ đang dùng trực tiếp `blue-*`/`gray-*` (chưa refactor sang `primary-*`). Lưu ý: Tailwind v4 chỉ emit biến `--color-*` khi có utility sử dụng; `primary-light #3b82f6` tương phản 3.68:1 trên trắng nên **chỉ dùng cho ring/large text, không cho body text** (dùng `primary` hoặc `muted` thay thế).
- Env vars không được viết trong git (`.gitignore` đã loại `.env*`).

## Progress tracking

- Sau mỗi lần hoàn thành thay đổi (feature, fix, refactor), cập nhật `PROGRESS.md` ở root:
  - Đánh dấu `[x]` các việc đã xong trong checklist (hoặc thêm mục mới vào backlog).
  - Thêm một mục vào **Lịch sử cập nhật** theo mẫu có sẵn: ngày, việc đã làm, file thêm/sửa/xóa, cách kiểm tra, ghi chú.
  - Giữ file đủ ngắn gọn nhưng đủ context để người dùng gửi lại khi mở phiên làm việc mới.
- Nếu người dùng gửi `PROGRESS.md`, coi đó là nguồn context tóm tắt chính thức và đối chiếu với code hiện tại trước khi làm tiếp.
