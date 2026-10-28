# DATABASE IMPLEMENTATION PLAN — 21 bảng

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 6 — 14/10/2026 (v5: Nhóm 3 + O7–O9; v4: Nhóm 2 + O1–O6; v3: Nhóm 1 + E1–E5; v2: P1–P4 + Q1–Q12; v1: lập kế hoạch) |
| Trạng thái | **Nhóm 1:** dev + test. **Nhóm 2:** dev + test (dev23/10 batch4, §18). **Nhóm 3:** chỉ `mini_apartment_test`. **Đợt điều chỉnh hợp đồng/thanh lý** (DB-D43..DB-D50): tài liệu đã cập nhật, **schema chưa sửa — chờ duyệt đề xuất P1–P12 (§14)**. **Nhóm 4:** kế hoạch đã duyệt (DB-D50), triển khai sau khi chốt P6/P8 |
| Căn cứ | `docs/DB_DECISIONS_20261014.md` (ưu tiên 1, mục A–I), `docs/09_DATABASE_DESIGN.md` v1.5 (ưu tiên 2) |
| Repo | Laravel 13.35, PHP 8.3, MySQL 8.4.11, Sanctum SPA, `QUEUE_CONNECTION=sync`, `RUN_MIGRATIONS=false` (cục bộ) |

---

## 1. Hiện trạng migrations

**Cập nhật28/10 — DB-D65/66/67/68:** U3 đã chốt periodic có hợp đồng theo hợp đồng/dịch vụ/kỳ, periodic phòng trống theo phòng/dịch vụ/kỳ, final theo hợp đồng/lần thanh lý/dịch vụ; bỏ giới hạn một thanh lý/phòng/tháng. ALTER pending mới `2026_10_28_000001_scope_final_meter_readings_to_contracts.php` đã chuẩn bị/test tường minh: ba generated keys STORED + UNIQUE, CHECK final có contract_id; giữ enum/FK/index lịch sử và M14 nguyên vẹn. Kiểm tra dữ liệu sai/trùng trước một ALTER atomic MySQL8; down từ chối nếu UNIQUE cũ không còn chứa được lịch sử. Test riêng8/106, fullsuite1227/10635 PASS; sau test schema trở về baseline. Không đồng nghĩa MTR/INV/CLOSE đã tích hợp. P3/P9 và P6/P7/P8/P11 đã duyệt phương án §14.4, schema thanh lý chưa triển khai. Các mô tả CHỜ DUYỆT tương ứng bên dưới là lịch sử. Chỉ DB test được phép, mọi migration dev vẫn chờ riêng.

| Migration | Bảng | `mini_apartment` (dev) | `mini_apartment_test` |
|---|---|---|---|
| Framework `0001_01_01_000000…000002` | `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` | Ran (batch 1) | Ran |
| Nhóm 1: M01–M05 `2026_10_14_1000xx` | `users` (ALTER), `buildings`, `amenities`, `services`, `settings` | **Ran (batch 2)** | Ran |
| Nhóm 2: M06–M12 `2026_10_14_2000xx` | `rooms`, `building_amenities`, `room_amenities`, `contracts`, `contract_occupants`, `contract_services`, `utility_prices` | **Ran riêng batch4 (23/10/2026), §18** | Ran |
| Nhóm 3: M13–M16 `2026_10_14_3000xx` | `invoices`, `meter_readings`, `invoice_items`, `payments` | Pending | Ran |
| DB-D51: `2026_10_22_100001_make_users_email_nullable` | `users.email` ALTER | **Ran riêng, batch 3 (22/10/2026)** | Đã kiểm thử; xem §15 |

Baseline sau Nhóm 1: 8 dòng `migrations`, 13 bảng. **Mốc lịch sử sau bước 3.5:9dòng migrations, 13 bảng,users 0,sessions 11; dữ liệu ngoài migrations giữ nguyên tại mốc đó, xem §16. Sau AUTH-13 kiểm thử dev: schema/migrations không đổi, users 1 (khách test), sessions 13 và cache Auth đổi; bằng chứng mới ở IMPLEMENTATION_PLAN §10.** `RUN_MIGRATIONS=false` giữ nguyên; hiện sauGroup2 (§18), nếu bật lại docker compose up sẽ chạy các file còn chờ M13–M16 ngoài phạm vi được phép.

**Biên bản chạy Nhóm 1 trên DB dev:** xem v4 §1.1 (pretend 22 lệnh, backup đã thử khôi phục, bản sao ngoài repo, schema dev = test).

### 1.1 Tài liệu nguồn còn thiếu

`PROJECT_CONTEXT.md`, `docs/02_SYSTEM_DISCOVERY.md` v0.10, docs `03`–`08`, nguồn ERD không có trong repo; không tự tạo lại. Khi bổ sung cần đồng bộ BR-SVC-04, BR-INV-03/12, BR-MTR/BR-PRC, DL-33 và DB-D24..DB-D41.

---

## 2. Môi trường và bảo vệ DB test (không đổi)

### Bổ sung đã duyệt 22/10/2026 — email tùy chọn (DB-D51)

- Migration mới: `2026_10_22_100001_make_users_email_nullable.php`; không sửa M01 đã commit. Chỉ đổi `users.email` thành nullable, giữ `VARCHAR(191)`, UNIQUE email/SĐT và mọi dữ liệu hiện có.
- **Bước 1 ban đầu chỉ kiểm thử trên DB test. Sau phê duyệt riêng bước 3.5, migration email đã chạy trên dev (batch 3), xem §16.** Không cho phép chạy migration dev khác. Guard DB-D30 cho kiểm thử không đổi.
- Rollback bị chặn nếu còn email NULL; không tự xóa/điền email. Khi cần bắt buộc email trở lại: thu thập email thật theo quy trình đã duyệt, backup, tạm dừng ghi tài khoản rồi kiểm tra + ALTER.
- Phạm vi chỉ CSDL, kiểm thử và tài liệu; chưa làm API đăng ký/đăng nhập, Artisan tạo Admin hoặc frontend. Chưa có email thì lưu NULL, không dùng email giả/chuỗi rỗng; việc chuẩn hóa input sẽ thuộc API sau này.
- Trạng thái/kết quả chạy thực tế của đợt này ghi ở §15; số liệu 133 test ở §7 là kết quả lịch sử, không tự coi là kết quả mới.

Tài khoản MySQL riêng `mini_apartment_test`, kết nối `mysql_test` gán cứng DB + tài khoản, `phpunit.xml` đặt bằng `<server>` + `<env force>`, guard so khớp chính xác trong `tests/TestCase.php`. UTC, `Money` (BCMath HALF_UP), morph map `user`, queue `sync`.

---

## 3. Các nhóm migration

| Nhóm | Nội dung | Trạng thái |
|---|---|---|
| 1 | M01–M05 | ✔ dev + test |
| 2 | M06–M12 (M09 thêm `meter_gap_reason`, `meter_gap_confirmed_by` — DB-D40) | ✔ dev + test; dev batch4 theo §18 |
| 3 | M13–M16 | ✔ test |
| 4 | M17 `maintenance_requests`, M18 `viewing_appointments`, M19 `attachments`, M20 `notifications` | M19 đang chuẩn bị/test riêng cho U2 theo DB-D64, pending; không mở alias/collection thanh lý P8. Các bảng còn lại chưa triển khai |
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
| **M09 `contracts`** | Thêm cột cho P2, P4, P5, P6 | **Tạo migration ALTER mới sau phê duyệt**. M09 đã commit trong T1, không sửa/viết lại; kiểm thử nâng cấp/rollback trên DB test. Việc dev chưa chạy M09 không làm mất quy tắc giữ lịch sử |
| M13 `invoices` | Không đổi | — |
| M14 `meter_readings` | Không đổi (P2 không chuyển chỉ số đầu vào bảng này) | — |
| M15 `invoice_items` | **Không đổi schema**; `item_type VARCHAR(20)` đủ cho giá trị mới | Enum (P7) |
| M16 `payments` | Không đổi; tiền cọc vẫn đối soát bằng payment `deposit` | — |
| M19 `attachments` (Nhóm 4) | Thêm alias/collection | P8 |
| Enum mới | `ContractClosureReason` (`on_time`, `early_termination`, `same_day` + P3), `EarlyTerminationFeeType` (P4), `InspectionResult` (P6) | Tạo cùng đợt ALTER mới đã được duyệt |
| Enum sửa | `InvoiceItemType` + `termination_fee`, `damage` (P7); `AttachmentCollection` (Nhóm 4) + P8 | |
| `Contract` Model | Cast/quan hệ mới; điều khoản bồi thường mass-assign **chỉ khi draft** (FormRequest), các trường miễn trừ/kiểm tra/xác nhận **không** mass-assign | |
| `App\Support\Money` | Thêm `multiply(int $amount, string $factor): int` (HALF_UP) cho phí = hệ số × tiền thuê | Unit test (DB-38) |
| Test | Schema/constraint/relationship M09 mới; Enum; DB-37..DB-41 ở mức DB/Model; dữ liệu O7 | |

### 14.4 Đề xuất chờ duyệt

**Cập nhật 27/10/2026:** P4 và P5-B đã được duyệt theo DB-D61, chỉ chuẩn bị ALTER mới và kiểm thử trên DB test. Tám cột mới trên `contracts`: ba cột điều khoản phí và năm cột snapshot/xác nhận miễn nêu trong DB09§3.8; tất cả nullable, không gán phí/điều kiện cho dữ liệu cũ. FK người xác nhận dùng RESTRICT. Không sửa M09 đã commit, không thêm bảng, không thay lịch sử tiền/cọc/hợp đồng. `down()` chỉ tháo đúng FK và tám cột mới, phải kiểm thử trên DB test; không tự rollback dev. P6/P7/P8 và P3/P9/P11 vẫn chưa được duyệt; ảnh/căn cứ tệp chưa triển khai. Q15 đã chốt DB-D62, không cần đổi schema cọc trong lượt nền tảng này. Chưa mở route/JSON mới hoặc quy trình kích hoạt/thanh lý.

**Đối chiếu Sprint23/10:** không phải mọi P là blocker MVP. P1 giữ baseline end_date>start_date; chỉ phương án mở1ngày mới cần duyệt. P2 giữ một lý do chung đã chốt D40; tách cột là mở rộng. P10 đã gộpP3. P12 đã CONFIRMED theo D49 (bắt buộc mọi thanh lý), không hỏi lại; cấu trúc lưu P6 vẫn chưa duyệt. Chủ dự án CHƯA DUYỆT gói P4/P5-B/P6/P7/P8 trong lượt Sprint; không tự ALTER. Không để các mục này chặn Tòa/Tiện nghi/Phòng cơ bản.


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

**P12 — Đã chốt nguyên tắc DB-D49:** kiểm tra tài sản bắt buộc với mọi mã thanh lý (kể cả `same_day`, `on_time`). Không còn là câu hỏi cần duyệt; chỉ cách lưu P6 chưa duyệt.

### 14.5 Quy trình thanh lý mục tiêu (để đối chiếu khi viết Service)

1. Admin nhập `actual_end_date` → hệ thống suy `closure_reason` (DB-D46, P3); kiểm tra `closure_note` bắt buộc.
2. Chốt chỉ số `final` (`reading_date = actual_end_date`, R5).
3. Kiểm tra tài sản (bắt buộc, DB-D49, P6) → hạng mục + ảnh nếu có hư hỏng.
4. Tính phí trước hạn theo điều khoản đã ký (DB-D47, P4) nếu thuộc diện; áp dụng miễn nếu điều kiện hợp lệ + căn cứ (DB-D48, P5).
5. Lập `final` draft: tiền phòng/dịch vụ còn thiếu, `discount` cho ngày từ `actual_end_date` đã thu, điện nước `final`, dòng `termination_fee`, các dòng `damage`.
6. Phát hành `final` → chặn nếu còn payment pending → transaction terminate: đối soát cọc (payment `deposit`), `deposit_*`, `terminated`, phòng `available`, giữ `role = resident`.

### 14.6 Kế hoạch sửa sau khi duyệt (chỉ DB test)

1. O7: sau khi task được giao, sửa dữ liệu test/factory và docblock `Contract` theo DB-D43; không sửa M09 đã commit. Chú thích cũ trong migration được hiểu theo lịch sử; thiết kế/ALTER mới mô tả quy tắc hiện hành.
2. Tạo ALTER migration mới cho P2/P4/P5/P6 sau duyệt; không sửa M09. Tạo/sửa Enum (P3/P4/P6/P7), `Money::multiply` trong phạm vi task được giao.
3. Cập nhật `Contract` Model (cast, quan hệ `inspector`, `waiverConfirmer`, mass assignment theo trạng thái).
4. Test: schema/index/FK mới (các FK users đều RESTRICT), Enum, `Money::multiply` (DB-38), mass assignment; chạy lại toàn bộ trên `mini_apartment_test` + mutation spot-check.
5. Sau đó mới triển khai Nhóm 4 (P8 + index O11).

DB dev **không** bị ảnh hưởng: M09 và M13–M16 chưa từng chạy trên `mini_apartment`.

## 15. Kết quả lịch sử Authentication bước 1 — email tùy chọn (22/10/2026)

> Phạm vi lượt bước 1 ban đầu; trạng thái dev mới hơn ở §16. Kết quả bên dưới không phải test chạy lại khi chuẩn hóa tài liệu.

**DB-D51 đã duyệt và đã viết code.** Migration `2026_10_22_100001_make_users_email_nullable` đã chạy qua bộ test trên `mysql_test` / `mini_apartment_test`, tài khoản `mini_apartment_test`. Không chạy migration trên DB dev; không sửa migrations đã commit, Model, API hay frontend. Chỉ khởi động riêng MySQL để kiểm thử, không khởi động container app (tránh tự chạy migrations dev).

| Kiểm tra đã thực hiện | Kết quả thực tế |
|---|---|
| `php artisan test --filter=TestDatabaseGuardTest` | 7 test / 7 assertion PASS trước khi chạy test có thao tác DB |
| `php artisan test --filter=TestEnvironmentTest` | 6 test / 14 assertion PASS; đúng DB/tài khoản test, tài khoản test không đọc được DB dev |
| Test liên quan (`GroupOneSchemaTest`, `OptionalUserEmailMigrationTest`, `MigrationRollbackTest`, `UserModelTest`) | 26 test / 165 assertion PASS |
| `php artisan test` (toàn bộ) | **137 test / 486 assertion PASS** |
| `php vendor/bin/pint --test` | PASS |
| Frontend `npm run build` / `npm run lint` (AGENTS §8; không sửa frontend) | PASS; build cảnh báo bundle >500 kB, lint 9 cảnh báo / 0 lỗi trong code có sẵn |

Test mới kiểm tra email có giá trị/NULL/bỏ trống trường, nhiều NULL, từ chối email/SĐT trùng; đọc `information_schema` xác nhận nullable và chỉ mục giữ nguyên. Test rollback không dùng `RefreshDatabase`: tạo dữ liệu test đã commit, so sánh toàn bộ dòng tài khoản/chỉ mục trước–sau `down()` + `up()`, xác nhận NOT NULL từ chối NULL sau rollback thành công. Khi còn NULL, rollback bị chặn và dữ liệu/schema/lịch sử migration giữ nguyên. Dữ liệu tự tạo được dọn, schema test được khôi phục sau test.

**Giới hạn:** chỉ kiểm thử ở mức CSDL/Model/migration, chưa có thao tác đăng ký qua giao diện/API; không kiểm chứng migration trên dữ liệu DB dev. PHPUnit/Pint cần chạy ngoài sandbox do lỗi đọc đường dẫn bootstrap Windows trong sandbox; không đổi `phpunit.xml`, guard hoặc cấu hình kết nối để vượt kiểm tra.

## 16. Biên bản Authentication bước 3.5 — áp dụng riêng email nullable trên dev

- Đã được chủ dự án duyệt riêng. Kết nối kiểm tra: `mini_apartment`, tài khoản `mini_apartment@%`, `127.0.0.1:3307`, MySQL 8.4.11; Laravel 13.35.0. `RUN_MIGRATIONS=false`, không khởi động app.
- Dùng backup `D:\MaNguonMo\mini-apartment-backups\email-nullable-20261022T112541Z\mini_apartment.sql`; restore được xác minh trên MySQL không mạng, volume riêng, charset/collation khớp dev. Chi tiết thử khôi phục, khác biệt biểu diễn SQL và bài học: [PROJECT_STATUS_AND_LEARNING.md](PROJECT_STATUS_AND_LEARNING.md) §11.8.
- `--pretend` chỉ ra `alter table users modify email varchar(191) null`; lệnh thật: `php artisan migrate --database=mysql --path=database/migrations/2026_10_22_100001_make_users_email_nullable.php --no-interaction --no-ansi`.
- Kết quả: đúng một migration mới id 9/batch 3; email nullable, UNIQUE email/SĐT nguyên vẹn, phone vẫn NOT NULL. 13 bảng không đổi, users 0, sessions 11; checksum dữ liệu ngoài migrations không đổi. Các cột/index/constraint khác giữ nguyên; chỉ thứ tự hiển thị UNIQUE trong SHOW CREATE khác, không đổi định nghĩa.
- Nhóm 2–3: **11 migration vẫn Pending**, không chạy migration khác; không tạo Admin/dữ liệu, không commit/push. Container restore đã dừng, volume riêng giữ lại.
- Bằng chứng ngoài repo cùng thư mục backup: `migration-final-report.txt`, `restore-verification-v2.txt`, `post-migration-checks.json`, snapshots trước/sau. Lượt chuẩn hóa tài liệu chỉ đọc lại biên bản; không chạy DB/test/migration lại.
- Kế hoạch triển khai module quản lý ở [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), không dùng kế hoạch schema này làm quyền tự chạy migrations dev.

## 17. Phương án xin duyệt một lần — riêng Nhóm 2 trên dev (23/10/2026)

**Mốc phương án trước phê duyệt; nay đã áp dụng riêngGroup2, xem biên bản§18.** Khi lập phương án đã đọc Git/migration source, snapshot SELECT trực tiếp: MySQL 8.4.11, `mini_apartment`/`mini_apartment@%`; 13 bảng, 9 dòng migrations, 1 user, không Admin; DB mặc định utf8mb4/utf8mb4_unicode_ci. App/frontend/nginx chạy, mysql healthy; `RUN_MIGRATIONS=false` thực tế trong app. Entrypoint chỉ migrate khi biến này bằng true; Compose mặc định true nếu thiếu biến nên phải kiểm tra cả config resolved và container mỗi lần tạo lại, không khởi động lại với biến bị mất. 11 file pending = 7 Nhóm 2 + 4 Nhóm 3, không gộp chúng. Snapshot nội bộ `backups/catalog-next-20261023/dev-before.json`, không in dữ liệu cá nhân.

### 17.1. Danh sách chính xác và phụ thuộc

Tất cả dưới `backend/database/migrations/`, `up()` chỉ CREATE bảng mới/index/FK tương ứng; không UPDATE/DELETE/ALTER bảng cũ. Chỉ thêm dòng theo dõi vào migrations. Không seed hoặc kích hoạt hợp đồng.

| Thứ tự | File migration | Bảng mới / phụ thuộc và ràng buộc chính |
|---|---|---|
| 1 / M06 | `2026_10_14_200006_create_rooms_table.php` | rooms → buildings (đã có), RESTRICT; UNIQUE building_id/code, index trạng thái/công khai |
| 2 / M07 | `2026_10_14_200007_create_building_amenities_table.php` | building_amenities → buildings/amenities (đã có), composite PK và FK CASCADE chỉ pivot |
| 3 / M08 | `2026_10_14_200008_create_room_amenities_table.php` | room_amenities → rooms bước1 + amenities; composite PK, FK CASCADE chỉ pivot |
| 4 / M09 | `2026_10_14_200009_create_contracts_table.php` | contracts → rooms/users, self-FK renewed_from_id, meter_gap_confirmed_by→users; RESTRICT; generated STORED active_room_id/active_tenant_id + UNIQUE chống nhiều active |
| 5 / M10 | `2026_10_14_200010_create_contract_occupants_table.php` | contract_occupants → contracts, RESTRICT |
| 6 / M11 | `2026_10_14_200011_create_contract_services_table.php` | contract_services → contracts/services, RESTRICT; index khoảng hiệu lực, unit_price snapshot |
| 7 / M12 | `2026_10_14_200012_create_utility_prices_table.php` | utility_prices → services (đã có), RESTRICT; UNIQUE service_id/effective_from |

**Tách khỏi Thanh lý:** đây là baseline Nhóm 2 đã code/test trước đó (DB-D38), không có P4 điều khoản phí/P5 miễn/P6 kiểm tra tài sản/P7 loại dòng phí-hư hỏng/P8 tệp. Tạo bảng contracts trống không phê duyệt hoặc triển khai các nhánh đó. Comment M09 còn mô tả end_date theo DB-D39 cũ; không sửa migration đã commit. DDL là DATE, không ép cách đếm ngày; logic sau này bắt buộc theo DB-D43 inclusive. Nhóm 3 (`300013`–`300016`), Nhóm 4, ALTER P4–P8 và seeder KHÔNG nằm trong lần duyệt này.

### 17.2. Phương án thực hiện sau phê duyệt

Đề xuất **cả 7 file Nhóm 2, đúng thứ tự trên**, một lần duyệt. Lợi ích: cùng baseline đã có Feature/schema/concurrency tests, mở schema phòng/pivot/giá và chuẩn bị hợp đồng nháp; không tạo dữ liệu nghiệp vụ. Nhược điểm: thêm cả 3 bảng hợp đồng chưa có API, không làm Thanh lý hoàn thành. Phương án hẹp hơn chỉ M06/M07/M08/M12 đủ schema CAT/ROOM nhưng để baseline Nhóm 2 dở; chỉ dùng nếu chủ dự án chọn rõ thay cho gói 7 file. Cả hai đều chưa được chạy trong lượt này.

1. Xác minh config/mysql account/RUN_MIGRATIONS, danh sách bảng/migrations trước; dừng request ghi trong cửa sổ bảo trì ngắn sau khi backup để tránh snapshot/restore bỏ mất dữ liệu vừa phát sinh. Không `docker compose down -v`, không xóa volume. Có thể dừng app/frontend/nginx đã xác minh trong cửa sổ được duyệt, giữ MySQL.
2. **Backup mới tại thời điểm chạy**, toàn DB `mini_apartment`, ngoài repository, ví dụ `D:\MaNguonMo\mini-apartment-backups\group2-<UTC timestamp>\mini_apartment.sql`. Không dùng backup 22/10 thiếu tài khoản mới. mysqldump single-transaction/quick, triggers/routines/events, hex-blob, no-tablespaces, set-gtid-purged=OFF; thông tin đăng nhập lấy từ môi trường/file cấu hình bảo vệ, không in secret. Chặn nếu dump lỗi/rỗng; ghi SHA-256 + charset/collation/schema/index/rowcount/hash từng bảng/migrations/objects. File backup không vào Git.
3. **Restore thực tế** trên MySQL 8.4 container tạm network none, không publish port, volume mới hoàn toàn và xác minh tên/volume không trùng dev. Tạo DB đúng charset/collation hiện tại trước import (CREATE IF NOT EXISTS không sửa collation cũ). So sánh đủ cấu trúc/index/FK/data hash/migrations/routines/triggers/events; phải đạt rồi mới tiếp. Không drop/restore lên dev để thử. Sau restore có thể thử đúng 7 migrations trên bản sao và đối chiếu tác động trước khi dev.
4. Cú pháp đã xác minh bằng `php artisan help migrate` Laravel 13.35: `--path` nhận nhiều giá trị. Dùng **7 đường dẫn file tường minh**, không wildcard/thư mục chung; cùng danh sách cho pretend và lần chạy thật. `--pretend` được thực hiện sau phê duyệt và kiểm tra backup; chỉ chấp nhận CREATE/index/FK 7 bảng trên và ghi nhận migrations tương ứng trong lần chạy thật. Nếu ngoài phạm vi thì dừng.

```powershell
# Chỉ thực hiện SAU phê duyệt + backup/restore và xác minh kết nối.
$groupTwoPaths = @(
  'database/migrations/2026_10_14_200006_create_rooms_table.php',
  'database/migrations/2026_10_14_200007_create_building_amenities_table.php',
  'database/migrations/2026_10_14_200008_create_room_amenities_table.php',
  'database/migrations/2026_10_14_200009_create_contracts_table.php',
  'database/migrations/2026_10_14_200010_create_contract_occupants_table.php',
  'database/migrations/2026_10_14_200011_create_contract_services_table.php',
  'database/migrations/2026_10_14_200012_create_utility_prices_table.php'
)
$groupTwoArgs = @('compose','exec','-T','app','php','artisan','migrate',
  '--database=mysql','--no-interaction','--no-ansi') +
  @($groupTwoPaths | ForEach-Object { "--path=$_" })
& docker @groupTwoArgs --pretend
if ($LASTEXITCODE -ne 0) { throw 'Pretend failed; stop' }
# Dừng đánh giá SQL ở đây; chỉ khi đúng phạm vi mới chạy cùng danh sách:
# & docker @groupTwoArgs
```

5. Sau chạy thật: dự kiến **20 bảng / 16 dòng migrations**, chỉ 7 bảng mới rỗng; dữ liệu/columns/index bảng cũ giữ nguyên, 4 file Nhóm 3 vẫn pending, email nullable và UNIQUE email/SĐT còn nguyên. Không tự seed hoặc tạo Admin. Test API Phòng dev cần tài khoản được tạo theo quy trình riêng, không tự cấp Admin trong bước schema.

### 17.3. Rủi ro và khôi phục

- MySQL DDL tự commit: cả nhóm không là một transaction all-or-nothing; migration hỏng giữa CREATE và thêm FK/index có thể để lại bảng chưa ghi migrations. Dừng và snapshot hiện trạng khi lỗi, không rerun/rollback mù hoặc xóa bảng để thử lại. So sánh từng file/bảng trước khi đề xuất sửa.
- UNIQUE/generated columns/FK phải đúng MySQL 8.4, đã có tests trên DB test; vẫn cần thử bản sao mới nhất. CREATE có thể chờ metadata locks; cửa sổ bảo trì ngắn giảm request đang ghi.
- `down()` các file là DROP TABLE: **không tự rollback**, kể cả bảng mới dự kiến rỗng. Nếu đã có dữ liệu mới, rollback/restore có thể mất dữ liệu đó; phải ngừng ghi, đánh giá và xin duyệt phương án. Ưu tiên sửa tiến (forward fix) sau xác định lỗi. Backup đã thử restore là phương án cứu hộ được đánh giá trước, không phải lệnh tự động ghi đè dev.
- Sau Nhóm 2, đọc danh sách giá có thể hoạt động; **thêm giá vẫn cần meter_readings Nhóm 3 để kiểm tra D33**, sẽ báo503 khi thiếu thay vì giả định chưa có lịch sử. Đây là phụ thuộc vận hành riêng, không lý do gộp chạy Nhóm 3 ngoài quyền được duyệt.

## 18. Biên bản áp dụng riêng Nhóm 2 dev — 23/10/2026

**Đã được chủ dự án duyệt rõ 7 file200006–200012 theo §17; đã thực hiện thành công, batch4.** Không gồm Nhóm3/P4–P8/seeder/Admin. Các phát biểu “chưa chạy” trong phương án §17 là mốc trước phê duyệt, không phải trạng thái sau biên bản này.

- Đọc lại AGENTS/CLAUDE, quyết định D38/D43, thiết kế và đúng7file; Git dirty của Auth/CAT/ROOM được giữ, migration đã commit không sửa. Lưu hash từng file, Git status, cú pháp Laravel13.35 `--path` nhiều giá trị; không dùng wildcard/thư mục chứa nhóm khác khi apply.
- Kết nối: MySQL8.4.11, mini_apartment/mini_apartment@%; DButf8mb4/utf8mb4_unicode_ci. RUN_MIGRATIONS=false cả Compose resolved và env trong app, entrypoint có điều kiện; không recreate app. Tạm dừng đúng nginx/frontend để đóng ingress ghi, giữ app/mysql. Snapshot trước13bảng/9migration/1khách/không Admin, source metadata/hash dữ liệu (không xuất thông tin cá nhân vào báo cáo).
- Backup **mới** toàn DB: `D:\MaNguonMo\mini-apartment-backups\group2-20261023T031015Z\mini_apartment.sql`, 20.121byte; mysqldump single-transaction/quick/routines/triggers/events/hex-blob/no-tablespaces/GTIDOFF, thông tin đăng nhập chỉ từ env. SHA-256 ghi và kiểm tra lại; SQL có thể đọc/import, không ở Git. Không dùng backup cũ22/10.
- Restore thực tế thành công trên container `mini-apartment-group2-20261023T031015Z-restore`, cùng image MySQL dev, network none/không port, volume data và socket mới, không dùng chung dev. Tạo DB đúng charset/collation trước import. PHP đọc qua socket volume riêng bằng container network none, đối chiếu serverUUID khác; không mở cổng MySQL tạm.
- Schema/table/column/index/FK/delete rules/constraints, AUTO_INCREMENT, lịch sử migration, rowcount/hash **mọi** bảng và đối tượng DB (routines/triggers/events đều0) khớp. SHOW CREATE của bản restore ghi thêm `CHARACTER SET utf8mb4` ở từng cột chữ; đây chỉ là biểu diễn tường minh, metadatacharset/collation và SQL sau bỏ đúng phần ghi tường minh khớp hoàn toàn. Không phải lỗi collation hoặc thay cấu trúc.
- `--pretend` đúng7file cho **33lệnh DDL**: CREATE7bảng và ALTER index/FK chỉ trên chính7bảng mới, không đụng bảng cũ. Đã diễn tập bằng Laravel cùng7path trên bản restore; thành công20bảng/16migration, 7bảng mới rỗng, bảng cũ không đổi. Trước applydev snapshot vẫn khớp backup, hash7file giữ nguyên.
- Lệnh thật đúng cùng danh sách7 `--path` tại §17.2, **không có --seed/--force hoặc migrate toàn bộ**. Bằng chứng nguyên văn `actual-command.txt` và `migration-apply.txt` ngoài repo. Laravel ghi id10–16, batch4, đúng7tênfile, không migration khác.
- Xác minh sau: **20bảng /16dòng migrations**, chỉ7bảng mới rỗng. Cột/index/constraints/FK của13bảng cũ khớp; hash dữ liệu cũ nguyên vẹn **trừ bảng migrations thêm7dòng theo thiết kế**. Users vẫn1khách/không Admin; emailnullable/UNIQUE, phoneNOTNULL/UNIQUE còn nguyên; không dữ liệu nghiệp vụ được tạo. Dev sau khớp bản diễn tập về toàn metadata/dữ liệu sau loại identity và cách in charset nói trên.
- **4fileNhóm3 vẫn pending:** `2026_10_14_300013_create_invoices_table`, `300014_create_meter_readings_table`, `300015_create_invoice_items_table`, `300016_create_payments_table` (cùng tiền tố2026_10_14). Không P4–P8, seeder hoặc Admin. Không rollback/xóa/reset.
- Đã mở lại nginx/frontend bằng compose start, không recreate/app entrypoint migration; RUN_MIGRATIONS vẫnfalse. Dev HTTPGET với AcceptHTML: `/`, `/admin/rooms`, `/admin/buildings`, `/admin/services`, `/admin/utility-prices`200 và trả React entry; health200; API chưa đăng nhập401. Kiểm tra Service chỉ đọc: Room/UtilityPrice danh sách rỗng hợp lệ, không lỗi thiếu bảng. **Chưa thử quản trị dev bằng Admin** vì Admin0 và chủ dự án cấm tạo trong lượt này; không giả quyền để kiểm thử. Điện/Nước chưa seed, thêm giá vẫn503 vì thiếu meter_readings theo đúng D33.
- Container restore đã dừng; backup/volume riêng giữ để đối chiếu, không xóa. Hồ sơ: before/restored/rehearsed/before-apply/after.json, backup-sha256/migration-hashes/restore-verification/post-verification.json, SQLpretend/apply/rehearsal, command và gitstatus cùng thư mục backup. Không in secret/đưa backup vào Git; không stage/commit/push.


**Đối chiếu cuối sau triển khai/kiểm thử gán tiện nghi:** `after-browser.json` khớp tất cả phần JSON của `after.json` (metadata, indexes, constraints, lịch sử, rowcount/hash dữ liệu), dev vẫn 20 bảng/16 migration; không có ghi/xóa dữ liệu dev thêm. Phép so sánh chuỗi đầu tiên chỉ khác xuống dòng CRLF/LF, đã xác minh riêng bằng chuẩn hóa và so sánh nội dung JSON. Hash cả 7 migration giữ nguyên, RUN_MIGRATIONS=false. DB test đã dọn đúng fixture, hai container test đã dừng, bốn container dev vẫn chạy/MySQL healthy. Không migration Nhóm 3/P4–P8, seeder, Admin, rollback hoặc commit/push.

## 19. Điện nước Full MVP — U1/U2 chuẩn bị, U3 chờ duyệt

**Cập nhật duyệt:** U1/hướng giữ lịch sử CONFIRMED DB-D63 và U2 CONFIRMED DB-D64 ngày27/10, chỉ chuẩn bị/test DB test. U3 vẫn chờ trả lời riêng; không đánh dấu cả§19 đã được duyệt. Migration U1 làm thay đổi điều kiện ghi bảng giá hiện hành, vì vậy lưu ở `database/migrations/pending/` và chỉ được test bằng đường dẫn tường minh; không đưa vào `migrate` mặc định khi API giá theo tòa chưa tích hợp. U2/M19 cũng chuẩn bị ở pending trước khi API/nghiệp vụ duyệt đủ điều kiện. Không suy bảng giá theo tòa hoặc gửi/duyệt chỉ số đã hoạt động từ migration/model.

Nguồn yêu cầu 27/10: giá theo tòa; cư dân gửi chỉ số/ảnh chờ Admin xác nhận. Đây là mục tiêu được giao, nhưng cấu trúc và chuyển dữ liệu dưới đây chưa tự trở thành quyết định CONFIRMED. Snapshot dev sau ROOM-PUB: 1 tòa, 0 dòng utility_prices; chưa chạy Nhóm3. Không có dữ liệu giá dev cần gán lúc này, nhưng migration vẫn phải có chính sách cho database đã có lịch sử.

**U1 — Giá theo tòa (đề xuất):** ALTER mới thêm `utility_prices.building_id` FK RESTRICT, UNIQUE `(building_id,service_id,effective_from)` thay UNIQUE chung; giữ chỉ số đã lưu đơn giá/amount bất biến. Với giá chung cũ, đề xuất sao chép lịch sử giá thành snapshot cho từng tòa hiện có, không thay ngày hiệu lực hoặc số tiền; tòa được tạo sau đó phải cấu hình giá mới, không tự nhận giá cũ. Không có tòa mà đã có lịch sử giá thì dừng migration để yêu cầu ánh xạ, không xóa dòng. Kiểm tra trước, backfill, đối chiếu số lượng/nội dung rồi mới đặt NOT NULL và đổi UNIQUE; chỉ DB test sau phê duyệt. API giá cần `building_id`/lọc theo tòa, cập nhật màn Chi tiết Tòa nhà, bảng giá, MTR và tính hóa đơn; test hai tòa giá khác nhau, lịch sử, thiếu giá và D33. Phương án khác: yêu cầu ánh xạ rõ từng dòng cũ trước migration, chậm hơn nhưng không tự nhân lịch sử.

**U2 — Yêu cầu gửi chỉ số (đề xuất):** thêm một bảng `meter_reading_submissions`, tăng thiết kế21bảng lên22; không đặt pending vào `meter_readings` chính thức. Trường: id, room_id, contract_id, service_id, period, reading_date, current_reading DECIMAL(10,2), status pending/approved/rejected, submitted_by, reviewed_by/at, rejection_reason, approved_meter_reading_id nullable UNIQUE FK RESTRICT, timestamps. Các FK lịch sử RESTRICT. Generated pending_slot + UNIQUE `(room_id,service_id,period,pending_slot)` chỉ chặn hơn một yêu cầu pending; bản từ chối không mất lịch sử và cho phép gửi lại. Cư dân chỉ gửi chỉ số tháng cho hợp đồng mình đang thuê; server gán người gửi/phòng/hợp đồng, không tin input giá hoặc tiền. Ảnh qua bảng attachments đã có trong thiết kế (M19 còn chưa triển khai), alias riêng/collection ảnh chỉ số, disk private, Policy Admin hoặc chủ yêu cầu. Admin duyệt trong transaction khóa dữ liệu liên quan rồi gọi cùng nghiệp vụ ghi chỉ số chính thức; duyệt lặp không tạo thêm chỉ số, từ chối không ghi số chính thức. Không mở quyền cho Technician/Guard hoặc chuyển ảnh thành public. API, migration M19/bảng mới và luồng duyệt chỉ triển khai sau phê duyệt cụ thể, không chạy dev.

**U3 — Chống trùng cần giữ `kind`:** baseline M14 hiện UNIQUE `(room_id,service_id,period,kind)`, cho phép monthly và final cùng kỳ. Yêu cầu mới “một chỉ số trong cùng phòng, loại và kỳ” nếu hiểu là bỏ kind sẽ chặn chỉ số chốt khi trả phòng trong tháng đã ghi monthly. Đề xuất giữ phân biệt monthly/final và quy tắc khoảng tiêu thụ DB-D15, chặn trùng cùng kind; không suy diễn thành một dòng duy nhất cho mọi loại. Trường hợp nhiều lần bàn giao cùng phòng/tháng vẫn phải theo điểm mở R1–R17 ở Plan, không tự tạo chỉ số giả hoặc chia theo ngày.

**Lưu ý mã hiện tại:** chỉ số tháng trong mô tả U3 là `periodic` ở `MeterReadingKind`, không phải giá trị enum monthly. M14/Enum đã commit giữ nguyên; U2 không có cột kind và chưa sinh chỉ số chính thức. Không đổi monthly/final của **InvoiceType** vì đó là loại hóa đơn khác khái niệm.

**U2 chuẩn bị theo DB-D64:** M19 và create_meter_reading_submissions nằm trong pending; default migrate không chạy hai file, test gọi đường dẫn tường minh. Cấu trúc vật lý tại DB design§3.7/3.22. Enum/model/Policy và disk private=storage/app/evidence phục vụ lát cắt nền tảng, chưa có API/upload/download/duyệt. Không dùng root local đang phục vụ file cho ảnh cần Policy. Test down từ chối còn lịch sử/metadata, fixture rollback trước DDL; không chạy đồng thời với schema/browser khác. Bằng chứng cuối ở IMPLEMENTATION_PLAN§12.22.
