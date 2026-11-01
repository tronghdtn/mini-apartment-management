# DB DECISIONS — 14/10/2026 — Supersedes for Phase 2

**Trạng thái:** Đã được người dùng chọn / ủy quyền lựa chọn hợp lý trong hội thoại 13–14/10/2026. Đây là nguồn thay thế ưu tiên cho **các quy tắc xung đột** trong `02_SYSTEM_DISCOVERY.md` v0.10, `PROJECT_CONTEXT.md` và `03`–`08` cũ; các quy tắc không xung đột tiếp tục có hiệu lực. Không tuyên bố tài liệu gốc đã được sửa trong repo.

## A. Quyết định và tác động

### Các quyết định bổ sung 27–30/10 — sau kiểm kê Full MVP

- **CONFIRMED DB-D71 / INV kỳ tương lai (28/10):** được chuẩn bị hóa đơn nháp trước kỳ, chỉ phát hành từ ngày đầu tháng hóa đơn theo giờ Việt Nam. Hóa đơn đã phát hành vẫn bất biến; không suy quyền migration dev.
- **CONFIRMED DB-D72 / INV tổng0đ (28/10):** hóa đơn tổng0 được phát hành với status=paid (đã tất toán), paid_amount=0; không tạo payment hoặc mã biên nhận thu tiền giả. Vẫn giữ số hóa đơn/thời điểm phát hành và lịch sử, không coi0đ là tiền đã thực nhận.

- **CONFIRMED DB-D69 / Q13 (28/10):** Admin có quyền được thêm Khoản khác vào hóa đơn nháp; bắt buộc tên khoản, số tiền VND và lý do/căn cứ thu hợp lệ. Cư dân xem được khoản thu của mình, lưu lịch sử thao tác. Không tự phát sinh khoản không có căn cứ/thỏa thuận, không sửa trực tiếp sau phát hành; sai sót theo quy trình điều chỉnh DB-D27. Chỉ triển khai/kiểm thử DB test, không migration dev.
- **CONFIRMED DB-D70 / Q8 (28/10):** người thuê đã thanh lý vẫn xem và thanh toán hóa đơn/công nợ cũ của chính mình; không yêu cầu hợp đồng active cho thao tác này và không lộ dữ liệu người khác. Hỗ trợ online và gửi minh chứng chuyển khoản; ảnh không là xác nhận thu. Chỉ ghi nhận khi Admin đối soát thực nhận hoặc xác nhận hợp lệ từ nhà cung cấp. Chưa có Sandbox/provider được xác nhận, tiếp tục Backend/giả lập tách biệt, không coi online thật đã hoạt động. Không migration dev.
- **CONFIRMED DB-D65 / U3:** giữ enum `periodic/final`; không giới hạn một lần thanh lý/phòng/tháng. Final gắn hợp đồng/lần thanh lý, không trùng cùng lần, không chỉ theo phòng/tháng. Phạm vi UNIQUE periodic được bổ sung bởi DB-D68 dưới đây. Giữ toàn bộ lịch sử, không tính trùng tiêu thụ giữa hóa đơn định kỳ và final. Chuẩn bị migration mới + test trên DB test, không sửa M14 cũ hoặc migration dev. Thiết kế chi tiết dùng generated conditional keys; chưa coi migration/API MTR đã được triển khai.
- **CONFIRMED DB-D68 / U3 bổ sung28/10:** chủ dự án chọn “Periodic theo hợp đồng khi đang thuê”: UNIQUE `(contract_id,service_id,period)` cho periodic có hợp đồng; periodic phòng trống vẫn UNIQUE `(room_id,service_id,period)`. Hai hợp đồng A/B cùng phòng/tháng có thể có periodic riêng, không để chỉ số A chặn hóa đơn B. Vẫn giữ kind periodic/final và final UNIQUE hợp đồng/dịch vụ; chuỗi mốc thực tế và snapshot hóa đơn phải chống tính trùng. Chỉ DB test, không migration dev.
- **CONFIRMED DB-D66 / P3/P9 (30/10):** duyệt trả quá hạn `overdue_return` với ghi chú bắt buộc; chủ nhà chấm dứt trước hạn ngoài MVP; nhận-trả cùng ngày không thu phí trước hạn, vẫn chốt điện nước/kiểm tra tài sản/đối soát cọc. Chỉ DB test.
- **CONFIRMED DB-D67 / P6/P7/P8/P11 (30/10):** duyệt cấu trúc kết quả/người/thời điểm/ghi chú kiểm tra trên contracts; Admin nhập từng dòng damage với lý do/căn cứ/ít nhất một ảnh private; loại dòng `damage`/`termination_fee`; alias contract và collections inspection_photo/damage_photo/waiver_evidence, Policy hợp đồng. MVP không yêu cầu cư dân ký trong hệ thống. Chỉ chuẩn bị/test DB test, không migration dev.

Các mục cũ còn ghi U3/P3/P6/P7/P8/P9/P11 chưa duyệt là lịch sử, bị cập nhật này thay thế. Quyết định không tự đồng nghĩa đã code/test/API/UI; trạng thái triển khai tại IMPLEMENTATION_PLAN.

| ID | Quyết định 14/10 | Nguồn cần chỉnh | Tác động |
|---|---|---|---|
| DB-D01 | **21 bảng** gồm 20 bảng cũ + `building_amenities` (PK ghép `building_id`, `amenity_id`). `room_amenities` chỉ cho tiện nghi riêng phòng; tiện nghi tòa không nhân bản xuống phòng. | `02` B.2.1, B.2.2; `PROJECT_CONTEXT` bảng; ERD; docs mô hình | Sửa 20→21, thêm N–N buildings/amenities; union amenities khi xem phòng |
| DB-D02 | **5 actor** là phạm vi triển khai: Khách, Cư dân, Admin, Nhân viên sửa chữa, Bảo vệ. `users.role` dùng `user/resident/admin/technician/guard`. | `02` A.2, A.4, A.8; `03`–`08`, layout/router/Policies | Thay nhãn `SNAPSHOT` DL-33 bằng `CONFIRMED` trong phần phạm vi vận hành, bổ sung test role |
| DB-D03 | **`amenities` khác `services`**: tiện nghi mô tả thuộc tính, dịch vụ là khoản thu. Một khái niệm có thể ở cả hai khi mục đích khác; không có FK/direct charge. | B.2, room detail, Service logic | Tránh thu phí chỉ do phòng có thang máy/bãi xe |
| DB-D04 | `ELECTRICITY`/`WATER` là hai `services` hệ thống có `billing_type=metered` và `unit=kWh/m3`, seed cố định. Tự gán vào `contract_services` khi contract active (đúng 1 lần/loại). | `02` BR-SVC, BR-MTR, B.2; seeders | `services.code`, `unit`, `price NULL metered`; `contract_services.unit_price NULL metered` |
| DB-D05 | `utility_prices.type` và `meter_readings.type` thay bằng FK `service_id` → `services.id`. `meter_readings` vẫn có `room_id`, `contract_id NULL` cho phòng trống và `invoice_id NULL` khi chưa tính. | `02` BR-PRC-01, BR-MTR-01..13, B.2; API DTO, ERD, tests | Unique tương ứng `(service_id,effective_from)` và `(room_id,service_id,period,kind)` |
| DB-D06 | Một contract có **một người thuê đại diện**, nhiều `contract_occupants`, một hóa đơn tháng chung chưa hủy, **nhiều payments**. Không cần co-occupant có account trong MVP. | BR-CTR/INV/PAY, UI, Policies | Người đại diện chịu nghĩa vụ còn nợ; người ở chung tự góp tiền hoặc chuyển khoản nhiều lần |
| DB-D07 | Tiền nguyên đồng VND: `BIGINT UNSIGNED` cho số không âm; **`BIGINT` có dấu** cho `invoice_items.amount`. Lượng có thập phân dùng `DECIMAL`. Tính bằng decimal chính xác, **HALF_UP đến đồng trên từng dòng**. | `02` B.2.3, `AGENTS.md`, `CLAUDE.md`, models/API/type/tests | Thay quy ước `DECIMAL(15,2)` cho tiền; tránh float, cho discount âm |
| DB-D08 | Timestamp lưu UTC, qua API ISO 8601 UTC, hiển thị Asia/Ho_Chi_Minh. `DATE` là ngày lịch Việt Nam, period ngày 1. | `02` B.2.3, `AGENTS.md`, Docker/MySQL config, FE | Không nhầm cuối ngày/cuối tháng khi convert |
| DB-D09 | **Dịch vụ cố định `per_room`, `per_person`, `per_unit` phân bổ theo số ngày sử dụng** ở tháng đầu/cuối hợp đồng (hoặc phần kỳ dịch vụ thực tế có hiệu lực). Phí trọn tháng nếu dùng trọn tháng; điện nước tính theo đồng hồ. | **Thay BR-SVC-04**, sửa BR-INV-03, BR-INV-12, BR-CTR-06, UF/UC liên quan | Phân bổ `(unit_price × quantity × days_used / days_in_month)`; hoàn credit dịch vụ khi thanh lý mà tháng đã issued |
| DB-D10 | Giữ 5 actor trong **21 bảng**, không thêm bảng nhân viên/bảo vệ. `maintenance_requests.assigned_to`, `assigned_at`, `handler_note`; lịch có `checked_in/out_at/by`, `guard_note`. | DL-33, BR-MNT-08/09, BR-APT-09, BR-NTF-03, ERD | StaffLayout route/Policy theo role, test 403 |

## B. Quy tắc ghi đè chính xác (dành cho tài liệu 02/08)

**BR-SVC-04 (thay toàn văn):** Dịch vụ định kỳ `per_room`, `per_person`, `per_unit` tính trọn tiền nếu sử dụng đủ tháng; nếu hợp đồng/dịch vụ chỉ có hiệu lực một phần tháng, tiền = `ROUND_HALF_UP(unit_price × quantity × số ngày hiệu lực giao nhau với kỳ / số ngày của tháng)`. `contract_services.start_date/end_date` lưu lịch sử hiệu lực, end_date inclusive. Điện/nước `metered` tính hoàn toàn từ `meter_readings`, không áp dụng chia ngày và không phát sinh phí cố định từ `contract_services`. Mỗi item snapshot lượng/giá/số ngày tính tiền; cấm thu lặp dòng.

**BR-INV-03 (bổ sung):** Hóa đơn tháng T = tiền phòng T + **dịch vụ định kỳ T với quy tắc pro-rata mới** + điện nước của T−1 + khoản điều chỉnh hợp lệ; hóa đơn đầu tiên chưa có điện nước kỳ trước không tạo chỉ số giả.

**BR-INV-12 (bổ sung):** Khi thanh lý giữa tháng và hóa đơn tháng đã issued đủ tiền, không sửa hóa đơn cũ; hóa đơn `final` cộng các khoản chưa lập và `discount` cho cả **tiền thuê lẫn dịch vụ định kỳ** những ngày không còn hiệu lực đã thu trong hóa đơn tháng đó; tính theo khoản đã lập/snapshot để tránh bù trùng. Tổng final >= 0; phần credit vượt số dương xử lý hoàn trả **ngoài hệ thống** theo `contracts.closure_note` trong MVP, không sinh hóa đơn âm/credit note.

**BR-PRC-01:** Thay mọi `type=electricity/water` ở `utility_prices` bằng `service_id` FK tới `services` có `billing_type=metered`, giá hiệu lực gần nhất tới đầu kỳ tiêu thụ.

**BR-MTR-01 / B.2:** Unique mới `(room_id,service_id,period,kind)` thay `(room_id,type,period,kind)`. Kế thừa giới hạn MVP tối đa một `final` một phòng/loại dịch vụ/tháng; khóa theo phòng và dịch vụ. Mọi nhắc tới `meter_readings.type` cần chuyển thành tra cứu `services.code` / `service_id`.

**BR-CTR-05:** Thêm bước `contract_services` tạo Điện và Nước mặc định trong transaction kích hoạt, có xử lý idempotent/unique-in-period.

**DL-33:** Không còn chỉ là snapshot tùy chọn; **5 actor chính thức triển khai** theo quyết định người dùng mới, các trường phụ thuộc giữ nguyên nghiệp vụ giới hạn quyền ở BR-MNT-08/09, BR-APT-09.

**B.2 Database Direction:** 21 bảng gồm 20 bảng cũ và `building_amenities`; giữ `amenities`, `room_amenities`, `services`. ERD khái niệm/quan hệ, BFD, UC, API và ảnh sơ đồ Word cũ **cần cập nhật nguồn vẽ**, không dùng để lập migrations nếu mâu thuẫn.

**B.2.3:** `money DECIMAL(15,2)` → `BIGINT UNSIGNED` đối với giá/trị không âm, `BIGINT SIGNED` đối với các dòng giảm trừ; quantity/readings `DECIMAL(10,2)`; timestamps UTC, dates VN local; HALF_UP từng dòng.

## C. Những quy tắc nguồn cũ vẫn giữ (không xóa do update)

- Một phòng / một người đại diện tối đa một hợp đồng active; hợp đồng active không cho đổi người thuê/phòng/giá/cọc/ngày; contract renewal tạo hợp đồng mới khi làm SHOULD.
- Invoice issued bất biến; cancellation không có pending/confirmed payments; thay thế invoice cancelled qua related_invoice_id; adjustment SHOULD; không tổng âm.
- Hóa đơn kỳ T tiền T + utility T−1; lưu readings của phòng trống với contract_id NULL, không thu cho resident; chốt giữa tháng kind final.
- Giữ cơ chế tính cọc riêng trên contracts; khấu trừ chỉ khi terminate vào payments.method=deposit, **không tính doanh thu thực thu**, phần còn nợ giữ nguyên.
- VietQR chỉ hướng dẫn thanh toán; cư dân gửi một ảnh minh chứng, Admin kiểm tra ngân hàng và xác nhận thủ công, không tích hợp cổng thanh toán.
- Trường hợp chưa có migration `users`/`sessions`, ưu tiên migration framework sẵn có của repo, **không tạo trùng**.

## D. Lưu ý chuyển đổi tài liệu & code

1. Đây là **đổi định hướng schema khi chưa tạo migrations nghiệp vụ**; nếu thực tế đã có DB/dữ liệu, không tự dùng `migrate:fresh` hoặc mất dữ liệu: phải rà soát migration & backup.
2. Sync `AGENTS.md`, `CLAUDE.md`, docs `02`–`08`, `PROJECT_CONTEXT`, ERD nguồn. Không tự bịa số FR/BR sau khi thêm actor hoặc cập nhật quy tắc; nếu cập nhật bảng đếm FR/UC/BR phải đếm lại từ nội dung tài liệu.
3. Riêng phần co-occupants: `contract_occupants` là người ở cùng, **không** thay thế mô hình hai hợp đồng nối tiếp A/B khi đổi phòng giữa tháng.
4. Đặc tả thiết kế này không là bằng chứng tính đúng đắn thực tế. Phải chạy MySQL migrations + feature tests trước khi báo đã triển khai.

## E. Quyết định bổ sung — chốt câu hỏi mở Q1–Q12 (14/10/2026)

**Trạng thái:** Chủ dự án chốt sau khi rà soát `DATABASE_IMPLEMENTATION_PLAN.md` §8. Các mục dưới đây **bổ sung/làm rõ** A–D, không xóa quyết định cũ; nơi nào mâu thuẫn thì mục E được ưu tiên.

| ID | Câu hỏi | Quyết định | Tác động |
|---|---|---|---|
| DB-D11 (Q1) | DB cho test | Test chạy trên **MySQL 8.4**, database riêng `mini_apartment_test`, tách biệt hoàn toàn database dev `mini_apartment` | `phpunit.xml`, `tests/TestCase.php` (guard `_test`), `docker/mysql/init`, `AGENTS.md` §8 |
| DB-D12 (Q2) | `users.email_verified_at` | **Giữ**, nullable. MVP chưa triển khai xác thực email | `09` §3.1; migration ALTER `users` không xóa cột |
| DB-D13 (Q3) | Mã nghiệp vụ | ID tự tăng, đệm **tối thiểu 4 chữ số**, **không reset** theo tháng (ví dụ `MR-202610-0012`, `INV-202611-12345`). Cột mã **cho phép NULL** trước khi sinh, cập nhật trong **cùng transaction**, UNIQUE. **Hóa đơn chỉ sinh mã khi phát hành**, **biên nhận khi xác nhận thanh toán**, hợp đồng khi kích hoạt | `contract_number`, `invoice_number`, `receipt_number`, `maintenance_requests.code`, `viewing_appointments.code` đều NULL được |
| DB-D14 (Q4) | Tên generated column `invoices` | Chính xác `live_monthly_contract_id`, `live_monthly_period`, `live_final_contract_id` (unique `uq_live_monthly`, `uq_live_final`) | Sửa `09` §6 mục 2 (trước ghi `active_monthly_*`) |
| DB-D15 (Q5) | `meter_readings.period` | `period` là **tháng tiêu thụ** (ngày 01); `reading_date` là **ngày thực tế ghi chỉ số**, có thể thuộc tháng sau. Admin **chọn** kỳ khi nhập định kỳ; giao diện có thể gợi ý nhưng **không tự gán** tháng trước chỉ vì ngày ghi ≤ 5. Chỉ số `final` phải đối chiếu thời điểm bàn giao thực tế, hợp đồng chịu phí và chuỗi chỉ số; **không đủ căn cứ thì chặn và báo lỗi, không suy đoán** | Thay câu "`contract_id` tự xác định từ hợp đồng hiệu lực tại `reading_date`" trong `09` §3.13; thêm test DB-21..DB-23 |
| DB-D16 (Q6) | `services.name` | UNIQUE **toàn bảng** (không phân biệt active/inactive) | `09` §3.10 |
| DB-D17 (Q7) | `notifications.data` | Kiểu **JSON** (sửa từ `text` của stub Laravel) | Migration notifications |
| DB-D18 (Q8) | Giá điện nước mẫu | **Không seed** vào seeder hệ thống; giá do Admin cấu hình | `09` §3.12, §8 bước 5 |
| DB-D19 (Q9) | `users.id_number` (CCCD) | Ẩn khỏi serialization mặc định (`$hidden`); chỉ Resource dành cho Admin, khi có quyền, mới trả về | Model `User`, Resource |
| DB-D20 (Q10) | CHECK constraint | **Chưa thêm** CHECK thủ công trong MVP; bắt buộc validate ở FormRequest/Service, cùng FK, UNIQUE, UNSIGNED của MySQL | `09` §3 (ghi chú đầu mục) |
| DB-D21 (Q11) | Sửa bảng `users` | Tạo **migration ALTER mới**; không sửa migration framework đã chạy | Kế hoạch M01 |
| DB-D22 (Q12) | Thư mục bàn giao | Chỉ xóa thư mục handoff dư thừa **sau khi** xác nhận mọi file chính thức đã đồng bộ; **không xóa tài liệu nguồn** | Quy trình dọn repo |

## F. Quyết định bổ sung — duyệt Nhóm 1, chốt E1–E5 (14/10/2026)

**Trạng thái:** Chủ dự án chốt khi duyệt Nhóm 1 migrations. Bổ sung A–E; mâu thuẫn thì mục F được ưu tiên. Cách áp dụng chi tiết và các điểm **còn mở** nằm ở `DATABASE_IMPLEMENTATION_PLAN.md` §5–§6.

| ID | Chủ đề | Quyết định | Tác động |
|---|---|---|---|
| DB-D23 | Queue | `QUEUE_CONNECTION=sync` cho MVP; **không** bổ sung queue worker | `backend/.env(.example)`, `config/queue.php` mặc định `sync` |
| DB-D24 (E1) | Bàn giao cùng ngày | **Được phép**, theo thứ tự: chốt đồng hồ hợp đồng cũ (`final`) → thanh lý hợp đồng cũ → kích hoạt hợp đồng mới. **Không suy luận thứ tự hai lần bàn giao chỉ bằng cột DATE**; phải kiểm tra chính xác hợp đồng chịu phí và tránh tính trùng | Thứ tự xác định bằng quy trình + timestamp (`meter_readings.created_at`, `contracts.closed_at`, `contracts.activated_at`), không bằng `reading_date` |
| DB-D25 (E2) | Tiêu thụ qua nhiều tháng | Phải có **mốc chỉ số thực tế** đủ để chia theo từng kỳ; **không** tự phân bổ theo ngày, **không** tạo dữ liệu giả. Chỉ số `final` thuộc **kỳ tiêu thụ cuối cùng**, sau khi các kỳ trước đã được chốt | Chuỗi chỉ số trong một hợp đồng phải liên tục theo kỳ; thiếu kỳ → chặn |
| DB-D26 (E3) | Giá điện nước | `utility_prices.effective_from` là **ngày đầu tháng**. Một kỳ tiêu thụ dùng **một** mức giá snapshot theo giá hiệu lực đầu kỳ. **Không** áp dụng thay giá giữa tháng trong MVP | Validate `effective_from` ngày 01; `meter_readings.unit_price` = giá có `effective_from ≤ period` mới nhất |
| DB-D27 (E4) | Hóa đơn đã phát hành cần sửa | **Không** sửa hóa đơn đã phát hành. Chưa có payment pending/confirmed → cho phép **hủy và lập lại** (`related_invoice_id`). Có pending → xử lý pending trước. Có confirmed → báo cần **quy trình điều chỉnh**; không tự sửa, không bỏ sót khoản tiền | 409 kèm thông điệp phân biệt hai trường hợp |
| DB-D28 (E5) | Ngày đo `final` | `reading_date` của `final` **bằng ngày trả phòng thực tế** (`contracts.actual_end_date`). Được nhập muộn nếu ngày đo đúng và chuỗi chỉ số **chưa phát sinh dữ liệu phụ thuộc** | Chặn nếu đã có chỉ số sau ngày trả phòng của cùng phòng/dịch vụ |
| DB-D29 | Thứ tự khóa | Một thứ tự `lockForUpdate()` thống nhất cho mọi Service (sửa mâu thuẫn `terminate` khóa contracts → rooms); bổ sung test concurrency khi triển khai | `DATABASE_IMPLEMENTATION_PLAN.md` §6 |
| DB-D30 | Bảo vệ DB test | Giữ hai lớp chặn; thêm **tài khoản MySQL riêng** `mini_apartment_test` chỉ có quyền trên database `mini_apartment_test`; kiểm tra **chính xác** tên kết nối/DB/tài khoản thay vì hậu tố `_test` | `config/database.php` (`mysql_test`), `phpunit.xml`, `tests/TestCase.php`, `docker/mysql/init`, `DB_TEST_PASSWORD` |

## G. Quyết định bổ sung — chốt O1–O6, duyệt Nhóm 2 (14/10/2026)

**Trạng thái:** Chủ dự án chốt khi duyệt Nhóm 2. Bổ sung A–F; mâu thuẫn thì mục G được ưu tiên. Quy tắc kiểm tra chi tiết: `DATABASE_IMPLEMENTATION_PLAN.md` §5.

| ID | Chủ đề | Quyết định | Tác động / cách áp dụng |
|---|---|---|---|
| DB-D31 (O1) | Chỉ số đầu người mới > `final` người cũ | **Cho phép** nếu Admin **xác nhận** chênh lệch. Phần chênh **không tính cho cả hai hợp đồng**; hệ thống phải **cảnh báo** và **ghi nhận lý do trong dữ liệu hiện có** | *(Cách lưu đã thay bằng cột riêng — xem DB-D40.)* Ban đầu: lý do ghi vào `contracts.note` của hợp đồng mới. Thiếu xác nhận → 422 kèm cảnh báo. Chỉ số đầu **nhỏ hơn** `final` → luôn 422 |
| DB-D32 (O2) | Ngày bàn giao | `contracts.actual_end_date` **là ngày bàn giao** và là **mốc loại trừ** khi tính ngày thuê: hợp đồng cũ tính tiền **đến hết D−1**; khi bàn giao cùng ngày D, ngày D **chỉ thuộc hợp đồng mới**. Áp dụng **nhất quán cho tiền phòng và dịch vụ định kỳ**, kể cả khi hóa đơn tháng đã phát hành | Ngày tính tiền của hợp đồng = `[start_date, actual_end_date)` (bao gồm `start_date`, loại trừ `actual_end_date`). Khi thanh lý, `contract_services.end_date` (inclusive) = `actual_end_date − 1`. Hóa đơn tháng đã phát hành đủ tháng → `final` có dòng `discount` cho các ngày từ `actual_end_date` đến cuối tháng. Chỉ số `final` vẫn đo ngày `actual_end_date` (DB-D28) |
| DB-D33 (O3) | Thêm giá điện/nước | **Không** thêm giá có hiệu lực làm thay đổi kỳ **đã có bản ghi chỉ số hoặc hóa đơn**. Giá mới phải hiệu lực từ **đầu một tháng hợp lệ** | `effective_from` = ngày 01 **và** lớn hơn mọi `meter_readings.period` của dịch vụ đó (hóa đơn điện nước luôn lấy từ reading). Không sửa/xóa dòng giá đã được dùng |
| DB-D34 (O4) | Thiếu chỉ số khi lập hóa đơn tháng | **Chặn** lập hóa đơn tháng T và báo lỗi rõ nếu thiếu chỉ số kỳ tiêu thụ bắt buộc. **Chỉ miễn** khi hợp đồng **thực sự không có ngày tính tiền nào** trong kỳ T−1 — không dựa vào việc đây là hóa đơn đầu tiên | Bắt buộc: mọi dịch vụ metered của hợp đồng có ngày tính tiền trong T−1 (theo DB-D32) phải có reading `period = T−1` thuộc hợp đồng. Thiếu → 422 liệt kê dịch vụ/kỳ thiếu |
| DB-D35 (O5) | Độ trễ ghi chỉ số | **Không giới hạn cứng** số ngày trễ trong MVP. Nhưng **chặn** mọi trường hợp phá chuỗi chỉ số, sai hợp đồng chịu phí hoặc làm thay đổi hóa đơn đã phát hành chưa qua quy trình | Áp dụng R1–R11 (kế hoạch §5.2); không có kiểm tra "N ngày" |
| DB-D36 (O6) | Vai trò sau thanh lý | **Giữ** `resident` để truy cập lịch sử hợp đồng, hóa đơn, công nợ. "Đang thuê" **suy ra từ hợp đồng active**; thao tác cần hợp đồng active vẫn bị chặn | `User::hasActiveContract()`; Policy kiểm tra hợp đồng active, không chỉ `role` |
| DB-D37 | Ghi/chốt chỉ số cùng ngày | **Không** suy luận thứ tự từ DATE; bảo đảm quy trình tuần tự hoặc **từ chối** nếu không đủ dữ liệu để xác định | R7 (chặn `periodic` trùng ngày bàn giao), thứ tự quy trình `final` → thanh lý → kích hoạt |
| DB-D38 | Duyệt Nhóm 2 | Phương án A: Models + relationships + casts. **12 bảng / 10 Model** (Nhóm 1: 5 bảng, Nhóm 2: 7 bảng; 2 pivot `building_amenities`, `room_amenities` dùng `belongsToMany`, không Model). `ContractStatus::Expired`, `DepositStatus::Transferred` **khai báo sẵn** cho gia hạn (SHOULD), **chưa mở chuyển trạng thái** trong MVP | 10 Model: `User`, `Building`, `Amenity`, `Service`, `Setting`, `Room`, `Contract`, `ContractOccupant`, `ContractService`, `UtilityPrice` |

## H. Quyết định bổ sung — chốt O7–O9, duyệt Nhóm 3 (14/10/2026)

**Trạng thái:** Chủ dự án chốt khi duyệt Nhóm 3. Bổ sung A–G; mâu thuẫn thì mục H được ưu tiên.

| ID | Chủ đề | Quyết định | Tác động / cách áp dụng |
|---|---|---|---|
| DB-D39 (O7) — **BỊ THAY bởi DB-D43** (phần ý nghĩa `end_date`) | `contracts.end_date` | ~~`end_date` là ngày bàn giao dự kiến~~ — xem DB-D43. Nguyên văn cũ: `end_date` là **ngày bàn giao dự kiến**, **không** tính vào số ngày thuê. `actual_end_date` là ngày bàn giao thực tế, **cùng quy ước nửa mở** `[start_date, actual_end_date)`. Hợp đồng còn `active` dù đã quá `end_date` thì **tiếp tục tính tiền** các kỳ phát sinh, không tự dừng ở ngày kết thúc dự kiến | Hợp đồng 1 năm từ 01/10/2026 có `end_date = 2027-10-01`. `end_date > start_date` giữ nguyên. Không có job tự kết thúc hợp đồng |
| DB-D40 (O8) | Ghi nhận chênh lệch chỉ số | Thêm vào `contracts`: `meter_gap_reason TEXT NULL`, `meter_gap_confirmed_by BIGINT UNSIGNED NULL` FK → `users.id`. Khi chỉ số đầu hợp đồng mới **cao hơn chỉ số chốt gần nhất**, bắt buộc lý do + Admin xác nhận; **`activated_at`** là mốc thời gian kích hoạt/xác nhận. **Không** cho sửa thông tin xác nhận qua form cập nhật hợp đồng active thông thường. **Không tạo bảng mới** | Đã có trong baseline M09, FK `RESTRICT`; M09 đã commit, thay đổi tiếp theo phải dùng ALTER mới sau duyệt. Hai cột không nằm trong `#[Fillable]`. Một lý do chung cho cả điện và nước. Thay cách ghi vào `contracts.note` ở DB-D31 |
| DB-D41 (O9) | Thanh lý ngay ngày bắt đầu | **Cho phép** Admin thanh lý với `actual_end_date = start_date`, **bắt buộc có lý do**. Tiền phòng và phí dịch vụ định kỳ theo ngày = 0; điện nước tính theo chỉ số thực tế nếu có; tiền cọc đối soát bình thường. **Không** tạo trạng thái hợp đồng mới | Dùng trạng thái `terminated` hiện có. Cột lưu "lý do" cần xác nhận — xem kế hoạch §5.4 (O10) |
| DB-D42 | Duyệt Nhóm 3 | M13 `invoices`, M14 `meter_readings`, M15 `invoice_items`, M16 `payments`; 6 Enum; 4 Model → **14 Model / 16 bảng**. Chỉ chạy trên `mini_apartment_test` | `InvoiceType::Adjustment` khai báo sẵn (SHOULD), chưa mở luồng |

## I. Quyết định bổ sung — hợp đồng, thanh lý, bồi thường, kiểm tra tài sản (14/10/2026)

**Trạng thái:** Các dòng dưới đây là **CONFIRMED** bởi chủ dự án. Mâu thuẫn với A–H thì mục I được ưu tiên. Những chỗ **chưa chốt** (cấu trúc lưu, mã bổ sung, câu hỏi phạm vi) **không** nằm ở đây mà ở `DATABASE_IMPLEMENTATION_PLAN.md` §14 (đề xuất P1–P12, chờ duyệt).

| ID | Chủ đề | Quyết định (CONFIRMED) | Tác động |
|---|---|---|---|
| DB-D43 (O7, thay DB-D39) | Ngày kết thúc | `contracts.end_date` là **ngày cuối cùng cư dân được ở, tính cả ngày đó** (inclusive). `actual_end_date` là **ngày bàn giao thực tế**, không tính vào ngày ở của người thuê cũ. Trả phòng **đúng hạn**: `actual_end_date = end_date + 1 ngày`. Hợp đồng quá hạn mà vẫn `active` → **tiếp tục tính tiền sử dụng thực tế** (giữ phần này của DB-D39) | Ngày tính tiền vẫn `[start_date, actual_end_date)` (DB-D32 không đổi). Hợp đồng 1 năm từ 01/10/2026 có `end_date = 2027-09-30`. Phải rà validation `end_date` và dữ liệu test (kế hoạch §14.2) |
| DB-D44 (O8) | Chênh lệch điện nước | **Giữ phương án B**: lưu lý do chênh lệch + Admin xác nhận | Cấu trúc hiện tại (1 lý do chung) **chưa phân biệt** điện/nước → đề xuất sửa schema P2 |
| DB-D45 (O9) | Nhận và trả cùng ngày | Cho phép Admin thanh lý; **số ngày tính tiền phòng = 0**; **bắt buộc** ghi lý do, **chốt chỉ số thực tế** và **đối soát cọc** theo quy trình | `actual_end_date = start_date`; `closure_reason = same_day` + `closure_note` bắt buộc (DB-D46) |
| DB-D46 (O10) | Lý do thanh lý | `closure_reason` lưu **mã phân loại**, `closure_note` lưu giải thích chi tiết. `on_time` (đúng hạn, ghi chú **không** bắt buộc); `early_termination` (trước hạn, ghi chú **bắt buộc**); `same_day` (trả trong ngày nhận phòng, ghi chú **bắt buộc**). Phân loại phải **nhất quán với ngày bàn giao thực tế** | Không đổi schema (`VARCHAR(50)` + Enum mới). Nhất quán: `same_day` ⇔ `actual_end_date = start_date`; `on_time` ⇔ `actual_end_date = end_date + 1`; `early_termination` ⇔ `start_date < actual_end_date ≤ end_date`. **Trả quá hạn** (`actual_end_date > end_date + 1`) **chưa có mã** → P3 |
| DB-D47 | Bồi thường trả trước hạn | Điều khoản xác định **ngay khi ký hợp đồng**, hỗ trợ 3 loại: **không bồi thường**; **số tiền cố định**; **hệ số × tiền thuê tháng** đã snapshot vào hợp đồng. **Không** mặc định một tháng tiền thuê. **Hệ thống tự tính** khi thanh lý; Admin **không** được tùy tiện đổi điều khoản đã ký | Cần cột điều khoản trên `contracts` (P4) và loại dòng hóa đơn riêng (P7). Điều khoản bất biến sau kích hoạt |
| DB-D48 | Miễn bồi thường | Chỉ được miễn khi **đáp ứng điều kiện đã thỏa thuận và ghi trong hợp đồng**; Admin xác nhận điều kiện được áp dụng **cùng căn cứ phù hợp** | Cách nhập/lưu nhiều điều kiện **chưa chốt** → P5 |
| DB-D49 | Kiểm tra tài sản trước thanh lý | **Bắt buộc** kiểm tra và xác nhận tình trạng phòng. Không hư hỏng bất thường → phí bồi thường tài sản = 0. Có hư hỏng thuộc trách nhiệm người thuê → ghi **hạng mục, lý do, số tiền có căn cứ, ảnh minh chứng**. Khoản này **tách biệt** với phí trả trước hạn. Các khoản phải thu hợp lệ đưa vào **hóa đơn tất toán** (`final`); **tiền cọc đối soát riêng** | Cách lưu kết quả kiểm tra/minh chứng → P6 |
| DB-D50 | Nhóm 4 | Đồng ý **về mặt kế hoạch** 4 bảng `maintenance_requests`, `viewing_appointments`, `attachments`, `notifications`; **chấp thuận O11**: thêm index `(notifiable_type, notifiable_id, read_at)` | Chưa triển khai; collection/morph alias của `attachments` phụ thuộc P6, P8 |

## J. Authentication — email tùy chọn (22/10/2026)

**Trạng thái: CONFIRMED — chủ dự án đã duyệt** quy tắc và triển khai thay đổi Database trong yêu cầu “AUTHENTICATION — BƯỚC 1: EMAIL TÙY CHỌN”. Mục này ghi đè yêu cầu email NOT NULL ở `09` §3.1. Phạm vi bước 1 ban đầu không cho chạy dev; **bước 3.5 sau đó được chủ dự án duyệt riêng và đã áp dụng**, biên bản ở DB plan §16. Không cho phép chạy migrations dev khác.

| ID | Chủ đề | Quyết định (CONFIRMED) | Tác động |
|---|---|---|---|
| DB-D51 | Đăng ký với email tùy chọn | Bắt buộc họ tên, số điện thoại, mật khẩu; email tùy chọn. `users.email` giữ `VARCHAR(191)` và UNIQUE, đổi sang nullable. Nhiều tài khoản được có email NULL; email có giá trị không được trùng. Không dùng email giả hoặc chuỗi rỗng thay NULL. `users.phone` vẫn NOT NULL UNIQUE | Migration ALTER mới `2026_10_22_100001_make_users_email_nullable`; giữ migration đã commit, dữ liệu và chỉ mục hiện có; cập nhật schema tests. Phạm vi bước 1 chỉ CSDL; trạng thái API/frontend mới hơn ở Spec Auth và Plan |

**Rollback an toàn:** `down()` kiểm tra email NULL trước khi đổi về NOT NULL. Nếu còn tài khoản thiếu email, dừng với thông báo rõ; không xóa tài khoản, không điền email giả, không sửa dữ liệu tự động. Chỉ rollback sau khi chủ dự án quyết định cách thu thập/bổ sung email hợp lệ từ người dùng. Khi thực hiện trên môi trường dùng chung cần backup, rà soát dữ liệu và tạm dừng thao tác ghi tài khoản trong suốt kiểm tra + ALTER; MySQL DDL không được bảo vệ bằng transaction thông thường. UNIQUE email và SĐT phải còn nguyên sau cả `up()` lẫn `down()`.

## K. Authentication — tạo Admin bằng Artisan (22/10/2026)

**Trạng thái: CONFIRMED — chủ dự án đã duyệt** triển khai `php artisan app:create-admin` để tạo Admin ban đầu hoặc thêm Admin. Trong lượt triển khai, chủ dự án xác nhận **Admin bắt buộc có email**; đây là quy tắc riêng của thao tác cấp Admin, không đổi `users.email` nullable theo DB-D51.

| ID | Chủ đề | Quyết định (CONFIRMED) | Tác động |
|---|---|---|---|
| DB-D52 | Cấp Admin qua Artisan | Người có quyền vận hành chạy command tương tác, nhập họ tên, SĐT, email bắt buộc và mật khẩu nhập ẩn. Chỉ tạo tài khoản mới `role = admin`, `status = active`; không nâng quyền hoặc mở khóa tài khoản cũ, không tự coi email đã xác minh, không dùng mật khẩu mặc định. Email/SĐT trùng bị từ chối. Không có API tạo Admin công khai | Command + kiểm thử, không đổi Model/schema/frontend. Không chạy migration hoặc tạo Admin thật trên DB dev trong lượt này. Chi tiết sử dụng, validation và kiểm thử ở `AUTHENTICATION.md` |

## L. Authentication — API phiên đăng nhập và chuẩn hóa (22/10/2026)

**Trạng thái: CONFIRMED.** Chủ dự án yêu cầu triển khai Backend Authentication bước 3; xác nhận riêng quy SĐT Việt Nam `+84/84` về `0`, email bỏ khoảng trắng đầu/cuối và chuyển chữ thường. Không tự sửa dữ liệu cũ.

| ID | Chủ đề | Quyết định (CONFIRMED) | Tác động |
|---|---|---|---|
| DB-D53 | Auth API / định danh | Đăng nhập email hoặc SĐT + mật khẩu, Sanctum SPA session cookie. Tự đăng ký chỉ nhận `user/active`, không nhận quyền/trạng thái từ client; email tùy chọn. Dùng chung chuẩn hóa email và SĐT cho đăng ký/đăng nhập/Artisan. Chặn tài khoản khóa cả sau đăng nhập; quyền do Laravel kiểm tra; không bắt buộc xác minh email để đăng nhập trong bước này | Không đổi schema, không chạy migrations dev. Giữ 5 Enum vai trò. Không có API cấp Admin/nhân viên. Endpoint và response tại `API_AUTHENTICATION.md`; dữ liệu SĐT cũ mơ hồ bị từ chối đăng nhập bằng số đó, không tự gộp tài khoản |

## M. Cài đặt — giới hạn số ngày (23/10/2026)

**CONFIRMED — chủ dự án chọn “1–365 cho cả hai” trong lượt CAT-02b/03b.**

| Mã | Chủ đề | Quyết định | Tác động |
|---|---|---|---|
| DB-D54 / CAT-D01 | Cấu hình số ngày MVP | `invoice.due_days` và `contract.expiring_warning_days` là số nguyên từ1 đến365, không nhận0. Mặc định đã thiết kế vẫn lần lượt5 và30 | Validate tại API Admin; lưu chuỗi trong settings.value TEXT theo type integer hiện có, không đổi schema hoặc tự sửa dữ liệu dev. Chưa có quyết định mới về giới hạn/ghi các trường ngân hàng/hệ thống; không tự mở API ghi settings tùy ý |

## N. Tiện nghi đã lưu trữ trên trang quản trị (23/10/2026)

**CONFIRMED — chủ dự án chọn “Hiện kèm nhãn Đã lưu trữ”.**

| Mã | Chủ đề | Quyết định | Tác động |
|---|---|---|---|
| DB-D55 / CAT-D02 | Hiển thị tiện nghi đã lưu trữ còn được gán | Trang chi tiết tòa/phòng vẫn hiển thị tiện nghi đó, kèm nhãn **Đã lưu trữ**. Giữ nguyên liên kết hiện có. Lát cắt hiện tại chỉ cho gán/gỡ tiện nghi đang hoạt động; chưa khôi phục hoặc gỡ riêng liên kết đã lưu trữ | Ghép panel vào hai trang hiện có; không thay schema, giá, quyền, hợp đồng hoặc trang công khai. Spec/AC tại brief §19 |


## O. USR — cấp tài khoản nhân viên (23/10/2026)

**CONFIRMED — chủ dự án trả lời “Duyệt phương án trên” cho gói cấp Kỹ thuật viên/Bảo vệ.**

| Mã | Quyết định | Tác động |
|---|---|---|
| DB-D56 / USR-D01 | Admin cấp tài khoản mới technician/guard; email tùy chọn, thiếu lưu NULL. Admin nhập mật khẩu ban đầu dạng ẩn + xác nhận theo quy tắc hiện có, bàn giao thủ công. Không mật khẩu mặc định, không trả/log mật khẩu; chưa lời mời email hoặc bắt đổi mật khẩu lần đầu. Admin biết mật khẩu ban đầu là nhược điểm đã được trình bày | Không schema. Gán active tại server, email_verified_at giữ NULL; không sửa/nâng quyền tài khoản cũ, không đổi phiên Admin sang nhân viên. Không mở API tạo Admin. Phạm vi khóa được duyệt riêng sau gói này tại DB-D57/USR-D02 |

## P. USR — khóa/mở khóa tài khoản (23/10/2026)

**CONFIRMED — phương án A, phê duyệt trực tiếp của chủ dự án.**

| Mã | Quyết định | Tác động |
|---|---|---|
| DB-D57 / USR-D02 | Admin active chỉ khóa/mở khóa user/resident/technician/guard; cấm chính mình và mọi tài khoản Admin. Chỉ đổi users.status active/locked; không xóa tài khoản/hợp đồng/hóa đơn/lịch sử, không đổi mật khẩu/role. Tài khoản locked không được đăng nhập hoặc dùng API cần xác thực, kể cả phiên cũ | Dùng schema hiện có, không migration. Giữ AuthService/EnsureActiveAccount, kiểm thử qua cookie thật. Contract/API/AC tại brief§22; chỉnh hồ sơ tách riêng khi đủ quyết định |


## Q. USR — sửa họ tên (23/10/2026)

**CONFIRMED DB-D58 / USR-D03 — chủ dự án duyệt chỉ sửa họ tên/tên hiển thị.** Admin active sửa duy nhất users.full_name trên trang ADM-10 của tài khoản đang xem, theo quyền sửa hồ sơ Admin đã có. SĐT, email, mật khẩu, role, status, dữ liệu pháp lý và lịch sử giữ nguyên. Đây không phải API tự sửa hồ sơ của các vai trò khác, không xác minh định danh, không thay tên pháp lý trên tệp hợp đồng. Khóa/mở khóa vẫn theo DB-D57, cấm mọi Admin. Không schema/migration. API/AC tại brief§23.

## R. CTR — đơn giá dịch vụ hợp đồng (24/10/2026)

**CONFIRMED DB-D59 / CTR-D01 / Q7:** chủ dự án chọn “Lấy giá danh mục và lưu snapshot”. Laravel lấy đơn giá từ danh mục khi thêm dịch vụ vào hợp đồng, lưu vào `contract_services.unit_price`; không nhận đơn giá thương lượng từ React. Thay đổi giá danh mục không sửa snapshot đã lưu. Điện/Nước vẫn metered, đơn giá NULL và chỉ tự thêm khi kích hoạt. Không thay schema, không duyệt P4–P8 hoặc quy trình cọc Q15. Lát cắt nháp tại brief §25; thay dịch vụ hợp đồng active là task riêng theo quy tắc hiệu lực tháng sau.

## S. Phòng công khai — tiện nghi (24/10/2026)

**CONFIRMED DB-D60 / ROOM-PUB-D01:** chủ dự án chọn Public chỉ dùng tiện nghi chưa lưu trữ: không hiển thị hoặc dùng tiện nghi có `deleted_at` để lọc phòng công khai. Vẫn lấy hợp tiện nghi tòa và phòng, loại trùng theo ID (DB-D01). Không xóa/sửa liên kết cũ; Admin tiếp tục hiện liên kết với nhãn “Đã lưu trữ” theo DB-D55. Không schema/migration. API contract/tiêu chí nghiệm thu tại FRONTEND_DESIGN_BRIEF.md §26.

## T. Phê duyệt Full MVP và hợp đồng — 27/10/2026

**CONFIRMED DB-D61 / P4 + P5-B:** chủ dự án duyệt chuẩn bị migration và kiểm thử **chỉ DB test** theo DB plan §14.4: phí trước hạn `none` / `fixed` / `rent_multiple`, không mặc định phát sinh phí; chỉ theo điều khoản đã thỏa thuận. Lưu điều khoản và điều kiện miễn dạng snapshot trên hợp đồng, thay cấu hình không đổi hợp đồng cũ. MVP chỉ miễn toàn bộ, không miễn một phần. Kiểm thử đúng hạn, trước hạn, không phí và miễn phí. Không duyệt migration dev, P6/P7/P8 hoặc các điểm P3/P9/P11 chưa chốt.

**CONFIRMED DB-D62 / Q15:** nếu `deposit_amount > 0`, Admin phải xác nhận đã thực nhận đủ cọc trước kích hoạt; cọc 0 không cần xác nhận thu. Không ghi cọc thành doanh thu tiền thuê. Chưa tự mở API ghi cọc hoặc thêm cột người nhận ngoài thiết kế được duyệt.

**Phạm vi mới được giao:** tích hợp chọn lọc `ui-antigravity-full/` vào `frontend/`, hoàn thiện các module đủ điều kiện liên tục, tự local commit phần tiếp quản/triển khai đã kiểm tra. Không push, triển khai production, chạy migration dev hoặc dùng thanh toán live. Chưa xác nhận có VNPAY Sandbox/nhà cung cấp QR webhook; chỉ chuẩn bị backend độc lập và kiểm thử giả lập, không tuyên bố đã thanh toán thật. Giá điện nước theo tòa và cư dân gửi chỉ số/ảnh là mục tiêu mới; cấu trúc, chuyển dữ liệu và API cụ thể vẫn cần đề xuất/duyệt riêng. DB-D59 tiếp tục giữ giá danh mục snapshot, chưa mở giá thương lượng.

**CONFIRMED DB-D63 / U1 (27/10):** chủ dự án duyệt chuẩn bị migration và kiểm thử **chỉ DB test** cho giá điện nước riêng mỗi tòa. Giữ lịch sử/ngày hiệu lực; sao chép nguyên lịch sử giá chung cũ cho từng tòa hiện có, không mất dữ liệu. Tòa mới phải cấu hình giá trước tính hóa đơn; không thay số tiền hóa đơn đã phát hành; UNIQUE theo ràng buộc từng tòa. Không chạy migration dev. U2 (bảng yêu cầu gửi chỉ số/ảnh) và U3 (monthly/final) vẫn chờ trả lời riêng, không suy từ việc duyệt U1.

**CONFIRMED DB-D64 / U2 (27/10):** chủ dự án trả lời “Duyệt U2 trên DB test” cho đề xuất DB plan§19: thêm `meter_reading_submissions`, tăng21→22 bảng nghiệp vụ; ảnh private, Admin duyệt/từ chối, chỉ chuẩn bị/kiểm thử DB test. Không đặt pending vào chỉ số chính thức, không migration dev. Bắt đầu bằng migration pending, model/quan hệ và Policy; API/upload/duyệt thật phải có contract/tiêu chí đầy đủ và dùng chung nghiệp vụ MTR chính thức, không giả thành công khi MTR chưa có. U3 vẫn là quyết định riêng; từ “monthly” trong câu hỏi là mô tả chỉ số tháng, mã `meter_readings.kind` hiện có là `periodic`, không tự đổi tên enum/cột hoặc migration cũ.

### DB-D73 / Q16 — CONFIRMED 29/10/2026
Chủ dự án duyệt bộ sự kiện thông báo trong ứng dụng: invoiceissued/paymentreview→chủhợpđồng; meter submitted→Adminactive, approved/rejected→ngườigửi; maintenance created→Adminactive, assigned→technician, statuschanged→ngườigửi; appointment confirmed/cancelled→ngườiđặt đãđăngnhập; contractactivated/terminated→ngườithuê. Guard xem APIlịchhômnay riêng, không phát rộng sai vai trò. Mỗi người nhận một dòng sau commit, chống gửi trùng; chỉ chủ tài khoản xem/đánh dấuđọc. Chỉ DB test, chưa email/SMS/push ngoài hệ thống, không migrationdev. Nghiệp vụ nguồn chưa triển khai thì chưa phát sự kiện giả; không tự thêm thông báo soạn tay/broadcast.

### DB-D74 / Q9 — CONFIRMED 30/10/2026
Cư dân chọn mức ưu tiên ban đầu khi gửi yêu cầu sửa chữa (low/normal/high/urgent). Admin được điều chỉnh khi tiếp nhận/phân công; kỹ thuật viên chỉ đọc mức ưu tiên. Giữ trường priority và enum/schema đã duyệt, không thêm requested_priority hoặc migrationdev. Quyền liên hệ và trạng thái phòng được chốt riêng tiếp theo tại DB-D75/76.

### DB-D75 / Q14 — CONFIRMED 30/10/2026
Kỹ thuật viên chỉ khi đang được phân công yêu cầu pending/in_progress mới thấy tên và SĐT người gửi để liên hệ. Sau khi xử lý xong/rejected thì ẩn SĐT; không bao giờ trả CCCD/email/hồ sơ hợp đồng qua Resource kỹ thuật viên. Người bị gỡ phân công không còn quyền xem yêu cầu đó theo Policy assigned_to=self. Chỉ DB test; không tự mở rộng quyền hoặc migrationdev.

### DB-D76 / Q17 — CONFIRMED 30/10/2026
Giữ phòng occupied khi còn hợp đồng active. Sự cố theo dõi qua yêu cầu sửa chữa; chỉ Admin được chuyển trạng thái bảo trì/ngừng sử dụng khi không còn hợp đồng active. Không thêm trạng thái kết hợp, không đổi enum/schema, không migrationdev.

### DB-D77 / Q3 — CONFIRMED 30/10/2026
Nhận lịch xem phòng tương lai trong 08:00–20:00 giờ Việt Nam. Người đã đăng nhập được tự hủy lịch của mình khi chưa tới giờ hẹn và chưa check-in; khách vãng lai liên hệ Admin để hủy. Đổi giờ qua Admin trước check-in, đưa về pending rồi xác nhận lại. Giữ schema/enum đã duyệt, chỉ DB test; không migrationdev. Q16 thông báo confirmed/cancelled áp dụng đúng người đặt đã đăng nhập, không phát thông báo giả cho khách không có tài khoản.

### DB-D78 / CLOSE-02e — CONFIRMED 30/10/2026
Chủ dự án chọn: **cho terminate khi mới ghi nhận số phải hoàn; `deposit_refund_amount` là nghĩa vụ chưa thanh toán**. `deposit_status=settled` và `deposit_settled_at` chỉ xác nhận đã đối soát/phân bổ cọc, không chứng minh đã hoàn tiền. Cọc dư phải hiển thị rõ còn phải hoàn ngoài hệ thống; không tạo payment hoàn giả, không ghi doanh thu thực thu, không tự thực hiện chuyển tiền. Khoản hoàn do giảm trừ hóa đơn tất toán được ghi riêng theo CLOSE-02d; không cộng/trừ lại vào cọc. Không thêm schema/API xác nhận hoàn tiền trong lát cắt này; không duyệt migration dev.

### DB-D79 / CLOSE-02e — CONFIRMED 31/10/2026
Chủ dự án duyệt: **chặn hủy trực tiếp mọi hóa đơn của hợp đồng đã thanh lý**, kể cả monthly chưa có payment pending/confirmed hoặc final0đ. API trả409 và yêu cầu quy trình điều chỉnh riêng; không tự sửa khoản mục, hoàn/thu tiền, mở lại hợp đồng hoặc trả phòng lần nữa. Quy tắc này bổ sung DB-D27: hủy + lập lại khi hợp đồng chưa thanh lý vẫn theo các điều kiện cũ. Lý do: luồng lập lại hóa đơn tháng yêu cầu active; hủy nguồn sau terminate có thể làm mất nghĩa vụ đã chốt mà không có quy trình thay thế. Không thêm schema hoặc tự triển khai quy trình điều chỉnh.

### DB-D80 / FILE-03 — CONFIRMED 31/10/2026
Chủ dự án duyệt tổng **30 MiB (30 ×1024×1024 byte) và20 ảnh mỗi lần gửi**, cộng tất cả ảnh hư hỏng/miễn phí trong cùng request; giữ5 MiB/ảnh và5 ảnh/hạng mục. PHP/Nginx nhận request tối đa32 MiB để dành chỗ cho multipart và các trường văn bản. Không âm thầm cắt/bỏ ảnh, không tự thay đổi số tiền hoặc dữ liệu đã lưu; vượt ngân sách trả lỗi trước khi ghi. Đây là giới hạn tổng bổ sung, không có nghĩa mọi tổ hợp10hạng mục ×5ảnh đều được gửi đồng thời. Laravel/React cùng kiểm tra; PHP phải phân tích được hơn20 file để Laravel phát hiện trường hợp vượt số lượng thay vì PHP tự bỏ phần dư. Không đổi schema hoặc chạy migration dev.

### DB-D81 / NOTIF-03 — CONFIRMED 01/11/2026
Chủ dự án duyệt API `POST /api/v1/notifications/read-all`, trả `{data:{marked_count}}`, không nhận dữ liệu đầu vào. Cập nhật mọi thông báo chưa đọc của chính tài khoản active, giữ thời điểm của dòng đã đọc; gọi lại an toàn, không Admin đọc hộ. Cookie/session/CSRF và Policy hiện hành vẫn bắt buộc. Không thay schema/dữ liệu dev. Hợp đồng HTTP và tiêu chí tại brief§36; thực hiện yêu cầu Đánh dấu tất cả đã đọc đã có trong RES-09.

### DB-D82 / DASH-01 — CONFIRMED 01/11/2026
Chủ dự án duyệt lát cắt Dashboard Admin4thẻ và GET /api/v1/dashboard chỉ đọc tại brief§42. Phòng đếm theo hợp đồng active; thực nhận tính theo reviewed_at tháng Việt Nam, confirmed cash/bank_transfer và loại tiền cọc; công nợ issued/partially_paid gồm hợp đồng terminated; sửa chữa chờ là pending. Chưa các bảng/biểu đồ, không schema/migration/ghi dev hoặc thay cách xác nhận tiền. Tổng nhiều hóa đơn/thanh toán dùng chuỗi chữ số VND theo cơ chế aggregate đã có ở DEBT/CLOSE; không float hoặc React tính tiền.

**CONFIRMED DB-D83 — ảnh phòng MVP (01/11/2026):** chủ dự án duyệt toàn gói brief§43: Admin active upload/list/cover/remove đúng room_gallery; tối đa20ảnh lưu/phòng; ảnh đầu làm bìa nếu chưa có, gỡ bìa chọn ảnh còn lại đầu tiên; không reorder ở MVP. Giữ MIME/5MiB và request20ảnh/30MiB theo D80. Dùng attachments hiện có, không schema mới. Ảnh phòng vẫn public theo ngữ nghĩa nhưng lưu disk private, Anonymous lấy qua URL kiểm lại điều kiện PublicRoom; ẩn/không còn available/tòa inactive/soft-delete thì404, không URL storage tĩnh. Các endpoint/JSON/expected_cover_id/replay/409 theo brief§43 đã duyệt. Phê duyệt này cho code/test DBtest/integrate UI hiện có, không migration hoặc ghi/xóa ảnh/data dev.
