# PROJECT STATUS & LEARNING — Mini Apartment Management

> **Mới nhất30/10:** CLOSE-02c đã thêm final-meter preview chỉ đọc vào ADM-14/API; code checkpoint `0f30770`. Full backend1335/12529 và test đích31/202PASS; frontend105/buildPASS/lint0lỗi9cảnhbáo, Pint323PASS. Không lưu final meter/invoice, không migration dev. Browser local bị tắt Work settings. Damage lines, final invoice, đối soát cọc và terminate chưa hoàn thành; CLOSE chưa xong. Plan§12.38, bản đồ§11.45. Các mốc cũ giữ lịch sử.

> **Hiện trạng 24/10/2026:** Admin dev đã tự reset/login; đọc quản trị/F5 đã kiểm chứng, không CRUD dev. CTR nháp +dịch vụ Q7 snapshot đã code/test, 12 tình huống browser và10ca liveAPI đã kiểm chứng; Backend1038/9348/Pint201file, frontend60/build/lintPASS. Docker PHP8.3.36 đã vá; Laragon host8.3.30 chưa đổi. Dev20bảng/16migration/RUN_MIGRATIONS=false/Nhóm3pending; chỉsessions đổi theo phiên thật, nghiệp vụ/users/schema không đổi. Checkpoint8bab41e/dc027eb/df59765/503d38c local; không push. Chi tiết mới Plan§12.15, bản đồ§11.23; các mốc trước giữ làm lịch sử.

| Thuộc tính | Giá trị |
|---|---|
| Cập nhật | 30/10/2026 — CLOSE-02c final-meter preview đã code/test đích; chưa nghiệm thu full CLOSE hoặc kiểm tra browser |
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

### 11.28. Tải mã trang quản trị khi cần

`frontend/src/app/adminPages.tsx` xuất18 wrapper React.lazy: callback import chọn named export thành default cho lazy, không đổi export của trang gốc. `router.tsx` vẫn dùng các element và đường dẫn cũ. Guard `RequireAuth` kiểm tra phiên/vai trò trước khi render AdminLayout/Outlet; `AdminLayout` đặt Suspense (khung chờ tải mã) quanh Outlet, giữ menu khi trang chưa sẵn sàng. Lazy đặt ngoài component để không tạo lại định danh ở mỗi render.

`RouteErrorPage` giữ404→NotFoundPage; lỗi tải module tới error boundary (màn hình bắt lỗi render) hiện thông báo an toàn và nút reload. Reload tạo lại cả entry/router để thử file mới sau mất mạng/deploy, không tự giả thành công. API/nghiệp vụ vẫn chạy như trước sau khi component được tải; không thêm cơ chế cache tiền.

**Câu hỏi bảo vệ:** (1) Vì sao import wrapper không tải luôn18 trang? Callback dynamic import chỉ chạy khi component được render. (2) Vì sao cần Suspense? Lazy chưa tải xong cần trạng thái chờ, không làm trắng giao diện. (3) Tách bundle có thay phân quyền không? Không, guard frontend và Policy backend vẫn riêng biệt. (4) Vì sao tính cả Button chunk? Nó là static dependency tải cùng entry, bỏ nó sẽ báo giảm quá mức. (5) Giảm24.2%JS có nghĩa nhanh hơn24.2%không? Không; tốc độ còn phụ thuộc mạng, cache, máy và API. Số đo/bằng chứng/giới hạn tại Plan§12.21.

### 11.29. U2 — dữ liệu chờ duyệt và tệp riêng tư

Hai file `backend/database/migrations/pending/2026_10_14_400019_create_attachments_table.php` và `2026_10_27_000003_create_meter_reading_submissions_table.php` chuẩn bị metadata tệp và bảng22. Migrate mặc định không tự chạy. `pending_slot` là cột sinh tự động: pending→1, trạng thái khác→NULL; UNIQUE phòng/dịch vụ/kỳ/slot chặn hai yêu cầu đang chờ nhưng giữ các lần từ chối/đã xử lý. `approved_meter_reading_id` UNIQUE giữ một chỉ số chính thức không bị hai yêu cầu nhận làm kết quả. Không tự sinh tiền/chỉ số khi lưu yêu cầu chờ.

`MeterReadingSubmission` cast chỉ số thành chuỗi2số lẻ, trạng thái Enum, ngày DATE; chỉ period/reading_date/current_reading được fill. Người gửi/phòng/hợp đồng/duyệt là trường server gán. `MeterReadingSubmissionPolicy::create` cần Resident active có hợp đồng active; `view` cho Admin hoặc Resident chủ yêu cầu active, kể cả đã thanh lý để xem lịch sử; `review` chỉ Admin active. Đây là quyền nền tảng, chưa phải validation/transaction gửi hoặc duyệt.

`Attachment` che path khỏi serialization, metadata không fill; morph alias meter_reading_submission nối về cha. `AttachmentPolicy::view` chỉ mở đúng alias/collection meter_reading_photo/disk private rồi gọi quyền view cha. `config/filesystems.php` tách root private=storage/app/evidence, không serve/url/symlink; root local vẫn khác để URL ký của disk local không đọc vòng qua Policy. Test tệp thật+HTTP framework tái hiện trước200/sau404 với cùng loại URL ký; unsigned trước/sau403. Không có upload/download controller hoặc màn hình React mới, nên chưa có luồng React→API U2 để truy vết.

**Câu hỏi bảo vệ:** (1) Vì sao tách pending khỏi meter_readings? Yêu cầu chưa duyệt không được tính tiền. (2) Vì sao UNIQUE dùng NULL cho lịch sử? MySQL cho nhiềuNULL, nhưng chỉ một slot1 đang chờ. (3) Vì sao không chỉ đặt serve=false? Disk khác trỏ cùng root vẫn có thể phục vụ cùng file. (4) Vì sao xóa bảng rollback bị chặn? Lịch sử nghiệp vụ và metadata không được tự xóa để khôi phục schema. (5) Test Policy có chứng minh duyệt chỉ số hoạt động không? Không; còn Request/API, tệp hợp lệ, MTR chính thức, transaction và kiểm tra UI. Trạng thái/bằng chứng tại Plan§12.22.

### 11.30. AG-UI — layout5vai trò và dữ liệu đã có

`frontend/src/app/router.tsx` đặt RequireAuth ngoài Admin/Resident/Staff layout. Staff có guard con riêng Technician và Guard; backend Policy không thay đổi. `features/auth/types.ts::accountDestination/profileDestination/safeDestination` chọn URL theo role thật từ Auth; giữ `/account/*` dùng chung để tương thích, không gọi đó là rò quyền Guest. `AccountActions` dùng menu hồ sơ/đăng xuất thật, không RoleSwitcher. `AccountProfile` chỉ hiển thị các trường me được phép, mọi thao tác chưa API bị khóa.

`BuildingRoomMatrix` gọi `getRooms` với building_id, duyệt đủ paginator rồi nhóm floor_number; không bỏ phòng thứ21trở đi. Chỉ render10tầng mỗi nhóm để không tạo hàng chục nghìn ô từ total_floors. `RoomContractsPanel` dùng contracts?room_id, phân trang và liên kết chi tiết; giá/cọc từ server. `AdminContractDetailPage` giữ ContractServicesPanel mounted phía sau tab ẩn để không mất trạng thái RHF khi đổi tab. `AdminResidentsPage` dùng users?role=resident; role và has_active_contract là hai điều khác nhau.

`UnavailableWorkspace` chỉ là khung giao diện chưa đủ bố cục riêng, không là API danh sách rỗng: số liệu—, tìm kiếm/lưu khóa, không nhận ảnh hoặc hiện thành công. Các trang dùng khung này vẫn Một phần trong SCREEN_INVENTORY. Contact dùng public/rooms/filters cho tên tòa có phòng công khai; không suy từ đó ra hotline/giờ/ảnh/địa chỉ. App đã bỏ AppProvider khỏi cây render; dữ liệu mẫu cũ nằm ngoài luồng chạy, nguồn Antigravity giữ nguyên.

**Câu hỏi bảo vệ:** (1) Guard React có thay backend Policy không? Không, chỉ định tuyến và trải nghiệm. (2) Vì sao số liệu chưa API không là0? 0 khẳng định đã truy vấn và không có, khác với chưa có nguồn. (3) Vì sao phòng phải duyệt nhiều trang? API giới hạn20dòng, sơ đồ phải đủ dữ liệu của tòa. (4) Vì sao role=resident không là đang thuê? Vai trò giữ lại sau thanh lý, đang thuê suy từ hợp đồng active. (5) Vì sao giữ panel dịch vụ khi đổi tab? Tránh mất input hoặc bỏ trạng thái đang gửi chỉ do đổi tab. Bằng chứng/thử nghiệm và giới hạn ở Plan§12.23; chưa hoàn thành FullMVP.

Bổ sung Home: `features/rooms/HomeInformationSections.tsx` nhận options/error/onRetry từ HomePage, render năm khối mới của nguồn và trạng thái chưa công bố giá. Cardtòa chỉ dùng id/nameAPI; building_id trong link là khóa chuẩn. `HomePage::reload` xóa result/options trước refetch để hiện loading đúng thay vì âm thầm giữ dữ liệu cũ. `RoomFilterBar` dùng Controller cho building_id: React giữ giá trị từ RHF khi optiontạm được thay bằng tên tòa thật; registeruncontrolled trước đó có thể để native select trôi về optionđầu dù URL vẫn giữ bộ lọc. Backend/SQL/schema không đổi. Ca browser lỗi503/phục hồi và dropdownasync nằm ở TEST_MATRIX AG-T11/12.

Kết quả cuối của Home: sau cleanup, API200 cho0phòng/khôngtòa công khai, không còn card hoặc tên fixture; vẫn7section. AG-T12 sauF5 đã hiển thị đúng tên/value tòa, chọnTấtcả giữriênggiá vàclear xóatoànquery. Checkpointcode7f66ad6; frontend72/build/lint0lỗi8cảnhbáocũ. Bộ kiểmtra nguồn cuối xác nhận52cặpfile đều tồn tại,24API/4UIđủ khớp bảng và78hashprototype không đổi. Chưa nghiệm thu48màn còn một phần hoặc các API nghiệp vụ chưa có; xem Plan§12.23.

### 11.31. LEASE-C — từ xác nhận cọc tới hợp đồng hiệu lực

`features/contracts/api.ts` gọi PUT terms/POST deposit/GET activation-context/POST activate. Schema giữ chỉ số/hệ số dạng chuỗi, tiền là số nguyên VND. `ContractTermsPanel` lưu snapshot; `ContractLifecycleActions` gửi amount/revision đã đọc và chỉ báo thành công sau response. Trang chi tiết khóa chung khi ghi; lỗi 401/403 yêu cầu Auth refresh để guard xử lý. `Modal` giới hạn chiều cao theo viewport để form dài cuộn được, không cắt nút Đóng.

`ContractLifecycleRequest` chỉ nhận trường của từng action; middleware Admin/SPA và Policy giữ quyền server. `ContractService::confirmDeposit` khóa room → user → contract → services, so amount/revision rồi gán held/paid_at; không tạo invoices/payments. `activate` đọc lại điều khoản/cọc/mốc chốt trong transaction, kiểm hợp đồng cũ và chỉ số phòng trống riêng, giữ snapshot dịch vụ định kỳ, thêm hai metered, sinh mã HD theo ID và đổi room/user/contract cùng lúc. `Contract::lifecycleRevision` hash nội dung + dịch vụ đã lưu để phát hiện cả hai thay đổi cùng giây; không chỉ dựa updated_at. `ContractResource` trả snapshot/thời điểm/revision cho React hiển thị và F5.

Bảng liên quan: contracts, contract_services, rooms, users, services; đọc meter_readings. Action này không ghi invoices/payments/meter_readings. `ContractLifecycleTest` kiểm quyền/dữ liệu/snapshot/rollback; `ContractActivationConcurrencyTest` dùng hai process PHP/MySQL test. Helper mới kiểm ID lượt để dọn cả hợp đồng active, không nới cleanup draft cũ.

Câu hỏi bảo vệ: (1) Vì sao cọc không là payment? Cọc được giữ/đối soát riêng, không phải doanh thu thuê. (2) Cọc 0 có tạo held giả không? Không cần thu, vẫn kích hoạt khi đủ điều kiện. (3) Vì sao cần revision ngoài amount? Người/phòng/điều khoản có thể đổi dù amount giữ nguyên. (4) Vì sao không chỉ lấy final mới nhất? Sau final có thể có chỉ số phòng trống hợp lệ; phải kiểm final cũ riêng rồi so mốc thực gần nhất. (5) Test PASS có nghĩa thanh lý xong không? Không; phạm vi này chỉ nhận cọc/kích hoạt. Bằng chứng: Plan §12.24, LC-T01…09.

### 11.32. U1 — lịch sử giá riêng từng tòa

`AdminUtilityPricesPage` giữ building_id/service_id/page trong URL; `UtilityPriceForm` validate RHF/Zod rồi `features/utility-prices/api.ts` gọi GET/POST `/api/v1/utility-prices` bằng client http/CSRF. `BuildingUtilityPricesPanel` tái dùng bảng lịch sử tại chi tiết tòa, không dùng giá giả. Response cũ bị bỏ khi scope thay đổi; hết phiên yêu cầu Auth refresh.

Route/Policy Admin giữ nguyên; `StoreUtilityPriceRequest` kiểm tòa, dịch vụ, số nguyên VND/ngày01 và trùng scope. `UtilityPriceService::create` kiểm schema, khóa tòa → dịch vụ, chỉ tìm kỳ meter_readings của phòng thuộc đúng tòa rồi thêm utility_prices. Model nối building/service; Resource trả building{id,name}. Không cập nhật reading, invoice_items hoặc invoices. Pending ALTER giữ nguyên, test tường minh; dev chưa chạy nên API503. Bằng chứng tự động/API/browser/cleanup tại Plan§12.25; chưa có luồng MTR→hóa đơn thật.

Câu hỏi bảo vệ: (1) Vì sao giá mới không thay hóa đơn cũ? Reading/item đã lưu snapshot và action chỉ thêm giá. (2) Vì sao tòa khác không chặn D33? Kỳ đã ghi được lọc theo room.building_id và service_id. (3) Vì sao không lấy dòng đầu làm giá hiện hành? Lịch sử có thể chứa giá tương lai, khác tòa hoặc dịch vụ. (4) Vì sao DDL không nằm trong RefreshDatabase? MySQL tự commit ALTER, cần up trước transaction và rollback fixture trước down. (5) Hai POST trùng cùng scope có tạo hai giá không? Validation/khóa/UNIQUE bảo vệ, live race ghi đúng một dòng.

### 11.33. U3 — nhiều lượt thuê trong cùng kỳ

Pending `2026_10_28_000001_scope_final_meter_readings_to_contracts.php` thực hiện DB-D65/68 bằng ba generated columns (cột tự tính) STORED và UNIQUE có điều kiện: periodic có contract theo contract/service/period; periodic vacancy theo room/service/period; final theo contract/service. CHECK final không được NULL contract. Up đối chiếu lịch sử sai phòng/hợp đồng hoặc final trùng trước một ALTER atomic; down chặn khi dữ liệu mới không còn phù hợp UNIQUE cũ. Không đổi enum/M14 hoặc mất lịch sử.

`FinalMeterReadingScopeMigrationTest` dùng MySQL test, không RefreshDatabase/DDL trong transaction fixture; dọn đúng ID rồi khôi phục schema. Bằng chứng8/106 và fullsuite1227/10635 tại Plan§12.26. Chưa có React/API của U3 riêng; MTR đang triển khai, không coi UNIQUE là đã bảo đảm toàn bộ cách tính tiền.

Câu hỏi bảo vệ: (1) Vì sao periodic cũng theo hợp đồng? Chỉ số A không được chặn chỉ số B khi đổi người thuê cùng tháng. (2) Vì sao tách vacancy? contract_id NULL không thể tự chống trùng theo UNIQUE hợp đồng. (3) Vì sao final theo contract không có period? Một lần thanh lý chỉ chốt một lần mỗi dịch vụ, đổi kỳ không được né ràng buộc. (4) Vì sao không tự rollback? UNIQUE cũ không chứa được nhiều hợp đồng cùng phòng/kỳ, cần bảo toàn lịch sử để đối chiếu.

### 11.34. MTR — nhập chỉ số chính thức và lưu snapshot

`AdminMeterReadingsPage` đọc bộ lọc từ URL, gọi `features/meter-readings/api.ts` qua http/CSRF; `MeterReadingForm` dùng RHF/Zod, chỉ gửi phòng/dịch vụ/kỳ/ngày đo/chỉ số mới. API GET/POST `/api/v1/meter-readings` và GET `/api/v1/rooms/{room}/meter-reading-context`. Form xem mốc để hỗ trợ nhập, POST vẫn kiểm lại toàn bộ, React không tính tiền. Options duyệt hết phân trang; URL/key ngăn response của bộ lọc cũ hiện thành dữ liệu mới.

`MeterReadingRequest`/Policy chỉ Admin đang active, chặn trường tiền/owner/kind do client gửi. `MeterReadingService::withLockedContext` khóa room→user→contract→subscriptions→service→readings→invoices trong transaction (giao dịch nguyên khối). `plan` kiểm khoảng tiêu thụ, kỳ liền tiếp/mốc đầu/bàn giao/gap và giá cùng tòa hiệu lực. `storeBatch` dùng BCMath/Money, lưu previous/current/consumption/unit_price/amount và contract_id thật; một dòng sai rollback toàn bộ. Resource trả snapshot, không sinh invoice/payment. Bảng đọc: rooms/users/contracts/contract_services/services/utility_prices/meter_readings/invoices; bảng ghi duy nhất meter_readings.

Test30/378, full1257/11013 và browser/API/giới hạn ở Plan§12.27/MTR-A01…10. Câu hỏi bảo vệ: (1) Vì sao mốc0 không được tự điền? Nó tạo tiêu thụ giả nếu thiếu bàn giao. (2) Vì sao cần khóa service? U1 đổi giá và MTR phải tuần tự để D33/snapshot nhất quán. (3) Vì sao chọn period riêng reading_date? Kỳ là tháng tiêu thụ, ngày đo là thực tế, có thể nhập trễ. (4) Tại sao hình ảnh chưa là chỉ số chính thức? U2 cần Admin duyệt qua cùng nghiệp vụ, không tự sinh tiền từ ảnh. (5) Vì sao có context vẫn kiểm POST? Giá, chỉ số hoặc hóa đơn có thể thay đổi sau khi mở form.

### 11.35. U2 — ảnh cư dân tách khỏi chỉ số chính thức

`ResidentOverviewPage` ghép `ResidentMeterReadingsPanel`; RHF/Zod gửi multipart (biểu mẫu kèm tệp) qua `features/meter-submissions/api.ts`/http. API `/api/v1/meter-reading-submissions`: GET list/context/detail/photo, POST store/approve/reject. `SubmissionList` tái dùng ở tab Admin, lọc status/period/room/page; `PrivateMeterPhoto` tải blob (dữ liệu ảnh trong bộ nhớ browser), revoke URL khi đóng/unmount và refresh Auth khi401/403. Không đưa private path hoặc tự tính tiền trên React.

`SubmissionRequest` kiểm quyền trước validation và kiểm schema trước query ID để bảng pending thiếu trả503. Policy/list scope giới hạn chủ yêu cầu và chủ hợp đồng; sau thanh lý vẫn đọc lịch sử, chỉ active mới gửi mới. `MeterReadingSubmissionService::store` lưu file private, khóa cha MTR, kiểm khoảng/owner rồi ghi submissions+attachments; lỗi transaction dọn đúng file vừa tạo. `approve` lấy khóa cha trước submission, gọi lại storeBatch và lưu approved ID/actor/time cùng transaction; replay bản approved không phụ thuộc trạng thái giá/dịch vụ hiện tại. `reject` khóa phòng trước request, giữ lịch sử/lý do; không ghi meter_readings. Photo controller stream sau Policy với MIME thật/nosniff/no-store.

Bảng ghi: meter_reading_submissions/attachments; chỉ approve mới ghi thêm meter_readings. Không invoice/payment từ ảnh. Pending M19/U2 giữ nguyên, DB dev chưa chạy. Bằng chứng1269/11243/Pint252, frontend85 và API/browser/giới hạn ở Plan§12.28/U2-A01…10. CLI test root/FPMwww-data khác chủ file private0700; helper handoff đúng file fixture, không chmod777. Nginx test cần cùng body limit20m như cấu hình dự án để Laravel kiểm ảnh5MB.

Câu hỏi bảo vệ: (1) Vì sao pending riêng bảng? Ảnh chưa được xác minh không phải chỉ số dùng thu tiền. (2) Vì sao không lấy contract_id từ form? Cư dân có thể giả ID của người khác; server xác định hợp đồng đang thuê. (3) Vì sao duyệt không khóa submission đầu tiên? Phải giữ cùng thứ tự khóa phòng với nhập trực tiếp/thanh lý để tránh tranh chấp hoặc khóa chéo. (4) Duyệt hai lần có hai khoản thu không? Chỉ một reading, replay giữ ID/time, chưa có invoice/payment. (5) Upload fake JPG kiểm bằng gì? MIME nội dung và extension/kích thước server; không chỉ tên tệp hoặc MIME client gửi.

### 11.36. INV — snapshot hóa đơn, bản nháp và quyền xem nợ cũ

Bốn page Admin/Resident invoices và detail ghép InvoiceList/InvoiceDetail trong frontend/src/features/invoices. api.ts gọi http (cookie/CSRF) tới /api/v1/invoices; RHF/Zod kiểm hợp đồng/kỳ hoặc other name/VND/basis, chỉ gửi expected_revision khi sửa/phát hành/hủy. React hiển thị tiền Backend, không cộng dòng hoặc tính công nợ; Resident dùng thẻ, Admin dùng bảng. Route chi tiết dùng invoiceId đúng router; GET và key/abort ngăn dữ liệu response cũ hiển thị sai ID.

InvoiceRequest→InvoicePolicy→InvoiceController→InvoiceService→InvoiceCalculationService→Invoice/InvoiceItem/MeterReading→InvoiceResource→React. InvoiceService::createMonthly (78), refresh (105), other (115), issue (142), cancel (173); calculator::calculate (17) dùng Money::prorate/meterAmount/sum, chia ngày [start_date,actual_end_date), tháng T cộng chỉ số T−1. Không lấy giá danh mục hiện tại thay snapshot. Khóa chung phòng/người/hợp đồng trước nguồn và hóa đơn; revision (dấu phiên bản nội dung) cùng UNIQUE ngăn hai Admin ghi đè hoặc thu trùng chỉ số. Issue so lại nguồn, nguồn thay đổi phải refresh/kiểm tra, không lặng lẽ đổi tiền rồi phát hành.

Bảng ghi: invoices/invoice_items và meter_readings.invoice_id; đọc contracts/contract_services/services/settings/payments. Manual other audit append trong meta; gỡ giữ hàng0đ và snapshot trước, không mất lịch sử. Hóa đơn phát hành không sửa dòng/tổng/hạn; hủy theo DB-D27 giữ lịch sử và nhả liên kết chỉ số, lập lại trỏ related_invoice_id. Zero issued vẫn có INV nhưng paid0 và không payment/RCP. Resident query/Policy kiểm contract.user_id và status khác draft, không yêu cầu active để đọc hóa đơn sau thanh lý; không mở quyền xem người khác.

Bằng chứng/giới hạn tại Plan§12.29 và INV-A01…10; full1285/11460/Pint262, frontend88, browser Admin→Resident Desktop/Mobile trên DB test. Thanh toán/đối soát/final chưa triển khai từ invoice này; không migration dev. Câu hỏi bảo vệ: (1) Vì sao invoice tháng10 dùng điện nước tháng9? Tiền phòng trả kỳ đang ở, chỉ số là tiêu thụ đã đo. (2) Vì sao issued không refresh? Đó là chứng từ đã phát hành; sai cần hủy/lập lại hoặc điều chỉnh theo lịch sử tiền. (3) Ảnh hoặc payment pending có giảm nợ không? Không, chỉ confirmed; nhóm này chưa tạo payment. (4) Vì sao 0đ là paid nhưng không có RCP? Không còn nợ nhưng không có tiền thực nhận. (5) Vì sao cấm Resident thấy draft? Khoản thu chưa chốt, và owner vẫn phải kiểm cho cả lịch sử sau thanh lý.

### 11.37. PAY — minh chứng, thực nhận và đối soát

`AdminPaymentsPage` và hai invoice detail page dùng `PaymentsWorkspace`/`InvoicePayments` gọi `features/payments/api.ts` qua http/CSRF; Resident gửi đúng một ảnh proof private, Admin confirm/reject hoặc ghi nhận thực nhận trực tiếp. `PaymentController` → `PaymentService` khóa phòng/người/hợp đồng/hóa đơn/payment trong transaction; chỉ payment `confirmed` mới cộng `paid_amount` và sinh RCP, `pending` không giảm nợ. Policy của payment/attachment giới hạn theo chủ hợp đồng và ảnh không lộ đường dẫn lưu. Bảng dùng: payments, invoices, contracts, users, attachments; không thêm schema.

Bằng chứng: Plan§12.30, PAY-A01..10. Browser Desktop đã kiểm Admin direct receipt và Resident form; thao tác chọn file trong CUA chưa xác minh, còn upload qua API/Feature test. VNPAY/Sandbox chưa kết nối. Q12 ADM-19 riêng đã duyệt, chưa code.

Câu hỏi bảo vệ: (1) Ảnh chuyển khoản có làm giảm nợ không? Không, chỉ xác nhận thực nhận mới cộng ledger. (2) Vì sao cần kiểm revision invoice khi Admin nhập tiền? Ngăn hai lần nhập hoặc số dư thay đổi giữa lúc mở và xác nhận. (3) Biên nhận được sinh lúc nào? Khi payment xác nhận, không phải lúc gửi ảnh. (4) Cư dân hết hợp đồng còn thấy invoice cũ không? Có, chỉ của hợp đồng thuộc chính tài khoản đó. (5) Payment pending có giữ chỗ số dư không? Không; Admin phải đối chiếu và có thể từ chối/tranh chấp.

### 11.38. Q12 — ADM-19 Công nợ theo hợp đồng

`AdminDebtsPage` lấy status/search/page từ URL, RHF/Zod kiểm từ khóa, `features/debts/api.ts` gọi GET `/api/v1/debts` bằng client http/CSRF; số tổng dùng BigInt để giữ chính xác chuỗi VND từ API. Trang hiển thị tóm tắt, tab quá hạn/chưa đến hạn, nhóm theo hợp đồng, danh sách hóa đơn còn dư và link mở `/admin/invoices?contract_id=...`; `InvoiceList` giữ contract filter trong URL và gửi lên GET `/api/v1/invoices`.

`DebtRequest` chỉ cho Admin active qua `InvoicePolicy::viewDebts`; `DebtService` đọc invoices/contract/user/room/building, tính hạn theo Asia/Ho_Chi_Minh, loại draft/cancelled/paid và tổng hợp theo hợp đồng kể cả soft-delete. Số dư lấy từ paid_amount Backend, payment pending không cộng; summary global không đổi theo tab/search/page. `DebtReportResource` chỉ trả trường cần cho Admin, không trả CCCD hoặc SĐT. Không thêm schema/bảng.

Bằng chứng Feature 4/59 + full backend/Pint và frontend test/build/lint tại Plan§12.31 / TEST_MATRIX DEBT-A01..07. CUA/browser hiển thị chưa được nghiệm thu nếu chưa ghi riêng trong Plan. Câu hỏi bảo vệ: (1) Vì sao lọc overdue dùng DATE ngày VN? due_date là ngày lịch VN, không đổi sang UTC. (2) Hợp đồng thanh lý bị soft-delete có mất nợ không? Không; bảng invoice giữ contract_id và đọc relation có withTrashed. (3) Payment pending làm giảm nợ không? Không; chỉ số paid_amount được cập nhật khi confirmed. (4) Vì sao tổng API là chuỗi? Gộp nhiều hóa đơn có thể vượt vùng số chính xác của JavaScript Number. (5) Làm sao xử lý hóa đơn của nhóm nợ? Mở invoice list với contract_id hoặc đi thẳng tới invoice detail; giao dịch xác nhận thuộc flow PAY.
Q12 xác minh29/10: log full1302/11753PASS; Feature mới5/73PASS bổ sung phân trang21, số tổng vượt Number.MAX_SAFE_INTEGER và invoice contract filter. Frontend93/build/lint/Pint277PASS. Browser vẫn bị tắt, chưa nghiệm thu trực quan.

### 11.39. CLOSE-02a — bản xem trước bàn giao
AdminContractDetailPage link tới AdminContractTerminatePage, getContract đọc dữ liệu thật; form RHF/Zod dùng closure.ts, api.ts POST /api/v1/contracts/{id}/closure-preview kèm CSRF/revision. ClosurePreviewRequest kiểm Adminactive và allowlist; ContractClosureService đọc contracts/contract_services, kiểm active/revision, phân loại ngày và bắt lý do, gọi ContractTerminationFeeCalculator theo snapshot. ClosurePreviewResource trả ngày/loại/phí và is_preview. P9 áp dụng DB-D66: cùngngày khôngphí, thay chặn409 lỗi thời. Không ghi bảng nào; chưa chốt chỉsố/kiểmtra tài sản/hóađơnfinal/cọc/trảphòng. Input đổi ẩn preview cũ; lỗi409 có nút tải lại hợpđồng. Browser chưa được phép bởi Work settings.
Câu hỏi bảo vệ: (1) Vì sao đúnghạn=end_date+1? end_date là ngày cuối được ở, ngày bàn giao loại trừ. (2) Vì sao không chọn closure_reason trên form? Backend suy từ ngày để ngăn chọn mã trái thực tế. (3) Preview có giải phóng phòng không? Không; chưa hoàn tất kiểm kê/final/cọc. (4) Vì sao cần revision dù chỉ xem? Tránh tính theo điều khoản khác với hợp đồng Admin vừa đọc. (5) Ghi chú có tự miễn phí không? Không; chỉ áp dụng điều kiện snapshot đã được xác nhận theo quy tắc, form chưa hỗ trợ áp miễn mới.

### 11.40. NOTIF — thông báo riêng sau giao dịch
NotificationsWorkspace dùng api.ts/schemas.ts/types.ts và được ghép vào ba page Admin/Resident/Staff. URL status/page giữ bộ lọc; GET /api/v1/notifications trả danh sách riêng và unread_count; POST /{uuid}/read có CSRF, read_at do server gán, replay giữ lần đọc đầu. NotificationRequest→Policy→NotificationController→NotificationService::query giới hạn notifiable_type=user + user hiện tại, kể cả Admin không xem hộ. Resource chỉ trả title/body/link nội bộ và thời gian; không đường dẫn ảnh hay dữ liệu pháp lý.
AppServiceProvider đăng ký saved hooks của Contract/Invoice/Payment/MeterReadingSubmission. NotificationService::saved chụp event/source/recipient, DB::afterCommit chỉ phát sau giao dịch thành công; UUID v5 xác định chống trùng theo sự kiện/nguồn/người nhận, insertOrIgnore không ghi đè read_at. M20 pending theo schema đã duyệt, default migrate không apply; khi thiếu M20 API503 nhưng nghiệp vụ nguồn vẫn hoạt động. Lỗi giao thông báo sau commit được report an toàn, không trả lỗi khiến nhập lại tiền đã thực nhận. Chưa retry queue/email/SMS, chưa nguồn VIEW/MAINT; nếu giao thông báo lỗi cần vận hành kiểm tra log.
Bằng chứng: API own/read quyền5roles và luồng InvoiceService issue→PaymentService directcash→notification DB thật đã kiểm; contract/U2 hooks chưa có liveAPI riêng đợt này. Câu hỏi bảo vệ: (1) Vì sao afterCommit? Không báo thành công cho nghiệp vụ đã rollback. (2) Vì sao Admin vẫn chỉ thấy của mình? Thông báo là dữ liệu người nhận, quyền quản trị tài nguyên nguồn không cho đọc hộ. (3) Vì sao UUID xác định? Replay không tạo thông báo thứ hai hoặc làm mất read_at. (4) Thiếu bảng trên dev có tự migrate không? Không; API503 và M20 chờ duyệt dev riêng. (5) Thông báo xác nhận tiền là nguồn thanh toán không? Không; nguồn tiền vẫn payment confirmed/invoice ledger, notification chỉ phản ánh sự kiện.

### 11.41. VIEW — đặt lịch và đón khách
BookingPage đọc phòng thật qua rooms/api.ts, ghép AppointmentBookingForm dùng RHF/Zod và viewing-appointments/api.ts qua http/CSRF. datetime-local được gắn +07:00 rõ ràng, không phụ thuộc timezone của máy khách. AppointmentsWorkspace tái dùng cho Guest/Admin/Guard, query URL và AbortController/key ngăn kết quả bộ lọc cũ hiển thị sai. Modal xác nhận/hủy/đổi giờ/check-in/out không báo thành công trước response.
AppointmentRequest kiểm quyền/schema/allowlist→ViewingAppointmentController→ViewingAppointmentService→ViewingAppointment/Room→Resource. Store/change khóa Room trước Appointment để thống nhất với activation/edit; duplicatephone/room được query sau khóa. Policy + query giới hạn owner/Admin/Guard confirmed ngàyVN, ngàyVN đổi sang khoảngUTC [đầu ngày, đầu ngày kế). Chỉ Service gán mãAPT/status/user_id/actor/time; giữ lịch sử, không thu tiền/giữ chỗ phòng hoặc thay trạng thái phòng. NotificationService saved hook chỉ phát saucommit và phân biệt slot khi xác nhận lại.
Bảng ghi viewing_appointments/notifications; đọc rooms/buildings/users/contracts. M18/M20 chỉ pending/test, không migrationdev. Câu hỏi bảo vệ: (1) Vì sao không UNIQUE phone/room toàn bảng? Cần giữ lịch hủy/hoàn tất và cho đặt mới; khóa phòng bảo vệ điều kiện pending/confirmed. (2) Vì sao Guard không lọc DATE trực tiếpUTC? NgàyVN bắt đầu17:00UTC hôm trước. (3) Vì sao ảnh/phiên client không được gán actor? Server lấy từ user phiên đã xác thực. (4) Vì sao đổi giờ vềpending? Lịch cũ không còn là giờ đã xác nhận. (5) Đặt lịch có giữ phòng không? Không; Admin phải kiểm phòng vẫn sẵn sàng khi xác nhận.

### 11.42. RES-02/03 — Cư dân đọc hợp đồng của chính mình
ResidentContractsPage/ResidentContractDetailPage ghép ResidentContractList/ResidentContractDetails trong features/resident-contracts; api.ts gọi GET /api/v1/resident/contracts[/id] bằng http cookie, schemas.ts kiểm status/page. URL giữ tab/filter/page, abort/key ngăn response ID cũ hiển thị sai; không dùng fallback danh sách prototype. Tiền/chỉ số chỉ hiển thị từ API, không cộng/tính phí.
ResidentContractRequest→ContractPolicy::viewOwnContracts→ResidentContractController→ResidentContractService::query/detail→ResidentContractResource. Query luôn user_id=current + trạng thái active/terminated/expired và withTrashed cho lịch sử; detail dùng cùng scope rồi Policy::viewOwnContract. Resource tách khỏi Admin để không lộ note/actor/CCCD/phone người ở cùng; list eagerload room.building, detail thêm occupants/contractServices.service và finalinvoice đã phát hành không hủy. GET không tạo/sửa hợp đồng, cọc, chỉ số, hóa đơn hoặc payment; schema thiếu503, không migration dev.
Bảng đọc contracts/contract_occupants/contract_services/services/rooms/buildings/invoices; danh mục giá đổi không thay unit_price snapshot. Câu hỏi bảo vệ: (1) Vì sao không dùng ContractResource Admin? Nó trả note, thông tin tenant và revision không cần cho Cư dân. (2) withTrashed có mở quyền người khác không? Không; user_id và trạng thái vẫn bắt buộc trong query. (3) Bàn giao đúng hạn là ngày nào? Backend trả end_date+1, end_date là ngày cuối được ở. (4) Giá dịch vụ đang bán tăng có đổi hợp đồng không? Không; dòng đăng ký đã lưu snapshot. (5) GET có chứng minh thanh lý đã làm không? Không; chỉ đọc kết quả đã lưu, null không được biến thành kết quả thành công.

### 11.43. MAINT — cư dân gửi yêu cầu, Admin phân công, kỹ thuật viên xử lý

RES-06/07/08, ADM-20/21, STF-01/02 dùng features/maintenance-requests; api.ts gọi context/list/create/detail/update/assign/start/resolve/reject/reopen và ảnh private qua client http. Form RHF/Zod lấy phòng từ hợp đồng active, Resident chọn priority ban đầu và tải tối đa5 ảnh. Room detail Admin chỉ đọc list theo room_id.

MaintenanceRequestInput→Policy→Controller→MaintenanceRequestService khóa phòng/hợp đồng khi tạo, gán actor/contract/room từ server và cấp mã MR theo ID. Policy giới hạn chủ yêu cầu/Admin/technician được giao. Resource technician chỉ trả tên+SĐT khi pending/in_progress; không trả CCCD/email/hồ sơ hợp đồng, ẩn SĐT sau đó. Admin điều chỉnh priority/phân công/reject/reopen; Technician chỉ start/resolve việc được giao, phải ghi kết quả. Phòng active vẫn occupied theo Q17. Bảng ghi maintenance_requests/attachments; đọc contracts/rooms/buildings/users. NotificationService sau commit gửi created→Admin active, assigned→technician, status_changed→người gửi; khóa dedupe xác định.

Bằng chứng tại Plan §12.36 và TEST_MATRIX MAINT-A01..08: target 3/126, full Backend1326/12348, Pint315, frontend102/build/lint PASS. M17 pending/test-only; không migration dev. Browser bị tắt trong Work settings nên chưa xem trực quan; không nhận là nghiệm thu Antigravity đủ. Chưa có ảnh nghiệm thu kỹ thuật viên, chi phí sửa chữa, timeline nhiều bước hoặc dashboard.

Câu hỏi bảo vệ: (1) Vì sao Resident không gửi contract_id/room_id? Backend suy ra từ hợp đồng active của phiên để chống giả dữ liệu. (2) Vì sao ảnh private? Policy kiểm tra quyền trên đúng yêu cầu trước khi stream. (3) Vì sao Technician không đọc toàn bộ? Query/Policy buộc assigned_to trùng phiên. (4) Vì sao gửi notice sau commit? Transaction có thể rollback. (5) Vì sao phòng vẫn occupied khi có sự cố? Hợp đồng active vẫn tồn tại; maintenance request không đổi trạng thái lưu trú.

### 11.44. CLOSE-02b — Admin lưu kiểm kê tài sản hợp đồng

ADM-14 dùng `AdminContractTerminatePage.tsx` → `saveContractInspection()` trong `features/contracts/api.ts` → POST `/api/v1/contracts/{id}/inspection` multipart; API tải lại contract và private photo metadata. Backend: `ContractInspectionRequest` (admin/enum/file/revision validation) → `ContractController::recordInspection` → `ContractInspectionService::record` (lock room/users/contract/services; active + optimistic revision; actor/time server; transaction + cleanup file on failure) → `Contract.inspection_result/inspected_by/inspected_at/inspection_note` và morph `attachments` alias `contract`, collection `inspection_photo`. Download route dùng cùng controller/service và `AttachmentPolicy`; chỉ Admin hoặc chủ Resident hợp đồng không nháp. RES-03 chỉ hiển thị kết quả/ảnh được lưu khi hợp đồng đã có actual_end_date; không tự suy kết quả.

Đọc `backend/database/migrations/pending/2026_10_30_400021_add_contract_inspection_fields.php`: M21 ALTER nullable, `inspected_by` FK users RESTRICT; không sửa M09 và không default migrate. `ContractInspectionApiTest` chạy M19/M21 tường minh trên mysql_test, tạo snapshot hợp đồng trước ALTER rồi so sánh dữ liệu sau ALTER; kiểm auth/role/state/revision, ảnh private/foreign, file validation và teardown/down. Bằng chứng cuối: 4/77 riêng, 132/1287 nhóm hợp đồng, full backend 1330/12425, Pint 320 file, frontend 104/build/lint PASS; Plan §12.37. Câu hỏi bảo vệ: (1) Vì sao kết quả chưa đóng hợp đồng? Kiểm kê chỉ là điều kiện, chưa có final meter/invoice và đối soát cọc. (2) Ai gán `inspected_by`? Service lấy Admin active từ session sau khóa user. (3) Vì sao contract photo URL không chứa path? File private chỉ được stream sau Policy. (4) stale revision trả gì? 409 trước ghi database. (5) Migration này đã lên dev chưa? Chưa; chỉ test DB, dev cần phê duyệt riêng.

### 11.45. CLOSE-02c — Admin xem trước chỉ số chốt

Màn `AdminContractTerminatePage` nhập ngày bàn giao, lý do và hai số đọc cuối; submit gọi `previewFinalContractMeters()` trong `frontend/src/features/contracts/api.ts` → `POST /api/v1/contracts/{contract}/final-meter-preview`. Zod chỉ nhận số thập phân dạng chuỗi cho hai chỉ số và thông tin bàn giao; client không gửi giá, mốc trước, lượng tiêu thụ hay số tiền. `FinalMeterPreviewRequest` validate đầu vào/revision; `ContractController::finalMeterPreview` kiểm Policy; `FinalMeterReadingPreviewService::preview` khóa room→users→contracts→subscriptions/services→readings→building prices, tái dùng `ContractClosureService::assess` để phân loại ngày/phí. Backend kiểm U1 giá theo tòa, U3 chuỗi periodic theo hợp đồng và kiểm tính nhất quán các snapshot lịch sử. API trả `is_preview=true` và các mốc/tiêu thụ/giá/thành tiền cho điện nước. Không ghi DB nghiệp vụ, không tạo meter final/invoice/payment, không đổi phòng hoặc contract; actual close phải thực hiện lại kiểm tra và ghi nguyên tử trong task sau.

Bằng chứng ngày30/10: `FinalMeterPreviewApiTest|ClosurePreviewTest|ContractTerminationFeeCalculatorTest` **31/202 PASS**; full backend **1335/12529 PASS** (476.21s, exit0); frontend105PASS, build PASS, lint0 lỗi/9 cảnh báo; Pint323 file PASS; `git diff --check` PASS. PHPUnit chỉ dùng `mysql_test/mini_apartment_test`; U1/U3 chỉ apply/down tường minh trong test. Trực quan Desktop/Mobile chưa kiểm tra: `cua.getState()` trả `Local browser use is disabled in Work settings`. Không có migration dev. Câu hỏi bảo vệ: (1) Vì sao final preview không insert? Final phải cùng transaction với invoice/cọc/terminate để không để dở một lần thanh lý. (2) Ai xác định tariff? Service lấy giá hiệu lực theo building+service+period, không tin client. (3) Làm sao tránh tính trùng periodic/final? U3 ràng buộc theo hợp đồng/kỳ và preview yêu cầu liên tục từ periodic cuối tới ngày bàn giao. (4) Payment pending có bị trừ? Không có thanh toán nào được ghi ở preview. (5) Browser đã xác nhận? Chưa; browser local bị tắt trong Work settings.

### 11.46. CLOSE-02d — từ form bàn giao đến hóa đơn tất toán

| Mở file / tìm hàm | Vai trò và dữ liệu thật |
|---|---|
| frontend/src/pages/admin/AdminContractTerminatePage.tsx — ClosureForm.submit, FinalInvoiceForm.create/issue | Xem trước số đo → lập nháp có căn cứ → xác nhận phát hành; F5 đọc final mới nhất và mở chi tiết. Giữ giao diện hiện có, không tự tính tiền |
| frontend/src/features/contracts/finalInvoice.ts — finalInvoiceInputSchema/buildFinalInvoiceFormData | Kiểm tra dữ liệu nhập (Zod), tạo multipart (body chứa cả trường và tệp); số đo là chuỗi, tiền nguyên; không gửi đơn giá/tổng/phí từ React |
| frontend/src/features/contracts/api.ts:11 — createFinalInvoiceDraft | Lấy CSRF cookie rồi POST /contracts/ID/final-invoice qua http dùng cookie phiên |
| backend/routes/api.php — contracts.final-invoice, invoices.reissue | Sanctum kiểm tra đăng nhập; active/role/spa và Policy kiểm tra quyền phía server |
| backend/app/Http/Requests/Contract/CreateFinalInvoiceRequest.php — rules | Chỉ nhận allowlist, mỗi damage có tên/lý do/căn cứ/VND/ảnh; cấm trường điều khiển;422 input sai |
| backend/app/Services/ContractFinalInvoiceService.php:55/95/232 — create/createLocked/reissue | Lưu ảnh private, transaction (tất cả cùng thành công), khóa cha theo thứ tự; kiểm tra revision (dấu phiên bản), ghi final meters + invoice/items + mốc bàn giao; rollback xóa ảnh mới. Lập lại dùng số đo/ảnh cũ, không ghi final thứhai |
| backend/app/Services/FinalInvoiceCalculationService.php:30 — calculate | Đọc contracts/contract_services/meter_readings/invoices/invoice_items đã khóa; Money/BCMath tính nguyên VND và làm tròn từng dòng. Loại cancelled trước gom theo kỳ, không thu trùng; tổng có other và discount không âm |
| backend/app/Services/InvoiceService.php — finalCalculation/issue/syncFinalRefundNote | Đối chiếu snapshot (bản chụp dữ liệu nguồn), khóa hóa đơn sau phát hành.0đ paid nhưng không payment. Ghi chú phần hoàn chỉ là khoản cần xử lý ngoài hệ thống, chưa ghi tiền đã hoàn |
| backend/app/Http/Resources/InvoiceResource.php, frontend/src/features/invoices/InvoiceDetail.tsx | Resource (bộ chọn trường JSON) trả các dòng/ảnh qua URL có Policy, không path private; ghi chú bàn giao hiện tại chỉ Admin. React đọc tổng và trình bày; final cũng có nút phát hành sau F5/lập lại |

**Tự thực hành:** trên DB test, mở ADM-14 → DevTools/Network → POST final-meter-preview chỉ tính trước; sau kiểm kê, POST final-invoice có Form Data và XSRF header/cookie. Điện125.00/nước13.00 là ví dụ kiểm thử, không phải số đo dev. Server tự đọc mốc100/10 và giá3500/15000 →132500đ điện nước; phòng3.100.000/tháng, bàn giao30/10 tính29/31→2.900.000đ, tổng3.032.500đ. Không có dòng cọc. Response201 chỉ là nháp; POST invoices/ID/issue mới phát hành. Đổi bộ lọc GET invoices?contract_id=ID&type=final&page=1 để đọc final của đúng hợp đồng; Laravel vẫn kiểm tra quyền, không truyền user_id để đổi chủ.

**Câu hỏi bảo vệ:** (1) Vì sao không nhận total từ React? Người dùng có thể sửa request; MySQL/snapshot + Money là nguồn tiền. (2) Vì sao cancelled không được keyBy cùng live invoice? Một kỳ có nhiều lịch sử hủy; chọn nhầm sẽ thu tiền phòng lần nữa, đã có regression tái hiện. (3) Rollback có tự xóa file ảnh? Không; Service phải xóa ảnh mới khi transaction SQL thất bại, giữ ảnh của giao dịch đã commit. (4)0đ có phải đã thu tiền? Không; paid/paid_amount0 không tạo payment/biên nhận. (5) Vì sao vẫn active sau final? Chưa đối soát cọc và chưa transaction terminate/room; không suy thanh lý hoàn tất từ một hóa đơn.

**Lưu ý cấu hình test:** SESSION_DOMAIN=localhost không dùng được với URL127.0.0.1 trong trình duyệt. Dùng localhost:8082 để cookie quaF5; không tắt CSRF/đổi guard để né lỗi. Ảnh từng tệp≤5MB, tổng request Nginx≤20MB; form báo413 để giảm ảnh. Giới hạn và kết quả kiểm thử thực tế tại Plan§12.39, không lấy số lịch sử làm kết quả mới.

**Bằng chứng nhóm này:** full1351/12791/Pint327;110frontend/build/lintPASS (9cảnhbáocũ);19liveHTTP,12tìnhhuốngCUA và2racehai phiên. Source/node-schema test không thay thế browser; các hành vi chưa xem trongbrowser được ghiPlan§12.39. Devsnapshot20bảng/16migration toàn bộchecksumkhớp, khôngghi/xóadev. Chỉ finaldraft/issue/reissue hoàn tất trong phạm vi; chưa đốisoátcọc/terminate/trảphòng.

### 11.47. CLOSE-02e — đối soát cọc và trả phòng (30–31/10/2026)

Luồng mới dùng chính ADM-14, không có màn hình mới. Quy tắc DB-D78: **cọc dư là khoản còn phải hoàn**, không chứng minh đã chi hoàn; `settled` nghĩa là đã đối soát. Phí trước hạn/bồi thường đã có trong final; không trừ riêng lần nữa vào cọc.

| Mở file và tìm hàm | Vai trò trong luồng thật |
|---|---|
| `frontend/src/pages/admin/AdminContractTerminatePage.tsx:51/57/259` | Gắn panel cho final đã phát hành/hợp đồng đã thanh lý; nút Tiếp tục đối soát cọc tải lại dữ liệu sau issue |
| `frontend/src/features/contracts/ContractSettlementPanel.tsx:15/73` — `ContractSettlementPanel`, `SettlementConfirmation` | GET khi mở/tải lại; nút kiểm tra mở Modal, checkbox + `submit` gọi terminate. Ref chặn double-submit; 409/mất mạng bỏ preview cũ, yêu cầu GET mới; không tự POST lại. AbortController bỏ response của lượt tải đã hủy |
| `frontend/src/features/contracts/api.ts:125/129` — `getContractSettlement`, `terminateContract`; `settlement.ts` | Axios `http` dùng cookie/XSRF; GET `/contracts/{id}/settlement-preview` không query/body; POST `/contracts/{id}/terminate` chỉ `expected_revision`, `confirmed=true`. Zod kiểm tra mẫu dữ liệu, không tính tiền trên React |
| `backend/routes/api.php`; `ContractController.php:167/175` — `settlementPreview`, `terminate`; `TerminateContractRequest.php:16` | `/api/v1` + `auth:sanctum`/active/role:admin; POST thêm spa/CSRF. Policy update chỉ Admin active; FormRequest từ chối trường tiền/role/status tự gửi; controller chuyển dữ liệu hợp lệ vào Service rồi Resource chọn JSON |
| `backend/app/Services/ContractSettlementService.php:93/122/211/229` — `locked`, `summary`, `assertLedger`, `revision` | Đọc rooms/users/contracts/contract_services/services/meter_readings/invoices/payments; khóa cha trước con. Sum confirmed phải bằng paid_amount và trạng thái tiền phải khớp. Pending không giảm nợ và chặn thời điểm thanh lý. Revision là dấu phiên bản toàn bộ công nợ, không chỉ hợp đồng |
| `ContractSettlementService.php:41` — `terminate`; `InvoiceService.php:350` — `assertFinalSnapshot` | Kiểm tra lại final đã phát hành mà không sửa snapshot; khấu trừ cọc held theo due_date rồi ID. Trong một transaction (tất cả cùng thành công): payment deposit confirmed + RCP, paid/status invoice, cọc deducted/refund/settled, contract terminated/closed_at, end_date dịch vụ, room available. Không đổi role cư dân; không tạo giao dịch hoàn tiền giả |
| `backend/app/Support/Money.php:44` — `aggregate`; `frontend/src/lib/format.ts` — `formatVND` | Tổng nhiều hóa đơn là chuỗi nguyên, BCMath cộng chính xác; React dùng BigInt (số nguyên lớn) chỉ để định dạng, tránh mất đồng khi vượt giới hạn số JavaScript |
| `ContractSettlementResource.php`; `NotificationService.php` — `saved` | Response chỉ dữ liệu đối soát cần thiết, không PII/path private. Observer hiện có gửi `contract.terminated` sau commit, ID sự kiện chống lặp. Payment khấu trừ cọc được phân biệt với tiền thực nhận mới |

**Thực hành Network:** mở hợp đồng test đã có final issued → GET settlement-preview → xem `invoices`, `pending_payment_count`, `can_terminate`, `revision`. Tích xác nhận → POST chỉ gửi `{expected_revision: <64 ký tự từ GET>, confirmed: true}`. Server đọc số cọc/nợ từ MySQL, không nhận số tiền do DevTools sửa. Nếu một phiên khác thu tiền/gửi minh chứng trước POST, nhận409 và tải lại. Ví dụ fixture: cọc5.000.000đ, final2.900.000đ; có thêm cash100.000đ sau preview → preview cũ409; GET mới khấu trừ2.800.000đ, cọc còn phải hoàn2.200.000đ. F5 đọc kết quả đã lưu. Đây là dữ liệu test, không phải số liệu dev.

**Ranh giới:** request lặp trên hợp đồng đã đóng không tạo payment/notification hoặc trả phòng lần nữa (phòng có thể đã có khách mới). Nợ chưa hết vẫn giữ nguyên; DB-D70 cho cư dân gửi minh chứng trả nợ cũ sau thanh lý — pending phát sinh sau commit đó chưa giảm nợ, không đảo trạng thái hợp đồng. Chưa có API xác nhận đã chi hoàn cọc; khoản hoàn do giảm trừ final ghi riêng, không cộng vào cọc. Môi trường thiếu schema trả503, không tự migrate.

**Câu hỏi bảo vệ:** (1) Vì sao pending không trừ nợ? Chưa có xác nhận thực nhận; chỉ confirmed vào ledger. (2) Vì sao cọc không là dòng invoice/damage thứ hai? Phí đã nằm trong nghĩa vụ invoice; deposit payment chỉ thanh toán nghĩa vụ đó. (3) Vì sao cần lockForUpdate và revision cùng lúc? Khóa tuần tự hóa hai người thao tác, revision buộc người xác nhận nhìn số liệu mới. (4) Nếu lỗi khi cập nhật phòng? Transaction rollback cả cọc/payment/invoice/hợp đồng; đã có test gây lỗi thật tại bước lưu phòng. (5) Settled có nghĩa đã hoàn tiền chưa? Không: DB-D78 chỉ đối soát; refund_amount vẫn là nghĩa vụ chưa thanh toán.

Bằng chứng và giới hạn browser/dev cuối đợt nằm tại Plan§12.40 và TEST_MATRIX; không suy toàn bộ CLOSE/FullMVP hoàn tất từ một panel.

**Bổ sung DB-D79 (31/10):** `InvoiceService::cancel` chặn mọi loại invoice khi contract terminated, kể cả monthly chưa có payment; controller trả409. `InvoiceResource` chỉ trả `contract_status` cho Admin, `InvoiceDetail` ẩn Hủy và nêu cần quy trình điều chỉnh. Guard vẫn nằm ở Laravel; không cho sửa trực tiếp nghĩa vụ đã chốt hoặc tự mở lại hợp đồng. Regression/race hủy monthly và thanh lý bảo vệ dữ liệu gốc; kết quả cuối tại Plan§12.40.

**Bằng chứng chốt§11.47:**1375backend/13256assertion/Pint336;114frontend/build/lintPASS (9cảnhbáocũ);36HTTP/13browser và6raceprocess+2raceHTTP theo Plan§12.40. Dữ liệu ví dụ là fixture đã dọn; dev20bảng/16migration/checksum không đổi. Cọc đã đối soát không có nghĩa đã chi hoàn; công nợ sau bàn giao vẫn thuộc hóa đơn, và DB-D79 bảo vệ hóa đơn khỏi hủy trực tiếp sau đóng.

### 11.48. CLOSE-03 — tự lần theo hành trình thuê đến trả phòng (31/10/2026)

Bản đồ này nối các phần đã giải thích ở§11.47, không tạo thêm tầng kiến trúc. Điểm kiểm chứng mới: `backend/tests/Feature/Contracts/ContractJourneyTest.php::test_contract_lifecycle_preserves_money_and_history_when_room_is_relet` chạy hai tình huống bằng request thật qua HTTP kernel (bộ xử lý request Laravel), cookie/CSRF và MySQL test. Factories chỉ chuẩn bị phòng/tài khoản/danh mục; không dựng sẵn hợp đồng/hóa đơn/payment thành công để bỏ qua các bước.

| Muốn mở code phần nào | File/hàm thật | API / bảng |
|---|---|---|
| Nhận cọc và kích hoạt | `frontend/src/features/contracts/api.ts::confirmContractDeposit/activateContract` → `ContractController::confirmDeposit/activate` → `backend/app/Services/ContractService.php::confirmDeposit` dòng258, `activate` dòng331 | POST contracts/{id}/deposit hoặc activate; contracts/contract_services/rooms/users. Nhận cọc không tạo invoice/payment doanh thu |
| Ghi chỉ số rồi lập hóa đơn | `MeterReadingService::storeBatch` dòng61 → `InvoiceService::createMonthly` dòng86, `issue` dòng165 | POST meter-readings, POST invoices, POST invoices/{id}/issue; utility_prices/meter_readings/contracts/contract_services/invoices/invoice_items |
| Xác nhận tiền và công nợ | `PaymentService::store` dòng68, `confirm` dòng114; `frontend/src/features/debts/api.ts::getDebts` dòng5 → DebtController/DebtService | POST invoices/{id}/payments, POST payments/{id}/confirm; GET debts. payments confirmed mới tăng invoices.paid_amount và giảm công nợ; pending chỉ là chờ đối chiếu |
| Đối soát/trả phòng/đọc kết quả | `features/contracts/api.ts::getContractSettlement` dòng125, `terminateContract` dòng129 → ContractController → `ContractSettlementService::terminate` dòng41 | GET contracts/{id}/settlement-preview; POST contracts/{id}/terminate. Transaction cập nhật payment deposit/invoice/contract/subscription/room; không tạo thêm bảng |
| Cột tiền trên danh sách | `frontend/src/features/invoices/InvoiceList.tsx::InvoiceList` dòng29, tiêu đề cột dòng60 | GET invoices?contract_id={id}; paid_amount hiển thị Đã thanh toán, khác status paid=Đã tất toán. Không tính lại tiền trong React |

**Bài kiểm chứng cụ thể (chỉ dữ liệu test):** thuê3.100.000/tháng; điện3.500/kWh, nước15.000/m³; tháng9 dùng30kWh+2m³ nên invoice tháng10=3.235.000. Trả30/10 không tính ngày bàn giao: giảm200.000 tiền phòng đã tính trước; điện/nước chốt245.000+120.000, final=165.000. Tháng10 mới trả600.000, final có50.000 confirmed; sau khấu trừ cọc1.000.000 còn nợ1.750.000. Thu thêm100.000 nợ cũ sau khi phòng đã cho người mới thuê → nợ1.650.000; hợp đồng cũ vẫn terminated, hợp đồng mới active/phòng occupied. Snapshot dòng invoice không đổi. Trường hợp đã trả đủ monthly và proof bị từ chối, cọc dư835.000 là nghĩa vụ phải hoàn, không phải đã chi hoàn.

**Đường đi khi bấm:** page gọi hàm API trong feature → http client kèm cookie → routes/api.php với auth:sanctum/active/Policy → Controller nhận validated input → Service khóa/transaction → Eloquent ghi MySQL → Resource trả JSON → page hiển thị giá trị Backend. Khi F5, AuthProvider nạp lại /me; không dùng role từ localStorage để cấp quyền. Xem mẫu thực hành chi tiết khi chủ dự án yêu cầu; các endpoint trong bảng đều có thật.

**5 câu hỏi bảo vệ:** (1) Vì sao cọc không cộng doanh thu hai lần? Nhận cọc ghi nghĩa vụ giữ tiền, khi đối soát chỉ phân bổ vào công nợ. (2) Vì sao pending không giảm nợ? Chưa có xác nhận thực nhận của Admin. (3) Vì sao phòng thuê lại không bị trả bởi thao tác cũ? Terminate kiểm trạng thái dưới khóa và replay chỉ đọc kết quả đã đóng. (4) Vì sao người thuê cũ gặp404 với hợp đồng mới? Query scope lọc user_id ngay từ DB, không tiết lộ tài nguyên của người khác. (5) Vì sao cần test cả chuỗi dù từng Service đã có test? Lỗi truyền revision, vai trò và thời điểm có thể chỉ xuất hiện khi kết nối các module.

Giới hạn: hành trình tạo/ghi ở lượt này kiểm qua HTTP-kernel và liveHTTP; browser xác minh kết quả/F5/công nợ/mobile/điều hướng/nhãn, chưa click lại toàn bộ wizard hoặc ghi dữ liệu dev. Kết quả cuối và trạng thái fullsuite xem Plan§12.41.

Kết quả chốt phần hành trình31/10:1377Backend/13436assertions/Pint337;114frontend/build/lint0lỗi9cảnhbáocũ. Full đầu có1timeoutREADY của race U2; chạy riêng và full lại đạt, không làm yếu assertion, chưa chứng minh căn nguyên. Postflighttest sạch/schema trả lại, dev sau code nguyên vẹn. Phê duyệt nâng cấp devA được ghi riêng trong Plan/DBplan, không suy đã chạy từ phê duyệt.

### 11.49. Schema dev không phải dữ liệu nghiệp vụ — nâng cấp góiA31/10

Đã chạy đúng13migration đang có trong `backend/database/migrations/` và `pending/`, danh sách chính xác ở DBplan§21.1. Đọc `up()` để thấy9CREATE và4fileALTER: P4+M21 thêm thông tin nullable trên contracts, U1 đưa giá theo tòa, U3 thay khóa generated/UNIQUE của meter_readings. Không viết migration mới hoặc sửa migration cũ. Laravel ghi thêm13tên vào `migrations` (batch5), nên devhiện29dòng; thư mục tên pending/ không quyết định trạng thái ran, lịch sử trong DB mới quyết định.

Dev có29bảng vật lý **không phải29bảng nghiệp vụ**:22bảng thiết kế hiện hành (baseline21+meter_reading_submissions) cộng7bảng hạ tầng Laravel. `SystemCatalogSeeder::run` chỉ tạo2dịch vụ Điện/Nước và8khóa settings từ `SettingService::DEFAULT_SETTINGS`; không tài khoản/phòng/hợp đồng mẫu, không tự đặt giá điện/nước. Người dùng vẫn phải nhập dữ liệu thật qua chức năng tương ứng.

Bốn bước dễ giải thích: (1) backup đầy đủ ngoàiGit; (2) restore cô lập, so cột/index/FK/count+hash và migration history; (3) pretend/diễn tập rồi mới chạy đúngpath trêndev; (4) so dữliệu cũ vàschemađích, chỉ seed hệthốngđãduyệt. Rawdump khác thêmCHARACTERSET nhưng metadata thật/datahashkhớp; metadata AUTO_INCREMENT cache phải đọc lại với stats_expiry=0 ở session kiểm tra. Không được bỏ qua khác biệt collation thật hoặc gọi restoređạt chỉ vì lệnh không báo lỗi.

**Câu hỏi bảo vệ:** Vì sao29bảng nhưng thiết kế22? Khác phạmvi đếm, có7hạ tầng. Vì sao không chạy migrate mặc định? Cácfilepending cần whitelistpath và phêduyệt riêng, tránh chạy ngoài phạmvi. Vì sao backup/restore chứ không chỉ rollback? MySQLDDL tựcommit, down có thể không còn hợp lệ khi có dữliệu mới; restoređè có thể mất dữliệu saubackup. Có tự tạo Admin/giá mẫu không? Không: giữ Admin cũ, chỉ thêm danh mục hệ thống đã duyệt. Đủschema đã có nghĩa mọi giao diện hoàn thành chưa? Chưa:4HTTPđọc chỉ kiểm runtime, không thay thế nghiệmthuCRUD/wizard/5vai trò.

### 11.50. MAINT — lần theo một yêu cầu sửa chữa và hai lỗi vừa sửa

| Điểm mở code | Hàm / nhiệm vụ thực tế |
|---|---|
| `frontend/src/pages/resident/ResidentRequestNewPage.tsx` → `features/maintenance-requests/MaintenanceRequestForm.tsx` | `submit` nhận form hợp lệ từ React Hook Form; gọi API tạo rồi mở chi tiết. Các trang Admin/Staff ghép component List/Detail dùng chung, không có backend giả. |
| `frontend/src/features/maintenance-requests/api.ts` | `createMaintenanceRequest` gửi POST `/api/v1/maintenance-requests` bằng FormData: title, description, priority, photos[]. `fetchCsrfCookie` và `http` giữ cookie Sanctum/XSRF. `getMaintenanceRequests` gửi GET với page/status/room_id; Tất cả phải bỏ status, không gửi chuỗi rỗng. |
| `frontend/src/features/maintenance-requests/MaintenanceRequestDetail.tsx` + `schemas.ts` | `saveAdmin`, `assign`, `resolve`, `reject` và `perform` điều phối các thao tác. `priorityForm.handleSubmit(saveAdmin)` kiểm schema trước khi gọi PATCH; `fitsTextColumn` đo dung lượng UTF-8 và hiển thị lỗi cạnh ghi chú. |
| `backend/routes/api.php` + `Http/Requests/Maintenance/MaintenanceRequestInput.php` | Nhóm maintenance-requests dùng auth:sanctum và active (`EnsureActiveAccount`). `authorize` gọi Policy; `rules` kiểm input, không nhận actor/status/room tùy ý. `MaxTextBytes` bảo vệ mọi trường TEXT trước khi ghi. |
| `backend/app/Http/Controllers/Api/V1/MaintenanceRequestController.php` → `Services/MaintenanceRequestService.php` | Controller chuyển validated input sang Service. `context`/`store` tìm contracts active của tài khoản để xác định phòng; `scope` lọc maintenance_requests.user_id cho Resident hoặc assigned_to cho Technician. `assign/start/resolve/reject/reopen` khóa phòng rồi yêu cầu trong transaction (nhóm thao tác cùng thành công hoặc cùng thất bại); kiểm lại trạng thái trước khi lưu. |
| `backend/app/Models/MaintenanceRequest.php`, `Policies/MaintenanceRequestPolicy.php`, `Http/Resources/MaintenanceRequestResource.php` | Model nối users/contracts/rooms/attachments; Policy chặn sai vai trò/chủ sở hữu/người được giao. Resource chỉ trả thông tin cần dùng; SĐT người gửi chỉ được trả cho Technician khi được giao và yêu cầu pending/in_progress; Admin có quyền xem. GET ảnh qua route có Policy, không trả đường dẫn storage. |

Các bảng chính: maintenance_requests lưu nội dung/trạng thái; contracts xác minh hợp đồng active; rooms/buildings xác định phòng/tòa; users kiểm danh tính/phân công; attachments ghi metadata ảnh private; notifications lưu thông báo sau commit. Không tự sinh phí hay thay phòng occupied chỉ vì có sự cố.

Ví dụ minh họa, không phải dữ liệu dev: GET `/api/v1/maintenance-requests?status=pending&page=1` lấy trang đầu các yêu cầu chờ trong phạm vi quyền. Chọn Tất cả gửi `/api/v1/maintenance-requests?page=1`; gửi `status=` là giá trị enum không hợp lệ. Trong DevTools → Network, xem Query String Parameters, JSON response và cookie; không sao chép cookie/mật khẩu vào báo cáo.

**Câu hỏi bảo vệ:**
1. Vì sao bỏ status rỗng? Không lọc khác với gửi một giá trị enum sai; sửa caller React, giữ validation Backend.
2. Vì sao giới hạn theo byte thay vì số ký tự? TEXT chứa tối đa65.535 byte; một emoji có thể chiếm4 byte UTF-8. Frontend hỗ trợ nhập liệu, Backend vẫn là lớp kiểm tra cuối.
3. Hai Technician gửi hoàn tất cùng lúc thì sao? Khóa bản ghi, đọc lại trạng thái; ca HTTP hai phiên đã trả200/409, không lưu hai kết quả.
4. Vì sao ẩn nút/SĐT bằng React chưa đủ? Người dùng có thể gọi API trực tiếp; Policy và Resource mới là nơi quyết định quyền/dữ liệu được trả.
5. Vì sao không kiểm ghi trên dev? Dùng DB/tài khoản test tách riêng và guard để không đụng dữ liệu thật; bằng chứng browser DBtest không tự trở thành nghiệm thu dev.

Kết quả/giới hạn cập nhật tại Plan§12.43; ảnh private đã upload bằng filechooser thật, không tuyên bố đã kiểm OS offline/mobile hay hoàn thành ảnh nghiệm thu.

### 11.51. FILE/PAY — từ chọn ảnh đến sổ tiền thật (31/10–01/11)

Bản đồ mở code, không cần đọc lại toàn bộ lý thuyết:

| Việc cần tìm | File/hàm thật | Luồng/dữ liệu |
| --- | --- | --- |
| Ngân sách ảnh final | `frontend/src/lib/uploadLimits.ts:uploadBudgetError`; `features/contracts/finalInvoice.ts:finalInvoiceInputSchema/buildFinalInvoiceFormData`; `pages/admin/AdminContractTerminatePage.tsx` | Cộng ảnh hư hỏng+waiver:20ảnh/30MiB. Schema (bộ quy tắc kiểm tra) trả lỗi trước tạo multipart; page còn nhận422 errors.damage_photos vào lỗi tổng. Không tính tiền tại React. |
| Laravel kiểm tổng | `backend/app/Http/Requests/Contract/CreateFinalInvoiceRequest.php:49 after()` | Laravel kiểm từng ảnh/hạng mục và cộng tất cả allFiles; quá ngân sách trả422 trước Controller/Service ghi attachments/invoices. Case test20/21ảnh,30MiB/vượt1byte. |
| 32MiB khác30MiB | `docker/php/php.ini`; `docker/nginx/default.conf`; `backend/bootstrap/app.php`; bind readonly trong `docker-compose.yml` |32MiB chứa ảnh30MiB và phần đầu/mã phân cách multipart (gói gửi nhiều trường/tệp). max_file_uploads64 để PHP không bỏ ảnh21 trước Laravel; giới hạn nghiệp vụ vẫn20. Nginx/PHP quá tổng trả413JSON tiếng Việt. Thay ini phải kiểm runtime, không chỉ đọc file source. Không migration. |
| Bắt đầu gửi minh chứng | `frontend/src/features/payments/PaymentEntryForm.tsx:PaymentProofForm/submit`; `schemas.ts:paymentProofSchema` | RHF nhận amount/File, Zod kiểm File thật/MIME/5MiB. Một lỗi đã tái hiện: proof không có key lọt optional/refine cũ; custom validation mới từ chối cả missing/undefined/null/object giả. Laravel trước đó vẫn từ chối, không tạo payment sai. |
| Request qua cookie | `features/payments/api.ts:submitPaymentProof`; `src/lib/http.ts`; `backend/routes/api.php` | `POST /api/v1/invoices/{invoice}/payments`, multipart amount+proof; lấy CSRF trước gửi, Axios tự gắn cookie phiên/XSRF. Ví dụ DBtest invoice1triệu,amount400000+PNG tạo pending; tuyệt đối không gửi role/reviewer/status để tự xác nhận. |
| Quyền và ghi sổ | `PaymentRequest`; `PaymentPolicy`; `PaymentController::store/confirm/reject/proof`; `PaymentService::store/locked/confirm/reject/confirmed/syncInvoice` | auth:sanctum/active/spa và Policy kiểm actor/chủ sở hữu; transaction (nhóm thao tác ghi cùng thành công/thất bại) khóa room/users/contract/invoice/payments theo thứ tự. Bảng payments chứa số tiền/trạng thái, attachments chứa ảnh private, invoices chứa tổng đã xác nhận. syncInvoice chỉ Money::sum confirmed, không cộng pending/rejected. Không sửa invoice_items/total/due khi xác nhận. |
| Xác nhận/từ chối | `features/payments/api.ts:reviewPayment`; `PaymentService::confirm/reject/confirmed` | `POST /api/v1/payments/{id}/confirm` gửi expected_revision/expected_amount/confirmed_received; reject gửi revision/reject_reason. revision là dấu phiên bản dữ liệu để phát hiện màn hình cũ, không phải quyền. RCP sinh khi confirmed; replay giữ cùng RCP. Lần thử qua tháng VN tạo RCP32 tháng10 vàRCP34 tháng11, ID không reset. |
| Hiển thị/ảnh/lỗi | `InvoicePayments.tsx`; `api.ts:getPayments/getPaymentProof`; `InvoiceList.tsx`; `invoices/types.ts:invoiceStatusLabels` | GET payments lọc invoice_id/status/method/page; GET payments/{id}/proof trả blob (nội dung nhị phân), không mở disk công khai. PaymentResource (`backend/app/Http/Resources/PaymentResource.php`) định dạng JSON; Model Payment/Invoice/Attachment ở `backend/app/Models/` ánh xạ bảng. Refresh lại ledger sau ghi. Paid là Đã thanh toán hóa đơn, không có nghĩa hợp đồng đã thanh lý. |

Bài học lỗi mạng thực: HTTP504 nhưng hậu kiểm đã có một pending400k. Không được hiểu lỗi màn hình là chắc chắn chưa ghi. Form nay báo kết quả chưa xác định cho5xx/mất mạng, yêu cầu đóng/tải lịch sử trước gửi lại; chưa chứng minh căn nguyên timeout đã sửa.503 có kiểm soát đã thử, request100k bình thường thành công; không tự dedupe theo amount/ảnh hoặc đổi chính sách thanh toán.

Hành trình minh họa đã chạy **chỉ DBtest**:1triệu→400k pending (nợ vẫn1triệu)→confirm400k (nợ600k/RCP)→100k rejected (nợ vẫn600k/giữ ảnh/lý do)→cash600k confirmed (paid/nợ0). GET/ảnh không đủ quyền403; chưa đăng nhập401; thiếuCSRF419; input sai422; trạng thái đã đổi409. Chưa OSoffline/đảo response/kiểm lỗi mất phản hồi đúng sau commit; browser final21ảnh chưa thử, không đánh dấu PASS từ unit/API.

Câu hỏi bảo vệ: (1) Vì sao cần cả Zod và FormRequest? Zod giúp người dùng, Laravel bảo vệ dữ liệu khi client bị sửa. (2) Vì sao32MiB nhưng chỉ nhận30MiB ảnh? Dành overhead multipart, tổng bytes ảnh vẫn kiểm ở Laravel. (3) Vì sao pending không giảm nợ? Chưa được Admin xác nhận thực nhận. (4)504 có nghĩa chưa ghi không? Không; phải tải lại lịch sử, không tự gửi trùng. (5) Vì sao RCP chỉ sinh khi confirmed và invoice paid khác đóng hợp đồng? Biên nhận ghi nhận tiền đã xác nhận; trạng thái hợp đồng/cọc/trả phòng có luồng riêng, thanh toán hóa đơn không thay chúng.
### 11.52. NOTIF — đọc từ chuông tới MySQL (01/11/2026)

| Chức năng | File/hàm thật để mở | Dữ liệu/luồng |
| --- | --- | --- |
| Chuông và trang | layouts/AdminLayout.tsx, ResidentLayout.tsx, StaffLayout.tsx; pages/admin/AdminNotificationsPage.tsx, resident/ResidentNotificationsPage.tsx, staff/StaffNotificationsPage.tsx | Link đúng /admin, /resident, /staff/notifications; các page dùng chung NotificationsWorkspace. Guard có thể có danh sách rỗng thật, không phát broadcast giả. |
| Đọc một/tất cả, mở link | features/notifications/NotificationsWorkspace.tsx:runReadAction/openDetails | Nút gọi action, khóa thao tác lặp trong flight; thành công mới tải lại hoặc navigate. Item đã đọc không POST lại. Link thường khi APIread503 giữ nguyên trang và báo lỗi; modifier mở tab vẫn theo trình duyệt. |
| Cookie/HTTP | features/notifications/api.ts:getNotifications/readNotification/readAllNotifications; lib/http.ts | GET /api/v1/notifications?status=all hoặc unread&page=N; POST /notifications/{uuid}/read và /notifications/read-all sau fetchCsrfCookie, body rỗng, Axios gắn cookie/XSRF. Không gửi user_id/read_at/role. |
| Route và quyền | backend/routes/api.php; NotificationRequest::authorize/rules; NotificationPolicy::viewAny/view; EnsureActiveAccount::handle | auth:sanctum/active; POST thêm spa/CSRF. Chỉ own, Admin không đọc hộ. Guest401/foreign404/CSRF419/trườngthừa422/schema503. Tài khoản vừa khóa:403 và hủy phiên, request sau401; không coi401sau là lỗi phân quyền. |
| Truy vấn | backend/app/Http/Controllers/Api/V1/NotificationController.php:index/read/readAll; app/Services/NotificationService.php:query/readAll | Bảng notifications: notifiable_type=user, notifiable_id lấy từ request->user()->id. Read-all thêm read_at IS NULL, một UPDATE nguyên tử cho mọi trang; không ghi lại dòng đã đọc. marked_count là số dòng vừa thay đổi, lần lặp thường0. Không chạm công nợ/cọc/phòng. |
| JSON và nguồn | NotificationResource::toArray; NotificationService::saved/payload; AppServiceProvider::boot | Resource chỉ id/type/title/body/link/read_at/created_at, không rawdata/PII; link ngoài bị loại. Service đăng ký sự kiện nguồn và afterCommit (sau khi transaction ghi thành công), UUID xác định chống trùng; rollback không gửi. Các Service nguồn đã có INV/PAY/CTR/U2/VIEW/MAINT. |
| URL và mobile | features/notifications/filters.ts:withoutNotificationPage; auth/types.ts:appointmentsDestination; auth/AccountActions.tsx | Đọc từ trang cuối unread reset page thông báo; clone URL giữ status lịch hẹn và notice_status độc lập. Mobile trước thiếu lối tới lịch hẹn; nay dùng cùng link/điều kiện role với desktop. Đây là điều hướng, quyền thật vẫn ở Laravel. |

Thực hành DevTools Network (công cụ xem request): lọc notifications, bấm Chưa đọc/Sau, xem query status/page và response unread_count/meta. Bấm Đánh dấu tất cả đã đọc: POST không body, response ví dụ `{data:{marked_count:20}}`, GET sau đó count0. UUID từ response là ID thông báo, không phải IDinvoice. Ví dụ run test21notice: đọc1 ở trang2→20unread, batch từ trang2 all→0 nhưng không xóa21dòng hoặc đổi timestamp của dòng đầu. Đã đối chiếu9bảng nghiệp vụ trước–sau bằng nhau; đây là DBtest, không dữ liệu vận hành.

Câu hỏi bảo vệ: (1) Vì sao Admin không đọc hộ notification? Đây là hộp thư cá nhân theo Q16; quyền xem đối tượng nguồn là quy tắc riêng. (2) Vì sao WHEREread_at IS NULL? Giữ thời điểm đã đọc và làm thao tác lặp an toàn. (3) Vì sao không gửi20POST? Batch một UPDATE gồm mọi trang, ít request và không bỏ sót trangẩn. (4) Tại sao status=confirmed và notice_status=unread cùng URL? Hai workspace có bộ lọc riêng, prefix tránh ghi đè. (5) Vì sao đợi POST xong mới mở link? Không báo đã đọc giả khi server lỗi; Backend vẫn kiểm quyền đối tượng đích.

### 11.53. Dashboard Admin — bản đồ bốn chỉ số thật (DASH-02/03,01/11/2026)

- Mở `frontend/src/pages/admin/AdminDashboardPage.tsx:6` → ghép `DashboardSummaryPanel`; phần bảng/danh sách chưa nối vẫn có thông báo, không số giả. Không sửa sidebar hay thêm màn.
- `frontend/src/features/dashboard/DashboardSummaryPanel.tsx:12`: effect gọi API lúc mở trang; `reloadSummary():28` là hàm của nút Tải lại/Thử lại. `attempt` là số lượt tải, `AbortController` hủy lượt cũ khi rời trang; không giữ số cũ trong loading/error. `schemas.ts` kiểm định dạng response, `BigInt` chỉ đổi chuỗi nguyên để định dạng, không tính tiền.
- `features/dashboard/api.ts:getDashboardSummary` gọi `http.get('/dashboard')` → URL thật GET `/api/v1/dashboard`, không query/body; `lib/http.ts` gửi cookie phiên như các API khác. Thêm `?period=...` hiện trả422, chưa có quyền chọn tháng khác trong lát cắt này.
- `backend/routes/api.php:48` → `auth:sanctum` (xác định tài khoản từ phiên), `active` (chặn khóa), `role:admin` → `DashboardRequest` authorize/không nhận bộ lọc → `DashboardController::show` → `DashboardService::summary():22` → `DashboardResource::toArray`. Controller trả `Cache-Control:no-store,private`; không trả tên/điện thoại, password hoặc hồ sơ người thuê.
- Bảng MySQL: `contracts` active đếm room_id khác nhau; `payments` confirmed+cash/bank_transfer theo reviewed_at trong [đầu tháng VN,đầu tháng sau), đổi mốc sang UTC trước query; `invoices` issued/partially_paid/total>paid, dùng lại `DebtService::outstanding():68`, kể cả hợp đồng terminated; `maintenance_requests` pending kể cả đã phân công. Đọc cùng transaction (ảnh chụp dữ liệu nhất quán), không lock/UPDATE nghiệp vụ. `Money::remaining/aggregate` dùng BCMath để cộng chính xác; không float.
- Middleware thật: `backend/app/Http/Middleware/EnsureActiveAccount.php` và `EnsureUserHasRole.php`; Model dùng `backend/app/Models/Contract.php`, `Invoice.php`, `Payment.php`, `MaintenanceRequest.php`. Không thêm Model hoặc bảng Dashboard.
- Response chỉ5trường theo brief§42. React kiểm schema rồi hiển thị4StatCard; 401/403 làm mới Auth, lỗi khác thông báo/retry, không thay bằng0. Muốn sửa công thức: đối chiếu DB-D82 trước, chỉnh `DashboardService::summary` và `DashboardApiTest`; muốn sửa nhãn: `DashboardSummaryPanel`; muốn thêm bộ lọc: phải duyệt Spec/API và đồng bộ Request/client/schema/tests.

Câu hỏi bảo vệ: (1) Hết end_date sao vẫn đếm? Chưa thanh lý thì status vẫn active, không tự kết thúc. (2) Tại sao dùng reviewed_at thay created_at? Đây là tháng thực nhận đã được Admin xác nhận, theo múi giờ VN. (3) Cọc/pending có phải doanh thu? Không; cọc là nghĩa vụ riêng, pending chưa xác nhận. (4) Vì sao tiền trả dạng chuỗi? Tổng nhiều khoản có thể vượt số nguyên an toàn JavaScript; BigInt chỉ định dạng. (5) Ẩn menu có bảo vệ được API? Không, Laravel kiểm cookie/active/role trước Controller. Bằng chứng test/live/giới hạn xem Plan§12.46, không suy FullMVP hoàn tất từ bốn thẻ.

Kết quả tại checkpoint Dashboard:1396test/13770assertion/Pint343; frontend123/build/lint PASS,15HTTP và8tìnhhuống browserAdminDBtest theo Plan§12.46. Dev4GETstateless đạt nhưng chưa kiểm Dashboard bằng Admin thậtdev; không dùng số APIcoverage50/52 để nói FullMVP đã hoàn tất. Code local e8b810b; không push. Ở mốc này ảnh phòng mới là đề xuất; sau đó đã được duyệt DB-D83 và triển khai tại §11.54, không còn là quyết định chờ duyệt.

### 11.54. Ảnh phòng — code thật để mở và truy vết (FILE-R01..03/D83)

1. Mở `frontend/src/pages/admin/AdminRoomDetailPage.tsx:78` → `RoomPhotosPanel` trong tab Thông tin. Trong `frontend/src/features/room-photos/RoomPhotosPanel.tsx`, hàm `submitPhotos` ở dòng 51 nhận sự kiện gửi form; ô chọn tệp gọi `form.setValue('photos', Array.from(files))`. React Hook Form quản lý form, Zod kiểm dữ liệu phía trình duyệt. `chooseCover:65` gửi lựa chọn bìa; `confirmRemove:73` tải lại danh sách sau HTTP 204 để lấy bìa do server chọn. Lỗi hiện ngay trong hộp xác nhận; lỗi 5xx/mất mạng báo kết quả chưa xác định, cần đọc lại trước khi gửi lại.
2. Mở `frontend/src/features/room-photos/api.ts`: `uploadRoomPhotos` tạo `FormData` (dữ liệu gửi kèm tệp), thêm `photos[]`, lấy CSRF cookie rồi POST `/api/v1/rooms/{room}/photos`. `lib/http.ts` gửi cookie phiên. `getRoomPhotos` dùng GET; `setRoomCover` dùng PUT với body `{expected_cover_id}`; `removeRoomPhoto` dùng DELETE. Không gửi đường dẫn lưu trữ, disk hoặc vai trò từ React. Giới hạn nằm ở `schemas.ts` và `lib/uploadLimits.ts`.
3. Mở `backend/routes/api.php:38`: nhóm `api.v1.rooms.photos.*` yêu cầu Sanctum và tài khoản active; thao tác ghi thêm middleware `spa` để kiểm session/CSRF. `RoomPhotoRequest` kiểm quyền qua `RoomPolicy` và dữ liệu đầu vào → `RoomPhotoController` nhận request → `RoomPhotoService` xử lý nghiệp vụ. URL Public ở dòng 86 không cần đăng nhập nhưng kiểm lại `Room::publicAvailable()` và `RoomPolicy::viewPublic`: phòng còn công khai/available, tòa active. URL Admin còn kiểm `AttachmentPolicy`, đúng phòng, collection, disk, đường dẫn và loại ảnh.
4. MySQL dùng ba bảng `rooms`, `buildings`, `attachments` đã có; không thêm bảng ảnh. `Room::photos():58` dùng quan hệ đa hình (một bảng tệp gắn được với nhiều loại đối tượng), lọc `room_gallery`/`private`, sắp bìa trước rồi `sort_order`/ID. Resource chỉ trả `id`, `url`, `is_cover`, `sort_order`, không trả đường dẫn ổ đĩa/tên gốc. URL kiểm quyền mỗi lần đọc; nội dung người xem đã tải về trước khi ẩn phòng không thể thu hồi.
5. Mở `backend/app/Services/RoomPhotoService.php`: `store:33` lưu tệp rồi ghi metadata (thông tin mô tả tệp); lỗi SQL hoặc vượt 20 ảnh thì dọn các tệp vừa lưu. `cover:83` kiểm bìa dự kiến để phát hiện dữ liệu cũ; `remove:101` commit metadata rồi mới xóa tệp vật lý. `locked:146` dùng transaction (khối ghi CSDL cùng thành công hoặc hoàn tác) và khóa tòa/phòng để hai request không vượt 20 ảnh hoặc tạo hai bìa. CSDL và ổ đĩa không chung transaction: nếu xóa tệp sau commit thất bại, URL đã vô hiệu, hệ thống ghi lỗi chung để vận hành dọn tệp dư; không báo giả rằng CSDL đã rollback.
6. `PublicRoomResource`/`RoomResource` bổ sung `photos`; `PublicRoomService`/`RoomService` tải sẵn quan hệ để tránh truy vấn lặp theo từng phòng. `frontend/src/features/rooms/RoomCard.tsx` hiển thị bìa; `frontend/src/pages/public/RoomDetailPage.tsx` nối `RoomGallery` có sẵn. React hiển thị thứ tự/bìa do Laravel trả, không tính tiền và chưa có thao tác sắp xếp ảnh tùy ý.

Thực hành bằng DevTools → Network (bảng xem request trình duyệt): lọc `photos`, mở request để xem method/URL, cookie phiên và form data. Upload dùng POST multipart trả 201; chọn bìa dùng PUT trả 200; gỡ dùng DELETE trả 204; đọc ảnh trả 200 với Content-Type image/png. Ví dụ minh họa khi thử trên DB test: PUT `/api/v1/rooms/10/photos/21/cover`, body `{"expected_cover_id":20}`. Hai ID phải lấy từ GET thật; nếu bìa đã đổi thì trả 409, chọn lại đúng bìa hiện tại trả 200 và không ghi thêm. Ảnh Public của phòng bị ẩn trả 404; ảnh Admin không cookie trả 401, vai trò khác Admin trả 403. Không thử ghi dữ liệu dev khi chưa được phép.

Câu hỏi bảo vệ: (1) Vì sao chỉ kiểm đuôi tệp chưa đủ? Phải kiểm MIME (loại nội dung thực tế) và ảnh hợp lệ. (2) Vì sao ảnh công khai vẫn lưu private? URL có kiểm soát giúp chặn đọc khi phòng bị ẩn. (3) Vì sao CSDL và tệp không rollback giống nhau? Chúng nằm ở hai hệ thống lưu trữ khác nhau. (4) Vì sao khóa phòng? Để các thao tác đồng thời vẫn giữ tối đa 20 ảnh và một bìa. (5) Vì sao không tự gửi lại khi gặp 5xx? Request có thể đã commit nhưng mất phản hồi. Test chính: `backend/tests/Feature/Rooms/RoomPhotoApiTest.php`, worker DB test có guard và `frontend/tests/roomPhotos.test.mjs`; bằng chứng/giới hạn ở Plan §12.47.

Bằng chứng mới: full Backend1414 test/14077 assertion, Pint349 file, frontend126 test/build/lint PASS (0 lỗi/9 cảnh báo cũ). 46 kiểm tra HTTP/13 tình huống browser chính, hai race subprocess và kiểm lại upload/F5 trên form cuối ghi riêng tại Plan §12.47. Fixture/schema test đã dọn, snapshot dev cuối khớp29 bảng/29 migrations; không ghi dữ liệu dev. Code checkpoint local af77958. Các giới hạn browser JPEG/WebP/OS offline/mất phản hồi sau commit và lỗi PAY504 chưa rõ gốc vẫn được giữ, không suy toàn Full MVP hoàn thành.

### 11.55. Hợp đồng Admin — giao diện bốn trang (CTR-UI, 01/11/2026)

1. `frontend/src/pages/admin/AdminContractsPage.tsx:44` đọc bộ lọc từ URL bằng `useSearchParams` (tham số trên địa chỉ trang), kiểm bằng `contractFiltersSchema` rồi gọi `getContracts` (`features/contracts/api.ts`) → GET `/api/v1/contracts?status=&q=&page=`. Hàm `navigate():71` ghi bộ lọc mới lên URL nên F5 giữ nguyên. `isPastLastDay` (`features/contracts/types.ts:24`) so `end_date` với `businessToday()` (`lib/format.ts:43`, ngày theo giờ VN) chỉ để cảnh báo; Laravel vẫn coi hợp đồng là active.
2. `AdminContractNewPage.tsx:17` + `features/contracts/DraftContractForm.tsx`: form 3 bước gửi POST/PATCH `/api/v1/contracts`; cột “Tóm tắt bản nháp” dùng `useWatch` để hiển thị giá trị đang nhập, không tính tiền. Khối Quy trình chỉ dẫn tới nơi xử lý thật.
3. `AdminContractDetailPage.tsx:87`: tab lấy từ `?tab=` (`setTab:105`). `ActivationChecklist:30` đọc `early_termination_fee_type`, `deposit_status`, `contract_services` đã lưu; thao tác vẫn ở `ContractLifecycleActions` (POST `/deposit`, `/activate` kèm `expected_revision`). `ContractInvoicesTab:48` chỉ gọi khi tab mở: GET `/api/v1/invoices?contract_id=&page=` (`features/invoices/api.ts:getInvoices`).
4. `AdminContractTerminatePage.tsx:71`: tải hợp đồng + hóa đơn final mới nhất; `ContractSummary:45`/`HandoverProgress:29` chỉ đọc dữ liệu đã lưu. `InspectionForm:331` (bước 1) → `ClosureForm:124` (bước 2, POST `/final-meter-preview`) → `FinalInvoiceForm:182` (bước 3, POST `/final-invoice`, phát hành qua `/invoices/{id}/issue`) → `ContractSettlementPanel` (bước 4, GET `/settlement-preview`, POST `/terminate`). Mọi số tiền lấy từ response.

Kiểm chứng bằng DevTools → Network: đổi tab ở danh sách thấy GET có `status=`; bấm lưu nhiều lần chỉ có một POST vì cờ `useRef` chặn gửi lặp; tab Hóa đơn của bản nháp không phát sinh request. Muốn thêm tab “Quá hạn” hoặc số đếm: cần duyệt API bộ lọc/đếm trước, không lọc trên một trang ở React.

Câu hỏi bảo vệ: (1) Vì sao quá ngày cuối không đổi badge thành trạng thái mới? DB-D43: hợp đồng vẫn active và tiếp tục tính tiền đến khi bàn giao. (2) Checklist có thay kiểm tra server không? Không, Laravel kiểm lại trong transaction kích hoạt. (3) Vì sao lưu tab/bộ lọc trên URL? Để F5 và liên kết giữ đúng màn. (4) Vì sao không làm wizard 8 bước? Bước người ở cùng chưa có API, các bước khác cần bản nháp đã lưu. (5) Vì sao kiểm kê đứng trước chỉ số chốt? Hóa đơn tất toán yêu cầu kiểm kê, và lưu kiểm kê đổi revision làm bản xem trước cũ hết hiệu lực. Bằng chứng: Plan §12.48.

### 11.56. Hợp đồng Admin — bộ lọc hạn và thay dịch vụ đang hiệu lực (CTR-API, 02/11/2026)

1. Danh sách: `AdminContractsPage.tsx` → `getContracts` (`features/contracts/api.ts`) gửi GET `/api/v1/contracts?due=overdue|expiring`. Laravel: `IndexContractRequest` (rule `due`, hàm `after()` chặn `due` đi với status khác active) → `ContractController::index` → `ContractService::listing():54` (đếm bằng một câu `SUM(status = ? ...)` trên cùng bộ lọc, rồi lọc trang) → `dueWindow():89` lấy ngày VN và khóa `contract.expiring_warning_days`. Response thêm `meta.counts`/`meta.due`; React dùng `contractDueState` (`types.ts:83`) để gắn nhãn, không tự đổi trạng thái.
2. Thay dịch vụ: tab Dịch vụ → `ContractServicesPanel` (`ContractServicesPanel.tsx:89`) mở modal, form `DraftServicesForm` với `effective` (ngày áp dụng, `serviceChangeEffectiveDate` trong `types.ts`) → `saveDraftContractServices(id, input, lifecycle_revision)` → PUT `/api/v1/contracts/{id}/services`. Laravel: `ContractService::updateServices():204` chọn nhánh; `changeActiveServices():215` khóa phòng→người thuê→hợp đồng→dòng dịch vụ, so `expected_revision`, kiểm hóa đơn kỳ áp dụng, đóng dòng cũ/tạo dòng mới.
3. Bảng MySQL: `contracts` (lọc `status`,`end_date`), `settings` (ngưỡng ngày), `contract_services` (`start_date`/`end_date` inclusive), `invoices` (chặn khi đã có kỳ áp dụng). Hóa đơn tháng sau tự dùng dòng mới vì `InvoiceCalculationService` tính theo giao khoảng ngày của từng dòng.

Kiểm chứng bằng DevTools → Network: tab Quá hạn gửi `due=overdue`, response có `meta.counts`; lưu thay dịch vụ gửi PUT có `expected_revision`, bấm nhiều lần chỉ một request; mở hai tab rồi lưu ở tab cũ sẽ nhận 409.

Câu hỏi bảo vệ: (1) Vì sao số đếm lấy từ server? Danh sách phân trang 20 dòng, đếm ở React chỉ đúng một trang. (2) Quá hạn có đổi trạng thái không? Không, BR-CTR-09/DB-D43: vẫn active và tính tiền tới bàn giao. (3) Vì sao không sửa dòng dịch vụ cũ? Kỳ đã tính tiền phải giữ snapshot; thay đổi chỉ từ 01 tháng sau. (4) Vì sao cần `expected_revision`? Chặn gửi lặp và ghi đè dữ liệu người khác vừa đổi. (5) Vì sao chưa làm người ở cùng/xác nhận hoàn cọc? Một là SHOULD chưa chốt quy tắc đồng bộ số người, một cần schema mới mà DB-D78 chưa duyệt. Bằng chứng: Plan §12.49, API brief §44.

### 11.57. Người ở cùng — API riêng, không tự đổi số người/phí (DB-D84, 02/11/2026)

1. Mở `frontend/src/pages/admin/AdminContractDetailPage.tsx:146`: tab Người ở cùng giữ `?tab=occupants`; dòng170 gắn `ContractOccupantsPanel`. Trong `frontend/src/features/contracts/ContractOccupantsPanel.tsx`, `beginEdit:49` mở form, `submit:62` lưu thêm/sửa, `confirmRemove:74` gỡ sau xác nhận. `inFlight` là cờ chặn gửi lặp; sau ghi thành công tải lại hợp đồng để các panel dùng phiên bản mới. `reload:44` đóng form cũ trước khi tải lại.
2. `frontend/src/features/contracts/api.ts`: `getContractOccupants` GET; `saveContractOccupant` POST khi thêm/PATCH khi sửa; `removeContractOccupant` DELETE. URL `/api/v1/contracts/{id}/occupants[/id]`, không query. Gửi cookie phiên và CSRF qua `lib/http.ts`; body ghi có `expected_revision`, họ tên/SĐT/quan hệ, không có số người/giá/role. `occupants.ts` kiểm dữ liệu bằng Zod; ô tùy chọn rỗng được API chuyển NULL. Frontend hiển thị registered_count/has_count_mismatch do server trả, không tự tính phí.
3. `backend/routes/api.php:147` và169–171 → auth:sanctum/active/role:admin, thao tác ghi thêm spa/CSRF → `ContractOccupantRequest::authorize/rules` → `ContractOccupantController::index/store/update/destroy` → `ContractOccupantService::read:21/store:33/update:45/remove:56`. Controller mỏng, Resource chỉ xuất trường cần thiết. GET dùng transaction đọc nhất quán; `mutate:63` khóa phòng → tài khoản theo ID → hợp đồng → hồ sơ, kiểm lại quyền Admin từ CSDL và hợp đồng còn nháp.
4. Bảng chính là `contract_occupants` (họ tên/phone/relationship, contract_id do server gán); đọc `contracts`, `rooms`, `users`, `contract_services` để kiểm điều kiện/phiên bản. Không ghi contracts.occupant_count, dịch vụ, hóa đơn, payment hoặc role. `snapshot:105` trả tổng hồ sơ cộng một đại diện và cảnh báo lệch; capacity vẫn chặn ở Backend. Gỡ chỉ hồ sơ đúng bản nháp; active/terminated chỉ đọc, không xóa lịch sử.
5. `Contract::lifecycleRevision:88` băm cả thuộc tính, dịch vụ và danh sách người ở cùng (SHA256, không chỉ timestamp giây). Vì vậy thay hồ sơ làm form kích hoạt/phiên chỉnh sửa cũ nhận409 thay vì dùng dữ liệu cũ. `ContractService::validateOccupantCapacity` kiểm cả danh sách khi chuyển nháp sang phòng nhỏ hoặc kích hoạt sau giảm sức chứa. Tên/SĐT không làm khóa duy nhất; có thể trùng thật. Lỗi SQL được thay bằng thông báo chung, không log nội dung cá nhân.

Thực hành DevTools → Network: lọc `occupants`. Ví dụ minh họa (ID phải lấy từ DBtest thật): POST `/api/v1/contracts/10/occupants`, body `{"expected_revision":"<revision GET trả về>","full_name":"Nguyễn A","phone":null,"relationship":"Bạn"}` →201, đọc Resource mới. Sửa dùng PATCH `/10/occupants/21` →200; gỡ gửi DELETE cùng URL với revision →204 rồi GET lại. Mở hai phiên, lưu ở một phiên rồi gửi form cũ →409; đóng form và tải lại, không tự gửi lại. Phone chỉ trả qua API Admin; Resource cư dân hiện có vẫn không trả SĐT người ở cùng.

Câu hỏi bảo vệ: (1) Vì sao số người khai báo khác danh sách vẫn lưu được? D84 cho danh sách chưa đầy đủ và chỉ cảnh báo; không tự sửa tổng. (2) Có được vượt sức chứa không? Không, server kiểm cả số khai báo và số hồ sơ cộng đại diện. (3) Vì sao active chỉ xem? Lát cắt chỉ cho sửa nháp để giữ lịch sử. (4) Vì sao cần revision và khóa? Revision phát hiện dữ liệu cũ; khóa ngăn hai request cùng vượt sức chứa hoặc ghi song song với kích hoạt. (5) Xóa hồ sơ có giảm phí theo người không? Không, phí dùng quantity snapshot riêng; không hồi tố hóa đơn.

Bằng chứng: full1439 test/14440 assertion/Pint358 PASS; frontend133/build/lintPASS (0 lỗi/9 cảnh báo cũ), HTTP27ca+1race và browser12tìnhhuống theo Plan§12.50. Hai race process gồm store/store và store/activate. Postflight DBtest sạch/FK bật/dev bị từ chối1142; dev29bảng/29migration và privatebaseline path+hash giữ nguyên, không migration hoặc dữ liệu dev. Code local5f208e2. Chưa browser OSoffline/mất phản hồi đúng sau commit hoặc thao tác Admin thậtdev; dữ liệu readonly dùng fixture trạng thái, không phải nghiệm thu lại toàn bộ hành trình kích hoạt/thanh lý. Không push.


### 11.58. Thanh toán: lỗi phản hồi không có nghĩa là chưa lưu (PAY-04,02/11/2026)

- **Mở từ giao diện:** chi tiết hóa đơn Admin/Resident dùng `frontend/src/features/invoices/InvoiceDetail.tsx:41` (`paymentsChanged`) và `features/payments/InvoicePayments.tsx:12` (`saved`: đóng modal, tải lại workspace/hóa đơn). Biểu mẫu ở `PaymentEntryForm.tsx`: `PaymentProofForm.submit:16` gửi ảnh, `DirectPaymentForm.submit:38` ghi thực nhận; đối soát dùng `PaymentReviewForm.tsx:20` (`run`), `submit:29` chặn gửi lặp. `flight` là cờ khóa ngay lập tức; `requiresReload` là trạng thái để khóa nút/ô nhập khi chưa rõ kết quả. Nút phục hồi có type=button, không gửi form. Đóng modal cũng đọc lại dữ liệu.
- **Request thật:** `features/payments/api.ts:8` (`submitPaymentProof`) POST `/api/v1/invoices/{id}/payments`, multipart gồm amount+proof. `recordDirectPayment:13` cũng POST URL đó nhưng JSON amount/method/confirmed_received/expected_revision. `reviewPayment:16` POST `/api/v1/payments/{id}/confirm|reject`, JSON revision+expected_amount/confirmed_received hoặc reject_reason. Shared `lib/http.ts` gửi cookie phiên+XSRF, không tự retry. Backend route `backend/routes/api.php:117–124` dùng Sanctum/active/spa rồi `PaymentRequest::authorize/rules`, Policy, `PaymentController::store:29/confirm:35/reject:40`, `PaymentService::store:68/confirm:114/reject:137`.
- **CSDL/tiền:** Service `locked:163` khóa phòng→users→contract→invoice→payments và kiểm ledger trong transaction (giao dịch nhiều lệnh cùng thành công). Ghi payments/attachments; chỉ confirmed mới cập nhật invoices.paid_amount/status và có RCP. Pending không giảm nợ, được phép nhiều khoản hợp lệ. React đọc Resource rồi hiển thị, không tính tiền thay Laravel. Phản hồi HTTP đi qua session-save/proxy sau khi transaction đã commit (ghi xong); lỗi ở đường phản hồi không tự hoàn tác số tiền.
- **Lỗi và cách sửa:** `features/payments/submissionError.ts:5` (`paymentSubmissionError`) phân biệt phản hồi4xx rõ ràng với mạng/5xx/lỗiclient chưa rõ kết quả. Cả3form dùng chung hướng dẫn đọc lại; giữ flight khóa trong lần form đó. `PaymentsWorkspace.tsx:34` (`reload`) GET lại `/payments?invoice_id=...&status=...&method=...&page=1`; parent GET lại `/invoices/{id}`. `InvoiceDetail.paymentsChanged` dùng nhãn “Đã tải lại dữ liệu…” để không báo giả đã ghi tiền. Muốn sửa nội dung/cách phục hồi, bắt đầu ở helper và các callback này; không thêm logic gộp pending hoặc tự giảm nợ ở React.
- **Thực hành minh họa:** hóa đơn1.000.000đ, gửi ảnh100.000đ. Nếu504 sau commit, mở Network thấy POST504 rồi bấm Tải lại: GETpayment có một pending100.000, GEThóa đơn vẫn paid0/còn1.000.000. Không bấm gửi hoặc chuyển tiền lại chỉ vì504. Trong QA thực, cash200k+confirm100k làm paid300k/còn700k, reject50k không giảm thêm. Kiểm thử frontend135; backend hồi quy18/237 và browser/HTTP riêng ở Plan§12.51, không gọi fullsuite1439 là lượt mới.

**Câu hỏi bảo vệ:** (1)504 có chắc chưa lưu? Không, proxy có thể mất phản hồi sau commit; đọc lại nguồn thật. (2)Khóa nút có bảo vệ tiền đủ chưa? Không, Laravel vẫn kiểm quyền/revision/khóa dữ liệu và tổngconfirmed; UI giúp tránh thao tác nhầm. (3)Có gộp hai pending cùng số tiền không? Không, có thể hai lần chuyển hợp lệ; không tự suy đoán nghiệp vụ. (4)Tại sao chưa khẳng định sửa gốc504? Đã kiểm recovery và logtimeout, chưa tìm được đoạn runtime chậm; fault injection (chủ động tạo lỗi để thử) khác xác định căn nguyên.


### 11.59. Ghi nhận đã hoàn đủ cọc — audit khác với thu/chi tiền thật (DB-D85,02/11/2026)

1. **Từ màn hình:** mở `frontend/src/pages/admin/AdminContractTerminatePage.tsx:106` → `features/contracts/ContractSettlementPanel.tsx:64`, nút Ghi nhận đã hoàn đủ cọc gán `refundAction` từ snapshot đã đọc. `RefundConfirmation:94`, `submit:102` dùng RHF/Zod, checkbox xác nhận có chủ ý và cờ flight chặn gửi lặp. Callback `onTerminated` ở parent ở đây chỉ tăng retry để tải lại hợp đồng, không gọi API terminate lần nữa. Nút chỉ hiện khi `settlement.ts:17` (`canConfirmDepositRefund`) thấy terminated/settled/refund>0/chưa audit; thiếu trường do dev chưa nâng cấp thì không hiện.
2. **Request thật:** `features/contracts/api.ts:156` (`confirmDepositRefund`) → fetchCsrfCookie rồi POST `/api/v1/contracts/{id}/deposit-refund-confirmation` qua sharedhttp (cookie phiên+XSRF). Body chỉ expected_revision, expected_refund_amount, confirmed_paid=true; số tiền lấy từ API để đối chiếu, không có ô nhập lại giá trị nghĩa vụ. Ví dụ minh họa khoản2.100.000đ: `{expected_revision:"<64 ký tự snapshot>",expected_refund_amount:2100000,confirmed_paid:true}`. Đây là mô tả body, không phải JSON để copy nguyên placeholder làm request hợp lệ. Kiểm Network nhìn POST200/409/422 và GETsettlement-preview sau đó; không gửi lại hoặc chi tiền lần nữa khi504.
3. **Backend/MySQL:** `backend/routes/api.php:180` trong Sanctum/active/roleAdmin/spa-CSRF → `ConfirmDepositRefundRequest::authorize/rules` kiểm trường → `ContractController::confirmRefund:187` kiểm ContractPolicy → `ContractSettlementService::confirmRefund:42`. `locked:121` khóa room→users→contract→các nguồn tiền theo thứ tự, đọc lại Admin active từ DB. So sánh số tiền/revision, lưu **chỉ** contracts.deposit_refunded_at/by và updated_at; không tạo payment, không đổi invoice, cọcgốc, trạng thái hợp đồng/phòng. Hai Admin được tuần tự hóa bằng khóa; request sau trả đúng actor/time lần đầu, không ghi lại.
4. **Response/lỗi:** `refundSummary:245` trả deposit_refunded_at/by và refund_outstanding_amount; cọcgốc2100k vẫn giữ, số còn phải hoàn0 khi có audit đầy đủ. ContractSettlementResource chỉ xuất projection (tập trường đã chọn) của Service choAdmin. UI hiển thị actorID/thời điểmVN/sốtiềnserver, không tính lại;503thiếu schema,409stale/sai tiền/sổ lệch,422sai ô nhập,401/403quyền. Với409/mạng/5xx, form cũ đóng và panel yêu cầu Tải đối soát mới trước khi thao tác tiếp; lỗi422 giữ trường để sửa. refund_recording vẫn mô tả nguồn nghĩa vụ D78, không dùng làm trạng thái hiện tại; ba trường D85 mới thể hiện đã chi/còn phải hoàn.
5. **Chỗ sửa và kiểm thử:** migration mới `backend/database/migrations/pending/2026_11_02_100001_add_deposit_refund_confirmation_to_contracts_table.php` thêm2cộtnullable/FKRESTRICT, không tự áp dụng dev; down dừng nếu có audit, vận hành phải dừng/chờ ghi trước khi đánh giá rollback. `DepositRefundApiTest`, `DepositRefundSchemaTest`, `DepositRefundReadinessTest`, `DepositRefundConcurrencyTest` và worker RunSettlementAction bảo vệ quyền/tiền/replay/schema/rollback/race. Full1452/14615, Pint364, frontend137; HTTP/browser là bằng chứng riêng ở Plan§12.52. Lỗi tìm thêm: Model trong RAM còn generated keys active cũ và payment mới thiếu defaults; Service:91/115 dùng refresh (nạp lại từ MySQL) trước trả revision để token khớp GET mới.

**5 câu hỏi bảo vệ:** (1)Đối soát cọc khác đã hoàn thế nào? deposit_settled_at là phân bổ; deposit_refunded_at/by là Admin xác nhận chi ngoài hệ thống. (2)Sao không set cọc phải hoàn gốc về0? Cần giữ nghĩa vụ lịch sử; số còn phải hoàn là trường trả riêng. (3)React giấu nút có đủ bảo mật? Không, Policy/active/lock+Service kiểm lại ở Laravel. (4)Sao hai người bấm không tạo hai lần? Khóa cha tuần tự, audit đã có được trả nguyên; không tạo giao dịch tiền mới. (5)Sao save rồi còn refresh? MySQL tự cập nhật generated columns/defaults mà object Eloquent trong RAM chưa biết; revision phải dùng dữ liệu thực đã lưu.


### 11.60. Đưa migration hoàn cọc lên dev an toàn (02/11/2026)

- **File cần mở:** `backend/database/migrations/pending/2026_11_02_100001_add_deposit_refund_confirmation_to_contracts_table.php`, hàm `up()` thêm hai cột nullable và FKusersRESTRICT; không UPDATE dữ liệu cũ. `down()` từ chối khi đã có dấu vết hoàn tiền; không tự chạy rollbackdev. Biên bản và lệnh thực tế ở DBplan§23/Plan§12.53.
- **Laravel biết đã chạy bằng gì?** Bảng `migrations` có thêm đúngid30/batch6/tên file. `migrate --path=<mộtfile>` giới hạn file cần xét; migrate tổng quát xét các đường dẫn mặc định, có thể chạy phần chưa được duyệt. File nguồn vẫn ở pending/ nhưng dev đã có history, không còn là pending về vận hành.
- **Luồng ứng dụng không đổi:** React `ContractSettlementPanel.RefundConfirmation` → APIclient `confirmDepositRefund` → POST `/api/v1/contracts/{contract}/deposit-refund-confirmation` → Request/Policy/`ContractSettlementService::confirmRefund` → contracts. Migration chỉ làm dev có đủ nơi lưu audit (người/thời điểm xác nhận); không chuyển tiền, không sửa nghĩa vụ gốc hoặc tự đánh dấu đã chi cho tài khoản cũ. Bản đồ hàm chi tiết§11.59 vẫn áp dụng.
- **Bằng chứng mới:** backup ngoài repo và restore trên MySQLcôlập đúngcharset/collation; đối chiếu count+hash nội dung, cấu trúc/index/FK/history; diễn tập và apply đúng1file. Dev29bảng/29→30migration, olddata không đổi;4HTTPstateless đạt. Không chạy lại1452backend/137frontend hoặc thao tác hoàn tiền thậtdev. CARDINALITY là thống kê ước lượng index, khác không có nghĩa mất dữ liệu; kiểm chính xác dữ liệu và định nghĩa index riêng.

**Câu hỏi bảo vệ:** (1)Backup khác migration? Backup giữ bản sao để phục hồi; migration mô tả thay đổi cấu trúc có lịch sử. (2)Tại sao thêm cột không mất dữ liệu? ALTER chỉ thêm hai cột NULL, dữ liệu cũ được đối chiếu trước/sau. (3)Vì sao restore thử? File tồn tại chưa chứng minh khôi phục được cả dữ liệu/ràng buộc. (4)Có rollback sau khi đã xác nhận chi không? Không tự động; dừng request ghi, sao lưu/đánh giá lịch sử rồi xin duyệt phương án bảo toàn audit. (5)HTTP200 có chứng minh hoàn tiền hoạt động trêndev? Không; lượt này chỉ kiểm đọc, QAghi/race đã có trênDBtest ở§11.59.


### 11.61. Đổi số lượng dịch vụ đã ngừng hoạt động (DB-D86, 02/11/2026)

- **Mở giao diện:** Chi tiết hợp đồng Admin → tab Dịch vụ → Thay đổi dịch vụ. `frontend/src/features/contracts/ContractServicesPanel.tsx:21`, `DraftServicesForm.submit:38` nhận sự kiện submit; `inactiveServiceQuantityError:2` trong `serviceChanges.ts` chặn tăng lượng dịch vụ inactive ở trình duyệt, nhãn cho biết được giữ/giảm/ngừng. `max` theo số lượng đã lưu chỉ giúp nhập liệu; Backend vẫn kiểm tra cuối cùng.
- **Request thật:** `features/contracts/api.ts:90::saveDraftContractServices` gọi GET `/sanctum/csrf-cookie`, rồi PUT `/api/v1/contracts/{id}/services` với JSON `services:[{service_id,quantity}], expected_revision`. Client `lib/http.ts` gửi cookie phiên và XSRF. Đơn giá/người thao tác không lấy từ form. Ví dụ minh họa: đang có dịch vụid7, lượng3, đơn giá40.000đ; gửi lượng2 áp dụng từ kỳ tiếp theo, vẫn giá40.000đ dù danh mục đã đổi.
- **Laravel/MySQL:** `routes/api.php:181` → `ContractController::updateServices:129` → `UpdateDraftServicesRequest`/Policy → `ContractService::changeActiveServices:216` (kiểm inactive:264). Service khóa cha và dòng dịch vụ, kiểm revision rồi đọc trạng thái danh mục dưới shared lock (khóa đọc để danh mục không đổi giữa lúc kiểm/ghi). Dòng đang dùng đóng cuối tháng, dòng kỳ sau lưu lượng mới với giá snapshot; dòng kỳ sau chưa hiệu lực được sửa cùngid. Bảng đọc/ghi: users/rooms/contracts/contract_services/services; invoices dùng kiểm kỳ, invoice_items đã phát hành không sửa.
- **Lỗi/cách sửa:** inactive chưa đăng ký →422 ở service_id; tăng lượng →422 ở quantity. Lỗi cuối batch được kiểm trước khi ghi nên không thêm dở dịch vụ đầu; stale409 yêu cầu đọc lại. Muốn sửa quyền/điều kiện, mở Request/Policy/Service; muốn sửa nhãn/lỗi nhập liệu, mở panel/helper. Nháp vẫn không đăng ký inactive. Tháng nhận/trả phòng vẫn chia ngày theo DB-D09/32/43; không đổi luồng PAY.

**Câu hỏi bảo vệ:** (1)Tại sao React có validation mà Laravel vẫn kiểm? Client có thể bị bỏ qua hoặc danh mục thay đổi sau khi mở form. (2)Giảm lượng có sửa hóa đơn cũ không? Không, kỳ cũ giữ snapshot, lượng mới có hiệu lực kỳ sau. (3)Giá danh mục đổi thì sao? Cùng dịch vụ đổi lượng giữ giá đã ký; dịch vụ thêm mới lấy giá danh mục. (4)Bỏ tick khác nhập0 thế nào? Bỏ tick là ngừng dịch vụ, nhập0 bị validation từ chối. (5)Giảm4→3 rồi tăng lại4 khi inactive được không? Nếu kỳ sau đã lưu3, tăng lại4 bị chặn; revision và dòng bao phủ kỳ áp dụng là nguồn kiểm tra.


**Lưu ý học từ lỗi giao diện:** `ContractServicesPanel.tsx:69` thêm min-w-0 cho fieldset (nhóm ô nhập), vì mặc định nó có thể ép nội dung rộng hơn hộp thoại. Badge tại:80 chỉ giữ nhãn trạng thái, lời giải thích đặt ở dòng cho phép xuống hàng. Đo documentWidth chưa đủ với hộp thoại fixed; cần đo scrollWidth/clientWidth của chính dialog và xem ảnh. Bằng chứng cuối:325test/3599assertion, frontend138,29HTTP/browser và giới hạn ở Plan§12.54; không phải fullsuite backend mới hoặc nghiệm thu ghi tiền dev.


### 11.62. Tách thời gian request để điều tra PAY504 (02/11/2026)

- **Mở code thật:** `backend/public/index.php` nạp `vendor/autoload.php`, tạo app từ `bootstrap/app.php`, rồi `handleRequest`. Cấu hình `docker/nginx/default.conf` chuyển API đến FPM và đợi60giây. Có504 không đồng nghĩa Laravel chưa ghi: Nginx có thể ngừng chờ trong lúc PHP còn xử lý. Source PAY và cách đọc lại kết quả vẫn theo§11.58.
- **Tách khái niệm:** autoload là nạp lớp PHP; bootstrap là khởi tạo framework; handler xử lý route/middleware/controller; terminate là hậu xử lý. Client còn có thời gian chờ kết nối/hàng đợi trước khi PHP bắt đầu. Probe đo riêng chỉ trên testvhost, đã gỡ; không thêm endpoint debug công khai hoặc log dữ liệu cá nhân.
- **Kết quả và giới hạn:**12GET200 cho thấy health lần lạnh chậm chủ yếu ở nạp/bootstrap, SQLhealth sau guard khoảng1ms. Chưa tái hiện timeout60giây hoặc chứng minh nguyên nhân31/10. Timer cũ đặt sau bootstrap bỏ sót giai đoạn này; đơn vị1.019mili giây là khoảng1,019giây. Không suy từ CLI chậm sang FPM vì CLI không bật OPcache (bộ nhớ giữ mã đã biên dịch) trong môi trường hiện tại. Không sửa cách tính tiền để xử lý lỗi proxy.

**3 câu hỏi bảo vệ:** (1)504 là lỗi thanh toán chắc chắn thất bại? Không, đọc lại sổ payment/invoice thật trước khi gửi hay chuyển tiền lần nữa. (2)SQL chỉ1ms có chứng minh cả request nhanh? Không, còn nạp lớp/framework/session/queue/filesystem và thời gian trước PHP. (3)Vì sao không tăng timeout để nói đã sửa? Tăng thời gian chờ không giải thích nguyên nhân; cần đo đúng request chậm trước khi chọn bản vá. Biên bản riêng Plan§12.55, không gộp vào sửa dịch vụ.

### 11.63. Thanh lý khi có dịch vụ chưa đến kỳ áp dụng — DB-D87

Bản đồ code (checkpoint e3c3030):

| Mở file / hàm | Vai trò |
|---|---|
| `backend/app/Services/ContractSettlementService.php:130` — `unstartedScheduledServices()` | Chọn riêng đăng ký định kỳ sau ngày bắt đầu hợp đồng, chưa có ngày sử dụng trước bàn giao; giữ dòng gốc và Điện/Nước. |
| Cùng file:171 — `summary()` | Đọc `invoice_items.meta.contract_service_id` của mọi hóa đơn. Có tham chiếu thì thêm blocker (lý do chặn), `can_terminate=false`; POST cũng kiểm lại. |
| Cùng file:64 — `terminate()` | Trong transaction (giao dịch nguyên tử), chỉ sau khi đủ điều kiện mới đối soát cọc, bỏ dòng tương lai, đóng hợp đồng và trả phòng. Lọc dòng đã bỏ khỏi revision (phiên bản dữ liệu) trả về. |
| `frontend/src/features/contracts/ContractSettlementPanel.tsx:129` — `SettlementConfirmation.submit()` | Gửi xác nhận/expected_revision; panel dùng blocker từ server, không tự quyết định tiền. |
| `backend/routes/api.php:149` / `:179` | GET settlement-preview và POST contracts/{id}/terminate; Sanctum/active/Policy hiện có. |

Luồng: React đọc preview → Admin xác nhận → POST có cookie/CSRF và phiên bản → Controller/Policy → Service khóa phòng/người/hợp đồng/các nguồn theo thứ tự → kiểm lại mọi tham chiếu → ghi toàn bộ hoặc rollback (hoàn tác cả giao dịch). Bảng chính: contracts, contract_services, rooms, invoices, invoice_items, payments. Gọi lại sau thành công trả trạng thái đã thanh lý, không khấu trừ thêm. Chức năng không chuyển tiền ngoài hệ thống.

Câu hỏi bảo vệ: (1) Vì sao hóa đơn đã hủy vẫn bảo vệ dòng dịch vụ? Vì snapshot/lịch sử vẫn tham chiếu nguồn. (2) Vì sao kiểm lại sau preview? Dữ liệu có thể đổi giữa hai request. (3) Vì sao response revision phải bỏ dòng đã xóa? Để trùng với GET mới, tránh xung đột giả. (4) Lỗi SQL giữa chừng xử lý thế nào? Transaction rollback cả tiền/trạng thái/phòng; có regression thực tế.

Kiểm thử mới: 13test/159assertion riêng; full1469/14836 có race process, SQLrollback và pending; HTTP hai phiên + browser và hậu kiểm tại Plan§12.56. Không phải nghiệm thu bằng Admin thậtdev.

### 11.64. Xem lịch sử điện nước ngay trong chi tiết phòng

Bản đồ code (checkpoint25ae0db):

| Mở file / hàm | Vai trò |
|---|---|
| `frontend/src/pages/admin/AdminRoomDetailPage.tsx:22` — `AdminRoomDetailPage()` | Đọc roomId từ route, tab từ URL; tab utilities ghép panel lịch sử. |
| `frontend/src/features/meter-readings/RoomMeterReadingsPanel.tsx:13` | Sự kiện đổi bộ lọc cập nhật URL; effect gọi API, hủy request cũ và chỉ hiển thị kết quả đúng khóa room/filter. |
| `frontend/src/features/meter-readings/roomFilters.ts:4` / `:9` / `:18` | Lấy bộ lọc, đổi lọc/reset trang, xóa lọc sai; room_id luôn là phòng đang mở. |
| `frontend/src/features/meter-readings/api.ts:25` — `getMeterReadings()` | Client `http` GET `/meter-readings`, gửi query đã qua Zod và cookie Sanctum. `:21` đọc danh mục dịch vụ qua API có sẵn. |
| `backend/routes/api.php:158` → `MeterReadingController.php:19` | Route GET → FormRequest kiểm dữ liệu → Policy Admin → Service. |
| `backend/app/Services/MeterReadingService.php:38` — `paginate()` | Lọc room_id/service_id/period/kind trên MySQL; sắp reading_date DESC, id DESC, phân trang20. |
| `backend/app/Http/Resources/MeterReadingResource.php:10` | JSON gồm chỉ số/tiêu thụ dạng chuỗi, tiền VND số nguyên, phòng/dịch vụ/hợp đồng/hóa đơn. |
| `frontend/src/features/meter-readings/MeterReadingsTable.tsx:6` | Chỉ định dạng/hiển thị dữ liệu; dùng chung với trang quản lý chỉ số, không tính tiền. |

Ví dụ minh họa, thay37 bằng ID phòng đang mở: URL giao diện `/admin/rooms/37?tab=utilities&meter_kind=final&meter_page=2` → GET `/api/v1/meter-readings?room_id=37&kind=final&page=2`. Response chuẩn `data/links/meta`; React hiện đúng trang server, không tải một trang rồi lọc cục bộ. DevTools Network lọc `meter-readings` để xem query/status/response; không chia sẻ Cookie hoặc XSRF token.

Câu hỏi bảo vệ: (1) F5 giữ bộ lọc nhờ đâu? URLSearchParams. (2) Tại sao không lọc20dòng bằngReact? Có thể bỏ sót dữ liệu nằm ở trang khác. (3) Đổi queryroom_id có xem nhầm phòng không? Panel lấy roomId từ route, Laravel vẫn bảo vệ quyền Admin. (4) Tại sao không parseFloat để tính tiền? Tiền do backend tính và snapshot; frontend chỉ format. (5) Lỗi503 khác danh sách rỗng thế nào? Lỗi có thông báo/Thử lại, rỗng chỉ khi GET thành công và data=[] thực.

Frontend141test/build/lint đạt, HTTP/browser trên DBtest theo Plan§12.57; mobile375 đã xem ảnh, chưa thử Back/Forward hoặc mất mạng hệ điều hành. Không có API mới, không ghi dữ liệu dev.

### 11.65. Tổng quan Cư dân RES-01 (03/11/2026)

Chức năng: trang `/resident` hiện phòng đang thuê, cảnh báo hạn hợp đồng, tổng công nợ/số hóa đơn quá hạn (kể cả hợp đồng đã thanh lý), 3 yêu cầu sửa chữa gần đây, thông báo chưa đọc và giữ panel gửi chỉ số. Bảng: `contracts`, `rooms`, `buildings`, `invoices` (đọc), `settings` (số ngày cảnh báo), `maintenance_requests`, `notifications`.

| Vị trí | Vai trò |
| --- | --- |
| `frontend/src/pages/resident/ResidentOverviewPage.tsx:10` | Ghép các thẻ; `canCreate` của thẻ sửa chữa = có `active_contract` từ API. |
| `frontend/src/features/resident-overview/useResidentOverview.ts:9` → `api.ts` | Gọi GET `/api/v1/resident/overview` qua `http` (cookie Sanctum), parse Zod `schemas.ts`; 401/403 gọi `refresh()`. |
| `frontend/src/features/resident-overview/ResidentOverviewCards.tsx:7` / `:38` | Banner phòng/cảnh báo và thẻ Cần thanh toán; chỉ định dạng `formatVND(BigInt(...))`, không cộng tiền. |
| `frontend/src/features/maintenance-requests/ResidentRecentRequestsCard.tsx:15` | GET `/maintenance-requests` trang 1, lấy 3 dòng đầu (Backend đã lọc theo user và sắp id giảm dần). |
| `frontend/src/features/notifications/RecentUnreadNotificationsCard.tsx:13` | GET `/notifications?status=unread&page=1`; số chưa đọc là `unread_count` của Backend. |
| `backend/routes/api.php:66` → `ResidentOverviewController.php:15` | Route + middleware `auth:sanctum`, `active`; trả Resource kèm `no-store`. |
| `backend/app/Http/Requests/ResidentOverview/ResidentOverviewRequest.php:12` / `:22` | Gate `viewOwnContracts` (resident đang active); mọi query đều 422 nên không thể chọn `user_id`. |
| `backend/app/Services/ResidentOverviewService.php:23` | Một transaction đọc: hợp đồng active; hóa đơn còn nợ của mọi hợp đồng (`withTrashed`) của user (`:33`); `Money::remaining`/`Money::aggregate` (`:38`, `:52`). |
| `backend/app/Services/ContractService.php:89` — `dueWindow()` | Ngày VN và cửa sổ sắp hết hạn từ setting `contract.expiring_warning_days` (DB-D86). |

Ví dụ minh họa: DevTools Network lọc `resident/overview` → status 200, `data.debt.outstanding_amount` là chuỗi như `"4128475"`. Thử thêm `?user_id=1` sẽ nhận 422. Muốn đổi số dòng sửa chữa: sửa `slice(0, 3)` trong thẻ; muốn đổi cách tính quá hạn: sửa Service (không sửa React).

Câu hỏi bảo vệ: (1) Vì sao không cộng tiền ở React từ `/invoices`? Danh sách phân trang 20, cộng một trang sẽ thiếu; tiền do Backend tính. (2) Payment pending có giảm nợ không? Không, `paid_amount` chỉ cộng payment confirmed. (3) Cư dân đã thanh lý còn thấy nợ không? Có, truy vấn lấy mọi hợp đồng của user kể cả terminated/soft-delete. (4) Cư dân A xem được nợ của B không? Không; user lấy từ session, query lạ bị 422, role khác 403. (5) Ẩn nút gửi sửa chữa ở React có đủ an toàn không? Không, Backend `store` vẫn chặn khi không có hợp đồng active; nút chỉ là trải nghiệm.

**Tiếp nhận Codex 03/11:** đã rà commit4c1939e/ba765e6 và tự chạy lại22backendtest/351assertion, frontend143test/buildPASS/lint0lỗi9cảnh báo cũ. Pint7file liên quan đạt; lần đầu Pint toàn370file phát hiện hai khoảng trắng thiếu ở test hoàn cọc cũ, đã sửa đúng dấu cách và chạy lại toàn370file đạt. Không sửa assertion hoặc nghiệp vụ. Hậu kiểm test trước/sau trùng nhau, devsnapshot7nhóm đều khớp/privatefile cũ nguyên, không DB devwrite; browser Claude ở Plan§12.58 là bằng chứng riêng, Codex chưa chạy lại browser/full PHPUnit. Screen Inventory đã đồng bộ. Artifacts riêng ignored `backups/resident-overview-review-20261103/`, không Git log/secrets. PROFILE-A mới có đề xuất API/chính sách phiên chờ duyệt tại SpecAuth§10, chưa code.

### 11.66. PROFILE-A — tự sửa tên và đổi mật khẩu (DB-D88, 03/11/2026)

Phạm vi: trang hồ sơ hiện có của cả5role active; chỉ sửa full_name hoặc đổi mật khẩu bằng mật khẩu hiện tại. Email/SĐT/quyền/pháp lý giữ nguyên. Đổi mật khẩu thành công đăng xuất mọi phiên và yêu cầu đăng nhập lại; không thực hiện thử với tài khoản dev.

| File/hàm chính | Trách nhiệm |
|---|---|
| `frontend/src/features/auth/AccountProfile.tsx` | Ghép hai form trong đúng khối Antigravity đang có; khóa cả hai khi một thao tác đang lưu. |
| `ProfileNameForm.tsx` — `submit()`; `ProfilePasswordForm.tsx` — `submit()` (cùng thư mục) | RHF/Zod kiểm input, gọi useAuth, hiển thị lỗi422 đúng ô, chặn gửi lặp; hủy/xóa nội dung mật khẩu trong bộ nhớ form. |
| `frontend/src/features/auth/api.ts:34` / `:40` | Lấy CSRF rồi PATCH `/api/v1/auth/profile` hoặc PUT `/api/v1/auth/password`; client http gửi cookie Sanctum. |
| `frontend/src/features/auth/AuthProvider.tsx:99` / `:103` | Cập nhật tên thật vào Context hoặc xóa danh tính sau đổi mật khẩu; bỏ qua response/me cũ bằng revision hiện có. |
| `backend/app/Http/Controllers/Api/V1/AccountProfileController.php:17` / `:22` | Nhận validated từ hai FormRequest; gọi Service; trả UserResource6trường hoặc204 và hủy phiên hiện tại/tạo lại CSRF. |
| `backend/app/Services/AccountProfileService.php:15` / `:30` / `:54` | Transaction (giao dịch nguyên tử), khóa users, tái kiểm active/hash, chỉ sửa đúng trường; đổi mật khẩu xóa sessions của chính user. Lỗi SQL rollback và log thông báo đã lược dữ liệu nhạy cảm. |
| `backend/app/Http/Controllers/Api/V1/AuthController.php:52` — `stampPassword()` | Ghim dấu kiểm tra mật khẩu tại login/register, kể cả phiên chưa gọi/me; request cũ không được khôi phục quyền sau đổi mật khẩu. Không lưu mật khẩu dạng rõ. |

Luồng sửa tên: form → Zod → AuthProvider → Axios + CSRF/cookie → route auth:sanctum/active/spa/throttle → FormRequest (cấm mọi field ngoài full_name) → Service khóa users.id từ session → MySQL → UserResource → Context/header/form đọc tên thật. Không lấy user_id từ frontend.

Luồng đổi mật khẩu: kiểm kiểu/độ dài trước, kiểm Hash::check mật khẩu hiện tại dưới khóa user; User cast hashed tạo hash mới, đổi remember_token và bỏ các session của chính user trong cùng transaction. Controller hủy phiên hiện tại; React về Login với thông báo cố định, không đưa mật khẩu vào URL/storage. Nếu response không rõ, không tự gửi lại mật khẩu: xóa danh tính/form và yêu cầu đăng nhập để kiểm tra. Hóa đơn/hợp đồng/phòng không tham gia thao tác.

Câu hỏi bảo vệ: (1) Vì sao cần mật khẩu hiện tại? Hạn chế người đang cầm một phiên mở tự đổi mật khẩu mà không biết mật khẩu cũ. (2) Vì sao kiểm lại sau khi khóa users? Tài khoản/mật khẩu có thể đổi sau bước xác thực request. (3) Vì sao xóa session và ghim dấu mật khẩu ngay login? Bảo vệ cả phiên mới, phiên cũ và request đang chạy đồng thời. (4) Vì sao không trim mật khẩu? Khoảng trắng là một phần của mật khẩu đã nhập; chỉ trim tên. (5) Frontend ẩn field có đủ không? Không; FormRequest cấm field điều khiển và Backend chỉ chọn user từ session.

Bằng chứng kiểm thử/trạng thái thực tế quản lý tại Plan§12.59/MatrixPR, không suy full MVP hoàn tất từ hai form này.

**Kiểm chứng PROFILE-A:** code91a2ae8; full1507/15313 trước hồi quy whitelist cuối, Auth cuối131/2054 và Pint377 PASS; frontend146/build/lint0lỗi9cảnh báo cũ. HTTP40check gồm thu hồi hai phiên/giữ phiên người khác/login mật khẩu mới/race204-409; browser tên thật/F5/1PATCH khi bấm hai lần/hủy/lỗi rỗng/mobile375 đạt. Chưa đổi mật khẩu trực tiếp qua browser hoặc Admin thậtdev; không coi thông báo sau đổi đã được browser nghiệm thu. Dọn fixture đúngrun, test0/FK1/devdenied1142/privatefile nguyên, dev7nhóm snapshot khớp29bảng/30migration/RUNfalse. Chi tiết và giới hạn Plan§12.59.


### 11.67. SET-SYS / USR-HISTORY — bản đồ code (03/11/2026)

| Chức năng | File/hàm cần mở | API / Database |
|---|---|---|
| Sửa tên hệ thống/SĐT/email liên hệ | `frontend/src/pages/admin/AdminSettingsPage.tsx` ghép `features/settings/SystemSettingForm.tsx::submit/reload`; `schemas.ts::systemSettingSchema`, `api.ts::saveSystemSetting` | PUT `/api/v1/settings/{key}` với `{value,expected_value}`, cookie/CSRF qua http. Không liên quan users.phone/email. |
| Kiểm dữ liệu và quyền | `backend/routes/api.php` nhóm Admin active/spa; `SettingController::update`; `Requests/Setting/UpdateSettingRequest::rules/after/prepareForValidation`; `SettingPolicy::update` | Chỉ3keysystem +2keydays hiện có; bank ngoài route404; field điều khiển422. Giá trị mới trim/rỗngNULL, giá trị kỳ vọng giữ nguyên byte đã đọc kể cả legacyspaces. |
| Chặn ghi đè | `backend/app/Services/SettingService.php::updateSystem` | Transaction khóa `settings.key`, so sánh giá trị hiện tại với expected_value; lệch409, không ghi. Type/group do server quyết định. New key UNIQUE race409. |
| Hồ sơ → lịch sử hợp đồng | `AdminUserDetailPage.tsx` → `features/user-management/UserContractsPanel.tsx`; `api.ts::getUserContracts`; `contractHistory.ts` | GET `/api/v1/contracts?user_id=133&page=2` là ví dụ fixture; dùng API hiện hành, không route mới. `contracts_page` trên URL giữ trang khi F5. |
| Laravel lọc/phân trang | `IndexContractRequest::rules` → `ContractController::index` → `ContractService::listing/applyScopeFilters` → `ContractResource` | `contracts.user_id` lọc tại MySQL trước paginate20 và counts; quan hệ users/rooms/buildings. Không cộng tiền hay lọc một trang ở React; không tự mở hồ sơ đã soft-delete. |

Luồng Cài đặt: nút Lưu → RHF/Zod → lấy CSRF → PUT kèm giá trị cũ → Policy/Request → khóa dòng/so sánh/ghi MySQL → Resource → form cập nhật baseline.409 giữ nội dung đang nhập, bấm “Tải lại giá trị hiện tại” rồi kiểm tra trước khi lưu lại. SĐT liên hệ có thể là hotline, không tự áp chuẩn hóa định danh đăng nhập. Mỗi form chỉ lưu một khóa, chưa có nút lưu tất cả/ngân hàng.

Luồng lịch sử: mở hồ sơ → panel nhận user.id từ hồ sơ thật → query user_id/page → Laravel lọc trước phân trang → React hiển thị mã/phòng/ngày/giá/trạng thái và link chi tiết. Tổng hợp nợ/sửa chữa của tài khoản chưa nối tại đây; không gắn dữ liệu người khác qua tìm tên. Muốn xem request: DevTools Network lọc `settings` hoặc `contracts?`; kiểm method/body/query/status và response, không sao chép cookie vào tài liệu.

Câu hỏi bảo vệ: (1) Vì sao expected_value? Phát hiện một Admin đã sửa sau lúc mình đọc; lock bảo vệ bước so sánh-và-ghi. (2) NULL khác chuỗi rỗng thế nào ở cấu hình? Xóa cấu hình lưu NULL, không chèn giá trị mẫu. (3) Vì sao lọc user_id ở Backend? Phân trang chỉ chứa20dòng, lọc trong React sẽ bỏ sót và số đếm sai; quyền Admin vẫn do Laravel. (4) Sửa SĐT liên hệ có đổi SĐT đăng nhập không? Không, bảng settings và users độc lập. (5) Tải lại sau409 có tự ghi đè không? Không, chỉ đọc baseline mới; Admin phải kiểm tra rồi chủ động lưu.


### 11.68. ROOM-VIEW — tab lịch xem phòng (DB-D90, 03/11/2026)

- React: `pages/admin/AdminRoomDetailPage.tsx` thay placeholder bằng `features/viewing-appointments/AppointmentsWorkspace.tsx` với `mode=admin,roomId=room.id`. Tái dùng bảng/lọc; không có nút ghi trong tab theo phòng. `filter()` giữ tab và dùng appointments_status/appointments_date/appointments_page trên URL; retry chỉ xóa các khóa thuộc lịch. Key có roomId và AbortController chống response cũ.
- Client: `features/viewing-appointments/api.ts::getAppointments(input,signal,roomId)` → http GET `/api/v1/viewing-appointments?room_id=115&page=2` (115 là ID fixture minh họa); page/status/date được validate, roomId phải nguyên dương an toàn. Cookie của Admin được gửi bởi http; GET không cần CSRF.
- Laravel: route viewing-appointments.index hiện có → auth:sanctum/active → `AppointmentRequest::authorize/rules` (room_id chỉ nằm trong allowlist Admin) → `ViewingAppointmentController::index` → `ViewingAppointmentService::query` → bảng viewing_appointments, eager-load rooms/buildings. Query thêm WHERE room_id trước ORDER preferred_at/id và paginate20; kết hợp ngàyVN chuyển sang khoảng UTC. Resource/JSON giữ nguyên, không sửa trạng thái hoặc dữ liệu tài chính.
- Quyền thật: gửi room_id từ role khác nhận422; Guard vẫn chỉ confirmed hôm nay, chủ lịch vẫn chỉ own user_id. Chế độ readonly của React chỉ hạn chế thao tác ở tab, không thay Policy của trang quản lý lịch.
- Muốn sửa: bộ lọc Backend ở Request/Service; cột/nút/URL trong AppointmentsWorkspace; không tự lọc một trang tại React. DevTools Network lọc viewing-appointments, kiểm room_id/page/status/date và meta.total. Những biểu diễn số lượng/khách đều từ response, không mock.

Câu hỏi bảo vệ: (1) Vì sao WHERE trước paginate? Để total và các trang chỉ tính lịch đúng phòng, không bỏ sót. (2) Phòng đã cho thuê/ẩn public còn xem lịch không? Admin xem lịch sử được, không áp quy tắc phòng công khai lên API quản trị. (3) Frontend sửa room_id có xem mọi phòng được không? Admin vốn được phép xem lịch quản trị; các role khác vẫn bị Request/Policy giới hạn, không tin React. (4) Vì sao prefix appointments_? Tránh lọc của lịch làm mất tab hoặc đụng bộ lọc điện nước trên cùng trang. Kiểm thử và giới hạn ghi tại Plan§12.61.


### 11.69. DASH-B — bảng tòa nhà và hoạt động Admin (DB-D91, 03/11/2026)

| File / hàm cần mở | Vai trò / API / bảng |
|---|---|
| `frontend/src/pages/admin/AdminDashboardPage.tsx` | Ghép4thẻ cũ + DashboardWorkQueue/BuildingsPanel/AppointmentsPanel, bỏ UnavailableWorkspace; không biểuđồ hoặc dữ liệu mẫu. |
| `features/dashboard/DashboardBuildingsPanel.tsx` — `changePage`; `api.ts:11` — `getDashboardBuildings` | NútTrước/Sau cập nhật buildings_page trên URL → GET `/api/v1/dashboard/buildings?page=2`; lỗiURL/empty/loading/retry riêng. |
| `backend/routes/api.php`; `DashboardBuildingsRequest::rules/after`; `DashboardController.php:17` — `buildings()` | Sanctum/active/roleAdmin; chỉnhậnpage, không chọnscope/quyền từ request; trả Resource phântrang/no-store. |
| `backend/app/Services/DashboardService.php:25` — `buildings()`; `DashboardBuildingResource::toArray` | SQL trên buildings; withCount rooms theo building_id; whereHas contracts.status=active để đếmphòng đangthuê; rooms.status=available cho phòngtrống. Soft-delete theo Model hiệnhành. Hai query buildings cho20dòng (count+data), không query từngrow. |
| `features/dashboard/DashboardWorkQueue.tsx` — `QueueCard`; `activity.ts`; `api.ts:14` — `getDashboardQueue` | GET payments/maintenance-requests với statuspending, contracts với dueexpiring/overdue; hiển thịmeta.total server, không đếm data20dòng. Mỗi nguồn lỗi riêng, không thay lỗi bằng0. |
| `features/dashboard/DashboardAppointmentsPanel.tsx`; `api.ts:17` — `getDashboardAppointments` | businessToday() ngàyVN → GET viewing-appointments?date=YYYY-MM-DD&page=1, hiểnthị5lịchđầu/totalserver, giữ thứtựserver. `formatDateTime` đổi timestampUTC sang giờVN. Schema chỉgiữname/code/time/status/room, không SĐT/ghi chú. |

Luồng bảng: React → http (cookie session, GET không cần CSRF) → route/Request xác nhận Admin → Controller → Service query MySQL → DashboardBuildingResource/data/links/meta → bảng/linkchi tiết. Ví dụ minh họa `/api/v1/dashboard/buildings?page=2`; DevTools Network lọc dashboard/buildings, xem page và meta.total. Muốn thay sốdòng/điềukiệnđếm sửa Service, không cộng hoặc suy trạng thái ở React.

Giữ nguyên4thẻ và quy tắc tiềnDB-D82. Các khối tảiđộc lập, không bảođảm cùngmột thờiđiểm snapshot trên cả7request. Link thanh toán/hợpđồng có bộlọc URL đãhỗtrợ; link sửa chữa mở trang quảnlý chung vì trang đích chưa đọc status từURL (người dùng chọn dropdown). `Awaited<ReturnType<...>>` trong panel chỉ lấy kiểu dữ liệu trả về sau await của hàmAPI để tránh chép lại interface.

Câu hỏi bảo vệ: (1) Vì sao21payment nhưng chỉ20dòng mà thẻ hiện21? Lấymeta.total, không data.length. (2) Vì sao không cộng rented+available thành total? Còn bảotrì/inactive; haiđiềukiệnđếm độc lập, không dùng để tự sửa trạngthái. (3) Quá end_date có tự giảm đangthuê không? Không, hợpđồng vẫnactive đến khi bàn giao/thanh lý. (4) Vì sao không trả Model nguyên? Resource chỉ trả5trườngđãduyệt, không lộ tenant/hồsơ. (5) Một API lỗi có làm toàn Dashboard về0không? Không, state/error từngkhối táchriêng và có nút tải lại. Bằng chứng và giới hạn tại Plan§12.62/MatrixDASH-B.

### 11.70. Công nợ và sửa chữa trong chi tiết tài khoản (ADM-10, DB-D92, 03/11/2026)

Chức năng: Admin mở `/admin/users/:id` thấy tổng công nợ và yêu cầu sửa chữa của cư dân, hoặc việc được giao của kỹ thuật viên. Bảng đọc: `invoices`, `contracts` (kể cả soft-delete), `maintenance_requests`, `rooms`, `buildings`, `users`.

| Vị trí | Vai trò |
| --- | --- |
| `frontend/src/pages/admin/AdminUserDetailPage.tsx:98` / `:101` | Gắn thẻ theo `user.role`: resident → công nợ + yêu cầu đã gửi; technician → việc được giao. |
| `frontend/src/features/user-management/UserDebtSummaryCard.tsx:10` → `api.ts:24` | GET `/api/v1/users/{id}/debt-summary`, parse Zod `debtSummary.ts`; hiển thị `formatVND(BigInt(...))`, không cộng tiền. |
| `frontend/src/features/maintenance-requests/PersonMaintenancePanel.tsx:20` | GET `/maintenance-requests?user_id=…` hoặc `?assigned_to=…&page=…`; trang lưu trên URL (`requests_page`/`tasks_page`). |
| `backend/routes/api.php:159` → `AdminUserController.php:41` | Route trong nhóm `role:admin`; tìm user (404), Policy `view`, trả JSON `no-store`. |
| `backend/app/Services/DebtService.php:69` — `userSummary()` | Hàm tính công nợ dùng chung với Tổng quan Cư dân: lọc hóa đơn còn nợ, `Money::remaining`/`Money::aggregate`, quá hạn theo ngày VN. |
| `backend/app/Http/Requests/Maintenance/MaintenanceRequestInput.php:42` | `user_id`/`assigned_to` chỉ hợp lệ khi người gọi là Admin, vai trò khác nhận 422. |
| `backend/app/Services/MaintenanceRequestService.php:50` | Thêm hai cột vào vòng lọc `where` trước `paginate(20)`. |

Ví dụ minh họa: DevTools Network lọc `debt-summary` → 200 với `outstanding_amount` dạng chuỗi; đăng nhập Cư dân rồi gọi `/maintenance-requests?user_id=1` sẽ nhận 422.

Câu hỏi bảo vệ: (1) Vì sao tách `userSummary()` thay vì viết lại? Để Admin và Cư dân luôn thấy cùng một con số. (2) Vì sao Cư dân không được gửi `user_id`? Tránh dò dữ liệu người khác; phạm vi của họ đã cố định theo session. (3) Pending có giảm công nợ không? Không. (4) Vì sao không cộng tiền từ danh sách hóa đơn? Danh sách phân trang, cộng một trang sẽ thiếu. (5) F5 giữ trang sửa chữa nhờ đâu? Query `requests_page`/`tasks_page` trên URL.

### 11.71. In / Lưu PDF hóa đơn, biên nhận, phiếu hợp đồng (DB-D93, 03/11/2026)

Chức năng: mở trang in riêng, bấm **In / Lưu PDF** để in giấy hoặc lưu PDF bằng trình duyệt. Không có API mới: trang gọi lại API chi tiết hiện có nên quyền sở hữu vẫn do Laravel kiểm.

| Vị trí | Vai trò |
| --- | --- |
| `frontend/src/app/router.tsx:57` / `:65` | `printPage()` bọc Suspense; 6 route in nằm ngoài layout nhưng trong `RequireAuth` theo vai trò. |
| `frontend/src/components/ui/PrintSheet.tsx:18` | Khung A4, nút `window.print()`, đổi `document.title` làm tên PDF; `print:hidden` ẩn thanh công cụ. |
| `frontend/src/hooks/useApiResource.ts:9` | Tải theo khóa, hủy request cũ, chỉ hiện kết quả đúng khóa; 401/403 gọi `refresh()`. |
| `frontend/src/features/invoices/InvoicePrint.tsx:13` | GET `/invoices/{id}`; chặn nháp, đánh dấu ĐÃ HỦY; tiền chỉ `formatVND`. |
| `frontend/src/features/payments/ReceiptPrint.tsx:10` → `api.ts:8` | GET `/payments/{id}`; chỉ in khi `confirmed` + `receipt_number`. |
| `frontend/src/features/contracts/ContractPrint.tsx:20`, `resident-contracts/ResidentContractPrint.tsx:21` | Phiếu tóm tắt hợp đồng cho Admin / cư dân từ hai API khác nhau. |
| `frontend/src/index.css:60` | `@media print`: `@page` A4 lề 12mm, nền trắng, giữ màu nền bảng. |

Ví dụ minh họa: mở `/resident/invoices/68/print` (thay 68 bằng ID thật) → DevTools Network thấy GET `/api/v1/invoices/68`; Ctrl+P → chọn "Lưu dưới dạng PDF", tên tệp gợi ý là mã hóa đơn.

Câu hỏi bảo vệ: (1) Vì sao không cần API mới? Trang in dùng lại API chi tiết đã kiểm quyền. (2) Cư dân sửa ID trên URL có in được hóa đơn người khác? Không, API trả 403 và trang không hiện dữ liệu. (3) Vì sao không in hóa đơn nháp? Nháp chưa phát hành, số tiền còn thay đổi. (4) Vì sao biên nhận chỉ cho payment đã xác nhận? Số RCP chỉ sinh khi Admin xác nhận tiền thực nhận. (5) Ẩn nút khi in bằng cách nào? Class Tailwind `print:hidden` trong `@media print`.

### 11.72. Tài khoản ngân hàng nhận chuyển khoản (DB-D94, 03/11/2026)

Chức năng: Admin nhập ngân hàng/số tài khoản/chủ tài khoản ở `/admin/settings`; cư dân mở hóa đơn còn nợ thấy hướng dẫn chuyển khoản với số tiền gợi ý và nội dung = mã hóa đơn. Bảng: `settings` (ghi), `invoices` (đọc).

| Vị trí | Vai trò |
| --- | --- |
| `frontend/src/pages/admin/AdminSettingsPage.tsx:64` → `features/settings/SystemSettingForm.tsx` | Mỗi khóa một form, gửi `{value, expected_value}`; 409 thì tải lại. |
| `frontend/src/features/settings/schemas.ts` | Zod: số tài khoản `^[0-9]{6,20}$`, tên/chủ TK ≤ 100 ký tự. |
| `backend/routes/api.php:199` → `SettingController::update` | Allowlist khóa trong route; ngoài danh sách 404. |
| `backend/app/Http/Requests/Setting/UpdateSettingRequest.php:36` / `:45` | Giới hạn theo khóa và regex số tài khoản. |
| `backend/app/Services/SettingService.php:20` — `updateText()` | Khóa dòng `lockForUpdate`, so giá trị đã đọc (CAS), giữ đúng group. |
| `frontend/src/features/payments/PaymentInstructionsCard.tsx:10` → `api.ts` | GET `/invoices/{id}/payment-instructions`; nút sao chép dùng `navigator.clipboard`. |
| `backend/routes/api.php:139` → `InvoiceController.php:27` → `InvoiceService.php:68` | Policy xem hóa đơn; tính `payable`, `configured`, `amount = Money::remaining`. |
| `backend/app/Services/SettingService.php:57` — `bankDetails()` | Đọc 3 khóa, chuỗi rỗng coi như chưa cấu hình. |

Ví dụ minh họa: DevTools Network lọc `payment-instructions` → `amount` là phần còn lại theo payment đã xác nhận; PUT `/settings/bank.account_number` với `"0071 000"` nhận 422.

Câu hỏi bảo vệ: (1) Vì sao gửi kèm `expected_value`? Chống ghi đè khi hai Admin sửa cùng lúc (409). (2) Vì sao số tiền gợi ý không trừ khoản pending? Pending chưa được xác nhận nên chưa giảm nợ. (3) Vì sao không tạo mã VietQR? Cần dịch vụ ngoài/ngân hàng, ngoài phạm vi đã duyệt. (4) Cư dân A xem hướng dẫn của hóa đơn B được không? Không, Policy xem hóa đơn trả 403. (5) Đổi số tài khoản có làm đổi hóa đơn cũ không? Không, hóa đơn chỉ lưu số tiền; hướng dẫn đọc cấu hình tại thời điểm xem.

### 11.73. Quên mật khẩu, xác minh và đổi email (DB-D95, 03–04/11/2026)

Chức năng: người dùng tự khôi phục mật khẩu qua email đã xác minh, xác minh email hiện tại và đổi email bằng liên kết gửi tới địa chỉ mới. Bảng: `users` (`email`, `email_verified_at`, `password`, `remember_token`), `password_reset_tokens`, `sessions`. Thư đi qua Laravel Notification kênh mail; dev dùng Mailpit (xem tại http://localhost:8025).

| Vị trí | Vai trò |
| --- | --- |
| `frontend/src/pages/public/LoginPage.tsx` → `/forgot-password` | Link "Quên mật khẩu?"; `PasswordRecoveryForms.tsx:14` gửi POST `/auth/forgot-password`. |
| `frontend/src/features/auth/PasswordRecoveryForms.tsx:36` | Trang `/reset-password?token&email` gửi POST `/auth/reset-password`, lỗi token hiện link gửi lại. |
| `frontend/src/features/auth/ProfileEmailPanel.tsx:15` | Hồ sơ: trạng thái xác minh, POST `/auth/email/verification-notification`, form đổi email POST `/auth/email/change`. |
| `frontend/src/features/auth/EmailLinkAction.tsx:10` | Trang mở từ thư; chỉ gửi API khi người dùng bấm nút (không tự gửi lúc tải trang). |
| `backend/routes/api.php:103`–`:115` → `AccountEmailController` | 4 route công khai (có throttle) + 2 route cần đăng nhập; CSRF như các route Auth khác. |
| `backend/app/Services/AccountEmailService.php:29` / `:43` | Chỉ gửi đặt lại khi active + đã xác minh; `Password::broker()->reset` đổi mật khẩu, xóa mọi session của user. |
| `backend/app/Services/AccountEmailService.php:64` / `:75` | Liên kết xác minh ký HMAC (APP_KEY) + `sha1(email)`; email đổi thì liên kết cũ vô hiệu. |
| `backend/app/Services/AccountEmailService.php:92` / `:111` | Đổi email: kiểm mật khẩu, mã hóa payload bằng `Crypt`, xác nhận dưới `lockForUpdate`, dùng một lần. |
| `backend/app/Models/User.php:61`, `app/Notifications/*` | Thư tiếng Việt trỏ về trang React; `lang/vi.json` dịch khung thư mặc định. |
| `backend/app/Providers/AppServiceProvider.php:60` | Giới hạn tần suất quên mật khẩu/đặt lại/mở liên kết/gửi thư. |

Ví dụ minh họa: mở http://localhost:8025 sau khi bấm "Gửi email xác minh" sẽ thấy thư; DevTools Network khi bấm "Quên mật khẩu" luôn thấy 202 cùng một thông điệp dù email có hay không.

Câu hỏi bảo vệ: (1) Vì sao quên mật khẩu luôn trả cùng một câu? Không để kẻ xấu dò email nào có tài khoản. (2) Vì sao chỉ gửi cho email đã xác minh? Theo Q4, chỉ địa chỉ đã chứng minh sở hữu mới được dùng khôi phục. (3) Đổi email có đổi ngay không? Không, chỉ đổi khi người nhận ở email mới bấm xác nhận. (4) Liên kết dùng lại được không? Đặt lại mật khẩu xóa token; đổi email kiểm dấu email hiện tại nên lần hai 409. (5) Vì sao trang liên kết bắt bấm nút? Tránh trình quét thư hoặc F5 tiêu mất liên kết dùng một lần.

### 11.74. Vì sao từng có lỗi 504 khi gửi thanh toán (PAY504, 04/11/2026)

Không phải lỗi nghiệp vụ thanh toán. Nginx chờ PHP-FPM tối đa 60 giây; PHP chậm vì mỗi request phải nạp ~543 file PHP và OPcache (bộ nhớ đệm mã PHP đã biên dịch) được cấu hình `revalidate_freq = 0` nên kiểm lại thời gian sửa của từng file ở mọi request. Code nằm trên ổ Windows được mount vào container; mỗi lần kiểm file qua lớp mount này chậm hơn hàng trăm lần so với ổ trong container. Khi nhiều request tới cùng lúc, 5 worker FPM bận và request sau phải xếp hàng → có lúc vượt 60 giây → 504.

| Vị trí | Vai trò |
| --- | --- |
| `docker/php/php.ini` — `opcache.revalidate_freq` | Đổi 0 → 2: chỉ kiểm file tối đa 2 giây/lần. |
| `docker-compose.yml` service `app` | Mount `./backend` và `php.ini` từ Windows vào container. |
| `frontend/src/features/payments/submissionError.ts` | (PAY-04, đã có) xử lý kết quả chưa rõ khi gặp 504, không cho gửi lặp. |

Câu hỏi bảo vệ: (1) Vì sao GET CSRF cũng chậm cùng lúc với POST thanh toán? Hai request dùng chung worker và cùng chịu chi phí kiểm file. (2) Tăng timeout Nginx có phải cách sửa đúng? Không, chỉ che triệu chứng. (3) revalidate_freq = 2 ảnh hưởng gì khi lập trình? Sửa file PHP có hiệu lực sau tối đa 2 giây. (4) Production nên cấu hình thế nào? Tắt validate_timestamps và chạy `php artisan optimize` khi deploy.

### 11.75. Vì sao bước lập hóa đơn tất toán từng luôn báo "Hợp đồng vừa thay đổi" (E2E-BUG-01, 04/11/2026)

`lifecycle_revision` là mã băm (hash) của toàn bộ dữ liệu hợp đồng + dòng dịch vụ + người ở cùng, gửi kèm mỗi thao tác để chặn ghi đè khi dữ liệu đã đổi. Trang chi tiết đọc dịch vụ theo `id` tăng dần, còn bước lập tất toán nạp lại dịch vụ không sắp xếp; MySQL trả theo chỉ mục `service_id` nên thứ tự khác → hash khác → 409 dù không ai sửa gì. Lỗi chỉ lộ khi dịch vụ định kỳ được thêm lúc nháp (id nhỏ) trước Điện/Nước (thêm lúc kích hoạt) — đúng thứ tự thao tác thật trên giao diện, nên chỉ nghiệm thu bằng UI mới phát hiện.

| Vị trí | Vai trò |
| --- | --- |
| `backend/app/Models/Contract.php` — `lifecycleRevision()` | Sửa: `contractServices->sortBy('id')` trước khi băm, giống người ở cùng. |
| `backend/app/Services/ContractFinalInvoiceService.php` — `createLocked()` | So `expected_revision` với revision tính dưới khóa. |
| `backend/tests/Feature/Contracts/ContractRevisionOrderTest.php` | Đảo thứ tự quan hệ, revision phải giữ nguyên. |

Câu hỏi bảo vệ: (1) Revision dùng để làm gì? Phát hiện dữ liệu đã đổi giữa lúc đọc và lúc ghi (khóa lạc quan). (2) Vì sao hash phải không phụ thuộc thứ tự? Cùng dữ liệu phải cho cùng mã, nếu không sẽ báo xung đột giả. (3) Vì sao test cũ không bắt được? Dữ liệu test tạo dịch vụ theo thứ tự trùng với chỉ mục; nghiệm thu UI mới tái hiện thứ tự thật.

Bổ sung cùng ngày (E2E-OBS-01/02): `frontend/src/lib/format.ts` — `formatServicePeriod()` không in khoảng ngày ngược khi nhận–trả cùng ngày; `frontend/src/lib/apiErrors.ts` — `apiConflictMessage()` cho trang thanh lý hiện lý do 409 do Backend viết (vẫn chặn chuỗi giống SQL), còn `apiErrorMessage()` giữ thông báo chung cho mọi màn khác. Câu hỏi bảo vệ: vì sao không đổi luôn `apiErrorMessage()`? Vì test hiện có yêu cầu không lộ thông điệp server ở mọi status; chỉ màn nhiều điều kiện 409 mới cần lý do cụ thể.

### 11.76. Xem hóa đơn trên màn nhỏ và gửi thư trên Docker dev

- `frontend/src/features/invoices/InvoicePrint.tsx` — `InvoicePrint()` tải chi tiết hóa đơn qua `getInvoice()`. Bọc bảng khoản thu bằng `overflow-x-auto print:overflow-visible` để màn hình hẹp chỉ cuộn bên trong bảng, còn chế độ in không bị giới hạn bởi vùng cuộn. `PrintSheet()` trong `frontend/src/components/ui/PrintSheet.tsx` gọi `window.print()` để trình duyệt mở chức năng in.
- `docker-compose.yml` — dịch vụ `app` nhận `MAIL_MAILER=smtp` và gửi tới `mailpit:1025` trong mạng Docker. Mở hộp thư nội bộ qua `localhost:8025`. Khi biến môi trường của Compose thay đổi, tạo lại container app để container mới nhận giá trị.

Câu hỏi bảo vệ: (1) Vì sao bảng cuộn riêng? Để người dùng đọc được từng cột mà phần còn lại của trang vẫn vừa màn hình. (2) React lấy số tiền ở đâu? API chi tiết hóa đơn của Laravel. (3) Thư thử trong Mailpit chứng minh gì? App dev kết nối và gửi được qua SMTP nội bộ, còn luồng xác minh tài khoản cần kiểm riêng.

### 11.77. Vì sao Dashboard dev gửi yêu cầu hai lần

`frontend/src/hooks/useApiResource.ts` chờ đến microtask (việc chạy ngay sau đoạn JavaScript hiện tại) rồi kiểm tra tín hiệu hủy trước khi gửi GET. Khi React StrictMode gắn thử và dọn effect, lượt thử dừng trước khi gọi API. Bốn khối Dashboard dùng chung hook này để tải dữ liệu hoặc tải lại riêng. `frontend/src/features/auth/AuthProvider.tsx` áp dụng cùng cách kiểm tra khi khởi tạo phiên.

Khi demo, mở Network rồi F5 ở `/admin` để đếm một GET xác thực và bảy GET dữ liệu. Bấm Tải lại chỉ số để xem riêng một GET `/api/v1/dashboard`. Mã 499 trong log Nginx nghĩa là phía trình duyệt đã đóng yêu cầu trước khi máy chủ trả xong.

### 11.78. Tiến trình thanh lý và phản hồi thao tác sau demo (12/11/2026)

- `frontend/src/pages/admin/AdminContractTerminatePage.tsx` — `FinalInvoiceForm` báo trạng thái từ phản hồi lập nháp/phát hành cho `HandoverProgress`. Khung Tiến trình dùng trạng thái vừa lưu trong trang, hoặc hóa đơn đã đọc khi vào lại trang.
- `frontend/src/features/auth/AuthProvider.tsx` — khi cửa sổ lấy lại tiêu điểm, `refresh` kiểm tra phiên ở chế độ nền. `AbortController` (bộ điều khiển hủy yêu cầu) hủy GET `/api/v1/auth/me` cũ trước thao tác tài khoản để tránh phản hồi cũ thay cookie phiên.
- `frontend/src/features/auth/ProfileEmailPanel.tsx` — `resend` hiện đang gửi cho đến khi API xác minh email phản hồi. `ResidentOverviewCards.tsx` lấy số hóa đơn và số tiền từ API tổng quan cư dân rồi trình bày ngắn gọn.

Câu hỏi bảo vệ. Khi nào bước 2 và bước 3 hoàn tất? Vì sao cần hủy yêu cầu phiên cũ dù đã kiểm tra thứ tự phản hồi trong JavaScript? Giao diện xác định số hóa đơn còn nợ từ đâu?
