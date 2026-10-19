# PROJECT STATUS & LEARNING — Mini Apartment Management

| Thuộc tính | Giá trị |
|---|---|
| Cập nhật | 19/10/2026 (T1: commit + chạy lại test) |
| Người đọc | Chủ dự án (sinh viên) và AI agent làm tiếp |
| Mục đích | Nói **thật** dự án đang ở đâu, kế hoạch làm tiếp, và giải thích kiến trúc để chủ dự án tự trình bày được |
| Nhãn bằng chứng | **[KIỂM CHỨNG 18/10]**, **[KIỂM CHỨNG 19/10]** = đã chạy lệnh/kiểm tra trong ngày đó · **[THEO TÀI LIỆU]** = ghi trong `docs/`, chưa chạy lại · **[ĐỀ XUẤT]** = kế hoạch, chưa làm, chưa được duyệt |

Tài liệu này **không** thay các quyết định trong `DB_DECISIONS_20261014.md` và `09_DATABASE_DESIGN.md`. Đề xuất ở §7–§8 chỉ có hiệu lực khi chủ dự án duyệt.

---

## 0. Tóm tắt một phút

| Phần | Hiện trạng thật |
|---|---|
| Giao diện (`frontend/`) | 27/51 màn hình mở được, phong cách Antigravity. **100% dữ liệu giả** — chưa màn hình nào gọi API nghiệp vụ. Ai cũng vào được `/admin` |
| API (Laravel) | Chỉ có `GET /api/v1/health`. **Chưa có đăng nhập, chưa có API nghiệp vụ nào** |
| CSDL dev `mini_apartment` | Nhóm 1 (`users` ALTER, `buildings`, `amenities`, `services`, `settings`) — các bảng đều **rỗng** |
| CSDL test `mini_apartment_test` | Nhóm 1–3 (16 migration nghiệp vụ) |
| Logic nghiệp vụ (Service) | Chưa có. Mới có schema, Model, Enum, helper `Money` và test mức CSDL |
| Git | Ngày 19/10 đã commit toàn bộ công việc theo 8 nhóm (§2.3); chưa push. Còn để ngoài Git: hai thư mục prototype cũ và `.claude/` |

**Rủi ro lớn nhất hiện nay:** code chỉ nằm trên một máy (chưa có remote, chưa push). Bản sao lưu ngoài repo: `D:MaNguonMomini-apartment-backupspre-T1-commit-20261019` (đã thử khôi phục).

---

## 1. Kiến trúc React → Laravel → MySQL

### 1.1 Bức tranh tổng thể

```text
Trình duyệt
   │  http://localhost:8080
   ▼
Nginx (reverse proxy — "người gác cổng" chia đường)
   ├── /api/*, /sanctum/*, /up  ──► Laravel (PHP-FPM)  ──► MySQL 8.4
   └── mọi đường dẫn khác       ──► Vite dev server (trả về ứng dụng React)
```

Chạy không cần Docker cho frontend: `cd frontend && npm run dev` → http://localhost:5173. Khi đó Vite tự chuyển tiếp `/api`, `/sanctum` sang `localhost:8000` (cấu hình trong `frontend/vite.config.ts`).

**Ví dụ đời thường — một nhà hàng:**

| Tầng | Vai trò trong nhà hàng | Trong dự án |
|---|---|---|
| React (frontend) | Phục vụ bàn: đưa thực đơn, ghi món, kiểm tra sơ bộ ("món này hết rồi") | Hiển thị, form, kiểm tra nhập liệu để **tiện cho người dùng** |
| Laravel (backend) | Bếp trưởng: kiểm tra lại order, nấu theo công thức, **tính tiền** | Kiểm tra cuối cùng, phân quyền, nghiệp vụ, tính tiền bằng `App\Support\Money` |
| MySQL (database) | Kho và sổ sách: lưu nguyên liệu, khóa tủ khi đang lấy hàng | Lưu dữ liệu, ràng buộc (unique, khóa ngoại) — lớp chặn cuối cùng |

Phục vụ bàn không được tự quyết giá món. Tương tự, **React không được tự tính tiền hóa đơn** (AGENTS §5). Hiện React có tự cộng tiền ở vài chỗ, nhưng đó chỉ là dữ liệu giả, được gắn nhãn `[MOCK-TIỀN]` (§3).

### 1.2 Hành trình một request có thật: kiểm tra sức khỏe hệ thống

Đây là đường đi **duy nhất** từ React tới MySQL đang tồn tại trong code. Mọi module sau này sẽ đi theo đúng khuôn này.

| Bước | Nơi xử lý | File | Việc làm |
|---|---|---|---|
| 1 | React | `frontend/src/features/system/api.ts` | `getHealth()` gọi `http.get('/health')` |
| 2 | React | `frontend/src/lib/http.ts` | Axios có `baseURL = /api/v1`, gửi kèm cookie (`withCredentials`) → thành `GET /api/v1/health` |
| 3 | Nginx | `docker/nginx/default.conf` | Thấy tiền tố `/api` → chuyển cho Laravel |
| 4 | Laravel | `backend/bootstrap/app.php` | Gắn tiền tố `api/v1` cho mọi route trong `routes/api.php`; lỗi của `api/*` luôn trả JSON |
| 5 | Laravel | `backend/routes/api.php` | `Route::get('/health', HealthController::class)` |
| 6 | Controller | `backend/app/Http/Controllers/Api/V1/HealthController.php` | Mỏng: gọi Service, chọn mã 200 hoặc 503 |
| 7 | Service | `backend/app/Services/HealthCheckService.php` | Chạy `select 1` lên MySQL; lỗi thì `report()` và trả trạng thái `degraded` |
| 8 | Resource | `backend/app/Http/Resources/HealthResource.php` | Định dạng JSON `{ "data": {...} }`; chỉ lộ phiên bản PHP/Laravel khi bật debug |
| 9 | React | `features/system/api.ts` | Nhận `response.data.data` |

> Lưu ý: component hiển thị kết quả này (`features/system/ApiStatusCard.tsx`) hiện **không được đặt trên trang nào**; code được giữ làm mẫu tích hợp.

### 1.3 Khuôn mẫu cho module nghiệp vụ (chưa có — minh họa)

Ví dụ "Admin tạo tòa nhà", **[ĐỀ XUẤT]**, chưa có code:

```text
AdminBuildingsPage.tsx (nút "Thêm tòa nhà", form React Hook Form + Zod)
  → features/buildings/api.ts: createBuilding(input)   → POST /api/v1/buildings
  → StoreBuildingRequest      kiểm tra dữ liệu   (sai → 422 + lỗi từng trường)
  → BuildingPolicy::create    kiểm tra quyền     (không phải admin → 403; chưa đăng nhập → 401)
  → BuildingService::create   nghiệp vụ, transaction nếu ghi nhiều bảng
  → Building::create(...)     Eloquent sinh câu INSERT
  → MySQL                     unique/khóa ngoại là lớp chặn cuối (trùng → 409)
  → BuildingResource          JSON { "data": {...} }, mã 201
  → React hiện thông báo, tải lại danh sách
```

### 1.4 React khởi động và chọn màn hình như thế nào

1. `frontend/index.html` có `<div id="root">` và nạp `src/main.tsx`.
2. `main.tsx` gắn `<App />` vào `#root` (bọc `StrictMode` để phát hiện lỗi khi phát triển).
3. `app/App.tsx` bọc `AppProvider` (kho dữ liệu giả) quanh `RouterProvider`.
4. `app/router.tsx` khai báo cây route. Layout được chọn theo **tiền tố URL**: `/` → `PublicLayout`, `/admin` → `AdminLayout`. Layout vẽ khung (menu, header) rồi để `<Outlet />` hiển thị trang con.
5. Trang (`pages/...`) lấy dữ liệu bằng `useApp()` từ `mocks/AppContext.tsx` — **đây là chỗ sẽ được thay** bằng hàm trong `features/<feature>/api.ts`.

Vai trò hiện **không** quyết định layout; nút "Vai trò" chỉ đổi biến `role` trong bộ nhớ và chuyển trang. Khi có đăng nhập thật, router sẽ có "route guard": kiểm tra vai trò từ `GET /auth/me` trước khi cho vào `/admin`. Guard này chỉ phục vụ trải nghiệm; bảo mật thật nằm ở Policy của Laravel.

### 1.5 Thuật ngữ

| Thuật ngữ | Giải thích dễ hiểu | Ví dụ trong dự án |
|---|---|---|
| SPA (Single Page Application) | Trang web tải một lần, sau đó tự đổi nội dung mà không tải lại cả trang | Bấm từ "Phòng" sang "Hợp đồng" không tải lại trang |
| REST API / endpoint | "Cửa sổ giao dịch" của backend: mỗi URL + phương thức (GET/POST/…) làm một việc | `GET /api/v1/health` |
| JSON | Định dạng dữ liệu dạng văn bản mà hai bên đều đọc được | `{ "data": { "status": "ok" } }` |
| Mã trạng thái HTTP | Con số cho biết kết quả: 200 thành công, 201 đã tạo, 401 chưa đăng nhập, 403 không có quyền, 404 không thấy, 409 xung đột trạng thái, 422 dữ liệu sai | Lập hóa đơn trùng kỳ → 409 |
| Migration | File PHP mô tả cách tạo/sửa bảng; chạy lệnh là MySQL có bảng. Như "bản vẽ thi công" có đánh số thứ tự | `2026_10_14_100002_create_buildings_table.php` |
| Batch | Số lần chạy `migrate`; các migration chạy cùng lần có chung batch | DB dev: batch 1 (framework), batch 2 (Nhóm 1) |
| Model / Eloquent | Lớp PHP đại diện cho một bảng; viết `Building::create([...])` thay vì tự viết SQL | `app/Models/Building.php` |
| Enum | Danh sách giá trị cố định có tên | `RoomStatus::Available` = `'available'` |
| FormRequest | Lớp chuyên kiểm tra dữ liệu gửi lên, trả 422 kèm lỗi tiếng Việt | `StoreBuildingRequest` (chưa có) |
| Policy | Lớp trả lời câu hỏi "người này có được làm việc này không?" | Cư dân chỉ xem hóa đơn của mình |
| Service | Nơi đặt quy tắc nghiệp vụ, giúp Controller mỏng | `HealthCheckService` |
| Resource | Lớp quyết định trả trường nào ra JSON (giấu CCCD, mật khẩu) | `HealthResource` |
| Transaction | Nhóm thao tác "được ăn cả, ngã về không": lỗi giữa chừng thì hoàn tác hết | Kích hoạt hợp đồng: đổi trạng thái phòng + hợp đồng + thêm dịch vụ điện nước |
| `lockForUpdate` | Khóa dòng dữ liệu đang xử lý để người khác phải chờ | Hai Admin cùng phát hành một hóa đơn — chỉ một người thành công |
| Sanctum (SPA cookie) | Đăng nhập bằng phiên (session) lưu trong cookie, không cần tự cầm token | `lib/http.ts` gửi `withCredentials` |
| CSRF / XSRF | Chống trang web lạ giả danh người dùng gửi request; gọi `/sanctum/csrf-cookie` trước khi đăng nhập | `fetchCsrfCookie()` |
| Mock data | Dữ liệu giả để xem giao diện khi chưa có backend | `frontend/src/mocks/data.ts` |
| Generated column | Cột MySQL tự tính từ cột khác; dùng để làm "unique có điều kiện" | Mỗi phòng tối đa một hợp đồng `active` |
| BCMath, HALF_UP | Thư viện tính số chính xác của PHP; làm tròn "từ 5 trở lên thì lên" | `Money` làm tròn từng dòng hóa đơn đến đồng |

---

## 2. Những gì đã hoàn thành thật sự

"Hoàn thành" ở đây có nghĩa là có code hoặc tài liệu kèm bằng chứng. **Chưa có chức năng nghiệp vụ nào chạy end-to-end** (giao diện → API → CSDL).

### 2.1 Backend và CSDL

| Hạng mục | Bằng chứng | Nhãn |
|---|---|---|
| Hạ tầng Docker: nginx, app (PHP 8.3), mysql 8.4, frontend | `docker-compose.yml`, `docker/`; commit `a0c497a`. Ngày 18/10 chỉ bật container `mysql` (đọc trạng thái DB); `app`/`nginx`/`frontend` chưa chạy lại | [KIỂM CHỨNG 18/10] một phần |
| API `GET /api/v1/health` (Route → Controller → Service → Resource) | `php artisan route:list` | [KIỂM CHỨNG 18/10] |
| Thiết kế CSDL 21 bảng + quyết định DB-D01..DB-D50 | `docs/09_DATABASE_DESIGN.md` v1.5, `docs/DB_DECISIONS_20261014.md` | Đã duyệt |
| 16 migration nghiệp vụ (Nhóm 1–3) | `backend/database/migrations/2026_10_14_*` | [KIỂM CHỨNG 18/10] file tồn tại |
| 14 Model (13 mới + `User` sửa) cho 16 bảng; 16 Enum; helper tiền `App\Support\Money` | `backend/app/Models`, `app/Enums`, `app/Support/Money.php` | [KIỂM CHỨNG 18/10] file tồn tại |
| Bảo vệ DB test: tài khoản MySQL riêng `mini_apartment_test`, guard trong `tests/TestCase.php`, `phpunit.xml` | Code + `DATABASE_IMPLEMENTATION_PLAN.md` §2 | [THEO TÀI LIỆU] |
| 133 test / 458 assertion PASS (schema, ràng buộc, tranh chấp 2 kết nối, rollback, Enum, Money); `pint --test` PASS | Chạy lại ngày 19/10 trên `mini_apartment_test`; DB dev được chụp checksum trước/sau — không đổi | [KIỂM CHỨNG 19/10] |
| Trạng thái migration dev/test | Đọc bảng `migrations` (§5) | [KIỂM CHỨNG 18/10] |

### 2.2 Frontend

| Hạng mục | Bằng chứng | Nhãn |
|---|---|---|
| `frontend/` = giao diện Antigravity chính thức (React 19, Router 8, Tailwind 4, lucide-react) | Chủ dự án duyệt; bản cũ sao lưu ở `D:\MaNguonMo\mini-apartment-backups\frontend-before-antigravity-20261017\` | Đã duyệt |
| Cấu trúc thư mục chuẩn hóa, ranh giới dữ liệu giả `src/mocks/` | `AGENTS.md` §4, `frontend/src/mocks/README.md` | Hoàn thành |
| Kiểm tra: `tsc` 0 lỗi, build pass, oxlint 0 lỗi | Chạy lại sau khi sửa giao diện 18/10 — xem báo cáo lượt này | [KIỂM CHỨNG 18/10] |
| Sửa bố cục 18/10: nút "Vai trò" vào header (hết che "Xem trang Public" và chuông); bảng cuộn ngang (trước đó bảng Hợp đồng/Người dùng bị cắt 442–447px trên điện thoại, ~105px ở 1024px); nhãn trạng thái không xuống dòng; dải tab không tràn khỏi khung | Đo bằng Chrome headless trên 28 route × 3 kích thước, không còn phần tử bị che hoặc tràn | [KIỂM CHỨNG 18/10] |

### 2.3 Git

Ngày 19/10/2026 [KIỂM CHỨNG 19/10] toàn bộ công việc đã được commit theo nhóm (chưa push, chưa có remote):

| Commit | Nội dung |
|---|---|
| `3c8b03d` docs | Thiết kế CSDL 21 bảng, quyết định DB-D01..DB-D50, kế hoạch migrations |
| `5f06d1b` chore | DB test MySQL riêng + guard, UTC, queue sync, helper `Money` |
| `a76ea42` feat | Migrations Nhóm 1 + Model, Enum, test |
| `41a4b66` feat | Migrations Nhóm 2 + Model, Enum, test |
| `9c4ba0d` feat | Migrations Nhóm 3 + Model, Enum, test rollback |
| `b4572fb` feat | Frontend Antigravity chính thức (dữ liệu giả) |
| `c3c3be5` fix | Sửa phần tử bị che, bảng bị cắt (18/10) |
| (commit tài liệu) docs | AGENTS, README, tài liệu trạng thái này |

Không commit (có chủ đích): `public-ui-concept/`, `ui-antigravity-full/` (prototype cũ, đã sao lưu ngoài repo; chờ chủ dự án quyết định giữ/xóa), `.claude/settings.json` (quyền công cụ cục bộ). `.env`, `vendor/`, `node_modules/`, `dist/` đã nằm trong `.gitignore`.

---

## 3. Những gì mới có giao diện prototype (dữ liệu giả)

27 màn hình mở được: Public 8/8, Admin 17/25, trang 404 và trang lỗi route. Danh sách từng màn hình: `docs/SCREEN_INVENTORY.md` §4.

"Dữ liệu giả" cụ thể là:

| Đặc điểm | Hệ quả |
|---|---|
| Dữ liệu lấy từ `src/mocks/data.ts`; thao tác (phát hành hóa đơn, ghi chỉ số…) chỉ đổi state trong bộ nhớ (`mocks/AppContext.tsx`) | Bấm F5 là mất; hai trình duyệt thấy dữ liệu khác nhau |
| Chưa có đăng nhập; nút "Vai trò" và nút vào nhanh ở `/login` là công cụ demo | Ai cũng mở được `/admin` |
| 7 chỗ React tự tính tiền (tổng hóa đơn, KPI dashboard, phí trước hạn…), gắn `[MOCK-TIỀN]` | **Không** phải công thức chính thức; khi nối API phải bỏ và lấy số từ Backend |
| Form dùng `useState`, chưa dùng React Hook Form + Zod như AGENTS §4 quy định | Khi nối API cần chuyển sang RHF + Zod để hiển thị lỗi 422 theo trường |
| Wizard hợp đồng/thanh lý minh họa các phương án P1–P12 **chưa duyệt** (có nhãn "Chờ duyệt") | Giao diện minh họa không có nghĩa phương án đã được chốt |
| Kiểu dữ liệu mock dùng `camelCase` (`roomCode`) | API thật dùng `snake_case` (`room_code`); kiểu thật sẽ đặt ở `features/<feature>/types.ts` |

---

## 4. Những chức năng còn thiếu

### 4.1 Màn hình (24 màn + 1 route con)

- Cư dân: RES-01..RES-10 (10 màn).
- Nhân viên: STF-01..STF-05 (5 màn).
- Admin: ADM-18 Duyệt thanh toán, ADM-19 Công nợ [ĐỀ XUẤT UI], ADM-20/21 Sửa chữa, ADM-22 Lịch xem phòng, ADM-23 Cài đặt, ADM-24 Thông báo, ADM-25 Hồ sơ (8 màn).
- Hệ thống: SYS-01 trang 403.
- Route sửa hợp đồng nháp `/admin/contracts/:contractId/edit` (thuộc ADM-12).

### 4.2 Backend

- Đăng nhập/đăng ký/đăng xuất (Sanctum), Policy, middleware phân quyền.
- Mọi API nghiệp vụ: tòa nhà, tiện nghi, dịch vụ, phòng, người dùng, hợp đồng, giá và chỉ số điện nước, hóa đơn, thanh toán, sửa chữa, lịch xem phòng, thông báo, cài đặt, upload tệp.
- Migrations Nhóm 4 (`maintenance_requests`, `viewing_appointments`, `attachments`, `notifications`) — chưa tạo ở đâu cả.
- Seeder dữ liệu hệ thống (Nhóm 5): dịch vụ `ELECTRICITY`, `WATER` và các khóa `settings`. Bảng `services` trên DB dev đang **0 dòng**.
- Điều chỉnh M09 `contracts` theo P2, P4, P5, P6 sau khi được duyệt.

### 4.3 Kết nối frontend

- Context/hook đăng nhập, route guard theo vai trò, xử lý 401/403/409/422 theo AGENTS §6.
- Kiểu dữ liệu API thật (`snake_case`), form RHF + Zod, bỏ dần import `@/mocks`.

### 4.4 Tồn tại nhỏ đã biết (chưa sửa — không thuộc phạm vi "sửa nhỏ")

- Bảng trên điện thoại cuộn ngang; Brief §4.1 muốn chuyển thành thẻ (card) — cần thiết kế lại nên chưa làm.
- Toast "Đã chuyển vai trò: Quản trị viên" hiện vài giây mỗi lần mở thẳng `/admin` (công cụ demo; sẽ mất khi có đăng nhập thật).
- `RouteErrorPage` còn giao diện cũ; cảnh báo bundle > 500 kB; 9 cảnh báo oxlint từ code Antigravity.
- Kiểm thử giao diện tự động (Chrome headless) mới nằm ở thư mục tạm, chưa đưa vào repo.

---

## 5. Trạng thái Database migrations

**Cách kiểm tra (18/10/2026):** bật Docker Desktop, `docker compose start mysql` (chỉ MySQL), rồi chạy **SELECT** trên bảng `migrations` và `information_schema` của hai database. Không chạy `migrate`, không ghi dữ liệu.

| Migration | Bảng | DB dev `mini_apartment` | DB test `mini_apartment_test` |
|---|---|---|---|
| Framework `0001_01_01_00000x` | `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` | Đã chạy (batch 1) | Đã chạy (batch 1) |
| Nhóm 1 `2026_10_14_1000xx` | `users` (ALTER), `buildings`, `amenities`, `services`, `settings` | Đã chạy (batch 2) | Đã chạy (batch 2) |
| Nhóm 2 `2026_10_14_2000xx` | `rooms`, `building_amenities`, `room_amenities`, `contracts`, `contract_occupants`, `contract_services`, `utility_prices` | **Chưa chạy** | Đã chạy (batch 3) |
| Nhóm 3 `2026_10_14_3000xx` | `invoices`, `meter_readings`, `invoice_items`, `payments` | **Chưa chạy** | Đã chạy (batch 4) |
| Nhóm 4 | `maintenance_requests`, `viewing_appointments`, `attachments`, `notifications` | Chưa có file | Chưa có file |

- DB dev: 13 bảng; `users`, `buildings`, `amenities`, `services`, `settings` đều **0 dòng**. DB test: 24 bảng. MySQL 8.4.11.
- `.env` đang `RUN_MIGRATIONS=false` — **phải giữ nguyên**. Nếu bật, `docker compose up` sẽ tự chạy Nhóm 2–3 lên DB dev mà chưa được duyệt.
- Dev chỉ có Nhóm 1 là **có chủ đích**: chạy migration nghiệp vụ lên dev cần duyệt riêng, kèm backup và `migrate --pretend` (AGENTS §3).

**Hệ quả cho kế hoạch:**

| Module | Bảng cần có trên dev | Sẵn sàng? |
|---|---|---|
| Đăng nhập | `users` (đã ALTER), `sessions` | Có |
| Tòa nhà, danh mục tiện nghi, dịch vụ, cài đặt | `buildings`, `amenities`, `services`, `settings` | Có |
| Gắn tiện nghi cho tòa/phòng, Phòng, Hợp đồng, Giá điện nước | Nhóm 2 | Cần chạy Nhóm 2 trên dev |
| Chỉ số, Hóa đơn, Thanh toán | Nhóm 3 | Cần chạy Nhóm 3 trên dev |
| Ảnh phòng, minh chứng thanh toán, lịch xem phòng, sửa chữa, thông báo | Nhóm 4 | Chưa có migration |

**Điểm cần chú ý về thứ tự:** M09 (`contracts`) còn chờ thêm cột theo P2, P4, P5, P6. Kế hoạch CSDL §14.3 cho phép **sửa trực tiếp M09** vì nó chưa chạy trên dev và chưa commit. Nếu chạy Nhóm 2 lên dev **trước** khi chốt P2/P4/P5/P6, mọi thay đổi sau đó phải bằng migration ALTER mới. Hai cách xử lý: (a) chốt P2/P4/P5/P6 trước khi chạy Nhóm 2 trên dev, hoặc (b) chấp nhận viết migration ALTER sau.

---

## 6. Laravel API đã có thật

Kết quả `php artisan route:list` ngày 18/10/2026 [KIỂM CHỨNG 18/10]:

| Phương thức | Đường dẫn | Nguồn | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/health` | Dự án — `HealthController` | 200 khi kết nối DB được, 503 khi không; tên route `api.v1.health` |
| GET | `/` | Dự án — `routes/web.php` | Trả JSON tên ứng dụng + địa chỉ API (không phải giao diện) |
| GET | `/sanctum/csrf-cookie` | Sanctum | Đặt cookie `XSRF-TOKEN` trước khi đăng nhập |
| GET | `/up` | Laravel | Health check mặc định của framework |
| GET, PUT | `/storage/{path}` | Laravel (`filesystems.local.serve = true`) | Chỉ hoạt động với URL có chữ ký tạm thời. Cần xem lại khi làm upload (AGENTS §7: tệp riêng tư chỉ tải qua route có Policy) |

**Không có endpoint nghiệp vụ nào.** Frontend hiện chỉ có một hàm gọi API thật (`getHealth`), và hàm này cũng chưa được dùng trên trang nào.

---

## 7. Quyết định còn chờ duyệt

Những mục dưới đây **không** được coi là đã chốt chỉ vì giao diện đang minh họa chúng.

### 7.1 Hợp đồng và thanh lý — P1..P12 (`DATABASE_IMPLEMENTATION_PLAN.md` §14.4)

| Mã | Câu hỏi | Chặn module |
|---|---|---|
| P1 | Validation `end_date`: hợp đồng tối thiểu 2 ngày (`end_date > start_date`) hay cho phép 1 ngày | Hợp đồng (lập nháp) |
| P2 | Lý do chênh chỉ số khi kích hoạt: một ô chung hay tách Điện/Nước, có lưu lượng chênh | Hợp đồng (kích hoạt), schema M09 |
| P3 | Mã thanh lý bổ sung: trả quá hạn, gia hạn, chủ nhà đơn phương chấm dứt (P10 gộp vào đây) | Thanh lý |
| P4 | Cột lưu điều khoản phí trả trước hạn (`none` / `fixed` / `rent_multiple`) | Hợp đồng (lập nháp), schema M09 |
| P5 | Cấu trúc lưu điều kiện miễn phí trước hạn (A/B/C); miễn toàn bộ hay một phần | Hợp đồng, thanh lý, schema M09 |
| P6 | Cách lưu kết quả kiểm tra tài sản | Thanh lý, schema M09 |
| P7 | Loại dòng hóa đơn mới `termination_fee`, `damage` | Hóa đơn `final` |
| P8 | Ảnh kiểm tra/hư hỏng/căn cứ miễn gắn vào hợp đồng (`attachments`) | Nhóm 4, thanh lý |
| P9 | Nhận và trả cùng ngày có tính phí trước hạn không | Thanh lý |
| P11 | Bồi thường tài sản: Admin nhập kèm căn cứ + ≥ 1 ảnh, không cần người thuê ký trong hệ thống | Thanh lý |
| P12 | Kiểm tra tài sản bắt buộc với mọi loại thanh lý | Thanh lý |

### 7.2 Phạm vi giao diện — Q1..Q17 (`FRONTEND_DESIGN_BRIEF.md` §14.2)

> Không nhầm với Q1–Q12 trong `DB_DECISIONS` (đó là các câu đã chốt thành DB-D11..DB-D22).

| Ảnh hưởng | Câu hỏi |
|---|---|
| Đăng nhập | **Q2 — đã chốt 19/10:** khách đã đăng ký có khu vực "Tài khoản của tôi". Còn mở: **Q4** (quên mật khẩu / Admin đặt lại mật khẩu?), **Q10** (cư dân tự sửa trường nào; ai nhập CCCD), **Q11** (ai tạo tài khoản nhân viên/Admin, có đổi vai trò không) |
| Phòng | **Q17** (đổi phòng sang bảo trì khi đang có hợp đồng active?) |
| Hợp đồng | **Q5** (lập nháp cho phòng đang có người thuê?), **Q6** (Admin tạo tài khoản cho người thuê?), **Q7** (đơn giá dịch vụ riêng theo hợp đồng?), **Q15** (thời điểm ghi nhận đã nhận cọc) |
| Hóa đơn, thanh toán | **Q8** (đã thanh lý còn nợ có gửi minh chứng được không), **Q12** (trang Công nợ riêng?), **Q13** (Admin thêm dòng "Khoản khác"?) |
| Khác | Q1 (đối chiếu "38 trang" cũ), Q3 (đổi/hủy lịch xem), Q9 (ai đặt mức ưu tiên sửa chữa), Q14 (nhân viên thấy SĐT cư dân?), Q16 (danh sách sự kiện thông báo) |

### 7.3 Quyết định kỹ thuật/quy trình mới

| # | Câu hỏi | Đề xuất |
|---|---|---|
| T1 | Commit công việc hiện có thế nào | **Đã làm 19/10** (§2.3) |
| T2 | Đăng nhập bằng email hay số điện thoại | **Đã chốt 19/10:** email **hoặc** số điện thoại + mật khẩu |
| T3 | Tạo tài khoản Admin đầu tiên | **Đã chốt 19/10:** bằng lệnh Laravel Artisan (tên lệnh, cách nhập mật khẩu: đề xuất `app:create-admin` tương tác, không lưu mật khẩu vào repo) |
| T4 | Nút "Vai trò" demo khi có đăng nhập thật | **Đã chốt 19/10:** không cho chuyển vai trò tùy ý khi đăng nhập thật; công cụ demo chỉ còn trong môi trường thử nghiệm được kiểm soát; có nút "Về trang chủ" và lối vào khu vực phù hợp với tài khoản |
| T5 | Hai route ngoài danh mục `/rooms/:roomId/book`, `/book` | Giữ tạm như màn hình phụ của PUB-03; quyết định khi nối API lịch xem phòng |
| T6 | Thời điểm chạy Nhóm 2 trên dev so với P2/P4/P5/P6 | Xem §5 — chốt P2/P4/P5/P6 trước khi chạy Nhóm 2 trên dev |
| T7 | `filesystems.local.serve = true` | Xem lại khi làm upload (Nhóm 4) |

---

## 8. Kế hoạch triển khai Backend và kết nối Frontend [ĐỀ XUẤT]

### 8.1 Nguyên tắc

- Làm theo **lát cắt dọc**: mỗi module đi trọn từ CSDL → API (kèm Feature test) → nối màn hình → bỏ mock của màn hình đó → giải thích để học (§9). Không làm hết backend rồi mới làm frontend.
- Mỗi bước dừng lại chờ duyệt; commit nhỏ; mỗi endpoint có test thành công, 422, 401/403.
- Màn hình giữ nguyên phong cách Antigravity; chỉ thay nguồn dữ liệu và form.
- Không đụng các phần đang chờ P1–P12; làm phần không bị chặn trước.

### 8.2 Bảng tổng quan

| Bước | Module | Cần trên DB dev | Bị chặn bởi | Màn hình nối API |
|---|---|---|---|---|
| 0 | Chuẩn bị | — | T1, T3; duyệt seeder Nhóm 5 | — |
| 1 | Authentication | Có sẵn | Q4, Q10, Q11; dữ liệu bắt buộc khi đăng ký; cơ chế cấp tài khoản | PUB-05, PUB-06, guard `/admin`, SYS-01 (403) |
| 2 | Tòa nhà + danh mục tiện nghi | Có sẵn (2a); Nhóm 2 cho `building_amenities` (2b) | — | ADM-02, ADM-03, ADM-06; bộ lọc tòa ở PUB-01 |
| 3 | Phòng | **Nhóm 2** (duyệt + backup + pretend) | T6, Q17; ảnh phòng chờ Nhóm 4/P8 | ADM-04, ADM-05, PUB-02, PUB-03 |
| 4 | Hợp đồng (nháp → kích hoạt) | Nhóm 2 | **P1, P2, P4, P5**, Q5, Q6, Q7, Q15 | ADM-11, ADM-12 (+ route sửa nháp), ADM-13 |
| 5 | Điện nước (giá + chỉ số) | Nhóm 2 (`utility_prices`), **Nhóm 3** (`meter_readings`) | — | ADM-08, ADM-15 |
| 6 | Hóa đơn tháng | Nhóm 3 | Q13; hóa đơn `final` chờ P3–P9, P11, P12 | ADM-16, ADM-17 |
| 7 | Thanh toán | Nhóm 3; minh chứng ảnh cần Nhóm 4 | Q8; P8 cho upload | ADM-18 (màn mới), sau đó RES-05 |
| Sau | Thanh lý, Nhóm 4 (sửa chữa, lịch xem, thông báo, tệp), khu Cư dân/Nhân viên | Nhóm 4 | P3–P12, Q3, Q9, Q14, Q16 | ADM-14, ADM-19..25, RES-*, STF-* |

### 8.3 Chi tiết từng bước

**Bước 0 — Chuẩn bị (không viết nghiệp vụ)**
1. ~~Commit công việc hiện có theo T1~~ — **xong 19/10**.
2. ~~Chạy lại test backend trên DB test~~ — **xong 19/10**: 133/133 PASS, pint PASS, DB dev không đổi.
3. Seeder hệ thống Nhóm 5: `ELECTRICITY`, `WATER` (`billing_type = metered`, `price` NULL) và các khóa `settings` để trống/mặc định — đây là dữ liệu hệ thống AGENTS §3 cho phép, nhưng vẫn cần duyệt danh sách khóa.
4. Lệnh `app:create-admin` (T3).

**Bước 1 — Authentication**
- API dự kiến: `POST /api/v1/auth/register` (tạo `role = user`, 201 — trường bắt buộc **chưa chốt**), `POST /api/v1/auth/login` (email **hoặc** số điện thoại + mật khẩu — T2; throttle; sai thông tin → 422; tài khoản `locked` → 403), `POST /api/v1/auth/logout` (204), `GET /api/v1/auth/me` (200/401). Có thể thêm `PUT /api/v1/auth/password` nếu Q4/Q10 cần.
- Backend: `AuthController` (mỏng), `LoginRequest`, `RegisterRequest`, `AuthService` (đăng nhập bằng session `web`, `session()->regenerate()`), `UserResource` (không có `id_number`, `password`, `remember_token`).
- Frontend: `features/auth/{api.ts, types.ts, schemas.ts}`, `AuthProvider` + hook `useAuth` (Context), guard theo vai trò trong `router.tsx`, interceptor 401 → `/login`. `LoginPage`/`RegisterPage` giữ giao diện, chuyển form sang RHF + Zod, hiện lỗi 422 đúng trường.
- Test: đăng nhập đúng/sai/bị khóa/vượt throttle, `me` khi chưa đăng nhập (401), đăng xuất, đăng ký trùng email/SĐT (422), không lộ trường nhạy cảm.

**Bước 2 — Tòa nhà**
- 2a (chạy được ngay trên dev): `GET/POST /api/v1/buildings`, `GET/PUT /api/v1/buildings/{building}`, đổi `status` thay vì xóa khi đã có phòng; CRUD danh mục `amenities`; `GET` công khai danh sách tòa đang hoạt động cho trang chủ.
- 2b (sau Nhóm 2 trên dev): gắn tiện nghi cấp tòa (`building_amenities`).
- Policy: chỉ `admin` ghi; tên tòa unique → 422.

**Bước 3 — Phòng**
- Điều kiện: chạy Nhóm 2 trên dev (duyệt riêng; backup + `--pretend` + thử khôi phục như Nhóm 1), sau khi giải quyết T6.
- API: CRUD phòng lồng trong tòa (`/api/v1/buildings/{building}/rooms`), đồng bộ tiện nghi phòng, danh sách công khai (`is_public` + `available`), chi tiết công khai.
- Ảnh phòng cần `attachments` (Nhóm 4, P8) → tạm hiển thị ảnh mặc định; form đặt lịch PUB-03 giữ giả lập cho tới khi có `viewing_appointments`.

**Bước 4 — Hợp đồng (chỉ nháp và kích hoạt)**
- Lập/sửa/xóa nháp; kích hoạt trong transaction với thứ tự khóa `rooms → users → contracts → contract_services`; tự thêm `ELECTRICITY`/`WATER` đúng một lần; sinh mã `HD-` khi kích hoạt; xử lý chênh chỉ số (DB-D31, DB-D40); 409 khi phòng hoặc người đại diện đã có hợp đồng active.
- Cần chốt P1, P2, P4, P5 trước (ảnh hưởng cột M09 và validation). **Thanh lý chưa làm.**
- Test tranh chấp: hai lần kích hoạt đồng thời cho cùng phòng.

**Bước 5 — Điện nước**
- Giá: `effective_from` luôn là ngày 01; không ảnh hưởng kỳ đã có chỉ số/hóa đơn (DB-D33).
- Chỉ số: nhập theo kỳ tiêu thụ, all-or-nothing; backend tự xác định hợp đồng theo **khoảng tiêu thụ** (DB-D15), lỗi 422 khi không xác định được; quy tắc R1–R17 (kế hoạch §5).

**Bước 6 — Hóa đơn tháng**
- Lập nháp kỳ T = tiền phòng T + dịch vụ T + điện nước T−1, chia ngày tháng đầu/cuối bằng `Money` (HALF_UP từng dòng); thiếu chỉ số bắt buộc → chặn (DB-D34); phát hành sinh `INV-` và **bất biến**; hủy + lập lại theo DB-D27. Frontend chỉ hiển thị số từ API — bỏ các chỗ `[MOCK-TIỀN]` tương ứng.

**Bước 7 — Thanh toán**
- 7a: Admin ghi nhận/xác nhận/từ chối (lý do bắt buộc), sinh `RCP-` khi xác nhận, cập nhật `paid_amount`, test tranh chấp C3.
- 7b: cư dân gửi minh chứng ảnh — cần Nhóm 4 (`attachments`, P8) và khu Cư dân.
- ADM-18 là màn hình mới → cần duyệt UI trước khi dựng.

### 8.4 Nhiệm vụ lập trình đề xuất làm ngay

**Bước 0 (mục 1–2) rồi Bước 1 — Authentication**, vì: (1) không cần chạy thêm migration nào trên dev; (2) không bị chặn bởi P1–P12; (3) mọi module sau đều cần biết "ai đang đăng nhập, vai trò gì" để viết Policy. T1–T4 và Q2 đã chốt 19/10. Trước khi code còn cần chủ dự án chốt: dữ liệu bắt buộc khi đăng ký, quên mật khẩu (Q4), cơ chế cấp tài khoản nhân viên/Admin (Q11), trường cư dân được tự sửa (Q10).

---

## 9. Cách giải thích mỗi module (áp dụng từ nay)

Khi hoàn thành một module, báo cáo ngoài kết quả test sẽ trả lời đủ 6 câu:

1. Module này dùng để làm gì (ví dụ đời thực)?
2. File code chính nằm ở đâu?
3. Dữ liệu đi từ Frontend → Backend → Database thế nào (sơ đồ bước)?
4. Hàm/class quan trọng hoạt động ra sao?
5. Vì sao chọn cách thiết kế này (và phương án đã loại)?
6. Giảng viên có thể hỏi gì và trả lời thế nào?

### 9.1 Ví dụ mẫu: module "Health check" (module backend duy nhất đang có)

1. **Dùng để làm gì?** Như đèn báo trên bảng điều khiển ô tô: mở `/api/v1/health` là biết API có sống và có kết nối được MySQL không. Dùng khi cài đặt lần đầu hoặc khi nghi hệ thống lỗi.
2. **File chính:** `backend/routes/api.php`, `app/Http/Controllers/Api/V1/HealthController.php`, `app/Services/HealthCheckService.php`, `app/Http/Resources/HealthResource.php`, `app/Enums/HealthStatus.php`; phía React: `frontend/src/features/system/api.ts`, `types.ts`.
3. **Dữ liệu đi thế nào:** xem bảng §1.2.
4. **Class quan trọng:**
   - `HealthController::__invoke()` — Controller một hành động. Laravel tự "tiêm" (inject) `HealthCheckService` qua constructor, nên Controller không tự `new` Service.
   - `HealthCheckService::check()` — gom thông tin; `checkDatabase()` chạy `select 1` trong `try/catch`. Lỗi thì **không nuốt**: gọi `report($e)` để ghi log rồi trả `degraded`.
   - `HealthResource::toArray()` — dùng `$this->when($debug, ...)` để chỉ hiện phiên bản PHP/Laravel khi debug, tránh lộ thông tin môi trường production.
5. **Vì sao thiết kế vậy:** tách Controller/Service/Resource ngay từ module nhỏ nhất để làm khuôn mẫu; trả 503 thay vì 200 khi DB lỗi để công cụ giám sát hiểu được; không trả chi tiết lỗi SQL khi tắt debug (bảo mật).
6. **Câu hỏi có thể gặp:**
   - *"Sao không viết thẳng `DB::select` trong Controller?"* → Controller chỉ điều phối; logic nằm ở Service để test riêng và tái sử dụng; mọi module đều theo một khuôn.
   - *"Khác gì `/up` của Laravel?"* → `/up` chỉ cho biết ứng dụng khởi động được; `/api/v1/health` kiểm tra thêm kết nối CSDL và trả JSON theo chuẩn API của dự án.
   - *"503 nghĩa là gì?"* → Service Unavailable: ứng dụng chạy nhưng phụ thuộc bắt buộc (MySQL) đang không dùng được.

### 9.2 Câu hỏi chung về dự án và gợi ý trả lời

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Vì sao tách React và Laravel thay vì làm giao diện bằng Blade? | Tách rõ trách nhiệm: React lo trải nghiệm, Laravel lo dữ liệu và quy tắc. API dùng lại được cho app di động sau này; hai phần phát triển và test độc lập |
| Vì sao đăng nhập bằng Sanctum cookie mà không dùng token? | Frontend và API chung một origin qua Nginx; cookie `HttpOnly` mà JavaScript không đọc được nên an toàn hơn so với cất token trong `localStorage`; Sanctum có sẵn chống CSRF |
| Vì sao tiền là `BIGINT` (đồng) mà không phải `FLOAT`/`DECIMAL`? | `FLOAT` sai số (0,1 + 0,2 ≠ 0,3). VND không có phần lẻ nên lưu số nguyên đồng là chính xác tuyệt đối; phép nhân/chia dùng BCMath và làm tròn HALF_UP từng dòng |
| Vì sao thời điểm lưu UTC nhưng ngày (`DATE`) theo giờ Việt Nam? | Timestamp là một thời điểm tuyệt đối, lưu UTC để không lệch khi đổi múi giờ máy chủ; còn "ngày bắt đầu hợp đồng" là ngày trên lịch Việt Nam, không có giờ |
| Vì sao trạng thái lưu `VARCHAR` + PHP Enum, không dùng `ENUM` của MySQL? | Thêm giá trị mới không phải `ALTER` bảng; kiểm tra giá trị nằm ở PHP, có tên rõ ràng (`InvoiceStatus::Paid`) |
| Làm sao đảm bảo mỗi phòng chỉ có một hợp đồng đang hiệu lực? | Hai lớp: Service kiểm tra trong transaction có khóa dòng; MySQL có **generated column + UNIQUE** làm lớp chặn cuối (MySQL không có partial index) |
| Hai Admin bấm "phát hành hóa đơn" cùng lúc thì sao? | `DB::transaction` + `lockForUpdate()` theo thứ tự khóa thống nhất (DB-D29); người sau phải chờ, rồi thấy trạng thái đã đổi → 409. Đã có test hai kết nối MySQL thật ở mức CSDL |
| Vì sao frontend không tự tính tiền? | Một nguồn sự thật duy nhất: nếu cả React và Laravel cùng tính, sớm muộn sẽ lệch nhau. Client cũng có thể bị sửa, nên không được tin |
| Vì sao test chạy MySQL thật trên database riêng? | SQLite không hỗ trợ `UNSIGNED`, `lockForUpdate`, generated column giống MySQL. DB và tài khoản riêng để test không bao giờ xóa nhầm dữ liệu dev |
| Mock data là gì, khi nào bỏ? | Dữ liệu giả để xem giao diện khi chưa có API. Mỗi màn hình nối API xong thì bỏ import `@/mocks`; khi không còn màn hình nào dùng thì xóa thư mục `src/mocks/` |
| Phân quyền nằm ở đâu? | Ở Backend (Policy + query scope kiểm tra vai trò **và** quyền sở hữu). Route guard của React chỉ để ẩn/hiện cho tiện; người dùng sửa được code trình duyệt, nên đó không phải lớp bảo mật |
| Vì sao không dùng Repository Pattern? | Eloquent đã là lớp truy cập dữ liệu; thêm Repository chỉ thêm tầng trung gian mà dự án cỡ này không cần (AGENTS §3) |

---

## 10. Lịch sử tài liệu

| Ngày | Thay đổi |
|---|---|
| 19/10/2026 | T1: commit theo nhóm (§2.3), chạy lại test backend (133/133), ghi nhận quyết định T2, T3, T4, Q2 |
| 18/10/2026 | Tạo tài liệu: trạng thái thật sau khi chuyển frontend Antigravity, kiểm chứng DB dev/test bằng SELECT, danh sách route Laravel, quyết định chờ duyệt, kế hoạch Auth → Tòa nhà → Phòng → Hợp đồng → Điện nước → Hóa đơn → Thanh toán |
