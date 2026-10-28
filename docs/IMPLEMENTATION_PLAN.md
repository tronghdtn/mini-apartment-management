# IMPLEMENTATION PLAN — Mini Apartment Management

> Cập nhật 24/10/2026. Plan và Tasks dùng chung cho Claude Code/Codex. Chủ dự án đã giao triển khai Sprint MVP dựa trên quyết định CONFIRMED; không khảo sát lại hoặc hỏi lại cùng quyết định. Bằng chứng ở §12. Local checkpoint được duyệt riêng và đã thực hiện §12.12; không push. Không tự chạy migrations dev, tạo dữ liệu thật hoặc xóa dữ liệu. Gói cấu trúc P4–P8 chưa được duyệt: chỉ dừng phần phụ thuộc.

## 1. Nguồn sự thật và trách nhiệm tài liệu

**Ưu tiên mới 27/10 sau báo cáo:** nghiệp vụ xuyên suốt trước tinh chỉnh UI: nhận cọc/kích hoạt → U1/MTR/U2 → INV/PAY/công nợ → CLOSE → VIEW/MAINT/NOTIF và API các vai trò. Antigravity tích hợp cùng module. P4/P5-B/Q15/U1/U2 đã duyệt, không hỏi lại; mọi migration dev vẫn cần duyệt cụ thể. LEASE-C đã tích hợp và kiểm thử DB test theo brief §28/§12.24: API terms/deposit/activation-context/activate và frontend ADM-13. Các nhóm sau tiếp tục theo dependency. Các quyết định còn mở đã gửi nhóm lựa chọn; không suy phê duyệt từ thời gian chờ.

| Nơi quản lý | Nội dung duy nhất cần duy trì ở đó |
|---|---|
| [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md) | Quy trình và giới hạn; CLAUDE import AGENTS, không có bộ quy tắc riêng trùng lặp |
| [DB_DECISIONS_20261014.md](DB_DECISIONS_20261014.md) | Quyết định CONFIRMED, gồm phần bổ sung mới nhất; đề xuất không tự trở thành quyết định |
| [09_DATABASE_DESIGN.md](09_DATABASE_DESIGN.md), [DATABASE_IMPLEMENTATION_PLAN.md](DATABASE_IMPLEMENTATION_PLAN.md) | Thiết kế vật lý, ràng buộc, nghiệp vụ CSDL; kế hoạch/biên bản migrations và P1–P12 |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Spec (đặc tả hành vi mong muốn), quyết định mở và tiêu chí nghiệm thu Auth |
| [API_AUTHENTICATION.md](API_AUTHENTICATION.md) | Hợp đồng HTTP: endpoint, input/output, mã lỗi và chi tiết kỹ thuật hiện có |
| File Plan này | Thứ tự, phụ thuộc, Tasks, trạng thái và liên kết bằng chứng; không chép lại toàn bộ Spec |
| [PROJECT_STATUS_AND_LEARNING.md](PROJECT_STATUS_AND_LEARNING.md) | Bằng chứng theo lần kiểm tra, giải thích file/hàm/luồng dữ liệu, câu hỏi bảo vệ đồ án |
| [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md), [FRONTEND_DESIGN_BRIEF.md](FRONTEND_DESIGN_BRIEF.md) | Danh mục UI và tham chiếu thiết kế Antigravity; UI/prototype không chứng minh Backend đã hoàn thành hoặc nghiệp vụ được duyệt |

Khi mâu thuẫn: yêu cầu/phê duyệt trực tiếp mới nhất của chủ dự án → quyết định CONFIRMED mới nhất → Spec module ở phần đã duyệt và thiết kế CSDL tương ứng. Plan chỉ phản ánh tiến độ, không ghi đè nghiệp vụ. Mâu thuẫn chưa giải quyết phải ghi rõ và dừng phần bị ảnh hưởng. Không tạo thêm backlog, file tasks hoặc Spec trùng với nơi đang quản lý.

## 2. Trạng thái và bằng chứng

| Trạng thái | Điều kiện sử dụng |
|---|---|
| Chưa làm | Chưa triển khai chức năng trong phạm vi task; UI mock/Model có sẵn được ghi riêng |
| Đang làm | Đang xử lý một task có phạm vi được giao; phải ghi điểm đã xong và bước còn lại |
| Bị chặn | Ghi rõ task/quyết định/môi trường đang chặn và điều kiện gỡ chặn; chỉ chặn phần phụ thuộc |
| Đã code | Có mã/tài liệu cần thiết, chưa đủ bằng chứng kiểm thử; không đồng nghĩa đã duyệt hành vi |
| Đã kiểm thử | Ghi loại kiểm thử, môi trường, lệnh, kết quả và lần chạy; chỉ áp dụng cho phạm vi đã kiểm tra |
| Đã tích hợp | Luồng UI → API → DB chạy thật qua Nginx/trình duyệt và đạt tiêu chí; riêng task DB ghi rõ chỉ tích hợp schema dev, không suy ra UI hoàn thành |

Trạng thái thực hiện khác trạng thái phê duyệt. Một hành vi đã code/test vẫn có thể chờ duyệt; riêng AUTH-D01 đã CONFIRMED sau phê duyệt trực tiếp. Task bị hủy/đổi phạm vi giữ ID và ghi lý do, không tái sử dụng ID. Không dùng phần trăm tự ước lượng.

Nhãn bằng chứng: **[SOURCE 22/10]** = đối chiếu file; **[TEST LỊCH SỬ 22/10]** = kết quả lần chạy trước đã ghi, chưa chạy lại trong lượt tài liệu; **[VẬN HÀNH 22/10]** = biên bản bước 3.5; **[CHƯA KIỂM CHỨNG]** = thiếu thao tác thực tế.

## 3. Baseline khi lập Plan — trước triển khai Bước 4

Bảng này giữ mốc bàn giao để đối chiếu. Hiện trạng sau Bước 4 và kết quả kiểm thử mới ở §5/§9; các nhãn chưa tích hợp trong bảng không phải trạng thái hiện tại.

| Hạng mục | Trạng thái và giới hạn | Bằng chứng |
|---|---|---|
| Backend Auth + Artisan | Đã kiểm thử tự động; chưa tích hợp React; AUTH-D01 đã CONFIRMED; chuẩn bị kiểm thử lượt mới | [SOURCE] `routes/api.php`, `AuthService`, command và tests; [TEST LỊCH SỬ] 227 test / 1267 assertion; xem tài liệu học tập §11 |
| Schema email nullable | Đã tích hợp **schema dev riêng**: đúng migration email, batch 3; không có Admin thật | [VẬN HÀNH] DB dev 13 bảng, migrations 8→9, users 0→0, sessions 11→11; checksum dữ liệu giữ nguyên; DB plan §16 |
| Nhóm 1 / Nhóm 2–3 | Nhóm 1 dev + test; Nhóm 2–3 chỉ test, 11 migration vẫn Pending trên dev | Biên bản bước 3.5; không truy vấn/rerun DB trong lượt tài liệu này |
| Nền tảng dữ liệu | Có migrations, 14 Model cho 16 bảng, Enum/Money; chưa có chức năng nghiệp vụ từ đó | [SOURCE] ngoài Auth chỉ có `HealthCheckService`, chưa có Controller/Service nghiệp vụ |
| Frontend Auth | Chưa làm tích hợp; chỉ có UI mock, schema email-only chưa phù hợp T2 | [SOURCE] login/register, mock context, layout tự đổi vai trò, router chưa có guard |
| Luồng Nginx/trình duyệt | Chưa kiểm chứng Auth thật | Test trước đi qua HTTP kernel/cookie/CSRF/MySQL test, không phải trình duyệt |
| Git | Các thay đổi Auth 1–3.5 và tài liệu chưa commit/push | `git status`; HEAD `f485050`. Không suy ra remote hiện tại từ ghi chép cũ “chưa có remote” |

## 4. Module, thứ tự và phụ thuộc

Thứ tự dưới đây là đề xuất triển khai theo lát cắt dọc (mỗi chức năng đi từ DB tới UI thật). Nhánh độc lập có thể tiến hành khi được giao, không cần chờ toàn bộ module trước.

| ID / module | Trạng thái chức năng thật | Phụ thuộc | Spec/nguồn yêu cầu hiện có |
|---|---|---|---|
| BASE — Hạ tầng, DB, kiểm thử, tiền/thời gian | Đã kiểm thử từng phần; chưa nghiệm thu toàn hệ thống | — | AGENTS §7–8, DB plan §1–7, thiết kế §1/6/7 |
| AUTH — Xác thực/phân quyền tài khoản | Đã tích hợp phạm vi Bước 4 trên môi trường test cô lập; các chức năng tài khoản tương lai chưa làm | BASE; D01–D03 cho phần Bước 4 tương ứng | **AUTHENTICATION.md**, API_AUTHENTICATION.md |
| CAT — Tòa nhà, tiện nghi, dịch vụ, settings, giá điện nước | Tòa/tiện nghi/dịch vụ/giá cơ bản đã tích hợp trên DB test; Settings GET8key/PUT2key đã kiểm thử, pivot API đã kiểm thử, UI gán đã tích hợp DB test theo CAT-D02 (14 ca browser PASS); UISettings chưa làm | AUTH; Nhóm 2 dev đã áp dụng; ghi giá còn cần Nhóm 3 để kiểm tra D33 | Thiết kế §3.2/3.4–3.6/3.10/3.12/3.20; brief §16; Tasks §12 |
| ROOM — Phòng và tra cứu công khai/liên hệ | Quản trị cơ bản đã tích hợp DB test; Nhóm2 dev đã áp dụng20bảng/16migrations, chưa AdminCRUDdev; public vẫn mock có nhãn | CAT, AUTH; Nhóm 2 dev đã áp dụng riêng theo DBplan§18; FILE cho ảnh | Thiết kế §3.3; brief §17; Q17 chỉ chặn chuyển trạng thái liên quan |
| USR — Quản lý người dùng/cấp nhân viên | Đọc/cấp nhân viên/khóa-mở khôngAdmin/sửa họ tên đã tích hợp DBtest, §12.8–12.11; các trường hồ sơ khác chưa mở | AUTH; Nhóm 2 cho thông tin đang thuê. Q6 chỉ chặn tạo người thuê trong hợp đồng, Q14 chỉ chặn dữ liệu cho technician; không chặn Admin đọc. Không có API tạo Admin | AUTH Q11; thiết kế §3.1; brief ADM-09..10 và §20 cho lát cắt đọc; Cấp/status/họ tên: brief§21–23, DB-D56/57/58; không còn blocker cho các lát cắt này |
| LEASE — Hợp đồng nháp/kích hoạt/dịch vụ | DraftCRUD/read đã tích hợp DBtest §12.13; kích hoạt còn P4/P5 và Q15. Q7 đã CONFIRMED DB-D59; dịch vụ nháp tại §12.15; P1/P2 baseline đã chốt, Q5/Q6 tùy chọn | ROOM, USR, CAT; Nhóm 2 | Thiết kế §3.8–3.11/5/6; DB plan §14; brief §8.1/24 đủ cho nháp |
| MTR — Ghi chỉ số điện nước | Chưa làm API; có schema/Model/UI mock | LEASE active, CAT giá; Nhóm 3 | DB plan §5/6; thiết kế §3.13/5; Spec chức năng cần hoàn thiện |
| FILE — Tệp/ảnh private | Bị chặn phần liên quan P6/P8; chưa có schema Nhóm 4 | AUTH + quyền sở hữu tài nguyên; duyệt triển khai Nhóm 4 | Thiết kế §3.7; DB plan §9/14; Spec upload cần hoàn thiện |
| INV — Hóa đơn | Chưa làm API; có schema/Model/UI mock | LEASE, CAT, MTR, Money; Nhóm 3; Q13, final phụ thuộc CLOSE | Thiết kế §3.14–3.15/5/6; DB-D27/32/43; Spec cần hoàn thiện |
| PAY — Thanh toán/công nợ | Chưa làm API; có schema/Model | INV; FILE cho minh chứng; Q8/Q12 | Thiết kế §3.16/5/6; brief §8.6; Spec cần hoàn thiện |
| CLOSE — Thanh lý/kiểm tra tài sản/đối soát cọc | Bị chặn P3–P9/P11/P12; chưa làm API | LEASE, MTR final, INV/PAY, FILE | DB-D43..49; DB plan §14; brief §8.4; Spec chưa đủ |
| VIEW — Lịch xem phòng/Bảo vệ | Chưa làm API/schema Nhóm 4 | ROOM, AUTH, nhân viên; Q3 | Thiết kế §3.18; brief §8.8; Spec cần hoàn thiện |
| MAINT — Sửa chữa/Kỹ thuật viên | Chưa làm API/schema Nhóm 4 | AUTH, USR, LEASE active, FILE; Q9/Q14/Q17 | Thiết kế §3.17; brief §8.7; Spec cần hoàn thiện |
| NOTIF — Thông báo | Chưa làm API/schema Nhóm 4 | Sự kiện nghiệp vụ thật, AUTH; Q16 | Thiết kế §3.19, DB-D23; Spec sự kiện cần hoàn thiện |
| DASH — Dashboard/tổng hợp | Chưa làm API; số liệu UI mock | Các API nguồn đã tích hợp; duyệt KPI/phạm vi báo cáo | Brief ADM-01/RES-01, inventory; chưa có Spec chức năng đầy đủ |
| PROFILE — Hồ sơ/khôi phục/xác minh email | Chưa làm; không thuộc Bước 4 | AUTH; Spec chi tiết mỗi lát cắt phải duyệt trước | AUTH Q4/Q10, API Auth §5; không tự tích hợp SMS/OTP |

Các liên kết “thiết kế/brief” là **nguồn một phần**, không phải Spec chức năng đã đầy đủ/đã duyệt. Khi bắt đầu module, bổ sung hành vi/lỗi/tiêu chí vào tài liệu đang sở hữu nội dung đó; chỉ đề xuất Spec module mới nếu chưa có nơi phù hợp. Không tạo trước hàng loạt file Spec rỗng. Bước 4 không tự tạo các trang nghiệp vụ Resident/Staff còn thiếu.

Chuỗi chính: BASE → AUTH → CAT/USR → ROOM → LEASE → MTR → INV → PAY → CLOSE. Nhánh VIEW từ ROOM; FILE phải sẵn trước chức năng cần ảnh thật; MAINT từ USR/LEASE; NOTIF và DASH lấy sự kiện/dữ liệu từ module thật. Có thể thiết kế chỉ số final trước, nhưng nghiệm thu CLOSE cần cả INV/PAY/FILE.

## 5. Tasks Authentication có thứ tự

Trạng thái module không nâng thành “Đã tích hợp” chỉ vì AUTH-01 đã chạy trên dev. Checklist đánh dấu hoàn thành theo phạm vi ghi ở từng dòng; lịch sử test xem §3.

| Xong | ID / task | Trạng thái | Phụ thuộc / tiêu chí nghiệm thu |
|---|---|---|---|
| [x] | AUTH-00 — Chuẩn hóa Spec + Plan + nguồn bằng chứng | Đã kiểm thử tài liệu; quy trình/Tasks Auth đã duyệt | Spec phân biệt CONFIRMED/đang có/chưa duyệt; kiểm tra tài liệu trong lượt này |
| [x] | AUTH-01 — Email nullable | Đã tích hợp schema dev | Migration mới, UNIQUE nguyên vẹn, rollback guard; AC-01/02; DB plan §15–16 |
| [x] | AUTH-02 — Artisan tạo Admin | Đã kiểm thử tự động lại 22/10: Backend 227/1267 | AC-10; chưa thử nhập tay/tạo Admin dev; không cần tạo thật để coi test tự động đạt |
| [x] | AUTH-03 — 4 API và middleware phiên/khóa/vai trò | Đã kiểm thử tự động lại 22/10: Backend 227/1267 | AC-01..09; AC-11 đã duyệt và kiểm thử; Policy tài nguyên thuộc module nghiệp vụ tương lai |
| [x] | AUTH-04 — Chốt AUTH-D01/D02/D03 và duyệt phạm vi Bước 4 | Đã xác nhận: chủ dự án duyệt A/A/A | Ghi câu trả lời vào Spec; duyệt từng phần độc lập, không tự đồng ý các lựa chọn mặc định |
| [x] | AUTH-05 — Đồng bộ hậu đăng ký theo D01 | Đã kiểm thử: Backend 227/1267 PASS lượt Bước 4, giữ auto-login | Sau D01 CONFIRMED; giữ auto-login, không đổi hợp đồng API; Backend PASS và browser B03/B08b xác nhận |
| [x] | AUTH-06 — API client/types/schema React | Đã tích hợp trên môi trường test cô lập; xem §9 | Sau khi được giao Bước 4; dùng `lib/http.ts`, identifier email/SĐT, email nullable, snake_case, RHF+Zod; AC-12 |
| [x] | AUTH-07 — AuthProvider/useAuth và bootstrap phiên `/me` | Đã tích hợp trên môi trường test cô lập; xem §9 | AUTH-06; loading/anonymous/authenticated, danh tính từ server, không từ mock/localStorage; AC-13 |
| [x] | AUTH-08 — Nối Login/Register giữ Antigravity | Đã tích hợp trên môi trường test cô lập; xem §9 | AUTH-05/06/07; lỗi 422 đúng trường, 403/419/429/mạng, không báo thành công giả; AC-12 |
| [x] | AUTH-09 — Guard, điều hướng và bỏ tự đổi quyền demo | Đã tích hợp trên môi trường test cô lập; xem §9 | AUTH-07 + D02; bảo vệ URL trực tiếp/F5, gỡ quick-entry/RoleSwitcher/`AdminLayout.setRole('admin')` khỏi luồng thật; AC-13/14 |
| [x] | AUTH-10 — Navbar/logout và tài khoản tối thiểu | Đã tích hợp trên môi trường test cô lập; xem §9 | AUTH-07/09 + D03; chỉ đọc `/me`, không thêm API hồ sơ; chặn nút lưu giả, về trang chủ/trở lại vùng phù hợp; AC-14/15 |
| [x] | AUTH-11 — Kiểm thử tích hợp qua Nginx/trình duyệt | Đã kiểm thử: 17/17 kịch bản Chrome/Nginx/MySQL test PASS | AUTH-08..10; AC-16, môi trường/dữ liệu test cô lập; không tạo dữ liệu dev hoặc chạy migrations dev để test |
| [x] | AUTH-12 — Nghiệm thu/cập nhật Plan và học tập | Đã kiểm thử tài liệu, cập nhật Spec/Plan/bài học và giới hạn | AC liên quan đều có bằng chứng; D01..03 đã xử lý; ghi giới hạn mock còn lại, kết quả build/lint/test/browser và Git; không tự commit |
| [x] | AUTH-13 — Xác minh bộ Docker dev chính thức 8080 | Đã kiểm thử: 7/7 ca browser PASS; không sửa code sản phẩm | Theo yêu cầu riêng sau AUTH-12; RUN_MIGRATIONS=false, đúng DB/account dev; schema/migrations không đổi; giữ 1 tài khoản khách kiểm thử; bằng chứng §10 |

AUTH-06/07 có thể độc lập với quyết định sau đăng ký khi phạm vi đã được giao; chỉ task phụ thuộc quyết định mới bị chặn. Lượt triển khai bắt đầu từ AUTH-05; trạng thái chỉ nâng sau khi có bằng chứng tương ứng.

## 6. Checklist cho các module còn lại

Mỗi ô là một task có ID ổn định. CAT/ROOM đã hoàn thành một phần theo ID con ở §12; ô tổng chưa đánh dấu vì còn chức năng ngoài lát cắt. Không lập kế hoạch từ đầu khi yêu cầu không đổi.

| Module | Spec/quyết định trước | Backend + kiểm thử | Tích hợp + nghiệm thu |
|---|---|---|---|
| BASE | [ ] BASE-01 rà soát phạm vi/môi trường trước mỗi task | [ ] BASE-02 kiểm tra guard, hạ tầng, migration cần duyệt riêng | [ ] BASE-03 bằng chứng runtime + DB không bị ghi ngoài phạm vi |
| CAT | [ ] CAT-01 chốt thao tác danh mục/khóa/xóa, khóa settings/seeder | [ ] CAT-02 Request/Policy/Service/Resource và test UNIQUE/FK (CAT-02a đã code/test; phần khác tiếp theo) | [ ] CAT-03 nối ADM-02/03/06/07/08/23 theo từng lát cắt |
| ROOM | [ ] ROOM-01 chốt Q17, dữ liệu công khai/ảnh | [ ] ROOM-02 API quản trị/công khai và test quyền/is_public | [ ] ROOM-03 nối ADM-04/05, PUB-01..04, bỏ mock ở màn đã nối |
| USR | [x] USR-01a/b/c/d đọc/cấp/status/họ tên đã duyệt; tách Q6/Q14/các trường khác | [x] USR-02a/b/c/d API Policy; chỉghi trườngđượcduyệt, khôngđổi quyền | [x] USR-03a/b/c/d ADM-09/10 đã tích hợp DBtest; chưaquảntrịAdmindev |
| LEASE | [x] LEASE-01a nháp độc lập theo baseline, brief§24; phần kích hoạt còn chờ | [ ] LEASE-02: 02a draftCRUD/read đã kiểm thử; kích hoạt/ALTER chỉ sau duyệt | [ ] LEASE-03: 03a ADM11/12/13 draft đã tích hợp DBtest; còn phần ngoài nháp |
| MTR | [ ] MTR-01 đặc tả R1–R17/khoảng tiêu thụ/giá | [ ] MTR-02 nhập all-or-nothing, không đoán hợp đồng/chỉ số | [ ] MTR-03 nối ADM-15, test thiếu/sai kỳ/chồng hợp đồng |
| FILE | [ ] FILE-01 duyệt collection/morph/loại/kích thước/quyền | [ ] FILE-02 schema được phép + private upload/download có Policy | [ ] FILE-03 test trái quyền, tệp sai và tích hợp nơi sử dụng |
| INV | [ ] INV-01 chốt Q13; tách monthly/final | [ ] INV-02 Money/snapshot/bất biến/hủy theo DB-D27 + tranh chấp | [ ] INV-03 nối ADM-16/17/RES-04/05, số tiền luôn từ Backend |
| PAY | [ ] PAY-01 chốt Q8/Q12, trạng thái và ảnh | [ ] PAY-02 pending/confirm/reject, lý do, mã RCP, khóa/tranh chấp | [ ] PAY-03 nối ADM-18/RES-05; công nợ không tính payment pending |
| CLOSE | [ ] CLOSE-01 chỉ hỏi cấu trúc P4–P8/P3/P9/P11 còn thiếu; P12 nguyên tắc đã chốt, P10 gộp P3 | [ ] CLOSE-02 kiểm tra tài sản/final/cọc/transaction, không đổi lịch sử | [ ] CLOSE-03 nối ADM-14, test cùng ngày/đúng hạn/trước hạn/quá hạn |
| VIEW | [ ] VIEW-01 chốt Q3 và routes đặt lịch ngoài inventory | [ ] VIEW-02 Nhóm 4 được phép, Admin duyệt/Guard hôm nay/đúng thứ tự check-in/out | [ ] VIEW-03 nối PUB-03/ACC-01/ADM-22/STF-03; dữ liệu riêng từng khách |
| MAINT | [ ] MAINT-01 chốt Q9/Q14/Q17 | [ ] MAINT-02 người đang thuê, assigned_to, chuyển trạng thái theo quyền | [ ] MAINT-03 nối RES-06..08/ADM-20..21/STF-01..02, test trái quyền |
| NOTIF | [ ] NOTIF-01 chốt Q16/dữ liệu thông báo | [ ] NOTIF-02 gửi sau commit, sync, người nhận và đọc riêng | [ ] NOTIF-03 tích hợp chuông/list/read, không lộ dữ liệu người khác |
| DASH | [ ] DASH-01 duyệt KPI/công thức/phạm vi | [ ] DASH-02 tổng hợp từ dữ liệu thật theo quyền | [ ] DASH-03 thay KPI mock, kiểm tra không dùng frontend tính tiền |
| PROFILE | [ ] PROFILE-01 đặc tả từng lát cắt Q4/Q10 và hỗ trợ thủ công | [ ] PROFILE-02 triển khai sau duyệt; bảo vệ phiên/email/mật khẩu | [ ] PROFILE-03 tích hợp sau API, không mở sửa SĐT/role/pháp lý |

## 7. Quyết định mở và điều kiện nghiệm thu chung

- Auth: **AUTH-D01/D02/D03 đã CONFIRMED A/A/A**, không còn chặn Bước 4. Q2/Q4/Q10/Q11 đã chốt nguyên tắc, không hỏi lại như chưa có quyết định; chi tiết triển khai ngoài phạm vi phải có task riêng.
- Hợp đồng/thanh lý: **P1–P12** quản lý duy nhất ở DB plan §14.4; P10 gộp P3. CONFIRMED DB-D43..49 không có nghĩa cấu trúc đề xuất được duyệt. Không sửa M09 đã commit.
- UI/nghiệp vụ khác: **Q3/Q5/Q6/Q7/Q8/Q9/Q12/Q13/Q14/Q15/Q16/Q17** còn ở brief §14.2; không cần duyệt tất cả trước Auth.
- Nguồn `PROJECT_CONTEXT.md`, docs `02`–`08`, ERD nguồn chưa có; không dựng lại nội dung bằng suy đoán. Module thiếu Spec phải hoàn thiện yêu cầu trước code.

Checklist nghiệm thu mỗi lát cắt:

- [ ] Spec và quyết định liên quan đã rõ, được duyệt; không dùng UI mock làm quy tắc chính thức.
- [ ] Trường hợp bình thường, dữ liệu sai, giới hạn, quyền/sở hữu và tranh chấp liên quan có kiểm thử.
- [ ] DB/API tương thích, không sửa migration đã commit; mọi thay đổi dev có phê duyệt riêng và backup/restore/pretend.
- [ ] Màn hình đã nối không còn lấy danh tính/dữ liệu từ mock; phần chưa nối được ghi rõ, không có thao tác thành công giả.
- [ ] Có bằng chứng build/lint/test phù hợp và Nginx/trình duyệt trước khi ghi “Đã tích hợp”; DB test luôn được bảo vệ.
- [ ] Plan cập nhật, tài liệu học tập có file/hàm/luồng/kiểm thử/câu hỏi bảo vệ; nêu rõ việc chưa xác minh.

## 8. Cách tiếp tục và ưu tiên kế tiếp

1. AUTH-00..13 đã hoàn thành trong phạm vi ghi ở §5. Sprint 23/10 tiếp tục CAT/ROOM theo §12; không tự mở rộng hồ sơ/email/khôi phục mật khẩu.
2. Thực hiện task đủ quyết định đầu tiên chưa xong; gán tiện nghi CAT-02b.4/03b.4 đã tích hợp DB test ở §12.7; USR đọc đã tích hợp ở §12.8; tiếp theo nhánh ghi khi các lựa chọn còn thiếu được chốt, chỉ hỏi đúng nhánh ảnh hưởng tiền/quyền/dữ liệu còn thiếu. Không cần lập lại Spec/Plan hoặc prompt dài.
3. Trước task, đọc AGENTS + Spec/AC + API liên quan, Git status và thay đổi sẵn có; không lập lại Plan mới nếu yêu cầu không đổi.
4. Chỉ hỏi lại khi có thay đổi yêu cầu/tác động chưa được phép. Việc duyệt Plan không cho phép tự chạy migrations dev, tạo dữ liệu thật, xóa dữ liệu, commit/push hay mở rộng sang module khác.
5. Kết thúc lượt: cập nhật task + bằng chứng + tài liệu học tập; chat ngắn: task xong, file đổi, test, quyết định còn thiếu, task tiếp theo. Sửa lỗi kỹ thuật nhỏ không đổi yêu cầu chỉ ghi task/AC liên quan, không tạo Spec riêng.

**Hiện tại:** CAT/ROOM đã qua kiểm thử/browser DB test; Nhóm2 dev đã áp dụng riêng, Room/UtilityPriceService đọc được schema mới; chưa AdminCRUDdev vì Admin0. Gán tiện nghi đã tích hợp DB test ở §12.7. USR đọc đã tích hợp ở §12.8. Nhánh ghi chỉ chờ đúng quyết định của nó; không chờ gói thanh lý để làm chức năng độc lập.

## 9. Bằng chứng lượt Bước 4 trước AUTH-13 — lịch sử 22/10/2026

Các kết quả dưới đây thuộc lượt triển khai trước; không chạy lại PHPUnit/build/lint/client 8/browser 17 trong lượt AUTH-13. Bằng chứng mới Docker dev ở §10.

- D01/D02/D03=A và quy trình đã được chủ dự án phê duyệt trực tiếp. AUTH-05 giữ nguyên Backend auto-login, đồng bộ nhãn Spec/API.
- Guard test 7/7, môi trường test 6/14 đạt; toàn Backend **227 test / 1267 assertion PASS**, Pint PASS trong lượt Bước 4; đây là kết quả lịch sử đối với AUTH-13.
- Frontend `npm run build` PASS, `npm run lint` 0 lỗi/9 cảnh báo có sẵn. `npm test`: 8 test client validation/điều hướng/lỗi PASS. Không thêm package.
- **17/17 kịch bản browser PASS** qua Chrome thật → Nginx riêng `localhost:8081` → app PHP-FPM riêng → MySQL 8.4 test. Frontend là bản build qua Vite preview; không chỉ kiểm thử HTTP kernel. Ma trận B01..B16 (thêm B08b), cách thử 419 thật và ảnh mobile ở bài học §11.11.
- Trước fixture: cả `mysql`/`mysql_test` và session/cache đã trỏ DB/account `mini_apartment_test`; guard DB-D30 và danh tính MySQL khớp. Bypass entrypoint, `RUN_MIGRATIONS=false`, không chạy migration. Helper CLI test có guard riêng; đã thử setup/status/cleanup trên DB test.
- Snapshot dev trước/sau **khớp toàn bộ**: 13 bảng, 9 migrations, users 0, sessions 11; cấu trúc/index/hash dữ liệu không đổi; Nhóm 2–3 vẫn 11 migration chưa áp dụng. Đã dọn đúng fixture do lượt test tạo; dừng các tiến trình/container test riêng, giữ MySQL như ban đầu.
- Giới hạn tại thời điểm Bước 4 (nay xem §10): chưa khởi động/kiểm thử bộ container dev cổng 8080; không tạo Admin dev. Các trang Admin/public nghiệp vụ vẫn mock có nhãn; ResidentLayout/StaffLayout chưa gắn route. Chưa sửa hồ sơ/quên mật khẩu/email/cấp nhân viên, chưa Policy nghiệp vụ.
- `git diff --check` và liên kết Markdown PASS; không cài package, không thay Backend API/schema, không commit/push. Chi tiết file thay đổi và các lỗi đã tái hiện/sửa: §11.11.

## 10. AUTH-13 — kiểm chứng Docker dev chính thức (22/10/2026)

**Mới thực chạy trong lượt này:** 7/7 ca Chrome → Nginx `localhost:8080` → PHP-FPM app → MySQL dev `mini_apartment` PASS. Đây là bộ `app/frontend/nginx/mysql` của Docker Compose dự án, frontend chạy Vite dev server trong container; không phải app/Nginx riêng 8081 hoặc Vite preview của lượt trước.

| Ca | Kết quả thực tế |
|---|---|
| DEV01 | Chưa đăng nhập vào /admin tới /login; API me trả401 |
| DEV02 | Đăng ký qua form thật201, tự đăng nhập; chỉ user/active, Resource đúng 6 trường; profile không form lưu giả |
| DEV03 | Reload/F5 giữ đúng tài khoản từ me; cookie phiên HttpOnly và XSRF tồn tại |
| DEV04 | Khách vào /admin bị guard từ chối, không đổi vai trò; me/DB vẫn user |
| DEV05 | Logout 204, me 401, URL /account/profile về login |
| DEV06 | Đăng nhập bằng email nhận đúng tài khoản và logout thật |
| DEV07 | Đăng nhập bằng SĐT nhận đúng tài khoản và logout thật |

- Đã đọc Git status, AGENTS/CLAUDE, Spec/Auth API, Plan, cấu hình Docker/entrypoint/session/Sanctum. Các thay đổi Authentication 1–4 vẫn chưa commit, không ghi đè; chi tiết nhóm file ở bài học §11.12. Prototype/.claude không thuộc công việc Auth lần này, giữ nguyên.
- Trước startup: `docker compose config --format json` được đọc nội bộ và chỉ in trường an toàn; xác nhận `RUN_MIGRATIONS=false`, DB mysql/mini_apartment và URL8080. Sau startup kiểm tra lại getenv trong app và SELECT đúng DB/account `mini_apartment@%`; session database, SameSite=lax, HttpOnly=true, cookie Secure không bật trên localhost HTTP. Sanctum stateful có localhost/127.0.0.1:8080. Không bỏ CSRF hoặc thay cấu hình DB.
- Lệnh vận hành: `docker compose up -d --no-build app frontend nginx`; Compose tái tạo container theo cấu hình hiện tại, volume MySQL được giữ. Trước/sau có snapshot so sánh. App log không có chạy migrations; lịch sử migrations vẫn đúng 9 dòng, 11 file Nhóm 2–3 vẫn pending. Không dùng --remove-orphans, down -v hay lệnh reset.
- Schema/index/constraints/FK/đối tượng DB và lịch sử migrations khớp trước/sau; vẫn 13 bảng. **Dữ liệu không hoàn toàn bất biến trong lượt này:** đăng ký thật tạo đúng 1 khách (users 0→1), sessions 11→13, cache limiter đổi. Hash các bảng ngoài users/sessions/cache không đổi; không tạo Admin (admin 0), không sửa dữ liệu nghiệp vụ hoặc xóa tài khoản. Số tự tăng users tiến thêm là hệ quả INSERT, không phải migration.
- Không phát hiện lỗi kỹ thuật cần sửa code. Không sửa Backend/Frontend/dependencies; npm startup không làm thay đổi package-lock. Không chạy PHPUnit có ghi DB trên dev; kết quả 227/1267, frontend 8 và browser 17 ở §9 là **lịch sử**, không tính như mới chạy lại.
- Giữ 4 container dev đang chạy để tiếp tục sử dụng; đóng Chrome profile riêng sau test. Tài khoản khách test được giữ; thông tin đăng nhập và snapshot/log báo cáo nằm trong `backups/auth-dev-8080/` đã gitignore, không in mật khẩu/cookie hoặc đưa vào Git. Không commit/push.
- Giới hạn: ca sai quyền ở /admin là guard React; không có API quản trị nghiệp vụ để thử 403 theo tài nguyên. Không thêm route thử nghiệm vào dev. Middleware role của Laravel có bằng chứng PHPUnit lịch sử; API me 401 sau logout được kiểm chứng mới. Không tạo Admin thật để thử dashboard. Khôi phục/xác minh email, hồ sơ chỉnh sửa, nhân viên và nghiệp vụ ngoài Auth vẫn chưa làm.

## 11. CAT-01 — đề xuất lịch sử trước phê duyệt Sprint23/10

Phần dưới giữ mốc AUTH-13. Chủ dự án nay đã giao triển khai phần CONFIRMED, xem §12; không lấy lời dừng ở lượt cũ làm điều kiện hỏi lại.

**Mục tiêu CAT-01 là chốt Spec/tiêu chí trước code**, không phải triển khai ngay CAT-02/03. Nguồn có sẵn: thiết kế DB §3.2/3.4–3.6/3.10/3.12/3.20; DB-D01/03/04/05/16/18/26/33; brief §7.3 (ADM-02/03/06/07/08/23); inventory tương ứng. Chưa có Spec chức năng CAT đầy đủ; không lấy UI mock làm quyết định. Lượt này chỉ đề xuất tại Plan, chưa tạo Spec mới trùng nội dung hoặc lập trình CAT.

| Phần | Nội dung đã có căn cứ | Điều cần ghi rõ trong Spec CAT-01 |
|---|---|---|
| Tòa nhà | Tên tối đa 150 ký tự, địa chỉ tối đa 500 ký tự, tầng>=1, tọa độ tùy chọn trong giới hạn, status active/inactive; không xóa tòa còn phòng/hợp đồng | Danh sách/chi tiết/tạo/sửa/trạng thái, quyền Admin, lỗi; tác động khi ngừng tòa/giảm tầng và điều kiện xóa tòa rỗng |
| Tiện nghi | Tên UNIQUE, tối đa 120 ký tự, mô tả, soft delete (lưu trữ), không tự thu tiền; hợp nhất tiện nghi tòa/phòng không nhân bản | Hành vi lưu trữ/khôi phục/tên trùng và liên kết đang dùng; không thêm cột status hoặc tự detach pivot |
| Dịch vụ | Tên UNIQUE toàn bảng; code bất biến khi đã dùng;3 kiểu phí cố định và metered hệ thống; tiền nguyên VND, metered price NULL | Quyền sửa các trường của dịch vụ đã dùng, ngừng dùng; giữ snapshot hợp đồng. Điện/Nước không sửa code/cách tính, không xóa; không tự cho tạo metered tùy ý |
| Giá điện/nước | Ngày01, unique service/ngày hiệu lực, giá > 0, không tác động kỳ đã có chỉ số/hóa đơn; không seed giá mẫu | Luồng thêm/xem lịch sử và lỗi; đề xuất trước mắt chưa mở sửa/xóa giá chưa dùng; không triển khai ghi chỉ số/hóa đơn trong CAT |
| Settings | Chỉ 8 khóa MVP tại DB §3.20:3 hệ thống,3 ngân hàng, due_days=5, expiring_warning_days=30; không secrets | Kiểu/giới hạn giá trị, trường được public, quyền Admin, cache/invalidation; không mở key tùy ý hoặc P5 chưa duyệt |

**Phụ thuộc phải tách riêng:** DB dev đã có buildings/amenities/services/settings; chưa có rooms/pivot/utility_prices và meter_readings/invoices cần kiểm tra lịch sử giá. Model tồn tại không làm bảng xuất hiện. Seeder hệ thống còn chưa làm (DatabaseSeeder rỗng). Không trả số phòng/tiện nghi 0 giả để che bảng chưa có; không bỏ kiểm tra lịch sử giá vì bảng thiếu. Muốn tích hợp đầy đủ CAT cần phê duyệt migrations dev có backup/restore/pretend riêng; CAT-01 không cấp quyền đó. Dữ liệu hệ thống được phép theo quy tắc không đồng nghĩa đã được chạy seeder trong lượt này.

**Đề xuất thứ tự khi được giao:** CAT-01a chốt ma trận dữ liệu/quyền/phụ thuộc; CAT-01b duyệt điểm mở; CAT-01c hoàn thiện Spec và hợp đồng API tại nơi phù hợp (tham chiếu DB/brief, không chép lại thiết kế); CAT-01d tách CAT-02/03 thành lát cắt có AC. Ưu tiên lát cắt tòa nhà + danh mục tiện nghi; gán tiện nghi/số phòng và giá điện nước chỉ tích hợp sau khi DB tương ứng được duyệt. Tái sử dụng giao diện Antigravity hiện có, không thêm dashboard hay màn hình.

**Các điểm cần chủ dự án duyệt trong CAT-01:**

1. Chọn lát cắt ưu tiên tòa nhà + tiện nghi như trên, hay một phần khác; đề xuất chọn phần này để kiểm chứng nền tảng trước giá/thu tiền.
2. Khi tòa inactive: chặn thao tác nào, tác động tới phòng công khai/đang thuê ra sao; đề xuất không tự thay trạng thái phòng/hợp đồng, phải chốt quy tắc đọc công khai ở ROOM. Có cho xóa vật lý tòa rỗng hay chỉ ngừng hoạt động?
3. Tiện nghi lưu trữ đang gán hiển thị thế nào; khôi phục tên đã lưu trữ thay vì tạo trùng? Soft delete và UNIQUE đã chốt, không hỏi lại việc có dùng soft delete.
4. Dịch vụ thường đã được dùng có khóa billing_type/unit như code không; giới hạn số/ngày trong settings; giá chưa dùng có cần sửa/xóa ở lát cắt đầu không. Đây là điểm thiếu chi tiết, chưa tự duyệt lựa chọn.

**Nghiệm thu CAT-01 (tài liệu):** phạm vi/không làm, vai trò/ownership cần thiết, luồng/lỗi, ma trận CONFIRMED/chờ duyệt, API draft và AC thành công/422/401/403/409/tranh chấp có liên kết nguồn; tất cả điểm phụ thuộc có quyết định hoặc được loại khỏi lát cắt rõ ràng. CAT-02/03 vẫn Chưa làm. Không migration, seeder, Controller/Service/Policy nghiệp vụ hoặc thay UI trong lượt này.


## 12. Sprint Full MVP — điều chỉnh cách thực hiện 23/10/2026

Phê duyệt trực tiếp: thực hiện ngay hành vi đã CONFIRMED từ tài liệu hiện hữu; chỉ quyết định thực sự thiếu mới hỏi. Không lấy P/Q Hợp đồng làm cổng chặn toàn CAT/ROOM. Phạm vi ngày1 bắt đầu bằng CAT; không đảm bảo Full MVP chỉ từ UI, không chạy migrations dev/chèn dữ liệu/xóa dữ liệu/commit/push ngoài quyền đã có. Lịch7ngày là ưu tiên/phụ thuộc, không phải cam kết đã hoàn thành: ngày1 CAT+ROOM nền; ngày2 USR+LEASE đủ quyết định; ngày3 MTR/INV; ngày4 PAY/CLOSE; ngày5 VIEW/MAINT/FILE; ngày6 tích hợp vai trò/DASH/NOTIF; ngày7 hồi quy/sửa lỗi/nghiệm thu. Các quyết định tiền/schema chưa chốt và migrations dev chưa duyệt phải được giải quyết kịp thời, chỉ chức năng phụ thuộc bị chặn.

| Task | Phạm vi từ Spec sẵn có | Trạng thái |
|---|---|---|
| CAT-01a | Đồng bộ điểm đã CONFIRMED, pin contract nhỏ trong brief §16; không khảo sát lại | Đã kiểm thử tài liệu; phân loại blocker §12.2 |
| CAT-02a | Backend buildings/amenities, Request/Policy/Service/Resource + Feature tests | Đã kiểm thử; kết quả mới §12.3 |
| CAT-03a | Nối ADM-02/03/06 API thật, giữ Antigravity + client/browser tests | Đã tích hợp trên DB test cô lập; chưa tạo Admin/dữ liệu dev |
| CAT-02b/03b | Dịch vụ/giá, seeder hệ thống, đọc8settings/lưu2khóa ngày; gán tiện nghi sau | Đã tích hợp lát cắt Dịch vụ/Giá trên DB test; Settings API đã kiểm thử; API gán đã kiểm thử, UI mới đang kiểm thử ở §12.7 |

Không hỏi lại D01..03, DB-D40 một lý do chênh chung, DB-D43 ngày cuối inclusive, DB-D46..49 nguyên tắc thanh lý/miễn/kiểm tra tài sản. Không biến phương án cấu trúc P4..P8 chưa duyệt thành CONFIRMED. Sau mỗi nhóm ghi bằng chứng thật và task kế tiếp ở đây.


### 12.1. Nhóm ROOM độc lập kế tiếp trong cùng Sprint

ROOM-01a dùng ngay quy tắc DB09 §3.3/brief §17: **Đã kiểm thử tài liệu**. ROOM-02a Backend cơ bản + Feature tests: **Đã kiểm thử**. ROOM-03a nối ADM-04/05: **Đã tích hợp trên DB test cô lập**. Không mở Q17 đổi trạng thái, không đổi hợp đồng/phí. Mốc triển khai ROOM-A ban đầu chưa có rooms dev và API trả 503 rõ ràng. Sau đó Nhóm 2 đã được duyệt/chạy riêng, xem §12.7 và DB plan §18; chưa xác minh CRUD Admin trên dev.


### 12.2. Rà soát quyết định 23/10 — không khảo sát lại

| Phân loại | Quyết định/phạm vi | Chức năng thực sự bị ảnh hưởng |
|---|---|---|
| Đã chốt, tài liệu cũ chưa đồng bộ | P1 giữ end_date>start_date hiện hành; DB-D43 đổi ý nghĩa ngày cuối, không tự mở hợp đồng dự kiến1ngày. P2 giữ một meter_gap_reason chung theo DB-D40; P12 kiểm tra tài sản bắt buộc mọi thanh lý theo D49; P10 gộp P3. Q2/Q4/Q10/Q11/AuthD01..03 đã chốt; archiveAmenity đã có SoftDeletes | Không chặn CAT/ROOM. Không hỏi lại các nguyên tắc trên; phần gợi ý tách lý do/giao diện không phải yêu cầu bắt buộc |
| Chặn trực tiếp một phần MVP, chưa duyệt | Gói lưu P4/P5-B/P6/P7/P8; miễn toàn bộ hay một phần; P9 phí khi nhận-trả cùng ngày; P11 căn cứ/số tiền/ảnh | Kích hoạt với điều khoản phí, áp miễn, kiểm tra tài sản/tệp và hóa đơn thanh lý liên quan. Chủ dự án trả lời CHƯA DUYỆT gói cấu trúc trong lượt này: không ALTER/schema tương ứng, tiếp tục độc lập |
| Chặn trực tiếp nhánh MVP | P3 mã trả quá hạn/ghi chú; Q15 ghi nhận cọc và điều kiện trước kích hoạt. Q7 đã CONFIRMED DB-D59 ở§12.15 | Chỉ nhánh đóng quá hạn, thu cọc/kích hoạt và chỉnh giá dịch vụ hợp đồng; không chặn tiền thuê nháp được sửa theo brief§8.1, giá niêm yết phòng hay tiện nghi |
| Chặn đúng quyền/trường MVP | Q8 gửi minh chứng nợ cũ sau thanh lý; Q9 ai đặt ưu tiên; Q14 technician được xem dữ liệu riêng tư nào; Q16 sự kiện/người nhận notification | PAY nhánh nợ cũ, MAINT trường ưu tiên/dữ liệu cư dân, NOTIF; không chặn CRUD phòng/tòa hoặc xác nhận thanh toán cơ bản |
| Chặn thao tác riêng | Q17 đổi status phòng có activecontract; tác động inactive tòa đến phòng/tra cứu | Không mở các chuyển trạng thái/cascade chưa chốt; tạo/xem/sửa thông tin phòng vẫn làm |
| SHOULD/FUTURE hoặc tùy chọn, không chặn baseline | Gia hạn/renewed/chuyển cọc; P2 tách lý do; P5-C mẫu điều kiện; Q3 tự đổi/hủy lịch/khung giờ mở rộng; Q5 nháp phòng còn người; Q6 tạo tài khoản ngay wizard; Q12 trang Công nợ riêng; restoretiện nghi, xóa vật lý tòa rỗng, sửa giá điện/nước chưa dùng | Có thể để ngoài lát cắt đang triển khai; baseline đặt lịch→Admin duyệt→Guard check-in/out đã có quy tắc. Nếu đưa thêm nhánh vào MVP thì duyệt đúng nhánh |
| Gate vận hành riêng, không thiếu khảo sát | Nhóm2–3 trên dev chưa duyệt chạy; Nhóm4/tệp cần gói cấu trúc chưa duyệt | Chặn đưa API phụ thuộc schema lên DBdev thật, không chặn viết code/test DBtest có guard; không tự migration hoặc trả dữ liệu giả để che thiếu bảng |

Nguồn: DB_DECISIONS mới nhất D40/D43..53; DB09§3.2/3.3/3.4/3.8/§7; DBplan§14; brief§14.2. Thiếu file khảo sát02–08 không là câu hỏi nghiệp vụ mới và không là lý do đứng yên. Không đánh dấu toàn CAT/ROOM/LEASE 'Bị chặn' vì một nhánh riêng.

### 12.3. Bằng chứng mới CAT/ROOM — 23/10/2026

- [x] CAT-01a, CAT-02a, CAT-03a; ROOM-01a, ROOM-02a, ROOM-03a trong phạm vi brief §16–17. Đã tạo Request/Controller/Service/Resource/Policy cho 3 tài nguyên và nối 5 trang Antigravity hiện có; không thêm màn hình/package/schema. Room không đổi status/chuyển tòa/xóa; Building không đổi status/xóa; Amenity chỉ soft archive theo thiết kế.
- [x] Kiểm tra guard trước DB tests: 7 test/7 assertion; TestEnvironment 6/14 PASS. `docker compose exec -T app php artisan test`: **428 test / 3080 assertion PASS** trên `mysql_test`/DB và tài khoản `mini_apartment_test`. Cấu hình phpunit/guard/account riêng giữ nguyên; kết nối `mysql` trong test cũng trỏ DB test. Pint `--test` PASS, 140 file. Có trường hợp 401/403/locked/422/409 UNIQUE race/503 thiếu bảng, Unicode vượt TEXT, phân trang/lọc và hợp đồng giữ nguyên khi sửa metadata.
- [x] `npm test`: **19 test PASS** (8 Auth + 11 CAT/ROOM); `npm run build` PASS; `npm run lint` 0 lỗi, 9 cảnh báo có sẵn. Build vẫn cảnh báo bundle >500 kB, chưa tối ưu ngoài phạm vi. Giới hạn TEXT kiểm tra bytes UTF-8 ở Laravel/Zod, tiền nhận đúng số nguyên an toàn JSON/JS; không làm tròn hoặc sửa BIGINT.
- [x] **16/16 ca browser PASS**, Chrome thật → Nginx test 8081 → Vite preview bản build và PHP-FPM test riêng → MySQL test; 10 CAT + 6 ROOM. Tạo/đọc/sửa bền qua F5, archive/tên trùng, lỗi 422 theo trường, 404 không fallback, API 403 thật với tài khoản không phải Admin, mất mạng không báo lưu thành công, mobile 390px không tràn. Bộ này không ghi dev; không coi là đã kiểm thử CAT/ROOM trên Docker dev 8080. TEXT biên được kiểm tra bằng PHPUnit và Node tests, chưa thao tác chuỗi dài trên browser.
- [x] App test `RUN_MIGRATIONS=false`, bypass entrypoint, cả mysql/mysql_test và session/cache xác minh đúng DB test trước fixture. Chrome dùng resolver localhost→127.0.0.1 để tránh dịch vụ IPv6 khác tại ::1:8081; không sửa dịch vụ đó hoặc bỏ CSRF. Helper fixture có guard, không endpoint test trong sản phẩm.
- [x] Đã dọn đúng 3 dữ liệu nghiệp vụ và 5 tài khoản do browser test tạo trên DB test bằng đối chiếu ID/tên/mã lượt. Đã dừng đúng Chrome/Vite preview và 2 container test; 4 container dev vẫn chạy, MySQL healthy. Snapshot dev trước/sau khớp toàn bộ metadata/hash: **13 bảng, 9 migrations, 1 user, không Admin**; 11 migrations Nhóm 2–3 vẫn chưa chạy. Không migration hoặc ghi/xóa dữ liệu dev, không commit/push.
- Bằng chứng nội bộ đã gitignore: `backups/catalog-sprint-20261023/` (JSON kết quả 16 ca, ảnh mobile, snapshots, runtime logs; fixture chứa thông tin test không đưa vào Git). Harness tái chạy: `frontend/tests/catalog.browser.mjs`; chỉ chạy sau xác minh môi trường test và dựng fixture mới.
- **Còn thiếu:** dịch vụ/settings/giá/gán tiện nghi, public room API/ảnh, chuyển trạng thái và các module khác. CAT/ROOM hiện chỉ là lát cắt cơ bản, không đánh dấu cả CAT/ROOM hay Full MVP hoàn tất. Chưa có phê duyệt migrations Nhóm 2–3 dev; P4–P8 chưa duyệt theo trả lời mới, không triển khai ALTER đó.
- **Tiếp theo:** CAT-02b/03b phần dịch vụ/settings đủ quy tắc; chỉ hoãn đúng trường/quyền còn thiếu theo §12.2/brief §14.2. Khi cần schema dev, chuẩn bị danh sách migration cụ thể + backup/restore/pretend để duyệt riêng; không tự chạy. Lịch 7 ngày phụ thuộc giải quyết đúng các blocker thật, không biến thành vòng khảo sát lại.

Chi tiết file/hàm/luồng dữ liệu và câu hỏi bảo vệ: [PROJECT_STATUS_AND_LEARNING.md](PROJECT_STATUS_AND_LEARNING.md) §11.13. Kết quả 227/1267 và browser Auth 17/7 ở §9–10 vẫn giữ đúng mốc lịch sử; không cộng vào 16 ca mới.

### 12.4. CAT-02b/03b — nhóm tiếp theo 23/10

Theo brief §18: CAT-02b.1 API dịch vụ + seeder hệ thống/settings đọc; CAT-02b.2 giá điện nước GET/POST; CAT-02b.3 PUT2khóa ngày đã duyệt; CAT-03b.1/2 nối ADM-07/08 hiện có. CAT-02b.1/2/3 Đã kiểm thử; CAT-03b.1/2 Đã tích hợp trên DB test cô lập (12/12 ca browser PASS). Không suy ra đã chạy trên dev. Chưa thêm màn hình Cài đặt. CAT-D01/DB-D54 vừa được duyệt: thêm API PUT riêng hai khóa số ngày1–365; các khóa khác vẫn chỉ đọc. Không sửa code/schema Thanh lý P4–P8, không chạy migration/seeder dev.

Phân việc không trùng file: Backend sở hữu class/requests/resource/policy/seeder mới; Frontend sở hữu features/services + utility-prices và 2 trang tương ứng; tests sở hữu bộ Feature/Node tests mới; agent chính tích hợp routes/banner, kiểm thử tập trung và lập phương án dev/checkpoint ở DB plan. Không tạo Plan/Spec song song, commit/push hoặc thay dependency.

### 12.5. Checkpoint Git đề xuất — chưa stage/commit/push

HEAD đã kiểm tra `f485050`; các thay đổi Auth/email/Admin/CAT/ROOM và tài liệu vẫn chưa commit. Migrations Nhóm 2 đã có commit từ trước, việc áp dụng dev là tác vụ vận hành riêng, không cần tạo/sửa lại migration hoặc đưa P4–P8 vào checkpoint.

| Thứ tự | Checkpoint đề xuất | File/phụ thuộc cần gom và bằng chứng |
|---|---|---|
| 1 | `feat: cho phép tài khoản không có email` | Migration email nullable mới + GroupOneSchema/OptionalUserEmailMigrationTest + hunk quyết định/schema tương ứng; không sửa các migration cũ |
| 2 | `feat: tạo quản trị viên bằng Artisan` | Console/CreateAdminCommand, AuthIdentity/PasswordRules cần dùng, Console tests; Admin bắt buộc email chưa tự xác minh. Các file hỗ trợ shared giữ một chủ sở hữu, checkpoint sau không tạo bản sao |
| 3 | `feat: xác thực phiên và phân quyền bằng Sanctum` | Backend Auth Request/Controller/Resource/Service, middleware, Provider/bootstrap/routes **hunk Auth**, Auth tests/Support; depends1–2. Không stage toàn routes vì có CAT/ROOM |
| 4 | `feat: kết nối giao diện xác thực với API` | Feature auth, router/App/layout/navbar/public login/register/account/mocks README, test Auth + npm test script phù hợp lúc đó; depends3 |
| 5 | `feat: quản lý tòa nhà tiện nghi và phòng cơ bản` | Backend 3 resource + policies/requests/services/MaxTextBytes/NotBoolean + CAT/ROOM tests, hunk routes/bootstrap liên quan; frontend3features/5pages/apiErrors/textLimits/layout/test CAT; depends3–4. Có thể tách Backend/Frontend nếu muốn checkpoint nhỏ, luôn giữ import/test khớp file đã stage |
| 6 | `feat: quản lý danh mục dịch vụ và bảng giá điện nước` | CAT-B API/seeder/settings đọc8khóa+PUT2khóa ngày đã duyệt +2features/2pages/test/hunk routes/banner; depends5. Chỉ đề xuất commit sau kiểm thử mới ghi ở §12.4; không lấy 428/19/16 cũ làm bằng chứng cho code mới |
| 7 | `docs: cập nhật tiến độ Sprint và biên bản Nhóm 2` | Plan/brief/learning/inventory/README/AGENTS và DB plan §17–18; hunks của quyết định Auth đã chốt nên đi cùng checkpoint1–4 khi phù hợp |
| 8 | `feat: gán tiện nghi cấp tòa và phòng` | API/Request/Service/Resource, feature amenity-assignment, hai trang chi tiết, tests và hunk route/CAT-D02; phụ thuộc checkpoint 5. Bằng chứng mới §12.7; chỉ đề xuất, chưa stage/commit |
| 9 | `feat: xem danh sách và hồ sơ tài khoản` | USR read Controller/Request/Service/Policy/2Resource, 2route, user-management feature/2pages/layoutbanner và tests; bản đồ code/Spec§20/Plan§12.8. Backend699/5053 +frontend39 +browserUSR16 PASS. Quy tắc học code có thể tách docs; chưa stage/commit |

Trước commit sau này: chọn file/hunk có chủ đích, xem diff staged, chạy checks theo AGENTS trên trạng thái checkpoint; không `git add .`. Không đưa `.env`, backups/fixtures/ảnh test có dữ liệu, dist/vendor/node_modules/log, `.claude/` hoặc các prototype cũ vào commit công việc này. Không giả định untracked đồng nghĩa file rác, không tự xóa chúng. Những checkpoint trên là đề xuất, không quyền tự commit/push.

### 12.6. Kiểm chứng CAT-B mới trong lượt tiếp tục

- Backend toàn bộ **572 test / 4134 assertion PASS** sau bổ sung CAT-D01/DB-D54; Pint PASS164file. Guard7/7 và TestEnvironment6/14 đã kiểm tra trước. Tất cả testDB chỉ mysql_test/mini_apartment_test/accounttest, không thay guard hoặc phpunit. Bản555/3932 trước thêm SettingsDays là trung gian; 428/3080 thuộc nhóm trước.
- Frontend **27 test PASS**, build PASS; lint0lỗi/9cảnh báo có sẵn, bundle vẫn cảnh báo>500kB. Chưa dependencies/màn hình mới.
- Ma trận browser riêng CATB01–12: 401; tạo/validate/F5/sửa/duplicate dịch vụ; khóa giá metered; thêm giá đúngngày01/F5/lọc/duplicate; Backend403 thật; offline; Settings365/0; mobile390px. Lượt đầu5caPASS rồi harness timeout vì Input.insertText không điền được input date, đã tái hiện ô rỗng và sửa riêng harness; không sửa sản phẩm/giảmvalidation. Lượt cuối **12/12 ca PASS** trên DB test cô lập qua Chrome/Nginx8081, không runtime exception. Harness đã thêm chờ dropdown sẵn sàng; không sửa sản phẩm để vượt test. Ảnh services-mobile/utility-prices-mobile được xem trực tiếp, bảng cuộn trong khung, không tràn trang.
- Migration dev: chỉ đề xuất cụ thể Nhóm2 ở DBplan§17 (7file200006–200012), chưa chạy migration/pretend/seeder hoặc tạo Admin. DBcharset/collation utf8mb4/utf8mb4_unicode_ci; không gộp Nhóm3/P4–P8. Backup/restore mới là kế hoạch sau phê duyệt, chưa tuyên bố đã thực hiện.
- Checkpoint commit đề xuất §12.5; index chưa stage, HEADf485050, không commit/push. Còn gán tiện nghi, màn hình Settings và các thao tác ngoài lát cắt; hai khóa số ngày đã CONFIRMED1–365, không hỏi lại. Chi tiết file/luồng/hàm/câu hỏi học tập ở §11.14 của tài liệu học tập.

**Kết thúc lượt CAT-B:** source/API/UI/test/docs đã cập nhật. Đã dọn đúng dữ liệu browser test theo ID/key/mã lượt, dừng Chrome/Vite preview và2container test; 4container dev giữ chạy, MySQL healthy. Snapshot dev trước/sau khớp toàn bộ metadata/hash/migrations:13bảng/9migrations/1khách, không Admin; RUN_MIGRATIONS=false. Không migration/seed/ghi hoặc xóa dev, không stage/commit/push. Kết quả572/4134 +27 +12 là bằng chứng mới; 428/3080 +19 +16 ở§12.3 giữ lịch sử. Kiểm tra links/fences/diff theo tài liệu.

**Task tiếp theo:** CAT-02b.4/03b.4 — gán tiện nghi cấp tòa/phòng và hiển thị hợp nhất theo DB-D01/DB09§3.5–3.6; dùng2pivot, không sao chép tiện nghi xuống từng phòng, không phát sinh phí. Đọc/ghi phải báo rõ khi dev thiếu schema; không tự migration. Settings màn hình/ghi6trường thông tin còn thiếu chưa làm; hai khóa số ngày đã duyệt không hỏi lại. Phương án Group2 cần chủ dự án duyệt một lần theo DBplan§17; phạm vi7file không kèmGroup3/P4–P8/seeder/Admin.

### 12.7. Nhóm 2 dev và gán tiện nghi — 23/10/2026

| Task | Trạng thái và bằng chứng mới |
|---|---|
| DB-G2-DEV | **Đã tích hợp schema dev.** Sau phê duyệt đúng 7 file: backup mới ngoài repo, restore cô lập/đối chiếu, diễn tập và 33 DDL pretend đạt; apply 7 path thành công batch 4. Dev từ 13 bảng/9 migration thành **20 bảng/16 migration**; 7 bảng mới rỗng, cấu trúc và dữ liệu cũ nguyên vẹn, bảng migrations thêm đúng 7 dòng. Nhóm 3 vẫn 4 file pending. Biên bản đầy đủ ở DB plan §18 |
| CAT-02b.4 | **Đã tích hợp trên DB test cô lập.** GET/PUT gán tiện nghi cấp tòa/phòng, Backend tính hợp không trùng/không sao chép; giữ liên kết lưu trữ. Toàn Backend **650 test/4.667 assertion PASS**, gồm 78 ca mới; Pint **169 file PASS** |
| CAT-03b.4 | **Đã tích hợp trên DB test cô lập.** Panel trên hai trang chi tiết hiện hữu, giữ Antigravity. **CAT-D02/DB-D55 CONFIRMED:** hiện tiện nghi đã lưu trữ kèm nhãn, chỉ sửa tập hoạt động. Frontend **32 test PASS**, build PASS, lint 0 lỗi/9 cảnh báo cũ. Browser **14/14 ca PASS**, không runtime exception; không dùng kết quả lịch sử thay cho nhóm này |

**Ma trận trình duyệt mới, Chrome/Nginx 8081 + DB/account test riêng:**

| Ca | Kết quả thực chạy |
|---|---|
| ASSIGN01 | Anonymous: API trả 401, giao diện yêu cầu đăng nhập — PASS |
| ASSIGN02 | Admin test đăng nhập, tạo fixture qua API thật — PASS |
| ASSIGN03 | Gán tiện nghi tòa qua UI; phòng kế thừa, không sao chép pivot — PASS |
| ASSIGN04 | Tải lại trang giữ lựa chọn tòa; gỡ hết hoạt động, gán lại — PASS |
| ASSIGN05 | Gán trực tiếp phòng; hợp kế thừa không trùng — PASS |
| ASSIGN06 | Tải lại trang giữ lựa chọn phòng; PUT thật có XSRF — PASS |
| ASSIGN07 | Archive thật qua API; có nhãn, không checkbox đã lưu trữ, lưu giữ liên kết — PASS |
| ASSIGN08 | Gỡ tập hoạt động vẫn giữ liên kết đã lưu trữ cấp tòa/phòng — PASS |
| ASSIGN09 | Mobile 390 px, nhãn rõ, không tràn ngang; đã xem ảnh — PASS |
| ASSIGN10 | Mất mạng khi lưu không báo thành công giả; tải lại/thử lại — PASS |
| ASSIGN11 | Mất mạng khi tải có lỗi và tải lại được — PASS |
| ASSIGN12 | Tài khoản user bị Laravel chặn 403 ở cả 4 endpoint — PASS |
| ASSIGN13 | CSRF sai trả 419 thật, tập gán không đổi — PASS |
| ASSIGN14 | Dừng PUT trước server, archive ID bằng API rồi tiếp tục: 422 thật, lỗi hiện đúng trường; tải lại được — PASS |

Lượt browser đầu timeout trước ca 01 vì localhost IPv6 trỏ ứng dụng khác; xác định test Nginx chỉ bind IPv4. Chạy lại Chrome với `--host-resolver-rules="MAP localhost 127.0.0.1"` và đích IPv4 cho request Node; **không sửa sản phẩm hoặc làm yếu validation**. Lượt cuối 14/14 đạt. Harness tại frontend/tests/amenity-assignment.browser.mjs; artifact/screenshot/log trong backups/amenity-assignment-20261023 đã gitignore. Browser 12 CAT-B, 16 CAT/ROOM, 7 Auth dev trước đó là **lịch sử**, không chạy lại toàn bộ trong lượt này. Race tại browser là thay trạng thái trước khi PUT tới server; Feature test còn kiểm tra ranh giới sau validation, không tuyên bố test hai process gán đồng thời.

**Mức xác minh Docker dev:** localhost:8080 đang chạy; 5 route HTML 200/health 200, protected API 401 (gồm 2 API gán mới). Room/UtilityPrice Service chỉ đọc được danh sách rỗng đúng schema. Chưa kiểm thử CRUD bằng Admin trên dev vì **Admin = 0**, không được tự tạo hoặc giả quyền. ELECTRICITY/WATER chưa seed; thêm giá vẫn cần meter_readings Nhóm 3 để thực thi D33 nên trả 503. Không tự gộp migrations/seeder/Admin ngoài phạm vi.

**Git và phạm vi:** giữ công việc Auth/CAT/ROOM chưa commit; không sửa 7 migration đã commit, không stage/commit/push. Checkpoint đề xuất ở §12.5 có thêm nhóm gán tiện nghi, chưa thực hiện. Học tập: §11.15–11.16.

**Tiếp theo:** lát cắt USR-01/02a/03a danh sách/chi tiết tài khoản chỉ đọc cho Admin, tận dụng ADM-09/10 hiện có và thiết kế §3.1; không tạo trang mới. Tách cấp nhân viên/khóa tài khoản/nhập pháp lý khỏi lát cắt đọc; chỉ hỏi quyết định thực sự thiếu ở thao tác phụ thuộc, không lấy P4–P8 hoặc Q6/Q14 chặn việc đọc độc lập. Vận hành dev với Admin/seeder là phạm vi riêng, chưa được phép trong lượt này.


**Đóng lượt kiểm thử:** dọn đúng fixture trên DB/account test đã xác minh lại: 2 phòng, 3 tiện nghi, 1 tòa, 5 tài khoản cùng liên kết/phiên của lượt; schema test vẫn 24 bảng. Đóng Chrome/Vite riêng và dừng đúng 2 container test, giữ 4 container dev chạy/MySQL healthy. Snapshot dev cuối `after-browser.json` trong thư mục backup Group 2 khớp toàn bộ nội dung JSON với `after.json`: 20 bảng, 16 migration, dữ liệu không đổi thêm sau apply. So sánh chuỗi ban đầu khác do CRLF/LF; chuẩn hóa xuống dòng và đối chiếu từng phần JSON đều khớp, không phải thay đổi dữ liệu. RUN_MIGRATIONS=false, hash 7 migration nguồn không đổi. Kiểm tra Markdown/link/code fences và git diff --check đạt; không stage/commit/push.


### 12.8. USR-A — tiếp tục module độc lập

| Task | Phạm vi | Trạng thái |
|---|---|---|
| USR-01a | Pin lát cắt đọc từ ADM-09/10 và DB09 §3.1 tại brief §20; thêm quy tắc hướng dẫn code thật vào AGENTS §3.2 | Đã kiểm thử tài liệu — file/line/API/links/fences/diff đã kiểm tra |
| USR-02a | GET users/list/detail, FormRequest/Policy/Service/Resource, Feature tests; không API ghi | Đã kiểm thử — toàn Backend 699 test/5.053 assertion, Pint176 file PASS |
| USR-03a | Nối hai trang hiện hữu API thật, filter/search/pagination/detail và bỏ thao tác giả; tests | Đã tích hợp trên DB test cô lập — frontend39 test/build/lint và browser16/16 PASS |
| USR-04a | Kiểm thử Nginx/browser DB test cô lập; cập nhật bản đồ code ngắn | Đã kiểm thử — browser16/16 PASS, 0 runtime exception; learning §11.17 |

Nguồn/AC tại brief §20. Phân công theo file: Backend API riêng, React feature/pages riêng, tests riêng; root quản lý route/glue/tài liệu và kiểm tra hợp nhất. Không ghi đè thay đổi Auth/CAT/ROOM, không migration/seed/Admin hoặc ghi dev, không commit/push. Kết quả 650/4667 +32 +14 trước đó là lịch sử cho đến khi có lượt kiểm tra mới.


**Ma trận browser USR-A trước khi chạy:** anonymous/Backend403/locked; list và pagination20+; tìm tên/email/SĐT và ký tự literal; kết hợp role/status/đang thuê; detail đúng ID/NULL/hồ sơ pháp lý/đang thuê thật, F5; ID thiếu404 không fallback; lỗi mạng và retry; mobile390px/bảng cuộn; không có nút hoặc API ghi giả. Fixture chỉ DB/account test, chờ Backend suite hoàn tất trước setup. Kết quả từng ca sẽ ghi sau thực chạy; không lấy browser14 gán tiện nghi làm bằng chứng USR.


**Cập nhật quyết định USR ghi:** email/mật khẩu/bàn giao nhân viên đã được duyệt DB-D56/USR-D01, xem §12.9; không còn là blocker. Phạm vi khóa đã được chốt tiếp bằng DB-D57/USR-D02: chỉ tài khoản khôngAdmin, xem§12.10; không còn blocker này. Hồ sơ chỉ chờ đúng phạm vi trường/quy trình, không chặn khóa/mở khóa; P4–P8 không liên quan.


**Bằng chứng mới USR-A:** toàn Backend **699 test/5.053 assertion PASS** (49 ca mới), Pint **176 file PASS**; frontend **39 test PASS** (7 ca mới), build PASS, lint 0 lỗi/9 cảnh báo có sẵn. Frontend đã sửa kiểu created_at nullable theo schema và hiển thị thông tin thiếu, không tạo ngày giả; lượt build/test/lint và browser cuối dùng bản đã sửa.

**Browser USR01–16: 16/16 PASS, 0 runtime exception** qua Chrome/Nginx 8081, DB/account test riêng: anonymous401/guard; list20 dòng/resource chỉ đọc; 23 fixture phân trang20/3; AND role/status/đang thuê + reset trang; resident đã thanh lý không đang thuê; xóa lọc; tìm tên/email/SĐT/%/_/backslash literal; validation191/không kết quả; detail pháp lý đúng Admin và không có ở list/me; F5 nhận đúng API/ID; 404 không fallback; mobile390px/bảng cuộn trong khung; Backend403 và guard; offline list/retry; offline detail/retry; mọi request user chỉ GET. Locked và thiếu schema còn có Feature tests trong full suite, không tuyên bố đã có browser riêng cho mọi ca đó. Đã xem ảnh desktop/mobile, giữ Antigravity. Harness frontend/tests/user-management.browser.mjs; browser artifacts backups/user-management-20261023; logs full suite backups/usr-read-20261023, đều gitignore.

Lượt browser đầu timeout trước ca01, chưa có đủ metadata để kết luận nguyên nhân. Đã giữ report đầu riêng; profile mới được xác minh Document/Script200 từ127.0.0.1, rootReact có thật và đúng asset mới trước khi chạy lại 16ca đạt. Không sửa sản phẩm hoặc làm yếu validation vì timeout. Không quy kết nguyên nhân IPv6 của lượt trước sang lượt này khi chưa có chứng cứ.

**Dev chỉ đọc mới:** mở lại 4 container cũ sau khi xác minh RUN_MIGRATIONS=false cả Compose và container; không recreate, không migrate. GET /api/v1/users và /users/999999 trả401; HTML /admin/users trả200. Chưa Admin dev nên không tuyên bố đã thao tác quản trị thật trên8080. Snapshot/cleanup cuối ghi bổ sung sau đối chiếu; 650/4667 +32 +14 ở§12.7 là lịch sử, không cộng browser14 thành caUSR.


**Đóng lượt USR-A:** cleanup đã xác minh lại guard/SQL/session:23USR users+2contracts/1room/1building và5Auth accounts cùng phiên của đúng lượt đã dọn trên DB test; schema test24 bảng không đổi. Đóng Chrome/Vite riêng, dừng2container test, giữ4container dev/MySQL healthy. Snapshot dev-before/dev-after khớp **mọi phần JSON**:20bảng/16migration/1khách, cấu trúc và hash dữ liệu không đổi. migrate:status chỉ đọc xác nhận4file Nhóm3 vẫn pending; RUN_MIGRATIONS=false. Không chạy migration/seeder/Admin hoặc ghi/xóa dev; không stage/commit/push. Còn thiếu đúng nhánh USR ghi đang hỏi, không đánh dấu cả moduleUSR hoàn tất.


### 12.9. USR-B — cấp nhân viên theo phê duyệt mới

DB-D56/USR-D01 đã CONFIRMED (email tùy chọn, Admin nhập ẩn+xác nhận mật khẩu và bàn giao thủ công); không hỏi lại gói này. Tại mốc USR-B lựa chọn khóa còn chờ; nay đã duyệt DB-D57/USR-D02, triển khai§12.10. Spec/API/AC tại brief§21; không schema/dev migration/seed/Admin hoặc dữ liệu dev, không commit/push.

| Task | Phạm vi | Trạng thái |
|---|---|---|
| USR-02b | POST users với Request/Policy/Service, tạo đúng technician/guard và không đổi phiên; tests | Đã kiểm thử — toàn Backend 771 test/5.806 assertion, Pint179 file PASS |
| USR-03b | Modal cấp nhân viên tại trang danh sách hiện có, xử lý lỗi/reset mật khẩu/refresh thật | Đã tích hợp trên DB test cô lập — frontend46/build/lint và browser14 ca PASS, mức bằng chứng bên dưới |
| USR-04b | Auto tests + browser cô lập, cập nhật bản đồ code ngắn | Đã kiểm thử — Backend771/5806, frontend46, browser14 ca; học tập §11.18 |

Các kết quả 699/5053 +39 +browserUSR16 là lịch sử của USR-A, không tính là kiểm thử chức năng tạo mới.


**Ma trận browser USR-B trước khi chạy:** Admin mở modal tại danh sách; 2 lựa chọn vai trò và password luôn ẩn; validation/confirmation; hủy mở lại không giữ mật khẩu; tạo technician không email và guard có email chuẩn hóa, 201+GET refresh thật; /me vẫnAdmin, nhân viên đăng nhập được ở context khác và bị403APIAdmin; duplicate422/không nâng quyền tài khoản cũ; inputroleAdmin/directPOST bị422; CSRF419; lỗi mạng không thành công giả/thử lại; bận thì không đóng/gửi lặp; mobile/modal cuộn và không tràn; UI/storage/URL/response không chứa mật khẩu; 404/list read hồi quy. Chỉ ghiPASS theo ca thực chạy trên DB test, chưa setup fixture khi fullsuite đang chạy.

**Test USR-A được cập nhật đúng thay đổi đã duyệt:** trước đây POST/users chưa có nên assert405. Sau USR-D01, giữ kiểm tra GET không ghi và PUT/PATCH/DELETE không mở; POST roleadmin giờ phải422 (không được cấpAdmin), vẫn đối chiếu tài khoản/hợp đồng không đổi. Không bỏ kiểm thử bảo vệ hoặc làm yếu quyền.


**Bằng chứng mới USR-B (23/10):** toàn Backend **771 test/5.806 assertion PASS** (72 ca mới), Pint179 file PASS. Frontend **46 test PASS** (7 ca mới), build PASS (asset index-CAYj2kHN.js), lint0 lỗi/9 cảnh báo cũ; không thêm package. Guards DB-D30/phpunit không đổi, preflight xác minh mysql_test/mini_apartment_test/mini_apartment_test@% và tài khoản test không đọc được dev. Các mốc699/5053 +39 +browserUSR-A16 là lịch sử, không dùng thay cho USR-B.

**Browser14 ca PASS trên Nginx8081/DB test, 0 runtime exception:** STAFF01 anonymousPOST401; 02 modal2vai trò/passwordẩn; 03 confirmation sai khôngPOST; 04 hủy/mở lại xóa mật khẩu; 05 technicianNULLemail/+84về0/201/GETrefresh; 06 giữ phiênAdmin/F5/detailthật; 07 guard/emailchuẩn hóa; 08 duplicateemail422; 09 duplicatephone422/khôngnângquyền; 10 roleAdmin422/cross-siteCSRF419/khôngghi; 11 staffmới đăngnhập ở cookiejar riêng và bị403APIAdmin; 12 offlinekhôngthànhcônggiả/thửlại; 13 giữPOSTđangbay, chặnđóng/gửilặp, chỉ1lần201; 14 mobile390×844 vừa khung,390×667cuộn tới nút thao tác, không tràn/không lộ mật khẩu trong text/storage/URL, hủy xóa state. Đã xem ảnh desktop/mobile. **13ca từ lượt chính, ca14 chạy lại riêng**, cùng build; không tuyên bố14ca trong một lượt. Harness frontend/tests/staff-user.browser.mjs; browser-summary.json và báo cáo từng lượt trong backups/staff-create-20261023 (gitignore).

**Lỗi được giữ bằng chứng và xử lý:** routePOST ban đầu đặt nhầm nhóm/auth làm72ca405; đã chuyển đúng nhómAdmin và thêm test URI/middleware/không mở auth/users. 37ca so sánh model factory với dữ liệu SQL thiếu các cộtNULL mặc định: đổi baseline sang đọc từ SQL, vẫn so toàn bộ giá trị. Browser đầu giả định token sai từ same-origin luôn419 không đúng Laravel13; đổi request giả mạo cross-site theo PreventRequestForgery, không sửa bảo mật sản phẩm. Lượt tiếp kiểm tra GET trước khi hoàn tất: chờ danh sách thực nhận dữ liệu. Mobile ban đầu đòi form luôn cuộn dù615px vừa khung: kiểm tra đúng cả màn cao và màn ngắn. Không bỏ test hoặc làm yếu quyền/validation.

**File của lát cắt:** Backend: StoreStaffUserRequest mới; AdminUserController/AdminUserService/UserPolicy/routes bổ sung POST; StaffUserCreateTest mới, AdminUserReadTest cập nhật đúng contract mới; StaffBrowserCleanup chỉ CLI DBtest. React: StaffUserForm mới, user-management api/schema/AdminUsersPage và thông báo AdminUserDetailPage; accountSchemas dùng chung với auth/schemas; tests staff-user.test.mjs và staff-user.browser.mjs. Spec/quyết định/tiến độ/bản đồ code cập nhật trong các file đang sở hữu nội dung; không tạo Spec khác, migration, Model/Enum hoặc màn hình mới. Giữ toàn bộ công việc Auth/CAT/ROOM có sẵn.

**Dev chỉ đọc:** health200, HTML/admin/users200 khi Accept:text/html, API/users401 không đăng nhập. Request HTML với Accept:application/json ban đầu404 do SPA fallback của Vite; headerHTML đúng200, không phải lỗi route sản phẩm. RUN_MIGRATIONS=false; snapshot dev-before-resume/dev-after khớp cả12phần JSON (schema/columns/indexes/constraints/FK/objects/migrations/count/hash/create table…),20bảng/16migration/1khách/0Admin. Nhóm3 đúng4file300013–300016 vẫn pending. Không migrate/seed/Admin/nhânviên hoặc xóa dev. Chưa kiểm chứng quản trị trên8080 vì không được tự tạoAdmin.

**Checkpoint10 đề xuất, chưa thực hiện:** `feat: cấp tài khoản kỹ thuật viên và bảo vệ`; tách đúng hunk/file USR-B kể trên, phụ thuộc checkpoint9/2/3, kèm DB-D56/brief§21/learning§11.18 và test. Không stage/commit/push. **Tiếp theo:** nhánh khóa/mở khóaUSR đã duyệt riêng DB-D57/USR-D02 và tiếp tục tại§12.10; cấpnhânviên không còn blocker. Các phần LEASE/ROOMcôngkhai/VIEW độc lập tiếp tục theo Plan khi đủ quyết định riêng; P4–P8 không chặnCAT/USR, chưa duyệt/chạyNhóm3dev. Không tự coi việc duyệt cấpnhânviên là duyệt khóaAdmin, tạoAdmindev hoặc seeder.

**Đóng lượt USR-B:** xác minh lại DB/account test rồi dọn đúng4STAFF +5Auth fixture và phiên gắn tài khoản của lượt cuối; hai lượt lỗi trước cũng dọn đúng3/4STAFF+5Auth tương ứng. Không resetDB hoặc xóa dữ liệu dev. Đóng Chrome riêng, dừng đúng preview5175 và2container test; giữ4container dev/MySQLhealthy. Lint cuối0lỗi/9cảnh báo cũ, diff--check đạt. Mọi backup/fixture/report nằm dưới backups/ đã gitignore; không stage/commit/push. Snapshot dev khớp12phần và4fileNhóm3pending đã được kiểm tra thực tế, không suy từ tài liệu.

### 12.10. USR-C — khóa/mở khóa đã duyệt

DB-D57/USR-D02 CONFIRMED phương án A. Spec/HTTP/AC tại brief§22; không hỏi lại phạm vi này. Hồ sơ tách riêng; chỉ sửa họ tên đã được duyệt DB-D58/USR-D03 và tiếp tục§12.11, không mở các trường khác. Không schema/migrate/ghi/xóa dev/Admin/seeder/commit/push; giữ thay đổi USR-A/B/Auth/CAT/ROOM.

| Task | Phạm vi | Trạng thái |
|---|---|---|
| USR-02c | PATCH users/{user}/status; Policy, Request, transaction/row lock, tests quyền/lịch sử/phiên | Đã kiểm thử: 819/6402 +Pint181, sau đó hồi quy cùng họ tên |
| USR-03c | Nút+modal xác nhận ADM-10, lỗi thật/GET refresh, không màn hình mới | Đã tích hợp DB test: browser13/13 trên buildCKr0QSXf; hồi quy thêm sau họ tên |
| USR-04c | Tests/build/lint/Pint/browser cô lập và bản đồ code | Đã kiểm thử: 48ca mới, frontend49/browser13 PASS; bản đồ§11.19, mốc trước tích hợp họ tên |
| USR-05 | Lát cắt sửa hồ sơ | Đã duyệt duy nhất full_name (DB-D58), triển khai02d–04d; SĐT/email/mật khẩu/pháp lý chưa mở |

Mốc771/5806+46+browserUSR-B14 là lịch sử cho đến khi chạy kiểm thử mới. Ma trận browser trước chạy: lock/unlock cả4roles; hủy/giữphiênAdmin; targetphiêncũ403→401, lockedlogin403/unlocklogin200; targetAdmin/self/noUI/403; directnonadmin403; invalid422/CSRF419; F5/listthật; offline/retry; pendingchặnđóng/gửilặp; mobile390px/actionsvisible. Fixture chỉDB/account test đã guard, không dùng Admin dev.


### 12.11. USR-D — họ tên đã được duyệt trong lúc kiểm thử USR-C

DB-D58/USR-D03 CONFIRMED, brief§23; không hỏi lại phạm vi họ tên. USR-05 đã gỡ blocker cho đúng1trường, còn SĐT/email/mật khẩu/pháp lý không mở. BrowserUSR-C đang dùng buildCKr0QSXf, không rebuild dist hoặc chạy DBsuite/xóa fixture khi lượt đó chưa kết thúc; sau cleanup mới chạy testDB mới và build/tích hợp họ tên.

| Task | Phạm vi | Trạng thái |
|---|---|---|
| USR-02d | PATCH users/{user} chỉ full_name, Policy/Request/transaction/tests | Đã kiểm thử: toàn Backend867/6970, Pint183file PASS |
| USR-03d | Modal1trường trênADM-10; refreshdetail/me khi sửa chính mình | Đã tích hợp DBtest: browser12/12 trênCldKYjey, frontend52/build/lint PASS |
| USR-04d | Auto/browser DBtest, kiểm tra lại status sau tích hợp, cập nhật học tập | Đã kiểm thử: Backend867/6970/Pint183, frontend52, browser12/12 +status13/13; bản đồ§11.19–20 |

Browser trước chạy: form chỉ họ tên; hủy/validation; sửa têntrim/GETrefresh/F5/list; payloadrole/status bị422/nonAdmin403; tựsửa tênAdmin/me/navbar; offline/retry/busy; mobile; regressionkhóa/mởkhóa vẫn cấmAdmin. Bằng chứng819/6402 +49 trước đó chỉ cho USR-C, chưa bao gồm họ tên.



**Bằng chứng USR-C đã hoàn tất trước USR-D:** 819test/6402assertion Backend, Pint181file, frontend49/build/lint PASS; 13/13browser trên Nginx8081/DBtest, buildCKr0QSXf,0runtimeexception. Đủ cả4roles lock/unlock; cookieResident trước khóa403→401, lockedlogin403/unlocklogin200; Admin/self không nút và403API; nonadmin403, protected422/CSRF419/404; F5 chờ GETmới, liststatus thật, offline/retry, pendingchặnđóng/gửilặp, mobile390×667. Đã xem ảnh desktop/mobile, dọn đúng5Auth fixture trước chạy suite họ tên. Đây là bằng chứng lịch sử của buildC, không dùng thay cho browserhọ tên.

**Tự động bản tích hợp USR-C/D mới 24/10:** toàn Backend867test/6970assertion PASS (thêm48ca status+48ca name so với771), Pint183file PASS; frontend52test PASS (46+3status+3name), buildPASS/CldKYjey, lint0lỗi/9cảnhbáocũ. Sandbox từng chặn Node spawnEPERM trước test, đã chạy lại với quyền tiến trình con; không sửa sản phẩm, bỏ test hoặc giảm validation. Test đọc cũ chỉ đổi kỳ vọng PATCH/users/{id} từ405 sang422 với payloadrole/status theo APIhọ tên mới, vẫn so toàn bộ dữ liệu cũ không đổi; PUT/DELETE vẫn405.


**Browser USR-D 12/12 PASS,0runtimeexception**, Nginx8081/MySQLtest, buildCldKYjey: NAME01anonymous401;02chỉtrườngtên/điềnsẵn/hủykhôngPATCH;03rỗng/121ký tựkhônggửi;04trim/lưu/GETrefresh/F5/tra têntronglist/giữhồsơ;05fieldscấm422/CSRFcross-site419/404;06cả4nonAdmin403;07Admin tựsửa tên→/me/navbar mới, vẫnkhôngkhóachínhmình;08offlinekhôngghi/thửlại;09giữPATCHđangbay/chặnđóng/gửilặp;10mobile390×667/actionsvisible;11hồi quylock/unlock sauđổi tên,rolekhôngđổi;12response tối thiểu/nohash/legal/runtime. Đã xem ảnhdesktop/mobile. Harness bổ sung chờ bộlọc trả đúng1dòng trướcassert để tránh đọc bảng trướcGET xong; không sửa sản phẩm hoặc giảmassert. 13caStatus trước dùngCKr0QSXf,12caName dùngCldKYjey; không gộp thành25ca cùngbuild. Bản cuối có hồi quyStatus quaNAME11 vàfullBackend867.

**File của USR-C/D:** Backend thêm UpdateUserStatusRequest/UpdateUserNameRequest, UserStatusTest/UserNameTest; sửa UserPolicy, AdminUserService, AdminUserController, routes và kỳ vọng PATCH của AdminUserReadTest. React thêm UserStatusAction/UserNameForm, schema/API, ghép AdminUserDetailPage + thông báo AdminUsersPage; tests user-status/user-name (unit+browser). Không sửa UserModel/Enum/AuthService/EnsureActiveAccount hoặc schema. DB-D57/58, brief§22/23, AuthSpec/Plan/học tập và các mục tiến độ có sẵn được đồng bộ. Giữ mọi thay đổiAuth/CAT/ROOM/USR-A/B chưacommit.

**Dev/cleanup:** snapshot dev-before(USR-C)/dev-after(USR-D) khớp cả12phần JSON gồm schema/columns/indexes/FK/constraints/objects/migrations/count/hash/create table:20bảng/16migration, không thay dữ liệu. RUN_MIGRATIONS=false;300013/300014/300015/300016 vẫnpending. Xác minh guard vàSQLidentity trước mỗi fixture/test/cleanup; tài khoản test bị từ chối đọc dev. Dọn đúng5fixtureUSR-C trước suiteName và đúng5fixtureName sau kiểm thử (đổi tên vẫn giữ prefixrun+SĐTfixture), không resetDB. ĐóngChrome/Vite5175 và dừng2container test, giữ4container dev/MySQLhealthy. Chưa thao tácquảntrị trêndev8080 vìchưaAdmin; không tựtạoAdmin/seed/migrate/ghi/xóa dev/stage/commit/push. Artifacts/logs dưới backups/user-status-20261023 và backups/user-name-20261024 đãgitignore, khôngin credentials.

**Checkpoint đề xuất, chưa thực hiện:**11`feat: khóa và mở khóa tài khoản không phải quản trị viên` (C),12`feat: cập nhật họ tên tài khoản` (D), tách hunk chungController/Service/Policy/routes/page/API/schema theo phụ thuộc9–10. Cảhai cótest/Spec/Plan/bảnđồcode; không stage/commit/push. **Cần quyết định:** không còn cho hai lát cắtUSR đã giao; SĐT/email/password/pháp lý giữ chỉđọc, không tựmở. **Tiếp theo:** các lát cắtMVP còn lại theoPlan; không dùngP4–P8chặnmoduleđộc lập, không tựduyệt tiền/quyền/schema. USR hiện hoàn thành đúng các lát cắtđãduyệt, không tuyên bố đã có mọi nghiệp vụ hồ sơ/lịch sử.

### 12.12. Checkpoint và tiếp tục Hợp đồng — 24/10/2026

Chủ dự án đã cho phép **local commit có chọn lọc**, không push; yêu cầu này thay thế giới hạn chưa commit của các lượt trước. Rà soát 179 file chính thức thay đổi (35 tracked, 144 untracked): không phát hiện secrets, SQL dump hoặc runtime artifacts trong nhóm này. `.env`, backup, fixture JSON, build/dependencies/log đã ignore. `.claude/`, `public-ui-concept/`, `ui-antigravity-full/` chưa xác nhận nguồn/phạm vi nên giữ nguyên ngoài checkpoint.

Kiểm tra **mới trước checkpoint**: MySQL test preflight đúng connection/database/account riêng và bị từ chối đọc dev; Backend **867 test/6.970 assertion PASS**, Pint **183 file PASS**; frontend **52 test PASS**, build PASS (`CldKYjey`), lint 0 lỗi/9 cảnh báo cũ. Browser USR/Auth/CAT ở các mục trên là lịch sử, chưa chạy lại trong lượt này. Logs dưới `backups/checkpoint-ctr-20261024/` (gitignore).

Chia checkpoint: (1) ALTER email nullable + tests; (2) Backend Auth/CAT/ROOM/USR + tests và system seeder chưa chạy dev; (3) React tích hợp + test source; (4) Spec/Plan/học tập/quy tắc. Backend dùng chung routes/provider nên lưu nguyên nhóm tương thích thay vì tách hunk tạo commit thiếu lớp phụ thuộc. Kiểm tra từng staged manifest/diff/secrets trước commit; hash thực tế bổ sung sau khi thành công.

Đã tạo local checkpoint `ff5888a` (nullable) và `9151d49` (Backend); commit React theo ngay sau. Staged diff phát hiện 5 browser harness có dòng trống dư cuối file: chỉ bỏ dòng dư, chạy lại **52 frontend test PASS**; không thay logic sản phẩm/test. Không đưa ba thư mục ngoài phạm vi vào index. Không push.

Docker dev bốn container đang chạy, `RUN_MIGRATIONS=false`, `app:create-admin` đã đăng ký. Chủ dự án tự nhập thông tin bằng `docker compose exec app php artisan app:create-admin`, không gửi mật khẩu qua chat. Chưa có bằng chứng Admin dev đã được tạo/đăng nhập; tiếp tục phần Hợp đồng độc lập, không tự tạo tài khoản hoặc dữ liệu demo.

Hợp đồng dùng task **LEASE** hiện có (CTR trong yêu cầu mới là cùng module). Tiếp tục danh sách/chi tiết và CRUD **nháp** theo DB09 §3.8, brief §8.1 và DB plan §14; chưa kích hoạt/thanh lý, dịch vụ thương lượng giá hoặc P4–P8. Không migration/seeder/dev writes. Chi tiết lát cắt và bằng chứng mới sẽ ghi §12.13.

**Checkpoint hoàn tất:** `ff5888a` nullable; `9151d49` Backend; `7756eaf` React; `f67fd9c` tài liệu. Ngay sau4commit chỉ còn3thư mục ngoài phạm vi untracked. Phần LEASE mới bên dưới đang làm, chưa được gộp vào checkpoint đã kiểm thử này. Không push.

### 12.13. LEASE-A / CTR — triển khai nháp độc lập

Spec/API/AC quản lý trong brief§24, không tạo Spec trùng. Không schema mới, không Group3dev/P4–P8. Quyền đã giao: Admin draftCRUD; Q5/Q6 tùy chọn ngoài phạm vi. Kích hoạt bị chặn P4/P5 và Q15, Q7 ở mốc này đã được giải quyết sau tại§12.15; không dùng blocker này dừng CRUDnháp.

| Task | Phạm vi | Trạng thái |
|---|---|---|
| LEASE-01a | Chọn lát cắt từ quyết định hiện hành, HTTP/AC brief§24 | Đã kiểm thử tài liệu và đối chiếu code |
| LEASE-02a | GET/list/detail, POST/PATCH/DELETE nháp, validation/Policy/transaction/tests | Đã kiểm thử: toànBackend963/7930, Pint192file PASS |
| LEASE-03a | Nối ADM11/12/13, reuse editroute, không mock/fakeactivation | Đã tích hợp DBtest: browser12/12, frontend58/build/lint PASS |
| LEASE-04a | Fullsuite + browser Nginx/DBtest, snapshotdev, bảnđồcode | Đã kiểm thử phạm vi nháp; dev metadata/dữ liệu cũ kiểm tra riêng bên dưới |

Ma trận kiểm thử trước chạy: anonymous401/nonAdmin403/lockedphiêncũ; listAND/literal/pagination; create nháp (NULLcode/unpaid/no sideeffects); PATCHpartial/merged dates/capacity; fieldcấmNULL/invalidtypes/JSONsafe; activeimmutable; softdelete/child409/404; API lỗi; browser wizard/loadoptions>20/createGET/F5/edit/delete/error/mobile; dev8080 chỉreadiness khi chưaAdmin. Testguard exactmysql_test/account và denieddev trước DBsuite; fixture browser chỉ sau suite. Không chạy suite đồng thời fixture để tránh RefreshDatabase can thiệp.

**Test tự động mới24/10:** toànBackend **963 test/7.930 assertion PASS**, Pint **192 file PASS**; frontend **58 test PASS**, build `DTAoQ2di` PASS, lint0lỗi/9cảnhbáocũ. Đã bỏ cảnh báo mới doRHFwatch bằng useWatch trước chốt build. Baseline867/6970+52 ở§12.12 là trướcLEASE, không dùng thay kiểm thử mới. Lượt Backend đầu5fail/956pass do testmới so remember_token khi lockedlogout; đã xác minh EnsureActiveAccount→Laravellogout xoaytoken, sửa test kiểm tra đúng tokenđổi+phiênsau401 và vẫn so mọi trường/bản ghi khác. Bổ sung2ca tenantđổiđiềukiện/FKstale409; không sửa sản phẩm/làm yếu kiểm tra quyền.

**Runtime đang chạy:** xác minh lại guard SQLtest/denieddev, setup5Auth +23rooms/44tenants/1building chỉDBtest saufullsuite. BrowserNginx8081 dùngDocument+asset200 từ127.0.0.1 đúngDTAoQ2di; APIlane riêngroom0/tenant0, browserroom22/tenant43. Không chạmAdmin/dev. Kết quả/cleanup/snapshot cuối ghi sau chạy; chưa coi ma trận dự kiến làPASS. `/admin/contracts/:id/terminate` vẫn là trangmockcũ có nhãn và không được dẫn từ3trangthật; nằm ngoài phạm viLEASE-A, không báo đãtíchhợpThanh lý.

**Runtime hoàn tất:** **12/12 browser PASS**, 0runtimeexception trênDTAoQ2di: anonymousguard401; đủ23phòng/44ngườithuê ngoài20dòngđầu; sai ngày/sứcchứa khôngPOST; lưu nháp201→GETthật/NULLcode/unpaid/giữroomrole; F5phiênvàđúngID/404khôngfallback; sửa nhápPATCH→GET; protectedNULL422/Guard403/cross-siteCSRF419; offlinelưukhôngthànhcônggiả/thửlại; PATCHđangbaychặnhủy/gửilặp; mobile390×667khôngtràn/bảngcuộn; hủyxóa/DELETE204→404; logout401. Lượt browser đầu chỉquaCTR01 rồi locator bước không tính số thứtự nên timeout; sửa locator test theo nav/nhãn thực tế, giữ report đầu và chạy lại cả12ca. Không sửa sản phẩm/giảmassert để qua test. Đã xem ảnh desktop/mobile.

**12/12 liveAPI PASS** riêng quaNginx8081:21POSTnháp, ANDfilter/phântrang20/1, Resourcean toàn, PATCHngàysaughép422/trườngcấmNULL422/CSRF419khôngđổi dữliệu, noteNULLthật/giữphiênAdmin, Guard403cả5endpoint, xóamềm204rồiGET/PATCH/DELETE404, giữroom/user. Logs/report/fixtures dưới `backups/checkpoint-ctr-20261024/` đãignore; source browserharness và fixturehelper được quản lý trong repo.

**Cleanup/dev:** guardSQLtest/denieddev kiểm tra lại trước cleanup. Dọn đúng22nháp của2lane (gồm nháp xóa mềm),44tenant/23room/1building và5Authusers/phiên của lượt; không resetDB. Đóng đúngChromeheadless/preview5175 và2container test, giữ4container dev/MySQLhealthy. Dev vẫn20bảng/16migration,4fileNhóm3pending, RUN_MIGRATIONS=false; các phần schema/index/FK/constraints/migrations/objects không đổi. Snapshot không khớp hoàn toàn: users tăng1→2 (Admin0→1), cache8→10/sessions13→16 và AUTO_INCREMENTusers thay đổi trong lúc kiểm thử. Root không tạoAdmin hoặc ghi nghiệp vụ dev; **chưa xác nhận nguồn tạoAdmin**, đã hỏi chủ dự án. Hash toàn bộ trường của tài khoản khách cũ khớp; các bảng dữ liệu khác không đổi. Không rollback/xóa tài khoản mới. TabIAB8080/login được mở để chủ dự án tựđăngnhập, không lấy credentials/giảphiên từDB; chưa nghiệm thuCRUDquảntrịdev.

**Bàn giao:** bản đồ code §11.21. Không còn blocker cho CRUDnháp. Phần kích hoạt/Thanh lý còn P4/P5/Q15 và gói P4–P8 chưa duyệt; Q7 đã được gỡ và dịch vụ nháp triển khai tiếp ở§12.15; không tự ALTER, migrateGroup3dev hoặc báo hoàn thành cảmodule. Tiếp theo xác minh Admin dev sau chủ dự án xác nhận/tựđăngnhập; tiếp tục nhánh đủ quyết định, chỉ hỏi đúng blocker còn thiếu. Checkpoint LEASE-A lưu riêng sau stagedmanifest/secrets/diffcheck; không push.

### 12.14. AUTH-14 — ưu tiên sửa đăng nhập Admin dev

Chủ dự án xác nhận đã tự tạo Admin bằng Artisan; không còn nghi vấn nguồn Admin tăng0→1 ở§12.13. Đăng nhập email/SĐT trên8080 nhận422 `errors.identifier`, csrf204/me401. Tạm ưu tiên lỗi này, giữ nguyên code và bằng chứng LEASE-A (`3a1521a`); không migration hoặc thay đổi tài khoản dev bởi agent.

| Task | Phạm vi | Trạng thái |
|---|---|---|
| AUTH-14a | Đối chiếu React/Request/Service, CLI/FPM/DB/log và tái hiện thật | Đã kiểm thử: cùngDB/server/account/Adminactive; Nginx422; tái hiệnTTY và regression trước sửa |
| AUTH-14b | Sửa nhập ẩn; regression create→login email/SĐT, chuẩn bị reset tương tác | Đã kiểm thử:36test/1147assertion/Pint197file; TTY sau sửa PASS; chưa đổi Admindev |
| AUTH-14c | Chủ dự án khôi phục mật khẩu rồi kiểm thử8080/session | Đã tích hợp: chủ dự án tự reset/login thành công; agent xác minh Admin dev, GET/me200, đọc trang quản trị và F5, kể cả sau nâng PHP; §12.15 |

**Nguyên nhân đã xác minh:** `CreateAdminCommand::askHiddenPassword` cũ đặt hidden=true/trimmable=false và trả thẳng giá trị. Symfony `QuestionHelper::getHiddenResponse`/`doReadInput` phiên bản hiện tại giữ LF Enter. Hash của `p+LF` không khớp `p` từ inputpassword HTML. `AuthService::login` dòng64 phát sinh đúng422 khi `attemptWhen` trảfalse. Không do role/status/emailverification; Adminunverified vẫn login được trong regression. React gửi đúng identifier/password, không trim password; CLI/FPM cùngmysql/mini_apartment/mini_apartment@%,cùngserverUUID/provider/bcrypt, config khôngcache, RUN_MIGRATIONS=false. LogsNginx có422, không lỗiLaravel500 tương ứng.

**Bằng chứng trước/sau:** TTY thật trênDBtest trong transactionrollback: trước plain=false/LFsuffix=true/CRLF=false; sau plain=true/LFsuffix=false/CRLF=false. Regression đầu4ca280assertion dùng câu hỏi mô phỏng không cóEnter đềuPASS, chưa chứng minhTTY. Khi thêmLF/CRLF, trước sửa **8fail/5pass**, lỗiđúng200mongđợi/422thực tế. Sau sửa **36PASS/1147assertion**:6ca bộđọcthật,16ca tạoAdmin/HTTP/legacyLF,14careset (hủy/invalid/quyền/khônginteractive/phiêncũ). Bcrypt72byte/Unicode/khoảngtrắng/kýtựshell/email/+84/84/0 đều kiểm tra. Không thêmLF vào AuthService hoặc tự sửa hash cũ.

**Sửa:** HiddenPasswordInput dùng chung, CreateAdminCommand gọi helper; ResetAdminPasswordCommand nhậpẩn/confirmNo/hashcast/rowlock/khôngđổiđịnhdanh hay quyền;3filetest mới. Script chẩn đoán tạm ban đầu cũng dùng bộđọccũ nên KHOP gây hiểu nhầm; đã sửa và giải thích, scriptmới chỉ trảboolean/ENTER_BUG_CONFIRMED, khôngin/lưu mật khẩu/hash. Không publicdebugroute; so sánhFPM qua FastCGI socketnộibộ bằng scriptchỉđọc.

**Phạm vi kiểm tra:**36ca mới dùng DatabaseTransactions trênmysql_test đãguard SQLidentity/denieddev; unit khôngDB. Không chạy fullsuite vì RefreshDatabase/schema tests có thể tự gọi migration trong khi chủ dự án cấm lượt này.963/7930 là fullsuite lịch sử trướcbugfix, không cộng số để báo fullsuite mới. Frontend không sửa, build/lintPASS0lỗi9cảnhbáocũ; Pint197filePASS. Artifactdưới backups/admin-login-20261024 đãignore, khôngcredentials/hashthật. Devsnapshot sauregression: users vàschema/index/FK/migrationskhớp saumốcAdminđượctạo;20bảng/16migration,Nhóm3pending. Chưa commit/push trong lượt sửa lỗi này.

**Mốc trước khôi phục (lịch sử, kết quả mới ở§12.15):** đã được chủ dự án đồng ý tự chạy `docker compose exec app php artisan app:reset-admin-password`, nhập mớiẩn2lần vàconfirm. Agent không chạyresetdev/không biếtmật khẩu. Sau đó chủ dự án tựlogin tab8080; cần ghi bằng chứngHTTP200, /me200/roleAdmin/F5 và quyền thực tế trước nghiệm thu AUTH-14c. Không đánh dấu login8080 đãsửa xong chỉ từ regressionDBtest.

### 12.15. Full MVP — Admin dev, PHP runtime và LEASE-B / CTR dịch vụ nháp (24/10)

**AUTH-14c hoàn tất:** chủ dự án xác nhận tự reset và đăng nhập thành công; agent đã quan sát phiên Admin trong tab8080. Đã đọc Tòa nhà (1 bản ghi), Phòng/Tiện nghi/Dịch vụ/Hợp đồng (rỗng thật), Bảng giá và hồ sơ Admin; GET/me và các API này200. F5 giữ phiên, kể cả sau thay container app. Hồ sơ Admin không có nút khóa. Chỉ kiểm thử đọc trên dev, không tuyên bố đã thử CRUD dev. Dashboard vẫn mock có nhãn; không sửa sidebar. Bảng giá báo thiếu dịch vụ hệ thống đúng thực trạng; chưa seeder dev.

**BASE-04 — đã kiểm thử và áp dụng bản vá Docker:** trước8.3.35, sau8.3.36 trong CLI, cấu hình FPM và GET `/api/v1/health` qua Nginx. Pin Dockerfile8.3.36, `session.upload_progress.enabled=Off` trước phân tích request theo [PHP21/10](https://www.php.net/archive/2026.php#2026-10-21-5) và [bổ sung23/10](https://www.php.net/archive/2026.php). Build image trước; xác minh extensions bcmath/pdo_mysql/intl/zip/opcache rồi chỉ recreateapp `--no-deps --no-build`, nạp lạiNginx. RUN_MIGRATIONS=false trước/sau; đổi mặc định Compose và .env.example thànhfalse, không migration khi khởi động. MySQL không thay container/volume. PHP Laragon host8.3.30 chưa vá và không dùng phục vụ8080; không sửa cài đặt ngoài workspace. Không coi bản vá Docker là đã vá cả Laragon.

**Checkpoint đã kiểm tra/lưu:** 5checkpoint trước có thật tới3a1521a. Bản vá Artisan `8bab41e` (7file) và runtime `dc027eb` (4file) đã localcommit sau staged diff/check/secrets; không push. Không stage `.env`, backups/debug, build/dependencies/log hoặc ba thư mục chưa rõ nguồn `.claude/`, `public-ui-concept/`, `ui-antigravity-full/`. Tài liệu/chức năng CTR mới chỉ checkpoint khi đủ bằng chứng cuối.

| Task | Phạm vi | Trạng thái/bằng chứng mới |
|---|---|---|
| LEASE-01b | Đồng bộ Q7=giá danh mục snapshot, Spec/HTTP/AC tại brief§25 | Đã xác nhận DB-D59 trực tiếp; không mở giá thương lượng, không P4–P8 |
| LEASE-02b | PUT dịch vụ nháp; chi tiết đọc snapshot; đồng bộ ngày bắt đầu nháp | Đã kiểm thử:115ca CTR liên quan; fullcuối1038test/9348assertion trên PHP8.3.36, Pint201file PASS |
| LEASE-03b | Panel ADM-13, RHF/Zod, API thật, đầy đủ trang danh mục, lỗi/pending | Đã tích hợp DBtest:60frontend/build/lint0lỗi9cảnhbáocũ;12tình huống CUA +10ca liveAPI quaNginx8082 đã kiểm chứng |
| LEASE-04b | Nginx/browser DB test riêng, dọn fixture, snapshot dev, học tập | Đã tích hợp trên DBtest:12tìnhhuốngCUA +10liveAPI và3hồi quyUI mãcuối; cả2lượtfixture đã dọn, snapshotdev chỉsessions đổi |

**Phạm vi code:** PUT `/api/v1/contracts/{contract}/services` chỉ sửa dịch vụ định kỳ nháp; server lấy giá, giữ snapshot của dòng còn chọn, không nhận giá/ngày/status; per_room1, per_person/per_unit nguyên dương. Gỡ/lưu rồi thêm lại mới chụp giá mới. Điện/Nước chỉ tự thêm khi kích hoạt. Dịch vụ active/terminated chỉ đọc, giá đã lưu không theo giá danh mục hiện tại. Transaction/khóa theo thứ tự; input sai hoặc lỗiSQL không ghi một phần. Xóa nháp còn con vẫn409 theo baseline, không tự xóa lịch sử. Không tạo/sửa schema hoặc chạy Group3dev.

**Phân biệt lần chạy:**999/9077full +58frontend là kiểm tra checkpoint đầu lượt;1018/9248full +60frontend là sau LEASE-B và nâng PHP.963/7930,36/1147 và browser12+12 ở§12.13–14 là lịch sử, không tính lại như test mới. Test lần đầu LEASE-B có2lỗi fixture: so Model chưa refresh với đầy đủ cộtDB, và `update(status)` bị fillable chặn nên chưa thực sự khóaActor; sửa chuẩn bị test bằngfresh vàgánstatus/save, giữ nguyên assertion/quy tắc. Lần kế115/1131PASS. Artifact chỉ ở `backups/sprint-20261024/` đãignore.

**Dev trước/sau runtime:**20bảng/16migration,4fileNhóm3pending; schema/tables/columns/indexes/constraints/FK/delete_rules/migrations/objects/CREATE TABLE khớp; checksum toàn bộ dữ liệu nghiệp vụ vàusers khớp, chỉsessions đổi theo phiên thật. Không reset/createAdmin/ghi nghiệp vụ/seeder/migration dev. Đối chiếu cuối sau browser sẽ ghi tại đây.

**Blocker thực sự:** Q7 đã gỡ; không ghi Q7 là chặn dịch vụ nữa. Kích hoạt vẫn cần P4/P5 để lưu điều khoản/điều kiện bắt buộc và Q15 về ghi nhận cọc/điều kiện kích hoạt. P4–P8 chưa duyệt, Group3dev chưa duyệt; không làm kích hoạt thiếu điều khoản hoặc giả cọc. Thay dịch vụ active theo tháng sau là task riêng chưa hoàn thành, không được suy từ dịch vụ nháp. Nhánh khác độc lập không bị chặn bởi Thanh lý.

**Browser mới —12 tình huống đã kiểm chứng bằng CUA/DOM**, không phải harness tự động: login fixture/đủ22lựa chọn từ23dịchvụ (1inactive); per_room1/per_persongợiý2; quantity0báolỗi; lưu3dòng/F5; sửaquantitygiữsnapshot123456 khi danhmụcđổi234567; pendingkhóaLưu/Hủy/Tảilại; mobile390×667 khôngtràntrang/bảng640cuộntrong301px; lỗi mạng khôngbáolưu vàretrythànhcông; gỡhết rồi chọnlại chụp234567; activechỉđọc/giữdònginactive; 404khôngfallback; mởURLAPItrực tiếp401JSON sauvá bên dưới. Đã xem ảnhmobile, không thấy consoleerror sau kiểm tra. Một chờselector thôngbáolưu hết hạn trướcphảnhồi; DOM sau đó xácnhận đãlưu thật. Locator login phân biệt chữ hoa/thường đã chỉnh cách chọn đúng label/AX; không sửa sản phẩm cho qua. Frontend dùng bản build preview qua Nginx8082/PHP8.3.36, không phải8080; artifact/ảnh ignored ở backups/sprint-20261024.

**Live API10/10PASS** trêncùngNginx/DBtest, cookie+CSRFthật: anonymous401; guardGET403/PUT403; AdminGET200; giảgiá422; thiếuCSRF419; activePUT409; missing404; logout204→401. Snapshotdòngdịchvụ khôngđổi sau requestâm. Lầnđầu GuardPUT thiếuXSRF nên419; sửa dữliệurequesttest để kiểm tra quyền bằngCSRFhợplệ, giữca419riêng rồi chạy lại10ca. Không nớiCSRF/phânquyền.

**AUTH-15 — lỗi kỹ thuật tìm thấy khi nghiệm thu, đã sửa và tái hiện:** browser mở trực tiếpAPI vớiAcceptHTML/khôngOrigin nhận500. Laravel `ApplicationBuilder` mặc định callback `route('login')`, dự án React không có routeLaravel mang tênlogin; `Authenticate::unauthenticated` gọi callback trước rendererJSON. `bootstrap/app.php` đặt `redirectGuestsTo('/login')` để dùng URLReact; api/* vẫn rendererJSON401, không redirect hoặc nớiAuth. `ApiUnauthenticatedResponseTest`20ca (5route×4Accept): trước15fail/5pass; sau20PASS/100assertion. Browserreload cùngURL trảJSON401. Fullsuite sau vá đã chạy:1038test/9348assertion/Pint201file PASS. Không lấy full1018 trước vá làm bằng chứng của callback mới.

**Cleanup:** TestCaseguard + SQLidentitymini_apartment_test@% và denieddev kiểmtralạitrướcsetup/cleanup. Dọn đúng3user/2room/1building/2contract/23service và các dòng/phiênfixture, không resetDB; dừng2container8082 vàPIDpreview đãxácminh, giữ4containerdev. FixtureCLItrong tests/Support cóguard vàmãlượt, không endpointdebug/seederdev. Không mật khẩu/cookie/hashthật trongGit. Sidebar không đổi.

**Chốt lượt:** full cuối **1038test/9348assertion, Pint201file PASS**; frontend **60test/build PASS, lint0lỗi/9cảnhbáocũ**. Các lượt frontend ban đầu có thêm1cảnhbáorefs tại callbackRHF (tổng10, không phải9); đã sửa cách đặt cờ chốnggửilặp vào hàmsựkiện `submit(event)` và chạy lại tests/build/lint, không tắt rule. Bộ12tìnhhuốngbrowser/lượtchính +10liveAPI ởtrên; trênbundlecuối chạy thêm3hồi quy quan trọng: invalid0/khôngghi, pendingkhóa3nút→quantity3lưuthật, F5đúngquantity3/giásnapshot. CUAcheckcheckbox có lần báo chậm trong khi DOM sau đó cho thấy đãcheckedđúng; không sửa sản phẩm để xử lý sai thời điểm đọc trạng thái. Hồi quy cuối dùng fixture mãlượt mới, đã dọn đúng và dừngtest/preview lần2; không gộp các lượt thành một bộ tự động15ca.

**Git cuối:** `8bab41e` váEnter/resetAdmin; `dc027eb` PHP8.3.36/cấu hìnhmigrationfalse; `df59765` APIkhách401JSON; `503d38c` dịch vụnháp+SpecQ7+tests (15file). Tất cả local, không push. Tài liệu bàn giao cập nhật riêng sau đó; chỉ các file chính thức có nguồn rõ ràng được checkpoint. `.claude/`, `public-ui-concept/`, `ui-antigravity-full/` vẫn không stage/commit vì chưa xác minh phạm vi.

**Tiếp theo:** CTR kích hoạt cần đúng P4/P5 và Q15 (không phải Q7 nữa); Thanh lý/P4–P8 và Group3dev vẫn chưa được duyệt. Có thể tiếp tục nhánh Phòng công khai độc lập theo Plan/brief§7.1, tách phần ảnh/upload phụ thuộc FILE; không sửa sidebar trong giai đoạn này. Không tự coi việc duyệt Q7 là duyệt thu cọc, điều khoản phí, migrationdev hoặc seeder hệ thống.

### 12.16. ROOM-PUB và phân công Antigravity / Codex (24/10)

Chủ dự án xác nhận Antigravity hiện không chạy/chỉnh code. Git thực tế có đúng1worktree tại repository, frontend/ là bản chính thức; public-ui-concept/, ui-antigravity-full/ và .claude/ đang untracked, chưa xác minh là gói bàn giao nên không nhập/stage. Không suy nguồn giao diện chỉ từ tên thư mục. Khi Antigravity hoạt động lại: worktree/branch/Git index riêng, chốt file phụ trách trước; file giao nhau phải bàn giao tuần tự. Hiện Codex phụ trách backend/routes/api.php, các lớp PublicRoom mới, RoomPolicy, test và tài liệu; chưa sửa trang React. Không tạo màn hình lớn hay API giả để thay phần thiết kế còn thiếu.

| Task | Phạm vi / AC | Trạng thái |
|---|---|---|
| ROOM-PUB-01 | Contract HTTP tại brief§26; DB-D60 loại tiện nghi archived khỏi Public; giữ Admin/pivot | Đã xác nhận quyết định; contract đã viết |
| ROOM-PUB-02 | 3 GET công khai list/detail/filter-options, validation/Policy/Resource, tests theo§26 | Đang làm |
| ROOM-PUB-03 | Tích hợp PUB-02/03 hiện có, dữ liệu thật, giữ Antigravity; không ảnh/đặt lịch thành công giả | Chưa làm; Backend làm trước, không chờ Antigravity |
| ROOM-PUB-04 | Live API qua Nginx, snapshot dev, cập nhật học tập/checkpoint chọn lọc | Chưa làm |

Không thay schema/devdata; RUN_MIGRATIONS=false đã kiểm tra Docker, PHP8.3.36. Full1038/9348 và frontend60 ở§12.15 là lịch sử, chưa coi là lần kiểm thử của ROOM-PUB. CTR kích hoạt vẫn chỉ bị chặn ở P4/P5/Q15, không chặn Phòng công khai. Không duyệt Group3dev/P4–P8/seeder.

### 12.17. Full MVP tiếp tục / Git an toàn — 27/10/2026

Chủ dự án cho phép tự LOCAL COMMIT phần tiếp quản/triển khai đã kiểm tra; không push, reset, rebase hoặc xóa nhánh. Đầu lượt: `main` tại `a962937`, một worktree; ROOM-PUB backend/tài liệu đang sửa dở. Chủ dự án xác nhận tiếp quản và commit sau kiểm tra. Bản sao/hash baseline ở `backups/full-mvp-20261027/baseline/` (ignored). Không stage `.claude/`, `public-ui-concept/`, toàn bộ prototype, secrets hoặc artifact. Ba agent kiểm kê chỉ đọc đã kết thúc; triển khai tuần tự tại checkout hiện có, không có builder ghi cùng file.

Nguồn giao diện đã xác nhận: `ui-antigravity-full/`; tích hợp chọn lọc vào `frontend/`, giữ layout, font, sky/teal và kiểu card/filter Antigravity. Không nhập router hoặc mock đè API. Trang chủ cũng chuyển phòng/tòa sang API vì dùng chung RoomCard; bỏ những khối dịch vụ/tòa/ảnh/cam kết mẫu chưa có nguồn thật. `/book` và `/rooms/:id/book` giữ route nhưng thông báo chưa tiếp nhận lịch. Contact vẫn mô phỏng có nhãn; chưa tuyên bố hoàn thành Contact/VIEW.

| Task | Phạm vi / tiêu chí nghiệm thu | Trạng thái |
|---|---|---|
| ROOM-PUB-02 | Ba GET công khai theo brief§26, validation, Policy, Resource an toàn, truy vấn không N+1 | Đã tích hợp trên DB test |
| ROOM-PUB-03 | List/detail/home đọc API; nhiều tiện nghi, URL/F5/Back, phân trang; loading/empty/error/retry; không ảnh/cọc/dịch vụ/lịch hẹn giả | Đã tích hợp trên DB test; giới hạn kiểm tra bên dưới |
| ROOM-PUB-04 | Live API/browser DB test riêng, dọn đúng fixture, snapshot dev, code map, checkpoint chọn lọc | Đã kiểm thử; đang tạo local checkpoint |
| LEASE-05 | P4/P5-B (DB-D61): migration ALTER mới, Enum/casts, Money multiply; test snapshot/NULL legacy/FK/rollback | Đã duyệt chỉ DB test; chưa làm |
| LEASE-06 | Bộ tính phí độc lập theo snapshot: đúng hạn 0, trước hạn none/fixed/multiple, miễn toàn bộ hợp lệ | Chưa làm; sau LEASE-05; chưa mở thanh lý |
| LEASE-07 | Điều kiện thực nhận đủ cọc trước kích hoạt (DB-D62) | Đã chốt nghiệp vụ; API/luồng chưa tích hợp |

**Kiểm tra tự động mới:** full backend **1091 test / 9563 assertion PASS**, public riêng 53/215; Pint **208 file PASS**. Frontend **68 test / build PASS**, lint 0 lỗi / 9 cảnh báo cũ. Bản build hiện có JS 809.14 KB, gzip 226.79 KB; chưa tối ưu code splitting (tách gói tải theo trang), không gọi việc bỏ nội dung mock là tối ưu tương đương. Kết quả 1038/9348 và 60 frontend tại§12.15 là lịch sử.

**Môi trường:** Docker ban đầu tắt; khởi động daemon và đúng hai container MySQL/PHP đã có, kiểm tra RUN_MIGRATIONS=false. PHP8.3.36; guard7/7 và TestEnvironment6/14 PASS, tài khoản `mini_apartment_test` bị cấm đọc dev. Fullsuite kết thúc trước khi tạo fixture browser; không chạy migration/test schema trong lúc fixture tồn tại. App/Nginx nghiệm thu riêng ở8082 trỏ mysql_test, entrypoint không migrate.

**Live API:** root chạy 15/15 PASS: list/detail/options, occupied/private/missing/abc404, wildcard literal, reversed/forbidden/sort422, archived rỗng, Admin401, trang vượt cuối và POST public405. Agent HTTP xác minh thêm 4 ca lọc AND/biên/sort; không cộng ca trùng thành19. Một số batch agent bị giới hạn socket/output nên chỉ báo những kết quả thực nhận; root chạy riêng để bổ sung bằng chứng. Model QA `gpt-6-luna` do chủ dự án chọn, cấu hình tại TEST_MATRIX.md.

**CUA (thao tác trình duyệt thực, không phải automated suite):** list20 + trang2 còn1/Back; chọn2tiện nghi/F5; invalid range lỗi tại ô và không đổi URL; sort giá giảm PUB21 đầu; detail cọc1.5triệu/union2tiện nghi/không ảnh giả; private404; `/book` không form tạo lịch giả; footer dưới3triệu rỗng; home4phòng + quick search canonical; mobile390×667 không tràn ngang; dừng riêng PHP test gây lỗi API, mở lại và retry hai khu vực thành công. Console detail không error/warn; lỗi502 khi chủ động dừng app là dự kiến. Có lần selector hết hạn trước response, sau đọc DOM xác nhận kết quả; không sửa sản phẩm để né kiểm tra. Public API có timeout15giây để không chờ vô hạn. Race phản hồi đảo thứ tự chưa giả lập trên browser: đã kiểm tra AbortController + request key bằng code và kiểm tra khôi phục URL bằng Node.

**Lỗi tìm và sửa:** ContactPage còn link `buildingId`; đổi link hiện tại sang `building_id`, giữ alias `buildingId`/`keyword` cho URL cũ ở React, chỉ gửi canonical sang API, có test hồi quy. Header/footer bỏ hotline và danh mục mẫu, sửa link lọc giá đúng contract. Không tạo featured hoặc dịch vụ/ảnh giả.

**Bảo toàn:** snapshot dev trước/sau khớp toàn bộ metadata/schema/index/FK/migrations/hash dữ liệu mọi bảng, **20 bảng /16 migration**. Fixture23phòng/1tòa/3tiện nghi đã dọn đúng mã lượt, không reset DB; hai container test đã dừng. Không ghi nghiệp vụ, seeder hoặc migration dev. Ảnh mobile ở `backups/full-mvp-20261027/public-room-mobile.png` (ignored).

**Các chặn còn thực:** Group3dev và mọi migration dev chưa duyệt; P3/P6/P7/P8/P9/P11 chưa chốt cho thanh lý; cấu trúc giá theo tòa và nơi lưu yêu cầu chỉ số/ảnh cần đề xuất/duyệt; chưa có Sandbox nhà cung cấp thanh toán. P4/P5-B/Q15 đã được chốt DB-D61/62, không tiếp tục báo chưa duyệt; chưa đồng nghĩa kích hoạt/thanh lý đã code. Các module độc lập tiếp tục triển khai.

### 12.18. LEASE-05/06/07 — nền tảng điều khoản và điều kiện cọc (27/10)

ROOM-PUB đã checkpoint `bcb08a4` — `feat(rooms): tích hợp phòng công khai bằng API thật`; chỉ ba thư mục ngoài phạm vi còn untracked. Tiếp tục theo DB-D61/62, không hỏi lại phê duyệt.

| Task | Kết quả | Mức bằng chứng |
|---|---|---|
| LEASE-05 | ALTER mới thêm8cộtnullable, Enum/casts và quan hệ người xác nhận; bản nháp lưu snapshot bằng ContractTermsService | Đã kiểm thử trên DB test; dữ liệu cũ giữ nguyên, NULL không tự thành phí; up/down/FK RESTRICT và baseline schema được kiểm tra |
| LEASE-06 | Bộ tính phí độc lập đọc snapshot: none/fixed/rent_multiple, HALF_UP, miễn toàn bộ khi đúng điều kiện + có xác nhận/thời điểm/căn cứ | Đã kiểm thử tự động; chưa có HTTP/UI xác nhận miễn hoặc thanh lý, chưa phát hành hóa đơn final |
| LEASE-07 | assertSignedTermsAndDeposit: điều khoản phải rõ; cọc>0 phải held + deposit_paid_at, cọc0 không cần thu | Đã kiểm thử điều kiện, xác minh không ghi invoices/payments; chưa có API nhận cọc hoặc transaction kích hoạt |

Model không mở mass assignment cho điều khoản/xác nhận. Service dùng Policy Admin, khóa lại hợp đồng và chỉ sửa draft; hợp đồng active không đổi snapshot. API nháp hiện hành vẫn từ chối tất cả các trường này; không đổi route/JSON/phân quyền đã có. Loại phí rỗng/whitespace được chuẩn hóa NULL cho nháp, không gây ValueError và không mặc định none/1tháng; trước kích hoạt vẫn phải chọn rõ. Bộ tính không đóng hợp đồng hoặc cấp quyền thanh lý: same_day còn bị chặn ở P9; quá hạn chỉ trả0 cho **phí trước hạn**, không suy đã có quy trình đóng quá hạn. Xác nhận miễn thực tế/ảnh P8 chưa triển khai.

**Kiểm thử cuối mã này:** toàn bộ backend **1168 test /9784 assertion PASS**, Pint **218 file PASS**. Lượt1167/9778 là trung gian trước ca blank cuối; không cộng các lượt hoặc coi kết quả đó là mã cuối. Frontend độc lập đang làm Settings đã71test/build/lint0lỗi9cảnhbáocũ; không có thay đổi frontend trong commit nền tảng hợp đồng.

**Hồi quy được sửa đúng nguyên nhân:** 19ca ban đầu chụp Model vừa create thiếu cột NULL/default rồi so với fresh đầy đủ; sửa baseline đọc DB trước và giữ assert toàn bản ghi. Ba test OptionalUserEmailMigrationTest cũ dùng rollback --step1, sai sau khi có migration mới; chuyển sang đúng batch/path của migration email, giữ mọi kiểm tra dữ liệu/NULL/UNIQUE và bổ sung lịch sử migration khác phải nguyên vẹn. Không sửa migration đã commit, không bỏ test hoặc giảm yêu cầu. DB errors trong TermsService rollback và chỉ report thông điệp chung, không SQL/bindings/nội dung điều khoản.

**U1 mới được duyệt DB-D63:** chuẩn bị/test giá theo tòa, giữ lịch sử; file pending và hai test mới cũng nằm trong fullsuite trên. U2/U3 chưa được trả lời riêng, không tự duyệt bảng22 hoặc thay monthly/final. Mọi migration dev vẫn chưa được phép; cấu trúc test có P4 không có nghĩa dev đã có. CAT-03c màn Cài đặt đang nghiệm thu trên fixture riêng sau khi fullsuite kết thúc.

### 12.19. U1 — bản chuẩn bị migration giá theo tòa (27/10)

Checkpoint nền tảng hợp đồng: `5167cd5` — `feat(contracts): chuẩn bị snapshot điều khoản và điều kiện cọc`. U1-01 (migration pending) và U1-02 (kiểm thử giữ lịch sử/khôi phục) **Đã kiểm thử trên DB test**, đúng phạm vi DB-D63; chưa tích hợp API/màn giá theo tòa, chưa chạy dev.

`backend/database/migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php` nằm ngoài tập migrate mặc định. Bản up thêm FKbuilding RESTRICT và UNIQUE tòa/dịch vụ/ngày; giữ original ID trên tòa đầu theo ID tăng và sao chép nguyên giá/ngày/timestamps cho các tòa khác. Không có tòa mà đã có giá thì chặn trước DDL; tòa mới không nhận giá cũ. Down chỉ gộp những bản sao đồng nhất phủ đủ tập tòa hiện có, chặn giá phân kỳ/tòa mới trước khi ghi; không tự xóa lịch sử riêng để rollback. Không sửa hóa đơn đã phát hành.

**Kiểm tra:** hai test U1 mới có kiểm tra copy lịch sử, UNIQUE, tòa mới không có giá, hóa đơn issued không đổi, down/up giữ ID/dữ liệu, từ chối rollback khác giá và orphan mapping. Bộ liên quan **21test/87assertion PASS** gồm cả19ca hồi quy schema/email; full mã cuối **1168/9784**, Pint218 PASS. Default migrate không tự áp dụng U1 được assert ngay trong setUp; cuối test trả schema utility_prices về baseline global để các API hiện có tiếp tục tương thích.

**Lỗi tìm khi diễn tập:** MySQL1553 cho thấy UNIQUE cũ còn hỗ trợ FKservice_id. Thêm indexservice trước khi bỏ UNIQUE; khi down, khôi phục UNIQUE global trước khi bỏ index mới. Một bản sửa trung gian đặt lại UNIQUE nhầm trong up, test tiếp tục chặn; đã sửa đúng vị trí và chạy lại thành công. Trạng thái ALTER dở trên **bảng test rỗng** được đọc metadata, xác minh rồi khôi phục đúng cột/index liên quan, không dùng reset để che lỗi. Test finally không thử down mù khi up chưa hoàn tất. DDL MySQL tự commit: khi triển khai thật sau này phải có cửa sổ ngừng ghi, backup/restore/pretend và kiểm tra trạng thái từng bước; không suy quyền chạy dev từ commit này.

### 12.20. CAT-03c — ADM-23 Cài đặt dùng API thật (27/10)

U1 đã checkpoint `2999554` — `feat(utilities): chuẩn bị migration giá điện nước theo tòa`. CAT-03c **Đã tích hợp trên DB test** theo brief§18/27: sáu khóa hệ thống/ngân hàng chỉ đọc, hai form ngày độc lập, không giả ngân hàng/QR hoặc mặc định cấu hình. Route React nằm dưới guard Admin; backend/API/schema giữ nguyên. Sidebar mở Cài đặt và bỏ badge tài chính/sửa chữa lấy từ mock. Chỉ tích hợp chọn lọc phong cách Antigravity vào frontend chính thức.

**Tự động:** frontend **71 test PASS**, build PASS; lint **0 lỗi/9 cảnh báo cũ**. Bundle trước tối ưu: JS815.23KB/gzip228.14KB, CSS63.79KB. Backend không đổi trong nhóm này; full **1168/9784**, Pint218 ở§12.18 là kết quả mã backend hiện tại đã chạy trước khi tạo fixture, không chạy lại sau đó. Ba agent QA Luna kiểm tra nguồn độc lập không xác nhận lỗi mới; root trực tiếp chạy HTTP và browser.

**Live API:** 11 nhóm ca PASS trên Nginx8082/cookie+CSRF thật: guest401; bốn vai trò khác GET403/PUT403; Admin GET200 đúng allowlist; 0/366 và trường giả422; khóa chỉ đọc404; thiếu CSRF419. Không có valid PUT từ script API; hai lần lưu hợp lệ thực hiện bằng UI. Không cộng nhóm ca thành số request đơn lẻ.

**Thao tác CUA thực:** guest chuyển login; Admin đọc tám khóa thiếu, sáu ô chỉ đọc và hai input trống; 0 báo lỗi đúng ô; lưu365 và1 khóa form đang gửi, chỉ thông báo sau response; F5 giữ hai giá trị. Hết phiên Admin test rồi lưu10 trả401/chuyển login, không thành công giả; đăng nhập lại vẫn365/1. Giả lập GET settings503 trong Nginx **test**: hiển thị lỗi, không form/dữ liệu giả; khôi phục config Nginx và Thử lại lấy DB thật. Bảo vệ đăng nhập rồi mở URL quản trị bị từ chối. Mobile390×667 không tràn ngang (scrollWidth382), desktop1440×900 và Tab tới nút Lưu đã kiểm tra; console bình thường không error. Ảnh ignored tại `backups/full-mvp-20261027/settings-mobile.png` và `settings-saved.png`. Input thập phân/rỗng được kiểm tra bằng Node; không báo đã thao tác mọi input đó trên browser. Race gửi lặp được khóa bằng ref trong submit và trạng thái disabled; chưa giả lập response đảo thứ tự trên browser.

**Bảo toàn:** helper có SQL identity/guard mysql_test đã khôi phục hai khóa về trạng thái ban đầu, xác minh invoices/payments nguyên vẹn và dọn đúng năm tài khoản/phiên fixture; không reset DB. Docker đã dừng giữa hai lượt, chỉ mở lại container hiện có để hoàn tất quyền/cleanup; không chạy migration hoặc seeder dev. Snapshot dev trước/sau khớp toàn bộ metadata và hash dữ liệu:20 bảng/16 migration. Các thư mục `.claude/`, `public-ui-concept/`, `ui-antigravity-full/` tiếp tục giữ nguyên, không stage toàn bộ.

**Tiếp theo:** PERF-01 tách bundle theo route quản trị, giữ guard/URL/nguồn dữ liệu; đo dung lượng trước/sau và hồi quy browser. Không đồng nghĩa Dashboard/MTR/INV mock đã nối API. U2/U3 và các quyết định thanh lý còn mở, mọi migration dev vẫn chờ duyệt riêng.

### 12.21. PERF-01 — tách mã 18 trang quản trị (27/10)

Checkpoint CAT-03c `c129fbd` — `feat(settings): tích hợp cài đặt hệ thống bằng API thật`. PERF-01 **Đã code và kiểm thử** theo yêu cầu hiệu năng Full MVP: `app/adminPages.tsx` khai báo18 React.lazy ngoài component, chọn đúng named export; router giữ mọi path/thứ tự/guard. AdminLayout có Suspense tại Outlet, giữ sidebar/header khi tải trang. Guard phải cho render trước khi callback import chạy; server vẫn kiểm tra Policy như cũ. Không dependency, API, schema, cache tài chính hoặc dữ liệu nghiệp vụ mới.

**Đo build cùng môi trường:** trước một JS815.23KB/gzip228.14KB; sau entry604.06KB/gzip187.91KB + static dependency Button13.55KB/gzip5.36KB = **617.63KB/gzip193.27KB**, giảm **24.2%/15.3%**. Manifest được duyệt theo imports đệ quy, không chỉ lấy entry bỏ qua preload;18 page chunk tách riêng. CSS63.79KB/gzip11.00KB giữ nguyên. Main vẫn>500KB và cảnh báo Vite còn, không tăng ngưỡng để che. Đây là số artifact build; chưa đo thời gian tải/render trên mạng người dùng hoặc báo nhanh hơn24%. Nguồn hướng dẫn React lazy/Suspense trong TEST_MATRIX.md; đối chiếu React19.2.8 đang cài, không nâng phiên bản theo tài liệu mới hơn.

**Tự động mã cuối:** frontend **71 test PASS**, build PASS, lint **0 lỗi/9 cảnh báo cũ**. Lượt đầu thêm18 cảnh báo Fast Refresh do khai báo component trong router xuất object; đã chuyển wrapper sang adminPages.tsx chỉ xuất component và kiểm tra lại, không disable rule. Backend không đổi; **1168/9784/Pint218** là fullsuite backend hiện tại từ§12.18, không chạy schema tests khi fixture UI tồn tại. Agent Luna rà soát nguồn độc lập: mapping18/18, không vòng import, route/guard/Suspense và error fallback không có lỗi xác nhận được.

**Browser thực trên Nginx8082/DB test:** Home/Rooms rỗng thật; guest URL Admin về login; Admin login trở lại Settings; F5 đọc tám khóa thiếu đúng trạng thái đã khôi phục. Chuyển Settings→Buildings→Rooms→Contracts→Users→Dashboard→Settings thành công; log test xác nhận từng chunk/API quản trị200. Dashboard còn mock giữ nhãn. IDhợpđồng không có trả404/API và thông báo không tìm thấy, không lấy nháp mẫu. Không gán18 trang đã thao tác hết chỉ từ source/build; các route còn lại được rà soát mapping/named export, chưa chạy toàn bộ luồng nghiệp vụ.

**Lỗi đã tái hiện/sửa:** chặn riêng chunk Amenities bằng Nginx test503; RouteErrorPage cũ hiện raw English/error URL và không nút thử lại. Đổi thông báo tiếng Việt an toàn + nút reload, giữ nhánh404. Tái hiện lại cùng lỗi trên bản cuối: đúng alert/nút, không URL; khôi phục config test và bấm Tải lại mở Amenities/API thật, không alert. Không sửa cấu hình Nginx dev. Console có lỗi503/chunk do chủ động giả lập; không báo cả phiên giả lập là sạch lỗi. Ảnh Settings trên bản cuối ở `backups/full-mvp-20261027/settings-final.png` (ignored).

**Bàn giao:** U1 chỉ được duyệt chuẩn bị/test migration, chưa tự mở API theo tòa. U2/U3 được hỏi riêng; không tự duyệt thêm bảng22 hoặc bỏkind. Những quyết định thanh lý và migration dev vẫn giữ cổng riêng. Không tuyên bố hoàn thành Full MVP chỉ từ các module đã tích hợp. Hồi quy cuối: logout→mở Admin về login; Guard login→Admin bị từ chối. Đã dọn đúng năm tài khoản/phiên fixture, dừng hai container test/đóng tab tạm; snapshot dev khớp toàn bộ metadata/hash dữ liệu20 bảng/16 migration. Chủ dự án vừa duyệt U2 trên DB test; tiếp tục ở§12.22, không suy U3 hoặc migration dev được duyệt.

### 12.22. U2 — nền tảng yêu cầu chỉ số và tệp private (27/10)

PERF-01 checkpoint `e66c23f` — `perf(frontend): tải trang quản trị theo nhu cầu`. Chủ dự án duyệt U2 trên DB test (DB-D64); không migration dev. Checkpoint đã sạch trước sửa, chỉ ba thư mục ngoài phạm vi giữ nguyên.

| Task | Phạm vi/tiêu chí | Trạng thái |
|---|---|---|
| U2-01 | Hai migration pending: M19 attachments đúng baseline, bảng22 submissions đúng§19/DB-D64; FK/index/UNIQUE và rollback bảo vệ lịch sử | Đã kiểm thử DB test; chỉ diễn tập bằng đường dẫn tường minh, không migrate mặc định/dev |
| U2-02 | Enum/model/quan hệ/morph alias, không mass-assign người gửi/trạng thái/duyệt/path; Policy Admin/chủ yêu cầu; disk private không URL public | Đã kiểm thử nội bộ; chưa có upload/download API hoặc UI |
| U2-03 | Request/HTTP/upload, gửi/duyệt/từ chối, gọi nghiệp vụ MTR chính thức, tích hợp React | Chưa làm; không thay bằng ghi chỉ số giả; cần contract/API và chi tiết MTR/FILE đủ điều kiện |

U3 mô tả “chỉ số tháng/final”; mã enum hiện có **periodic/final**, không đổi thành monthly. Tạo cấu trúc pending/quyền đọc không phụ thuộc câu trả lời U3 và không tự phê duyệt mọi quy tắc khoảng tiêu thụ. Không gọi U2 đã hoàn thành toàn luồng từ test schema/model.

**Kiểm thử mã cuối:** full backend **1178 test/10014 assertion PASS**, Pint **227 file PASS**; frontend chạy lại **71 test/build PASS, lint0 lỗi/9 cảnh báo cũ**. Bộ U2 mục tiêu10test/230assertion PASS, gồm schema/index/sáuFK RESTRICT, pending slot/gửi lại sau rejected, UNIQUE approved reading, quan hệ/casts/mass assignment, Gate năm vai trò/guest/locked/sai chủ, lịch sử sau thanh lý và rollback bảo toàn metadata. Trạng thái approved/rejected được gán trực tiếp trong fixture để thử ràng buộc, **không** coi là service duyệt đã chạy. M19 không có SQL FK đa hình theo thiết kế. Không thêm CHECK/đổi migration cũ hoặc giá trị kind.

**Cô lập ảnh — lỗi tái hiện và sửa:** root private ban đầu cùng local. HTTP framework test tạo tệp UUID riêng: unsigned403 đúng, nhưng URL local có chữ ký200 khi mong404. Chuyển private sang storage/app/evidence, giữ local cũ storage/app/private; test sau sửa signed404/unsigned403, local/public không có tệp, không có route storage.private, xóa tệp trong finally. Nhận xét agent ban đầu cho rằng unsigned đọc được là sai vì framework cài đặt mặc định visibility=private; đã đọc nguồn ServeFile và sửa kết luận, không báo thành lỗ hổng unsigned. Rà soát Luna cuối không còn lỗi xác nhận được; không nhầm test HTTP framework với kiểm tra live download U2 chưa tồn tại.

**Bảo toàn và cleanup:** setUp xác nhận hai bảng chưa tồn tại rồi nhận quyền dọn DDL trước up, nên cả lỗi tạo dở được dọn có điều kiện; fixture transaction bắt đầu sau up, rollback trước down. Down từ chối bảng có lịch sử hoặc ảnh đa hình mồ côi. Cuối fullsuite đọc lại bằng SQL identity mysql_test: **0 bảng pending còn lại/0 tệp evidence fixture**. Snapshot dev cuối khớp toàn bộ metadata và hash dữ liệu so trước lượt: **20 bảng/16 migration**, RUN_MIGRATIONS=false; không migration/seeder/ghi nghiệp vụ dev. Hai container UI test đã dừng từ PERF-01. Không push hoặc stage ba thư mục ngoài phạm vi.

**Tiếp theo:** U2-03 phải có contract HTTP/AC gửi ảnh và gọi MTR thật; U3 vẫn chờ trả lời riêng, không tự đổi uniqueness chỉ số chính thức. U1 chỉ có migration chuẩn bị, chưa chuyển API giá theo tòa. Kích hoạt/cọc/thanh lý, các quyết định P còn mở và Sandbox thanh toán giữ đúng giới hạn hiện tại. Không dùng dữ liệu giả để lấp phần chưa hoạt động.

### 12.23. AG-UI — tích hợp đầy đủ nguồn Antigravity mới (27/10)

Yêu cầu trực tiếp mới của chủ dự án: đối chiếu toàn bộ5vai trò và chủ động tích hợp UI còn thiếu, giữ API/nghiệp vụ thật, local commit theo nhóm; không dừng ở kiểm kê. Phạm vi này cho phép đăng ký các route React/layout của5vai trò từ prototype; không nới Policy/backend, không tự thay các quyết định tài chính hoặc migration dev. Mở khu vực role thật thay trang tạm D02 theo yêu cầu mới; guard con tách Technician/Guard, URL cũ còn dùng được.

| Task | Phạm vi/AC | Trạng thái |
|---|---|---|
| AG-UI-01 | Kiểm kê52file nguồn, mapping/API/mock/gaps; Sidebar/font/theme/components/responsive/router | Đã đối chiếu nguồn, bảng SCREEN_INVENTORY§7–8;3agent chỉ đọc, visual đợt mới đang làm |
| AG-UI-02 | Layout trắng mới Admin/Resident/Staff; Auth thật, không demo/badge mẫu; role navigation/profile/403/404, mobile menu | Đã tích hợp layout/điều hướng; hồ sơ chỉ đọc me, nghiệp vụ hồ sơ còn một phần |
| AG-UI-03 | Các trang Admin đã cóAPI: khôi phục tabs/floor matrix/contract-room/services/catalog theo API thật, giữ formsRHF | Đã tích hợp sơ đồ đủ trang, hợp đồng theo phòng, tabs chi tiết và numbered settings; catalog/wizard/skin còn thiếu, chưa hoàn tất task |
| AG-UI-04 | Public visual parity theo nội dung có căn cứ; Contact/Booking/Appointments không dữ liệu mẫu/thành công giả | Contact/GuestProfile/header đã tích hợp phạm vi hiện có; Home thêm7khối/6phòng API. Dropdown tòa async đã kiểm lại Áp dụng/F5/clear. List/Detail/Booking/Appointments còn thiếu thiết kế nguồn; task chưa hoàn tất |
| AG-UI-05 | Những trang Admin/Resident/Staff chưa cóAPI: port cấu trúc/card/table/form/trạng thái rõ; không fallback người đầu/tiền mẫu/lưu giả | Đã có khung24màn, chưa port đủ thiết kế chuyên biệt/API; vẫn Một phần, không ghi module hoàn thành |
| AG-UI-06 | Browser đối chiếu prototype/chính thức desktop/mobile5vai trò; test/lint/build; kiểm kê sau/tổng hợp/commit | Đã kiểm tra nhóm layout/role và API đọc liên quan; chưa kiểm thử toàn bộ52luồng; chi tiết bên dưới |

Baseline main8b52ec5/một worktree, chỉ ba thư mục nguồn có sẵn untracked; checkpoint/hash ở backups/antigravity-integration-20261027 (ignored). frontend/ là bản chính thức; không copy đè source toàn bộ, không sửa prototype. Backend1178/10014/Pint227 và frontend71 là kết quả lịch sử trước đợtUI, không báo đã chạy lại. U3/các quyết định P/provider và dev migrations vẫn giữ giới hạn cũ; không dùng chúng để trì hoãn các phần UI/API độc lập đã đủ điều kiện.

**Bằng chứng đợt layout/API có sẵn:** frontend72test PASS, build PASS, lint0lỗi/8cảnh báo cũ; backend chạy lại1178test/10014assertion PASS và Pint227 PASS trước fixture. Cảnh báo mainchunk>500KB còn, không đổi ngưỡng. Ba agent QA Luna chỉ đọc đã kiểm tra guard/destination/focus, pagination/API và mapping52nguồn. Đề xuất coi /account/* là Guest-only được bác vì hai URL này chủ đích tương thích cho mọi tài khoản từ Auth trước; profile chỉ me, lịch chưa API. Báo cáo này không biến source review thành live verification.

**Live API test riêng:** đăng nhập/me/đăng xuất năm vai trò, hết phiên401; rooms/contracts/users/settings đều403 với bốn vai trò khôngAdmin và200 vớiAdmin. Rooms building_id trả đủ23dòng qua2trang; tạo một draftfixture bằng POST thật rồi GET contracts?room_id đúng1dòng; users?role=resident không lẫn role khác. Không kích hoạt/cọc/issuedinvoice/payment, không provider. Helper Auth/ContractBrowserFixtures chốt mysql_test cả cấu hình lẫn SQLidentity; không seed dùng chung/dev.

**Browser thực:** so Admin profile/Sidebar trắng với prototype desktop/mobile; thu gọn Sidebar desktop rồi mở mobile vẫn đủ nhãn. Drawer mở đặt focus nút Đóng, ShiftTab quay về linkcuối, Escape đóng/trảfocusMenu. Modal sửa tòa tương tự, không lưu thay đổi tòa. Sơ đồ mobile đọc đủ23phòng từ2trang API, tầng trống rõ; room contract mở đúngdraft/giá/ngày và linkdetail thật. Detailcontract tab dịch vụ giữ panel hiện có, chưa kiểm lại toàn bộ lưu dịch vụ. Residents search/clear giữ role=resident; API lọc đúng, chưa gọi đó là đã kiểm hết tạo/khóa tài khoản. Resident/Technician/Guard được mở hồ sơ/card và nav mới; saiURLAdmin và Guard/Technician từ chối đúng. Ảnh/nhật ký ignored tại backups/antigravity-integration-20261027. Các ca còn thiếu trong TEST_MATRIX vẫn cần thực hiện, không báo52màn đã nghiệm thu chỉ từ mapping52route.

**Môi trường test:** ban đầu dùng127.0.0.1 nhưng SESSION_DOMAIN=localhost khiến không giữ phiên khi F5; chuyển đúng hostlocalhost:8082, không sửa cấu hình dev/giảm bảo mật. Một chunkcũ lỗi sau khi build thay artifact giữa phiên; Tải lại trang lấy bản build mới và mởdetail bình thường, không nhầm đó là API nghiệp vụ đã hỏng. Một số locator dùng nhãn AX uppercase hoặc vai trò button của summary không khớp DOM; sửa locator theo snapshot, không sửa code để che lỗi test.

**Kiểm kê và bảo toàn:** SCREEN_INVENTORY§8 hiện đủ52dòng theo trạng thái mới,24API có phạm vi,4UIđủ/48một phần,0mock trên luồng chạy. Không có52màn hoàn chỉnh. Prototype78hash không đổi; snapshot dev so mốcU2 khớp toàn bộmetadata/hash dữ liệu20bảng/16migration; không migration/seeder/ghi nghiệp vụ dev. Chưa gọi UI khung hoặc thiếu API là hoàn thành Backend; các taskU1/U2/U3/CTR/INV/PAY vẫn theo Plan và quyết định hiện có.

Home nhóm tiếp theo trong AG-UI-04: `HomeInformationSections` port cấu trúc Antigravity§3–7 (lợi ích, phí, quy trình, tòa,CTA); Home giữ API/form hiện có,6phòng đầu theo source thay4card cũ. Tòa lấy options thật, linkbuilding_id; không dùng publicServices/bank/địa chỉ/ảnh/hotline mẫu. Đơn giá công khai và booking chưa API nên vẫn chưa nghiệm thu Home toàn luồng, không tăng số UIđủ4/52.

Lỗi phát hiện khi QA: reload giữ result/options cũ, không có trạng thái refreshing. Sửa clear cả hai trước refetch; Nginx TEST giả lập filters503: hero/showcase lỗi riêng, rooms vẫn21/6card; khôi phục nguyênbyte/hash cấu hình test vàreload, bấmThử lại → cả hai vùngloading, sau đóoptions/rooms hồi phục. Không sửa Nginx/dev hoặc coi lỗi giả lập là console sạch. Hero chọn tòa/ngân sách đi đúng /rooms?building_id=30&max_price=3499999, list21phòng/trang1/2. Khi kiểm tiếp phát hiện dropdown hiển thịTất cả dù URL giữbuilding_id; nguyên nhân selectuncontrolled thayoptiontạm sauoptionsasync. Chuyển riêng field sangControllerRHF, không đổi API/schema/logicquery; browser kiểm lại ởAG-T12. Home72test/build PASS, lint0lỗi8cảnhbáocũ sau sửa; không chạy lại backend/schema tests khi fixture public đang tồn tại.

**Chốt đợt27/10:** local commits1950d1a `feat(ui): tích hợp layout và điều hướng năm vai trò`;562bc67 `feat(rooms): thêm sơ đồ tầng và hợp đồng theo phòng`;eaf73d3 `fix(public): dùng dữ liệu thật và sửa header responsive`;7f66ad6 `feat(public): bổ sung các khối Trang chủ Antigravity`. Không push. Browser bản cuối: Cài đặt3khối/Desktop/Mobile/invalid0 đúng ô; Public768menu và1024nav không còn xuống dòng, menu đóng khi chuyểnContact. Registerrỗng hiện lỗi đúng ô;403/404/cardlinks đã kiểm. Chưa chạy lại mọi writeflow cũ hoặc validregister trong đợtUI này.

AG-T12 sau sửa: optionsloaded hiển thị PublicRooms đúngvalue30; Áp dụng giữbuilding_id vàgiá; F5vẫn30; chọnTấtcả xóabuilding_id nhưng giữgiá;Xóabộlọc xóahếtquery. AG-T11: Home7section và6phòng thật/tổng21, Hero/showcase liên kếtcanonical; Mobile390khôngtràn vàCTA/tòa sắp đúng; Desktop1440khối giá/quytrình giữskin nguồn. Không báo đã kiểm mọi tổ hợp filter/viewport hoặc mọi card dịch vụ; phí/ảnh/booking còn chưa API.

Cleanup: AuthBrowserFixtures đã dọn đúng5tài khoản/phiên của lượt; ContractBrowserFixtures dọn đúng44tenant/23room/1building và1draft liên quan; PublicRoomsBrowserFixtures dọn đúng23room/1building/3amenity +pivot vàfilefixture. Filecredentialcontainer do lượt này tạo đã xóa; không resetDB. Sau cleanup, browserHome trả0phòng/khôngtòa công khai/0cardfixture, vẫn7section. Không chạy thêm migration U2 thủ công trong lượt UI; fullsuite DB test trước fixture vẫn diễn tập và dọn schema theo quy tắc test. Nginx TEST đã khôi phục nguyênbyte/hash sau503 vàreload; snapshotdev cuối so mốcU2 khớp toàn bộmetadata/hash dữliệu20bảng/16migration. Prototype78file/hash không đổi;52cặpfile nguồn/chính thức đều tồn tại và thống kê24API/4UIđủ nhất quán. Giữ nguyên ba thư mục có sẵn .claude/,public-ui-concept/,ui-antigravity-full/ ngoài staging vì không thuộc code do lượt này triển khai.

**Tiếp tục theo Plan:** AG-UI-03/04/05 chưa hoàn tất: thay khung dùng chung bằng bố cục riêng từng màn, hoàn thiện List/Detail/Booking/Appointments và các trang Admin cóAPI, rồi nối API nghiệp vụ theo Spec/quyết định đủ điều kiện. Các task Backend độc lập vẫn còn trong Plan; U1/U2 chỉ migrationtest/pending, U3/Pcòn mở/provider chưa xác nhận giữ nguyên cổng. Không gọi FullMVP hoặc toàn bộUI Antigravity đã hoàn thành.

Đã kết thúc tài nguyên tạm của lượt kiểm tra: đóng các tab do agent tạo, khôi phục kích thước browser; dừng Vite prototype5175 và hai container UI test8082, giữ container dev và dự án khác. Cấu hình Nginx test cuối khớp hash bản gốc. Các ảnh/log/fixture manifest chỉ ở thư mục backups đã gitignore, không stage thông tin đăng nhập, snapshot database hoặc output build.

### 12.24. LEASE-C — nhận cọc và kích hoạt xuyên suốt (28/10/2026)

**Đã tích hợp trên DB test** theo yêu cầu ưu tiên nghiệp vụ: PUT terms, POST deposit, GET activation-context, POST activate và ADM-13 (brief §28). Không đồng nghĩa đã hoàn thành gia hạn, thay dịch vụ active, INV/PAY/CLOSE hoặc schema dev. Quyết định mới U3/thanh lý ghi tại DB-D65/66/67, local checkpoint tài liệu `8b73c30`.

| Task | Kết quả |
|---|---|
| LEASE-08 | Lưu/đọc snapshot điều khoản và thời điểm. Nhận cọc kiểm tra amount + revision, giữ thời điểm lần đầu; nháp đã nhận cọc không đổi phòng/người thuê/số cọc hoặc bị xóa. |
| LEASE-09 | Kích hoạt trong transaction: kiểm điều khoản/cọc/chuỗi chỉ số; sinh mã HD từ ID, phòng occupied, người thuê resident, thêm hai dịch vụ metered đúng một lần; không tạo invoice/payment/reading giả. |
| LEASE-10 | Form RHF/Zod tại ADM-13; khóa ghi chung, revision chống dữ liệu cũ, Auth refresh khi 401/403; modal dài cuộn được và giữ thiết kế Antigravity. |
| LEASE-11 | Feature/concurrency/fullsuite/style, ba agent API Luna và browser do root thao tác; đã dọn fixture, dev không đổi. |

**Tự động:** backend **1212 test / 10274 assertion PASS**, Pint **232 file PASS**. Riêng lifecycle/concurrency **34 test / 260 assertion PASS**; hai process PHP tranh chấp cùng phòng hoặc cùng người thuê cho đúng một 200 và một 409. Frontend **78 test/build PASS**, lint **0 lỗi/8 cảnh báo cũ**; main chunk >500 KB còn. Backend fullsuite kết thúc trước fixture; các chỉnh frontend cuối đã build/test/lint lại, không chạy schema tests khi fixture tồn tại.

**Live API:** Guest 401, bốn vai trò không phải Admin 403 tại bốn action; thiếu CSRF 419. Field giả/trùng waiver/sai precision/confirmed=false trả 422; amount hoặc revision sai trả 409. Flow cọc 1 triệu → held → lặp nhận giữ paid_at → active/occupied/resident và hai metered giá NULL; GET giữ mã/thời điểm, kích hoạt lặp và sửa/xóa nháp đã nhận cọc trả 409. Logout 204. Locked Admin chỉ kiểm bằng Feature test. Không cộng lỗi harness thành PASS: auth từng dùng nhầm `.id` trên ID số, sau đó sửa; flow kỳ vọng logout 200 sai nhưng endpoint đúng 204; validation không xác minh được terms NULL ban đầu, nên nhánh đó lấy bằng chứng từ browser cọc 0 (422). Có login 429 khi kiểm thử dày, đã đợi cửa sổ throttle, không nới quy tắc.

**Browser:** lưu none + điều kiện miễn và hệ số 1.50; trùng mã hiện lỗi. Cọc 0 kích hoạt sau lưu terms; cọc 2 triệu trước nhận bị 409, xác nhận đủ rồi kích hoạt thành công. F5 giữ mã HD, paid_at/activated_at và hai dòng Điện/Nước. Xóa nháp đã nhận cọc bị khóa; room/user disabled và deposit readonly trong form, ghi chú vẫn lưu mà không mất ID. Desktop 1440×900/mobile 390×844 (scrollWidth 382); nút Đóng/Escape của modal dài đã thử. Pending khóa các nút/tab; chưa giả lập response đảo thứ tự với độ trễ tùy chỉnh. Context 503 trên Nginx TEST làm confirm disabled; khôi phục nguyên byte cấu hình, nginx -t/reload và context hồi phục. Admin khác đổi note khi modal nhận cọc mở → 409, không nhận tiền. Đăng xuất ở tab phụ rồi gửi form cũ: sau sửa Auth refresh, UI chuyển về login, không báo thành công. Console trang active bình thường ở bản cuối không error/warn; lỗi 422/409/503 chủ động là dự kiến. Ảnh/log ignored tại `backups/lease-lifecycle-20261027/`.

**Lỗi điều phối và bảo toàn:** preflight và lifecycle ban đầu chạy chồng, hai RefreshDatabase làm schema test thiếu bảng; đã kết thúc cả hai, chạy tuần tự lại 6/14, 34/260 và fullsuite PASS. Không sửa guard hay giảm test. Docker lúc khởi động trả danh sách rỗng; khi ổn định, container/volume cũ xuất hiện. Compose test thử mới chưa tạo container/volume, build kết thúc EOF; quay về đúng app/nginx test hiện có. Helper mới kiểm SQL identity/run IDs và dọn các hợp đồng active/dịch vụ/phòng/tòa/users/sessions thuộc lượt, từ chối lịch sử ngoài dự kiến; manifest trong container đã xóa. Snapshot dev trước/sau khớp toàn bộ JSON, metadata và hash dữ liệu: **20 bảng/16 migration**. Không migration/seeder/ghi nghiệp vụ dev hoặc push.

**Tiếp theo:** U1 API/UI giá theo tòa, MTR chính thức và U3 conditional unique theo DB-D65, U2 upload/duyệt. Thanh lý P3/P6/P7/P8/P9/P11 đã duyệt trên DB test; các đoạn cũ ghi chờ duyệt là lịch sử. Chưa có Sandbox thanh toán được xác nhận.

### 12.25. U1 — nối API/UI giá theo tòa (đã tích hợp trên DB test28/10)

Sau checkpoint LEASE-C37354eb, U1-03 API scoped, U1-04 UI lịch sử/form/tab tòa, U1-05 kiểm thử tích hợp đã thực hiện theo brief§29. Giữ nguyên pending ALTER đã commit, không thay default migrate hoặc chạy dev. Feature API tests tự sở hữu DDL trên DB test, transaction bắt đầu sau up và fixture rollback trước down. U3/MTR/U2 là nhóm sau, không trộn schema U3 vào U1.

GET/POST `/api/v1/utility-prices` dùng building_id; Resource thêm building{id,name}. D33 chỉ xét phòng của đúng tòa/dịch vụ, khóa building → service trước kiểm lịch sử/ghi giá. Schema chưa có building_id trả503, không dùng giá global thay thế. Hai giao diện chính thức gồm lịch sử/lọc tòa-dịch vụ-page bằng URL và tab giá chi tiết tòa; form bắt buộc chọn tòa, không tự chọn tòa đầu. Không suy giá hiện hành từ dòng đầu hoặc phục hồi thẻ giá cố định của prototype.

**Tự động đã chạy:** backend **1219 test/10529 assertion PASS**, Pint **233 file PASS**; suite liên quan **52/572 PASS**. Frontend **80 test/build PASS**, lint **0 lỗi/8 cảnh báo cũ**; main chunk >500KB vẫn còn. Giữ nguyên test migration sao chép toàn bộ lịch sử/giữ ID-ngày-giá và từ chối rollback làm mất dữ liệu. Test D33 kiểm giá tòa khác không chặn và reading/item/tổng issued không đổi; chưa có live MTR nên chưa gọi đó là luồng hóa đơn xuyên suốt.

**Live API, ba agent Luna:** Guest401, bốn vai trò khác403 kể cả body sai, Admin thiếuCSRF419; thiếu/sai/boolean building, giá0 và ngày02 đều422. Hai tòa cùng ngày có giá3500/4200 riêng; lọc không lẫn dữ liệu. Hai POST đồng thời cùng tòa/dịch vụ/ngày cho201+422, đọc lại đúng một dòng; không tuyên bố đã kiểm cạnh tranh D33 với MTR chưa tồn tại. PUT/DELETE không mở (404). Tòa mới trả0 lịch sử; logout204.

**Browser thật Desktop1440×900/Mobile390×844:** chọn tòa thứ23 từ options qua2trang vẫn đúng; lưu3500 tại tòa23 và4200 tại tòa2 cùng kỳ, F5 giữ scope/dịch vụ/giá. Lỗi giá0/ngày02 đúng ô, duplicate422 giữ form/input. Lịch sử21dòng có2trang, trang2 đúng dòng cũ nhất; tab chi tiết tòa cũng phân trang/link về đúngbuilding_id. Mobile không tràn trang (scrollWidth382), bảng cuộn trong khung; modal vừa màn hình, Đóng/Escape hoạt động, pending khóa field/Hủy/Lưu. Đăng xuất tab phụ rồi gửi form cũ về/login, không báo thành công. Chưa thử Back, response đảo có độ trễ hoặc 503/retry bằng browser trong lượt U1; schema503 có Feature test. So bố cục với source bằng đọc code và ảnh UI chính thức; chưa mở lại prototype U1 trong browser, không coi đó là visual đối chiếu hai bản đầy đủ.

**Bảo toàn:** helper kiểm SQL identity mini_apartment_test/account riêng, áp dụng pending tường minh và dọn đúng23tòa/5tài khoản/giá thuộc runIDs, khôi phục schema test global rồi xóa manifest container. Không PHPUnit khi browser fixture tồn tại. Dev trước/sau khớp nguyên JSON metadata/hash **20bảng/16migration**; không migration/seeder/ghi dev. Ba thư mục có sẵn .claude/,public-ui-concept/,ui-antigravity-full/ ngoài staging. Log/ảnh/credentials test chỉ trong backups/utility-scope-20261028 đã ignore. Màn Antigravity vẫn52/4UIđủ/24API ở phạm vi ghi; U1 không tự nâng toàn bộ chi tiết tòa thành hoàn chỉnh.

**Tiếp tục:** U3 conditional UNIQUE mới theoDB-D65 → MTR chính thức dùng giá tòa và khóa service tương ứng → U2 gửi ảnh/duyệt qua cùng nghiệp vụ. Chưa gọi điện nước/hóa đơn hoặc FullMVP hoàn thành.

### 12.26. U3 → MTR — đang triển khai28/10

Checkpoint U1 `e5050b9`, Git chỉ còn ba thư mục nguồn có sẵn ngoài công việc. U3-01 chuẩn bị ALTER pending mới theo DB-D65/68, không sửa M14/enum: periodic có hợp đồng UNIQUE hợp đồng/dịch vụ/kỳ; phòng trống UNIQUE phòng/dịch vụ/kỳ; final UNIQUE hợp đồng/dịch vụ và bắt buộc contract_id. Một hợp đồng chỉ có một lần thanh lý bất biến trong MVP nên contract_id là định danh lần chốt. U3-02 kiểm thử MySQL dữ liệu cũ, hai hợp đồng có periodic/final cùng phòng/tháng, duplicate khác tháng và rollback từ chối mất lịch sử. Bổ sung DB-D68 đã được chủ dự án chọn khi phát hiện periodic A có thể chặn chỉ số/hóa đơn B. Sau đó MTR-01/02/03 theo thứ tự; U3 schema không đồng nghĩa MTR/API/UI đã chạy. Mọi DDL chỉ DB test.

U3-01/02 **đã kiểm thử**, chưa áp dụng dev hoặc để lại ALTER trên test:8test/106assertion PASS; fullsuite **1227/10635 PASS**. Frontend giữ nguyên bản U1, chạy lại **80test/build/lint0lỗi8cảnhbáocũ PASS**. Pint toàn bộ240file PASS (gồm5file MTR đang viết chưa stage, không coi đó là kiểm thử nghiệp vụ MTR). Kiểm FK RESTRICT/kiểuVARCHAR kind/ba generated keys và giữ dữ liệu cũ; duplicate periodic mỗi hợp đồng/vacancy hoặc final khác kỳ bị chặn, hai hợp đồng cùng phòng/kỳ được ghi riêng. Unsafe down từ chối không đổi dữ liệu; safe down trả đúng constraint/dữ liệu cũ.

Lỗi lượt đầu nằm ở cleanup test dùng soft delete Contract khiến FK user còn tham chiếu. Đã đọc đúng ID/timestamp/schema, dọn duy nhất fixture sở hữu (không reset), chuyển cleanup sang DB delete exactIDs; chạy lại8/106 và fullsuite PASS. Bản8/97 trước DB-D68 chỉ là lịch sử, không dùng thay kết quả mới. M14 và pending U1 không sửa; helper/test DDL tuần tự, không browser fixture. Snapshot dev so sauU1 khớp nguyênJSON20bảng/16migration. Log ignored backups/meter-readings-20261028. MTR Service/Request/Controller/Resource/Policy đang viết ở file mới ngoài staging; chưa route, chưa API sống/UI và chưa báo hoàn thành.

### 12.27. MTR-01/02/03 — chỉ số chính thức đã tích hợp DB test28/10

Sau local checkpoint U3 `52617aa`, triển khai brief§30: GET/POST meter-readings, GET rooms/{room}/meter-reading-context, Policy Admin, snapshot BCMath và batch all-or-nothing. ADM-15 đã thay khung chưa kết nối bằng lịch sử thật/form RHF một dòng/hàng loạt; chưa gửi/duyệt ảnh U2. Source Antigravity đã mở đối chiếu Desktop/Mobile, giữ Sidebar trắng/font/sky-teal/header/underline tabs; các KPI/giá/counter không có nguồn thật không phục hồi từ mock.

Suite liên quan **30test/378assertion PASS** trước fullsuite; kết quả cuối và browser sẽ ghi sau thực thi, không báo tích hợp từ code. Hai process PHP có barrier READY trước khi nhả khóa service, kết quả job/action riêng, cleanup bao phủ setup; kiểm duplicate201/409 và thay giá với MTR cho snapshot tương ứng giá thắng trước hoặc D33 từ chối giá đến sau. Root đã tái hiện và sửa3ca legacy thiếu final/gap/lower initial201 sai, vacancy nhảy nhiều kỳ201 sai và exact replay422 sai →409. Test ghi trễ ban đầu419 do phiên hết hạn khi đổi đồng hồ test; giữ CSRF thật, tạo phiên mới tại thời điểm nhập rồi kiểm ngày đo cũ/tiêu thụ0.

QA nguồn Luna tìm room_id bị bỏ khỏi query và context422 mất chi tiết; đã sửa filter/URL/key và allowlist thông báo. Batch/single form có key theo tòa để Back/Forward không giữ defaultValues của tòa cũ. Helper browser mới kiểm SQL identity/run IDs, checkpoint manifest bằng temp+rename/kiểm độ dài trước commit fixture, xác minh riêng service do lượt tạo; không tự cleanup partial DDL. Fullsuite phải kết thúc trước setup fixture. Mọi migration dev vẫn cấm, schema U1/U3 test áp dụng tường minh rồi dọn/revert cuối lượt.

**Quyết định mới28/10:** Q13/Q8 đã CONFIRMED DB-D69/70, Business Rules tại brief§31: other nháp có căn cứ/lịch sử, cư dân thấy khoản của mình; terminated vẫn xem/thanh toán nợ cũ, ảnh chỉ pending, thực nhận do Admin/provider xác nhận. Không hỏi lại như điểm chưa chốt; chưa gọi INV/PAY/online đã code. Tiếp tục MTR → U2 → INV/PAY theo ưu tiên. Provider/Sandbox chưa xác nhận chỉ chặn kết nối online thật, không chặn các module độc lập. Mọi migration dev vẫn cần duyệt riêng.

**Kết quả tự động:** full backend **1257test/11013assertion PASS**, Pint **244file PASS**; frontend **83test/build PASS**, lint **0lỗi/8cảnhbáocũ**, cảnh báo chunk>500KB còn. Fullsuite kết thúc trước fixture. Bộ liên quan30/378 gồm tranh chấp bằng hai process thật, không giảm bảo vệ MySQL test.

**Live API:** quyền Guest401/bốn vai trò403/CSRF419 và input giả/sai precision/date/period422 đã kiểm; locked Admin chỉ Feature. Batch dòng2 sai không lưu dòng1; ghi100→112.35 ở hai tòa giá3500/4200 cho43225/51870, đọc lại giữ snapshot; D33 thay giá hồi tố422. Race cùng phòng/kỳ cho201/409, đọc lại một dòng. Lượt tiếp tục sau restart đã đọc lại ba phòng A/B/race và thử D33 lại; không tính việc đọc lại đó thành một race mới. Không tạo invoice/payment.

**Browser chính thức:** kích hoạt hợp đồng cọc0 với mốc100/10 qua ADM-13 rồi ghi tại ADM-15; mốc context100/01-10/3500 đúng,99.99 bị lỗi đúng ô,112.35 lưu43225 và F5 giữ dữ liệu. Batch nước12.35/9.99 bị từ chối, sửa dòng2 thành14.00 lưu cả hai35250/60000; rollback đã đối chiếu chính xác bằng live API và Feature. Lọc phòng lịch sử21kỳ, trang2 chỉ kỳ01/2025, F5 giữ room/page. Options đủ25phòng gồm phòng thứ23 của tòaA. Desktop1440×900 vàMobile390×844 (scrollWidth382), bảng/tab cuộn trong khung; modal thiếu giá hiện chi tiết tiếng Việt, không mốc0/giáfallback, Hủy/Escape hoạt động. Source đã mở đối chiếu Desktop/Mobile trước lượt restart; ảnh nguồn/chính thức giữ trong backups. Chưa thử riêng expired-session,503/retry, Back/Forward hoặc đảo response có độ trễ trên browser MTR; không lấy bằng chứng U1 thay các ca này. Console trang bình thường cuối không error/warn.

**Bảo toàn:** môi trường test dừng sau lần trước, khởi động lại đúng hai container hiện có; không setup fixture lần hai, không PHPUnit khi manifest còn. Cleanup helper kiểm chính xác SQL identity/ID/prefix và từ chối lịch sử ngoài lượt; đã dọn fixture, down U3→U1, xóa manifest container. Dev snapshot trước/sau khớp nguyên JSON20bảng/16migration. Không migration/seeder/ghi dev/push. Ba thư mục có sẵn không stage; log/ảnh/credentials trong backups đã ignore. ADM-15 tăng số màn dùng API lên25/52 theo phạm vi; UI đầy đủ vẫn4,48một phần,0mock trên luồng render. U2/INV/PAY/CLOSE chưa hoàn thành.
