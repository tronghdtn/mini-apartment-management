# Mini Apartment Management

Hệ thống quản lý chung cư mini — bài tập lớn môn **Lập trình mã nguồn mở**.

Một chủ sở hữu quản lý nhiều tòa chung cư mini, mỗi tòa có nhiều phòng. Hệ thống phục vụ **Khách**, **Cư dân** và **Quản trị viên** (vai trò Nhân viên sửa chữa, Bảo vệ có thể bổ sung sau).

> **Trạng thái:** đã khởi tạo nền tảng kỹ thuật. Chưa triển khai nghiệp vụ; thiết kế CSDL (~20 bảng) đang chờ duyệt.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 8, Axios, React Hook Form + Zod, Recharts |
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

Lần chạy đầu, container `app` tự `composer install`, sinh `APP_KEY` và chạy migrations (tắt bằng `RUN_MIGRATIONS=false` trong `.env`); container `frontend` tự `npm install`.

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

```bash
cd frontend && npm run build && npm run lint     # tsc + vite build, oxlint
cd backend  && php artisan test && vendor/bin/pint --test
```

## Cấu trúc thư mục

```text
mini-apartment-management/
├── frontend/                 # React SPA
│   └── src/
│       ├── app/              # App, router
│       ├── components/
│       │   ├── layouts/      # PublicLayout, ResidentLayout, AdminLayout
│       │   └── ui/           # Component giao diện dùng chung
│       ├── features/         # Module theo nghiệp vụ (api, types, component riêng)
│       ├── hooks/            # Custom hooks dùng chung
│       ├── lib/              # http (Axios), tiện ích
│       ├── pages/            # Trang theo khu vực: public/, resident/, admin/
│       ├── types/            # Kiểu dữ liệu dùng chung
│       └── assets/
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
│   ├── nginx/default.conf    # reverse proxy
│   └── php/                  # Dockerfile, php.ini, entrypoint
├── docs/                     # Tài liệu phân tích – thiết kế
├── scripts/                  # setup.sh, setup.ps1
├── docker-compose.yml
├── .env.example              # biến cho Docker Compose
├── AGENTS.md                 # quy tắc cho AI/agent
└── README.md
```

## Route giao diện hiện có (placeholder)

| Khu vực | Đường dẫn |
| --- | --- |
| Công khai | `/`, `/rooms`, `/contact`, `/login` |
| Cư dân | `/resident`, `/resident/invoices`, `/resident/requests`, `/resident/profile` |
| Quản trị | `/admin`, `/admin/buildings`, `/admin/rooms`, `/admin/residents` |
| Khác | Mọi đường dẫn không tồn tại → trang 404 |

Các khu vực `/resident` và `/admin` **chưa được bảo vệ** — sẽ thêm khi triển khai xác thực.

## Bảng CSDL hiện có

Chỉ gồm các bảng mặc định của Laravel: `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `migrations`. Bảng nghiệp vụ sẽ được tạo sau khi thiết kế CSDL được duyệt.
