# API Authentication — `/api/v1/auth`

Trạng thái: bốn API Auth cơ bản đã tích hợp từ Bước3–4. PROFILE-A (DB-D88,03/11/2026) bổ sung hai API tự sửa họ tên/đổi mật khẩu tại§6, giữ SPA cookie và response tài khoản6trường. Spec chính ở [AUTHENTICATION.md](AUTHENTICATION.md), Tasks/bằng chứng ở [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). D01 tự đăng nhập sau đăng ký đã CONFIRMED. Các mô tả Bước3–4 phía dưới là phạm vi lịch sử; không suy các chức năng đã có UI là đã có API.

## 1. Giao thức chung

- Sanctum SPA session cookie, guard `web`; không phát hành/nhận personal access token. Client dùng cùng origin qua Nginx/Vite proxy, gửi `Accept: application/json` và cookie.
- Trước POST đầu tiên: gọi `GET /sanctum/csrf-cookie` (204), giữ cookie phiên và `XSRF-TOKEN`, gửi mã CSRF qua `X-XSRF-TOKEN` theo Axios có sẵn. POST phải qua bảo vệ CSRF/origin của Laravel; không có ngoại lệ tắt CSRF. Cần Origin/Referer khớp `SANCTUM_STATEFUL_DOMAINS` để Sanctum khởi tạo phiên SPA.
- Thông tin tài khoản luôn bọc `data`; trường JSON giữ `snake_case`. Logout 204 không có body.
- Lỗi: `{ "message": "...", "errors"?: { "field": ["..."] } }`, tiếng Việt. Không trả SQL, mật khẩu, hash hay stack trace cho lỗi Auth đã xử lý.

## 2. Endpoint

| Method | Endpoint | Tên route | Quyền | Thành công |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | `api.v1.auth.register` | Công khai, phiên SPA hợp lệ | 201 + tài khoản mới; tự đăng nhập user/active theo **AUTH-D01 CONFIRMED** |
| POST | `/api/v1/auth/login` | `api.v1.auth.login` | Công khai, phiên SPA hợp lệ | 200 + tài khoản |
| POST | `/api/v1/auth/logout` | `api.v1.auth.logout` | Đã đăng nhập, active, phiên SPA hợp lệ | 204 |
| GET | `/api/v1/auth/me` | `api.v1.auth.me` | Đã đăng nhập, active; đủ 5 vai trò | 200 + tài khoản hiện tại |
| PATCH | `/api/v1/auth/profile` | `api.v1.auth.profile.update` | Đã đăng nhập, active, SPA/CSRF; tự sửa tên | 200 + UserResource; DB-D88/§6 |
| PUT | `/api/v1/auth/password` | `api.v1.auth.password.update` | Đã đăng nhập, active, SPA/CSRF; đúng mật khẩu hiện tại | 204, mọi phiên cũ bị thu hồi; DB-D88/§6 |

### Đăng ký

Input: `full_name` (bắt buộc, tối đa 120 ký tự), `phone` (bắt buộc, 10–15 chữ số, được có `+` đầu), `email` (tùy chọn, RFC, tối đa 191 ký tự), `password`, `password_confirmation`.

Mật khẩu tối thiểu theo `Password::defaults()` (hiện 8 ký tự), xác nhận khớp; không trim mật khẩu, từ chối NUL và quá 72 byte khi dùng bcrypt. Họ tên/định danh bỏ khoảng trắng đầu/cuối. Email không nhập/rỗng được lưu NULL. Email có giá trị chuyển chữ thường; SĐT Việt Nam `+84/84` được quy về `0` (DB-D53).

`role` và `status` không được xuất hiện trong input, kể cả NULL: trả 422. Luôn tạo `UserRole::User`, `UserStatus::Active`. Không nhận CCCD, ngày sinh, địa chỉ pháp lý, thời điểm xác minh email, ID hay các trường ngoài danh sách qua mass assignment. Không tự xác minh email. **AUTH-D01 CONFIRMED:** sau khi tạo thành công, đăng nhập guard `web`, đổi session ID và CSRF token, trả tài khoản khách mới; không nâng quyền hoặc tự xác minh email. Hành vi hiện có được giữ nguyên sau phê duyệt trực tiếp 22/10/2026.

### Đăng nhập

Input: `identifier` (email hoặc SĐT, bắt buộc, tối đa 191 ký tự), `password` (bắt buộc). Không có input role, user ID, status hoặc remember-me. Không áp độ dài tối thiểu tạo mật khẩu lên tài khoản cũ; vẫn chặn NUL, quá 72 byte với bcrypt để tránh bị cắt ngầm.

Đọc người dùng theo định danh chuẩn hóa; dùng guard `web` kiểm tra mật khẩu và trạng thái qua `attemptWhen()`. Sai mật khẩu, tài khoản không tồn tại hoặc định danh cũ mơ hồ đều trả cùng lỗi 422 tại `identifier`. Chỉ trả 403 “tài khoản đã bị khóa” sau khi mật khẩu đúng. Thành công đổi session ID (phòng session fixation — cố định mã phiên) và CSRF token. Email chưa xác minh vẫn đăng nhập được; không áp middleware `verified`.

Giới hạn: 5 request/phút/định danh chuẩn hóa trên mọi IP, đồng thời 30 request/phút/IP trên mọi định danh. Đăng ký: 5 request/phút/IP. Các request tới controller, kể cả thành công hoặc sai dữ liệu, đều tiêu tốn hạn mức; 429 có `Retry-After`. Cache key định danh dùng SHA-256, không chứa trực tiếp email/SĐT. Không khóa vĩnh viễn tài khoản bằng rate limit.

Hạn mức IP dùng `REMOTE_ADDR` từ kết nối trực tiếp (Nginx/FastCGI trong cấu hình hiện tại), không dùng `X-Forwarded-For` do client có thể giả mạo. Nếu sau này đặt thêm proxy/CDN, phải rà soát nguồn IP đáng tin; không tự đổi cách nhận IP hoặc tin mọi forwarded header trong limiter.

### Đăng xuất / tài khoản hiện tại

Logout gọi `logout()` guard `web`, `invalidate()` session, `regenerateToken()` CSRF. Session cũ bị xóa ở server; cookie cũ không thể khôi phục xác thực. `me` chỉ lấy `$request->user()`, không nhận user ID từ client, không truy vấn hợp đồng.

Response tài khoản chỉ có đúng: `id`, `full_name`, `email` (có thể NULL), `phone`, `role`, `status`. Không có `password`, `remember_token`, `id_number`, thông tin pháp lý hoặc trường Model khác.

## 3. Chuẩn hóa và dữ liệu cũ

Đã được chủ dự án xác nhận trong bước 3: email trim + chữ thường; `0901234567`, `84901234567`, `+84901234567` đại diện cùng số Việt Nam, ghi mới dạng `0901234567`. Không tự bỏ dấu/khoảng trắng giữa số, không tự chuyển mã quốc gia khác. Helper dùng chung trong đăng ký, đăng nhập và Artisan tạo Admin.

Không tự sửa dữ liệu hiện có. Khi kiểm tra SĐT trùng hoặc đăng nhập, tra cả ba dạng tương đương cho số Việt Nam. Nếu dữ liệu cũ có nhiều tài khoản cùng khớp SĐT, từ chối đăng nhập bằng số đó, không đoán theo mật khẩu; Admin vẫn có thể dùng email duy nhất của mình. Việc xử lý dữ liệu trùng phải được duyệt riêng. Email cũ được so sánh theo collation hiện có, không tự ghi lại thành chữ thường.

## 4. Mã lỗi và phân quyền

| HTTP | Ý nghĩa |
|---|---|
| 401 | Chưa đăng nhập / phiên cũ không còn hợp lệ / chỉ gửi Bearer token |
| 403 | Đã xác thực nhưng sai vai trò, hoặc tài khoản bị khóa |
| 409 | UNIQUE chặn đăng ký do định danh vừa bị chiếm sau validation |
| 419 | Phiên SPA không hợp lệ hoặc CSRF/origin không đạt theo Laravel |
| 422 | Input không hợp lệ, email/SĐT trùng được phát hiện khi validation, hoặc thông tin đăng nhập sai |
| 429 | Vượt hạn mức request; chờ `Retry-After` |
| 500 | Lỗi CSDL ngoài dự kiến khi tạo tài khoản, không lộ SQL/bindings |

Các API bảo vệ dùng `auth:sanctum` rồi `active`; middleware `role:admin` hoặc `role:technician,guard` bổ sung khi endpoint có giới hạn vai trò. Chỉ chấp nhận Enum vai trò có sẵn. Khi phát hiện khóa sau đăng nhập, hủy phiên hiện tại và trả 403; mở khóa không tự phục hồi phiên đó. Mỗi request thật đọc lại người dùng từ Database, nên không tin quyền từ cookie hoặc client.

Tại thời điểm Bước 3 chưa có Policy nghiệp vụ. Sprint 23/10 đã thêm BuildingPolicy/AmenityPolicy/RoomPolicy cho phạm vi Admin danh mục; hợp đồng HTTP CAT/ROOM/Dịch vụ/Giá/Settings ở brief §16–18. Tài nguyên cư dân sau này vẫn phải kiểm tra cả vai trò và quyền sở hữu. Route `/api/v1/testing/admin` chỉ được đăng ký trong Feature test, không có trong API sản phẩm.

## 5. Giới hạn triển khai

Bước 3 không tạo migration mới; kiểm thử API khi đó chỉ trên DB test. **Sau đó bước 3.5 đã được duyệt và áp dụng riêng migration email nullable lên dev, batch 3**; UNIQUE giữ nguyên, Nhóm 2–3 vẫn Pending. Xem DB plan §16. Đây là cập nhật trạng thái triển khai, không cho phép chạy migrations dev khác.

React Bước 4 đã nối 4 API; AuthProvider bootstrap/focus-refresh me; RequireAuth chỉ bảo vệ trải nghiệm, Laravel kiểm tra quyền thật. Không thay đổi endpoint/trường JSON/status code trong bước này. AUTH-D01/D02/D03 CONFIRMED, tài khoản chỉ đọc và không lịch hẹn giả.

Backend 227 test / 1267 assertion chạy lại PASS; client 8 test; 17 ca Chrome → Nginx 8081 → PHP-FPM → MySQL test PASS, gồm auto-login, F5/cookie, logout, 403/419/422/429/mạng. Laravel 13 kiểm tra `Sec-Fetch-Site` same-origin hoặc CSRF token; không suy luận thiếu token trên request same-origin luôn phải lỗi 419. Ca 419 browser chuyển nguyên phản hồi thật của request bị làm hỏng header có kiểm soát, không tắt middleware. Xem tài liệu học tập §11.11.

Chưa làm quên/đổi mật khẩu, xác minh/thay email, sửa hồ sơ, cấp nhân viên; API nghiệp vụ CAT/ROOM cơ bản đã bổ sung sau đó ở Sprint 23/10 (Plan §12). Admin qua Artisan vẫn bắt buộc email. Bước 4 không ghi dev; sau đó AUTH-13 đã kiểm thử 7 ca trên bộ Docker dev 8080 PASS, không migration, giữ 1 tài khoản khách qua đăng ký UI. Xem Plan §10; không coi kết quả cũ 227/1267 là vừa chạy lại.

## 6. PROFILE-A — hợp đồng API CONFIRMED 03/11/2026

Nguồn nghiệp vụ/AC: AUTHENTICATION.md §10; Q10 đã chốt nguyên tắc, chủ dự án đã duyệt cả hai endpoint và chính sách đăng xuất tất cả phiên.

| Method/URL | Body duy nhất | Thành công |
|---|---|---|
| PATCH `/api/v1/auth/profile` | `{full_name}` (trim,1–120 ký tự) |200 `{data:{id,full_name,email,phone,role,status}}` như /me |
| PUT `/api/v1/auth/password` | `{current_password,password,password_confirmation}` |204, mọi phiên cũ bị thu hồi; React về login |

Mọi role active tự thao tác tài khoản từ session, không nhận user_id hoặc field điều khiển khác. SPA cookie/CSRF giữ nguyên; current_password sai/new same/validation422, unauthorized401/locked403/CSRF419/race409/rate429/DBfailure500 an toàn. Giữ nguyên4API Auth đang có. Không schema/dev migration hoặc tự đổi mật khẩu dev trong triển khai/test.

## 7. EMAIL-A — hợp đồng API CONFIRMED 03/11/2026 (DB-D95)

Tất cả là JSON, Sanctum SPA cookie + CSRF như các route Auth khác. Mọi trường ngoài danh sách → 422 `missing`. Email trim + chữ thường như DB-D53.

| Method/URL | Đăng nhập | Body | Thành công | Lỗi chính |
|---|---|---|---|---|
| POST `/api/v1/auth/forgot-password` | Không | `{email}` | 202 `{message}` (luôn giống nhau) | 422 định dạng, 429 |
| POST `/api/v1/auth/reset-password` | Không | `{email, token, password, password_confirmation}` | 204, mọi phiên bị thu hồi | 422 `token`/`password`, 429 |
| POST `/api/v1/auth/email/verification-notification` | Có (active) | — | 202 `{message}` | 401, 403, 409 đã xác minh/không email, 503, 429 |
| POST `/api/v1/auth/email/verify` | Không | `{id, hash, expires, signature}` | 200 `{message}` (gọi lại vẫn 200) | 422 `link`, 429 |
| POST `/api/v1/auth/email/change` | Có (active) | `{email, current_password}` | 202 `{message}`, email chưa đổi | 422 `email`/`current_password`, 503, 429 |
| POST `/api/v1/auth/email/change/confirm` | Không | `{token}` | 200 `{message}` (không trả hồ sơ) | 422 `link`, 409 đã dùng/email bị chiếm, 429 |

`/me`, đăng nhập, đăng ký và PATCH profile trả UserResource 7 trường: thêm `email_verified` (true khi có email và `email_verified_at`). Liên kết trong thư trỏ về React cùng origin `APP_URL`: `/reset-password`, `/verify-email`, `/confirm-email-change`.
