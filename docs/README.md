# Tài liệu dự án

Thư mục chứa tài liệu phân tích, thiết kế và vận hành của Mini Apartment Management.

**Thứ tự ưu tiên khi mâu thuẫn:** `DB_DECISIONS_20261014.md` → `09_DATABASE_DESIGN.md` → các tài liệu nghiệp vụ cũ (02–08, `PROJECT_CONTEXT.md`) ở phần không xung đột.

| Tài liệu | Trạng thái |
| --- | --- |
| [PROJECT_STATUS_AND_LEARNING.md](PROJECT_STATUS_AND_LEARNING.md) — tiến độ thật (đã làm / mới có giao diện / còn thiếu), trạng thái DB dev/test, API đã có, quyết định chờ duyệt, kế hoạch tiếp theo, giải thích kiến trúc để học | Cập nhật 18/10/2026 |
| [DB_DECISIONS_20261014.md](DB_DECISIONS_20261014.md) — quyết định ghi đè 14/10/2026 (21 bảng, 5 actor, tiền BIGINT, UTC, prorata dịch vụ) + mục E (Q1–Q12), mục F (queue, E1–E5, thứ tự khóa, DB test), mục G (O1–O6, duyệt Nhóm 2), mục H (O7–O9, duyệt Nhóm 3), mục I (hợp đồng/thanh lý/bồi thường/kiểm tra tài sản, Nhóm 4) | **Đã duyệt** |
| [09_DATABASE_DESIGN.md](09_DATABASE_DESIGN.md) — thiết kế vật lý 21 bảng, ERD, quy tắc tính tiền, checklist DB-01..DB-41 | **Đã duyệt** — v1.5 (đồng bộ đến DB-D50) |
| [DATABASE_IMPLEMENTATION_PLAN.md](DATABASE_IMPLEMENTATION_PLAN.md) — thứ tự migrations, chuẩn bị P1–P4 (đã làm), phân tích điện nước, queue, đặc tả Nhóm 1 | v6: Nhóm 1 dev + test; Nhóm 2–3 test; **đề xuất schema P1–P12 chờ duyệt** (§14); Nhóm 4 đã duyệt kế hoạch |
| [FRONTEND_DESIGN_BRIEF.md](FRONTEND_DESIGN_BRIEF.md) — yêu cầu màn hình, nội dung, luồng giao diện (51 màn hình = 48 MVP + 3 đề xuất UI); câu hỏi phạm vi Q1–Q17 | v1.0 — nhận diện/cấu trúc thư mục đã được thay bằng bản Antigravity (ghi chú trong tài liệu) |
| [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md) — sitemap mục tiêu, cách đếm màn hình, trạng thái từng màn trong `frontend/` | Cập nhật 18/10/2026: 27/51 màn có giao diện (dữ liệu giả) |
| `02_SYSTEM_DISCOVERY.md` v0.10, `03`–`08`, `PROJECT_CONTEXT.md`, nguồn ERD/diagram | **Chưa có trong repo** — cần bổ sung rồi đồng bộ theo `DB_DECISIONS_20261014.md` §B |
| Đặc tả REST API `/api/v1` | Chưa có — hiện chỉ có `GET /api/v1/health` |

## Lịch sử

| Ngày | Thay đổi |
| --- | --- |
| 12/10/2026 | Tạo thư mục tài liệu. |
| 14/10/2026 | Thêm `09_DATABASE_DESIGN.md`, `DB_DECISIONS_20261014.md` (sao chép nguyên văn từ bộ bàn giao), `DATABASE_IMPLEMENTATION_PLAN.md`. Bỏ quy ước cũ lưu thiết kế ở `docs/database/`. |
| 14/10/2026 (2) | Đồng bộ Q1–Q12 (DB-D11..DB-D22) vào `09` (v1.1), `DB_DECISIONS` (mục E), kế hoạch (v2). |
| 14/10/2026 (3) | Đồng bộ DB-D23..DB-D30 (`09` v1.2, `DB_DECISIONS` mục F, kế hoạch v3). Lưu trữ thư mục bàn giao vào `backups/handoff/` rồi xóa khỏi repo. |
| 14/10/2026 (4) | Đồng bộ DB-D31..DB-D38 (`09` v1.3, `DB_DECISIONS` mục G, kế hoạch v4). |
| 14/10/2026 (5) | Đồng bộ DB-D39..DB-D42 (`09` v1.4, `DB_DECISIONS` mục H, kế hoạch v5). |
| 14/10/2026 (6) | Đồng bộ DB-D43..DB-D50 (`09` v1.5, `DB_DECISIONS` mục I, kế hoạch v6 §14). DB-D39 đánh dấu bị thay. |
| 18/10/2026 | `frontend/` = giao diện Antigravity chính thức. Thêm `PROJECT_STATUS_AND_LEARNING.md`; thống nhất cách đếm màn hình (51/48/3) trong `SCREEN_INVENTORY.md` và `FRONTEND_DESIGN_BRIEF.md`. |
