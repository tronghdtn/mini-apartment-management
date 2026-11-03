# AUTHENTICATION — Spec module xác thực và tài khoản

> Cập nhật 22/10/2026. Đây là Spec chính: mô tả yêu cầu, phần đã CONFIRMED, phần chờ duyệt và tiêu chí nghiệm thu. **Quy trình Plan/Spec/Tasks và AUTH-D01..03 đã được chủ dự án duyệt ngày 22/10/2026.** Không suy ra phê duyệt các module hoặc chức năng ngoài phạm vi. Tiến độ/Tasks quản lý ở [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); giao thức HTTP ở [API_AUTHENTICATION.md](API_AUTHENTICATION.md); code và bằng chứng học tập ở [PROJECT_STATUS_AND_LEARNING.md](PROJECT_STATUS_AND_LEARNING.md) §11.

## 1. Phạm vi

**Bổ sung PROFILE-A (DB-D88, 03/11/2026):** đã duyệt tự sửa họ tên và đổi mật khẩu rồi đăng xuất tất cả phiên trên các trang hồ sơ hiện có. Phạm vi/API/AC tại §10; chỉ thay giới hạn chỉ đọc của AUTH-D03 đối với hai thao tác này. Không mở sửa SĐT/email/pháp lý hoặc khôi phục mật khẩu. Các mô tả Bước 4 bên dưới là phạm vi lịch sử của bước đó.

**Phạm vi cơ bản đã được giao ở bước 1–3.5:** email nullable; lệnh Artisan tạo Admin; đăng ký/đăng nhập/đăng xuất/lấy tài khoản hiện tại bằng Sanctum SPA session cookie; kiểm tra vai trò/trạng thái tại Laravel. Có code và kiểm thử tự động không đồng nghĩa đã tích hợp React hoặc mọi hành vi đã được duyệt.

**Bước 4 đã được giao triển khai:** nối React với 4 API, bootstrap phiên, guard, navbar/logout, tách danh tính thật khỏi demo, giữ giao diện Antigravity. Phạm vi tài khoản tối thiểu và điểm đến theo AUTH-D02/D03 CONFIRMED ở §8.

**Ngoài Bước 4:** gửi email/xác minh/khôi phục mật khẩu; đổi mật khẩu/email/hồ sơ; Admin cấp nhân viên; Policy/API nghiệp vụ; trang nghiệp vụ Resident/Staff mới. Q4/Q10/Q11 đã chốt nguyên tắc cho tương lai, không tự mở rộng phạm vi. Không SMS/OTP, không token lưu localStorage, không API công khai tạo Admin.

## 2. Actor và quyền

| Actor | Vai trò trong `users.role` | Quy tắc |
|---|---|---|
| Khách vãng lai | Không có tài khoản | Xem public; được đăng ký/đăng nhập, không vào API bảo vệ |
| Khách đã đăng ký | `user` | Vai trò duy nhất khi tự đăng ký; có khu vực “Tài khoản của tôi” (Q2) |
| Cư dân | `resident` | Không tự nhận vai trò qua đăng ký; quyền tài nguyên theo Policy ở module nghiệp vụ |
| Quản trị viên | `admin` | Cấp mới qua Artisan có kiểm soát, bắt buộc email; không nâng quyền tài khoản cũ bằng command |
| Kỹ thuật viên | `technician` | Admin cấp tài khoản theo Q11 ở bước sau; không tự chọn vai trò |
| Bảo vệ | `guard` | Admin cấp tài khoản theo Q11 ở bước sau; không tự chọn vai trò |

Chỉ có **5 vai trò**; khách vãng lai không phải vai trò thứ sáu. `status` chỉ `active`/`locked`. Vai trò thật do Laravel đọc từ CSDL, không từ công cụ demo/cookie do client tự khai. Giữ `resident` sau thanh lý theo DB-D36; quyền cần đang thuê kiểm tra hợp đồng active khi module đó được triển khai.

## 3. Quyết định CONFIRMED

| ID/nguồn | Quy tắc đã chốt |
|---|---|
| T2 | Đăng nhập bằng một định danh email **hoặc** SĐT + mật khẩu |
| DB-D57 / USR-D02 | Admin chỉ khóa/mở khóa user/resident/technician/guard, cấm chính mình và mọi Admin. Locked bị chặn cả login và phiên cũ; mở khóa không đổi mật khẩu/role, không xóa lịch sử. API/AC tại brief§22 |
| DB-D58 / USR-D03 | Admin sửa duy nhất full_name tại ADM-10; giữ SĐT/email/mật khẩu/role/status/pháp lý/lịch sử. Chưa mở API tự sửa hồ sơ các vai trò khác hoặc xác minh định danh. API/AC tại brief§23 |
| T3, DB-D52 | Admin đầu tiên/bổ sung qua `app:create-admin` tương tác, chỉ tạo tài khoản mới; mật khẩu nhập ẩn, không mặc định/hardcode/log |
| T4 | Không tự chuyển vai trò bằng demo; có lối về trang chủ và trở lại khu vực phù hợp tài khoản |
| Q2 | Khách đã đăng ký có khu vực “Tài khoản của tôi”; không đồng nghĩa mọi API lịch hẹn/hồ sơ đã được giao |
| DB-D51 | Đăng ký bắt buộc họ tên/SĐT/mật khẩu; email tùy chọn, lưu NULL khi không có; email có giá trị và SĐT duy nhất; không email giả |
| DB-D52, xác nhận riêng bước 2 | Admin bắt buộc email, không tự đánh dấu email đã xác minh; tạo đúng admin/active, không sửa/nâng quyền/mở khóa tài khoản cũ |
| DB-D53, xác nhận riêng bước 3 | Email trim + chữ thường; SĐT Việt Nam `+84/84` về `0`, dùng nhất quán API/Artisan; không tự sửa dữ liệu cũ |
| Yêu cầu bước 3 | Tự đăng ký chỉ user/active; không nhận role/status tùy ý; tài khoản khóa bị chặn cả khi đã đăng nhập; quyền thực sự do Backend kiểm tra |
| Q4 | Khôi phục qua email đã xác minh; không có email cần hỗ trợ xác minh thủ công; chưa SMS/OTP. Chưa có luồng phục hồi được triển khai |
| Q10 | Cho tự sửa tên hiển thị, đổi mật khẩu, thay email khi xác minh. Không tự sửa trực tiếp SĐT đăng nhập, role hoặc thông tin pháp lý. Quy trình chi tiết phải đặc tả trước khi code |
| Q11, DB-D56 / USR-D01 | Admin cấp mới Kỹ thuật viên/Bảo vệ: email tùy chọn NULL, Admin nhập ẩn+xác nhận mật khẩu ban đầu theo quy tắc hiện có và bàn giao thủ công; không mật khẩu mặc định/trả/log mật khẩu, chưa lời mời email/bắt đổi lần đầu. Admin mới vẫn qua Artisan; không đổi vai trò tài khoản cũ. Contract API/AC tại brief§21 |

Nguồn: các phê duyệt trực tiếp trong phiên bàn giao/bước 1–3 và [DB_DECISIONS_20261014.md](DB_DECISIONS_20261014.md) §J–L. Không bắt buộc email phải được xác minh trước đăng nhập trong phạm vi hiện tại; không tự thêm điều kiện `verified`.

## 4. Quy tắc dữ liệu và bảo mật

- Họ tên, SĐT, mật khẩu bắt buộc; email thiếu/rỗng sau chuẩn hóa lưu NULL. Cột email nullable và UNIQUE; nhiều NULL được phép, email có giá trị không trùng. SĐT vẫn NOT NULL UNIQUE.
- Backend kiểm tra cuối cùng bằng FormRequest/validated, Model hash mật khẩu; response chỉ danh sách trường được phép, không Model thô hoặc dữ liệu pháp lý.
- Không tự chứng minh sở hữu SĐT/email chỉ bằng kiểm tra định dạng. Không tự đánh dấu email verified hoặc tự gộp tài khoản cũ.
- Định danh chuẩn hóa nhất quán; với SĐT Việt Nam tra cả dạng cũ tương đương. Nếu nhiều tài khoản cũ khớp một số, từ chối đăng nhập bằng số đó, không đoán theo mật khẩu; xử lý dữ liệu phải được duyệt riêng.
- Chỉ dùng Sanctum SPA cookie/session; không bỏ CSRF. Đổi mã phiên khi đăng nhập, hủy phiên khi logout hoặc phát hiện khóa. Giới hạn request chống dò mật khẩu.
- Giới hạn độ dài, quy tắc bcrypt/confirmation, limiter và trường JSON hiện có là chi tiết kỹ thuật tại API Spec; không tự xem các thông số triển khai là phê duyệt chính sách hậu đăng ký.
- Artisan yêu cầu quyền truy cập môi trường vận hành; không phải API web và không tự xác thực người vận hành bằng tài khoản web. Không tạo Admin thật khi chỉ kiểm thử.

## 5. Luồng chức năng

### 5.1 Đăng ký

1. Client khởi tạo CSRF/session theo API Spec, gửi thông tin đăng ký; không gửi role/status.
2. Backend chuẩn hóa và validate, chặn trùng; chỉ ghi khi mọi trường hợp lệ; hash mật khẩu, gán user/active và trả tài khoản giới hạn trường.
3. Lỗi không làm tạo tài khoản dở dang; UNIQUE ở MySQL chặn tranh chấp sau validation.
4. **AUTH-D01 CONFIRMED:** sau đăng ký thành công, tự đăng nhập tài khoản khách user/active và tái tạo phiên; không tự nâng quyền. Phê duyệt trực tiếp mới là căn cứ, không phải prototype.

### 5.2 Đăng nhập

1. Client lấy CSRF cookie, gửi `identifier` và `password`.
2. Backend xác định email/SĐT, chuẩn hóa, đọc user từ MySQL và kiểm tra hash; không tin role/status client.
3. Sai thông tin hoặc định danh mơ hồ bị từ chối. Chỉ báo tài khoản khóa sau khi mật khẩu đúng, tránh lộ trạng thái cho người chưa chứng minh mật khẩu.
4. Thành công đổi mã phiên; trả dữ liệu được phép. Đến vùng phù hợp tài khoản, có lối về public; quy tắc điểm đến cho vùng chưa có theo D02 CONFIRMED.

### 5.3 Khôi phục phiên và lấy tài khoản

Client gửi cookie gọi `me`; Laravel lấy user của phiên và kiểm tra active. React dùng trạng thái đang tải để tránh hiển thị trang Admin trước khi xác minh; không thay `/me` bằng mock role hoặc localStorage. Các API nghiệp vụ sau này cần Policy kiểm tra cả quyền sở hữu.

### 5.4 Đăng xuất

Gọi API logout có CSRF; Laravel logout, hủy phiên và tạo lại CSRF token. Cookie cũ không còn dùng để truy cập API bảo vệ. React xóa state tài khoản sau kết quả phù hợp, không chỉ chuyển trang hoặc đổi role trong bộ nhớ.

### 5.5 Khóa và phân quyền

Mỗi API bảo vệ kiểm tra đăng nhập và active; kiểm tra vai trò nếu thao tác yêu cầu. Tài khoản bị khóa sau đăng nhập bị từ chối ở request bảo vệ tiếp theo và phiên đó bị hủy. Mở khóa không làm phiên bị hủy sống lại. Middleware vai trò chung đã có; chưa có Policy tài nguyên nghiệp vụ vì chưa triển khai các API đó.

### 5.6 Cấp Admin

Người vận hành nhập tên/SĐT/email bắt buộc/mật khẩu ẩn + xác nhận. Validate trước khi ghi một tài khoản mới admin/active; không tìm và nâng quyền tài khoản cũ, không tự xác minh email. Lỗi trả thất bại, không lộ mật khẩu hoặc ghi một phần tài khoản.

**Sửa lỗi terminal24/10 (AUTH-14):** đầu vào mật khẩu phải bỏ đúng một dấu kết thúc dòng Enter (LF/CRLF/CR), giữ nguyên khoảng trắng/ký tự thật; dùng `HiddenPasswordInput::ask`, không dùng trim toàn bộ. Với Symfony hiện tại, hidden+trimmable=false giữLF; test mô phỏng câu hỏi trước đây không bắt được. Không đổi hoặc nới kiểm tra mật khẩu Web.

Khôi phục Admin hiện có bằng `app:reset-admin-password` do người vận hành tự chạy: nhập email/SĐT, chỉ chọn duy nhất Admin active, nhập mật khẩu mới ẩn hai lần theo quy tắc hiện có, xác nhận mặc địnhNo trước ghi. Transaction khóa lại và từ chối nếu định danh/role/status/hash vừa đổi; chỉ đổi password/remember_token/updated_at, không tạo tài khoản/nâng quyền/mở khóa/xác minh email hoặc xóa nghiệp vụ. Sanctum từ chối phiên cũ khi hash thay đổi; React lấy CSRF mới trước login. Lệnh không tự chạy trên dev; chủ dự án đã đồng ý tự chạy để khôi phục tài khoản tạo bằng lệnh cũ. Đây là thao tác vận hành CLI, không API quên/đổi mật khẩu công khai.

## 6. Trường hợp lỗi

| Tình huống | Hành vi cần giữ |
|---|---|
| Thiếu/sai input, định danh trùng phát hiện trước ghi, role/status trong đăng ký | 422 và lỗi đúng trường, không cấp quyền từ client |
| Không có tài khoản/sai mật khẩu/SĐT cũ mơ hồ | Thông báo đăng nhập sai chung, không lộ tài khoản tồn tại |
| Chưa đăng nhập/phiên đã hủy | 401 trên API bảo vệ |
| Sai vai trò hoặc tài khoản khóa | 403 theo điều kiện tại §5, không tiếp tục thao tác |
| Tranh chấp UNIQUE sau validation | 409, không lộ SQL |
| CSRF/phiên SPA không hợp lệ | 419; frontend không giả đăng nhập thành công hoặc tắt CSRF |
| Vượt giới hạn | 429 và thời gian chờ; không khóa vĩnh viễn tài khoản bằng limiter |
| Mất mạng/lỗi server | Không báo thành công giả, không lộ chi tiết nội bộ |

Hợp đồng HTTP chi tiết, trường trả về và limiter: [API_AUTHENTICATION.md](API_AUTHENTICATION.md). Các mã lỗi mô tả ở đây phản ánh hợp đồng đã triển khai; không bổ sung API mới trong lượt tài liệu.

## 7. Tiêu chí nghiệm thu

Bằng chứng lượt Bước 4 ngày 22/10: Backend chạy lại 227 test / 1267 assertion; client 8 test; browser 17 kịch bản PASS trên môi trường test cô lập. Bảng dưới ghi giới hạn theo từng AC; xem bài học §11.11 để tái kiểm tra, không dùng kết quả này tuyên bố hoàn thành module tài khoản tương lai.

| ID | Kịch bản phải đạt | Bằng chứng/trạng thái hiện có |
|---|---|---|
| AC-01 | Đăng ký có email, thiếu/NULL email; nhiều tài khoản NULL; không sinh email giả | Backend 227/1267 PASS; browser B03/B08b; schema dev đã nâng cấp riêng trước đó |
| AC-02 | Email/SĐT thực trùng bị từ chối; UNIQUE còn nguyên, không có tài khoản dở dang | Backend PASS; browser B08; snapshot dev xác nhận UNIQUE/dữ liệu không đổi |
| AC-03 | Request role/status trái phép không cấp quyền; user mới đúng user/active | Backend PASS: role/status trái phép; React allowlist payload, không có công cụ đổi quyền |
| AC-04 | Login bằng email/SĐT, chuẩn hóa +84/84/0 nhất quán; dữ liệu cũ mơ hồ bị chặn | Backend PASS chuẩn hóa/dữ liệu cũ; browser B07/B08b email/SĐT và email RFC chứa # |
| AC-05 | Sai mật khẩu, locked trước/sau login, mở khóa không phục hồi phiên cũ | Backend PASS; browser B10 khóa trước/sau login; mở lại fixture không tự phục hồi phiên |
| AC-06 | Cookie/session/CSRF, đổi session ID, cookie bị sửa và request không đạt kiểm tra origin/token bị từ chối | Backend HTTP kernel PASS; browser B03/B04/B06/B11/B13/B16: cookie, XSRF header, origin/token bị từ chối |
| AC-07 | Rate limit nhiều định danh/IP; không tin forwarded IP tùy ý | Backend PASS các limiter/IP; browser B12 trả 429 thật và hiển thị chờ |
| AC-08 | Logout làm cookie cũ vô hiệu; me chỉ trả tài khoản phiên hiện tại và 6 trường cho phép | Backend PASS cookie cũ/6 trường; browser B04/B06/B15 danh tính/khôi phục/logout |
| AC-09 | 401/403 và middleware vai trò dùng Enum từ DB; không Bearer token | Backend PASS trên route test về vai trò/không Bearer; browser B01/B04. Chưa API/Policy tài nguyên nghiệp vụ |
| AC-10 | Artisan tạo mới Admin/email bắt buộc/hash/hidden, từ chối trùng và nâng quyền | Backend command tests chạy lại PASS; chưa thử Terminal nhập tay/tạo Admin dev |
| AC-11 | Hậu đăng ký khớp quyết định được duyệt | D01 CONFIRMED; Backend PASS và browser B03/B08b auto-login đúng user/active |
| AC-12 | Login/Register React gọi API thật, RHF+Zod, email tùy chọn/identifier; 422 đúng trường, 403/419/429/mạng đúng | 8 client tests + browser B02/B03/B07/B08/B08b/B10/B12/B15/B16 PASS; build/lint PASS |
| AC-13 | F5/URL trực tiếp khôi phục phiên từ me, guard không nháy dữ liệu Admin, không tự đổi vai trò demo | Browser B01/B04/B06/B13/B14 PASS: bootstrap/URL/F5, không đổi quyền, không mất form khi refresh nền |
| AC-14 | Đủ 5 vai trò có lối về public/vùng phù hợp; logout thật; không điều hướng tới vùng chưa có | Browser B05/B06/B07/B09/B15 PASS: đủ 5 vai trò, logout thật, lối về public và vùng đã có |
| AC-15 | Khu tài khoản có dữ liệu thật trong phạm vi đã giao, không lưu hồ sơ giả/hiện lịch giả như dữ liệu thật | Browser B03/B09: chỉ đọc dữ liệu thật, không form lưu giả/lịch cá nhân mock; đối chiếu source appointments placeholder |
| AC-16 | Chạy qua Nginx/trình duyệt: CSRF, login/F5/logout, sai quyền, khóa sau login, lỗi form; Bước 4 không ghi dev, AUTH-13 kiểm tra dev theo yêu cầu riêng | 17 browser cases PASS qua Nginx 8081/app riêng/MySQL test; dev snapshot nguyên vẹn. Bổ sung AUTH-13: 7 ca Docker dev 8080 PASS; không migration, giữ 1 khách test (Plan §10) |

Q4/Q10/Q11 tương lai cần đặc tả ca nghiệm thu riêng trước triển khai; không dùng AC-01..16 để tuyên bố đã hoàn thành toàn bộ quản lý tài khoản.

## 8. Quyết định Bước 4 — CONFIRMED 22/10/2026

Chủ dự án đã duyệt AUTH-04 và giao thực hiện từ AUTH-05 theo thứ tự Plan. Các phương án A sau là **CONFIRMED**, không còn chờ duyệt:

| ID | Quyết định được duyệt | Giới hạn |
|---|---|---|
| AUTH-D01 | Sau đăng ký thành công tự đăng nhập tài khoản khách user/active | Không nâng quyền, không tự xác minh email |
| AUTH-D02 | Admin tới `/admin`, user tới `/account/profile`; Resident/Technician/Guard dùng trang tài khoản tối thiểu hiện có khi khu vực chưa triển khai | Chỉ dữ liệu thật từ me và thông báo khu vực chưa hoàn thiện; không dashboard/dữ liệu nghiệp vụ giả, không tự chuyển vai trò |
| AUTH-D03 | Bước 4 chỉ đọc thông tin tài khoản từ me; vô hiệu hóa/loại bỏ lưu giả | Chưa API sửa hồ sơ/đổi mật khẩu/quản lý lịch hẹn. Trang nghiệp vụ chưa tích hợp phải phân biệt mock; không trình bày mock như dữ liệu tài khoản thật |

Return-to chỉ URL nội bộ được phép theo vai trò, không open redirect. Không thêm Resident/Staff dashboard. Các quyết định nghiệp vụ module khác vẫn chờ phê duyệt riêng.

## 9. Liên kết triển khai và kiểm chứng

- [Tasks AUTH-00..12 và trạng thái](IMPLEMENTATION_PLAN.md): nơi cập nhật tiến độ duy nhất.
- [API Authentication](API_AUTHENTICATION.md): hợp đồng kỹ thuật, ghi rõ hành vi auto-login đã được duyệt D01.
- [Tài liệu học tập §11](PROJECT_STATUS_AND_LEARNING.md): đường đi dữ liệu, file/hàm, command, kiểm thử và câu hỏi giảng viên; giữ số liệu 137/486, 165/755 và 227/1267 theo từng lần lịch sử.
- [DB plan §16](DATABASE_IMPLEMENTATION_PLAN.md): nâng cấp email nullable trên dev đã được phê duyệt và xác minh; không cho phép chạy migration dev khác.

## 10. PROFILE-A — tự sửa tên và đổi mật khẩu (CONFIRMED 03/11/2026)

Q10 đã CONFIRMED quyền tự sửa tên hiển thị/đổi mật khẩu; không hỏi lại nguyên tắc này. Chủ dự án đã duyệt toàn gói tên + mật khẩu, đăng xuất tất cả phiên. Hợp đồng API và xử lý phiên trên các trang hồ sơ hiện có:

- Mọi tài khoản active trong đúng5role, chỉ tài khoản đang đăng nhập. `PATCH /api/v1/auth/profile`: chỉ full_name (trim, bắt buộc, tối đa120 ký tự); trả200 UserResource6trường như /me. Không nhận user_id/email/phone/role/status hoặc thông tin pháp lý. Sửa tên không đổi mật khẩu/phiên/hợp đồng/hóa đơn.
- `PUT /api/v1/auth/password`: current_password, password, password_confirmation. Kiểm mật khẩu hiện tại tại Backend dưới khóa user; mật khẩu mới theo PasswordRules::registration, khác mật khẩu cũ. Không trim mật khẩu, không dùng mặc định, không trả/log/hash/payload nhạy cảm. Thành công204, đổi hash+remember_token, đăng xuất mọi phiên kể cả phiên hiện tại, CSRF hiện tại được tạo lại; React về đăng nhập và nhắc dùng mật khẩu mới. Từ chối mật khẩu cũ trên lần login sau.
- Cả hai cần Sanctum SPA cookie/CSRF + active, không chọn user từ request; thiếu login401, locked403, CSRF419, dữ liệu/trường cấm/mật khẩu hiện tại sai422, xung đột trạng thái409, throttle429. Mật khẩu giới hạn5request/phút/account và30/phút/IP; tên30/phút/account. User trong transaction phải còn active; rollback lỗiDB, thông báo an toàn. Không lưu mật khẩu trong storage/URL/toast hoặc response; xoá form sau thành công/hủy/unmount.
- Tái dùng AccountProfile cho guest/admin/resident/technician/guard; đổi tối thiểu các khối hiện có, RHF/Zod, loading/lỗi/retry/chặn bấm lặp. Email/SĐT/vai trò/pháp lý vẫn chỉ đọc; đổi email/xác minh/khôi phục không thuộc lát cắt này.
- Không schema/migration/thư viện mới. Không chạy thao tác thử với tài khoản dev. AC:5role tự sửa đúng mình; anonymous/locked/CSRF/field cấm; sai oldpassword, mismatch/same/bcrypt72byte/NUL; hash/no leak; hai phiên cũ đều401, login cũ thất bại/mới thành công; race khóa/đổi mật khẩu/SQLrollback; frontend test/build/lint, kiểm nhanh đúng phần vừa sửa trên DBtest có guard. Nghiệm thu toàn hệ thống để sau.

Đã duyệt cả hai endpoint và đăng xuất tất cả phiên. Email/xác minh/khôi phục vẫn ngoài lát cắt, không tự mở quyền thay email/SĐT.
