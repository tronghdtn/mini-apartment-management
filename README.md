# Mini Apartment Management

Hệ thống quản lý chung cư mini — bài tập lớn môn **Lập trình mã nguồn mở**.

Một chủ sở hữu quản lý nhiều tòa chung cư mini, mỗi tòa có nhiều phòng. Hệ thống phục vụ 5 actor: **Khách**, **Cư dân**, **Quản trị viên**, **Nhân viên sửa chữa**, **Bảo vệ**.

> **Trạng thái 24/10/2026:** Auth/CAT/ROOM/USR và ba trang Hợp đồng nháp dùng API thật. **Backend963test/7930assertion, frontend58, browserCTR12/12 +liveAPI12/12 PASS**, build/lint/Pint192file đạt (9cảnh báo cũ). Chưa kích hoạt/thu cọc/dịch vụ hợp đồng/thanh lý. Dev20bảng/16migration/RUN_MIGRATIONS=false/Nhóm3pending; Admin mới xuất hiện, chờ xác nhận và đăng nhập kiểm thửdev. Các localcheckpoint được duyệt/lưu, không push; không migration/seeder hoặc ghi/xóa dữ liệu dev bởi agent. [Plan](docs/IMPLEMENTATION_PLAN.md) §12.12–13; [bản đồ code](docs/PROJECT_STATUS_AND_LEARNING.md) §11.21.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 8, Axios, React Hook Form + Zod, Recharts, lucide-react (icon) |
| Backend | PHP 8.3, Laravel 13 (REST API), Laravel Sanctum 4 (SPA cookie), Eloquent ORM |
| Database | MySQL 8.4 (LTS) |
| Hạ tầng | Docker Compose, Nginx 1.28 (reverse proxy cùng origin) |

## Kiến trúc

```text
Trình duyệt ──► http://localhost:8080 (nginx)
                 ├── /api/*, /sanctum/*, /up ──► app (PHP-FPM, Laravel) ──► mysql
                 └── /*                       ──► frontend (Vite dev server)
```

Frontend và API dùng **chung một origin**, nên Sanctum xác thực SPA bằng session cookie mà không cần CORS.

Backend theo luồng `Route → Controller → Service → Model`, dùng FormRequest (validate), API Resource (định dạng JSON), Policy (phân quyền) và Enum. Không dùng Repository Pattern.

## Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose v2)
- Git
- Tuỳ chọn, để chạy lệnh ngoài Docker: Node.js ≥ 20.19, PHP ≥ 8.3, Composer 2

## Cài đặt & chạy bằng Docker

```bash
git clone <repo-url> mini-apartment-management
cd mini-apartment-management

# 1. Tạo .env (gốc) và backend/.env với mật khẩu MySQL ngẫu nhiên
sh scripts/setup.sh            # Git Bash / Linux / macOS
# hoặc: powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

# 2. Khởi chạy
docker compose up -d --build
```

Lần chạy đầu, container `app` tự `composer install`, sinh `APP_KEY` và chạy migrations nếu `RUN_MIGRATIONS=true`; container `frontend` tự `npm install`.

> **Quan trọng:** hiện phải giữ `RUN_MIGRATIONS=false` trong `.env`. Nếu bật, `docker compose up` sẽ tự chạy migrations Nhóm 2–3 lên DB dev `mini_apartment` — việc này cần được duyệt riêng (backup + `migrate --pretend` trước).

| Địa chỉ | Mô tả |
| --- | --- |
| http://localhost:8080 | Ứng dụng web |
| http://localhost:8080/api/v1/health | Kiểm tra API + kết nối CSDL |
| `127.0.0.1:3307` | MySQL (dùng cho DBeaver/HeidiSQL hoặc artisan trên máy host) |

### Lệnh thường dùng

```bash
docker compose ps                              # trạng thái dịch vụ
docker compose logs -f app                     # log Laravel/PHP-FPM
docker compose exec app php artisan migrate    # chạy migration
docker compose exec app php artisan test       # test backend
docker compose exec app composer require <pkg>
docker compose exec frontend npm install <pkg>
docker compose down                            # dừng (giữ dữ liệu MySQL)
docker compose down -v                         # dừng và XOÁ dữ liệu MySQL + node_modules trong container
```

## Chạy ngoài Docker (tuỳ chọn)

Vẫn cần MySQL — có thể chỉ bật dịch vụ `mysql`: `docker compose up -d mysql`.

```bash
# Backend: http://localhost:8000
cd backend
composer install
php artisan migrate
php artisan serve

# Frontend: http://localhost:5173 (Vite proxy /api, /sanctum sang localhost:8000)
cd frontend
npm install
npm run dev
```

## Kiểm tra chất lượng

Test backend chạy trên database MySQL riêng **`mini_apartment_test`** bằng **tài khoản MySQL riêng** `mini_apartment_test` (chỉ có quyền trên DB test, mật khẩu `DB_TEST_PASSWORD` do `scripts/setup.sh` sinh) — không bao giờ trên database dev `mini_apartment` (`tests/TestCase.php` từ chối mọi cấu hình khác).

```bash
docker compose up -d mysql      # test cần MySQL đang chạy
sh scripts/setup.sh             # bổ sung DB_TEST_PASSWORD nếu .env cũ chưa có (không ghi đè)
sh scripts/create-test-db.sh    # tạo DB + tài khoản test trên volume MySQL đã có (idempotent)

cd frontend && npm run build && npm run lint     # tsc + vite build, oxlint
cd backend  && php artisan test && vendor/bin/pint --test
```

PowerShell: `Get-Content docker/mysql/init/01-create-test-database.sh | docker compose exec -T mysql sh`.

## Cấu trúc thư mục

```text
mini-apartment-management/
├── frontend/                 # React SPA
│   └── src/
│       ├── main.tsx          # điểm khởi động React
│       ├── app/              # App (AppProvider + RouterProvider), router.tsx
│       ├── components/
│       │   ├── layouts/      # PublicLayout (+Navbar, Footer), AdminLayout; ResidentLayout, StaffLayout (chưa gắn route)
│       │   └── ui/           # Badge, Button, Modal, Tabs, Toast, Lightbox, StatCard
│       ├── features/         # Module theo nghiệp vụ: rooms/, auth/, system/ (api.ts, types.ts, schemas.ts, component)
│       ├── mocks/            # DỮ LIỆU GIẢ tạm thời: data, types, AppContext ("backend giả"), RoleSwitcher (demo)
│       ├── pages/            # Trang theo khu vực: public/, admin/ (+ NotFoundPage, RouteErrorPage)
│       ├── hooks/            # Custom hooks dùng chung
│       ├── lib/              # http.ts (Axios — client API duy nhất), format.ts (tiền, ngày, giờ VN)
│       └── types/            # Kiểu dữ liệu API dùng chung
├── backend/                  # Laravel REST API
│   ├── app/
│   │   ├── Enums/
│   │   ├── Http/Controllers/Api/V1/
│   │   ├── Http/Requests/
│   │   ├── Http/Resources/
│   │   ├── Models/
│   │   ├── Policies/
│   │   └── Services/
│   ├── database/migrations/
│   ├── routes/api.php        # prefix /api/v1
│   └── tests/
├── docker/
│   ├── mysql/init/           # tạo database test khi khởi tạo volume
│   ├── nginx/default.conf    # reverse proxy
│   └── php/                  # Dockerfile, php.ini, entrypoint
├── docs/                     # Tài liệu phân tích – thiết kế
├── scripts/                  # setup.sh, setup.ps1, create-test-db.sh
├── docker-compose.yml
├── .env.example              # biến cho Docker Compose
├── AGENTS.md                 # quy tắc dùng chung cho AI agent (Codex, Claude Code…)
├── CLAUDE.md                 # import AGENTS.md + hướng dẫn riêng cho Claude Code
└── README.md
```

## Route giao diện hiện có (dữ liệu giả)

| Khu vực | Đường dẫn |
| --- | --- |
| Công khai | `/`, `/rooms`, `/rooms/:roomId`, `/contact`, `/login`, `/register`, `/account/appointments`, `/account/profile` (+ `/rooms/:roomId/book`, `/book` — trang đặt lịch riêng của Antigravity, ngoài danh mục) |
| Quản trị | `/admin`, `/admin/buildings`, `/admin/buildings/:buildingId`, `/admin/rooms`, `/admin/rooms/:roomId`, `/admin/amenities`, `/admin/services`, `/admin/utility-prices`, `/admin/users`, `/admin/users/:userId`, `/admin/contracts`, `/admin/contracts/new`, `/admin/contracts/:contractId`, `/admin/contracts/:contractId/terminate`, `/admin/meter-readings`, `/admin/invoices`, `/admin/invoices/:invoiceId` |
| Cư dân, Nhân viên | Chưa có màn hình (mục menu/vai trò tương ứng hiển thị mờ "Chưa có") |
| Khác | Đường dẫn không tồn tại → 404; lỗi khi tải route → trang lỗi |

Danh mục đầy đủ 51 màn hình và trạng thái từng màn: [docs/SCREEN_INVENTORY.md](docs/SCREEN_INVENTORY.md). Auth đã dùng dữ liệu thật từ `/me`; `/admin` có guard theo vai trò server. Đã gỡ đổi vai trò demo khỏi luồng đang chạy. Laravel vẫn kiểm tra phiên/quyền trên API; guard React chỉ phục vụ trải nghiệm. Số đếm27/51 là baseline UI18/10, không phải tiến độ API.

## Bảng CSDL hiện có

Kiểm tra trực tiếp ngày 18/10/2026 (đọc bảng `migrations`): DB dev `mini_apartment` có 13 bảng (bảng framework + Nhóm 1), các bảng nghiệp vụ đều **0 dòng**; DB test `mini_apartment_test` có 24 bảng (Nhóm 1–3). Bảng nghiệp vụ (21 bảng theo `docs/09_DATABASE_DESIGN.md`) được tạo theo từng nhóm đã duyệt. Nhóm 1 (`users` ALTER, `buildings`, `amenities`, `services`, `settings`) đã chạy trên DB dev và DB test; Nhóm 2 (`rooms`, `building_amenities`, `room_amenities`, `contracts`, `contract_occupants`, `contract_services`, `utility_prices`) và Nhóm 3 (`invoices`, `meter_readings`, `invoice_items`, `payments`) **mới chạy trên DB test**. Giữ `RUN_MIGRATIONS=false` để Docker không tự chạy các nhóm này trên DB dev — xem [docs/DATABASE_IMPLEMENTATION_PLAN.md](docs/DATABASE_IMPLEMENTATION_PLAN.md).
