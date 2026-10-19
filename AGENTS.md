# AGENTS.md — Quy tắc cho AI coding agent

File này là **nguồn quy tắc dùng chung duy nhất** cho mọi agent (Codex, Claude Code, Copilot, Cursor…). `CLAUDE.md` import file này và chỉ bổ sung hướng dẫn riêng cho Claude Code. Nếu thấy hai file mâu thuẫn: làm theo `AGENTS.md` và báo lại để sửa. Yêu cầu trực tiếp của người dùng luôn được ưu tiên hơn file này.

## 1. Tổng quan dự án

- **Mini Apartment Management** — hệ thống quản lý chung cư mini, bài tập lớn môn Lập trình mã nguồn mở.
- Một chủ sở hữu quản lý nhiều tòa chung cư mini; mỗi tòa có nhiều phòng.
- **5 actor** (quyết định 14/10/2026, DB-D02): Khách, Cư dân, Quản trị viên, Nhân viên sửa chữa, Bảo vệ. Giá trị `users.role`: `user` (khách đã đăng ký), `resident`, `admin`, `technician`, `guard`; khách vãng lai không có tài khoản.
- Trạng thái (18/10/2026): Backend mới có `GET /api/v1/health` — **chưa có API nghiệp vụ**, chưa có đăng nhập thật. `frontend/` là **ứng dụng React chính thức duy nhất** (giao diện Antigravity, chuyển vào 17/10/2026); mọi màn hình hiện chạy trên **dữ liệu giả** trong `frontend/src/mocks/`. Các thư mục `public-ui-concept/`, `ui-antigravity-full/` chỉ là bản prototype cũ để đối chiếu — không sửa, không phát triển tiếp ở đó. Tiến độ chi tiết: `docs/PROJECT_STATUS_AND_LEARNING.md`. Thiết kế CSDL **21 bảng đã duyệt 14/10/2026**. Migrations **Nhóm 1** (`users` ALTER, `buildings`, `amenities`, `services`, `settings`) đã chạy trên DB dev và DB test; **Nhóm 2** (`rooms`, pivot tiện nghi, `contracts`, `contract_occupants`, `contract_services`, `utility_prices`) và **Nhóm 3** (`invoices`, `meter_readings`, `invoice_items`, `payments`) **chỉ chạy trên DB test**; 14 Model cho 16 bảng. Trạng thái từng nhóm ở `docs/DATABASE_IMPLEMENTATION_PLAN.md`.
- Giao diện và thông báo cho người dùng: **tiếng Việt**. Code (biến, hàm, class, bảng, cột, route): **tiếng Anh**.

**Nguồn sự thật — thứ tự ưu tiên khi mâu thuẫn:**
1. `docs/DB_DECISIONS_20261014.md` — quyết định ghi đè (số bảng, số actor, tiền, timezone, tiện nghi/dịch vụ, BR-SVC-04…).
2. `docs/09_DATABASE_DESIGN.md` — thiết kế vật lý 21 bảng, quy tắc tính tiền, checklist test DB-01..DB-41.
3. `docs/02_SYSTEM_DISCOVERY.md` v0.10, `PROJECT_CONTEXT.md`, docs `03`–`08` — chỉ ở phần **không** xung đột với (1)(2). *(Hiện chưa có trong repo.)*

Tài liệu cũ hoặc sơ đồ còn ghi 20 bảng / 3 actor / tiền DECIMAL / dịch vụ trọn tháng / cột `type` điện nước là **lỗi thời** — không dùng để lập migration.

## 2. Công nghệ

| Phần | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Axios, React Hook Form + Zod, Recharts, lucide-react (icon) |
| Backend | PHP 8.3, Laravel 13 (REST API), Sanctum (SPA cookie), Eloquent |
| Database | MySQL 8.4 |
| Hạ tầng | Docker Compose, Nginx reverse proxy cùng origin (`/api`, `/sanctum` → Laravel; còn lại → Vite) |

## 3. Ranh giới — phải dừng lại và hỏi

**Không được tự ý:**
- Thay đổi nghiệp vụ đã chốt. Nghiệp vụ đã chốt nằm trong `docs/`; nếu code hoặc yêu cầu mâu thuẫn với `docs/` hay chưa rõ, hỏi lại, không tự đoán.
- Tạo migration/model của nhóm chưa được duyệt trong `docs/DATABASE_IMPLEMENTATION_PLAN.md`; chạy migration nghiệp vụ trên DB dev `mini_apartment` khi chưa được duyệt riêng (backup + `migrate --pretend` trước). Thêm/bớt bảng ngoài 21 bảng, hoặc đổi cột/kiểu/ràng buộc khác `docs/09_DATABASE_DESIGN.md`.
- Tạo bảng `roles`, `permissions`, `technicians`, `guards`… — vai trò nằm trong `users.role`.
- Triển khai chức năng nghiệp vụ (hợp đồng, hóa đơn, thanh toán, phòng, sửa chữa…) khi chưa được yêu cầu cụ thể.
- Tích hợp ngân hàng/cổng thanh toán.
- Thêm thư viện (npm/composer), package phân quyền, hoặc kiến trúc phức tạp: Redux, microservices, Repository Pattern, CQRS, event sourcing, tầng DTO/Interface không cần thiết.
- Seed dữ liệu nghiệp vụ giả vào database dùng chung (factory/seeder chỉ dùng trong test). Ngoại lệ: dữ liệu **hệ thống** bắt buộc theo thiết kế — dịch vụ `ELECTRICITY`/`WATER` và các khóa `settings` (giá trị rỗng/mặc định, không chứa thông tin thật).
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
| `src/app/` | `App.tsx` (bọc `AppProvider` + `RouterProvider`), `router.tsx` — khai báo toàn bộ route. Layout được chọn theo **tiền tố URL** (`/` → `PublicLayout`, `/admin` → `AdminLayout`), không theo vai trò. |
| `src/components/layouts/` | `PublicLayout` (+ `PublicNavbar`, `PublicFooter`), `AdminLayout` — đang dùng. `ResidentLayout`, `StaffLayout` (technician/guard, DB-D10) — có sẵn nhưng **chưa gắn route**. |
| `src/components/ui/` | Component giao diện dùng chung, không chứa nghiệp vụ (`Badge`, `Button`, `Modal`, `Tabs`, `Toast`, `Lightbox`, `StatCard`). |
| `src/features/<feature>/` | Một module nghiệp vụ: `api.ts`, `types.ts`, `schemas.ts` (Zod), component riêng. Feature không import lẫn nhau; phần dùng chung đưa lên `components/ui`, `hooks`, `lib`, `types`. Hiện có `rooms/` (component), `auth/` (schema), `system/` (mẫu gọi API thật `/health`). |
| `src/mocks/` | **Dữ liệu giả tạm thời** (`data.ts`, `types.ts`, `AppContext.tsx` = "backend giả" trong bộ nhớ, `RoleSwitcher.tsx` = công cụ demo). Không phải nghiệp vụ chính thức; xem `src/mocks/README.md`. |
| `src/pages/<area>/` | Trang theo khu vực `public/`, `admin/` (sau này `resident/`, `staff/`), cùng `NotFoundPage`, `RouteErrorPage`; ghép component từ `features/`. Lời gọi API, type và schema đặt trong feature, không viết trong page. |
| `src/hooks/`, `src/lib/`, `src/types/` | Hook, tiện ích (`lib/http.ts` — client API duy nhất; `lib/format.ts` — định dạng tiền/ngày, giờ VN), kiểu dùng chung (`types/api.ts`). |

- Import qua alias `@/` (→ `src/`).
- Gọi API **chỉ** qua `http` trong `src/lib/http.ts` (đã cấu hình `withCredentials` + XSRF cho Sanctum); gọi `fetchCsrfCookie()` trước khi đăng nhập.
- **Ranh giới dữ liệu giả:** chỉ `src/mocks/` được chứa dữ liệu giả; không thêm mock mới vào page/feature. Khi một màn hình chuyển sang API thật, page lấy dữ liệu qua `features/<feature>/api.ts` và bỏ mọi import `@/mocks` ở màn hình đó. Chỗ React đang tự tính tiền trong mock gắn nhãn `[MOCK-TIỀN]` — **không** dùng làm nguồn nghiệp vụ; số tiền thật luôn lấy từ Backend.
- Form: React Hook Form + Zod (`zodResolver`) — màn hình Antigravity hiện dùng `useState`, chuyển sang RHF + Zod khi nối API. Biểu đồ: Recharts. State: `useState`/Context. Icon: `lucide-react`.
- Styling: giữ phong cách Antigravity (font Plus Jakarta Sans/Space Grotesk, tông `sky`/`teal`, token `brand-*` trong `src/index.css`); Tailwind utility. Responsive, ưu tiên mobile; bảng dữ liệu phải nằm trong khung `overflow-x-auto`.

## 5. Quy ước đặt tên

**Frontend**
- Component, page, layout: `PascalCase.tsx`, **named export** trùng tên file. Hậu tố `...Page`, `...Layout` (ví dụ `AdminRoomsPage.tsx`).
- Hook: `useCamelCase.ts`. File khác: `camelCase.ts` (`api.ts`, `schemas.ts`).
- Thư mục feature: `kebab-case` (`features/maintenance-requests/`).
- Type/interface: `PascalCase`, không tiền tố `I`. Zod schema: `xxxSchema`; kiểu suy ra: `XxxInput`.
- Đường dẫn giao diện: tiếng Anh, `kebab-case` (`/admin/maintenance-requests`).
- Kiểu dữ liệu API giữ nguyên `snake_case` như JSON trả về (không thêm tầng chuyển đổi).
- Tiền VND nhận từ API là số nguyên; cột DECIMAL (chỉ số, số lượng) nhận dạng **chuỗi** — không `parseFloat` để tính tiền. Frontend chỉ hiển thị, **không tự tính** tiền hóa đơn. Hiển thị thời gian bằng múi giờ `Asia/Ho_Chi_Minh`.

**Backend**
- Class `PascalCase`, danh từ số ít: `Building`, `BuildingController`, `BuildingService`, `StoreBuildingRequest` / `UpdateBuildingRequest`, `BuildingResource`, `BuildingPolicy`.
- Enum: `RoomStatus`; case `PascalCase`, giá trị chuỗi `snake_case` (`case UnderMaintenance = 'under_maintenance'`).
- Method, biến: `camelCase`. Hằng: `UPPER_SNAKE_CASE`.

**API**
- URL: danh từ số nhiều, `kebab-case`: `/api/v1/buildings`, `/api/v1/maintenance-requests/{id}`. Lồng tối đa 1 cấp: `/api/v1/buildings/{building}/rooms`.
- Động từ: `GET` (danh sách/chi tiết), `POST` (tạo), `PUT`/`PATCH` (sửa), `DELETE` (xoá). Hành động đặc biệt: `POST /api/v1/invoices/{invoice}/pay`.
- Tên route: `api.v1.<resource>.<action>`. Trường JSON: `snake_case`.
- Response: `{ "data": ... }`; danh sách phân trang theo chuẩn Laravel (`data`, `links`, `meta`).
- Status: `200` OK, `201` tạo mới, `204` xoá, `401` chưa đăng nhập, `403` không có quyền, `404`, `409` xung đột trạng thái (trùng hóa đơn kỳ, còn payment pending, check-out trước check-in…), `422` dữ liệu nhập không hợp lệ, `500`.
- Thời điểm (timestamp) trả qua API dạng ISO-8601 UTC; ngày (`DATE`) dạng `YYYY-MM-DD`.

**Database** (chi tiết: `docs/09_DATABASE_DESIGN.md`)
- Bảng: `snake_case`, số nhiều (`buildings`, `maintenance_requests`). Bảng pivot dùng **đúng tên trong thiết kế** (`building_amenities`, `room_amenities`, composite PK) — khai báo tên bảng khi dùng `belongsToMany`.
- Cột: `snake_case`. Khoá chính `id` BIGINT UNSIGNED (`id()`), khoá ngoại `foreignId()->constrained()`. Boolean `is_`/`has_`. Thời điểm `_at`, ngày `_date`.
- FK mặc định `RESTRICT` để bảo vệ lịch sử; `CASCADE` chỉ cho pivot. Không xóa cứng hợp đồng/giao dịch tài chính đã phát sinh; khóa (`status`) thay vì xóa.
- **Tiền:** số nguyên đồng VND — `BIGINT UNSIGNED` cho giá trị không âm; riêng `invoice_items.amount` là `BIGINT` **có dấu** (dòng `discount` âm). Cấm float/DOUBLE và cấm DECIMAL cho tiền.
- **Lượng:** chỉ số/tiêu thụ/số lượng `DECIMAL(10,2)`, diện tích `DECIMAL(8,2)`.
- **Tính toán:** dùng BCMath (đã có trong PHP), làm tròn **HALF_UP đến đồng trên từng dòng**; tổng hóa đơn = tổng các dòng đã làm tròn.
- **Thời gian:** timestamp lưu **UTC** (`APP_TIMEZONE=UTC`, phiên MySQL `+00:00`); `DATE` là ngày lịch Việt Nam (không đổi múi giờ); `period` luôn là ngày 01 của tháng. Kỳ, hạn thanh toán, số ngày trong tháng tính theo `config('app.business_timezone')` (Asia/Ho_Chi_Minh).
- **Tính tiền:** chỉ qua `App\Support\Money` (BCMath, HALF_UP từng dòng); không tự viết phép tính tiền khác.
- Trạng thái/loại: cột `VARCHAR` cast sang PHP Enum (không dùng kiểu `ENUM` của MySQL).
- Unique có điều kiện (một hợp đồng active/phòng, một hóa đơn monthly chưa hủy/hợp đồng/kỳ…): **generated column STORED + UNIQUE** như §6 của thiết kế — MySQL không có partial index.
- Mã nghiệp vụ (`HD-`, `INV-`, `RCP-`, `MR-`, `APT-`): `NNNN` = ID tự tăng đệm **tối thiểu 4 chữ số, không reset** theo tháng; cột mã NULL được trước khi sinh, gán trong **cùng transaction**, có unique index; không dùng `MAX()+1`. Hợp đồng sinh mã khi kích hoạt, hóa đơn khi **phát hành**, biên nhận khi **xác nhận** thanh toán.
- Migration: mỗi file một bảng (`create_<table>_table`), theo thứ tự trong kế hoạch. Không sửa migration đã commit — tạo migration mới để thay đổi. Không tạo trùng bảng framework đã có (`users`, `sessions`).

## 6. Validation, phân quyền, xử lý lỗi

**Validation**
- Backend là nơi kiểm tra cuối cùng: mọi input đi qua FormRequest; chỉ dùng `$request->validated()`, không dùng `$request->all()` để tạo/sửa Model.
- Thông báo lỗi tiếng Việt (`messages()`/`attributes()` trong FormRequest).
- Frontend validate bằng Zod để cải thiện trải nghiệm, không thay thế backend. Lỗi `422` từ server hiển thị vào đúng trường bằng `setError`.
- Quy tắc nghiệp vụ kiểm tra trong Service: dữ liệu nhập sai quy tắc (chỉ số mới nhỏ hơn mốc cũ, ngày chồng lấn…) → `422` qua `ValidationException::withMessages([...])`; xung đột với trạng thái hiện tại (đã có hóa đơn kỳ này, còn payment pending, phòng đã có hợp đồng active) → `409`.
- Ràng buộc DB (unique, FK) là lớp bảo vệ cuối: bắt lỗi vi phạm unique (SQLSTATE 23000) và trả `409`, không để lộ lỗi SQL.

**Phân quyền**
- Xác thực: Sanctum SPA session cookie; route cần đăng nhập đặt trong `middleware('auth:sanctum')`. Không dùng personal access token trừ khi được yêu cầu.
- Mọi thao tác trên tài nguyên đều qua Policy (`$this->authorize(...)` hoặc middleware `can:`), gồm kiểm tra **quyền sở hữu** (cư dân chỉ thấy dữ liệu của mình).
- Không tin vai trò, `user_id`, giá tiền… gửi từ client; lấy từ `$request->user()` và CSDL.
- Route guard ở frontend chỉ phục vụ trải nghiệm, không phải lớp bảo mật.
- Mô hình vai trò **đã chốt**: một cột `users.role` (5 giá trị ở §1) + `users.status` (`active`/`locked`). Không tạo bảng roles/permissions, không cài package phân quyền. Policy + query scope kiểm tra cả vai trò lẫn quyền sở hữu:
  - Admin chỉ phân công cho tài khoản `technician` đang `active`; `technician` chỉ xem/sửa yêu cầu sửa chữa có `assigned_to` = chính mình, chỉ chuyển `pending→in_progress→resolved`; Admin mới được reject/mở lại.
  - `guard` chỉ xem lịch xem phòng `confirmed` của **hôm nay (giờ VN)**, check-in trước check-out, không đổi trạng thái lịch.
  - Người thao tác (`checked_in_by`, `reviewed_by`, `submitted_by`, `assigned_at`…) do server gán từ `$request->user()`.

**Xử lý lỗi**
- Mọi request `api/*` trả lỗi dạng JSON `{ "message": "...", "errors"?: {...} }` (đã cấu hình trong `bootstrap/app.php`).
- Không `try/catch` rồi nuốt lỗi. Lỗi nghiệp vụ dùng `abort(4xx, 'thông điệp tiếng Việt')` hoặc `ValidationException`; lỗi ngoài dự kiến để framework xử lý và `report()`.
- Frontend xử lý theo status: `401` → về trang đăng nhập; `403` → báo không có quyền; `409` → báo xung đột và tải lại dữ liệu; `422` → lỗi theo trường; `5xx`/mất mạng → thông báo chung, không hiển thị chi tiết kỹ thuật.

## 7. Bảo mật và bảo vệ dữ liệu

- Secrets chỉ nằm trong `.env` (đã gitignore). Không commit, không in mật khẩu/APP_KEY ra log hay câu trả lời; chỉ sửa `.env.example` bằng giá trị giả.
- Dữ liệu cá nhân của cư dân (CCCD, số điện thoại, email, địa chỉ): Resource chỉ trả trường cần thiết; không ghi log; `password`, `remember_token`, `id_number` luôn nằm trong `$hidden` — CCCD chỉ trả qua Resource dành cho Admin có quyền.
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
- `cd backend && php artisan test && vendor/bin/pint --test` — PHPUnit trên **MySQL `mini_apartment_test`** (cần `docker compose up -d mysql`; lần đầu chạy `sh scripts/create-test-db.sh`), code style.

Quy tắc test:
- Mỗi endpoint mới có Feature test trong `backend/tests/Feature/`, gồm trường hợp thành công, `422` (nếu có input) và `401`/`403` (nếu cần đăng nhập/phân quyền).
- Test chạy trên MySQL 8 (DB-D11) vì SQLite không áp dụng `UNSIGNED` và `lockForUpdate`. Checklist DB-01..DB-41 trong thiết kế.
- Test **chỉ** chạy qua kết nối `mysql_test`: database và tài khoản MySQL **riêng** `mini_apartment_test` (chỉ có quyền trên DB test; mật khẩu `DB_TEST_PASSWORD` do `scripts/setup.sh` sinh). `phpunit.xml` đặt kết nối bằng cả `<server>` lẫn `<env force>`; `tests/TestCase.php` so khớp **chính xác** kết nối/DB/tài khoản và trỏ kết nối `mysql` về DB test. Không gỡ các lớp bảo vệ này (DB-D30).
- Test thay đổi schema (rollback) hoặc concurrency cần dữ liệu đã commit: không dùng `RefreshDatabase`, phải tự khôi phục/dọn dẹp ở cuối test.
- Không dùng `migrate:fresh`/`RefreshDatabase` trên database phát triển `mini_apartment`.
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

## 11. Baseline CSDL và tính tiền (duyệt 14/10/2026)

Tóm tắt để code đúng hướng; khi cần chi tiết hoặc có nghi ngờ, đọc `docs/09_DATABASE_DESIGN.md` và `docs/DB_DECISIONS_20261014.md`.

**Danh mục**
- `amenities` (tiện nghi) **khác** `services` (khoản thu): tiện nghi không bao giờ tự sinh tiền. Tiện nghi cấp tòa ở `building_amenities`, cấp phòng ở `room_amenities`; trang phòng hiển thị hợp của hai tập, không sao chép tiện nghi tòa xuống phòng.
- `ELECTRICITY`, `WATER` là `services` hệ thống `billing_type = metered` (`price` NULL), tự thêm vào `contract_services` **đúng một lần** khi kích hoạt hợp đồng (`unit_price` NULL). `utility_prices` và `meter_readings` liên kết qua `service_id` — không có cột `type`.

**Hợp đồng và hóa đơn**
- Tối đa một hợp đồng `active` mỗi phòng và mỗi người đại diện. Người ở cùng (`contract_occupants`) không bắt buộc có tài khoản; `occupant_count` gồm cả người đại diện.
- Hợp đồng active không đổi phòng, người thuê, giá, cọc, ngày; gia hạn tạo hợp đồng mới (`renewed_from_id`).
- Mỗi hợp đồng tối đa một hóa đơn `monthly` chưa hủy mỗi kỳ và một `final` chưa hủy; một hóa đơn có **nhiều payment**.
- Hóa đơn kỳ **T** = tiền phòng T + dịch vụ định kỳ T + điện nước tiêu thụ **T−1** + điều chỉnh hợp lệ. Hóa đơn đầu tiên không tạo chỉ số giả.
- Chỉ số điện nước: `period` = **tháng tiêu thụ** (Admin chọn, giao diện chỉ gợi ý), `reading_date` = ngày ghi thực tế. `contract_id` do backend xác định theo **khoảng tiêu thụ** từ mốc trước đến `reading_date`, không theo riêng `reading_date`; khoảng cắt qua nhiều hợp đồng mà không có mốc ngăn cách → 422, **không suy đoán** (DB-D15, kế hoạch §5).
- Tiền phòng **và** dịch vụ định kỳ (`per_room`/`per_person`/`per_unit`) chia theo ngày ở tháng đầu/cuối: `round_half_up(unit_price × quantity × số ngày hiệu lực / số ngày của tháng)`, đếm cả ngày đầu và ngày cuối được ở, **không** đếm ngày bàn giao `actual_end_date` (DB-D32, DB-D43). Điện nước tính theo chỉ số, không chia ngày. Mỗi dòng hóa đơn **snapshot** số lượng/đơn giá/chỉ số/số ngày tính tiền; không thu lặp một khoản ở hai hóa đơn. *(Thay BR-SVC-04 cũ.)*
- Hóa đơn đã `issued` **bất biến** (dòng, hạn, tổng); `total_amount ≥ 0`; `paid_amount` = tổng payment `confirmed`. Payment `pending` không trừ nợ. Cần sửa hóa đơn đã phát hành: chưa có payment → hủy + lập lại (`related_invoice_id`); có `pending` → xử lý pending trước; có `confirmed` → 409 "cần quy trình điều chỉnh" (DB-D27).
- **Ngày tính tiền (DB-D32, DB-D43 — thay DB-D39):** `end_date` là **ngày cuối cùng được ở (inclusive)**; `actual_end_date` là **ngày bàn giao**, mốc **loại trừ** — hợp đồng tính tiền phòng và dịch vụ định kỳ trong `[start_date, actual_end_date)`; trả đúng hạn ⇒ `actual_end_date = end_date + 1`; quá `end_date` mà vẫn `active` thì tiếp tục tính tiền sử dụng thực tế; nhận và trả cùng ngày (`actual_end_date = start_date`) được phép, 0 ngày tiền phòng (DB-D41, DB-D45); bàn giao cùng ngày D thì D chỉ thuộc hợp đồng mới; áp dụng cả khi hóa đơn tháng đã phát hành (bù bằng `discount` trên `final`).
- **Thanh lý (DB-D46..DB-D49):** `closure_reason` là mã (`on_time`, `early_termination`, `same_day`) **suy từ ngày bàn giao**, `closure_note` bắt buộc với `early_termination`/`same_day`; **kiểm tra tài sản bắt buộc** trước thanh lý; phí trả trước hạn **tự tính theo điều khoản đã ký** (không bồi thường / cố định / hệ số × `monthly_rent`), không mặc định 1 tháng, không sửa sau kích hoạt; chỉ miễn theo điều kiện đã ghi trong hợp đồng + Admin xác nhận + căn cứ; phí trước hạn và bồi thường tài sản là **dòng riêng** trên hóa đơn `final`, cọc đối soát riêng. Cấu trúc lưu còn **chờ duyệt** (kế hoạch §14, P1–P12) — chưa code phần này.
- **Sau thanh lý (DB-D36):** giữ `role = resident` để xem lịch sử; "đang thuê" suy ra từ hợp đồng `active` (`User::hasActiveContract()`), Policy của thao tác cần đang thuê phải kiểm tra điều này.
- **Chênh chỉ số khi kích hoạt (DB-D31, DB-D40):** chỉ số đầu cao hơn chỉ số chốt gần nhất chỉ chấp nhận khi có `contracts.meter_gap_reason` và Admin xác nhận (`meter_gap_confirmed_by`, mốc `activated_at`); phần chênh không tính cho ai; thấp hơn thì chặn. Hai cột này chỉ ghi trong transaction kích hoạt, không mass-assign.
- **Giá điện nước (DB-D33):** giá mới hiệu lực từ ngày 01 và không làm thay đổi kỳ đã có chỉ số/hóa đơn. **Thiếu chỉ số (DB-D34):** chặn lập hóa đơn tháng khi thiếu chỉ số kỳ tiêu thụ bắt buộc. **Ghi trễ (DB-D35):** không giới hạn số ngày, chỉ chặn khi phá chuỗi/sai hợp đồng/đổi hóa đơn đã phát hành.
- Chỉ số điện nước (DB-D24..DB-D26, DB-D28): mỗi kỳ trong hợp đồng phải có mốc thực tế, **không** chia theo ngày, **không** tạo chỉ số giả; `final` thuộc kỳ cuối, `reading_date = actual_end_date`; bàn giao cùng ngày theo thứ tự `final` cũ → thanh lý → kích hoạt mới, xác định bằng quy trình + timestamp chứ không bằng DATE; giá điện nước `effective_from` luôn ngày 01, một giá mỗi kỳ. Quy tắc kiểm tra R1–R17 và điểm còn mở: kế hoạch §5.
- Thanh toán: VietQR chỉ để hướng dẫn; cư dân gửi 1 ảnh minh chứng, Admin đối chiếu ngân hàng rồi confirm/reject (reject phải có lý do).
- Cọc tách riêng trên `contracts`, không là doanh thu. Thanh lý: chốt chỉ số `final` → lập và phát hành hóa đơn `final` (bù ngày không ở bằng dòng `discount` âm, tổng không âm, phần dư hoàn ngoài hệ thống ghi vào `closure_note`) → chặn nếu còn payment pending → khấu trừ cọc bằng payment `method = deposit` → hợp đồng `terminated`, phòng `available`.

**Transaction và khóa**
- Bắt buộc `DB::transaction` + `lockForUpdate()` khi: kích hoạt/thanh lý hợp đồng, ghi dịch vụ hợp đồng, nhập chỉ số (all-or-nothing), lập/phát hành/hủy hóa đơn, xác nhận payment. Unique DB là lớp chặn cuối, phải có test tranh chấp.
- **Thứ tự khóa thống nhất (DB-D29):** `rooms → users → contracts → contract_services → meter_readings → invoices → payments`; nhiều dòng cùng bảng theo `id` tăng dần; không khóa ngược lên cấp trên; khóa cha trước khi ghi bảng con; `DB::transaction(..., 3)` để retry deadlock. Chi tiết từng Service: kế hoạch §6.
- Notification gửi **sau khi transaction commit**. MVP chạy `QUEUE_CONNECTION=sync`, **không** có queue worker (DB-D23) — không dùng `ShouldQueue` khi chưa được duyệt.

## 12. Lịch sử thay đổi quy tắc

| Ngày | Thay đổi |
| --- | --- |
| 12/10/2026 | Khởi tạo quy tắc chung. |
| 18/10/2026 | `frontend/` = giao diện Antigravity chính thức (chủ dự án duyệt); thêm `lucide-react`; mô tả lại cấu trúc frontend (bỏ `DashboardShell`, thêm `src/mocks/` và quy tắc ranh giới dữ liệu giả); trạng thái dự án trỏ tới `docs/PROJECT_STATUS_AND_LEARNING.md`. |
| 14/10/2026 (6) | Áp dụng DB-D43..DB-D50: đảo O7 (`end_date` inclusive, đúng hạn = `end_date + 1`); mã thanh lý; bồi thường trước hạn, miễn trừ, kiểm tra tài sản (nguyên tắc — cấu trúc chờ duyệt P1–P12); Nhóm 4 + index O11. |
| 14/10/2026 (5) | Áp dụng DB-D39..DB-D42 (O7–O9): `end_date` nửa mở, tiếp tục tính tiền khi quá hạn, cột `meter_gap_*`, thanh lý ngày đầu; trạng thái Nhóm 3 (test). |
| 14/10/2026 (4) | Áp dụng DB-D31..DB-D38 (O1–O6): ngày bàn giao loại trừ, giữ `resident` sau thanh lý, chênh chỉ số, giá, thiếu chỉ số, ghi trễ; trạng thái Nhóm 1 (dev + test) và Nhóm 2 (test). |
| 14/10/2026 (3) | Áp dụng DB-D23..DB-D30: queue `sync`; quy tắc điện nước E1–E5; hủy/lập lại hóa đơn; thứ tự khóa thống nhất; tài khoản MySQL test riêng + guard so khớp chính xác; trạng thái Nhóm 1. |
| 14/10/2026 (2) | Áp dụng DB-D11..DB-D22 (Q1–Q12): test MySQL `mini_apartment_test` + guard; mã nghiệp vụ; `period` điện nước = tháng tiêu thụ; ẩn `id_number`; UTC đã cấu hình; helper `Money`. |
| 14/10/2026 | Đồng bộ với `DB_DECISIONS_20261014.md` / `09_DATABASE_DESIGN.md`. **Bị thay thế:** "3 vai trò, technician/guard để sau" → 5 actor; "~20 bảng chờ duyệt" → 21 bảng đã duyệt; "mô hình vai trò chưa chốt" → `users.role`; "tiền `unsignedBigInteger`" → bổ sung `BIGINT` có dấu cho `invoice_items.amount` + HALF_UP từng dòng; "thời gian theo `APP_TIMEZONE` Asia/Ho_Chi_Minh" → timestamp UTC, DATE giờ VN; "pivot đặt tên số ít theo chữ cái" → tên theo thiết kế; "vi phạm nghiệp vụ → 422" → tách `409` cho xung đột trạng thái; "lưu thiết kế ở `docs/database/`" → `docs/09_DATABASE_DESIGN.md`. |
