# PROJECT STATUS & LEARNING — Mini Apartment Management

> **Hiện trạng 24/10/2026:** Admin dev đã tự reset/login; đọc quản trị/F5 đã kiểm chứng, không CRUD dev. CTR nháp +dịch vụ Q7 snapshot đã code/test, 12 tình huống browser và10ca liveAPI đã kiểm chứng; Backend1038/9348/Pint201file, frontend60/build/lintPASS. Docker PHP8.3.36 đã vá; Laragon host8.3.30 chưa đổi. Dev20bảng/16migration/RUN_MIGRATIONS=false/Nhóm3pending; chỉsessions đổi theo phiên thật, nghiệp vụ/users/schema không đổi. Checkpoint8bab41e/dc027eb/df59765/503d38c local; không push. Chi tiết mới Plan§12.15, bản đồ§11.23; các mốc trước giữ làm lịch sử.

| Thuộc tính | Giá trị |
|---|---|
| Cập nhật | 24/10/2026 — LEASE-B/CTR dịch vụ nháp, AUTH-14/15 và PHP; các mốc trước giữ đúng lịch sử |
| Người đọc | Chủ dự án (sinh viên) và AI agent làm tiếp |
| Mục đích | Nói **thật** dự án đang ở đâu, kế hoạch làm tiếp, và giải thích kiến trúc để chủ dự án tự trình bày được |
| Nhãn bằng chứng | **[KIỂM CHỨNG 18/10]**, **[KIỂM CHỨNG 19/10]** = đã chạy lệnh/kiểm tra trong ngày đó · **[THEO TÀI LIỆU]** = ghi trong `docs/`, chưa chạy lại · **[ĐỀ XUẤT]** = kế hoạch, chưa làm, chưa được duyệt |

Tài liệu này **không** thay các quyết định trong `DB_DECISIONS_20261014.md` và `09_DATABASE_DESIGN.md`. Đề xuất ở §7–§8 chỉ có hiệu lực khi chủ dự án duyệt.

---

## 0. Hiện trạng và cách đọc bằng chứng

| Phần | Hiện trạng mới nhất | Mức xác minh |
|---|---|---|
| Backend | Health/Auth/Artisan/CAT/ROOM/Settings/USR và CRUDnháp/dịch vụ Hợp đồng | Full1038/9348/Pint201 PASS, gồm20caAcceptHTML; Plan§12.15 |
| DB dev | Nhóm1+emailnullable+Nhóm2;20bảng/16migrations,1khách+1Admin; Nhóm3chưachạy | Không DDL nghiệp vụ; Admin tự tạo/reset/login đã xác nhận; snapshot cuối chỉsessions đổi, users và nghiệp vụ khớp; Plan§12.15 |
| Frontend | Auth/CAT/ROOM/USR +ADM11/12/13/dịch vụ nháp thật, Antigravity; phần chưa nối có nhãn | Mới:60test/build/lint;12tìnhhuốngCUA và10ca liveAPI; Plan§12.15 |
| Kiểm thử | Mới:full1038/9348 gồm20caAcceptHTML;60frontend,12tìnhhuốngCUA+10liveAPI trên DBtest | Đã đọc Admin dev/F5; khôngCRUDdev; fullcuối PASS ởPlan§12.15 |
| Git | Có checkpoint cũ tới3a1521a;8bab41e váArtisan,dc027eb váPHP,df59765 váAPI401; CTR503d38c đã checkpoint | Không push; .claude/public-ui-concept/ui-antigravity-full giữ ngoài commit vì chưa xác nhận phạm vi |
| Quyết định | Auth D01/D02/D03 A/A/A; USR đã chốt; Q7 CONFIRMED DB-D59=giá danh mục snapshot | P4–P8/Q15 chưa duyệt; Plan§12.15 |

Không đồng nhất UI mở được, code đã viết, test tự động và tích hợp thật. Số 27/51 là kiểm kê UI mock lịch sử, không phải tiến độ phần trăm chức năng.

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

Đây là mẫu gọi API từ React đang có trong source; component mẫu chưa gắn vào trang. React Auth đã gọi API thật; luồng mới ở §11.11. Mọi module sau cần kiểm chứng đường đi thật tương tự.

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
3. `app/App.tsx` bọc `AuthProvider` (danh tính thật) rồi `AppProvider` (nghiệp vụ giả) quanh `RouterProvider`.
4. `app/router.tsx` khai báo cây route. Layout được chọn theo **tiền tố URL**: `/` → `PublicLayout`, `/admin` → `AdminLayout`. Layout vẽ khung (menu, header) rồi để `<Outlet />` hiển thị trang con.
5. Login/Register/Profile và danh tính trong layout dùng `useAuth()` + `features/auth/api.ts`. Trang nghiệp vụ còn `useApp()` từ mock context, có nhãn minh họa; chuyển từng module sau khi có Spec/API.

Layout chọn theo URL; `RequireAuth` kiểm tra phiên/vai trò lấy từ `/auth/me` trước khi render vùng Admin. Nút đổi vai trò demo đã gỡ khỏi luồng đang chạy. Guard phục vụ trải nghiệm; bảo mật API thật là middleware Laravel và Policy khi triển khai tài nguyên nghiệp vụ.

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

## 2. Bằng chứng baseline lịch sử 18–19/10/2026

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

## 4. Khoảng trống UI/nghiệp vụ (đọc cùng snapshot §0)

### 4.1 Màn hình (24 màn + 1 route con)

- Cư dân: RES-01..RES-10 (10 màn).
- Nhân viên: STF-01..STF-05 (5 màn).
- Admin: ADM-18 Duyệt thanh toán, ADM-19 Công nợ [ĐỀ XUẤT UI], ADM-20/21 Sửa chữa, ADM-22 Lịch xem phòng, ADM-23 Cài đặt, ADM-24 Thông báo, ADM-25 Hồ sơ (8 màn).
- Hệ thống: SYS-01 trang 403.
- Route sửa hợp đồng nháp `/admin/contracts/:contractId/edit` (thuộc ADM-12).

### 4.2 Backend

- Auth API và middleware phiên/khóa/vai trò đã có. Còn thiếu React Auth và Policy quyền sở hữu theo từng tài nguyên nghiệp vụ.
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

## 5. Baseline Database migrations lịch sử 18/10 (hiện tại xem DB plan §16)

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

**Đính chính sau T1:** M09 (`contracts`) đã commit, dù chưa chạy trên dev cũng **không được sửa trực tiếp**. P2/P4/P5/P6 vẫn chờ duyệt; sau duyệt phải tạo migration ALTER mới và kiểm thử nâng cấp/rollback. Việc đưa Nhóm 2 lên dev cần phê duyệt riêng, backup/restore/pretend; Plan và DB plan §14.3/14.6 quản lý phần việc tiếp theo.

---

## 6. Baseline Laravel API lịch sử 18/10 (Auth mới xem §11)

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

Không duy trì bản sao bảng quyết định ở đây: Auth D01–D03 nằm ở [Spec Auth §8](AUTHENTICATION.md); P1–P12 ở [DB plan §14.4](DATABASE_IMPLEMENTATION_PLAN.md); các Q còn mở ở [Design Brief §14.2](FRONTEND_DESIGN_BRIEF.md). Q2/Q4/Q10/Q11 đã chốt nguyên tắc, xem Spec Auth §3. T2/T3/T4 đã chốt; cấu trúc P1–P12 không tự trở thành CONFIRMED vì prototype minh họa.

## 8. Kế hoạch triển khai duy nhất

[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) thay kế hoạch đề xuất cũ trong mục này. Đọc task ID, Spec/AC, phụ thuộc và mức phê duyệt trước khi tiếp tục; không lập lại kế hoạch từ đầu, không tự đi sang module khác.

## 9. Cách giải thích mỗi module (áp dụng từ nay)

Sau mỗi task/module, ghi phần giải thích chi tiết vào tài liệu này theo 6 câu dưới đây. Chat chỉ tóm tắt task xong, file đổi, test, quyết định cần duyệt và task tiếp theo:

1. Module này dùng để làm gì (ví dụ đời thực)?
2. File code chính nằm ở đâu?
3. Dữ liệu đi từ Frontend → Backend → Database thế nào (sơ đồ bước)?
4. Hàm/class quan trọng hoạt động ra sao?
5. Vì sao chọn cách thiết kế này (và phương án đã loại)?
6. Giảng viên có thể hỏi gì và trả lời thế nào?

### 9.1 Ví dụ mẫu: module "Health check" (mẫu nền tảng)

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

## 11. Authentication — bài học và bằng chứng theo lần thực hiện

> Chuyển từ AUTHENTICATION.md khi chuẩn hóa Spec-driven ngày 22/10/2026, không chạy lại test trong lượt tài liệu. Các đoạn “lượt bước 2/3 không chạy migration dev” dưới đây là **lịch sử của lượt đó**; bước 3.5 sau đó đã áp dụng riêng email nullable trên dev. Spec và quyết định hiện hành ở AUTHENTICATION.md; tiến độ chỉ cập nhật ở IMPLEMENTATION_PLAN.md. Kết quả PASS lịch sử không chứng minh luồng Nginx/trình duyệt đã chạy.

### 11.1. Command và đường đi dữ liệu

```text
Terminal → CreateAdminCommand::handle()
         → hỏi thông tin + mật khẩu ẩn và nhập lại
         → Laravel Validator kiểm tra dữ liệu + email/SĐT trùng
         → User (cast password: hashed), gán Enum Admin/Active
         → một INSERT vào MySQL (UNIQUE bảo vệ lần cuối)
         → thông báo thành công hoặc mã thoát thất bại
```

Không đi qua React hay HTTP; người chạy phải có quyền truy cập môi trường vận hành và cấu hình Database. Lệnh này không xác thực người vận hành bằng tài khoản web; giới hạn truy cập terminal/máy chủ là trách nhiệm quản trị hệ thống.

| File / thành phần | Trách nhiệm |
|---|---|
| `backend/app/Console/Commands/CreateAdminCommand.php` | Laravel tự phát hiện command; `handle()` điều phối nhập liệu, validation, tạo mới và thông báo |
| `askHiddenPassword()` | Symfony Question bật hidden, tắt fallback hiển thị, giữ nguyên khoảng trắng của mật khẩu |
| `backend/app/Models/User.php` (không sửa) | Cast `hashed` băm mật khẩu; `role/status` không mass-assignable, command gán tường minh bằng Enum |
| `backend/tests/Feature/Console/CreateAdminCommandTest.php` | Kiểm thử command qua Artisan với câu trả lời mô phỏng; thao tác dữ liệu thật trên MySQL test |

Chỉ ghi dữ liệu khi mọi trường hợp lệ. Role/status được gán trước `save()`, nên chỉ có **một INSERT**, không có khoảng giữa tạo tài khoản rồi nâng quyền. Không dùng `firstOrCreate`, `updateOrCreate`, không UPDATE tài khoản cũ.

### 11.2. Quy tắc kiểm tra trong command

- Họ tên: bắt buộc, tối đa 120 ký tự. Email: bắt buộc, đúng định dạng RFC, tối đa 191 ký tự, duy nhất theo collation hiện có của MySQL. Không tự xác minh quyền sở hữu email.
- SĐT: bắt buộc, 10–15 chữ số, được có dấu `+` đầu chuỗi; vẫn giữ giới hạn cột 20 ký tự và UNIQUE. Chỉ kiểm tra hình thức, không chứng minh sở hữu SĐT. Bước 3 đã chốt DB-D53: số Việt Nam `+84/84` quy về `0`, email về chữ thường; kiểm tra trùng cả dạng SĐT cũ tương đương.
- Họ tên/email/SĐT được bỏ khoảng trắng đầu/cuối; mật khẩu không bị trim.
- Mật khẩu: dùng `Password::defaults()` của Laravel, hiện tối thiểu 8 ký tự; nhập lại phải khớp. Với driver bcrypt hiện tại: tối đa 72 **byte**, kể cả tiếng Việt; từ chối ký tự NUL. Không có mật khẩu mặc định hoặc tham số nhận mật khẩu trong command.
- Trạng thái chỉ được gán `UserStatus::Active`, vai trò chỉ `UserRole::Admin`; không có tùy chọn đổi sang vai trò/trạng thái khác. Tài khoản đang khóa mà trùng email/SĐT vẫn bị từ chối, giữ nguyên tài khoản cũ.
- Nếu terminal không ẩn được mật khẩu: dừng, không chuyển sang nhập hiện. `--no-interaction` bị từ chối. Dữ liệu sai trả mã thoát 1 và cần chạy lại; thành công trả 0.
- UNIQUE vẫn chặn xung đột xuất hiện sau validation. Lỗi CSDL khi lưu chỉ hiện thông báo chung; báo cáo lỗi chỉ chứa SQLSTATE, không gửi SQL/bindings, mật khẩu/hash vào log. Không in email/SĐT trong thông báo thành công.

### 11.3. Cách sử dụng sau khi được phép tạo tài khoản thật

Từ thư mục `backend/`: `php artisan app:create-admin`. Nhập họ tên, SĐT, email, mật khẩu và nhập lại mật khẩu tại terminal. Không gửi mật khẩu vào câu lệnh, tệp hoặc chat.

Lệnh sử dụng kết nối Database hiện được cấu hình. **Lượt triển khai bước 2 chưa tạo Admin thật, chưa chạy migration trên dev.** Không khởi động app chỉ để thử vì cấu hình Docker có thể tự chạy migration. Trước khi vận hành thật cần được phép riêng và kiểm tra cấu trúc/Database đích; command không tự chạy migrations.

Email bắt buộc không có nghĩa email đã xác minh hoặc khôi phục mật khẩu đã hoạt động. Việc gửi thư/xác minh/phục hồi sẽ triển khai ở bước khác.

### 11.4. Kiểm thử và giải thích để bảo vệ đồ án

Kiểm tra `phpunit.xml`, `tests/TestCase.php`, kết nối `mysql_test` và tài khoản riêng `mini_apartment_test` trước test có thao tác DB. Không sửa/bỏ guard DB-D30. Test command không tạo dữ liệu trên dev; dữ liệu trong test được rollback bởi `RefreshDatabase` trên DB test được bảo vệ.

Nhóm test bao gồm: tạo Admin hợp lệ, thêm Admin thứ hai, email/SĐT trùng (không nâng quyền/mở khóa tài khoản cũ), dữ liệu sai/biên độ dài, hash mật khẩu, không lộ mật khẩu trên output, không tự xác minh email; xung đột UNIQUE sau validation; lỗi CSDL được báo cáo không chứa SQL/hash; từ chối chạy không tương tác; cấu hình cả hai câu hỏi mật khẩu ẩn và dừng khi terminal không hỗ trợ.

- **Artisan là gì?** Công cụ dòng lệnh của Laravel, phục vụ tác vụ vận hành ngoài trình duyệt.
- **Vì sao hash?** Database chỉ lưu giá trị băm một chiều; không lưu mật khẩu gốc. Sau này dùng `Hash::check()` để so khớp, không giải mã mật khẩu. Hash không thay thế việc bảo vệ Database hay mật khẩu mạnh.
- **Vì sao không tự đăng ký Admin?** Nếu người dùng tự chọn quyền Admin, họ có thể chiếm quyền quản lý. Quyền vận hành command phải được kiểm soát ở hệ thống.
- **Vì sao validation và UNIQUE cùng tồn tại?** Validation cho lỗi dễ hiểu; UNIQUE chặn trường hợp dữ liệu bị chiếm sau lúc kiểm tra.
- **Vì sao không sửa Fillable để thêm role?** Tránh những luồng tạo/sửa người dùng khác vô tình nhận quyền từ dữ liệu bên ngoài. Command gán Enum tường minh.
- **Vì sao không thêm transaction?** Tác vụ hiện chỉ có một INSERT chứa đầy đủ trường và quyền; nếu câu SQL thất bại thì không có tài khoản dở dang. Khi mở rộng thành nhiều lần ghi phải đánh giá transaction lại.

### 11.5. Kết quả chạy thực tế — bước 2, 22/10/2026

| Kiểm tra | Kết quả |
|---|---|
| `php artisan test --filter=TestDatabaseGuardTest` | 7 test / 7 assertion PASS trước test có thao tác DB |
| `php artisan test --filter=TestEnvironmentTest` | 6 test / 14 assertion PASS; đúng DB/tài khoản test và chặn quyền đọc DB dev |
| `php artisan test --filter=CreateAdminCommandTest` | **28 test / 269 assertion PASS** |
| `php artisan test` toàn bộ | **165 test / 755 assertion PASS** |
| `php vendor/bin/pint --test` | PASS |
| `npm run build`, `npm run lint` trong frontend | PASS; bundle >500 kB và 9 cảnh báo lint có sẵn, không sửa frontend |
| `php artisan help app:create-admin` | Laravel nhận đúng command; không có tham số mật khẩu/role/status |
| `git diff --check` | PASS |

Kiểm thử chạy trên MySQL `mini_apartment_test` với guard DB-D30 giữ nguyên. Không chạy migration hoặc tạo Admin thật trên DB dev; không commit/push. Chỉ khởi động MySQL cho test và đưa về trạng thái dừng ban đầu sau kiểm tra. Không khởi động container app.

**Mức xác minh:** đã chạy command qua Laravel trong kiểm thử tự động với câu trả lời tương tác mô phỏng và MySQL test thật; kiểm tra trực tiếp thuộc tính hidden/fallback/trim của câu hỏi mật khẩu. Chưa thử nhập tay trên terminal thật. Chưa kiểm tra đăng nhập hoặc gửi email vì các chức năng này chưa triển khai. Kết quả 137 test / 486 assertion của bước 1 vẫn là baseline lịch sử.

### 11.6. Bước 3 — Backend Auth và giải thích để học

Endpoint chính thức, trường gửi/nhận, chuẩn hóa và mã lỗi nằm ở `API_AUTHENTICATION.md`. Không có migration mới, không sửa Model/Enum, không nối React. Code đăng ký hiện tự đăng nhập, **chờ AUTH-D01**, không coi brief là phê duyệt; không bắt buộc xác minh email để đăng nhập.

| File thêm trong bước 3 | Vai trò |
|---|---|
| `backend/app/Http/Controllers/Api/V1/AuthController.php` | Nhận FormRequest, gọi Service, đổi/hủy phiên và trả Resource |
| `backend/app/Http/Requests/Auth/RegisterRequest.php` | Chuẩn hóa input; kiểm tra đăng ký, email tùy chọn, từ chối role/status |
| `backend/app/Http/Requests/Auth/LoginRequest.php` | Chuẩn hóa định danh, kiểm tra kiểu/giới hạn input đăng nhập |
| `backend/app/Services/AuthService.php` | Tạo đúng user/active; tìm tài khoản, dùng guard kiểm tra mật khẩu + khóa; không đoán khi SĐT cũ mơ hồ |
| `backend/app/Http/Resources/UserResource.php` | Danh sách cho phép gồm 6 trường; không serialize Model thô |
| `backend/app/Http/Middleware/EnsureSpaSession.php` | Yêu cầu phiên SPA đã được Sanctum khởi tạo |
| `backend/app/Http/Middleware/EnsureActiveAccount.php` | Chặn tài khoản khóa, hủy phiên phát hiện bị khóa |
| `backend/app/Http/Middleware/EnsureUserHasRole.php` | Kiểm tra vai trò Enum từ user của server, có thể tái sử dụng nhiều vai trò |
| `backend/app/Support/AuthIdentity.php` | Chuẩn hóa email/SĐT, liệt kê dạng SĐT cũ tương đương, không sửa DB |
| `backend/app/Support/PasswordRules.php` | Tái sử dụng kiểm tra mật khẩu cho API và Artisan; ngăn cắt ngầm bcrypt |
| `backend/app/Rules/UniquePhone.php` | Chặn SĐT trùng kể cả các dạng Việt Nam tương đương đã lưu trước đây |
| `backend/tests/Feature/Auth/AuthenticationTest.php` | Test HTTP kernel, CSRF, cookie mã hóa, session MySQL, khóa/vai trò và rate limit |
| `backend/tests/Support/InteractsWithSpaCookies.php` | Client test gửi/nhận cookie thật; bỏ qua cơ chế giữ guard/session trong RAM giữa request mô phỏng |

File chỉnh liên quan: `routes/api.php` (4 route Auth), `bootstrap/app.php` (alias middleware, JSON lỗi), `AppServiceProvider.php` (limiter, chỉ dùng cookie), `CreateAdminCommand.php` và test command (dùng chung chuẩn hóa/rules); tài liệu Auth/quyết định/README/trạng thái dự án. Các thay đổi chưa commit bước 1–2 được giữ lại, không sửa migration cũ.

**Đường đi đăng nhập:** client lấy cookie CSRF → POST `identifier/password` → `LoginRequest` chuẩn hóa/validate → `AuthService::login()` tra MySQL → guard `web->attemptWhen()` kiểm tra hash và `isActive()` → guard lưu ID user vào session → Controller `regenerate()` đổi session ID và CSRF token → cookie phiên trả về client → GET `me` dùng cookie tìm session, rồi đọc user từ DB → middleware kiểm tra active → Resource trả dữ liệu được phép.

**Session và cookie khác nhau:** session là dữ liệu phiên ở server (hiện lưu bảng `sessions`); cookie phiên là mã phiên được mã hóa nằm trong trình duyệt. Client không gửi vai trò để chứng minh quyền. Cookie phiên HttpOnly; cookie CSRF có thể được Axios đọc để gửi header bảo vệ POST. Sanctum phối hợp middleware cookie/session/CSRF và guard Laravel, không cần phát hành token để lưu localStorage.

**Nhiệm vụ các lớp:** Controller điều phối HTTP; FormRequest kiểm tra input; Service xử lý quy tắc xác thực; Model truy cập dữ liệu và cast hash/Enum; Middleware kiểm tra điều kiện trước khi chạy endpoint; Resource giới hạn thông tin đầu ra. Kiểm tra vai trò mới chỉ là quyền theo nhóm; khi có tài nguyên nghiệp vụ vẫn phải thêm Policy kiểm tra quyền sở hữu.

**5 câu hỏi giảng viên có thể hỏi:**

1. *Vì sao phải `regenerate()`?* Đổi mã phiên sau đăng nhập, tránh kẻ khác dùng mã phiên đã biết trước; mã cũ không giữ xác thực.
2. *Vì sao guard React không đủ?* Người dùng sửa được trình duyệt hoặc tự gọi API. Middleware Laravel kiểm tra user/role/status lấy từ DB.
3. *Có cần giải mã mật khẩu khi đăng nhập?* Không; guard kiểm tra mật khẩu nhập với hash bằng hasher Laravel. `User` có cast `hashed` khi ghi.
4. *Admin khóa tài khoản đang đăng nhập thì sao?* Request bảo vệ tiếp theo đọc trạng thái mới, `EnsureActiveAccount` hủy phiên và trả 403; mở khóa không làm phiên đó tự sống lại.
5. *Làm sao chứng minh cookie thật đang hoạt động trong test?* Không dùng `actingAs`/`withSession`; test gửi encrypted cookie qua request, quên guard/cache phiên trong RAM, kiểm tra `sessions.user_id`, cookie cũ sau logout, cookie bị sửa và CSRF thiếu/sai trên MySQL test. Đây là kiểm thử HTTP kernel, chưa phải thao tác qua Nginx/trình duyệt thật.

### 11.7. Trạng thái kiểm chứng bước 3 — 22/10/2026

| Kiểm tra | Bằng chứng hiện có |
|---|---|
| Guard DB-D30 trước test có thao tác DB | 7 test / 7 assertion PASS |
| Môi trường DB test | 6 test / 14 assertion PASS; DB/tài khoản riêng và quyền hạn đúng |
| Test liên quan sau khi khởi động lại Docker (`AuthenticationTest`, `CreateAdminCommandTest`) | **90 test / 781 assertion PASS**, gồm mọi bổ sung cuối |
| `php artisan test` toàn bộ sau khi khởi động lại Docker | **227 test / 1267 assertion PASS** |
| `php vendor/bin/pint --test`, `git diff --check` | PASS sau chỉnh sửa cuối |
| Frontend `npm run build` / `npm run lint` | PASS; bundle >500 kB và 9 cảnh báo lint có sẵn; không sửa frontend |
| `php artisan route:list --path=api -v` | Đúng 4 endpoint Auth + health, middleware đúng; không có route testing/admin trong sản phẩm |

**Sự cố môi trường đã khắc phục:** chủ dự án khởi động lại Docker Desktop; đã xác nhận MySQL healthy ở cổng 3307, chạy lại guard + môi trường test rồi nhóm Auth/Artisan và toàn bộ backend. Đã kiểm thử các ca cookie giả, đổi quyền, giới hạn IP và limiter dùng REMOTE_ADDR chống giả forwarded IP. Lần kiểm thử bị ngắt trước đó không được tính là PASS. Backend bước 3 đã hoàn tất trong phạm vi kiểm thử HTTP kernel và MySQL test. Giữ MySQL đang chạy như trạng thái lúc chủ dự án tiếp tục công việc; app/frontend/nginx vẫn dừng.

Không chạy migration, tạo tài khoản hoặc sửa dữ liệu trên DB dev. Không commit/push. Còn chưa kiểm chứng qua Nginx/trình duyệt, chưa nối React và không triển khai các chức năng đã loại khỏi bước 3.

### 11.8. Bước 3.5 — nâng cấp email nullable trên dev

- Phê duyệt trực tiếp chỉ migration `2026_10_22_100001_make_users_email_nullable.php`; không Nhóm 2–3, không tạo Admin.
- Backup ngoài repo: `D:\MaNguonMo\mini-apartment-backups\email-nullable-20261022T112541Z\mini_apartment.sql`. Không chép SQL/session hoặc thông tin cá nhân vào Git.
- Lần restore đầu khác collation do tạo sẵn DB tạm bằng mặc định image; đã dừng trước migration. Lần tiếp theo dùng container không mạng, volume riêng, server `utf8mb4/utf8mb4_unicode_ci`, để dump tự tạo DB. Metadata DB/bảng/cột/index, số bản ghi, dữ liệu và lịch sử migrations khớp; 13 bảng CHECK TABLE OK; không routine/event/trigger. Dump chỉ khác cách ghi CHARACTER SET dư thừa, không khác dữ liệu.
- Sau `--pretend` chỉ có ALTER email, chạy `php artisan migrate --database=mysql --path=database/migrations/2026_10_22_100001_make_users_email_nullable.php --no-interaction --no-ansi` trong backend.
- Trước→sau: 13→13 bảng; 8→9 migrations, dòng mới batch 3; users 0→0, sessions 11→11; checksum dữ liệu ngoài migrations không đổi. Email varchar191 NO→YES nullable; UNIQUE email/phone và phone NOT NULL không đổi; Nhóm 2–3 vẫn Pending 11 migration. SHOW CREATE đổi thứ tự hiển thị UNIQUE nhưng định nghĩa/index metadata không đổi.
- Biên bản ngoài repo: `migration-final-report.txt`, `restore-verification-v2.txt`, `post-migration-checks.json`, `before-resume.json`, `after.json` cùng thư mục backup; đã đọc lại trong lượt tài liệu, không chạy DB lại.
- **Charset** là bộ ký tự (utf8mb4 lưu tiếng Việt/emoji); **collation** là quy tắc so sánh/sắp xếp (unicode_ci không phân biệt hoa/thường). **Migration** mô tả thay đổi cấu trúc có lịch sử; **backup** lưu cấu trúc và dữ liệu tại một thời điểm để phục hồi. `migrate` thường xét mọi file pending; `--path` giới hạn một file; bảng `migrations` ghi tên/batch đã chạy.
- Giảng viên có thể hỏi: làm sao tránh chạy Nhóm 2–3? Vì sao restore phải cô lập? Vì sao UNIQUE cho nhiều NULL? Vì sao không sửa migration cũ? Nếu bắt buộc email trở lại? Trả lời bằng bằng chứng `--path/pretend`, metadata/checksum và lịch sử migrations; rollback bị chặn khi còn NULL, cần email thật và phê duyệt, không điền giả/xóa tài khoản.

### 11.9. Mẫu ghi bài học cho Tasks tiếp theo

Ghi task ID; chức năng; file và hàm/class chính; luồng React → Laravel → MySQL; lý do chọn; lệnh/môi trường/ca kiểm thử và kết quả thực tế; điều chưa kiểm chứng; 3–5 câu hỏi giảng viên kèm hướng trả lời. Không chép mật khẩu, cookie/session hay dữ liệu cá nhân vào ví dụ. Spec quản lý yêu cầu; bài học này giải thích code đã viết và giới hạn bằng chứng.

### 11.10. Lượt chuẩn hóa Spec → Plan → Tasks (22/10/2026)

Chỉ sửa tài liệu/AGENTS. Đọc source và biên bản bước 3.5; không chạy Database, migrations, build, test ứng dụng hoặc trình duyệt. Kiểm tra tài liệu: 11 file Markdown UTF-8, 45 liên kết file nội bộ tồn tại, code fences cân bằng, AUTH-00..12/AC-01..16/AUTH-D01..03 được định nghĩa; `git diff --check` PASS. Rà soát phát hiện và sửa mã màn hình Staff trong Plan và nhãn điều hướng prototype/Q10. Con số 227/1267 ở §11.7 là test lịch sử, không phải kết quả lượt này.

Spec trả lời “hệ thống cần làm gì”; API Spec trả lời “React và Laravel giao tiếp thế nào”; Plan/Tasks trả lời “làm phần nào tiếp, phụ thuộc gì, bằng chứng nào”; tài liệu học tập giải thích “code đã viết hoạt động ra sao”. Không lấy dấu hoàn thành task tài liệu làm phê duyệt ba quyết định Auth còn mở hoặc coi toàn bộ module đã tích hợp.

### 11.11. AUTH-05..12 — React Authentication thật (22/10/2026)

Mốc trước AUTH-13: các giới hạn dev 8080 của lượt này được kiểm chứng tiếp ở §11.12; số test dưới đây là lịch sử đối với lượt AUTH-13.

**Phạm vi được duyệt:** D01 tự đăng nhập user/active sau đăng ký; D02 Admin tới `/admin`, bốn vai trò còn lại tới `/account/profile`, Resident/Staff có thông báo khu chưa hoàn thiện; D03 profile chỉ đọc. Không thêm màn hình, thư viện, API hoặc migration, không tạo Admin dev, không commit/push. Backend Auth giữ nguyên hợp đồng; mọi thay đổi Backend cũ chưa commit được bảo toàn.

**File mới và chức năng:**

| File | Nhiệm vụ/hàm cần hiểu |
|---|---|
| `frontend/src/features/auth/types.ts` | `AuthUser` đúng 6 trường Resource, 5 vai trò; `accountDestination()` chọn vùng đã có, `safeDestination()` chỉ cho URL nội bộ phù hợp vai trò, tránh open redirect (bị đưa tới website lạ) |
| `frontend/src/features/auth/api.ts` | `getCurrentUser/login/register/logout`; chỉ dùng `lib/http`, trước POST lấy CSRF cookie; payload đăng ký có danh sách trường cho phép, email trống thành NULL |
| `frontend/src/features/auth/authContext.ts`, `useAuth.ts` | Hợp đồng state/hàm và hook (hàm dùng lại trạng thái React); không chứa dữ liệu tài khoản giả |
| `frontend/src/features/auth/AuthProvider.tsx` | `refresh()` đọc me khi mở app/focus; `authenticate()` dùng chung login/register; `logout()` chờ server. Không lưu token, mật khẩu hoặc role trong localStorage |
| `frontend/src/features/auth/RequireAuth.tsx` | Chờ bootstrap (đọc phiên lúc khởi động); 401 đưa tới login, sai vai trò hiện thông báo403; lỗi mạng có thử lại, không giả là đã logout |
| `frontend/src/features/auth/AccountActions.tsx` | Danh tính thật, liên kết tài khoản/khu vực, logout có pending/lỗi; chỉ về public khi server đã hủy phiên hoặc xác nhận401 |
| `frontend/src/features/auth/errors.ts` | `authErrorMessage()` thông báo an toàn theo status; `applyAuthErrors()` đưa422 vào trường RHF được cho phép |
| `frontend/tests/auth.test.mjs` | 8 test bằng Node có sẵn, không thêm package; schema/giới hạn byte/điều hướng/lỗi |
| `frontend/tests/auth.browser.mjs` | Kiểm thử Chrome qua CDP (giao thức điều khiển trình duyệt); 17 ca trên môi trường test cô lập, không in mật khẩu/cookie |
| `backend/tests/Support/AuthBrowserFixtures.php` | Helper CLI chỉ dành test: bootstrap Laravel, guard DB-D30 + SELECT danh tính đúng DB/account test rồi mới setup/status/cleanup theo mã lượt. Không phải API/công cụ tạo Admin thật |

**File sửa trong Bước 4:** `frontend/package.json` thêm script test; `features/auth/schemas.ts` định danh/email tùy chọn/confirmation/giới hạn bcrypt; `app/App.tsx` provider thật ngoài mock; `app/router.tsx` guard; `pages/public/LoginPage.tsx` và `RegisterPage.tsx` RHF+Zod/API thật; `GuestProfilePage.tsx` chỉ đọc me; `GuestAppointmentsPage.tsx` placeholder chưa triển khai; `PublicNavbar.tsx`, `PublicLayout.tsx`, `AdminLayout.tsx` danh tính/logout thật và nhãn mock; `src/mocks/README.md` ranh giới dữ liệu. Tài liệu đồng bộ: README gốc, AGENTS, AUTHENTICATION, API_AUTHENTICATION, IMPLEMENTATION_PLAN, FRONTEND_DESIGN_BRIEF, SCREEN_INVENTORY, README và bài học này. Không sửa Backend API/schema trong bước này; các thay đổi Auth 1–3.5 trước đó vẫn chưa commit.

**Luồng đăng nhập bằng chính code:**

```text
LoginPage.handleSubmit → Zod kiểm tra sơ bộ
  → useAuth().login → AuthProvider.authenticate → auth/api.login
  → lib/http.fetchCsrfCookie → GET /sanctum/csrf-cookie
  → Axios POST /api/v1/auth/login { identifier, password } + cookie/XSRF header
  → Nginx → Laravel route → LoginRequest (chuẩn hóa/kiểm tra)
  → AuthService.login → User/Eloquent → MySQL users
  → guard web kiểm tra hash và active → lưu user ID trong session MySQL
  → AuthController tái tạo session ID/CSRF → UserResource trả đúng 6 trường
  → AuthProvider lưu user trong state React → safeDestination → render vùng phù hợp
F5 → provider gọi /me với cookie → Laravel đọc session/user và active → khôi phục UI
```

Controller điều phối HTTP, Service xử lý quy tắc, Model đọc/ghi MySQL, Middleware kiểm tra trước endpoint, Resource giới hạn trường trả về. React chỉ hiển thị; sửa role trong DevTools không làm Laravel cấp quyền. API nghiệp vụ tương lai vẫn cần Policy (quy tắc quyền theo tài nguyên/người sở hữu), không chỉ guard React.

**Session/cookie/Sanctum:** session là dữ liệu phiên tại server (bảng sessions), cookie HttpOnly là mã phiên mã hóa trong trình duyệt; không chứa quyền do client tự khai. Cookie XSRF đọc được để Axios gửi header bảo vệ POST. Sanctum phối hợp cookie/session/CSRF với guard web, không phát hành Bearer token. Mật khẩu chỉ gửi qua request tới server để so với hash, không ghi log hoặc lưu client. Khi triển khai HTTPS phải giữ cấu hình cookie Secure thích hợp; lượt test dùng localhost HTTP.

**Vì sao provider có revision/sequence?** Request bất đồng bộ có thể về sai thứ tự. `/me` cũ trả401 sau login thành công không được xóa phiên mới: revision (số thế hệ thao tác Auth) và refreshSequence loại kết quả cũ; pendingMutation ngăn focus-refresh chen vào login/logout. Refresh nền giữ trang/form đang mở, không đặt loading làm mất dữ liệu đang nhập. Lỗi mạng không chứng minh phiên đã mất; giữ user đã biết, báo lỗi và để Backend kiểm tra request thật. Khóa tài khoản được phát hiện ở request bảo vệ tiếp theo; focus chỉ giúp UI cập nhật sớm, không phải khóa bảo mật duy nhất.

**Các lỗi đã tái hiện và sửa:** logout từng bị guard chuyển về login trước khi navigate về public; sau khi server xác nhận hủy phiên dùng `window.location.replace('/')` để kết thúc state cũ và về đúng trang chủ. Refresh nền từng có nguy cơ unmount form; đã giữ Outlet ổn định và thử nội dung tìm kiếm không mất. Navbar mobile đổi sang liên kết tài khoản gọn, đầy đủ thao tác trong menu; kiểm tra 320/375/390 px không tràn ngang. Zod mặc định từ chối email hợp lệ có `#`, trong khi Laravel RFC chấp nhận; đổi sang pattern RFC5322 có sẵn và thử đăng ký thật email này. Backend vẫn kiểm tra cuối cùng.

**Môi trường và kết quả thực chạy:**

- Guard DB-D30 7 test / 7 assertion và môi trường test 6/14 đạt trước khi test DB; Backend toàn bộ **227 test / 1267 assertion PASS**; `php vendor/bin/pint --test` PASS, helper CLI cũng được Pint kiểm tra.
- `cd frontend; npm test`: **8/8 PASS**. `npm run build` PASS (TypeScript + Vite); `npm run lint` 0 lỗi, 9 cảnh báo cũ. Bundle khoảng 801 kB còn cảnh báo >500kB; chưa tối ưu module nghiệp vụ mock ngoài phạm vi.
- Browser dùng Chrome headless thật, profile riêng; Nginx `127.0.0.1:8081` → app PHP-FPM riêng → MySQL 8.4. Frontend là bản build qua Vite preview 5175; không coi đây là kiểm thử Vite HMR hoặc bộ container dev 8080. Cấu hình Nginx giữ tuyến dự án, chỉ thay upstream test.
- App test bỏ qua entrypoint; `RUN_MIGRATIONS=false`, `APP_ENV=local` để không bỏ qua CSRF do chế độ PHPUnit. `mysql`/`mysql_test`, database session và cache đều trỏ DB/account `mini_apartment_test` đã xác minh. Không có migration trong lượt browser. Không dùng tài khoản MySQL dev/root cho fixtures.
- Helper setup/status/registration-cleanup/cleanup đã chạy trên DB test. Cleanup chỉ xóa user mang mã lượt + phone đã lưu và sessions tương ứng; không xóa/reset bảng hoặc DB. Artifact/fixture/password/cookie profile nằm trong `backups/auth-step4-e2e/` đã gitignore, không đưa vào Git. Không in secrets trong báo cáo.
- Snapshot dev đọc trực tiếp trước/sau, metadata/index/constraints/migration/row counts/SHA256 dữ liệu khớp:13 bảng, 9 migrations, users 0, sessions 11; Nhóm 2–3 vẫn 11 migration Pending. Không chạy migrations dev hoặc tạo tài khoản dev. Dừng app/Nginx/browser/Vite test riêng sau xác minh; MySQL giữ trạng thái đang chạy như trước.

Ma trận browser — **17/17 PASS** (B08b là ca bổ sung):

| Ca | Bằng chứng | AC |
|---|---|---|
| B01 | Anonymous vào /admin tới login, không quick-entry/credential điền sẵn | 13/14 |
| B02 | Input login thiếu bị chặn trước request | 12 |
| B03 | Sai email/confirmation, đăng ký không email 201, auto-login, profile thật chỉ đọc, cookie phiên HttpOnly | 01/06/11/12/15 |
| B04 | F5 khôi phục từ cookie, user vào /admin bị chặn | 08/09/13 |
| B05 | Profile mobile 320/375/390px không overflow | 14 |
| B06 | Logout 204, /me 401, URL tài khoản về login | 08/13/14 |
| B07 | Đăng nhập email và SĐT đều tới đúng tài khoản | 04/12 |
| B08 | Server 422 email/SĐT trùng hiện đúng trường | 02/12 |
| B08b | Email RFC chứa # và chữ hoa đăng ký thật, hiển thị chuẩn hóa chữ thường, auto-login | 04/11/12 |
| B09 | Cả 5 vai trò tới vùng đã có, Resident/Staff chỉ profile thật; Admin có nhãn nghiệp vụ mock, không đổi role | 14/15 |
| B10 | Khóa sau login làm /me 403, login locked 403 thông báo thật | 05/12/16 |
| B11 | HTTP request nguồn lạ nhận 419 thật từ Laravel | 06/16 |
| B12 | Thử sai liên tục nhận 429 thật và thông báo chờ | 07/12 |
| B13 | Giữ response login rồi focus: không chen /me cũ, login thành công và có XSRF header | 06/13 |
| B14 | Focus-refresh không làm mất nội dung form đang nhập | 13 |
| B15 | Mất mạng khi logout giữ tài khoản và báo lỗi; khôi phục mạng logout thật | 08/12/14 |
| B16 | Giao diện nhận 419 thật, không giả login thành công | 06/12/16 |

**Ca419 cần giải thích đúng:** Laravel 13 `PreventRequestForgery` chấp nhận nguồn `Sec-Fetch-Site: same-origin` hoặc token hợp lệ. Do đó bỏ header token của request same-origin không chứng minh lỗi bảo mật. Chrome tự tái tạo header nguồn khi tiếp tục request CDP; B16 giữ POST, relay qua Node với header nguồn/token bị làm hỏng, lấy **phản hồi 419 thật** qua Nginx/Laravel rồi trả nguyên body về browser. Không giả body/status thành công và không sửa/tắt middleware. CDP cần status phrase rõ ràng cho 419; đã sửa test harness, không sửa ứng dụng để ép test đạt. B11 độc lập kiểm tra chặn nguồn lạ thật; PHPUnit kiểm tra CSRF/session sâu hơn.

**Cách chạy lại:** chạy guard và suite Backend trên DB test trước; dựng app/Nginx test riêng với cấu hình trên, xác minh `SELECT DATABASE(), CURRENT_USER()` ở cả hai kết nối và `RUN_MIGRATIONS=false`; tạo fixtures qua helper CLI `setup <file mới>`, chép file vào thư mục artifact gitignore; mở Chrome với profile test riêng/remote debugging ngẫu nhiên và Vite preview của build mới. Sau đó từ root đặt `AUTH_E2E_CONFIRMED_TEST_DB=mini_apartment_test`, chạy `node frontend/tests/auth.browser.mjs`. Không dùng flag xác nhận này thay bước kiểm tra kết nối. `AUTH_E2E_CASE` tùy chọn chỉ chạy một ca chẩn đoán, không được tính như đủ 17 ca. Sau cùng cleanup đúng file fixtures, so sánh snapshot dev và dừng tiến trình test riêng. Không chạy harness vào môi trường dev hay profile Chrome cá nhân.

**Giới hạn:** chưa thử nhập tay Artisan Admin, chưa chạy bộ dev 8080, chưa API sửa hồ sơ/đổi mật khẩu/khôi phục/xác minh email/cấp nhân viên. Layout Resident/Staff còn mock nhưng chưa gắn route; dữ liệu Admin/public nghiệp vụ chưa tích hợp có nhãn minh họa. Có Auth không đồng nghĩa phòng/hợp đồng/hóa đơn đã có Backend. AUTH-12 kết thúc ở đây, chưa bắt đầu CAT hoặc task mới.

**5 câu hỏi bảo vệ và hướng trả lời:**

1. *F5 có làm mất đăng nhập không, dữ liệu nào được giữ?* React state mất; cookie vẫn gửi, AuthProvider.refresh gọi me; Laravel tìm session và user trong MySQL rồi trả Resource.
2. *Nếu sửa role trong DevTools thành admin?* Chỉ thay UI cục bộ. Backend không tin role request; auth:sanctum + active + role/Policy đọc user từ DB quyết định quyền.
3. *Vì sao có cả Zod và FormRequest/UNIQUE?* Zod báo lỗi sớm; client có thể bị bỏ qua. FormRequest là kiểm tra cuối của ứng dụng, UNIQUE chống tranh chấp hai request đồng thời. Email trống ở form được API client chuyển NULL.
4. *Tại sao logout phải gọi server, và khi mất mạng thì sao?* Chỉ đổi trang không hủy session. API logout invalidate phiên/đổi CSRF; khi mất mạng giữ trạng thái và báo chưa thực hiện được, không tuyên bố thành công.
5. *Tại sao không kiểm tra xác minh email để đăng nhập, hoặc đưa Resident vào dashboard?* Spec chưa duyệt bắt buộc verified; D02 chỉ duyệt profile tối thiểu khi khu nghiệp vụ chưa có. Không lấy ý tưởng/UI mock làm quyết định; mở rộng cần Spec/Task mới.

### 11.12. AUTH-13 — xác minh Docker dev 8080 và đề xuất CAT-01

**Phân biệt môi trường:** Bước 4 trước dùng Nginx/app riêng 8081, Vite preview và DB test. Lượt này dùng đúng Docker Compose app/frontend/nginx/mysql của dự án, Nginx8080 và Vite dev trong container, Database mini_apartment/account mini_apartment@%. Không đổi sang DB test để rồi gọi là dev. Chrome dùng profile mới riêng, không đụng phiên cá nhân.

**Quy trình và bằng chứng mới:** kiểm tra Git/AGENTS/CLAUDE/Plan/Spec/entrypoint; đọc docker compose config nội bộ (không in secrets), xác nhận RUN_MIGRATIONS=false trước `docker compose up -d --no-build app frontend nginx`; sau đó đọc lại getenv trong app và SELECT danh tính DB. Compose tái tạo container, giữ volume MySQL; metadata/data được chụp trước/sau để đối chiếu, không dùng down -v/reset. Session database/HttpOnly/SameSite=lax, Sanctum có localhost:8080; Secure không bật vì HTTP localhost. Frontend startup npm install có sẵn không làm đổi package-lock, không thêm package.

7/7 ca thực chạy qua browser PASS: anonymous /admin→login và me 401; đăng ký 201 tự đăng nhập user/active; F5 đọc lại cùng tài khoản qua cookie/me; khách vào /admin bị guard từ chối; logout 204 và me 401/route tài khoản bị chặn; login bằng email; login bằng SĐT. Profile chỉ đọc và Resource đúng 6 trường được kiểm tra, không runtime exception. Chi tiết ca DEV01..DEV07 tại Plan §10. Không phát hiện lỗi Auth cần sửa, không chỉnh code sản phẩm. Bộ dev được giữ đang chạy; chỉ đóng Chrome test riêng.

**Tác động dữ liệu có chủ đích:** theo yêu cầu thử đăng ký thật, tạo đúng 1 tài khoản khách qua UI và giữ lại, không factory/seeder/Admin. users 0→1, sessions 11→13, cache limiter đổi; user/active, email_verified_at NULL, admin_count 0. Không tuyên bố DB hoàn toàn không đổi. Schema/index/constraints/FK/migrations giữ nguyên;13 bảng/9 migration,11pending Nhóm 2–3. Hash bảng ngoài users/sessions/cache không đổi. Không xóa dữ liệu dev; không chạy migration. Số tự tăng users tăng do INSERT không phải đổi cấu trúc. Thông tin đăng nhập tự sinh, snapshot và báo cáo ở backups/auth-dev-8080 đã gitignore; không ghi mật khẩu/cookie vào tài liệu/Git.

**Git chưa commit được phân nhóm:** email nullable migration + schema tests; Artisan CreateAdminCommand + tests; 4API Auth (Controller/Requests/Resource/Service), middleware/Rules/AuthIdentity/PasswordRules và test; bootstrap/routes/AppServiceProvider; frontend feature auth, forms/profile, router/provider/layouts/package test script; tài liệu Spec/API/Plan/quyết định/học tập. Danh sách cụ thể Bước 4 xem §11.11; thay đổi Backend1–3.5 vẫn giữ nguyên. Các thư mục prototype và .claude chưa theo dõi không thuộc thay đổi Auth lượt này, không xóa hoặc đưa vào commit. Lượt AUTH-13 chỉ sửa tài liệu; script browser/snapshot riêng nằm trong backups gitignore. Không commit/push.

**Giới hạn của bằng chứng:** chặn /admin là guard React; không có API quản trị tài nguyên sản phẩm để kiểm tra403 theo vai trò, không tạo endpoint thử trên dev. API me 401 sau logout là bằng chứng Backend mới; role middleware có PHPUnit lịch sử. Không tạo Admin để test dashboard. Backend 227/1267, client 8, browser 17/Pint/build/lint của Bước 4 không chạy lại, không cộng thành kết quả mới. CAT-01 chỉ có đề xuất phạm vi/điểm cần duyệt tại Plan §11, chưa Spec CAT hoàn chỉnh/triển khai nghiệp vụ.

**3 kiến thức cần hiểu để bảo vệ:**

1. **Cùng origin và proxy (chuyển tiếp request):** trình duyệt chỉ thấy localhost:8080; Nginx chuyển /api và /sanctum tới PHP-FPM, phần React tới Vite. Axios lib/http.ts dùng URL tương đối, cookie được gửi đúng nguồn; cookie HttpOnly được browser gửi nhưng JS không đọc được. Cookie XSRF khác cookie phiên: Axios đọc XSRF để gửi header, Laravel kiểm tra bảo vệ request.
2. **State React khác session Backend:** AuthProvider giữ user trong bộ nhớ để vẽ UI; F5 làm mất state nhưng cookie còn, refresh gọi me để Laravel đọc sessions/users trong MySQL. Logout cần invalidate phiên ở server rồi mới xóa state/chuyển trang. Vì vậy chỉ xóa localStorage hoặc đổi role trên UI không chứng minh đã logout/có quyền.
3. **Xác thực khác phân quyền và kiểm tra dữ liệu:** auth:sanctum xác định người đang gọi; active/role/Policy quyết định được làm gì. RequireAuth chỉ giúp điều hướng; không có API nghiệp vụ thì không được nói đã thử Policy tài nguyên. Zod giúp người nhập, FormRequest/UNIQUE là lớp kiểm tra thật; đăng ký không nhận role/status tự do. Ca dev chứng minh tài khoản mới vẫn user, không Admin, email chưa tự xác minh.

### 11.13. Sprint CAT/ROOM — code thực tế và bằng chứng mới 23/10/2026

**Phạm vi:** thực hiện ngay quy tắc đã có, không khảo sát lại. Đã nối 5 trang ADM-02/03/04/05/06 vào dữ liệu thật: tòa nhà, tiện nghi và phòng cơ bản. Hợp đồng/Thanh lý chưa duyệt gói cấu trúc P4/P5-B/P6/P7/P8: không tạo ALTER, không sửa migration/model/enum. P1 baseline vẫn `end_date > start_date`; P2 một lý do chênh chung theo DB-D40; P12 kiểm tra tài sản bắt buộc mọi thanh lý theo D49. Không hỏi lại các nguyên tắc này; không tự coi prototype hai ô lý do là yêu cầu. Phân loại đầy đủ quyết định thật sự thiếu ở Plan §12.2; phạm vi/API/AC CAT/ROOM ở brief §16–17.

**File mới và trách nhiệm:**

| Nhóm file | Nội dung cần hiểu |
|---|---|
| `backend/app/Http/Controllers/Api/V1/{Building,Amenity,Room}Controller.php` | Nhận request, gọi Gate/Service, trả Resource; POST trả 201, archive 204. Không tính tiền hoặc tự tạo quyền |
| `backend/app/Http/Requests/{Building,Amenity,Room}/Store*Request.php`, `Update*Request.php`; Room thêm `IndexRoomRequest.php` | Kiểm tra quyền trước validation, chỉ dùng `validated()`; tên/mã/tầng/tọa độ/diện tích/tiền/UNIQUE. Trường ngoài quyền như status bị từ chối, không mass assign từ request |
| `backend/app/Policies/{Building,Amenity,Room}Policy.php` | Chỉ Admin active, tự khám phá theo quy ước Laravel. Cùng middleware phiên/khóa/vai trò, đây là lớp quyền thật ở server |
| `backend/app/Services/{Building,Amenity,Room}Service.php` | Eloquent query/pagination, allowlist trường ghi, xử lý UNIQUE race 409. Building giảm tầng phải kiểm tra phòng; Room transaction khóa tòa rồi phòng; Amenity archive giữ bản ghi/pivot |
| `backend/app/Http/Resources/{Building,Amenity,Room}Resource.php` | Hợp đồng JSON rõ ràng; không trả Model thô. Room.area là chuỗi DECIMAL, tiền nguyên VND; không thêm thông tin hợp đồng/ảnh/chỉ số giả |
| `backend/app/Rules/MaxTextBytes.php` | Chặn mô tả vượt 65.535 byte UTF-8 trước khi MySQL TEXT bị tràn |
| `frontend/src/features/{buildings,amenities,room-management}/` | Mỗi feature có api.ts, types.ts, schemas.ts và Form; api.ts chỉ gọi client chung lib/http.ts; Form dùng RHF/Zod, lỗi server map đúng trường |
| `frontend/src/lib/{apiErrors,textLimits}.ts` | Thông báo lỗi HTTP/mạng an toàn và `TextEncoder` đo byte UTF-8; không show SQL/stack trace. Field allowlist tránh gán lỗi vào trường ngoài form |
| `backend/tests/Feature/Catalog/{CatalogTest,RoomManagementTest}.php` | Feature tests MySQL có guard, cookie/CSRF thật trong HTTP kernel; quyền/validation/UNIQUE race/dữ liệu liên quan |
| `frontend/tests/{catalog.test.mjs,catalog.browser.mjs}` | Node tests schema/lỗi + harness Chrome CDP qua Nginx môi trường test cô lập, không cài thêm package |

File có sẵn đã sửa trong nhóm này: `backend/routes/api.php`, `backend/bootstrap/app.php`; `frontend/package.json` (test glob), `AdminLayout.tsx`; 5 page `AdminBuildingsPage`, `AdminBuildingDetailPage`, `AdminAmenitiesPage`, `AdminRoomsPage`, `AdminRoomDetailPage`; Plan/brief/DB plan/học tập/inventory và các đầu mối README/AGENTS/API Auth để cập nhật trạng thái. Không ghi đè thay đổi Authentication từ các lượt trước, không đụng prototypes/.claude. Backend models/DB schema/dependencies không thay đổi trong nhóm CAT/ROOM.

**Ví dụ luồng React → Laravel → MySQL:**

1. Admin mở form Thêm phòng tại `AdminRoomsPage`; `RoomForm` dùng `roomSchema` kiểm tra mã, diện tích, giá nguyên, tầng trong phạm vi tòa. Zod giúp phản hồi nhanh; người gọi API trực tiếp vẫn có thể bỏ qua frontend nên Backend kiểm tra lại.
2. `room-management/api.ts` gửi POST `/api/v1/rooms` qua Axios `http`. Cookie phiên HttpOnly do browser gửi; header XSRF bảo vệ request ghi. Không gửi role hoặc tin role ở React.
3. Laravel middleware `auth:sanctum`/`active`/`role:admin` xác minh phiên và tài khoản đang hoạt động; FormRequest/Policy xác nhận được tạo, `ensureReady()` kiểm tra bảng đã triển khai, sau đó validate dữ liệu. Không có bảng rooms thì 503 tiếng Việt, không query gây SQL lỗi hoặc trả danh sách 0 giả.
4. `RoomController::store()` đưa riêng `validated()` vào `RoomService::create()`. Service mở transaction (nhóm thay đổi cùng thành công/thất bại), khóa dòng tòa bằng `lockForUpdate()` rồi kiểm tra tầng theo DB, tạo phòng status available mặc định đã thiết kế. Khi sửa, khóa tòa trước phòng để tránh tranh chấp với giảm tầng; không đổi status/building_id/hợp đồng.
5. MySQL UNIQUE `(building_id, code)` là lớp chặn cuối nếu hai request cùng vượt validation. `UniqueConstraintViolationException` được chuyển 409; không nuốt lỗi DB khác. Transaction retry tối đa 3 lần khi deadlock (hai phiên chờ khóa nhau).
6. `RoomResource` trả đúng trường JSON, status 201; React chỉ đóng form/báo thành công sau API thành công, tải lại danh sách. F5 đọc lại DB nên dữ liệu còn; mất mạng không tạo dòng thành công giả.

**Các hàm quan trọng:** `BuildingService::update()` khóa tòa rồi so tầng cao nhất trước giảm tầng; thiếu bảng phòng thì 409 đúng thao tác này. `AmenityService::archive()` gọi soft delete nên tên UNIQUE và liên kết còn nguyên; không hard-delete. `RoomService::ensureReady()/create()/update()` tách kiểm tra triển khai, ghi an toàn và sửa metadata khỏi nghiệp vụ hợp đồng. `applyApiErrors()` chỉ ánh xạ errors vào field được phép; 401/403/409/503/mạng có thông báo an toàn. Chi tiết không tồn tại trả 404, không dùng phòng/tòa đầu tiên thay thế.

**Lỗi kỹ thuật tìm được khi rà soát:** ban đầu string validation cho phép mô tả ASCII 65.536 byte hoặc tiếng Việt vượt byte limit; MySQL TEXT có thể lỗi 1406. Đã thêm `MaxTextBytes` và `fitsTextColumn`, không nới cột hoặc cắt mất dữ liệu. Ví dụ `ế` chiếm 3 byte UTF-8: 21.845 ký tự = 65.535 byte được lưu, 21.846 bị 422; thêm 12 ca backend kiểm tra tạo/sửa không dở dang và ngưỡng chính xác. Frontend có test cùng ngưỡng. Tiền > `Number.MAX_SAFE_INTEGER` bị từ chối rõ ràng vì JSON number/JavaScript không giữ chính xác; không tự làm tròn. Đây là giới hạn kỹ thuật, không thay đổi giá/tiền hợp đồng hoặc schema BIGINT.

**Kiểm thử mới thực chạy:** trước DB tests, guard 7/7 và TestEnvironment 6/14 PASS. Sau code CAT đã có 336/2211; sau ROOM 416/2966; sau bổ sung TEXT, **toàn bộ 428 test/3080 assertion PASS**, Pint `--test` PASS 140 file. Đây là các lần chạy trong nhóm này, không cộng dồn thành số lượng test duy nhất. Chỉ dùng MySQL 8.4 qua mysql_test, DB/account mini_apartment_test; `mysql` bị trỏ lại test bởi guard. Guard/phpunit/quyền account không bị làm yếu. Frontend **19 Node tests PASS**, build PASS, lint 0 lỗi/9 cảnh báo có sẵn; bundle còn cảnh báo >500 kB. Không cần package mới.

**16 ca browser mới:** Chrome headless thật, bản build Vite preview cổng 5175 → Nginx 8081 → PHP-FPM test riêng → DB test; APP_ENV local nên không bỏ CSRF theo cơ chế testing. Đã kiểm tra DB/account/session/cache trước fixture, RUN_MIGRATIONS=false và bypass entrypoint, không chạy migrations lúc dựng app test. Harness yêu cầu biến xác nhận môi trường test, không dùng biến này thay cho kiểm tra server. `localhost` trên máy có dịch vụ khác ở IPv6 ::1:8081; Chrome riêng map localhost→127.0.0.1, giữ cùng origin cho Sanctum, không đụng dịch vụ khác.

| Ca | Kết quả PASS |
|---|---|
| CAT01 | Chưa đăng nhập: API 401 và UI về login |
| CAT02–04 | Tạo tòa, client validation, F5/chi tiết/sửa/tọa độ, tên trùng 422 theo trường |
| CAT05 | ID không tồn tại: 404, không fallback mock |
| CAT06–08 | Tạo/sửa tiện nghi, F5, mobile390px không overflow, archive204/404 và tên không tái dùng422 |
| CAT09–10 | Tài khoản không Admin gọi API nhận403 thật; mất mạng không có lưu thành công giả |
| ROOM01–03 | Tạo phòng/F5/DECIMAL/tiền/status mặc định, mã trùng422, sửa giữ tòa/status |
| ROOM04–06 | Query lọc thật, Backend từ chối non-Admin403, chi tiết không tồn tại404 |

Không có runtime exception trong 16 ca; ảnh mobile và kết quả JSON ở `backups/catalog-sprint-20261023/` đã gitignore. Biên TEXT được PHPUnit/Node kiểm tra, chưa thao tác chuỗi dài trên browser. Không coi 16 ca này là lượt chạy lại 17 ca Auth lịch sử hoặc 7 ca Auth dev. Đã dọn đúng 3 dữ liệu nghiệp vụ + 5 tài khoản browser test theo ID/tên/mã lượt, chỉ DB test; dừng đúng Chrome/Vite preview và app/Nginx test, giữ 4 container dev. Không xóa dữ liệu dev.

**DB dev và giới hạn thật:** snapshot trước/sau khớp toàn bộ columns/indexes/FK/objects/migrations và hash từng bảng: 13 bảng/9 migrations/1 user, không Admin. Không migration hoặc ghi dữ liệu dev; 11 file Nhóm 2–3 vẫn pending. ROOM có code/UI/test đầy đủ trong lát cắt, chưa vận hành trên DB dev vì thiếu bảng rooms; không tạo Admin dev để thử. CAT chưa tích hợp dịch vụ/settings/giá/pivots, chưa public room API/ảnh, trạng thái/xóa/chuyển tòa và các module ngoài phạm vi. Các trang khác giữ nhãn mock; không lấy ID dữ liệu thật đi mở trang public mock. Gói schema Thanh lý chưa duyệt không chặn tiếp CAT-02b/03b độc lập. Không commit/push.

**5 câu giảng viên có thể hỏi:**

1. Vì sao FormRequest + UNIQUE cùng tồn tại? Validation trả lỗi dễ hiểu; hai request có thể cùng vượt validation, nên UNIQUE ngăn trùng tại DB và Service trả 409 cho cuộc đua đó.
2. Khóa tòa trước phòng để làm gì? Tạo/sửa phòng và giảm tầng phải nhìn cùng trạng thái tòa; khóa theo cùng thứ tự giảm nguy cơ deadlock và tránh phòng ở tầng vượt số tầng vừa giảm.
3. Soft delete khác xóa thật thế nào? Gán deleted_at, query mặc định không thấy nhưng dữ liệu/pivot/tên UNIQUE còn; chưa có API khôi phục hoặc xóa vĩnh viễn.
4. React đã có guard sao cần Policy? Client có thể bị sửa/bỏ qua. Cookie xác định danh tính, middleware/Policy ở Laravel mới quyết định quyền; browser đã thử gọi API bằng non-Admin nhận403.
5. Vì sao test chạy được mà dev chưa dùng Phòng? DB test có schema đã kiểm thử; dev chỉ chạy migration đã duyệt. Việc triển khai code không tự cấp quyền nâng schema dev; thiếu bảng phải báo chưa sẵn sàng và xin duyệt migration riêng, không giả dữ liệu.

### 11.14. CAT-02b/03b — Dịch vụ, Giá điện nước và cấu hình ngày (23/10/2026)

Phạm vi từ DB09 §3.10/3.12/3.20 và brief §18. Không khảo sát lại, không tạo Spec mới, migration/model/enum/dependency mới. Chủ dự án duyệt **CAT-D01/DB-D54: cả hai cấu hình ngày nhận1–365**, đã cập nhật quyết định/thiết kế; không suy ra phê duyệt gói Thanh lý P4–P8 hoặc chạy migrations dev.

**Các file cần hiểu:**

| Nhóm | Chức năng |
|---|---|
| Backend `ServiceController`, `ServiceCatalogService`, `ServicePolicy`, `ServiceResource`, Requests/Service | API danh mục dịch vụ. Tạo chỉ3kiểu thường, code trim/chữ hoa; tên/code UNIQUE. Sửa name/description/giá niêm yết thường; không đổi hợp đồng hoặc snapshot. Không endpoint xóa/ngừng/đổi kiểu/đơn vị trong lát cắt này |
| Backend `UtilityPriceController`, `UtilityPriceService`, `UtilityPricePolicy`, `UtilityPriceResource`, Requests/UtilityPrice | Đọc lịch sử/lọc/phân trang và thêm giá metered. Validate ngày01, số nguyên VND>0, kỳ hiệu lực sau mọi meter_readings.period theo D33. Chưa API sửa/xóa giá |
| Backend `SettingController`, `SettingService`, `SettingPolicy`, `SettingResource`, Requests/Setting/UpdateDaysSettingRequest | GET chỉ8key, missing_keys khi chưa có; PUT chỉ2key số ngày đã duyệt, không ghi ngân hàng/hệ thống tùy ý. value TEXT trả chuỗi theo hợp đồng hiện tại. Đọc trực tiếp DB, chưa cache nên không có cache stale cần xóa |
| `database/seeders/SystemCatalogSeeder.php`, `DatabaseSeeder.php` | Tạo2dịch vụ hệ thống metered/priceNULL và8key. Chạy lặp không ghi đè thông tin đã cấu hình; mã hệ thống xung đột thì dừng/rollback, không tự sửa. Không user/giá điện nước mẫu. Chỉ thực thi trên DB test trong lượt này |
| `app/Rules/NotBoolean.php` | Chặn JSON true bị Laravel integer xem thành1; áp dụng giá Service, UtilityPrice và giá/cọc Room. Rule integer/min/max vẫn giữ, không làm tròn, không đổi schema |
| Frontend `features/services/` và `features/utility-prices/` | api.ts/types.ts/schemas.ts + form RHF/Zod; API qua http chung. Types giữ snake_case; tiền số nguyên an toàn JS, DATE giữ chuỗi, mô tả kiểm tra byte UTF-8 |
| `AdminServicesPage.tsx`, `AdminUtilityPricesPage.tsx`, `AdminLayout.tsx` | Hai trang Antigravity hiện có nối dữ liệu thật, banner phân biệt mock; không có ID/giá/nhãn đã tính hóa đơn giả. Không thêm trang Settings còn thiếu |
| `tests/Feature/Catalog/{ServiceCatalogTest,UtilityPriceCatalogTest,SystemCatalogSeederTest,SettingsDaysTest}.php`; `RoomManagementTest.php` | Test quyền/CSRF, validation/unique-race, snapshot, ngày/kỳ đã dùng, schema thiếu, seeder, settings1–365 và boolean tiền |
| `frontend/tests/catalog-next.test.mjs`, `catalog-next.browser.mjs` | 8 Node tests mới và harness browser kiểm tra 2 trang + Settings API trên DB test cô lập |

Root tích hợp `backend/routes/api.php`, không ghi đè Auth/CAT/ROOM trước đó. API và AC chính thức xem brief §18. File tài liệu cập nhật gồm Plan, DB plan§17, DB decisions/DB09 (chỉ quyết định ngày đã duyệt), học tập/inventory và đầu mối README/AGENTS. Chưa commit/stage/push, không sửa package-lock/composer.lock/guard/phpunit hay migration đã commit.

**Luồng ví dụ thêm giá:** `AdminUtilityPricesPage` mở `UtilityPriceForm` → Zod kiểm tra service_id thật, unit_price nguyên>0, effective_from ngày01 → Axios gửi POST `/api/v1/utility-prices` cùng cookie/XSRF → Laravel auth/active/role/Policy xác minh Admin → `StoreUtilityPriceRequest` kiểm tra input → `UtilityPriceService::create()` transaction khóa dòng Service, đọc kỳ chỉ số lớn nhất, chặn giá làm thay đổi kỳ đó → INSERT utility_prices, UNIQUE(service_id,effective_from) bảo vệ race → Resource trả201 → React tải lại lịch sử. F5 vẫn thấy bản ghi vì đọc MySQL. Không tính tiền hóa đơn trong React.

**Vì sao khóa Service:** hai Admin thêm giá cùng dịch vụ được tuần tự hóa; MTR tương lai phải dùng cùng khóa khi lấy/snapshot giá và ghi reading, sau rooms/users/contracts/contract_services và trước meter_readings theo thứ tự cha–con. Không tuyên bố đã có MTR Service hoặc test cạnh tranh giá–reading khi module đó chưa code. Test hiện tại chứng minh UNIQUE race và quy tắc lịch sử; khóa dòng được đối chiếu trong source, chưa có test cạnh tranh với luồng nhập chỉ số thực tế. Thiếu utility_prices thì đọc503, thiếu meter_readings thì thêm giá503 để không bỏ kiểm tra D33. Nhóm2 chỉ đủ bảng giá, không đủ kiểm tra ghi giá trên dev nếu Nhóm3 chưa áp dụng.

**Cấu hình ngày:** PUT `/settings/invoice.due_days` với `{"value":5}` chỉ Admin active, CSRF và Policy; `UpdateDaysSettingRequest` nhận1–365 và từ chối boolean/field key/type/group. Service khóa cấu hình có sẵn, tạo key chỉ khi Admin nhập thật nếu chưa có; không nhận key tùy ý. UNIQUE race409. Lượt test đầu phát hiện Resource tự trả201 khi Model mới tạo; đã sửa Controller trả200 tường minh theo hợp đồng PUT, không đổi test để che lỗi. Không sửa hóa đơn/hợp đồng cũ khi đổi giá trị cấu hình.

**Giới hạn dữ liệu kỹ thuật:** MySQL DATE hỗ trợ1000–9999, validate cả Laravel/Zod; không tự đặt khoảng năm nghiệp vụ hoặc giới hạn chỉ cho tương lai. `true` từng vượt Laravel integer thành1VND, đã chứng minh qua Validator rồi sửa NotBoolean, thêm test cả tạo/sửa Room và CAT mới. Giá vượt Number.MAX_SAFE_INTEGER bị từ chối thay vì làm tròn; mô tả TEXT vẫn65.535byte. Đây là bảo vệ kiểu/giao tiếp, không tự đặt chính sách tài chính.

**Kiểm thử tự động mới:** guard7/7, TestEnvironment6/14 trước DB tests. Lượt đầu cả nhóm CAT-B **555 test/3932 assertion PASS**. Sau thêm hai cấu hình ngày đã duyệt, lượt test riêng ban đầu6failed/11passed vì201/200 nêu trên; sau sửa, chạy **toàn bộ572 test/4134 assertion PASS**, Pint `--test` PASS164file. Không cộng555 và572 thành số test. DB chỉ mysql_test/mini_apartment_test và account test riêng, guard giữ nguyên. Frontend **27 test PASS** (19 trước +8 mới), build PASS, lint0lỗi/9cảnh báo có sẵn; bundle vẫn cảnh báo>500kB. Ma trận browser CATB01–12: anonymous401; dịch vụ tạo/validate/F5/sửa/duplicate/metered protection; giá ngày01/tạo/F5/lọc/duplicate; non-Admin403 thật; offline không lưu giả; Settings365thành công/0bị422; mobile390px. Kết quả browser và so sánh dev cuối lượt cập nhật ở Plan§12.4.

**Phương án dev/checkpoint:** DB plan§17 có đủ7tênfile, FK/index/generated columns, backup mới ngoài repo + restore đúng utf8mb4/utf8mb4_unicode_ci trên volume/container riêng, đúng7--path/pretend, kiểm tra trước–sau và rủi ro DDL tựcommit. Không chạy dù code đã test; không dùng backup cũ thiếu khách mới. Không rollback DROP bảng/restore dev tự động khi có bất thường. Nhóm2 baseline không chứa ALTER P4–P8; chưa duyệt Nhóm3/seeder/Admin. Plan§12.5 đề xuất7checkpoint theo phụ thuộc, stagehunk có chủ đích, chưa commit/push.

**Câu hỏi bảo vệ:** (1) Danh mục price khác unit_price hợp đồng thế nào? Price là niêm yết, contract_services lưu snapshot nên sửa niêm yết không sửa lịch sử. (2) Vì sao utility_prices riêng? Giá thay theo kỳ, chọn theo ngày01 và snapshot khi ghi chỉ số, không đổi hóa đơn cũ. (3) Seeder khác migration? Seeder ghi dữ liệu hệ thống, migration tạo cấu trúc; duyệt một loại không tự duyệt loại kia. (4) Vì sao giá dev503 dù UI đã code? Cần đúng bảng để kiểm tra quy tắc đã dùng; không giả định lịch sử rỗng. (5) Vì sao Group2 không chờ P4–P8? Group2 tạo baseline7bảng đã thiết kế/test, P4–P8 là điều chỉnh cấu trúc thanh lý tương lai; vẫn cần duyệt vận hành dev riêng.

**Kết quả browser cuối CAT-B:** 12/12 PASS, không runtime exception; ảnh mobile đã xem trực tiếp. Lượt đầu lỗi harness điền DATE, lượt kế tiếp cần chờ dropdown tải xong; đã sửa harness và chạy lại toàn bộ, không nới validation sản phẩm. Đã dọn đúng fixtures test (giá/dịch vụ/settings hệ thống +5user test), dừng môi trường riêng; snapshot dev trước/sau khớp hoàn toàn. Bằng chứng ignored: backups/catalog-next-20261023; không đưa credential vào Git.

### 11.15. Nâng schema dev Nhóm 2 an toàn — 23/10/2026

Chủ dự án duyệt **riêng7file200006–200012** theo DBplan§17. Biên bản đầy đủ/đường dẫn backup và câu lệnh thật ở DBplan§18; không gộp Nhóm3, cấu trúc Thanh lý P4–P8, seeder hoặc Admin.

**Kết quả thực tế:** dev13→20bảng, migrations9→16dòng,7fileđúngtên ởbatch4; chỉ7bảng mới rỗng. Cấu trúc/hash dữ liệu13bảng cũ giữ nguyên, ngoại lệ có chủ đích bảng migrations thêm7dòng và tăngAUTO_INCREMENT tương ứng. users vẫn1khách/0Admin; emailnullable/UNIQUE và phoneNOTNULL/UNIQUE còn nguyên. Bốn file Nhóm3 vẫn pending. Không sửa file migration đã commit hoặc tạo dữ liệu nghiệp vụ.

**Bảo toàn dữ liệu được chứng minh thế nào:**

1. Tạm dừng ingress nginx/frontend để không phát sinh ghi qua web; giữ MySQL/app. RUN_MIGRATIONS=false được xác nhận cả Compose và container, không recreateapp. SnapshotPDOchỉ đọc xác minh chính xác DB/accountdev; không in thông tin tài khoản cá nhân.
2. Backup mới `D:\MaNguonMo\mini-apartment-backups\group2-20261023T031015Z\mini_apartment.sql`, toàn DB/các đối tượng, SHA-256 kiểm tra lại. Không dùng backup cũ trước tài khoản khách. Dữ liệu nhạy cảm chỉ nằm ngoài repository/Git.
3. Restore lên container cùngimageMySQL8.4.11, networknone/khôngport, volume data/socket hoàn toàn mới. Đặt đúng utf8mb4/utf8mb4_unicode_ci trước import. PHPcontainercũngnetworknone đọcMySQL qua socket mới; serverUUIDkhác chứng minh không trỏ dev.
4. Đối chiếu schema/columns/index/FK/delete rules/constraints/objects, migrations, số dòng và SHA-256 nội dung từng bảng theo PRIMARYKEY; AUTO_INCREMENTcũng khớp. SHOWCREATEbản restore có thêm chữ CHARACTERSETutf8mb4 ở cột chữ, nhưng metadatacharset/collation và SQL chuẩn hóa giống hệt; đây là biểu diễn tường minh, không lỗi collation.
5. `--pretend` đúng7path có33DDL chỉ CREATE7bảng và ALTERFK/index trên bảng mới. Chạy thử cùng7file trên bản restore, kiểm tra20bảng/16migration/7bảng rỗng/không mất dữ liệu cũ. Snapshotdev trướcapply vẫn khớp backup; hash7filekhông đổi.
6. Chạy thật cùng7path trên dev; sau chạy so với bản diễn tập và baseline đều đúng phạm vi. Không tự rollback nếu bất thường; lần này không có bất thường cấu trúc/dữ liệu. Mở lạifrontend/nginx, giữRUN_MIGRATIONSfalse; dừngcontainerrestore, giữbackup/volumeđể đối chiếu.

**Lệnh và khái niệm cần giải thích:** `migrate` thường xét tất cả file chưa ghi trong bảng migrations; nhiều `--path` giới hạn đúng7file; bảng migrations ghi tên/batch để không chạy lại. `--pretend` inSQL dự định, không thay thếbackup/restore hoặc kiểm tra thực tế. MySQL DDL thường tựcommit, nên cả7filekhông là một transaction chung; khi lỗi giữa chừng phải dừng và đối chiếu, không xóa bảng/rerun mù. Backup là bản sao có khả năng phục hồi, migration là thay đổi cấu trúc có phiên bản; migrationCREATEtrong lượt này không xóa dòng ở bảng cũ.

**Mức kết nối Dockerdev:** GETHTML `/`, `/admin/rooms`, `/admin/buildings`, `/admin/services`, `/admin/utility-prices`200 và trảReactentry; health200; APIkhông phiên401. LaravelServicechỉ đọc xác nhậnrooms/utility_prices rỗng hợp lệ, không còn thiếu bảng. GETtrangReactcầnAccepttext/html như browser; thửAcceptapplication/json với Vite trả404 không phải lỗi route ứng dụng. Chưa có Admin và chủ dự án cấm tạo, nên chưa thử thao tác quản trị thực tế trên dev; không đổi role hoặc tạo session giả để thử. Điện/Nước chưa seed; thêmgiá vẫn503 do meter_readings Nhóm3 thiếu, không bỏ D33 để làm UI báo thành công.

**Câu hỏi giảng viên:** Vì sao phải restore thử dù dump thành công? Dump có thể thiếu đối tượng/khác collation hoặc lỗi import, chỉ restore+đối chiếu mới chứng minh khả năng phục hồi. Vì sao không rollback ngay nếu lỗi? Down của nhóm này DROPtable có thể xóa dữ liệu vừa phát sinh; phải đánh giá trạng thái hiện tại trước. Vì sao7bảng còn rỗng? Migration tạo cấu trúc; seeder/dữ liệu/Admin là quyền thao tác khác, không được tự gộp. Vì sao Phòng dùng được schema nhưng chưa chứng minh UIAdmindev? Cần tài khoản đúng vai trò; kiểm tra HTTPentry/API401 và Servicechỉ đọc khác với người dùng thật thực hiệnCRUD.

### 11.16. Gán tiện nghi — API và panel trên trang chi tiết

**Phạm vi CAT-02b.4/03b.4:** dùng hai bảng liên kết đã có; tiện nghi không sinh tiền. CAT-D02/DB-D55 được chủ dự án xác nhận: tiện nghi đã lưu trữ còn liên kết vẫn hiện kèm nhãn **Đã lưu trữ**. Chỉ sửa tập tiện nghi đang hoạt động, chưa khôi phục/gỡ riêng liên kết đã lưu trữ. Không thay schema hoặc quyền.

**File và trách nhiệm:**

| File | Nhiệm vụ |
|---|---|
| `backend/routes/api.php` | Thêm GET/PUT tiện nghi cấp tòa/phòng; dùng middleware (lớp kiểm tra trước Controller) xác thực, trạng thái và quyền Admin, cùng CSRF khi ghi |
| `app/Http/Controllers/Api/V1/AmenityAssignmentController.php` | Nhận yêu cầu, kiểm tra Policy (quy tắc quyền), gọi Service, trả Resource |
| `app/Http/Requests/AmenityAssignment/UpdateAmenityAssignmentRequest.php` | Kiểm tra danh sách ID hợp lệ, không trùng, còn hoạt động; từ chối trường điều khiển tiền/quyền/trạng thái |
| `app/Services/AmenityAssignmentService.php` | Đọc/gán tiện nghi, khóa dữ liệu và giữ liên kết lưu trữ; tính tập hợp tại Backend |
| `app/Http/Resources/AmenityAssignmentResource.php` | Chỉ trả id/name/description/is_archived trong direct/inherited/effective |
| `frontend/src/features/amenity-assignment/{api,types,schemas}.ts` | Gọi API thật bằng http chung, khai báo dữ liệu và kiểm tra biểu mẫu bằng Zod |
| `AmenityAssignmentPanel.tsx` | Biểu mẫu React Hook Form, trạng thái tải/lưu/lỗi/thử lại; hiển thị dữ liệu server |
| `AdminBuildingDetailPage.tsx`, `AdminRoomDetailPage.tsx` | Ghép panel vào trang hiện hữu với archivedVisibility="show"; giữ Antigravity |

**Luồng React → Laravel → MySQL:** người dùng chọn checkbox → React gửi `{amenity_ids:[...]}` qua cookie và XSRF → Laravel xác minh Admin active, Policy và input → Service ghi đúng bảng liên kết → Resource trả tập trực tiếp, kế thừa và hợp nhất → React hiển thị kết quả thực. Không import mock, không báo lưu thành công trước phản hồi API. Lỗi 422 được đặt tại trường amenity_ids, kể cả server trả amenity_ids.0.

**Hàm quan trọng:** `ensureReady()` kiểm tra đủ bảng trước truy vấn, trả 503 nếu thiếu. `findBuilding()/findRoom()` tìm đúng ID, không có thì 404. `update()` dùng transaction (nhóm thao tác ghi cùng thành công hoặc cùng hủy), khóa Building → Room nếu cần → các liên kết hiện tại theo ID → Amenity theo ID tăng dần. Khóa cả ID cũ và mới để đọc lại trạng thái lưu trữ, tránh xóa nhầm liên kết vừa được lưu trữ. `sync()` chỉ đồng bộ tập hoạt động được chọn cộng liên kết lưu trữ phải giữ. `forRoom()` hợp hai tập theo ID, không tạo bản sao tiện nghi tòa vào bảng liên kết phòng. Các hàm `buildingIndex/buildingUpdate/roomIndex/roomUpdate` trong Controller giữ trách nhiệm ngắn, không chứa nghiệp vụ.

**Kiểm thử mã nguồn mới:** toàn Backend **650 test / 4.667 assertion PASS**, Pint **169 file PASS**; 78 ca mới trong `tests/Feature/Catalog/AmenityAssignmentTest.php`. Bao phủ 401/403/locked/CSRF, gán/gỡ/danh sách rỗng, ID sai/trùng/lưu trữ, hợp không trùng và không sao chép, không sửa tiền/hợp đồng/quyền, thiếu schema 503, không tìm thấy 404. Hai ca đổi trạng thái giữa validation và ghi mô phỏng đúng ranh giới này; chưa tuyên bố là test hai process gán đồng thời. Guard trước test 7/7; full suite kiểm tra tài khoản test không đọc dev và kết nối mysql được chuyển về test. Không sửa guard/phpunit.

Frontend **32 test PASS** (27 trước + 5 schema mới); build PASS, lint 0 lỗi/9 cảnh báo có sẵn, bundle còn cảnh báo trên 500 kB. Các test này không thay thế kiểm tra biểu mẫu thật trên trình duyệt.

**Kiểm thử trình duyệt mới: 14/14 ca PASS**, không runtime exception, Nginx 8081 + DB/account mini_apartment_test, không ghi dev. Đã trực tiếp xem ảnh desktop/mobile 390 px: nhãn rõ, không tràn ngang, giữ Antigravity. Bao phủ gán/gỡ/danh sách rỗng, tải lại giữ dữ liệu, kế thừa không sao chép, union không trùng, archive thật có nhãn/giữ liên kết, lỗi mạng/thử lại, Backend403/CSRF419 và 422 thật khi ID bị archive trước PUT. Lượt đầu chưa vào được trang vì localhost IPv6 trỏ ứng dụng khác; xác định đúng Nginx test ở IPv4 và chỉnh riêng Chrome/harness. Không sửa sản phẩm hoặc làm yếu validation để vượt test. Ma trận và kết quả tại Plan §12.7; 12 ca CAT-B và 16 ca CAT/ROOM trước là lịch sử.

**Câu hỏi bảo vệ và hướng trả lời:**

1. Tiện nghi có thu tiền không? Không; Services mới là khoản thu. Gán tiện nghi không sửa giá hoặc hợp đồng.
2. Vì sao có hai bảng liên kết? Một bảng dành cho tòa, một bảng dành cho lựa chọn riêng của phòng; khi đọc mới hợp theo ID.
3. Vì sao giữ liên kết đã lưu trữ? Lưu trữ không phải xóa lịch sử; biểu mẫu hiện chỉ sửa tập hoạt động theo quyết định đã duyệt.
4. Vì sao kiểm tra ID lần nữa sau khi khóa? ID có thể bị lưu trữ giữa lúc kiểm tra input và lúc ghi; trạng thái sau khóa mới đủ tin cậy để quyết định.
5. Vì sao build PASS chưa đủ? Build kiểm tra biên dịch; trình duyệt mới chứng minh chọn/lưu/tải lại và nhận dữ liệu API thật qua cookie/CSRF.


**An toàn sau kiểm thử:** đã dọn đúng fixture của lượt trong DB test và dừng tiến trình/container test riêng. Snapshot dev cuối khớp mọi phần JSON với sau migration đã duyệt; không thêm thay đổi dữ liệu dev. So sánh chuỗi thô từng báo khác do Windows dùng CRLF còn đầu ra container dùng LF; đối chiếu nội dung JSON mới xác nhận cấu trúc/dữ liệu bằng nhau. Không bỏ qua khác biệt chưa rõ; phải xác định nguyên nhân trước khi kết luận. Dev giữ 20 bảng/16 migration, RUN_MIGRATIONS=false; chưa Admin/seeder/CRUD quản trị dev.


### 11.17. Bản đồ code USR-A — quản trị tài khoản chỉ đọc

| Mở file tại vị trí này | Tìm hàm/điểm xử lý |
|---|---|
| `frontend/src/pages/admin/AdminUsersPage.tsx:22` | AdminUsersPage: submit dòng52 gửi bộ lọc, changePage dòng51 đổi trang, clearFilters dòng54 xóa lọc; useEffect dòng36 gọi API và hiển thị result.data/meta |
| `frontend/src/pages/admin/AdminUserDetailPage.tsx:18` | AdminUserDetailPage: lấy userId từ URL, useEffect dòng32 tải đúng hồ sơ; không có tài khoản thì 404, không dùng tài khoản mẫu |
| `frontend/src/features/user-management/api.ts:7` | getUsers(page,filters,signal); getUser(id,signal) dòng13. http.get gửi query, không body; http.ts dòng11 có withCredentials=true để gửi cookie phiên |
| `backend/routes/api.php:38` | GET /api/v1/users → AdminUserController::index; dòng39 GET /api/v1/users/{user} → show. Middleware auth:sanctum → active → role:admin; UserPolicy::viewAny/view kiểm tra Admin active |
| `backend/app/Http/Requests/User/IndexUserRequest.php:34` | rules: role/status/has_active_contract/q/page; chỉ validated() tới Service; q được trim |
| `backend/app/Services/AdminUserService.php:31` | paginate: AND các bộ lọc, nhóm OR tìm full_name/email/phone bằng LOCATE có binding (tham số tách khỏi SQL), 20 dòng/trang theo ID; find dòng59 đọc hồ sơ thật |
| `backend/app/Models/User.php:71` | activeContract: contracts.status=active, SoftDeletes loại hợp đồng lưu trữ; đọc tiếp rooms và buildings. Eager loading (tải trước quan hệ theo nhóm) tránh mỗi người lại chạy query riêng |
| `backend/app/Http/Resources/AdminUserResource.php:10`, `AdminUserDetailResource.php:9` | toArray: JSON data; list chỉ thông tin liên hệ/trạng thái/đang thuê, detail thêm 4 trường hồ sơ pháp lý. Không đổi hidden của User hoặc Resource /auth/me |

**API thực hành ngắn:** ví dụ tham số `GET /api/v1/users?role=resident&status=active&has_active_contract=1&q=Nguyen&page=1` chỉ lấy cư dân hoạt động đang thuê có tên/email/SĐT chứa Nguyen. Bỏ q để bỏ tìm kiếm, đổi has_active_contract=0 để lấy người không đang thuê; tăng page để xem trang kế tiếp. Kết quả tùy dữ liệu thật, không bảo đảm có dòng. DevTools → Network → chọn request users → xem Query String Parameters, Request Headers/Cookie, Response data/links/meta; không chia sẻ cookie hoặc thông tin pháp lý thật. Không có API ghi người dùng trong lát cắt này.

**Luồng/lỗi:** submit React → getUsers → route/middleware/Policy → FormRequest → AdminUserService → users/contracts/rooms/buildings → Resource → bảng hoặc hồ sơ. 401 yêu cầu đăng nhập, 403 không có quyền/khóa, 404 hồ sơ không tồn tại, 422 hiện lỗi bộ lọc, 503 thiếu schema; lỗi mạng có Thử lại. Đổi bộ lọc trong submit/api.ts; đổi điều kiện truy vấn trong paginate; đổi trường trả về trong Resource rồi đồng bộ types/page và test. Không sửa Model hidden để lộ CCCD ở mọi API.

**Câu hỏi bảo vệ:** (1) Resident có luôn đang thuê? Không, phải có hợp đồng active; không tự coi quá ngày kết thúc dự kiến là đã thanh lý. (2) Vì sao CCCD chỉ ở detail Admin? Resource và Policy giới hạn đúng mục đích đọc hồ sơ. (3) Vì sao OR phải nằm trong nhóm? Để tìm kiếm không vượt qua điều kiện vai trò/trạng thái. (4) React ẩn nút có bảo vệ được API? Không; Laravel kiểm tra cookie, trạng thái và Policy. (5) Vì sao eager loading? Số query giữ ổn định khi trang tăng từ1 lên20 tài khoản.


**Bằng chứng USR-A mới:** Backend 699 test/5.053 assertion PASS (49 ca mới), Pint176 file PASS; frontend39 test PASS (7 ca mới), build PASS, lint0 lỗi/9 cảnh báo cũ. Guards/config PHPUnit không đổi; đã xác minh SQL kết nối/tài khoản test và bị từ chối đọc dev trước test. Browser mới **16/16 ca PASS**, 0 runtime exception trên DB/account test riêng; ma trận tại Plan §12.8, không dùng kết quả lịch sử thay cho USR. Khởi đầu lượt 4 container dev đang dừng; đã kiểm tra RUN_MIGRATIONS=false cả Compose/container cũ trước khi start, không recreate hoặc chạy migration.


**Đóng lượt USR:** dọn đúng23 tài khoảnUSR+2 hợp đồng/1phòng/1tòa và5 tài khoảnAuth fixture trên DB/account test, không đụng dữ liệu dev; đóng Chrome/Vite riêng, dừng2container test. Snapshot dev-before/dev-after trong backups/usr-read-20261023 khớp mọi phần metadata/index/constraints/lịch sử/count/hash:20 bảng/16 migration/1khách, không thêm Admin/seed/migration. Bốn container dev đang chạy, MySQL healthy, RUN_MIGRATIONS=false. Nhóm3 vẫn4file pending; không commit/push. Bản đồ code trên đã đối chiếu số dòng hiện tại; khi code thay đổi phải kiểm tra lại vị trí trước khi hướng dẫn.

### 11.18. Bản đồ code USR-B — Admin cấp nhân viên

DB-D56/USR-D01 đã duyệt: chỉ tạo mới Kỹ thuật viên/Bảo vệ, email tùy chọn NULL; Admin đặt mật khẩu ẩn và bàn giao thủ công. Chưa khóa tài khoản, sửa hồ sơ, gửi lời mời hoặc ép đổi mật khẩu lần đầu.

| Mở file | Hàm/điểm xử lý |
|---|---|
| `frontend/src/pages/admin/AdminUsersPage.tsx:53` | closeStaffModal chặn đóng khi bận; onCreated dòng113 đóng modal, thông báo an toàn, về trang1 và GET lại danh sách |
| `frontend/src/features/user-management/StaffUserForm.tsx:33` | submit nhận dữ liệu RHF/Zod, dùng ref chặn gửi lặp, gọi API, reset khi thành công, applyApiErrors khi lỗi; hủy/unmount xóa state mật khẩu |
| `frontend/src/features/user-management/api.ts:17` | createStaffUser gọi fetchCsrfCookie rồi http.post('/users'); gửi full_name/phone/email/role/password/password_confirmation, email rỗng thành NULL |
| `frontend/src/lib/accountSchemas.ts:14` | registrationFields dùng chung với đăng ký; passwordsMatch dòng21, passwordFitsBcrypt dòng4 kiểm tra byte UTF-8. Không trim mật khẩu |
| `backend/routes/api.php:53` | POST /api/v1/users → AdminUserController::store; auth:sanctum + active + role:admin + spa. UserPolicy::createStaff tại app/Policies/UserPolicy.php:20 kiểm tra Admin active |
| `backend/app/Http/Requests/User/StoreStaffUserRequest.php:28` | prepareForValidation chuẩn hóa email/SĐT; rules dòng37 kiểm tra dữ liệu, 2 vai trò, từ chối trường do server quản lý |
| `backend/app/Http/Controllers/Api/V1/AdminUserController.php:39` | store chỉ chuyển validated() tới Service, trả AdminUserResource với HTTP201 |
| `backend/app/Services/AdminUserService.php:66` | createStaff: tạo User mới trong transaction (cùng thành công hoặc cùng hủy), gán active/email chưa xác minh; UNIQUE race409, lỗi DB khác500 với log đã bỏ SQL/bindings/dữ liệu cá nhân |
| `backend/app/Models/User.php:43` | casts có password=hashed: băm mật khẩu trước lưu; role/status không nhận mass assignment (gán hàng loạt từ dữ liệu nhập) |

**Luồng:** bấm Tạo tài khoản → submit → POST cùng cookie phiên + X-XSRF-TOKEN → middleware/Policy → FormRequest → Service INSERT users và đọc lại trường tối thiểu → Resource `{data:...}` → React GET lại danh sách. contracts/rooms/buildings chỉ được đọc để xác định đang thuê. Không gọi Auth::login hoặc API register nên /auth/me vẫn Admin. DevTools → Network → users cho thấy POST201 và GET sau đó; không chia sẻ mật khẩu/cookie trong ảnh chụp.

**Muốn sửa:** validation ở Request + schema tương ứng; response ở AdminUserResource + types.ts; lưu dữ liệu ở createStaff; giao diện/lỗi ở submit/onCreated. Thay chính sách quyền/tài khoản phải được duyệt, không chỉ sửa option React.

**Kiểm thử:** StaffUserCreateTest kiểm tra input/quyền/CSRF/hash/NULL/trùng/giữ phiên và transaction; staff-user.test.mjs kiểm tra schema; staff-user.browser.mjs thao tác modal/API thật. So sánh dữ liệu cũ phải đọc từ MySQL cả trước và sau: model mới factory-create chưa có đủ cột NULL mặc định; khác cấu trúc mảng không đồng nghĩa dữ liệu bị sửa.

**Lưu ý Laravel13 thực tế:** `PreventRequestForgery::handle/hasValidOrigin` trong framework đang cài cho qua request có `Sec-Fetch-Site: same-origin`, bên cạnh cơ chế so khớp token. Vì vậy gắn token sai bằng fetch ngay trên trang cùng origin chưa phải ca giả mạo cross-site. Browser test gửi request cross-site + token sai và nhận419; ứng dụng vẫn gửi XSRF đúng, không tắt hoặc sửa middleware để test qua.

**Câu hỏi bảo vệ:** (1) Vì sao không gọi register? Register tạo khách và tự đăng nhập, còn cấp nhân viên phải giữ phiên Admin. (2) Sửa role=admin trong request được không? Laravel từ chối422, không nâng quyền người cũ. (3) Admin biết mật khẩu ban đầu không? Có theo cách bàn giao đã duyệt; DB chỉ lưu hash, API không trả lại. (4) Trùng email đồng thời? UNIQUE chặn, transaction hủy và trả409. (5) Input password ẩn đã đủ chưa? Còn cần CSRF/cookie, quyền Backend, HTTPS khi triển khai và không đưa mật khẩu vào response/log/storage.


**Bằng chứng USR-B:** Backend771 test/5806assertion và Pint179file PASS; frontend46/build/lint PASS (9cảnh báo cũ). Browser14ca đạt trên DBtest/Nginx8081:13lượt chính +ca14 chạy lại riêng, cùng build,0runtimeexception; xem Plan§12.9 cho matrix/lỗi harness đã xác định. Đã xem ảnhdesktop/mobile; mobilecao615pxform vừa khung, mobilethấp cuộn tới nút thao tác. Dev snapshot12phần JSON khớp,20bảng/16migration/1khách/0Admin; RUN_MIGRATIONS=false/Nhóm3pending, không ghi/migrate/seeder/Admin dev. Chưa kiểm thử quản trị bằng Admin trên8080. Tham khảo đúng số dòng hiện tại; khi sửa code phải đối chiếu lại.

**Đóng lượt USR-B:** dọn đúng4 nhân viên+5 tài khoảnAuth test cùng phiên liên quan sau guard, đóng tiến trình/container test riêng; giữ4container dev/MySQLhealthy. Không resetDB, ghi/xóa dev, stage/commit/push.


### 11.19. Bản đồ code USR-C — khóa/mở khóa

Theo DB-D57/USR-D02, chỉ Admin active được đổi status của user/resident/technician/guard; cấm mọi Admin và chính mình. Không đổi schema, xóa lịch sử hay sửa mật khẩu/role.

| Mở file | Điểm xử lý |
|---|---|
| `frontend/src/pages/admin/AdminUserDetailPage.tsx:64` | Ghép UserStatusAction; onChanged nhận kết quả thật, đặt thông báo và GET lại detail qua revision/useEffect dòng32 |
| `frontend/src/features/user-management/UserStatusAction.tsx:13` | Nút theo status; confirm dòng23 gọi API với trạng thái đích, ref chặn gửi lặp/đóng khi bận; lỗi dùng apiErrorMessage. Không có nút cho Admin |
| `frontend/src/features/user-management/api.ts:26` | changeUserStatus: fetchCsrfCookie → PATCH /users/{id}/status, body chỉ status; http gửi cookie/X-XSRF-TOKEN. userStatusSchema ở schemas.ts:19 |
| `backend/routes/api.php:54` | PATCH /api/v1/users/{user}/status; auth:sanctum → active → role:admin → spa, chỉ ID số |
| `backend/app/Http/Requests/User/UpdateUserStatusRequest.php:24` | rules chỉ active/locked và cấm trường hồ sơ/quyền/mật khẩu; validated('status') tới Controller |
| `backend/app/Http/Controllers/Api/V1/AdminUserController.php:46` | updateStatus tìm ID, authorize Policy, gọi Service rồi AdminUserResource tối thiểu; không trả legal/password/hash |
| `backend/app/Policies/UserPolicy.php:25` | changeStatus kiểm tra người gọi Admin active, khác ID, target thuộc4role được phép |
| `backend/app/Services/AdminUserService.php:98` | changeStatus dùng transaction + lockForUpdate dòng users; kiểm tra Policy lại sau khóa, chỉ save khi khác trạng thái, gửi lặp không toggle. Không ghi contracts/invoices/payments hoặc xóa session hàng loạt |
| `backend/app/Http/Middleware/EnsureActiveAccount.php:12` | handle kiểm tra trạng thái tài khoản trên request xác thực; locked thì logout, invalidate session và trả403. Request sau không còn phiên sẽ401. AuthService::login chặn tài khoản locked trước khi đăng nhập |

**Luồng thực hành:** mở ADM-10 → Khóa tài khoản → xác nhận → Network thấy PATCH /api/v1/users/ID/status với {status:"locked"}, cookie phiên và XSRF → Controller/Policy/Service UPDATE users.status → JSONdata tối thiểu → React GET lại detail và hiển thị Đã khóa/Mở khóa. Hủy không gửi PATCH. Mở khóa gửi active, giữ mật khẩu cũ. Muốn xem lại trong danh sách: GET users?q=...&status=locked&page=1 (bộ lọc cũ đã có).

**Khi sửa code:** đổi thông báo/nút ở UserStatusAction; đổi payload ở api.ts/schema và Request đồng bộ; đổi quyền chỉ ở Policy sau duyệt; đổi thao tác ghi ở changeStatus. Không thêm quyền vào React để thay thế Backend. 401/403/419/500/mất mạng dùng thông báo thật, không tự đổi badge khi API thất bại. Trạng thái có thể khác ở thời điểm ghi, nên Service phải đọc lại dưới khóa dòng (ngăn hai transaction sửa cùng dòng cùng lúc).

**5 câu hỏi bảo vệ:** (1) Khóa khác xóa thế nào? Chỉ đổi users.status, mọi khóa ngoại và lịch sử giữ nguyên. (2) Phiên đang đăng nhập có còn dùng được? Request tiếp đọc trạng thái từ DB và middleware chặn/hủy phiên. (3) Bấm mở khóa có đổi password/role không? Không, chỉ PATCHstatus và login lại bằng mật khẩu cũ. (4) Vì sao vừa Policy ở Controller vừa kiểm tra sau row lock? Quyền hiển thị không đủ và target đọc trước có thể đã thay đổi. (5) Gửi yêu cầu khóa2lần có mở lại không? Không; API đặt trạng thái đích explicit, không toggle. Tests còn so toàn bộ dữ liệu/hợp đồng/hóa đơn/payment trước/sau.


### 11.20. Bản đồ code USR-D — sửa duy nhất họ tên

DB-D58/USR-D03 đã duyệt. Admin sửa full_name của tài khoản đang xem; không mở tự sửa cho vai trò khác. Giữ nguyên mọi trường định danh, mật khẩu, role/status và pháp lý; không schema/migration.

| Mở file | Hàm/điểm xử lý |
|---|---|
| `frontend/src/pages/admin/AdminUserDetailPage.tsx:98` | UserNameForm trong Modal có sẵn; onSaved đóng, GET lại detail qua revision. Nếu sửa chính mình thì auth.refresh() gọi /auth/me để navbar đổi tên thật |
| `frontend/src/features/user-management/UserNameForm.tsx:24` | submit: RHF/Zod, ref chặn gửi lặp, API thành công mới onSaved; lỗi422 tại full_name. Hủy/unmount bỏ thay đổi chưa lưu |
| `frontend/src/features/user-management/api.ts:32` | updateUserName gửi PATCH /users/{id}, body chỉ full_name; fetchCsrfCookie/http.withCredentials dùng cookie+XSRF; schema tái dùng quy tắc họ tên đã có |
| `backend/routes/api.php:55` | PATCH /api/v1/users/{user} → updateName; cùng middleware bảo vệ như status, không mở PUT/DELETE |
| `backend/app/Http/Requests/User/UpdateUserNameRequest.php:22` | rules: required/string/max120; mọi trường status/role/email/phone/password/legal đều missing. Laravel trim tên trước validation |
| `backend/app/Http/Controllers/Api/V1/AdminUserController.php:53` | updateName: tìm/authorize, chỉ validated('full_name') tới Service, trả Resource tối thiểu |
| `backend/app/Policies/UserPolicy.php:32` | updateName chỉ Admin active; khác changeStatus dòng25 cấm targetAdmin/self |
| `backend/app/Services/AdminUserService.php:120` | updateName: transaction, row lock, kiểm tra Policy lại; chỉ gán full_name khi khác, không chạm bảng liên quan. QueryException được báo lỗi an toàn, không SQL/bindings/tên riêng |

**Luồng:** Sửa họ tên → form nhận tên thật → nhập tên mới → submit → PATCH {full_name:"..."} → Laravel kiểm tra quyền/input → UPDATE users.full_name/updated_at → JSONdata tối thiểu → GET detail và /me nếu cần. Tìm lại bằng GET users?q=tên mới&page=1; tên hiển thị ở nơi đọc quan hệ User có thể thay đổi theo tên mới, nhưng không sửa dữ liệu/tệp hợp đồng.

**Cách kiểm tra/sửa:** DevTools Network lọc users; xem PATCHbody chỉ1trường, HTTP200 rồi GET. Đổi validation tại schema+UpdateUserNameRequest; đổi lưu tại updateName; đổi lỗi/nút tại UserNameForm và onSaved. API/Spec cùng đổi nếu mở thêm trường sau duyệt. Profile API không thay được status; statusAPI vẫn không khóaAdmin, dù Admin được sửa tên.

**Câu hỏi bảo vệ:** (1) Vì sao tên trùng được? full_name không có UNIQUE, định danh đăng nhập là email/SĐT. (2) Vì sao không dùng request.all()? Chỉ validated và một trường explicit ngăn đổi lén role/password. (3) Vì sao cần /me sau tự sửa? Navbar dùng AuthContext riêng, phải đọc dữ liệu mới từ server. (4) Tên hợp lệ nhưng DB lỗi? Transaction hủy, lỗi500 an toàn, không báo lưu thành công giả. (5) Sửa tên có đổi quyền hoặc lịch sử không? Không; Policy kiểm tra Admin, chỉ1trường được ghi và test đối chiếu toàn bộ quan hệ trước/sau.


**Kiểm chứng tích hợp USR-C/D (24/10):** Backend867test/6970assertion PASS/Pint183file; frontend52test/build/lint PASS (9cảnh báo cũ). Browser13status(CKr0QSXf) +12họ tên/hồi quy(CldKYjey) đạt,0runtimeexception; NAME07 chứng minh tựsửa tên cập nhật/me/navbar và vẫnkhôngkhóaAdmin, NAME11 kiểm traStatus sauName. Chi tiết/ma trận/file tại Plan§12.10–11; đãxem ảnhmobile/desktop. Snapshotdev12phần JSON khớp:20bảng/16migration, RUN_MIGRATIONS=false/Nhóm3pending; chưaCRUDAdmindev. Dọn đúngfixture/phiêntest và dừngtestriêng, giữ4containerdev/MySQLhealthy. Khôngschema/migrate/ghi/xóa dev/stage/commit/push. Chỉfull_name được sửa; các trường địnhdanh/pháp lý vẫn chỉđọc.

### 11.21. Bản đồ code LEASE-A / CTR — hợp đồng nháp

Chỉ nháp và đọc hợp đồng; chưa kích hoạt/thu cọc/dịch vụ/điều khoản/Thanh lý. `end_date` là ngày cuối được ở (inclusive, có tính ngày đó), lớn hơn ngày bắt đầu; đã sửa comment Model theo DB-D43, không sửa migration cũ. Phạm vi/API/AC tại brief§24; bằng chứng mới và checkpoint thật tại Plan§12.12–13.

| Mở file và tìm | Chức năng |
|---|---|
| `frontend/src/pages/admin/AdminContractsPage.tsx:26` | effect gọi getContracts với page/filters; tìm kiếm và phân trang phía server, không lọc mock |
| `frontend/src/pages/admin/AdminContractNewPage.tsx:20` | tải đủ lựa chọn phòng/người thuê; cùng trang dùng cả `/new` và `/:contractId/edit` |
| `frontend/src/features/contracts/DraftContractForm.tsx:62` | submit: RHF/Zod, kiểm tra sức chứa, ref chặn gửi lặp, gọi saveDraftContract; lỗi server đưa về đúng bước |
| `frontend/src/features/contracts/api.ts:39` | saveDraftContract: lấy CSRF cookie rồi POST/PATCH qua http có cookie phiên; getAllOptions dòng19 duyệt đủ phân trang |
| `frontend/src/pages/admin/AdminContractDetailPage.tsx:35` | confirmDelete gọi DELETE thật, thành công204 mới về danh sách; hủy không gọi API |
| `backend/routes/api.php` | tìm contracts.index/show/store/update/destroy; auth:sanctum→active→role:admin, ghi thêm spa/CSRF |
| `backend/app/Http/Requests/Contract/StoreContractRequest.php:28` | rules: allowlist (danh sách trường được nhận), ngày/tiền/số người/ghi chú, trường vòng đời phải missing kể cảNULL |
| `backend/app/Http/Controllers/Api/V1/ContractController.php:37` | store nhận validated, kiểm tra Policy, gọi Service, trả Resource201; các hàm index/show/update/destroy tương tự |
| `backend/app/Services/ContractService.php:70` | create trong transaction (giao dịch tất cả cùng thành công hoặc cùng hủy); khóa phòng→tài khoản, lưu statusdraft/codeNULL/depositunpaid |
| `backend/app/Services/ContractService.php:96` | update khóa phòng/tài khoản/hợp đồng, ghép PATCH với dữ liệu hiện tại rồi kiểm tra lại; FK đã đổi thì409, không ghi đè dữ liệu mới |
| `backend/app/Services/ContractService.php:125` | delete chỉ nháp không có dữ liệu con; xóa mềm ghi deleted_at, không xóa phòng/tài khoản/lịch sử |
| `backend/app/Policies/ContractPolicy.php:11`, `backend/app/Http/Resources/ContractResource.php:10` | chỉAdmin active; JSONdata tối thiểu, không password/token/CCCD |

**Luồng thực tế:** bấm Lưu bản nháp → submit → POST `/api/v1/contracts` với room_id/user_id/ngày/tiền/số người/note → Laravel xác thực cookie và CSRF → Request/Policy kiểm tra → Service đọc `rooms`, `users`, kiểm tra `contracts` active, rồi INSERT `contracts` trong transaction → Resource201 → React chuyển chi tiết và GET đúngID. Không đổi role người thuê hoặc room.status; tiền cọc trong nháp chưa có nghĩa đã nhận. MySQL hiện có schema Nhóm2 đủ cho luồng này; không cần Nhóm3dev.

**Thực hành API:** ví dụ minh họa, thay ID bằng ID thật có quyền: GET `/api/v1/contracts?status=draft&room_id=21&user_id=42&q=Nguyen&page=1`. Bộ lọc kết hợp AND; q tìm literal trong mãHD/phòng hoặc tên/email/SĐT người thuê. Response `{data:[...],links,meta}`; q không tìm note. Mở DevTools→Network→contracts, xem Query String/Request Payload/Status; cookie phiên tự gửi, không sao chép/log token. Muốn sửa giao diện: Form/baPage; đổi cách gọi: api.ts; đổi validation: schemas.ts + FormRequest; đổi truy vấn: paginate/query; đổi dữ liệu trả: Resource. Nếu đổi nghiệp vụ phải duyệt Spec trước.

**Câu hỏi bảo vệ:** (1) Tại sao lưu nháp chưa có mãHD? Mã chỉ sinh trong transaction kích hoạt, chưa làm nhánh đó. (2) Vì sao chọn phòng trống ở React vẫn kiểm tra lại Laravel? Dữ liệu có thể đổi sau khi tải, và client có thể gửi request trực tiếp. (3) Vì sao PATCH phải ghép dữ liệu? Chỉ gửi ngày cuối vẫn phải so với ngày bắt đầu đang lưu. (4) Xóa mềm khác xóa cứng? deleted_at che bản nháp khỏi query thường, vẫn giữ hàng; lịch sử liên quan bị409. (5) Khóa hàng để làm gì? lockForUpdate ngăn hai thao tác thay trạng thái/quan hệ đồng thời; thứ tự thống nhất tránh deadlock, retry3 và test kiểm tra không ghi đè FK đã đổi.

Kiểm thử liên quan: `backend/tests/Feature/Contracts/ContractDraftTest.php`, `frontend/tests/contracts.test.mjs`, `frontend/tests/contracts.browser.mjs`; helper CLI `ContractBrowserFixtures.php` chỉDB/accounttest có guard, không API sản phẩm. Kết quả mới chỉ ghi sau chạy tại Plan§12.13; không lấy867/6970+52 baseline làm bằng chứng Hợp đồng.

**Bằng chứng mới:**963Backend/7930assertion/Pint192file,58frontend/buildDTAoQ2di/lint0lỗi9cảnhbáocũ PASS;12/12browser +12/12liveAPI DBtest PASS,0runtimeexception. Đã xem ảnh desktop/mobile; dọn đúngfixture, dừngtest riêng. Dev có1Admin mới/cachesessionsđổi, không gọi snapshot khớp toàn bộ; schema/migrations nguyênvẹn và hash tài khoản khách cũ khớp. Chưa xác nhậnnguồnAdmin/phiênđăngnhập nên không tuyên bố đã nghiệm thuquảntrịdev. Cơ chế logout xoay remember_token là tác động bảo mật hợp lệ; test khóa vẫn kiểm tra mọi dữ liệu khác và401 ở request tiếp theo.

### 11.22. AUTH-14 — vì sao CLI nói KHOP nhưng Web trả422?

Chủ dự án xác nhận Admin mới do mình tạo bằngArtisan. Nguyên nhân nằm ở **nhập terminal**, không phải hash hai lần hay sai quyền: `setTrimmable(false)` giữ ký tự EnterLF trong phiên bảnSymfony hiện có. Nếu người vận hành gõ p rồiEnter, lệnh cũ hash p+LF; React inputpassword gửi p. CLI checker cũ cũng nhận p+LF nên báoKHOP sai về ý nghĩa. Không thể nhìn hashbcrypt để biết/loại bỏLF; phải khôi phục có kiểm soát, không tự sửaDB.

| Mở file/hàm | Vai trò |
|---|---|
| `frontend/src/pages/public/LoginPage.tsx` submit; `features/auth/api.ts` login; `schemas.ts` loginSchema | Gửi đúng {identifier,password}, lấyCSRF trướcPOST; giữ nguyên password, không có lỗiđổitêntrường |
| `backend/app/Http/Requests/Auth/LoginRequest.php` prepareForValidation/rules | Chỉ chuẩn hóa identifier, không đổi password |
| `backend/app/Services/AuthService.php:41` login, dòng64 | Tìm đúng một tài khoản, attemptWhen kiểm tra mật khẩu; false→ValidationException identifier422. Không yêu cầu emailverified/roleAdmin đểlogin; locked có403riêng |
| `backend/app/Console/Commands/CreateAdminCommand.php:39` | Gọi helpermới trướcvalidator vàModelhashed; thay askHiddenPassword cũ trả thẳngchuỗiterminal |
| `backend/app/Support/HiddenPasswordInput.php:10` ask | Nhậpẩn/noFallback/noTrim, chỉbỏ1LF/CRLF/CR cuối; giữ spaces/Unicode/giớihạn72byte |
| `backend/app/Console/Commands/ResetAdminPasswordCommand.php:24` handle | Người vận hành chọn Admin active, nhập mật khẩu mới ẩn hai lần và xác nhận (mặc định Không); khóa hàng và kiểm tra lại để chống ghi đè, chỉ đổi password/remember_token/updated_at |

**Cách bảo vệ:** (1) Hash khác mã hóa thế nào? Hash một chiều, không “giải mã rồi xóaEnter” được; nhập mật khẩu mới và hash lại. (2) Tại sao không trim()? Trim mất spaces người dùng cố ý đặt; chỉ bỏ dấu kết thúc dòng của giao thức nhập terminal. (3) Vì sao test cũPASS? expectsQuestion giảlậpgiátrịkhôngcóEnter; cần bộđọcSymfony thật vàTTY thật, không chỉ mock. (4) Vì sao không thêmLF ởAuthService? Làm lỏng so khớp mật khẩu và che dữ liệu cũ sai; sửa nơi sinh lỗi, khôi phục bằngCLI đượcchủdựánkiểmsoát. (5) Reset ảnh hưởng phiên thế nào? Đổi passwordhash +remembertoken; Sanctum so hash trongsession và buộc đăng nhập lại, client lấyCSRFmới.

**Bằng chứng:** trướcfix8caLF/CRLF→422; saufix36test/1147assertionPASS, Pint197file vàfrontendbuild/lintPASS. TTY thực tế trướcplainfalse/LFtrue, sauplaintrue/LFfalse; tất cả trênDBtest vàrollback, khôngmigration. Full963/7930 là lịch sử, chưa chạy lại vì lệnhfullsuite cóschema/migrationtests. Admindev chưa đổi bởiagent; chủdựánđồngý tựreset, còn chờ đăngnhậpthànhcông8080. Chi tiết Plan§12.14; không đưa password/hash vào tài liệu/log.

### 11.23. LEASE-B — dịch vụ hợp đồng nháp và kiểm chứng Admin dev

Chủ dự án đã tự reset và đăng nhập Admin thành công. Agent đọc được các trang quản trị8080 và giữ phiên sau F5/nâng PHP; không thực hiện CRUD trên dữ liệu dev. Dịch vụ nháp thực thi Q7/DB-D59: chọn dịch vụ và số lượng, Laravel lấy giá danh mục để lưu snapshot (bản chụp đơn giá). Giá danh mục đổi không sửa giá đã lưu. Không có tính tiền hóa đơn tại React.

| Chức năng / mở file | Hàm và vị trí chính | API / bảng |
|---|---|---|
| `frontend/src/pages/admin/AdminContractDetailPage.tsx` | Ghép `ContractServicesPanel`; `getContract` tải chi tiết, `reload` lấy lại hợp đồng khi xung đột | GET /api/v1/contracts/{id}; contracts, rooms, users |
| `frontend/src/features/contracts/ContractServicesPanel.tsx:33` | `DraftServicesForm.submit`: RHF/Zod kiểm tra, chặn gửi lặp; chỉ cập nhật giao diện khi server thành công; `ContractServicesPanel` dòng82 tải danh mục, hiển thị snapshot/không cho sửa active | Form chỉ gửi `{services:[{service_id,quantity}]}`; quantity không phải tiền |
| `frontend/src/features/contracts/api.ts:54` | `getContractServiceOptions` duyệt đủ trang; `saveDraftContractServices` dòng58 lấy CSRF rồi http.put, cookie phiên do http.ts gửi | GET /api/v1/services?page=…; PUT /api/v1/contracts/{id}/services |
| `backend/routes/api.php:57` | route PUT → `ContractController::updateServices` dòng63 → `UpdateDraftServicesRequest` | auth:sanctum + active + role:admin + spa/CSRF + ContractPolicy; request allowlist không nhận giá/ngày/status |
| `backend/app/Services/ContractService.php:136` | `updateDraftServices`: transaction (giao dịch tất cả cùng thành công), khóa cha rồi hợp đồng/dòng; kiểm tra toàn mảng, lấy giá ở services, giữ giá dòng cũ | contracts, contract_services, services; lỗi422 hoặc409, lỗiDB rollback |
| `backend/app/Services/ContractService.php:194` | `lockSimpleDraftServices` chặn lịch sử/những khoảng phức tạp; `update` đồng bộ ngày bắt đầu nháp đơn giản | Không sửa active hoặc hóa đơn; không cần Nhóm3 trên dev |
| `backend/app/Http/Resources/ContractResource.php:30` | Chỉ chi tiết có contract_services; quantity chuỗi DECIMAL, unit_price nguyên VND/NULL, thông tin service tối thiểu | React hiển thị đơn giá đã lưu và khoảng hiệu lực; không cộng tổng hóa đơn |

**Tự lần theo một request:** mở ADM-13 → chọn dịch vụ → đổi số lượng → Lưu dịch vụ → DevTools/Network tìm PUT `/api/v1/contracts/ID/services`. Ví dụ minh họa với ID có thật trong môi trường của bạn: `{"services":[{"service_id":7,"quantity":2}]}`. Không gửi unit_price; đổi quantity hợp lệ để kiểm chứng số lượng, gửi unit_price qua công cụ test chỉ trên DBtest phải422. Xem Response `data.contract_services`, rồi F5 để thấy dữ liệu Laravel đọc lại MySQL. Gỡ hết gửi mảng rỗng; không xóa hợp đồng. Dòng cũ giữ snapshot; muốn giá mới thì gỡ/lưu trước và chọn lại. Giá hiển thị danh mục là giá tải gần nhất; giá chính thức của dòng mới được server lấy khi lưu nháp, cần xem lại trước kích hoạt.

**Câu hỏi bảo vệ:** (1) Vì sao không gửi giá từ React? Client có thể bị sửa; server đọc danh mục đã duyệt. (2) Vì sao đổi danh mục không đổi hợp đồng? contract_services lưu snapshot, bảo vệ thỏa thuận đã lưu. (3) Khóa và transaction khác nhau? Khóa tuần tự hóa thao tác cạnh tranh; transaction bảo đảm không ghi nửa mảng. (4) React ẩn nút có đủ bảo mật? Không; middleware/Policy vẫn từ chối request trái quyền. (5) Vì sao chưa có nút kích hoạt? Điều khoản P4/P5 và quy tắc cọc Q15 chưa duyệt, không được giả dữ liệu để bỏ qua.

**Runtime cần hiểu:** Dockerfile pin PHP8.3.36 và php.ini tắt upload progress trước khi phân tích request, khắc phục rủi ro runtime theo thông báo PHP21–23/10. CLI và FPM là hai cách chạy PHP; GET health qua Nginx xác minh phiên bản đang phục vụ web, không chỉ nhìn php -v. Compose mặc định RUN_MIGRATIONS=false nên thay container app không nâng schema. Laragon host8.3.30 chưa cập nhật, không dùng phục vụ8080. Kết quả mới và giới hạn kiểm thử ở Plan§12.15; không dùng browser/fullsuite lịch sử thay bằng chứng mới.

**Bài học AUTH-15 từ kiểm thử thật:** `backend/bootstrap/app.php:28` cấu hình `redirectGuestsTo('/login')`. Nếu người chưa được Sanctum xác thực mở trực tiếp API bằng trình duyệt (AcceptHTML, thiếu Origin/Referer SPA), Laravel mặc định tìm routeBackend có tênlogin trước khi ném AuthenticationException. Dự án chỉ có trang React/login nên callback cũ gây RouteNotFoundException500, chưa tới rendererJSON. Dùng URLReact thay tênroute tránh lỗi đó; bộ xử lý api/* vẫn trả401JSON, không mở quyền hoặc tự tạo phiên. `backend/tests/Feature/Auth/ApiUnauthenticatedResponseTest.php` kiểm tra5route×4Accept, trước15fail/5pass, sau20pass; browser đã kiểm tra lại URLcũ. Không suy rằng có cookie là mọi request bất kỳ tự được Sanctum coi là SPA.

**Kết quả chốt:**1038test/9348assertion/Pint201file;60frontend/build/lint PASS (9cảnhbáocũ).12tìnhhuốngCUA +10liveAPI trênDBtest,3hồi quyUI bundlecuối sau sửa cảnhbáorefs; không cộng thành một lượt tự động. Dev chỉsessionđổi,20bảng/16migration và dữliệunghiệpvụ/users nguyênvẹn;4fileNhóm3pending. Localcheckpoints8bab41e/dc027eb/df59765/503d38c, không push. Bản đồ dùng `DraftServicesForm.submit(event)` dòng33 và `ContractServicesPanel` dòng82; cờrefchỉđọc tronghàmsựkiện, không trongrender. Chưa kích hoạt/cọc/dịchvụactive/Thanh lý; không tựduyệtP4–P8/Q15 hoặc seeddev.

### 11.24. Phòng công khai dùng dữ liệu thật — 27/10/2026

`RoomListPage` đọc URL bằng `readRoomSearch` trong `features/rooms/schemas.ts`, submit `RoomFilterBar` gọi `roomSearch` rồi đổi URL. `getPublicRooms`, `getPublicRoomOptions`, `getPublicRoom` trong `features/rooms/api.ts` dùng http chung gửi GET `/api/v1/public/rooms`, `/filters`, `/{id}`; không lấy dữ liệu quản trị hoặc dùng mock khi lỗi. URL giữ tất cả tiện nghi, trang và sort, nên F5/Back/Forward khôi phục bộ lọc. AbortController hủy request cũ, khóa request gắn với URL ngăn response cũ ghi đè trang mới. Cọc lấy `deposit_amount` của API, không mặc định bằng giá thuê.

`backend/routes/api.php` → `PublicRoomController::index/show/filters` → FormRequest/RoomPolicy → `PublicRoomService::paginate/find/filterOptions` → Room/Building/Amenity và các bảng `rooms`, `buildings`, `room_amenities`, `building_amenities`, `amenities`. Query luôn `available AND is_public`; LOCATE dùng tham số binding (giá trị truyền riêng, không nối SQL). Mỗi tiện nghi được lọc bằng OR tòa/phòng, nhiều tiện nghi kết hợp AND. SoftDeletes loại tiện nghi đã lưu trữ; `PublicRoomResource` trả hợp tiện nghi duy nhất, chỉ các trường công khai. Eager loading (tải trước quan hệ) tránh truy vấn lặp từng phòng. Laravel trảdata/links/meta; React hiển thị phân trang dựa trên meta, không tự lọc toàn bộ dữ liệu trong trình duyệt.

`RoomDetailPage` không tìm thấy là404thật, không chọn phòng mẫu. `HomePage` dùng cùng API/card, footer lọc giá bằng query canonical; `/book` giữ đường dẫn nhưng thông báo chưa nhận lịch. Ảnh/giá dịch vụ/hotline chỉ được đưa vào khi có nguồn thật. Contact và các module chưa nối vẫn có nhãn; giao diện không đồng nghĩa nghiệp vụ hoàn thành.

**Câu hỏi bảo vệ:** (1) Vì sao phòng riêng trả404 thay vì lộ trạng thái? Public chỉ có tập phòng được công bố. (2) Vì sao tiện nghi tòa không sao chép xuống phòng? Hợp hai quan hệ bảo toàn nguồn và tránh trùng. (3) Vì sao không lấy giá từ mock? Giá/cọc phải có nguồn backend, kể cả0. (4) Vì sao cầnURL+AbortController? Để điều hướng khôi phục đúng bộlọc và request cũ không đè kết quả mới. (5) Vì sao vẫn chưa có đặt lịch thành công? VIEW chưa được tích hợp, không được giả mãAPT.

**Bằng chứng:** Plan§12.17 và TEST_MATRIX.md; full1091/9563, frontend68/build/lint,15liveAPI và các thao tácCUA thực. Đây là mức tích hợp trên DBtest, không phải nghiệm thuCRUDdev hay hoàn thànhFullMVP. P4/P5-B/Q15 được chốt mới DB-D61/62, thay trạng thái chưaduyệt ở ghi chép24/10; migrationdevvẫnchưacho phép.

### 11.25. Nền tảng điều khoản hợp đồng và cọc — chưa mở quy trình kích hoạt/thanh lý

`backend/database/migrations/2026_10_27_000001_add_termination_terms_to_contracts_table.php` thêm tám cột nullable đúng P4/P5-B. Migration M09 đã commit giữ nguyên. Dữ liệu cũ không bị gán điều khoản hoặc phí; `EarlyTerminationFeeType` có none/fixed/rent_multiple, Contract cast JSON/thập phân/Enum và có quan hệ người xác nhận. Các trường mới không vào fillable (tập trường được ghi hàng loạt).

`ContractTermsService::updateDraft` dòng48 kiểm tra Policy, validate input, transaction (giao dịch cùng thành công hoặc cùng hủy) và lockForUpdate (khóa bản ghi đang sửa). Chỉ draft được lưu snapshot; không lấy cấu hình tương lai để sửa hợp đồng cũ. `assertSignedTermsAndDeposit` dòng29 kiểm tra riêng điều khoản và cọc: cọc dương phải held+có thời điểm thu, cọc0 không cần xác nhận. Hàm này chưa phải toàn bộ quy trình kích hoạt và không tạo doanh thu/hóa đơn/payment.

`ContractTerminationFeeCalculator::calculate` dòng15 nhận Contract + ngày bàn giao YYYY-MM-DD, so ngày theo múi giờ nghiệp vụ. Trả đúng hạn là end_date+1; trả ngay end_date vẫn là sớm một ngày. Trước hạn đọc điều khoản đã lưu; thiếu điều khoản thì lỗi, không tự tính một tháng hoặc tự miễn. `Money::multiply` dùng BCMath, HALF_UP đến đồng và chặn tràn số. Miễn toàn bộ yêu cầu mã thuộc snapshot điều kiện, người/thời điểm xác nhận và căn cứ; chưa có endpoint ghi xác nhận miễn, không coi dữ liệu test là quy trình thực tế đã hoạt động.

**Câu hỏi bảo vệ:** (1) NULL và none khác nhau? NULL chưa thỏa thuận, none đã thỏa thuận không thu phí. (2) Vì sao snapshot không đổi sau kích hoạt? Để giữ điều khoản đã ký. (3) Vì sao không dùng float cho hệ số tiền? Sai số nhị phân có thể làm lệch đồng; BCMath xử lý chuỗi thập phân. (4) Vì sao cọc0 không cần biên nhận? Không có khoản thực nhận; cọc dương vẫn phải xác nhận và không là doanh thu thuê. (5) Test calculator có chứng minh thanh lý chạy được không? Không; HTTP/UI, kiểm tra tài sản, final, cọc đối soát và các quyết định P còn chưa hoàn tất.

Full mã cuối1168/9784, Pint218; chi tiết Plan§12.18. Ba test rollback email đã được sửa để nhắm đúng migration khi có migration mới, không bỏ ràng buộc hoặc assertion. Không có migration dev, không nối React vào endpoint điều khoản chưa tồn tại.

### 11.26. U1 — diễn tập chuyển giá chung thành lịch sử giá từng tòa

File `backend/database/migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php` có `up` sao chép toàn bộ lịch sử cho các tòa hiện có, `down` chỉ gộp bản sao hoàn toàn giống nhau. Đây là migration chuẩn bị, **không** được lệnh migrate mặc định áp dụng; `UtilityPriceService` và React bảng giá hiện hành chưa chuyển API theo tòa. Không dùng bảng đã ALTER khi API vẫn ghi giá chung.

`BuildingUtilityPricesMigrationTest` gọi migration bằng đường dẫn tường minh trên DB test, so từng service_id/giá/ngày/timestamps, original ID và hóa đơn issued trước/sau; thử UNIQUE mới, tòa mới chưa có giá và rollback bị chặn khi giá hai tòa khác nhau. Không có React→API mới trong phần này. Bản đồ triển khai kế tiếp: Chi tiết Tòa nhà → API giá theo tòa cần duyệt contract → UtilityPriceService → utility_prices.building_id → MTR/INV lấy giá đúng tòa, vẫn giữ snapshot cũ. Không tự thay giá trong chỉ số hoặc hóa đơn đã phát hành.

**Câu hỏi bảo vệ:** (1) Vì sao không xóa UNIQUE cũ ngay? Nó còn đỡ khóa ngoại service_id; phải có index thay thế trước. (2) Vì sao giữ ID giá cũ? Tránh mất dấu lịch sử gốc trong chuyển đổi. (3) Vì sao tòa mới chưa có giá? Chủ dự án yêu cầu cấu hình trước khi tính tiền. (4) Vì sao rollback có thể bị từ chối? Giá đã khác giữa các tòa không thể gộp về một giá chung mà không mất thông tin. (5) Vì sao có commit migration mà dev chưa đổi? Chuẩn bị/test và cho phép chạy dev là hai quyền khác nhau.

### 11.27. Cài đặt hệ thống — đọc thật, lưu riêng từng khóa

`frontend/src/pages/admin/AdminSettingsPage.tsx::AdminSettingsPage` tải GET qua `features/settings/api.ts::getSettings`, hiển thị missing_keys và sáu khóa chỉ đọc. Hai `DaySettingForm::submit` dùng RHF/Zod, chỉ gửi `{value:int}` qua `saveDaySetting` sau CSRF cookie. `saved` cập nhật từ Resource trả về, không tự coi thao tác bấm là lưu thành công. GET/PUT401 hoặc403 gọi refresh danh tính để guard điều hướng theo phiên/quyền hiện tại.

Luồng backend có sẵn: `routes/api.php` → `SettingController::index/update` → Policy/FormRequest → `SettingService` → bảng `settings` → `SettingResource` → React. Chỉ invoice.due_days và contract.expiring_warning_days được sửa trong lát cắt; sáu khóa còn lại chỉ đọc. Số ngày1..365 không phải phép tính tiền và không sửa hóa đơn/hợp đồng đã phát sinh. Chi tiết bằng chứng Plan§12.20; 71 frontend test/build/lint, API11 nhóm và các thao tác browser được phân biệt rõ.

**Câu hỏi bảo vệ:** (1) Vì sao không có Lưu tất cả? Backend chỉ có giao dịch riêng cho từng khóa. (2) Vì sao không điền sẵn5/30? Khóa thiếu là chưa cấu hình, không có dữ liệu thật để suy mặc định. (3) Vì sao cần validate cả React và Laravel? React giúp nhập liệu, server mới quyết định dữ liệu được lưu. (4) Vì sao ngân hàng chỉ đọc không có QR? API chỉnh sửa/thanh toán thật chưa được tích hợp. (5) Vì sao test trên8082 không chứng minh dev đã đổi? App test dùng database/tài khoản riêng và fixture được khôi phục sau kiểm tra.
