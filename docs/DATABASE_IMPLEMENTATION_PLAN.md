# DATABASE IMPLEMENTATION PLAN — 21 bảng

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 6 — 14/10/2026 (v5: Nhóm 3 + O7–O9; v4: Nhóm 2 + O1–O6; v3: Nhóm 1 + E1–E5; v2: P1–P4 + Q1–Q12; v1: lập kế hoạch) |
| Trạng thái | **Nhóm 1:** dev + test. **Nhóm 2** và **Nhóm 3:** chỉ `mini_apartment_test`. **Đợt điều chỉnh hợp đồng/thanh lý** (DB-D43..DB-D50): tài liệu đã cập nhật, **schema chưa sửa — chờ duyệt đề xuất P1–P12 (§14)**. **Nhóm 4:** kế hoạch đã duyệt (DB-D50), triển khai sau khi chốt P6/P8 |
| Căn cứ | `docs/DB_DECISIONS_20261014.md` (ưu tiên 1, mục A–I), `docs/09_DATABASE_DESIGN.md` v1.5 (ưu tiên 2) |
| Repo | Laravel 13.35, PHP 8.3, MySQL 8.4.11, Sanctum SPA, `QUEUE_CONNECTION=sync`, `RUN_MIGRATIONS=false` (cục bộ) |

---

## 1. Hiện trạng migrations

| Migration | Bảng | `mini_apartment` (dev) | `mini_apartment_test` |
|---|---|---|---|
| Framework `0001_01_01_000000…000002` | `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` | Ran (batch 1) | Ran |
| Nhóm 1: M01–M05 `2026_10_14_1000xx` | `users` (ALTER), `buildings`, `amenities`, `services`, `settings` | **Ran (batch 2)** | Ran |
| Nhóm 2: M06–M12 `2026_10_14_2000xx` | `rooms`, `building_amenities`, `room_amenities`, `contracts`, `contract_occupants`, `contract_services`, `utility_prices` | Pending | Ran |
| Nhóm 3: M13–M16 `2026_10_14_3000xx` | `invoices`, `meter_readings`, `invoice_items`, `payments` | Pending | Ran |

DB dev sau đợt này: checksum 7 bảng framework, `users` = 0, 8 dòng `migrations`, 13 bảng — **không đổi** so với ngay sau khi chạy Nhóm 1. `RUN_MIGRATIONS=false` giữ nguyên; nếu bật lại, `docker compose up` sẽ tự chạy M06–M16 trên DB dev.

**Biên bản chạy Nhóm 1 trên DB dev:** xem v4 §1.1 (pretend 22 lệnh, backup đã thử khôi phục, bản sao ngoài repo, schema dev = test).

### 1.1 Tài liệu nguồn còn thiếu

`PROJECT_CONTEXT.md`, `docs/02_SYSTEM_DISCOVERY.md` v0.10, docs `03`–`08`, nguồn ERD không có trong repo; không tự tạo lại. Khi bổ sung cần đồng bộ BR-SVC-04, BR-INV-03/12, BR-MTR/BR-PRC, DL-33 và DB-D24..DB-D41.

---

## 2. Môi trường và bảo vệ DB test (không đổi)

Tài khoản MySQL riêng `mini_apartment_test`, kết nối `mysql_test` gán cứng DB + tài khoản, `phpunit.xml` đặt bằng `<server>` + `<env force>`, guard so khớp chính xác trong `tests/TestCase.php`. UTC, `Money` (BCMath HALF_UP), morph map `user`, queue `sync`.

---

## 3. Các nhóm migration

| Nhóm | Nội dung | Trạng thái |
|---|---|---|
| 1 | M01–M05 | ✔ dev + test |
| 2 | M06–M12 (M09 thêm `meter_gap_reason`, `meter_gap_confirmed_by` — DB-D40) | ✔ test |
| 3 | M13–M16 | ✔ test |
| 4 | M17 `maintenance_requests`, M18 `viewing_appointments`, M19 `attachments`, M20 `notifications` | **Chờ duyệt** (§9) |
| 5 | Seeder hệ thống `ELECTRICITY`/`WATER`, khóa `settings` | Chưa |

---

## 4. Models và Enums — **14 Model / 16 bảng**

| Nhóm | Model | Ghi chú |
|---|---|---|
| 1 | `User`, `Building`, `Amenity`, `Service`, `Setting` | |
| 2 | `Room`, `Contract`, `ContractOccupant`, `ContractService`, `UtilityPrice` | pivot `building_amenities`, `room_amenities` không có Model |
| 3 | `Invoice`, `InvoiceItem`, `MeterReading`, `Payment` | |

Quan hệ mới của Nhóm 3: `Contract::invoices/meterReadings/meterGapConfirmer`, `Room::meterReadings`, `Service::meterReadings`, `Invoice::contract/items/payments/meterReadings/relatedInvoice/replacements`, `InvoiceItem::invoice`, `MeterReading::room/contract/service/invoice`, `Payment::invoice/submitter/reviewer`.

**Không mass-assign** (chỉ Service gán tường minh): `Contract.meter_gap_*` (O8); `Invoice.status/invoice_number/issued_at/due_date/total_amount/paid_amount/related_invoice_id/cancel_reason` và cột `live_*`; `MeterReading.kind/contract_id/previous_reading/consumption/unit_price/amount/invoice_id`; `Payment.status/receipt_number/submitted_by/reviewed_by/reviewed_at/reject_reason`.

**Enum (16):** `HealthStatus`, `UserRole`, `UserStatus`, `BuildingStatus`, `ServiceBillingType`, `ServiceStatus`, `SettingType`, `RoomStatus`, `ContractStatus`, `DepositStatus`, `MeterReadingKind`, `InvoiceType` (`adjustment` khai báo sẵn), `InvoiceStatus`, `InvoiceItemType`, `PaymentMethod`, `PaymentStatus`.

---

## 5. Quy tắc tính tiền, chỉ số — cập nhật theo O7–O9

### 5.1 Ngày tính tiền (DB-D32, DB-D43, DB-D45)

- Ngày tính tiền = **`[start_date, actual_end_date)`**. `end_date` là **ngày cuối cùng được ở (inclusive)**; `actual_end_date` là ngày bàn giao (loại trừ). Đúng hạn ⇒ `actual_end_date = end_date + 1`. Hợp đồng 1 năm từ 01/10/2026 có `end_date = 2027-09-30` (DB-D43 — **thay** quy ước nửa mở của DB-D39).
- Chưa thanh lý thì không có mốc kết thúc: quá `end_date` mà vẫn `active` → tiếp tục tính tiền sử dụng thực tế.
- Bàn giao cùng ngày D: cũ tính đến D−1, mới tính từ D.
- `actual_end_date = start_date` (thanh lý ngày đầu, có lý do): 0 ngày tiền phòng/dịch vụ; điện nước theo chỉ số nếu có; cọc đối soát bình thường; trạng thái `terminated`.

### 5.2 Quy tắc kiểm tra (Service — chưa triển khai)

R1–R15 giữ như v4, sửa **R8** theo DB-D40:

| # | Kiểm tra | Lỗi |
|---|---|---|
| R8 | Kích hoạt hợp đồng mới: chỉ sau khi hợp đồng cũ `terminated`. So chỉ số đầu với **chỉ số chốt gần nhất** của từng `(room, service)` metered: **thấp hơn** → 422; **cao hơn** → bắt buộc `meter_gap_reason` + Admin xác nhận, ghi `meter_gap_confirmed_by` = Admin trong cùng transaction kích hoạt (mốc `activated_at`); phần chênh không tính cho ai | 422 |
| R16 | Thanh lý với `actual_end_date = start_date` bắt buộc có lý do (O10 — cột chưa chốt) | 422 |
| R17 | Form cập nhật hợp đồng thông thường không được đổi `meter_gap_reason`, `meter_gap_confirmed_by` (không trong `#[Fillable]`, FormRequest không nhận) | — |

### 5.3 Schema

O7, O9 không đổi schema. O8 thêm 2 cột vào `contracts` (M09, chưa chạy dev) — đã test lại toàn bộ ràng buộc của M09 (§7).

### 5.4 Điểm còn mở

| # | Vấn đề | Vì sao chưa đủ căn cứ | Phương án (cần chọn) |
|---|---|---|---|
| ~~O10~~ | **Đã chốt** (DB-D46): `closure_reason` = mã `on_time`/`early_termination`/`same_day`, `closure_note` = giải thích | — | Mã bổ sung: P3 (§14) |
| ~~O11~~ | **Đã chốt** (DB-D50): thêm index `(notifiable_type, notifiable_id, read_at)` | — | Áp dụng khi triển khai M20 |

Ghi nhận kỹ thuật (không cần quyết định): cột `JSON` của MySQL **không giữ thứ tự khóa** — `invoice_items.meta` chỉ được đọc theo khóa, không phụ thuộc thứ tự (test đã phản ánh).

---

## 6. Thứ tự khóa (DB-D29) — không đổi

`rooms → users → contracts → contract_services → meter_readings → invoices → payments`; quy tắc L1–L6 (v3 §6). Đề xuất tên lớp Service: `ContractLifecycleService`, `ContractSubscriptionService`, `MeterReadingService`, `InvoiceService`, `PaymentService` (tránh trùng Model `ContractService`).

**Concurrency đã có ở mức DB (C1):** Nhóm 2 (kích hoạt hợp đồng) và Nhóm 3 (hóa đơn monthly, final, hủy + lập lại, chỉ số periodic) — hai kết nối MySQL thật, B bị chặn (1205) khi A chưa commit, nhận 1062 sau khi A commit, thành công nếu A rollback. C2 (thứ tự khóa trong Service) và C3 (xác nhận payment đồng thời) làm khi có Service.

---

## 7. Kết quả test (14/10/2026)

| Chạy | Kết quả |
|---|---|
| `php artisan test` trên host | **133 test / 458 assertion PASS** |
| `php artisan test` trong container `app` (env `DB_DATABASE=mini_apartment`) | **133 PASS** trên `mini_apartment_test` |
| Mutation: sửa sai 4 kỳ vọng (kiểu `invoice_items.amount`, `uq_live_final`, FK `meter_gap_confirmed_by`, mã lỗi cạnh tranh hóa đơn) | **4 FAIL** như mong đợi; đã khôi phục |
| `pint --test` | PASS |

| File test | Nội dung |
|---|---|
| `GroupThreeSchemaTest` | Cột/kiểu/nullable/default 4 bảng (gồm `amount` **có dấu**, `payments.status` **không default**); 3 generated column `live_*` STORED với biểu thức đúng; toàn bộ index không dư; 10 FK đều RESTRICT |
| `GroupThreeConstraintTest` | DB-09: một monthly sống/hợp đồng/kỳ (chặn ở mọi trạng thái chưa hủy); hủy → lập lại có `related_invoice_id`, lặp lại được; một final sống; adjustment không bị chặn; `invoice_number`, `receipt_number` UNIQUE; DB-20: discount âm (đến −9×10¹⁵) chính xác, `total_amount`/`unit_price` âm bị chặn; chỉ số: trùng periodic bị chặn, periodic + final cùng kỳ được, một final/kỳ; nhiều payment/hóa đơn; RESTRICT toàn chuỗi tài chính; giải phóng chỉ số bằng `invoice_id = NULL` |
| `GroupThreeConcurrencyTest` | 4 kịch bản hai kết nối: monthly, final (rollback), hủy + lập lại đồng thời, chỉ số periodic |
| `GroupThreeRelationshipTest` | Quan hệ/casts 4 Model; chuỗi hóa đơn thay thế; JSON `meta`; chặn mass assignment các trường vòng đời |
| `GroupTwo*Test` (cập nhật O8) | 2 cột mới, index + FK `meter_gap_confirmed_by` RESTRICT; xóa người xác nhận → 1451; FK không tồn tại → 1452; generated column/unique active **không bị ảnh hưởng**; không mass-assign; quan hệ `meterGapConfirmer` |
| `MigrationRollbackTest` (thay 2 file cũ) | Rollback từng nhóm (1, 2, 3) kèm các nhóm sau, số bước tự tính từ danh sách migration; kiểm tra bảng bị xóa/giữ; migrate lại |
| `GroupOneEnumsTest` | Giá trị 15 Enum nghiệp vụ |

---

## 8. Ghi chú triển khai Nhóm 3 và O8

- Tên index tự sinh đã kiểm tra trước (dài nhất 52 ký tự < 64).
- MySQL tự tạo index cho FK `invoices.related_invoice_id`, `meter_readings.service_id`, `payments.submitted_by`, `contracts.meter_gap_confirmed_by` — cần cho FK, không dư.
- FK `invoices.contract_id` RESTRICT là bắt buộc (cột gốc của generated column).
- Dữ liệu test cho `end_date` đang là `2027-10-01` theo DB-D39 — **sẽ đổi về `2027-09-30`** theo DB-D43 (§14.2), chưa sửa ở lượt này.
- Factory mới (chỉ test): `InvoiceFactory` (state `final`, `issued`, `cancelled`), `MeterReadingFactory` (state `final`).

---

## 9. Nhóm 4 — kế hoạch để duyệt

### 9.1 Migrations (chỉ `mini_apartment_test`)

| # | Bảng | Định nghĩa chính (theo `09` §3.17–§3.19, §3.7) | Index |
|---|---|---|---|
| M17 | `maintenance_requests` (#17) | `string('code',30)->nullable()->unique()` (gán trong transaction tạo); FK `contract_id`, `room_id`, `user_id` NN RESTRICT; FK `assigned_to` → users NULL RESTRICT; `string('title',150)`; `text description`; `string('priority',20)->default('normal')`; `string('status',20)->default('pending')`; `text admin_note, handler_note` NULL; `unsignedBigInteger cost` NULL; `timestamp assigned_at, started_at, resolved_at` NULL; timestamps | `(contract_id,created_at)`, `(user_id,created_at)`, `(assigned_to,status)`, `(status,priority,created_at)` |
| M18 | `viewing_appointments` (#18) | `string('code',30)->nullable()->unique()`; FK `room_id` NN RESTRICT; FK `user_id` NULL RESTRICT; `string('guest_name',120)`; `string('guest_phone',20)`; `timestamp('preferred_at')` NN (UTC); `string('status',20)->default('pending')`; `text admin_note` NULL; `string('ip_address',45)` NULL; `timestamp checked_in_at, checked_out_at` NULL; FK `checked_in_by`, `checked_out_by` → users NULL RESTRICT; `text guard_note` NULL; timestamps | `(room_id,preferred_at)`, `(status,preferred_at)`, `(user_id,created_at)`, `(guest_phone,room_id,status)` |
| M19 | `attachments` (#7) | `string('attachable_type',100)`; `unsignedBigInteger('attachable_id')`; `string('collection',50)`; `string('disk',20)`; `string('path',500)`; `string('original_name',255)`; `string('mime_type',100)`; `unsignedBigInteger('size_bytes')`; `boolean('is_cover')->default(false)`; `unsignedInteger('sort_order')->default(0)`; timestamps; **không FK** (đa hình) | `(attachable_type,attachable_id,collection)` |
| M20 | `notifications` (#19) | Từ `make:notifications-table`: `uuid('id')->primary()`; `string type`; `morphs('notifiable')`; **`json('data')`** (sửa từ `text`, DB-D17); `timestamp read_at` NULL; timestamps | `(notifiable_type,notifiable_id)` (từ `morphs`); `(notifiable_type,notifiable_id,read_at)` (O11 — **đã duyệt**, DB-D50) |

Sau Nhóm 4: 19 bảng mới + `users` + `sessions` = **21 bảng**.

### 9.2 Enum (4), Model (3), morph map

- Enum: `MaintenancePriority` (`low, normal, high, urgent`), `MaintenanceStatus` (`pending, in_progress, resolved, rejected`), `AppointmentStatus` (`pending, confirmed, completed, cancelled`), `AttachmentCollection` (`room_gallery, maintenance_photo, payment_proof`).
- Model: `MaintenanceRequest`, `ViewingAppointment`, `Attachment` → **17 Model / 20 bảng** (`notifications` dùng `DatabaseNotification` của Laravel, `sessions` không có Model).
- Morph map bổ sung: `room`, `maintenance_request`, `payment` (đã có `user`). Quan hệ: `Room::photos` (`room_gallery`), `MaintenanceRequest::photos`, `Payment::proof` (morphOne `payment_proof`), `User` dùng `Notifiable` sẵn có; `MaintenanceRequest::contract/room/reporter/assignee`; `ViewingAppointment::room/user/checkedInBy/checkedOutBy`; `User::assignedMaintenanceRequests`.

### 9.3 Test Nhóm 4

- Schema/index/FK/nullable/default chính xác; tên index ≤ 64 ký tự (dài nhất dự kiến `attachments_attachable_type_attachable_id_collection_index` = 58).
- `code` UNIQUE, nhiều NULL được; RESTRICT với hợp đồng/phòng/người dùng có yêu cầu sửa chữa, lịch hẹn, người check-in/out.
- `attachments`: morph map bắt buộc — lưu alias `room`/`payment`/`maintenance_request`, model chưa map thì ném lỗi; nhiều tệp/đối tượng; không FK nên xóa cha không xóa tệp (dọn tệp là việc Service).
- `notifications`: `data` JSON, `notifiable_type = 'user'`, `read_at` NULL; gửi thông báo thử bằng `Notification` của Laravel trên DB test.
- Rollback nhóm 4 (thêm vào `MigrationRollbackTest`), quan hệ Eloquent.
- Không có unique có điều kiện ở Nhóm 4 nên không cần test concurrency mức DB; quy tắc "một lịch pending/confirmed cho `(guest_phone, room_id)`" và giới hạn 5 lượt/giờ/IP là việc của Service.

### 9.4 Ngoài phạm vi

Service/API sửa chữa, lịch xem phòng, upload tệp, gửi thông báo; seeder hệ thống (Nhóm 5).

---

## 10. Rủi ro còn lại

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| O10 (cột lưu lý do thanh lý) chưa chốt | Trung bình | Chốt trước `ContractLifecycleService` |
| DB dev ở Nhóm 1, DB test ở Nhóm 3 — lệch schema có chủ đích | Trung bình | `RUN_MIGRATIONS=false`; chạy Nhóm 2–3 trên dev khi được duyệt (backup + pretend + thử khôi phục như Nhóm 1) |
| Generated column phụ thuộc chuỗi enum (`active`, `monthly`, `final`, `cancelled`) | Trung bình | Test schema kiểm biểu thức; không đổi giá trị enum khi chưa có migration |
| `backups/` trong repo bị `git clean -fdx` xóa | Thấp | Có bản sao ngoài repo |

---

## 11. Nhật ký quyết định

| Quyết định | Áp dụng |
|---|---|
| DB-D11..DB-D22 (Q1–Q12) | `09` v1.1 |
| DB-D23..DB-D30 (queue, E1–E5, thứ tự khóa, DB test) | `09` v1.2 |
| DB-D31..DB-D38 (O1–O6, duyệt Nhóm 2) | `09` v1.3 |
| DB-D39..DB-D42 (O7–O9, duyệt Nhóm 3) | `09` v1.4; M09; Nhóm 3 ✔ test. **DB-D39 (ý nghĩa `end_date`) bị thay bởi DB-D43** |
| DB-D43..DB-D50 (O7 đảo lại, O8–O10, bồi thường, miễn trừ, kiểm tra tài sản, Nhóm 4 + O11) | `09` v1.5 §3.8, §5.1, §5.2, §7 (DB-34, DB-37..DB-41); schema **chờ duyệt P1–P12** (§14) |

## 12. Sao lưu

`backups/db/`, `backups/handoff/` (gitignore) và bản sao `D:\MaNguonMo\mini-apartment-backups\` — không đổi trong đợt này (không chạy migration trên DB dev).

## 13. Ngoài phạm vi

API/Controller/Service nghiệp vụ (đặc biệt tài chính), giao diện (gồm StaffLayout), cổng thanh toán, email/SMS, queue worker, scheduler, giá điện bậc thang, credit note, gia hạn hợp đồng, quản lý chi tiết người ở cùng.

## 14. Đợt điều chỉnh hợp đồng & thanh lý (DB-D43..DB-D50) — phân tích tác động và đề xuất CHỜ DUYỆT

> Lượt này **chỉ** cập nhật tài liệu. **Chưa** sửa migration, Model, Enum, test; **chưa** chạy migration nào. DB dev vẫn ở Nhóm 1; `RUN_MIGRATIONS=false`.

### 14.1 CONFIRMED và ĐỀ XUẤT

| Hạng mục | CONFIRMED (đã ghi `DB_DECISIONS` mục I, `09` v1.5) | ĐỀ XUẤT — chờ duyệt |
|---|---|---|
| O7 ngày kết thúc | `end_date` inclusive; `actual_end_date` = ngày bàn giao, loại trừ; đúng hạn = `end_date + 1`; quá hạn mà active thì tính tiếp (DB-D43) | P1 validation `end_date` |
| O8 chênh lệch điện nước | Phương án B: lý do + Admin xác nhận (DB-D44) | P2 tách điện/nước |
| O9 nhận–trả cùng ngày | 0 ngày tiền phòng; bắt buộc lý do, chốt chỉ số, đối soát cọc (DB-D45) | P9 có tính phí trước hạn không |
| O10 lý do thanh lý | Mã `on_time`, `early_termination`, `same_day`; ghi chú bắt buộc với 2 mã sau; nhất quán với ngày bàn giao (DB-D46) | P3 mã trả quá hạn / gia hạn / chủ nhà chấm dứt |
| Bồi thường trước hạn | 3 loại, xác định khi ký, tự tính, bất biến, không mặc định 1 tháng (DB-D47) | P4 cột lưu điều khoản; P7 loại dòng hóa đơn |
| Miễn bồi thường | Chỉ theo điều kiện đã ghi trong hợp đồng + Admin xác nhận + căn cứ (DB-D48) | **P5 cấu trúc lưu điều kiện** (không tự quyết) |
| Kiểm tra tài sản | Bắt buộc; không hư hỏng → 0; có hư hỏng → hạng mục, lý do, số tiền có căn cứ, ảnh; tách khỏi phí trước hạn; vào `final`; cọc đối soát riêng (DB-D49) | P6 cách lưu; P8 attachments; P11, P12 |
| Nhóm 4 | 4 bảng + index O11 (DB-D50) | P8 collection/morph alias mới |

### 14.2 Tác động của O7 (đảo lại DB-D39)

O7 lần này **ngược** với DB-D39 đã chốt ở lượt trước. Công thức ngày tính tiền `[start_date, actual_end_date)` **không đổi**; chỉ ý nghĩa `end_date` đổi. Chưa có Service tính tiền nên **không có logic nào bị sai**; chỉ phải sửa dữ liệu/ghi chú:

| Vị trí | Hiện tại | Cần đổi |
|---|---|---|
| `database/factories/ContractFactory.php:25` | `end_date = 2027-10-01` | `2027-09-30` |
| `tests/Feature/Database/GroupTwoConcurrencyTest.php:131`, `GroupTwoConstraintTest.php:182`, `GroupTwoRelationshipTest.php:114` | `2027-10-01` | `2027-09-30` (chỉ là dữ liệu; không test nào tính ngày từ `end_date`) |
| `app/Models/Contract.php` docblock | "end_date … đều là NGÀY BÀN GIAO" | end_date inclusive, actual_end_date loại trừ |
| M09 docblock (dòng 12–13) | như trên | như trên |
| Validation `end_date` | Thiết kế: `end_date > start_date` (chưa có FormRequest) | P1 |
| Ràng buộc DB | Không có CHECK (DB-D20); index `(status, end_date)` vẫn đúng cho cảnh báo sắp hết hạn | Không đổi |

Hệ quả nghiệp vụ cần lưu ý: cảnh báo "sắp hết hạn" (`contract.expiring_warning_days`) tính theo `end_date` = ngày cuối được ở; ngày bàn giao dự kiến hiển thị là `end_date + 1`.

### 14.3 Tác động lên schema, Model, Enum

| Thành phần | Tác động | Cách sửa (sau khi duyệt) |
|---|---|---|
| **M09 `contracts`** | Thêm cột cho P2, P4, P5, P6 | **Sửa trực tiếp M09** — chưa chạy trên DB dev, chưa commit (AGENTS §5 chỉ cấm sửa migration đã commit); chạy lại trên DB test |
| M13 `invoices` | Không đổi | — |
| M14 `meter_readings` | Không đổi (P2 không chuyển chỉ số đầu vào bảng này) | — |
| M15 `invoice_items` | **Không đổi schema**; `item_type VARCHAR(20)` đủ cho giá trị mới | Enum (P7) |
| M16 `payments` | Không đổi; tiền cọc vẫn đối soát bằng payment `deposit` | — |
| M19 `attachments` (Nhóm 4) | Thêm alias/collection | P8 |
| Enum mới | `ContractClosureReason` (`on_time`, `early_termination`, `same_day` + P3), `EarlyTerminationFeeType` (P4), `InspectionResult` (P6) | Tạo khi sửa M09 |
| Enum sửa | `InvoiceItemType` + `termination_fee`, `damage` (P7); `AttachmentCollection` (Nhóm 4) + P8 | |
| `Contract` Model | Cast/quan hệ mới; điều khoản bồi thường mass-assign **chỉ khi draft** (FormRequest), các trường miễn trừ/kiểm tra/xác nhận **không** mass-assign | |
| `App\Support\Money` | Thêm `multiply(int $amount, string $factor): int` (HALF_UP) cho phí = hệ số × tiền thuê | Unit test (DB-38) |
| Test | Schema/constraint/relationship M09 mới; Enum; DB-37..DB-41 ở mức DB/Model; dữ liệu O7 | |

### 14.4 Đề xuất chờ duyệt

**P1 — Validation `end_date`.** Với `end_date` inclusive, `end_date > start_date` nghĩa là hợp đồng tối thiểu 2 ngày. *Đề xuất:* **giữ `end_date > start_date`** như thiết kế gốc (nhận–trả cùng ngày đã có `same_day` qua `actual_end_date`); thêm `actual_end_date ≥ start_date`. *Phương án khác:* `end_date ≥ start_date` (cho hợp đồng 1 ngày).

**P2 — Tách chênh lệch điện/nước (O8).** Hiện `meter_gap_reason` (1 lý do chung) + `meter_gap_confirmed_by` → **chưa** biết chênh ở dịch vụ nào, bao nhiêu.

| Phương án | Cột trên `contracts` | Ưu/nhược |
|---|---|---|
| **A (đề xuất)** | Thay `meter_gap_reason` bằng `electricity_gap_reason TEXT NULL`, `water_gap_reason TEXT NULL`; thêm `electricity_gap_reading DECIMAL(10,2) NULL`, `water_gap_reading DECIMAL(10,2) NULL` (lượng chênh snapshot); giữ `meter_gap_confirmed_by` (một Admin xác nhận lúc kích hoạt, mốc `activated_at`) | Rõ từng dịch vụ, lý do riêng; nhất quán với `initial_electricity_reading`/`initial_water_reading` đang tách cột |
| B | Giữ `meter_gap_reason` chung + thêm 2 cột lượng chênh | Ít cột; lý do không tách theo dịch vụ |
| C | Chuyển chỉ số đầu + chênh lệch sang dòng `contract_services` metered | Tổng quát cho N dịch vụ metered nhưng đổi cấu trúc lớn; không đề xuất cho MVP |

**P3 — Mã thanh lý bổ sung.** Hệ thống **tự suy** mã từ ngày (Admin không chọn mã trái với ngày bàn giao).
- `overdue_return` — trả quá hạn (`actual_end_date > end_date + 1`): hiện **không có mã nào hợp lệ** cho trường hợp này nên cần thêm; tiền đã tính theo sử dụng thực tế (DB-D43); đề xuất ghi chú **bắt buộc** (giải thích lý do ở quá hạn).
- `renewed` — đóng hợp đồng cũ khi gia hạn sang hợp đồng mới (`renewed_from_id`); **khai báo sẵn**, chưa mở trong MVP (như `expired`).
- **Câu hỏi:** chủ nhà/Admin đơn phương chấm dứt trước hạn (vi phạm hợp đồng…) — theo ngày thì rơi vào `early_termination` và sẽ **tự tính phí bồi thường cho người thuê**, có thể sai. Phương án: (a) thêm mã `landlord_termination` (không tính phí người thuê); (b) thêm cột `terminated_by_party` (`tenant`/`landlord`); (c) ngoài phạm vi MVP.

**P4 — Lưu điều khoản bồi thường trước hạn** (trên `contracts`, ghi khi soạn draft, bất biến sau kích hoạt):
- `early_termination_fee_type VARCHAR(20) NULL` — Enum `none` / `fixed` / `rent_multiple`; NULL được khi draft, **bắt buộc** khi kích hoạt (không có default ⇒ không mặc định mức nào).
- `early_termination_fee_amount BIGINT UNSIGNED NULL` — chỉ với `fixed`.
- `early_termination_fee_multiplier DECIMAL(5,2) NULL` — chỉ với `rent_multiple` (> 0); phí = `Money::multiply(monthly_rent, multiplier)` HALF_UP.
- Phí chỉ áp dụng khi `closure_reason = early_termination` (và `same_day` tùy P9), không được miễn hợp lệ.

**P5 — Cấu trúc điều kiện miễn bồi thường** (DB-D48 — chưa chốt, **không tự quyết**):

| Phương án | Khi ký hợp đồng | Khi áp dụng miễn | Nhận xét |
|---|---|---|---|
| A | `early_termination_waiver_terms TEXT` (văn bản điều kiện) | `early_termination_waived_by` FK users, `early_termination_waiver_note TEXT` (điều kiện + căn cứ), ảnh/tệp ở `attachments` (`waiver_evidence`) | Đơn giản; **không** kiểm tra được điều kiện áp dụng có thuộc hợp đồng không |
| **B (đề xuất)** | `early_termination_waiver_conditions JSON` — mảng snapshot `[{code, description}]` | `early_termination_waiver_code VARCHAR(50)` (**phải** thuộc mảng snapshot), `early_termination_waived_by`, `early_termination_waived_at`, `early_termination_waiver_note` (căn cứ), `attachments` `waiver_evidence` | Có cấu trúc, validate được, không thêm bảng; một hợp đồng áp dụng tối đa 1 điều kiện miễn |
| C | Như B + danh mục mẫu ở `settings` (`contract.waiver_condition_templates`, JSON) để chọn khi ký rồi snapshot | Như B | Nhập nhanh, nhất quán giữa các hợp đồng; thêm 1 khóa settings |
| D | Bảng `contract_waiver_conditions` | — | Vượt 21 bảng — **không đề xuất** |

Câu hỏi kèm: miễn **toàn bộ** hay cho phép **miễn một phần** (giảm %)? Đề xuất MVP: chỉ miễn toàn bộ.

**P6 — Lưu kết quả kiểm tra tài sản** (dùng `contracts`, `invoice_items`, `attachments`, không thêm bảng):
- Trên `contracts`: `inspection_result VARCHAR(20) NULL` (Enum `no_damage` / `damaged`), `inspected_by` FK users NULL, `inspected_at TIMESTAMP NULL`, `inspection_note TEXT NULL`. Thanh lý bị chặn (409) nếu `inspection_result` NULL.
- Hạng mục hư hỏng: dòng `invoice_items` loại `damage` trên hóa đơn `final` — `description` = hạng mục, `quantity`/`unit_price`/`amount` = số tiền, `meta` = `{reason, basis (căn cứ: báo giá/hóa đơn sửa/định mức), attachment_ids}`.
- Ảnh: `attachments` gắn vào **hợp đồng** (alias `contract`), collection `inspection_photo` (tình trạng chung) và `damage_photo` (theo hạng mục, liên kết qua `meta.attachment_ids`) — ảnh không mất khi hóa đơn `final` bị hủy và lập lại.
- Hủy/lập lại `final`: Service sao chép nguyên các dòng `damage` từ hóa đơn bị hủy; muốn đổi hạng mục thì phải kiểm tra lại (cập nhật cột `inspection_*`, ghi đè lần trước — **không** giữ lịch sử nhiều lần kiểm tra trong MVP).
- *Phương án khác:* lưu danh sách hư hỏng dạng JSON trên `contracts` làm nguồn, sinh `invoice_items` từ đó (giữ được nguồn khi lập lại nhưng trùng dữ liệu).

**P7 — Loại dòng hóa đơn mới:** `termination_fee` (phí trả trước hạn; `early_termination_fee` dài 21 ký tự vượt `VARCHAR(20)`) và `damage` (bồi thường tài sản). Miễn phí hợp lệ ⇒ **không** tạo dòng phí (thông tin miễn nằm trên `contracts`).

**P8 — `attachments` (Nhóm 4):** thêm morph alias `contract`; collection `inspection_photo`, `damage_photo`, `waiver_evidence` (đều disk private, truy cập theo Policy của hợp đồng).

**P9 — Nhận–trả cùng ngày có tính phí trước hạn không?** Quyết định chưa nói. (a) Không tính (coi như hủy nhận phòng); (b) Tính theo điều khoản như `early_termination`.

**P10 — Gộp vào P3** (chủ nhà chấm dứt).

**P11 — Số tiền bồi thường tài sản:** do Admin nhập từng hạng mục kèm căn cứ (bắt buộc `basis` + ít nhất 1 ảnh); MVP **không** yêu cầu người thuê ký xác nhận trong hệ thống. Cần xác nhận.

**P12 — Kiểm tra tài sản áp dụng cho mọi mã thanh lý** (kể cả `same_day`, `on_time`). Đề xuất: **có** (đúng chữ "bắt buộc" của DB-D49).

### 14.5 Quy trình thanh lý mục tiêu (để đối chiếu khi viết Service)

1. Admin nhập `actual_end_date` → hệ thống suy `closure_reason` (DB-D46, P3); kiểm tra `closure_note` bắt buộc.
2. Chốt chỉ số `final` (`reading_date = actual_end_date`, R5).
3. Kiểm tra tài sản (bắt buộc, DB-D49, P6) → hạng mục + ảnh nếu có hư hỏng.
4. Tính phí trước hạn theo điều khoản đã ký (DB-D47, P4) nếu thuộc diện; áp dụng miễn nếu điều kiện hợp lệ + căn cứ (DB-D48, P5).
5. Lập `final` draft: tiền phòng/dịch vụ còn thiếu, `discount` cho ngày từ `actual_end_date` đã thu, điện nước `final`, dòng `termination_fee`, các dòng `damage`.
6. Phát hành `final` → chặn nếu còn payment pending → transaction terminate: đối soát cọc (payment `deposit`), `deposit_*`, `terminated`, phòng `available`, giữ `role = resident`.

### 14.6 Kế hoạch sửa sau khi duyệt (chỉ DB test)

1. O7: sửa dữ liệu test/factory về `2027-09-30`, sửa docblock M09 và `Contract`.
2. Sửa M09 theo P2, P4, P5, P6 đã duyệt; tạo/sửa Enum (P3, P4, P6, P7); `Money::multiply`.
3. Cập nhật `Contract` Model (cast, quan hệ `inspector`, `waiverConfirmer`, mass assignment theo trạng thái).
4. Test: schema/index/FK mới (các FK users đều RESTRICT), Enum, `Money::multiply` (DB-38), mass assignment; chạy lại toàn bộ trên `mini_apartment_test` + mutation spot-check.
5. Sau đó mới triển khai Nhóm 4 (P8 + index O11).

DB dev **không** bị ảnh hưởng: M09 và M13–M16 chưa từng chạy trên `mini_apartment`.
