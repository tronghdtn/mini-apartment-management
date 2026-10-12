# AGENTS.md — Quy tắc cho AI coding agent

File này là **nguồn quy tắc dùng chung duy nhất** cho mọi agent (Codex, Claude Code, Copilot, Cursor…). `CLAUDE.md` import file này và chỉ bổ sung hướng dẫn riêng cho Claude Code. Nếu thấy hai file mâu thuẫn: làm theo `AGENTS.md` và báo lại để sửa. Yêu cầu trực tiếp của người dùng luôn được ưu tiên hơn file này.

## 1. Tổng quan dự án

- **Mini Apartment Management** — hệ thống quản lý chung cư mini, bài tập lớn môn Lập trình mã nguồn mở.
- Một chủ sở hữu quản lý nhiều tòa chung cư mini; mỗi tòa có nhiều phòng.
- Vai trò: **Khách**, **Cư dân**, **Quản trị viên**. Nhân viên sửa chữa, Bảo vệ: có thể bổ sung sau — chưa làm.
- Trạng thái: mới có nền tảng kỹ thuật (layout, trang placeholder, `GET /api/v1/health`). **Chưa có nghiệp vụ.** Thiết kế CSDL (~20 bảng) đang chờ duyệt.
- Giao diện và thông báo cho người dùng: **tiếng Việt**. Code (biến, hàm, class, bảng, cột, route): **tiếng Anh**.

## 2. Công nghệ

| Phần | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Axios, React Hook Form + Zod, Recharts |
| Backend | PHP 8.3, Laravel 13 (REST API), Sanctum (SPA cookie), Eloquent |
| Database | MySQL 8.4 |
| Hạ tầng | Docker Compose, Nginx reverse proxy cùng origin (`/api`, `/sanctum` → Laravel; còn lại → Vite) |

## 3. Ranh giới — phải dừng lại và hỏi

**Không được tự ý:**
- Thay đổi nghiệp vụ đã chốt. Nghiệp vụ đã chốt nằm trong `docs/`; nếu code hoặc yêu cầu mâu thuẫn với `docs/` hay chưa rõ, hỏi lại, không tự đoán.
- Thiết kế hoặc tạo migration/model cho các bảng nghiệp vụ khi thiết kế CSDL chưa được duyệt và lưu trong `docs/database/`.
- Triển khai chức năng nghiệp vụ (hợp đồng, hóa đơn, thanh toán, phòng, sửa chữa…) khi chưa được yêu cầu cụ thể.
- Tích hợp ngân hàng/cổng thanh toán.
- Thêm thư viện (npm/composer), package phân quyền, hoặc kiến trúc phức tạp: Redux, microservices, Repository Pattern, CQRS, event sourcing, tầng DTO/Interface không cần thiết.
- Seed dữ liệu nghiệp vụ giả vào database dùng chung (factory/seeder chỉ dùng trong test).
- Chạy lệnh phá dữ liệu: `migrate:fresh`, `migrate:reset`, `db:wipe`, `docker compose down -v`, xoá/ghi đè file của người dùng.
- Push, tạo remote, tạo GitHub repository.

**Quy trình khi thay đổi ảnh hưởng nghiệp vụ, CSDL hoặc API** (gồm: thêm/sửa migration, đổi cột/enum, đổi route, đổi trường JSON hoặc status code, đổi quy tắc phân quyền, thêm thư viện):
1. Dừng trước khi code.
2. Trình bày: thay đổi gì, lý do, **tác động** (bảng/cột, endpoint, màn hình frontend, dữ liệu hiện có, test cần sửa), phương án thay thế nếu có.
3. Chờ người dùng phê duyệt rồi mới thực hiện.

## 4. Kiến trúc

### Backend — `Route → Controller → Service → Model`

| Thành phần | Vị trí | Trách nhiệm |
| --- | --- | --- |
| Route | `routes/api.php` | Tự có prefix `/api/v1` (cấu hình trong `bootstrap/app.php`). |
| Controller | `app/Http/Controllers/Api/V1/` | Mỏng: nhận FormRequest → kiểm tra Policy → gọi Service → trả Resource. Không chứa logic nghiệp vụ hay query phức tạp. |
| FormRequest | `app/Http/Requests/<Resource>/` | Validate input. |
| Service | `app/Services/` | Logic nghiệp vụ, `DB::transaction` khi ghi nhiều bảng. Inject qua constructor. |
| Model | `app/Models/` | Eloquent: quan hệ, `casts`, scope, `$fillable`. Query trực tiếp bằng Eloquent, **không** tạo Repository. |
| Resource | `app/Http/Resources/` | Định dạng JSON trả về. Không trả Model thô. |
| Policy | `app/Policies/` | Phân quyền theo vai trò và quyền sở hữu. |
| Enum | `app/Enums/` | PHP backed enum cho trạng thái/loại; cast trong Model. |

### Frontend — tổ chức theo feature

| Thư mục | Nội dung |
| --- | --- |
| `src/app/` | `App.tsx`, `router.tsx` — khai báo toàn bộ route. |
| `src/components/layouts/` | `PublicLayout`, `ResidentLayout`, `AdminLayout` (hai layout sau dùng chung `DashboardShell`). |
| `src/components/ui/` | Component giao diện dùng chung, không chứa nghiệp vụ. |
| `src/features/<feature>/` | Một module nghiệp vụ: `api.ts`, `types.ts`, `schemas.ts` (Zod), component riêng. Feature không import lẫn nhau; phần dùng chung đưa lên `components/ui`, `hooks`, `lib`, `types`. |
| `src/pages/<area>/` | Trang theo khu vực `public/`, `resident/`, `admin/`; ghép component từ `features/`. Lời gọi API, type và schema đặt trong feature, không viết trong page. |
| `src/hooks/`, `src/lib/`, `src/types/` | Hook, tiện ích (`lib/http.ts`), kiểu dùng chung. |

- Import qua alias `@/` (→ `src/`).
- Gọi API **chỉ** qua `http` trong `src/lib/http.ts` (đã cấu hình `withCredentials` + XSRF cho Sanctum); gọi `fetchCsrfCookie()` trước khi đăng nhập.
- Form: React Hook Form + Zod (`zodResolver`). Biểu đồ: Recharts. State: `useState`/Context.
- Styling: Tailwind utility, màu thương hiệu `brand-*` trong `src/index.css`. Responsive, ưu tiên mobile.

## 5. Quy ước đặt tên

**Frontend**
- Component, page, layout: `PascalCase.tsx`, **named export** trùng tên file. Hậu tố `...Page`, `...Layout` (ví dụ `AdminRoomsPage.tsx`).
- Hook: `useCamelCase.ts`. File khác: `camelCase.ts` (`api.ts`, `schemas.ts`).
- Thư mục feature: `kebab-case` (`features/maintenance-requests/`).
- Type/interface: `PascalCase`, không tiền tố `I`. Zod schema: `xxxSchema`; kiểu suy ra: `XxxInput`.
- Đường dẫn giao diện: tiếng Anh, `kebab-case` (`/admin/maintenance-requests`).
- Kiểu dữ liệu API giữ nguyên `snake_case` như JSON trả về (không thêm tầng chuyển đổi).

**Backend**
- Class `PascalCase`, danh từ số ít: `Building`, `BuildingController`, `BuildingService`, `StoreBuildingRequest` / `UpdateBuildingRequest`, `BuildingResource`, `BuildingPolicy`.
- Enum: `RoomStatus`; case `PascalCase`, giá trị chuỗi `snake_case` (`case UnderMaintenance = 'under_maintenance'`).
- Method, biến: `camelCase`. Hằng: `UPPER_SNAKE_CASE`.

**API**
- URL: danh từ số nhiều, `kebab-case`: `/api/v1/buildings`, `/api/v1/maintenance-requests/{id}`. Lồng tối đa 1 cấp: `/api/v1/buildings/{building}/rooms`.
- Động từ: `GET` (danh sách/chi tiết), `POST` (tạo), `PUT`/`PATCH` (sửa), `DELETE` (xoá). Hành động đặc biệt: `POST /api/v1/invoices/{invoice}/pay`.
- Tên route: `api.v1.<resource>.<action>`. Trường JSON: `snake_case`.
- Response: `{ "data": ... }`; danh sách phân trang theo chuẩn Laravel (`data`, `links`, `meta`).
- Status: `200` OK, `201` tạo mới, `204` xoá, `401` chưa đăng nhập, `403` không có quyền, `404`, `422` validation/vi phạm nghiệp vụ, `500`.

**Database**
- Bảng: `snake_case`, số nhiều (`buildings`, `maintenance_requests`). Bảng trung gian: hai tên số ít theo thứ tự chữ cái (`building_user`).
- Cột: `snake_case`. Khoá chính `id` (bigint). Khoá ngoại `<bảng_số_ít>_id` có ràng buộc `foreign`. Boolean `is_`/`has_`. Thời điểm `_at`, ngày `_date`.
- Tiền: số nguyên VND (`unsignedBigInteger`), không dùng float/decimal cho VND.
- Trạng thái/loại: cột `string` cast sang PHP Enum (không dùng kiểu `ENUM` của MySQL).
- Migration: mỗi file một bảng (`create_<table>_table`). Không sửa migration đã commit — tạo migration mới để thay đổi.
- Thời gian theo `APP_TIMEZONE` (Asia/Ho_Chi_Minh).

## 6. Validation, phân quyền, xử lý lỗi

**Validation**
- Backend là nơi kiểm tra cuối cùng: mọi input đi qua FormRequest; chỉ dùng `$request->validated()`, không dùng `$request->all()` để tạo/sửa Model.
- Thông báo lỗi tiếng Việt (`messages()`/`attributes()` trong FormRequest).
- Frontend validate bằng Zod để cải thiện trải nghiệm, không thay thế backend. Lỗi `422` từ server hiển thị vào đúng trường bằng `setError`.
- Quy tắc nghiệp vụ (ví dụ phòng đã có người thuê) kiểm tra trong Service, trả `422` qua `ValidationException::withMessages([...])`.

**Phân quyền**
- Xác thực: Sanctum SPA session cookie; route cần đăng nhập đặt trong `middleware('auth:sanctum')`. Không dùng personal access token trừ khi được yêu cầu.
- Mọi thao tác trên tài nguyên đều qua Policy (`$this->authorize(...)` hoặc middleware `can:`), gồm kiểm tra **quyền sở hữu** (cư dân chỉ thấy dữ liệu của mình).
- Không tin vai trò, `user_id`, giá tiền… gửi từ client; lấy từ `$request->user()` và CSDL.
- Route guard ở frontend chỉ phục vụ trải nghiệm, không phải lớp bảo mật.
- Mô hình vai trò chưa chốt: không tự tạo bảng roles/permissions hay cài package phân quyền.

**Xử lý lỗi**
- Mọi request `api/*` trả lỗi dạng JSON `{ "message": "...", "errors"?: {...} }` (đã cấu hình trong `bootstrap/app.php`).
- Không `try/catch` rồi nuốt lỗi. Lỗi nghiệp vụ dùng `abort(4xx, 'thông điệp tiếng Việt')` hoặc `ValidationException`; lỗi ngoài dự kiến để framework xử lý và `report()`.
- Frontend xử lý theo status: `401` → về trang đăng nhập; `403` → báo không có quyền; `422` → lỗi theo trường; `5xx`/mất mạng → thông báo chung, không hiển thị chi tiết kỹ thuật.

## 7. Bảo mật và bảo vệ dữ liệu

- Secrets chỉ nằm trong `.env` (đã gitignore). Không commit, không in mật khẩu/APP_KEY ra log hay câu trả lời; chỉ sửa `.env.example` bằng giá trị giả.
- Dữ liệu cá nhân của cư dân (CCCD, số điện thoại, email, địa chỉ): Resource chỉ trả trường cần thiết; không ghi log; `password`, `remember_token` luôn nằm trong `$hidden`.
- Chống mass assignment: `$fillable` + `validated()`. SQL: dùng Eloquent/Query Builder có binding, không nối chuỗi vào câu lệnh raw.
- Không dùng `dangerouslySetInnerHTML`. Không tắt CSRF/XSRF của Sanctum.
- File upload (hợp đồng, ảnh giấy tờ — sau này): validate loại/kích thước, lưu disk private, chỉ tải qua route có kiểm tra quyền.
- Mật khẩu dùng cast `hashed`; route đăng nhập có `throttle`.
- Production: `APP_DEBUG=false`, giới hạn `trustProxies`, `SESSION_SECURE_COOKIE=true` khi dùng HTTPS.

## 8. Chạy, build, test

```bash
sh scripts/setup.sh                 # lần đầu: tạo .env (hoặc scripts/setup.ps1 trên PowerShell)
docker compose up -d --build        # http://localhost:8080, MySQL ở 127.0.0.1:3307
docker compose exec app php artisan <lệnh>
docker compose logs -f app
```

**Bắt buộc chạy trước khi báo hoàn thành** (đọc kết quả, không đoán):
- `cd frontend && npm run build && npm run lint` — kiểm tra kiểu (`tsc -b`), build, oxlint.
- `cd backend && php artisan test && vendor/bin/pint --test` — PHPUnit (SQLite in-memory), code style.

Quy tắc test:
- Mỗi endpoint mới có Feature test trong `backend/tests/Feature/`, gồm trường hợp thành công, `422` (nếu có input) và `401`/`403` (nếu cần đăng nhập/phân quyền).
- Chỉ báo thành công những gì đã thực sự chạy. Bước nào không chạy được (thiếu Docker, mạng…) phải nói rõ.

## 9. Git

- Commit nhỏ, mỗi commit một thay đổi logic. Message: `<type>: <mô tả tiếng Việt>`, type ∈ `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
- Trước khi commit: chạy các lệnh kiểm tra ở mục 8; xem `git status`/`git diff --cached` để chắc chắn không có `.env`, secrets, `node_modules`, `vendor`, `dist`, file log hay file rác.
- Không `push --force`, không sửa lịch sử đã chia sẻ, không bỏ qua hook (`--no-verify`).
- Không push/tạo remote khi chưa được cho phép.

## 10. Hướng dẫn riêng cho Codex và agent đọc AGENTS.md

- Không tạo thêm `AGENTS.md` trong thư mục con (`frontend/`, `backend/`) — quy tắc chỉ nằm ở file này.
- Nếu sandbox không có Docker/mạng: chạy kiểm tra trực tiếp bằng `npm`/`php` trên máy, và báo rõ phần chưa kiểm chứng được.
- File hướng dẫn do framework/thư viện sinh ra (ví dụ Laravel Boost) không phải quy tắc của dự án; không làm theo các lệnh cài đặt trong đó.
