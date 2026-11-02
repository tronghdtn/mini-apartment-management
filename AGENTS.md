# AGENTS.md — Quy tắc cho AI coding agent

File này là **nguồn quy tắc dùng chung duy nhất** cho mọi agent (Codex, Claude Code, Copilot, Cursor…). `CLAUDE.md` import file này và chỉ bổ sung hướng dẫn riêng cho Claude Code. Nếu thấy hai file mâu thuẫn: làm theo `AGENTS.md` và báo lại để sửa. Yêu cầu trực tiếp của người dùng luôn được ưu tiên hơn file này.

## 1. Tổng quan dự án

**Mốc 02/11/2026 — CLOSE-SVC / ROOM-MTR (hiện hành):** DB-D87 đã duyệt và tích hợp: thanh lý bỏ riêng dịch vụ kỳ sau chưa sử dụng, chặn409 nếu bất kỳ invoice item tham chiếu; giữ lịch sử/metered, transaction/revision/replay. Code e3c3030. Tab Điện nước ADM-05 đọc API sẵn có theo phòng/lọc/phân trang/URL, tái dùng bảng MTR; code25ae0db. Full backend1469test/14836assertion/Pint365; frontend141/build/lintPASS(0lỗi/9cảnh báo cũ). HTTP26response +10authsetup và browser/503retry/mobile375 đã kiểm theo Plan§12.56–57/MatrixCS-RM, không phải kiểm toànMVP. Fixture/schema test đã khôi phục/test0/FK1/devdenied1142/privatefile cũ nguyên; snapshotdev mọi phần khớp29bảng/30migration/RUNfalse. Cặp18082stopped/tabđóng/viewportreset; không ghi/schema dev hoặc push. PAY504 gốc, chính sách draftinvoice kỳápdụng dịch vụ và APIroom_id lịchxem còn mở; chưa BackForward/OSoffline/TCPdrop/Adminthậtdev. Bản đồ học tập§11.63–64. Các mốc dưới là lịch sử.

**Mốc 02/11/2026 — CTR-API-3b (lịch sử):** DB-D86 đã duyệt: biên sắp hết hạn tính cả hai đầu; giữ đơn giá snapshot khi đổi lượng; inactive được giữ/giảm/ngừng, không đăng ký mới/tăng. Chủ dự án chọn A, giữ chia ngày khi nhận/trả phòng. Code3533a56; hồi quy Contracts/Invoices/Final325test/3599assertion, Pint2file; frontend138/build/lintPASS (9cảnh báo cũ).29HTTP/7nhóm browser và kiểm lại375px: phát hiện rồi sửa tràn bằng min-w-0/tách badge; dialogclient=scroll334, fieldset286, ảnh đã xem. Hai fixture đã dọn; test0/FK1/devdenied1142/privatefile cũ nguyên. Snapshot dev mọi phần khớp29bảng/30migration; RUN_MIGRATIONS=false, cặp test dừng/tab đóng/viewport reset. Không schema/ghi dev/sửa PAY/push; full1452 là lịch sử, chưa Admin thật dev/OSoffline/TCPdrop. Plan§12.54/học tập§11.61/MatrixSVC. PAY504 và quy tắc hóa đơn kỳ áp dụng/dòng tương lai khi thanh lý vẫn còn mở.

**Mốc02/11/2026 — CTR-RF-DEV (lịch sử vận hành):** chủ dự án duyệt riêng đúng1migration hoàn cọc; đã backup mới ngoài repo/restore MySQL8.4.11côlập/đối chiếu/diễn tập/pretend trước khi apply. Dev mini_apartment29bảng/30migration,2cột nullable/FKRESTRICT đúng, dữ liệu và cấu trúc cũ nguyên; chỉ thêm lịch sửid30/batch6. RUN_MIGRATIONS=false; Nginx8080 đã mở lại/4HTTPstateless đạt, clone stopped/giữ backupvolume. Biên bản DBplan§23/Plan§12.53/học tập§11.60. Không sửa Backend/Frontend hoặc chạy lại fullsuite;1452backend/137frontend là kết quả lịch sử. Chưa ghi xác nhận bằng Admin thậtdev, PAY504gốc/diễn giải dịch vụ§44 còn mở; không push. Migration dev tương lai vẫn cần duyệt riêng.

**Mốc02/11/2026 — CTR-API-4 (lịch sử chuẩn bị/test):** DB-D85/brief§46 đã duyệt hoàn đủ một lần;2cột pending/1POST +3trường previewAdmin, giữ legacy khi thiếu schema; không payment giả/đổi invoice/room. Code32cab18, full1452/14615/Pint364, frontend137/build/lintPASS(9cảnh báo cũ),35HTTPgồm1race2phiên/1race2process/10tìnhhuốngbrowserDBtest. Sửa revision sau terminate bằng refresh mặc định/generated columns; không đổi tiền. Fixture11user/5contract và6schema test đãdọn/phục hồi, dev29bảng/29migration và privatebaseline khớp; Authrehash CLI12/FPMtest4 của fixture được xác minh/ghi riêng, không đổi mật khẩudev. RUNfalse/testpairstopped/tabđóng. **Migration mới chưa áp dụng dev**; nút mới chỉ hiện khi schema sẵn sàng. Plan§12.52/học tập§11.59/MatrixRF; PAY504gốc và diễn giải dịch vụ§44 chưakhép. Không push.

**Mốc02/11/2026 — PAY-04 (lịch sử):** code90ea3d7 sửa phục hồi khi phản hồi thanh toán chưa rõ: proof/direct/confirm/reject khóa submit, nút/đóng modal đọc lại API thật; không đổi pending/endpoint/schema. Frontend135/build/lintPASS(9cảnh báo cũ), backend hồi quy18/237;23HTTP+10GETlatency/8nhóm browser DBtest. Fixture/2ảnh/schema test đã dọn/phục hồi; dev29bảng/29migration/data/history nguyên vẹn, warmmetadata khớp checkpoint trước và privatebaseline1file giữ nguyên. Cặp18082stopped/RUN_MIGRATIONS=false. Log gốc xác minh timeout60s thật nhưng **PAY504 căn nguyên chưa rõ**, không gọi fault injection sau commit là đã sửa timeout. Plan§12.51/học tập§11.58/MatrixPAY-C; không push.

**Mốc 02/11/2026 — CTR-API-2 (lịch sử):** chủ dự án duyệt DB-D84/brief§45: Người ở cùng chỉ CRUD nháp, active/terminated chỉ đọc; giữ occupant_count nhập riêng và cảnh báo lệch, không tự đồng bộ dịch vụ/phí/hóa đơn. GET/POST/PATCH/DELETE API riêng và tab nhỏ ADM-13 đã tích hợp DBtest, không schema/migration/devwrite. Kiểm sức chứa cả lúc đổi phòng/kích hoạt; revision gồm cả hồ sơ để chặn form cũ và race kích hoạt. Full **1439 test/14440 assertion**, Pint **358 file**, frontend **133 test/build/lint PASS** (0 lỗi/9 cảnh báo cũ);27HTTP+1race hai phiên/12browser, hai race process store/store và store/activate. Fixture đã dọn, test sạch/FK1/dev denied1142, dev29bảng/29migration snapshot nguyên vẹn, một tệp private cũ giữ path+SHA256.4statelessGETdev đạt; RUN_MIGRATIONS=false, cặp18082stopped/tabđóng/viewportreset. Code local **5f208e2**, không push; Plan§12.50/học tập§11.57/MatrixOCC. Chưa People bằng Admin thậtdev/OSoffline/lostresponse sau commit; không tự mở activeCRUD hoặc chi hoàn cọc. Các diễn giải tài chính brief§44 do Claude áp dụng vẫn chờ xác nhận, không được phê duyệt ngầm từ việc testPASS; PAY504 chưa rõ gốc. Các mốc cũ dưới đây là lịch sử.

**Mốc 01/11/2026 — FILE-ROOM (lịch sử):** DB-D83/brief §43 đã được duyệt và tích hợp ảnh phòng: Admin upload/list/chọn bìa/gỡ; Public dùng URL kiểm soát khi phòng available/is_public và tòa active. Giữ 20 ảnh/phòng, 5MiB/ảnh, 20 ảnh/30MiB mỗi request; không schema mới. Backend **1414 test/14077 assertion**, Pint **349 file** PASS; frontend **126 test/build/lint** PASS (0 lỗi/9 cảnh báo cũ). Nhóm ảnh có 46 kiểm tra HTTP, 13 tình huống browser chính và lượt kiểm lại upload/F5 sau sửa handler; hai race subprocess và hai503 proxy ghi riêng. PNG1×1 là fixture kiểm thử, chưa browser JPEG/WebP/OS offline/mất response sau commit hoặc Admin thật dev. Đã dọn các run/ảnh/schema test; test user vẫn bị từ chối dev1142, snapshot cuối dev khớp identity/cột/index/data/history, **29 bảng vật lý/29 migrations**. Metadata lạnh AUTO_INCREMENT sau Docker restart khác ở lần đọc đầu, bản lặp khớp baseline; không ALTER/reset counter. RUN_MIGRATIONS=false, PHP8.3.36/upload_progress Off/post32M/upload20M/maxuploads64. Cặp18082 đã dừng, tab test đã đóng. Code local **af77958**, không push; Plan §12.47, học tập §11.54. Dashboard4thẻ cũng đã triển khai trước đó (e8b810b, Plan §12.46), không còn chờ code như mốc NOTIF bên dưới. PAY504 chưa rõ nguyên nhân; PDF/provider, các bảng/biểu đồ và toàn Full MVP/UI vẫn chưa hoàn tất. Các mốc cũ dưới đây là lịch sử, không dùng làm blocker đã được quyết định mới thay thế.

**Mốc01/11/2026 — NOTIF-03 (lịch sử):** DB-D81 read-all đã code/nghiệm thu DBtest5role, nguồn thật25notice;25HTTP+1accesslog/1racehai phiên, mobile390/503/URL/F5/link. Backend1390test/13682assertion/Pint338, frontend121/build/lintPASS (9cảnhbáocũ). Sửa thiếu link lịch hẹn mobile, không đổi quyền. Fixture/schema test dọn/khôi phục, devdata/history/cột/index giữ nguyên29bảng/29migration; rawAUTO_INCREMENT lạnh khác, warm=repeat=snapshot đã xác minh lượt FILE/PAY trước, không sửa DB. RUN_MIGRATIONS=false, DockerPHP8.3.36/uploadProgressOff/32M. Test8082 không bind nên dùng cặp18082loopback, hiệnstopped; không credential/log vàoGit. DB-D82/brief§42 DashboardAdmin4thẻ/APIchỉđọc đã duyệt, chưa code ở checkpoint này; triển khai tiếp sau NOTIF. PAY504 chưa rõ gốc; chưa OSoffline/responseđảo hoặc toànFullMVP. Checkpoint code local46a6aa9, không push. Plan§12.45, học tập§11.52.

**Mốc01/11/2026 — FILE/PAY (lịch sử):** FILE-03/PAY theo DB-D80 đã kiểm ngân sách20ảnh/30MiB, PHP/Nginx32MiB; max_file_uploads64 để Laravel từ chối phần vượt20, giữ5MiB/ảnh. Docker app bind php.ini readonly, PHP8.3.36/upload_progressOff/RUN_MIGRATIONS=false. Backend1383test/13545assertion/Pint338, frontend118test/build/lintPASS (0lỗi/9cảnhbáocũ);26HTTPtest/14tìnhhuốngbrowser lõiPAY gồm filechooserPNG/privatepreview/mobile390/confirm/reject/cash/RCP/F5. Sửa Zod bỏ lọt proof thiếu key, thêm cảnh báo kết quả gửi chưa xác định khi5xx/mất mạng; một504 có pending đã lưu, chưa xác minh gốc timeout. Fixture/7ảnh dọn đúngrun, schema test phục hồi, dev identity/metadata/data/migrations giữ nguyên29bảng/29migration;4HTTPstateless dev đạt. Không ghi/migration dev hoặc push. Chưa browserfinal21ảnh/OSoffline/mất-response có kiểm soát, provider/PDF/room_gallery và FullMVP/UI toàn bộ vẫn chưa hoàn tất. Checkpoint local c0ec86b/259c56d, không push. Plan§12.44, học tập§11.51.

**Mốc31/10/2026 — MAINT (lịch sử):** MAINT luồng lõi7màn đã nghiệm thu browser DBtest: sửa status rỗng gây422 và nội dung TEXT quá byte gây500; checkpoint local a5f224b/f563180, không push. Backend1378test/13485assertion/Pint337, frontend116test/build/lintPASS (9cảnhbáocũ),33kiểmtraHTTP +1race200/409 hai phiên,14tìnhhuốngbrowser. Fixture/ảnh đã dọn đúngrun; dev identity/metadata/datahash/migrations nguyên vẹn **29bảng vật lý=22thiết kế+7hạ tầng,29migration**,2dịch vụ hệthống/8settings từ góiA đã duyệt. RUN_MIGRATIONS=false; DockerPHP8.3.36/upload_progressOff. Chưa nghiệm thu đầy đủ UI/mobile/ghi MAINT dev, biên upload5ảnh còn FILE-03 (cấu hình nguồn20MB); không suy FullMVP hoàn tất. Plan§12.43, học tập§11.50; lịch sử nâng cấp an toàn Plan§12.42/DBplan§22. Mọi migration dev tương lai vẫn cần duyệt riêng.

- **Mini Apartment Management** — hệ thống quản lý chung cư mini, bài tập lớn môn Lập trình mã nguồn mở.
- Một chủ sở hữu quản lý nhiều tòa chung cư mini; mỗi tòa có nhiều phòng.
- **5 actor** (quyết định 14/10/2026, DB-D02): Khách, Cư dân, Quản trị viên, Nhân viên sửa chữa, Bảo vệ. Giá trị `users.role`: `user` (khách đã đăng ký), `resident`, `admin`, `technician`, `guard`; khách vãng lai không có tài khoản.
- Trạng thái (24/10/2026): Auth/CAT/ROOM/USR và Hợp đồng nháp đã nối API. Admin dev do chủ dự án tự tạo/reset, đăng nhập và đọc quản trị/F5 đã xác minh. Docker PHP đã vá8.3.36/upload_progress Off; Laragon host8.3.30 chưa vá. Mới: Backend1038test/9348assertion/Pint201file, frontend60/build/lintPASS (9cảnh báo cũ); dịch vụ nháp Q7=giá danh mục snapshot đã code/test, 12 tình huống browser và10ca liveAPI đã kiểm chứng (§12.15). Dev20bảng/16migration/RUN_MIGRATIONS=false/Nhóm3pending; không ghi nghiệp vụ dev. Checkpoint mới8bab41e/dc027eb/df59765/503d38c local, không push; CTR503d38c đã checkpoint. P4–P8 và Q15 còn chặn kích hoạt/Thanh lý; không suy tiến độ từ UI/mock. Plan§12.15, học tập§11.23.
- Giao diện và thông báo cho người dùng: **tiếng Việt**. Code (biến, hàm, class, bảng, cột, route): **tiếng Anh**.

**Nguồn sự thật — thứ tự ưu tiên khi mâu thuẫn:**
1. `docs/DB_DECISIONS_20261014.md` — quyết định ghi đè (số bảng, số actor, tiền, timezone, tiện nghi/dịch vụ, BR-SVC-04…).
2. `docs/09_DATABASE_DESIGN.md` — baseline21 bảng, mở rộng22 theo DB-D64/U2 chỉ chuẩn bị/test; quy tắc tính tiền và checklist DB.
3. `docs/02_SYSTEM_DISCOVERY.md` v0.10, `PROJECT_CONTEXT.md`, docs `03`–`08` — chỉ ở phần **không** xung đột với (1)(2). *(Hiện chưa có trong repo.)*

Tài liệu cũ hoặc sơ đồ còn ghi 20 bảng / 3 actor / tiền DECIMAL / dịch vụ trọn tháng / cột `type` điện nước là **lỗi thời** — không dùng để lập migration.

Spec module đã được duyệt quy định hành vi trong phần không mâu thuẫn quyết định CONFIRMED mới nhất; hợp đồng HTTP quản lý trong tài liệu API. `docs/IMPLEMENTATION_PLAN.md` quản lý Tasks/trạng thái, không ghi đè nghiệp vụ. Prototype và code đã có không tự trở thành yêu cầu được duyệt.

## 2. Công nghệ

**Cập nhật30/10 — CLOSE-02d:** lập final draft/chỉ số chốt/damage/miễn phí có căn cứ và refresh/issue/reissue đã nối API vào ADM-14/chi tiết hóa đơn. Full1351test/12791assertion/Pint327file; frontend110test/build/lintPASS (9cảnhbáocũ).19liveHTTP/12tìnhhuốngCUA/2racehai phiên trênDBtest, fixture đãdọn; dev20bảng/16migration/checksumnguyênvẹn. Chi tiết/giới hạn Plan§12.39, bản đồ học tập§11.46. Chưa settle cọc/terminate/trả phòng, không migration dev. P6/P7/P8 đã duyệt DB-D67; không lấy trạng thái cũ24–27/10 làm blocker. Không suy toàn bộ Full MVP đã hoàn thành từ luồng final này.

**Bổ sung AG-UI27/10:** nguồn `ui-antigravity-full/` đã đối chiếu52file màn hình; bảng hiện hành tại SCREEN_INVENTORY§8–9 và Plan§12.23. Frontend chính thức dùng layout trắng/sky/teal mới của Admin/Resident/Staff, route có Auth thật và guard con tách Technician/Guard; giữ URL /account/* tương thích. Local checkpoints1950d1a/562bc67/eaf73d3/7f66ad6; chưa push.24màn dùng API theo phạm vi đã ghi;4UIđủ/48một phần, không tính52route là52màn hoàn chỉnh. Không còn mock trong luồng render, nhưng26màn nghiệp vụ chưa API vẫn chưa hoàn thành. Home đã có7khối theo nguồn/sáu phòngAPI, không phục hồi giá/hotline/ảnh/cam kết mẫu; giá công khai/booking/ảnh còn chưa tích hợp. Dropdown tòa giữ lựa chọn URL sau optionsasync/Áp dụng/F5; lỗi503/retry đã thử trên Nginx test và khôi phục cấu hình. Backend1178/10014/Pint227, frontend72/build PASS/lint0lỗi8cảnhbáocũ trong đợt này; không đồng nghĩa kiểm thử hết52luồng. Fixture đã dọn; snapshotdev20bảng/16migration nguyên vẹn. Mọi migration dev vẫn cần duyệt riêng.

**Cập nhật 27/10/2026 (ưu tiên hơn trạng thái 24/10 ở trên):** ROOM-PUB list/detail/home và ADM-23 Cài đặt đã tích hợp API thật trên DB test (Plan §12.17/20). Backend hiện tại1178 test/10014 assertion, Pint227 PASS; frontend71 test/build PASS, lint0 lỗi/9 cảnh báo cũ. Local commits ROOM-PUB bcb08a4, điều khoản/cọc 5167cd5, U1 2999554, Cài đặt c129fbd, hiệu năng e66c23f; không push. Tổng JS ban đầu sau tách18 trang quản trị617.63KB, giảm24.2%, gzip giảm15.3%; chưa đo thời gian mạng thật. P4+P5-B và Q15 đã duyệt DB-D61/62, nền tảng nội bộ đã code/test; chưa có API kích hoạt/thu cọc/thanh lý. U1 đã duyệt DB-D63 chỉ chuẩn bị migration pending/test; API giá hiện hành vẫn global. U2 đã duyệt DB-D64 trên DB test: chuẩn bị bảng22/M19 pending, model/Policy/disk private; chưa có API/UI gửi/duyệt ảnh. U3 chưa duyệt, giữ enum periodic/final hiện có. Mọi migration dev vẫn cần duyệt riêng; snapshot dev cuối nguyên vẹn20 bảng/16 migration, không ghi nghiệp vụ dev. Nguồn thiết kế ui-antigravity-full/ đã được xác nhận, chỉ tích hợp chọn lọc vào frontend/ chính thức. Chưa có Sandbox thanh toán được xác nhận, không coi mô phỏng là kết nối thật. Chủ dự án cho phép tự local commit phần đã kiểm tra; không push/reset/rebase/xóa nhánh.

| Phần | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Axios, React Hook Form + Zod, Recharts, lucide-react (icon) |
| Backend | PHP 8.3, Laravel 13 (REST API), Sanctum (SPA cookie), Eloquent |
| Database | MySQL 8.4 |
| Hạ tầng | Docker Compose, Nginx reverse proxy cùng origin (`/api`, `/sanctum` → Laravel; còn lại → Vite) |

## 3. Ranh giới — phải dừng lại và hỏi

**Không được tự ý:**
- Thay đổi nghiệp vụ đã chốt. Nghiệp vụ đã chốt nằm trong `docs/`; nếu code hoặc yêu cầu mâu thuẫn với `docs/` hay chưa rõ, hỏi lại, không tự đoán.
- Tạo migration/model của nhóm chưa được duyệt trong `docs/DATABASE_IMPLEMENTATION_PLAN.md`; chạy migration nghiệp vụ trên DB dev `mini_apartment` khi chưa được duyệt riêng (backup + `migrate --pretend` trước). Thêm/bớt bảng ngoài thiết kế22 bảng sau DB-D64 (baseline21 + U2), hoặc đổi cột/kiểu/ràng buộc khác `docs/09_DATABASE_DESIGN.md`. U2/M19 chỉ chuẩn bị pending và kiểm thử DB test theo phê duyệt27/10; không suy quyền chạy dev hoặc hoàn thành HTTP/upload/duyệt.
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

### 3.1 Quy trình Spec → Plan → Tasks (áp dụng từ 22/10/2026)

1. Trước module/thay đổi nghiệp vụ đáng kể: đọc Plan, Spec hiện có và quyết định mới nhất; kiểm tra Git và thay đổi sẵn có. Thiếu Spec thì đề xuất/cập nhật vào file đang sở hữu nội dung trước, không tạo bản trùng.
2. Điểm chưa rõ: nêu phương án, tác động, ưu/nhược và đề xuất; hỏi chủ dự án trước khi code phần phụ thuộc. Phần độc lập đã đủ thông tin/được giao có thể tiếp tục. Không tự duyệt Spec hoặc coi UI/test PASS là phê duyệt.
3. Sau phê duyệt: dùng Task ID có thứ tự/phụ thuộc/tiêu chí nghiệm thu trong `docs/IMPLEMENTATION_PLAN.md`; không tạo thêm file Tasks/Plan song song, không lập lại kế hoạch khi yêu cầu không đổi.
4. Khi chủ dự án yêu cầu tiếp tục task đã duyệt: thực hiện trong phạm vi đó, kiểm thử theo Spec/AC, không hỏi lại cùng phê duyệt hoặc tự mở rộng module. Quyền sửa tài liệu/duyệt Plan không tự cho phép migration dev, tạo dữ liệu thật, xóa dữ liệu, commit/push.
5. Sau mỗi lượt: cập nhật trạng thái/bằng chứng trong Plan; bổ sung bản đồ code ngắn theo §3.2 vào `PROJECT_STATUS_AND_LEARNING.md`, hướng dẫn thực hành chi tiết khi chủ dự án yêu cầu. Chat chỉ tóm tắt task xong, file đổi, test, quyết định cần duyệt và task tiếp theo.
6. Sửa lỗi kỹ thuật nhỏ không đổi yêu cầu: ghi task/AC liên quan, không tạo Spec mới không cần thiết. Nếu phát hiện yêu cầu đổi thì quay lại bước 1–2.

Trạng thái: **Chưa làm / Đang làm / Bị chặn / Đã code / Đã kiểm thử / Đã tích hợp**; định nghĩa và mức bằng chứng ở Plan §2. Không báo phần trăm tự ước lượng. Luôn phân biệt code, test tự động, kiểm tra thực tế và phê duyệt.

### 3.2 Học và giải thích dựa trên code thật

- Khi được hỏi “Giải thích code chức năng X”: đọc code hiện tại rồi hướng dẫn từng bước mở file, tìm đúng hàm/sự kiện và vị trí dòng; không đoán tên file/hàm hoặc endpoint.
- Truy vết đủ React → hàm sự kiện → client API (method/URL/query/body/cookie) → route/middleware/Policy → Controller/Service/Model → bảng và điều kiện query → Resource/response → React hiển thị/lỗi/quyền. Chỉ rõ chỗ cần sửa để thay hành vi, cách thay tham số và kiểm chứng bằng DevTools Network hoặc công cụ phù hợp. Ví dụ dữ liệu phải ghi rõ là minh họa, chỉ dùng endpoint đã tồn tại; không đưa dữ liệu cá nhân/secrets thật vào tài liệu.
- Sau mỗi module chỉ bổ sung bản đồ code ngắn vào PROJECT_STATUS_AND_LEARNING.md: chức năng, file/hàm/vị trí quan trọng, API, bảng, luồng và 3–5 câu hỏi bảo vệ. Tiếng Việt dễ hiểu, giải nghĩa thuật ngữ khi dùng lần đầu; không lặp lý thuyết hoặc làm chậm code. Phần hướng dẫn thực hành chi tiết chỉ viết khi chủ dự án yêu cầu.
- Ưu tiên Full MVP theo Plan và quyết định CONFIRMED; không khảo sát lại/làm lại phần đã xong. Tài liệu học tập không là cổng chặn các task triển khai đã đủ điều kiện.

### 3.3 Phân công Frontend / Backend và bàn giao

- Antigravity thiết kế các màn hình lớn còn thiếu; Codex phụ trách Laravel/MySQL/nghiệp vụ/bảo mật/tests/API và tích hợp vào màn hình React đã có. Không tự thiết kế màn hình lớn được giao Antigravity, trừ yêu cầu trực tiếp hoặc chỉnh tối thiểu phục vụ kiểm thử.
- `frontend/` là bản chính thức duy nhất. Không ghi đè giao diện/tích hợp đã hoàn thiện; thư mục prototype không tự trở thành nguồn bàn giao. Xác minh Git status/worktree/file thực tế trước khi nhập thay đổi.
- Khi hai AI cùng hoạt động: dùng worktree/branch riêng (Git index riêng), ghi phạm vi file và người phụ trách trong IMPLEMENTATION_PLAN.md; file dùng chung phải bàn giao tuần tự. Không tạo worktree chỉ để chờ khi chưa có phiên thiết kế. API contract đặt trong tài liệu đang sở hữu module, để Antigravity biết dữ liệu/thao tác thật và phần chưa triển khai.

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
| `src/app/` | `App.tsx` (bọc `AuthProvider` + mock `AppProvider` + `RouterProvider`), `router.tsx` — khai báo toàn bộ route. Layout được chọn theo **tiền tố URL** (`/` → `PublicLayout`, `/admin` → `AdminLayout`), không theo vai trò. |
| `src/components/layouts/` | `PublicLayout` (+ `PublicNavbar`, `PublicFooter`), `AdminLayout` — đang dùng. `ResidentLayout`, `StaffLayout` (technician/guard, DB-D10) — có sẵn nhưng **chưa gắn route**. |
| `src/components/ui/` | Component giao diện dùng chung, không chứa nghiệp vụ (`Badge`, `Button`, `Modal`, `Tabs`, `Toast`, `Lightbox`, `StatCard`). |
| `src/features/<feature>/` | Một module nghiệp vụ: `api.ts`, `types.ts`, `schemas.ts` (Zod), component riêng. Feature không import lẫn nhau; phần dùng chung đưa lên `components/ui`, `hooks`, `lib`, `types`. Hiện có `rooms/` (component), `auth/` (API/types/schema, AuthProvider/useAuth, guard, AccountActions), `system/` (mẫu gọi API thật `/health`). |
| `src/mocks/` | **Dữ liệu giả tạm thời** (`data.ts`, `types.ts`, `AppContext.tsx` = "backend giả" trong bộ nhớ, `RoleSwitcher.tsx` = công cụ demo chỉ còn trong layout chưa gắn route). Danh tính Auth đã tách khỏi mock; luồng Admin/public đang chạy không có đổi vai trò demo. Không phải nghiệp vụ chính thức; xem `src/mocks/README.md`. |
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

**Lượt chỉ sửa tài liệu:** kiểm tra `git diff --check`, liên kết/file tham chiếu và tính nhất quán Spec/Task/trạng thái; không cần build/test ứng dụng, không chạy test DB có thể gọi migrations. Ghi rõ kết quả test ứng dụng trước đó là lịch sử, chưa chạy lại.

**Khi sửa code, bắt buộc chạy trước khi báo hoàn thành** (đọc kết quả, không đoán; theo phạm vi được phép):
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
| 23/10/2026 | Bổ sung §3.2: hướng dẫn thực hành dựa trên code thật, xác minh file/hàm/dòng/API, bản đồ học tập ngắn; không lấy tài liệu học tập làm cổng chặn triển khai. USR-A chỉ đọc đã tích hợp DB test. |
| 22/10/2026 (Bước 4) | AUTH-D01/D02/D03 CONFIRMED; React Auth thật, hồ sơ chỉ đọc, bỏ đổi quyền demo khỏi luồng đang chạy; 17 ca browser test cô lập, DB dev không đổi. |
| 22/10/2026 | Chuẩn hóa Spec → Plan → Tasks và báo cáo ngắn; cập nhật hiện trạng Auth/nullable dev; kiểm tra riêng cho lượt chỉ tài liệu. |
| 12/10/2026 | Khởi tạo quy tắc chung. |
| 18/10/2026 | `frontend/` = giao diện Antigravity chính thức (chủ dự án duyệt); thêm `lucide-react`; mô tả lại cấu trúc frontend (bỏ `DashboardShell`, thêm `src/mocks/` và quy tắc ranh giới dữ liệu giả); trạng thái dự án trỏ tới `docs/PROJECT_STATUS_AND_LEARNING.md`. |
| 14/10/2026 (6) | Áp dụng DB-D43..DB-D50: đảo O7 (`end_date` inclusive, đúng hạn = `end_date + 1`); mã thanh lý; bồi thường trước hạn, miễn trừ, kiểm tra tài sản (nguyên tắc — cấu trúc chờ duyệt P1–P12); Nhóm 4 + index O11. |
| 14/10/2026 (5) | Áp dụng DB-D39..DB-D42 (O7–O9): `end_date` nửa mở, tiếp tục tính tiền khi quá hạn, cột `meter_gap_*`, thanh lý ngày đầu; trạng thái Nhóm 3 (test). |
| 14/10/2026 (4) | Áp dụng DB-D31..DB-D38 (O1–O6): ngày bàn giao loại trừ, giữ `resident` sau thanh lý, chênh chỉ số, giá, thiếu chỉ số, ghi trễ; trạng thái Nhóm 1 (dev + test) và Nhóm 2 (test). |
| 14/10/2026 (3) | Áp dụng DB-D23..DB-D30: queue `sync`; quy tắc điện nước E1–E5; hủy/lập lại hóa đơn; thứ tự khóa thống nhất; tài khoản MySQL test riêng + guard so khớp chính xác; trạng thái Nhóm 1. |
| 14/10/2026 (2) | Áp dụng DB-D11..DB-D22 (Q1–Q12): test MySQL `mini_apartment_test` + guard; mã nghiệp vụ; `period` điện nước = tháng tiêu thụ; ẩn `id_number`; UTC đã cấu hình; helper `Money`. |
| 14/10/2026 | Đồng bộ với `DB_DECISIONS_20261014.md` / `09_DATABASE_DESIGN.md`. **Bị thay thế:** "3 vai trò, technician/guard để sau" → 5 actor; "~20 bảng chờ duyệt" → 21 bảng đã duyệt; "mô hình vai trò chưa chốt" → `users.role`; "tiền `unsignedBigInteger`" → bổ sung `BIGINT` có dấu cho `invoice_items.amount` + HALF_UP từng dòng; "thời gian theo `APP_TIMEZONE` Asia/Ho_Chi_Minh" → timestamp UTC, DATE giờ VN; "pivot đặt tên số ít theo chữ cái" → tên theo thiết kế; "vi phạm nghiệp vụ → 422" → tách `409` cho xung đột trạng thái; "lưu thiết kế ở `docs/database/`" → `docs/09_DATABASE_DESIGN.md`. |

**Cập nhật LEASE-C 28/10 (ưu tiên trạng thái cũ):** nhận cọc/kích hoạt đã nối API + ADM-13 và nghiệm thu DB test, không chỉ schema. Contract tại brief §28, Plan §12.24, học tập §11.31. Backend 1212/10274/Pint232, frontend78/build/lint0 lỗi8 cảnh báo cũ; browser Desktop/Mobile và API theo phạm vi đã ghi. Dev vẫn20 bảng/16 migration nguyên vẹn, không migrate. DB-D65 U3 giữ periodic/final nhưng bỏ giới hạn một thanh lý/phòng/tháng, cần ALTER mới; DB-D66/67 đã duyệt P3/P9/P6/P7/P8/P11 chỉ DB test, không hỏi lại. U1 API theo tòa/MTR/U2/INV/PAY/CLOSE còn chưa hoàn thành. Các đoạn cũ nói còn chặn các quyết định trên là lịch sử.

**Cập nhật U1 28/10:** API giá theo tòa + ADM-08/tab tòa đã tích hợp trên DB test (Plan§12.25, brief§29, học tập§11.32). Backend1219/10529/Pint233, frontend80/build/lint0lỗi8cảnhbáocũ; live API/Browser Desktop-Mobile đã kiểm theo phạm vi. Pending ALTER U1 không sửa/promote; dev chưa schema scoped nên503. Fixture đã dọn, schema test global khôi phục; snapshot dev20bảng/16migration khớp nguyên vẹn. U3/MTR/U2/INV/PAY/CLOSE vẫn là việc tiếp theo, không gọi U1 hoàn thành toàn bộ điện nước. Không push/migration dev.

**U3 bổ sung28/10 — DB-D68:** periodic đang thuê UNIQUE theo hợp đồng/dịch vụ/kỳ; vacancy theo phòng/dịch vụ/kỳ. Chủ dự án đã chọn để tránh periodic A chặn hóa đơn B cùng phòng/tháng. Final vẫn theo hợp đồng/dịch vụ, giữ enum và không giới hạn số thanh lý/phòng/tháng. Pending ALTER mới đã test8/106, fullsuite1227/10635; không sửa M14, schema test khôi phục, dev không đổi. MTR code mới đang viết/chưa nghiệm thu, không gọi schema U3 là luồng điện nước hoàn thành. Plan§12.26/học tập§11.33 là bằng chứng mới, ưu tiên trạng thái cũ.

**MTR28/10 — ưu tiên trạng thái cũ:** GET/POST chỉ số chính thức + context và ADM-15 nhập một/hàng loạt đã tích hợp DB test, Plan§12.27/brief§30/học tập§11.34. Backend1257/11013/Pint244, frontend83/build/lint0lỗi8cảnhbáocũ; live API/Browser Desktop-Mobile theo phạm vi ghi, không coi mọi ca đã chạy. Fixture/schema test đã dọn, dev snapshot20bảng16migration không đổi. UI52nguồn/4đủ/48mộtphần/25API/0mock trên render. U2/INV/PAY/CLOSE chưa hoàn thành; DB-D69/Q13 vàDB-D70/Q8 đã CONFIRMED, không hỏi lại. Không push hoặc migration dev.

**U2-03 ngày28/10 — ưu tiên trạng thái cũ:** gửi ảnh private/lịch sử Resident và duyệt/từ chối Admin→MTR đã tích hợp DB test; API/AC brief§32, Plan§12.28, học tập§11.35. Backend1269/11243/Pint252, frontend85/build/lint0lỗi8cảnhbáocũ; liveAPI và browser Desktop/Mobile theo phạm vi, ca hết phiên browser chưa hoàn tất. Fixture7ảnh/metadata/DB/schema đã dọn, dev20bảng16migration khớp snapshot; prototype78hash nguyên vẹn. UI52nguồn/4đủ/48mộtphần/26API/0mock trên render. INV/PAY/CLOSE tiếp theo, provider/Sandbox chưa xác nhận. Mọi migration dev cần duyệt riêng, không push. Test ảnh bằng HTTP phải chú ý CLIroot tạo directoryprivate0700 khác chủ FPMwww-data; handoff đúng fixture, không mởpublic/777; Nginx test bodylimit cần20m như cấu hình dự án.
