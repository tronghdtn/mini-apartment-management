# Tài liệu dự án

Thư mục chứa tài liệu phân tích, thiết kế và vận hành của Mini Apartment Management.

**Mới24/10 — LEASE-A/CTR:** Hợp đồng nháp đã tích hợp Backend/ba trang React/test;963Backend/7930assertion,58frontend,12browser+12liveAPI PASS. Chưa kích hoạt/Thanh lý/P4–P8. Bốn localcheckpoint đã được duyệt/lưu; không push. Admin dev mới xuất hiện, chờ xác nhậnnguồn và phiên đăng nhập thật. Bằng chứng [Plan§12.12–13](IMPLEMENTATION_PLAN.md), bản đồ [học tập§11.21](PROJECT_STATUS_AND_LEARNING.md); các mốc bên dưới là lịch sử theo module.

**Điểm bắt đầu từ 22/10/2026:** đọc [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) để chọn Task; đọc Spec module rồi API/AC liên quan trước khi làm. Không tạo thêm bản kế hoạch hoặc Tasks trùng lặp. Quy trình chung nằm ở [AGENTS.md](../AGENTS.md) §3.1. Lượt chỉ tài liệu không chạy lại test/migrations; số test cũ phải ghi nhãn lịch sử.

**Thứ tự ưu tiên khi mâu thuẫn:** `DB_DECISIONS_20261014.md` → `09_DATABASE_DESIGN.md` → các tài liệu nghiệp vụ cũ (02–08, `PROJECT_CONTEXT.md`) ở phần không xung đột.

| Tài liệu | Trạng thái |
| --- | --- |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — module, phụ thuộc, Tasks, trạng thái, nghiệm thu và ưu tiên | Plan chung đã duyệt; AUTH-00..12 xong Bước 4, AUTH-13 Docker dev 7 ca PASS; CAT/ROOM + dịch vụ/giá cơ bản đã tích hợp DB test; Settings ngày1–365; Group2 dev đã áp dụng đúng7file theo DBplan§18; USR đọc/cấp/status/họ tên; browser13status+12họ tên DBtest; tiến độ ở Plan§12.10–11 |
| [AUTHENTICATION.md](AUTHENTICATION.md) — Spec chính: hành vi, CONFIRMED/chờ duyệt, AC | D01/D02/D03 CONFIRMED; Backend + React Auth đã tích hợp/kiểm thử trên môi trường test cô lập |
| [API_AUTHENTICATION.md](API_AUTHENTICATION.md) — endpoint, input/response, chuẩn hóa, rate limit và lỗi Auth | `/api/v1/auth/register`, `/login`, `/logout`, `/me`; Lịch sử Auth: Backend 227/1267 + browser17; Backend mới867/6970 tại Plan§12.11; schema email nullable đã áp dụng riêng dev bước 3.5 |
| [PROJECT_STATUS_AND_LEARNING.md](PROJECT_STATUS_AND_LEARNING.md) — tiến độ thật (đã làm / mới có giao diện / còn thiếu), trạng thái DB dev/test, API đã có, quyết định chờ duyệt, kế hoạch tiếp theo, giải thích kiến trúc để học | Cập nhật 23/10/2026; bài học Group2/gán tiện nghi §11.15–16, bản đồ USR ngắn §11.17–20; Tasks chuyển sang Plan |
| [DB_DECISIONS_20261014.md](DB_DECISIONS_20261014.md) — quyết định ghi đè 14/10/2026 (21 bảng, 5 actor, tiền BIGINT, UTC, prorata dịch vụ) + mục E (Q1–Q12), mục F (queue, E1–E5, thứ tự khóa, DB test), mục G (O1–O6, duyệt Nhóm 2), mục H (O7–O9, duyệt Nhóm 3), mục I (hợp đồng/thanh lý/bồi thường/kiểm tra tài sản, Nhóm 4) | **Đã duyệt** |
| [09_DATABASE_DESIGN.md](09_DATABASE_DESIGN.md) — thiết kế vật lý 21 bảng, ERD, quy tắc tính tiền, checklist DB-01..DB-41 | **Đã duyệt** — v1.6, DB-D51; tiến độ dev ở DB plan §16 |
| [DATABASE_IMPLEMENTATION_PLAN.md](DATABASE_IMPLEMENTATION_PLAN.md) — thứ tự migrations, chuẩn bị P1–P4 (đã làm), phân tích điện nước, queue, đặc tả Nhóm 1 | Nhóm1+emailnullable+Nhóm2 dev/test; Nhóm3chỉtest; **gói schema P4–P8 chưa duyệt** (§14), P1/P2 baseline và P12 nguyên tắc đã chốt; Nhóm 4 đã duyệt kế hoạch |
| [FRONTEND_DESIGN_BRIEF.md](FRONTEND_DESIGN_BRIEF.md) — yêu cầu màn hình, nội dung, luồng giao diện (51 màn hình = 48 MVP + 3 đề xuất UI); câu hỏi phạm vi Q1–Q17 | v1.0 — nhận diện/cấu trúc thư mục đã được thay bằng bản Antigravity (ghi chú trong tài liệu) |
| [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md) — sitemap mục tiêu, cách đếm màn hình, trạng thái từng màn trong `frontend/` | Auth + CAT/ROOM cập nhật 23/10; số đếm 27/51 là baseline giao diện 18/10, không tiến độ nghiệp vụ |
| `02_SYSTEM_DISCOVERY.md` v0.10, `03`–`08`, `PROJECT_CONTEXT.md`, nguồn ERD/diagram | **Chưa có trong repo** — cần bổ sung rồi đồng bộ theo `DB_DECISIONS_20261014.md` §B |
| Đặc tả REST API `/api/v1` | Auth ở `API_AUTHENTICATION.md`, health; CAT/ROOM/gán tiện nghi/USR ở brief§16–23, trạng thái/bằng chứng Plan §12 |

## Lịch sử

| Ngày | Thay đổi |
| --- | --- |
| 23/10/2026 | Triển khai CAT/ROOM cơ bản, 428/3080 Backend + 19 frontend + 16 browser PASS; phân loại blocker theo quyết định mới, không migration/ghi dev. |
| 22/10/2026 (Bước 4) | Đồng bộ quyết định D01..03 đã duyệt, tích hợp React Auth, bằng chứng test/browser và bài học §11.11; DB dev nguyên vẹn. |
| 22/10/2026 | Chuẩn hóa Spec Auth/Plan chung, chuyển giải thích và kết quả Auth lịch sử vào tài liệu học tập; cập nhật bước 3.5 dev. Không thay đổi code/nghiệp vụ. |
| 12/10/2026 | Tạo thư mục tài liệu. |
| 14/10/2026 | Thêm `09_DATABASE_DESIGN.md`, `DB_DECISIONS_20261014.md` (sao chép nguyên văn từ bộ bàn giao), `DATABASE_IMPLEMENTATION_PLAN.md`. Bỏ quy ước cũ lưu thiết kế ở `docs/database/`. |
| 14/10/2026 (2) | Đồng bộ Q1–Q12 (DB-D11..DB-D22) vào `09` (v1.1), `DB_DECISIONS` (mục E), kế hoạch (v2). |
| 14/10/2026 (3) | Đồng bộ DB-D23..DB-D30 (`09` v1.2, `DB_DECISIONS` mục F, kế hoạch v3). Lưu trữ thư mục bàn giao vào `backups/handoff/` rồi xóa khỏi repo. |
| 14/10/2026 (4) | Đồng bộ DB-D31..DB-D38 (`09` v1.3, `DB_DECISIONS` mục G, kế hoạch v4). |
| 14/10/2026 (5) | Đồng bộ DB-D39..DB-D42 (`09` v1.4, `DB_DECISIONS` mục H, kế hoạch v5). |
| 14/10/2026 (6) | Đồng bộ DB-D43..DB-D50 (`09` v1.5, `DB_DECISIONS` mục I, kế hoạch v6 §14). DB-D39 đánh dấu bị thay. |
| 18/10/2026 | `frontend/` = giao diện Antigravity chính thức. Thêm `PROJECT_STATUS_AND_LEARNING.md`; thống nhất cách đếm màn hình (51/48/3) trong `SCREEN_INVENTORY.md` và `FRONTEND_DESIGN_BRIEF.md`. |
