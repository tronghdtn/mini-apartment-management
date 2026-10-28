# FRONTEND DESIGN BRIEF — MINI APARTMENT MANAGEMENT

> **Đồng bộ Auth 22/10/2026:** Spec hành vi chính là [AUTHENTICATION.md](AUTHENTICATION.md), Tasks ở [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Giữ giao diện Antigravity, không dùng mô tả prototype làm phê duyệt nghiệp vụ. Email/SĐT login, email đăng ký tùy chọn và Q2/Q4/Q10/Q11 được cập nhật dưới đây; AUTH-D01/D02/D03 đã CONFIRMED A/A/A ngày 22/10/2026. Các cấu trúc mock và công cụ demo trong §11 chỉ là lịch sử dựng prototype, không dùng cho Auth thật.

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0 — 14/10/2026 |
| Mục đích | Tài liệu bàn giao để thiết kế **prototype giao diện (UI/UX)** bằng React + TypeScript + Tailwind CSS với **mock data**, không cần Backend |
| Người đọc | AI thiết kế prototype (Gemini) và chủ dự án |
| Căn cứ | `docs/DB_DECISIONS_20261014.md` (mục A–I, đến DB-D50) → `docs/09_DATABASE_DESIGN.md` v1.5 → `docs/DATABASE_IMPLEMENTATION_PLAN.md` v6 (§14 đề xuất P1–P12 **chờ duyệt**) → `AGENTS.md`; giao diện nền hiện có trong `frontend/src/` |
| Hiện trạng (18/10/2026) | Giao diện thực tế là bản **Antigravity** trong `frontend/` (chủ dự án duyệt làm giao diện chính thức). Nhận diện ở §4.1 (Segoe UI, xanh `blue`) và `DashboardShell` ở §4.2, cấu trúc thư mục ở §11.2 **đã được thay** — xem `AGENTS.md` §4. Tài liệu này vẫn là nguồn **yêu cầu màn hình, nội dung và luồng**. Trạng thái từng màn hình: `docs/SCREEN_INVENTORY.md` |
| Không có trong repo | `PROJECT_CONTEXT.md`, `02_SYSTEM_DISCOVERY.md` v0.10, docs `03`–`08`, danh sách "38 trang" cũ. Tài liệu này **không** dựa vào các nguồn đó (xem §15) |

---

## 0. Cách dùng tài liệu này

**Gửi cho Gemini:** toàn bộ tài liệu. Yêu cầu Gemini đọc §1–§12 trước khi dựng, rồi dựng theo danh sách màn hình ở §5 và các luồng ở §8.

**Nhãn phạm vi dùng xuyên suốt:**

| Nhãn | Ý nghĩa | Prototype làm gì |
|---|---|---|
| **[MVP]** | Đã xác nhận trong tài liệu nghiệp vụ/CSDL | Dựng đầy đủ |
| **[SHOULD]** | Có trong thiết kế nhưng ưu tiên sau MVP | Không dựng, hoặc chỉ dựng nếu được yêu cầu riêng; nếu dựng phải gắn nhãn "Sắp có" |
| **[FUTURE]** | Ngoài phạm vi hiện tại | Không dựng |
| **[ĐỀ XUẤT UI]** | Cách trình bày do tài liệu này đề xuất để màn hình dùng được, **chưa được chủ dự án duyệt** | Dựng, nhưng giữ đơn giản để dễ bỏ/sửa |
| **[CHỜ Pn]** / **[CHỜ Qn]** | Phụ thuộc quyết định chưa chốt (P1–P12 ở kế hoạch §14, Q ở §14 của tài liệu này) | Dựng theo phương án đề xuất, hiển thị một nhãn nhỏ "Chờ duyệt" trong bản prototype |

**Nguyên tắc không được vi phạm khi dựng prototype:**
1. Không thêm vai trò ngoài 5 vai trò ở §2. Không thêm chức năng ngoài danh sách màn hình ở §5.
2. Frontend **không tự tính tiền hóa đơn**: mọi số tiền (dòng hóa đơn, tổng, phí bồi thường, đối soát cọc) lấy sẵn từ mock data như thể Backend đã tính.
3. Giao diện và nội dung hiển thị bằng **tiếng Việt**; tên biến, route, trường dữ liệu bằng **tiếng Anh `snake_case`** giống JSON API.

---

## 1. Tổng quan sản phẩm

- Hệ thống quản lý **chung cư mini**: **một chủ sở hữu** quản lý **nhiều tòa nhà**, mỗi tòa có nhiều phòng. Không phải nền tảng nhiều chủ nhà.
- Nghiệp vụ chính: giới thiệu phòng trống và đặt lịch xem phòng; lập và kích hoạt hợp đồng; ghi chỉ số điện nước; lập và phát hành hóa đơn tháng; cư dân thanh toán bằng chuyển khoản (VietQR chỉ để hướng dẫn) và gửi ảnh minh chứng; Admin xác nhận; yêu cầu sửa chữa; thanh lý hợp đồng (kiểm tra phòng, bồi thường, đối soát cọc).
- **Không** có trong phạm vi hiện tại: cổng thanh toán/ngân hàng tự động, tự động lập hóa đơn theo lịch, giá điện bậc thang, ứng dụng di động riêng. Email phục hồi/xác minh đã chốt nguyên tắc tương lai ở Q4, chưa triển khai; không SMS/OTP.
- Thông báo chỉ **trong ứng dụng** (biểu tượng chuông).

---

## 2. Vai trò người dùng (5 vai trò — đã xác nhận, DB-D02, DB-D10)

| Vai trò | Giá trị `role` | Đăng nhập | Khu vực giao diện | Được làm |
|---|---|---|---|---|
| Khách vãng lai | — (không có tài khoản) | Không | Public | Xem phòng trống, xem chi tiết phòng, **đặt lịch xem phòng**, xem liên hệ, đăng ký tài khoản |
| Khách đã đăng ký | `user` | Có | Public (+ khu tài khoản nhỏ — [ĐỀ XUẤT UI]) | Như khách vãng lai; đặt lịch với thông tin điền sẵn. Là đối tượng Admin chọn làm người thuê khi lập hợp đồng |
| Cư dân | `resident` | Có | `/resident` | Xem hợp đồng, hóa đơn, công nợ; gửi minh chứng thanh toán; gửi/theo dõi yêu cầu sửa chữa (chỉ khi **đang có hợp đồng hiệu lực**) |
| Quản trị viên | `admin` | Có | `/admin` | Toàn bộ quản lý: tòa nhà, phòng, tiện nghi, dịch vụ, giá điện nước, người dùng, hợp đồng, chỉ số, hóa đơn, thanh toán, sửa chữa, lịch xem phòng, cài đặt |
| Nhân viên sửa chữa | `technician` | Có | `/staff` | Chỉ xem và xử lý yêu cầu sửa chữa **được phân công cho mình** |
| Bảo vệ | `guard` | Có | `/staff` | Chỉ xem lịch xem phòng **đã xác nhận của hôm nay** (giờ Việt Nam); check-in rồi check-out khách |

Quy tắc quan trọng ảnh hưởng giao diện:
- Tài khoản có `status` `active` hoặc `locked`. Tài khoản bị khóa không đăng nhập được.
- Kích hoạt hợp đồng tự đổi `user` → `resident`. **Sau thanh lý vẫn giữ `resident`** để xem lịch sử (DB-D36); "đang thuê" suy ra từ việc có hợp đồng `active`. Cư dân không còn hợp đồng active: **chỉ xem**, không tạo yêu cầu sửa chữa, không gửi thanh toán mới cho hợp đồng mới (vẫn được thanh toán hóa đơn cũ còn nợ — xem Q8).
- Người ở cùng phòng (`contract_occupants`) **không có tài khoản**. Một hợp đồng có một người thuê đại diện; người ở cùng có thể chuyển khoản nhiều lần cho cùng hóa đơn, nhưng ảnh minh chứng được gửi qua tài khoản người đại diện.
- Route guard ở frontend chỉ để trải nghiệm. Prototype có thể dùng **bộ chuyển vai trò demo** (§11.4).

---

## 3. Quy ước hiển thị dữ liệu

| Loại | Dữ liệu (mock/API) | Hiển thị |
|---|---|---|
| Tiền | **Số nguyên VND**, ví dụ `3500000` | `3.500.000 ₫` (định dạng `vi-VN`). Không có phần lẻ. Dòng giảm trừ là số âm: `−1.645.161 ₫`, màu xanh lá hoặc xám |
| Chỉ số điện nước, tiêu thụ, số lượng, diện tích, hệ số | **Chuỗi** thập phân, ví dụ `"1234.50"`, `"25.00"`, `"1.50"` | `1.234,50 kWh`, `25 m²`, `× 1,5`. **Không** chuyển sang số thực để tính tiền |
| Thời điểm (timestamp) | ISO-8601 UTC, ví dụ `"2026-10-14T02:30:00Z"` | Đổi sang giờ **Asia/Ho_Chi_Minh**: `14/10/2026 09:30` |
| Ngày (`DATE`) | `"2026-10-14"` (ngày lịch Việt Nam) | `14/10/2026` — **không** đổi múi giờ |
| Kỳ (`period`) | Luôn là ngày 01, ví dụ `"2026-10-01"` | `Tháng 10/2026` |
| Mã nghiệp vụ | Có thể `null` trước khi sinh | Hợp đồng `HD-2026-0012` (sinh khi **kích hoạt**), hóa đơn `INV-202610-0012` (sinh khi **phát hành**), biên nhận `RCP-202610-0012` (sinh khi **xác nhận** thanh toán), sửa chữa `MR-202610-0012`, lịch hẹn `APT-202610-0012`. Khi `null`: hiển thị "Nháp" / "Chưa có mã" |

**Ngày hợp đồng (rất dễ nhầm — DB-D43, DB-D32):**
- `start_date`: ngày bắt đầu ở, có tính tiền.
- `end_date`: **ngày cuối cùng được ở** (có tính). Nhãn: "Ngày cuối được ở".
- Ngày bàn giao dự kiến = `end_date + 1`. Nhãn phụ: "Bàn giao dự kiến: 01/10/2027".
- `actual_end_date`: **ngày bàn giao thực tế**, **không tính tiền** cho người thuê cũ. Nhãn: "Ngày bàn giao thực tế". Giải thích ngắn trên form: "Tiền phòng tính đến hết ngày dd/mm (ngày trước ngày bàn giao)".
- Ví dụ hợp đồng 1 năm: `start_date = 01/10/2026`, `end_date = 30/09/2027`, trả đúng hạn khi bàn giao ngày `01/10/2027`.
- Hợp đồng đã qua `end_date` mà chưa thanh lý **vẫn hiệu lực và vẫn tính tiền**: hiển thị cảnh báo "Quá hạn trả phòng".

---

## 4. Hệ thống thiết kế và layout

### 4.1 Nhận diện (giữ theo code hiện có)

> **Đã thay (18/10/2026):** `frontend/` dùng nhận diện Antigravity — font Plus Jakarta Sans/Space Grotesk, tông `sky`/`teal`, token `brand-*` (dải sky) trong `src/index.css`. Các giá trị dưới đây chỉ còn giá trị tham khảo.

- Màu thương hiệu `brand` (xanh dương): `brand-50 #eff6ff`, `brand-100 #dbeafe`, `brand-500 #3b82f6`, `brand-600 #2563eb` (nút chính), `brand-700 #1d4ed8` (hover). Màu trung tính: `slate`. Nền trang `slate-50`, chữ `slate-800`.
- Font: `'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif`.
- Phong cách: sạch, nhiều khoảng trắng, bo góc `rounded-lg`/`rounded-xl`, viền `border-slate-200`, bóng nhẹ. Ưu tiên rõ ràng hơn trang trí: đây là công cụ quản lý.
- **Mobile-first**, responsive. Bảng dữ liệu chuyển thành danh sách thẻ (card) trên màn hình nhỏ. Khu vực Bảo vệ và Nhân viên sửa chữa thiết kế ưu tiên **điện thoại** (nút lớn, một cột).

### 4.2 Layout

| Layout | Dùng cho | Cấu trúc (đã có trong code) |
|---|---|---|
| `PublicLayout` | Khách, `user` | Header: logo, menu ngang (Trang chủ, Phòng trống, Liên hệ), nút "Đăng nhập" (hoặc avatar + menu tài khoản khi đã đăng nhập). Nội dung `max-w-6xl`. Footer |
| `DashboardShell` → `ResidentLayout`, `AdminLayout` | Cư dân, Admin | Sidebar trái rộng 256px (ẩn trên mobile, mở bằng nút hamburger, có lớp phủ), thanh trên cao 64px. Thêm vào thanh trên: **chuông thông báo** có số chưa đọc + **menu tài khoản** (Hồ sơ, Đăng xuất) |
| `StaffLayout` (mới, DB-D10) | Nhân viên sửa chữa, Bảo vệ | Dùng lại `DashboardShell`; menu khác nhau theo vai trò. Trên mobile nên có **thanh điều hướng dưới** thay sidebar — [ĐỀ XUẤT UI] |

> **Hiện trạng:** bản Antigravity không có `DashboardShell`; mỗi layout (`AdminLayout`, `ResidentLayout`, `StaffLayout`) tự dựng khung. `PublicLayout` gồm `PublicNavbar` + `PublicFooter`. `ResidentLayout`, `StaffLayout` đã có (thanh điều hướng dưới trên mobile) nhưng chưa gắn route.

### 4.3 Thành phần dùng chung cần có

`Button` (primary/secondary/danger/ghost, trạng thái loading), `Input`, `Select`, `Textarea`, `DatePicker`, `MonthPicker` (chọn kỳ), `MoneyInput` (chỉ nhận số nguyên, hiển thị phân cách nghìn), `DecimalInput` (chỉ số, tối đa 2 chữ số thập phân), `FileUpload` (ảnh jpg/png/webp, ≤ 5 MB, xem trước), `ImageGallery` + `Lightbox`, `DataTable` (sắp xếp, lọc, phân trang, chuyển thành card trên mobile), `StatusBadge`, `Modal`, `Drawer` (trượt từ phải, dùng cho form tạo/sửa), `ConfirmDialog`, `Stepper` (wizard), `Tabs`, `Toast`, `Alert` (info/warning/error/success), `EmptyState`, `Skeleton`, `KpiCard`, `Timeline`, `Pagination`, `MoneySummary` (bảng tổng tiền căn phải).

### 4.4 Bảng nhãn trạng thái và màu

| Đối tượng | Giá trị → Nhãn (màu) |
|---|---|
| Phòng | `available` → Còn trống (xanh lá) · `occupied` → Đang thuê (xanh dương) · `maintenance` → Đang bảo trì (vàng) · `inactive` → Ngừng sử dụng (xám). Cờ `is_public` → "Công khai" / "Ẩn" |
| Tòa nhà, Dịch vụ | `active` → Hoạt động (xanh lá) · `inactive` → Ngừng hoạt động (xám) |
| Tài khoản | `active` → Hoạt động (xanh lá) · `locked` → Đã khóa (đỏ) |
| Hợp đồng | `draft` → Nháp (xám) · `active` → Đang hiệu lực (xanh lá) · `terminated` → Đã thanh lý (slate). Nhãn suy ra: "Sắp hết hạn" (vàng, khi còn ≤ `contract.expiring_warning_days` ngày đến `end_date`), "Quá hạn trả phòng" (đỏ, khi đã qua `end_date` mà vẫn active). `expired` là [SHOULD] — **không hiển thị** |
| Tiền cọc | `unpaid` → Chưa nhận cọc (xám) · `held` → Đang giữ cọc (xanh dương) · `settled` → Đã đối soát (xanh lá). `transferred` là [SHOULD] — không hiển thị |
| Lý do thanh lý | `on_time` → Trả đúng hạn · `early_termination` → Trả trước hạn · `same_day` → Trả trong ngày nhận phòng. "Trả quá hạn" chưa có mã [CHỜ P3] |
| Hóa đơn — loại | `monthly` → Hóa đơn tháng · `final` → Hóa đơn tất toán. `adjustment` là [SHOULD] — không hiển thị |
| Hóa đơn — trạng thái | `draft` → Nháp (xám) · `issued` → Chưa thanh toán (xanh dương) · `partially_paid` → Thanh toán một phần (vàng) · `paid` → Đã thanh toán (xanh lá) · `cancelled` → Đã hủy (xám, gạch ngang). Nhãn suy ra: **"Quá hạn"** (đỏ) khi `due_date` < hôm nay và trạng thái là `issued`/`partially_paid` |
| Dòng hóa đơn | `rent` → Tiền phòng · `electricity` → Tiền điện · `water` → Tiền nước · `service` → Dịch vụ · `discount` → Giảm trừ · `other` → Khoản khác. Đề xuất mới [CHỜ P7]: `termination_fee` → Phí trả phòng trước hạn · `damage` → Bồi thường tài sản |
| Thanh toán — trạng thái | `pending` → Chờ xác nhận (vàng) · `confirmed` → Đã xác nhận (xanh lá) · `rejected` → Bị từ chối (đỏ) |
| Thanh toán — hình thức | `bank_transfer` → Chuyển khoản · `cash` → Tiền mặt · `deposit` → Khấu trừ tiền cọc (ghi chú: không tính doanh thu thực thu) |
| Chỉ số | `periodic` → Định kỳ · `final` → Chốt khi trả phòng |
| Dịch vụ — cách tính | `per_room` → Theo phòng · `per_person` → Theo người · `per_unit` → Theo số lượng (ví dụ số xe) · `metered` → Theo chỉ số (chỉ Điện, Nước) |
| Sửa chữa — trạng thái | `pending` → Chờ xử lý (vàng) · `in_progress` → Đang xử lý (xanh dương) · `resolved` → Đã xử lý (xanh lá) · `rejected` → Từ chối (đỏ) |
| Sửa chữa — ưu tiên | `low` → Thấp · `normal` → Bình thường · `high` → Cao (cam) · `urgent` → Khẩn cấp (đỏ) |
| Lịch xem phòng | `pending` → Chờ xác nhận (vàng) · `confirmed` → Đã xác nhận (xanh dương) · `completed` → Đã hoàn tất (xanh lá) · `cancelled` → Đã hủy (xám). Trạng thái bảo vệ (suy ra): Chưa đến / Đã vào (giờ check-in) / Đã ra (giờ check-out) |
| Vai trò | `user` → Khách đã đăng ký · `resident` → Cư dân · `admin` → Quản trị viên · `technician` → Nhân viên sửa chữa · `guard` → Bảo vệ |

---

## 5. Sitemap và danh sách màn hình

Một "màn hình" = một route riêng. Modal, drawer, wizard bên trong màn hình liệt kê ở §9, không tính là màn hình.

### 5.1 Public — `PublicLayout`

| ID | Màn hình | Route | Nhãn |
|---|---|---|---|
| PUB-01 | Trang chủ | `/` | [MVP] |
| PUB-02 | Danh sách phòng trống | `/rooms` | [MVP] |
| PUB-03 | Chi tiết phòng + đặt lịch xem | `/rooms/:roomId` | [MVP] |
| PUB-04 | Liên hệ | `/contact` | [MVP] (chỉ thông tin; form liên hệ là [SHOULD]) |
| PUB-05 | Đăng nhập | `/login` | [MVP] |
| PUB-06 | Đăng ký tài khoản | `/register` | [MVP] |
| ACC-01 | Lịch hẹn của tôi (vai trò `user`) | `/account/appointments` | Q2 đã chốt khu tài khoản; chi tiết tích hợp xem Spec Auth |
| ACC-02 | Tài khoản của tôi (vai trò `user`) | `/account/profile` | Q2 đã chốt khu tài khoản; chi tiết tích hợp xem Spec Auth |

### 5.2 Cư dân — `ResidentLayout`

| ID | Màn hình | Route | Nhãn |
|---|---|---|---|
| RES-01 | Tổng quan | `/resident` | [MVP] |
| RES-02 | Hợp đồng của tôi (hiện tại + lịch sử) | `/resident/contracts` | [MVP] |
| RES-03 | Chi tiết hợp đồng | `/resident/contracts/:contractId` | [MVP] |
| RES-04 | Hóa đơn và công nợ | `/resident/invoices` | [MVP] |
| RES-05 | Chi tiết hóa đơn + thanh toán | `/resident/invoices/:invoiceId` | [MVP] |
| RES-06 | Yêu cầu sửa chữa | `/resident/requests` | [MVP] |
| RES-07 | Gửi yêu cầu sửa chữa | `/resident/requests/new` | [MVP] |
| RES-08 | Chi tiết yêu cầu sửa chữa | `/resident/requests/:requestId` | [MVP] |
| RES-09 | Thông báo | `/resident/notifications` | [MVP] |
| RES-10 | Thông tin cá nhân + đổi mật khẩu | `/resident/profile` | [MVP] |

### 5.3 Quản trị viên — `AdminLayout`

| ID | Màn hình | Route | Nhãn |
|---|---|---|---|
| ADM-01 | Dashboard | `/admin` | [MVP]; nội dung chỉ số là [ĐỀ XUẤT UI] |
| ADM-02 | Tòa nhà | `/admin/buildings` | [MVP] |
| ADM-03 | Chi tiết tòa nhà | `/admin/buildings/:buildingId` | [MVP] |
| ADM-04 | Phòng | `/admin/rooms` | [MVP] |
| ADM-05 | Chi tiết phòng | `/admin/rooms/:roomId` | [MVP] |
| ADM-06 | Danh mục tiện nghi | `/admin/amenities` | [MVP] |
| ADM-07 | Danh mục dịch vụ | `/admin/services` | [MVP] |
| ADM-08 | Giá điện nước | `/admin/utility-prices` | [MVP] |
| ADM-09 | Người dùng (cư dân, khách đã đăng ký, nhân viên) | `/admin/users` | [MVP] — thay placeholder `/admin/residents` hiện có |
| ADM-10 | Chi tiết người dùng | `/admin/users/:userId` | [MVP] |
| ADM-11 | Hợp đồng | `/admin/contracts` | [MVP] |
| ADM-12 | Lập hợp đồng (wizard) | `/admin/contracts/new` (sửa nháp: `/admin/contracts/:contractId/edit`) | [MVP] |
| ADM-13 | Chi tiết hợp đồng | `/admin/contracts/:contractId` | [MVP] |
| ADM-14 | Thanh lý hợp đồng (wizard) | `/admin/contracts/:contractId/terminate` | [MVP]; một số bước [CHỜ P3–P6, P9, P11, P12] |
| ADM-15 | Ghi chỉ số điện nước | `/admin/meter-readings` | [MVP] |
| ADM-16 | Hóa đơn | `/admin/invoices` | [MVP] |
| ADM-17 | Chi tiết hóa đơn | `/admin/invoices/:invoiceId` | [MVP] |
| ADM-18 | Duyệt thanh toán | `/admin/payments` | [MVP] |
| ADM-19 | Công nợ | `/admin/debts` | [ĐỀ XUẤT UI] — Q12 (dữ liệu là hóa đơn còn nợ gom theo hợp đồng, không phải đối tượng riêng) |
| ADM-20 | Yêu cầu sửa chữa | `/admin/maintenance-requests` | [MVP] |
| ADM-21 | Chi tiết yêu cầu sửa chữa | `/admin/maintenance-requests/:requestId` | [MVP] |
| ADM-22 | Lịch xem phòng | `/admin/viewing-appointments` | [MVP] |
| ADM-23 | Cài đặt | `/admin/settings` | [MVP] |
| ADM-24 | Thông báo | `/admin/notifications` | [MVP] |
| ADM-25 | Hồ sơ cá nhân + đổi mật khẩu | `/admin/profile` | [MVP] |

### 5.4 Nhân viên — `StaffLayout`

| ID | Màn hình | Route | Vai trò | Nhãn |
|---|---|---|---|---|
| STF-01 | Việc được giao | `/staff/maintenance-requests` | `technician` | [MVP] |
| STF-02 | Chi tiết việc được giao | `/staff/maintenance-requests/:requestId` | `technician` | [MVP] |
| STF-03 | Lịch xem phòng hôm nay | `/staff/appointments` | `guard` | [MVP] |
| STF-04 | Thông báo | `/staff/notifications` | cả hai | [MVP] |
| STF-05 | Hồ sơ cá nhân + đổi mật khẩu | `/staff/profile` | cả hai | [MVP] |

`/staff` chuyển hướng theo vai trò: `technician` → STF-01, `guard` → STF-03.

### 5.5 Hệ thống

| ID | Màn hình | Route | Nhãn |
|---|---|---|---|
| SYS-01 | Không có quyền (403) | hiển thị tại route bị chặn | [MVP] |
| SYS-02 | Không tìm thấy (404) | `*` | [MVP] (đã có) |
| SYS-03 | Lỗi hệ thống / lỗi route | error boundary | [MVP] (đã có) |

### 5.6 Tổng số màn hình

| Khu vực | Đã xác nhận [MVP] | [ĐỀ XUẤT UI] | Tổng |
|---|---:|---:|---:|
| Public | 6 | 2 | 8 |
| Cư dân | 10 | 0 | 10 |
| Quản trị viên | 24 | 1 | 25 |
| Nhân viên (sửa chữa + bảo vệ) | 5 | 0 | 5 |
| Hệ thống | 3 | 0 | 3 |
| **Tổng** | **48** | **3** | **51** |

Đếm theo **màn hình (mã ID)**, không theo route: ADM-12 có hai route (lập mới, sửa nháp); SYS-01, SYS-03 không có URL riêng. Mọi tài liệu báo tiến độ dùng mốc 51 / 48 / 3 (xem `docs/SCREEN_INVENTORY.md` §1).

---

## 6. Menu theo vai trò

| Vai trò | Menu (theo thứ tự) |
|---|---|
| Khách | Trang chủ · Phòng trống · Liên hệ · [Đăng nhập] · [Đăng ký] |
| `user` | Trang chủ · Phòng trống · Liên hệ · Menu tài khoản: Lịch hẹn của tôi, Tài khoản, Đăng xuất |
| Cư dân | Tổng quan · Hợp đồng · Hóa đơn · Yêu cầu sửa chữa · Thông báo · Thông tin cá nhân |
| Admin | **Tổng quan:** Dashboard · **Bất động sản:** Tòa nhà, Phòng, Tiện nghi · **Cho thuê:** Hợp đồng, Người dùng, Lịch xem phòng · **Tài chính:** Chỉ số điện nước, Hóa đơn, Duyệt thanh toán (badge số chờ duyệt), Công nợ · **Vận hành:** Yêu cầu sửa chữa (badge số chờ xử lý) · **Cấu hình:** Dịch vụ, Giá điện nước, Cài đặt |
| Nhân viên sửa chữa | Việc được giao · Thông báo · Hồ sơ |
| Bảo vệ | Lịch hôm nay · Thông báo · Hồ sơ |

Điểm đến tham chiếu của prototype cũ: `user` → `/`, `resident` → `/resident`, `admin` → `/admin`, nhân viên → `/staff`. **AUTH-D02 CONFIRMED:** Admin tới `/admin`; user/resident/technician/guard tới `/account/profile` hiện có. Resident/Staff có thông báo khu vực chưa hoàn thiện, chỉ thông tin tài khoản thật từ `/me`; không redirect tới `/resident`/`/staff` chưa có route và không tạo dashboard giả.

---

## 7. Mô tả màn hình

Định dạng: **Mục đích** · **Nội dung** · **Hành động** · **Lưu ý**.

### 7.1 Public

**PUB-01 Trang chủ.** Giới thiệu hệ thống chung cư mini. Nội dung: hero với ô lọc nhanh (tòa nhà, khoảng giá); danh sách tòa nhà (tên, địa chỉ, tiện nghi tòa); khối "Phòng còn trống nổi bật" (4–8 thẻ phòng); 3 bước "Xem phòng → Đặt lịch → Ký hợp đồng"; thông tin liên hệ lấy từ cài đặt. Hành động: Xem tất cả phòng, Xem chi tiết.

**PUB-02 Phòng trống.** Chỉ hiển thị phòng `available` **và** `is_public`. Bộ lọc: tòa nhà, khoảng giá, diện tích, số người tối đa, tiện nghi; sắp xếp theo giá/diện tích. Thẻ phòng: ảnh bìa, mã phòng, tòa nhà, tầng, diện tích, giá thuê/tháng, số người tối đa, 3–4 tiện nghi. Trạng thái rỗng: "Hiện chưa có phòng trống phù hợp" + nút xóa bộ lọc.

**PUB-03 Chi tiết phòng.** Thư viện ảnh (ảnh bìa + lightbox); thông tin: mã phòng, tòa nhà, địa chỉ, tầng, diện tích, giá thuê, tiền cọc, số người tối đa, mô tả; **tiện nghi = hợp của tiện nghi tòa nhà và tiện nghi riêng phòng, không trùng lặp** (DB-D01) — có thể chia hai nhóm "Tiện nghi tòa nhà" / "Trong phòng" nhưng một tiện nghi chỉ xuất hiện một lần; liên kết bản đồ nếu tòa có tọa độ ([ĐỀ XUẤT UI]: link mở Google Maps, không nhúng bản đồ). **Form đặt lịch xem phòng** (cột phải trên desktop, cuối trang trên mobile): họ tên, số điện thoại, thời gian mong muốn (ngày + giờ, trong tương lai). Đã đăng nhập → điền sẵn họ tên/SĐT. Có trường ẩn chống spam (honeypot), không hiển thị. Lưu ý: tiện nghi **không** phải khoản thu — không hiển thị giá cạnh tiện nghi. Phòng không còn công khai → trang 404 thân thiện "Phòng này hiện không còn nhận lịch xem".
- Thành công: thẻ xác nhận có mã lịch `APT-…`, thời gian, "Ban quản lý sẽ liên hệ xác nhận".
- Lỗi: đã có lịch chờ/đã xác nhận cho cùng SĐT + phòng → "Bạn đã có lịch xem phòng này đang chờ xử lý"; gửi quá nhiều (giới hạn 5 lần/giờ) → "Bạn thao tác quá nhanh, vui lòng thử lại sau".

**PUB-04 Liên hệ.** Tên hệ thống, số điện thoại, email (từ cài đặt), danh sách tòa nhà và địa chỉ. **Không** có form gửi liên hệ (bảng `contact_requests` là [SHOULD]).

**PUB-05 Đăng nhập.** Một định danh email **hoặc SĐT** + mật khẩu (T2); React dùng trường `identifier`, RHF + Zod; Laravel kiểm tra cuối cùng. Lỗi theo API Spec; không suy ra tài khoản tồn tại khi sai mật khẩu; vượt hạn mức chờ thử lại. Q4 đã chốt phục hồi qua email đã xác minh/hỗ trợ thủ công nếu không có email, nhưng chưa triển khai trong Bước 4; không dựng luồng quên mật khẩu giả.

**PUB-06 Đăng ký.** Bắt buộc họ tên/SĐT/mật khẩu + xác nhận; **email tùy chọn**, thiếu thì NULL. Email có giá trị và SĐT duy nhất, 422 theo trường. Vai trò duy nhất user/active; không hỏi CCCD. **AUTH-D01 CONFIRMED:** tạo thành công thì tự đăng nhập user/active, đổi mã phiên; không nâng quyền hoặc tự xác minh email.

**ACC-01 Lịch hẹn của tôi** [ĐỀ XUẤT UI về phạm vi chi tiết]. Q2 đã chốt có khu tài khoản; chưa có API lịch hẹn, Bước 4 không tự tích hợp module này. Danh sách lịch xem phòng đã đặt khi đăng nhập: mã, phòng, thời gian, trạng thái, ghi chú của ban quản lý. Không có hành động sửa (chưa có quy tắc hủy/đổi lịch bởi khách — Q3).

**ACC-02 Tài khoản của tôi.** Q2 đã chốt có khu tài khoản; Q10 đã chốt giới hạn tự sửa. **AUTH-D03 CONFIRMED:** Bước 4 chỉ đọc trường thật từ me, đã bỏ lưu giả và lịch hẹn cá nhân mock; chỉnh hồ sơ/đổi mật khẩu/thay email xác minh là task tương lai, chưa có API.

### 7.2 Cư dân

**RES-01 Tổng quan.**
- Có hợp đồng active: thẻ "Phòng của tôi" (mã phòng, tòa, địa chỉ, ngày bắt đầu, ngày cuối được ở, cảnh báo sắp hết hạn/quá hạn); thẻ "Cần thanh toán" (tổng còn nợ, số hóa đơn quá hạn, nút "Thanh toán"); "Yêu cầu sửa chữa gần đây" (3 dòng + nút "Gửi yêu cầu"); "Thông báo mới".
- Không còn hợp đồng active (đã thanh lý): banner "Bạn không còn hợp đồng đang hiệu lực. Bạn vẫn xem được lịch sử hợp đồng và hóa đơn." Ẩn nút "Gửi yêu cầu sửa chữa"; vẫn hiển thị công nợ còn lại nếu có.

**RES-02 Hợp đồng của tôi.** Danh sách: mã hợp đồng, phòng, thời hạn, trạng thái, tiền thuê. Hợp đồng nháp **không** hiển thị cho cư dân ([ĐỀ XUẤT UI]).

**RES-03 Chi tiết hợp đồng.** Chỉ đọc. Thông tin phòng; ngày bắt đầu, ngày cuối được ở, bàn giao dự kiến; tiền thuê/tháng; số người ở; người ở cùng (nếu có); tiền cọc + trạng thái cọc; dịch vụ đăng ký (tên, cách tính, số lượng, đơn giá, hiệu lực từ–đến); chỉ số đầu điện/nước; **điều khoản bồi thường trả trước hạn** và **điều kiện miễn bồi thường** đã ký; khi đã thanh lý: ngày bàn giao thực tế, lý do thanh lý, kết quả kiểm tra phòng, kết quả đối soát cọc (đã khấu trừ, hoàn lại), liên kết hóa đơn tất toán.

**RES-04 Hóa đơn và công nợ.** Thẻ tóm tắt: tổng còn phải trả, số hóa đơn quá hạn, số thanh toán đang chờ xác nhận. Bảng: mã hóa đơn, loại, kỳ, tổng, đã trả, còn lại, hạn, trạng thái (gồm nhãn "Quá hạn"). Lọc: trạng thái, năm. Chỉ hiển thị hóa đơn đã phát hành (không hiển thị nháp). Hóa đơn đã hủy: hiển thị mờ, kèm liên kết "Xem hóa đơn thay thế".

**RES-05 Chi tiết hóa đơn.** Đầu trang: mã, loại, kỳ, ngày phát hành, hạn thanh toán, trạng thái. **Bảng dòng hóa đơn**: mô tả, số lượng, đơn giá, thành tiền; dòng điện nước hiển thị chi tiết "Chỉ số 1.234,50 → 1.334,50 = 100,00 kWh × 3.500 ₫"; dòng chia ngày hiển thị "17/31 ngày"; dòng giảm trừ âm. Tổng: tổng hóa đơn, đã xác nhận, **còn lại**. Khối **Thanh toán chuyển khoản**: ngân hàng, số tài khoản, chủ tài khoản (từ cài đặt), số tiền gợi ý = còn lại, nội dung chuyển khoản gợi ý = mã hóa đơn, ảnh VietQR (prototype: ảnh giữ chỗ), nút sao chép. Nút **"Tôi đã chuyển khoản"** mở modal gửi minh chứng (§9). **Lịch sử thanh toán**: ngày gửi, số tiền, hình thức, trạng thái, số biên nhận (khi đã xác nhận), lý do từ chối (khi bị từ chối). Ghi chú cố định: "Khoản chờ xác nhận chưa được trừ vào công nợ." Ẩn nút thanh toán khi hóa đơn `paid` hoặc `cancelled`.

**RES-06 Yêu cầu sửa chữa.** Danh sách: mã, tiêu đề, ưu tiên, trạng thái, ngày gửi, ngày xử lý xong. Lọc trạng thái. Nút "Gửi yêu cầu" chỉ khi có hợp đồng active.

**RES-07 Gửi yêu cầu sửa chữa.** Phòng (tự điền từ hợp đồng active, chỉ đọc), tiêu đề (≤ 150 ký tự), mô tả, mức ưu tiên (Q9), ảnh (tối đa 5, jpg/png/webp, ≤ 5 MB/ảnh). Thành công: chuyển sang chi tiết với mã `MR-…`.

**RES-08 Chi tiết yêu cầu sửa chữa.** Thông tin đã gửi, ảnh, trạng thái dạng dòng thời gian (Đã gửi → Đã phân công → Đang xử lý → Đã xử lý / Từ chối, mỗi mốc có thời gian), ghi chú của ban quản lý, ghi chú xử lý của nhân viên. Không hiển thị chi phí nội bộ ([ĐỀ XUẤT UI]).

**RES-09 Thông báo** (dùng chung cho mọi khu vực đăng nhập). Danh sách: tiêu đề, nội dung ngắn, thời gian, đã đọc/chưa đọc; bấm vào mở đối tượng liên quan và đánh dấu đã đọc; nút "Đánh dấu tất cả đã đọc". Lọc: tất cả/chưa đọc.

**RES-10 Thông tin cá nhân.** Họ tên, email, số điện thoại (Q10 đã chốt giới hạn tự sửa; quy trình triển khai xem Spec Auth, ngoài Bước 4), ngày sinh, giới tính, địa chỉ thường trú; **không hiển thị CCCD** cho cư dân (CCCD chỉ trả về cho Admin — DB-D19). Khối đổi mật khẩu.

### 7.3 Quản trị viên

**ADM-01 Dashboard** [ĐỀ XUẤT UI — nội dung]. KPI: tổng phòng / đang thuê / còn trống / bảo trì, tỷ lệ lấp đầy; **thực thu tháng này** (tổng thanh toán đã xác nhận, **không gồm** khấu trừ cọc); tổng công nợ, công nợ quá hạn; số thanh toán chờ duyệt; số yêu cầu sửa chữa chờ xử lý; lịch xem phòng hôm nay. Biểu đồ (Recharts): cột thực thu 6–12 tháng; tròn/thanh trạng thái phòng theo tòa. Danh sách việc cần làm: hợp đồng sắp hết hạn, hợp đồng quá hạn trả phòng, phòng chưa ghi chỉ số kỳ trước, hóa đơn nháp chưa phát hành. Lọc theo tòa nhà.

**ADM-02 Tòa nhà.** Bảng/thẻ: tên, địa chỉ, số tầng, số phòng theo trạng thái, trạng thái. Nút "Thêm tòa nhà" → drawer: tên (duy nhất), địa chỉ, số tầng (≥ 1), vĩ độ/kinh độ (tùy chọn), mô tả, trạng thái, **tiện nghi tòa nhà** (chọn nhiều). Không có nút xóa tòa còn phòng/hợp đồng; dùng "Ngừng hoạt động".

**ADM-03 Chi tiết tòa nhà.** Thông tin, tiện nghi tòa, **sơ đồ phòng theo tầng** (lưới ô phòng tô màu theo trạng thái; bấm ô mở chi tiết phòng — [ĐỀ XUẤT UI]), thống kê nhanh. Nút "Thêm phòng" (điền sẵn tòa).

**ADM-04 Phòng.** Bảng: mã phòng, tòa, tầng, diện tích, giá thuê, tiền cọc, số người tối đa, trạng thái, công khai, người thuê hiện tại. Lọc: tòa, tầng, trạng thái, công khai. Drawer tạo/sửa: tòa nhà, mã phòng (duy nhất trong tòa), tầng (1..số tầng của tòa), diện tích, giá thuê niêm yết, tiền cọc niêm yết, số người tối đa, trạng thái, công khai trên website, mô tả, **tiện nghi riêng phòng** (chọn nhiều; tiện nghi tòa hiển thị mờ "Kế thừa từ tòa nhà", không chọn lại), ảnh phòng (nhiều ảnh, chọn ảnh bìa, sắp thứ tự). Lưu ý trên form: "Phòng chỉ hiển thị trên website khi Còn trống và Công khai."

**ADM-05 Chi tiết phòng.** Tabs: **Thông tin** (kèm tiện nghi hợp nhất) · **Ảnh** · **Hợp đồng** (hiện tại + lịch sử, nút "Lập hợp đồng" khi phòng trống) · **Chỉ số điện nước** (lịch sử theo dịch vụ: kỳ, loại, ngày ghi, chỉ số trước/sau, tiêu thụ, đơn giá, hợp đồng chịu phí hoặc "Phòng trống", đã vào hóa đơn nào) · **Sửa chữa** · **Lịch xem**.

**ADM-06 Tiện nghi.** Bảng: tên, mô tả, số tòa/phòng đang dùng. Modal tạo/sửa. "Xóa" là lưu trữ (ẩn khỏi danh mục, giữ lịch sử). Ghi chú: "Tiện nghi mô tả cơ sở vật chất, không phát sinh tiền. Khoản thu khai báo ở Dịch vụ."

**ADM-07 Dịch vụ.** Bảng: mã, tên, cách tính, đơn vị, đơn giá, trạng thái. Hai dòng **Điện (`ELECTRICITY`)** và **Nước (`WATER`)** có nhãn "Hệ thống", không sửa mã/cách tính/không xóa, cột giá hiển thị "Theo bảng giá điện nước" (liên kết ADM-08). Modal tạo/sửa: mã (không sửa được khi đã dùng), tên (duy nhất), cách tính (`per_room`/`per_person`/`per_unit` — không cho chọn `metered`), đơn vị, đơn giá, mô tả, trạng thái. Ghi chú: "Đổi giá không ảnh hưởng hợp đồng đã đăng ký (giá được lưu tại thời điểm đăng ký)."

**ADM-08 Giá điện nước.** Hai thẻ Điện / Nước: giá đang áp dụng, áp dụng từ kỳ nào. Bảng lịch sử: áp dụng từ (tháng), đơn giá, đã được dùng hay chưa. Modal "Thêm giá mới": dịch vụ, **tháng áp dụng** (MonthPicker → luôn ngày 01), đơn giá. Lỗi: tháng áp dụng không sau kỳ chỉ số mới nhất → "Đã có chỉ số/hóa đơn cho kỳ này hoặc sau đó, không thể đặt giá mới từ tháng này". Không sửa/xóa giá đã dùng. Trạng thái rỗng khi chưa cấu hình: cảnh báo "Chưa có giá điện/nước — chưa thể ghi chỉ số".

**ADM-09 Người dùng.** Tabs/lọc theo vai trò: Cư dân, Khách đã đăng ký, Nhân viên sửa chữa, Bảo vệ, Quản trị viên. Bảng: họ tên, email, SĐT, vai trò, trạng thái, đang thuê (có/không, phòng). Tìm kiếm theo tên/SĐT/email. Nút "Tạo tài khoản nhân viên" (Q11). Hành động: khóa/mở khóa (xác nhận).

**ADM-10 Chi tiết người dùng.** Hồ sơ đầy đủ **kể cả CCCD** (chỉ Admin), ngày sinh, giới tính, địa chỉ thường trú; vai trò; trạng thái; các hợp đồng; công nợ; yêu cầu sửa chữa; (với technician) việc đang được giao. Sửa hồ sơ trong drawer. Không cho Admin tự đổi `user` ↔ `resident` (vai trò này do hợp đồng quyết định).

**ADM-11 Hợp đồng.** Bảng: mã (hoặc "Nháp"), phòng, người thuê, bắt đầu, ngày cuối được ở, tiền thuê, trạng thái + nhãn suy ra (Sắp hết hạn / Quá hạn trả phòng), trạng thái cọc. Tabs: Nháp · Đang hiệu lực · Sắp hết hạn · Quá hạn trả phòng · Đã thanh lý. Nút "Lập hợp đồng".

**ADM-12 Lập hợp đồng (wizard)** — xem luồng §8.1.

**ADM-13 Chi tiết hợp đồng.** Đầu trang: mã, trạng thái, phòng, người thuê, các nút theo trạng thái — *Nháp:* Sửa, Xóa nháp, **Kích hoạt** · *Đang hiệu lực:* Thay đổi dịch vụ, Lập hóa đơn tháng, **Thanh lý** · *Đã thanh lý:* chỉ xem. Tabs: **Tổng quan** (ngày, tiền thuê, cọc, số người, chỉ số đầu, ghi chú, thông tin chênh lệch chỉ số nếu có: lý do, người xác nhận, thời điểm) · **Điều khoản** (bồi thường trước hạn, điều kiện miễn) · **Dịch vụ** (danh sách dòng đăng ký kèm khoảng hiệu lực; lịch sử các lần thay đổi) · **Người ở cùng** [SHOULD] · **Chỉ số điện nước** · **Hóa đơn và thanh toán** · **Thanh lý** (khi đã thanh lý: ngày bàn giao, lý do, ghi chú, kiểm tra phòng, phí trước hạn/miễn, đối soát cọc). Banner khi active: "Hợp đồng đang hiệu lực: không thể sửa phòng, người thuê, tiền thuê, tiền cọc, ngày và điều khoản bồi thường."

**ADM-14 Thanh lý (wizard)** — xem luồng §8.4.

**ADM-15 Ghi chỉ số điện nước** — xem luồng §8.5.

**ADM-16 Hóa đơn.** Bảng: mã (hoặc "Nháp"), phòng, người thuê, loại, kỳ, tổng, đã trả, còn lại, hạn, trạng thái. Lọc: kỳ, tòa nhà, loại, trạng thái, quá hạn. Nút **"Lập hóa đơn tháng"** (modal, §9). Chọn nhiều hóa đơn nháp → "Phát hành" hàng loạt ([ĐỀ XUẤT UI]).

**ADM-17 Chi tiết hóa đơn.** Như RES-05 nhưng thêm: *Nháp* — xóa dòng / thêm "Khoản khác" (Q13), Xóa nháp, **Phát hành** (xác nhận: "Sau khi phát hành, hóa đơn không thể sửa. Hạn thanh toán: dd/mm/yyyy"); *Đã phát hành* — **Ghi nhận thanh toán** (tiền mặt/chuyển khoản do Admin nhập, xác nhận ngay), **Hủy hóa đơn** (lý do bắt buộc) → sau khi hủy có nút "Lập hóa đơn thay thế"; liên kết qua lại hóa đơn cũ/thay thế. Thông tin minh chứng thanh toán xem trong lightbox.

**ADM-18 Duyệt thanh toán.** Tabs: Chờ xác nhận (mặc định) · Đã xác nhận · Bị từ chối · Tất cả. Danh sách/thẻ: ảnh minh chứng (thumbnail), số tiền, hóa đơn, phòng, người gửi, thời gian gửi, còn lại của hóa đơn. Bố cục [ĐỀ XUẤT UI]: hai cột — danh sách trái, khung xem chi tiết phải (ảnh lớn, thông tin hóa đơn). Hành động: **Xác nhận** (hiển thị số biên nhận `RCP-…` sau khi xong) · **Từ chối** (lý do bắt buộc). Thanh toán `deposit` hiển thị nhãn "Khấu trừ tiền cọc — không tính doanh thu".

**ADM-19 Công nợ** [ĐỀ XUẤT UI]. Gom các hóa đơn còn nợ theo hợp đồng/người thuê: phòng, người thuê, số hóa đơn còn nợ, tổng còn nợ, quá hạn lâu nhất, trạng thái hợp đồng (gồm hợp đồng đã thanh lý còn nợ). Bấm mở danh sách hóa đơn của hợp đồng. Số liệu lấy từ mock (Backend tính).

**ADM-20 Yêu cầu sửa chữa.** Bảng: mã, phòng, người gửi, tiêu đề, ưu tiên, trạng thái, người được giao, ngày gửi. Lọc: trạng thái, ưu tiên, tòa, người được giao, chưa phân công. Tùy chọn hiển thị dạng Kanban theo trạng thái ([ĐỀ XUẤT UI]).

**ADM-21 Chi tiết yêu cầu sửa chữa.** Thông tin + ảnh + dòng thời gian. Hành động Admin: **Phân công / Phân công lại** (chỉ chọn nhân viên sửa chữa đang hoạt động; chỉ khi chưa Đã xử lý/Từ chối), **Từ chối** (ghi chú), **Mở lại** (Đã xử lý → Đang xử lý), sửa ghi chú quản lý, nhập **chi phí tham khảo** (ghi chú: "Không tự cộng vào hóa đơn").

**ADM-22 Lịch xem phòng.** Hai chế độ: bảng và lịch tuần ([ĐỀ XUẤT UI]). Cột: mã, phòng, khách, SĐT, thời gian hẹn, trạng thái, check-in/check-out (giờ, bảo vệ). Hành động: **Xác nhận**, **Hủy**, **Hoàn tất** (sau buổi xem), ghi chú quản lý. Bảo vệ không đổi được trạng thái; chỉ Admin hoàn tất/hủy.

**ADM-23 Cài đặt.** Nhóm **Hệ thống**: tên hệ thống, SĐT liên hệ, email liên hệ · **Ngân hàng** (hiển thị cho VietQR): tên ngân hàng, số tài khoản, chủ tài khoản · **Hóa đơn**: số ngày đến hạn sau phát hành (mặc định 5) · **Hợp đồng**: số ngày cảnh báo sắp hết hạn (mặc định 30). Mỗi nhóm có nút Lưu riêng.

**ADM-24 Thông báo**, **ADM-25 Hồ sơ**: như RES-09, RES-10 (Admin không có hợp đồng).

### 7.4 Nhân viên

**STF-01 Việc được giao (technician).** Chỉ yêu cầu `assigned_to` = mình. Thẻ lớn: mã, phòng + tòa, tiêu đề, ưu tiên (màu), trạng thái, thời gian giao. Tabs: Cần làm (Chờ xử lý) · Đang làm · Đã xong. Sắp xếp: khẩn cấp trước.

**STF-02 Chi tiết việc (technician).** Mô tả, ảnh, phòng, thông tin liên hệ cư dân (Q14), ghi chú quản lý. Nút theo trạng thái: Chờ xử lý → **"Bắt đầu xử lý"**; Đang xử lý → **"Hoàn thành"** (bắt buộc ghi chú xử lý — [ĐỀ XUẤT UI]). Không có nút từ chối, mở lại hay phân công.

**STF-03 Lịch hôm nay (guard).** Ngày hôm nay theo giờ Việt Nam ở đầu trang. Chỉ lịch **đã xác nhận** của hôm nay, sắp theo giờ. Thẻ: giờ hẹn, khách, SĐT, phòng + tòa, trạng thái bảo vệ. Nút **"Check-in"** (một lần) → sau đó **"Check-out"**; ghi chú bảo vệ. Check-out khi chưa check-in: nút bị vô hiệu. Không có nút xác nhận/hủy/hoàn tất. Trạng thái rỗng: "Hôm nay không có lịch xem phòng."

---

## 8. Các luồng giao diện trọng tâm

### 8.1 Tạo hợp đồng (Admin) — wizard ADM-12 [MVP]

Hợp đồng được lưu ở trạng thái **Nháp**; mọi trường sửa được cho đến khi kích hoạt. Thanh tiến trình (Stepper) ở trên; nút "Lưu nháp" có ở mọi bước.

| Bước | Nội dung | Kiểm tra / lưu ý |
|---|---|---|
| 1. Phòng | Chọn tòa → chọn phòng. Thẻ phòng hiển thị giá niêm yết, cọc niêm yết, số người tối đa, trạng thái | Phòng `inactive` không chọn được. Phòng đang có hợp đồng active: cảnh báo "Chỉ kích hoạt được sau khi hợp đồng hiện tại được thanh lý" (Q5) |
| 2. Người thuê đại diện | Tìm theo SĐT/email/tên trong tài khoản `user` hoặc `resident` | Người đang có hợp đồng active: hiển thị nhưng vô hiệu, ghi "Đang có hợp đồng hiệu lực". Tạo tài khoản mới ngay tại đây: Q6 |
| 3. Thời hạn và tiền | Ngày bắt đầu; **Ngày cuối được ở** (+ dòng phụ "Bàn giao dự kiến: …"); tiền thuê/tháng (điền sẵn giá niêm yết, sửa được); tiền cọc (điền sẵn); số người ở (gồm người đại diện, ≤ tối đa của phòng); ghi chú | Ngày cuối được ở > ngày bắt đầu [CHỜ P1]. Gợi ý nhanh: 6 tháng / 12 tháng |
| 4. Dịch vụ | Danh sách dịch vụ đang hoạt động: bật/tắt, số lượng (per_person/per_unit là số nguyên dương; per_room = 1), đơn giá (điền sẵn từ danh mục). Hai dòng **Điện** và **Nước** hiển thị khóa: "Tự động thêm khi kích hoạt — tính theo chỉ số" | Q7 đã chốt: lấy giá danh mục và lưu snapshot (DB-D59). `per_person` gợi ý bằng số người ở nhưng không tự đồng bộ |
| 5. Bồi thường trả trước hạn | Xem §8.2 | **Bắt buộc chọn** trước khi kích hoạt; không có lựa chọn mặc định |
| 6. Điều kiện miễn bồi thường | Xem §8.3 | [CHỜ P5] |
| 7. Người ở cùng | Họ tên, SĐT, quan hệ — thêm/xóa dòng | [SHOULD] — có thể bỏ qua trong prototype |
| 8. Xem lại | Tóm tắt mọi bước, liên kết "Sửa" từng phần. Nút **Lưu nháp** và **Lưu và kích hoạt** | |

### 8.1b Kích hoạt hợp đồng (Admin) — modal trên ADM-13 [MVP]

1. **Kiểm tra trước** (danh sách tích xanh/đỏ): phòng không có hợp đồng active khác; người thuê không có hợp đồng active khác; đã chọn điều khoản bồi thường; đủ thông tin bắt buộc.
2. **Chỉ số đầu**: hai ô Điện, Nước (DecimalInput). Bên cạnh hiển thị **chỉ số chốt gần nhất** của phòng (giá trị, ngày, loại "Chốt khi trả phòng"/"Định kỳ").
   - Nhỏ hơn chỉ số gần nhất → lỗi đỏ, không cho kích hoạt.
   - Lớn hơn → hộp cảnh báo vàng: "Chỉ số đầu cao hơn chỉ số chốt gần nhất X kWh. Phần chênh lệch không tính cho hợp đồng nào." + ô **Lý do chênh lệch** (bắt buộc) + ô tích "Tôi xác nhận chênh lệch này". **CONFIRMED DB-D40:** một lý do chung `meter_gap_reason`; tách Điện/Nước trong prototype chỉ là đề xuất mở rộng P2, không chặn kích hoạt baseline.
3. **Tiền cọc**: trạng thái cọc hiện tại; cách ghi nhận đã nhận cọc — Q15.
4. **Điều gì sẽ xảy ra** (hộp thông tin): sinh mã hợp đồng `HD-YYYY-NNNN`; phòng → Đang thuê; tài khoản → Cư dân; thêm Điện, Nước vào dịch vụ; **khóa** phòng, người thuê, tiền thuê, cọc, ngày, điều khoản bồi thường.
5. Nút **Kích hoạt**. Lỗi xung đột (409): "Phòng đã có hợp đồng đang hiệu lực" / "Người thuê đã có hợp đồng đang hiệu lực" → nút "Tải lại".
6. Thành công: toast + mã hợp đồng; gợi ý "Ghi nhận cọc" / "Xem hợp đồng".

**Thay đổi dịch vụ khi đang hiệu lực** (modal trên ADM-13) [MVP]: chọn dịch vụ, số lượng mới (hoặc ngừng dịch vụ). Hiển thị cố định: "Áp dụng từ 01/MM/YYYY (tháng sau). Hóa đơn đã phát hành không thay đổi." Không đổi Điện/Nước.

### 8.2 Thiết lập điều khoản bồi thường trả phòng trước hạn [MVP; cấu trúc lưu CHỜ P4]

Bước 5 của wizard. Quy tắc đã xác nhận (DB-D47): xác định **khi ký**, có **3 loại**, **không mặc định 1 tháng tiền thuê**, hệ thống **tự tính** khi thanh lý, **không sửa được sau kích hoạt**.

- Nhóm radio (không chọn sẵn):
  - **Không bồi thường**.
  - **Số tiền cố định** → MoneyInput "Số tiền bồi thường" (> 0).
  - **Theo hệ số tiền thuê tháng** → DecimalInput "Hệ số" (> 0, tối đa 2 chữ số thập phân, ví dụ 1,5) + dòng xem trước "≈ 1,5 × 3.500.000 ₫ = 5.250.000 ₫". Trong ứng dụng thật, số xem trước do Backend trả về; trong prototype lấy từ mock.
- Hộp giải thích: "Phí chỉ áp dụng khi người thuê trả phòng trước ngày cuối được ở. Điều khoản sẽ bị khóa khi kích hoạt hợp đồng."
- Sau khi kích hoạt: hiển thị chỉ đọc kèm biểu tượng khóa.
- Có áp dụng cho trường hợp "nhận và trả cùng ngày" không: [CHỜ P9] — hiển thị câu này trong phần giải thích dưới dạng ghi chú "Chờ duyệt".

### 8.3 Điều kiện miễn bồi thường [MVP về nguyên tắc; cấu trúc CHỜ P5]

Bước 6 của wizard. Quy tắc đã xác nhận (DB-D48): chỉ miễn khi đáp ứng điều kiện **đã thỏa thuận và ghi trong hợp đồng**; Admin xác nhận điều kiện áp dụng **cùng căn cứ**.

Prototype dựng theo **phương án B đề xuất** (danh sách có cấu trúc):
- Danh sách điều kiện: mỗi dòng có mô tả (ví dụ "Người thuê chuyển công tác có quyết định của cơ quan", "Phòng không đủ điều kiện ở do lỗi của chủ nhà"). Nút "Thêm điều kiện", xóa dòng. Cho phép để trống (= hợp đồng không có điều kiện miễn).
- Tùy chọn [CHỜ P5 phương án C]: nút "Chọn từ mẫu" lấy danh sách mẫu từ cài đặt. Prototype có thể bỏ.
- Bị ẩn khi chọn "Không bồi thường" ở §8.2.
- Khóa sau kích hoạt.

Nếu chủ dự án chọn phương án A (một ô văn bản tự do), chỉ cần thay danh sách bằng một Textarea; luồng áp dụng ở §8.4 bước 4 đổi từ "chọn điều kiện" thành "ghi điều kiện đã đáp ứng".

### 8.4 Thanh lý hợp đồng — wizard ADM-14 [MVP; cấu trúc lưu P4–P8 và chi tiết P3/P9/P11 chưa duyệt]

Chỉ mở được từ hợp đồng **Đang hiệu lực**. Thứ tự cố định theo kế hoạch §14.5; không cho nhảy bước khi bước trước chưa xong. Thanh bên phải (desktop) hiển thị **tóm tắt tài chính tạm tính** cập nhật theo từng bước (số liệu từ mock).

| Bước | Màn hình | Kiểm tra / thông báo |
|---|---|---|
| **1. Ngày bàn giao** | DatePicker "Ngày bàn giao thực tế" (≥ ngày bắt đầu). Hệ thống **tự hiển thị phân loại** (Admin không chọn): Trả trong ngày nhận phòng / Trả đúng hạn / Trả trước hạn. Dòng giải thích: "Tiền phòng và dịch vụ tính đến hết ngày dd/mm/yyyy." Textarea **Ghi chú thanh lý** — bắt buộc với *Trả trước hạn* và *Trả trong ngày nhận phòng* | Ngày bàn giao sau "bàn giao dự kiến" (trả quá hạn): chưa có mã phân loại — hiển thị cảnh báo vàng "Trường hợp trả quá hạn chờ quyết định" [CHỜ P3]. Chủ nhà đơn phương chấm dứt: chưa có cách phân biệt [CHỜ P3] |
| **2. Chốt chỉ số cuối** | Với Điện và Nước: chỉ số trước (mốc gần nhất), **chỉ số cuối** (nhập), tiêu thụ (hiển thị). Ngày ghi = ngày bàn giao (chỉ đọc). Kỳ tiêu thụ = tháng chứa ngày bàn giao (chỉ đọc) | Chặn và liệt kê kỳ còn thiếu nếu chưa ghi đủ chỉ số các kỳ trước (liên kết ADM-15). Chỉ số cuối < chỉ số trước → lỗi. Đã có chỉ số sau ngày bàn giao → lỗi. Đã chốt trước đó: hiển thị kết quả, cho đi tiếp |
| **3. Kiểm tra phòng** (bắt buộc) | Radio: **Không có hư hỏng bất thường** / **Có hư hỏng thuộc trách nhiệm người thuê**. Ghi chú chung + ảnh tình trạng phòng [CHỜ P6, P8]. Nếu có hư hỏng: bảng hạng mục — **Hạng mục**, **Lý do**, **Căn cứ** (báo giá / hóa đơn sửa chữa / định mức…), **Số tiền**, **Ảnh minh chứng** (≥ 1 ảnh [CHỜ P11]); thêm/xóa dòng | Không cho đi tiếp khi chưa chọn kết quả. "Không hư hỏng" → bồi thường tài sản = 0. Ghi chú cố định: "Khoản bồi thường tài sản tách riêng với phí trả trước hạn. Tiền cọc được đối soát riêng ở bước cuối." Áp dụng cho mọi loại thanh lý **CONFIRMED DB-D49**; chỉ cấu trúc lưu P6 chưa duyệt |
| **4. Phí trả trước hạn** | Chỉ hiện khi phân loại là *Trả trước hạn* (và *Trả trong ngày* tùy [CHỜ P9]); các trường hợp khác hiển thị "Không áp dụng". Hiển thị **điều khoản đã ký** (chỉ đọc) và **phí hệ thống tính** (không sửa được). Khối **Miễn bồi thường**: nếu hợp đồng có điều kiện miễn → ô tích "Áp dụng miễn bồi thường", chọn **một** điều kiện trong danh sách đã ký, **Căn cứ** (bắt buộc), tệp/ảnh minh chứng, ô xác nhận của Admin; nếu không có điều kiện → "Hợp đồng không có điều kiện miễn bồi thường" | Miễn toàn bộ hay một phần: [CHỜ P5]; prototype chỉ có miễn toàn bộ |
| **5. Hóa đơn tất toán** | Bản xem trước hóa đơn `final` dạng nháp: tiền phòng/dịch vụ còn thiếu, tiền điện nước kỳ cuối, **dòng giảm trừ âm** cho các ngày từ ngày bàn giao đến cuối tháng đã thu trong hóa đơn tháng, **Phí trả phòng trước hạn**, các dòng **Bồi thường tài sản**. Tổng (≥ 0). **Không** có dòng tiền cọc. Nút **Lưu nháp** → **Phát hành hóa đơn tất toán** (xác nhận) | Nếu giảm trừ vượt các khoản phải thu: tổng = 0 và hộp vàng "Phần dư X ₫ hoàn trả ngoài hệ thống — vui lòng ghi vào ghi chú thanh lý" (liên kết sửa ghi chú bước 1) |
| **6. Thanh toán và đối soát cọc** | Danh sách hóa đơn còn nợ của hợp đồng (gồm hóa đơn tất toán) theo hạn tăng dần. **Đối soát cọc** (xem trước từ mock): cọc đang giữ → khấu trừ lần lượt vào hóa đơn còn nợ theo hạn sớm nhất → **cọc hoàn lại cho người thuê** / **còn nợ sau khấu trừ** | **Chặn** nếu còn thanh toán *Chờ xác nhận*: hộp đỏ "Còn N thanh toán chờ xác nhận — cần xử lý trước khi thanh lý" + liên kết ADM-18. Cọc chưa nhận: "Không có cọc để khấu trừ" |
| **7. Xác nhận** | Tóm tắt toàn bộ. ConfirmDialog: "Thanh lý hợp đồng HD-…? Thao tác không thể hoàn tác." | Thành công: hợp đồng → Đã thanh lý; phòng → Còn trống; cọc → Đã đối soát; tạo thanh toán "Khấu trừ tiền cọc" (nếu có). Gợi ý: "Lập hợp đồng mới cho phòng này" |

**Ví dụ số liệu dùng cho mock (lấy từ checklist DB-30, DB-38):**
- Tháng 10/2026 (31 ngày), tiền phòng 3.100.000 ₫, Internet 100.000 ₫. A bàn giao ngày 15/10: A tính 14/31 ngày → tiền phòng 1.400.000 ₫, Internet 45.161 ₫. Nếu A đã có hóa đơn tháng 10 đủ tháng → hóa đơn tất toán có giảm trừ 17/31: tiền phòng −1.700.000 ₫, Internet −54.839 ₫. B nhận phòng 15/10 tính 17/31.
- Phí trước hạn: cố định 2.000.000 ₫; hoặc hệ số 1,5 × 3.500.000 ₫ = 5.250.000 ₫.

**Bàn giao cùng ngày** (DB-D24): thứ tự bắt buộc *chốt chỉ số cuối hợp đồng cũ → thanh lý hợp đồng cũ → kích hoạt hợp đồng mới*. Giao diện thể hiện bằng nút "Lập hợp đồng mới cho phòng này" sau khi thanh lý, và hộp "Chỉ số chốt gần nhất" trong modal kích hoạt.

### 8.5 Điện nước [MVP]

**Ghi chỉ số định kỳ — ADM-15.**
1. Thanh công cụ: chọn **Tòa nhà**, chọn **Kỳ tiêu thụ** (MonthPicker — Admin **phải chọn**; giao diện chỉ gợi ý "Tháng trước" khi ngày hiện tại ≤ 5, không tự chọn), **Ngày ghi** (mặc định hôm nay).
2. Lưới nhập (một dòng mỗi phòng): Phòng · Người thuê hoặc "Phòng trống" · **Điện:** chỉ số trước, chỉ số mới (ô nhập), tiêu thụ · **Nước:** tương tự · Trạng thái dòng (Chưa ghi / Đã ghi / Đã vào hóa đơn — khóa).
3. Phòng trống vẫn ghi (không tính tiền cho ai).
4. **Lưu tất cả** — **tất cả hoặc không**: nếu một dòng lỗi thì không dòng nào được lưu; tô đỏ dòng lỗi kèm thông báo; cuộn tới lỗi đầu tiên.
5. Lỗi cần thể hiện: chỉ số mới < chỉ số trước; thiếu kỳ trước ("Cần ghi chỉ số kỳ 09/2026 trước"); khoảng tiêu thụ cắt qua hai hợp đồng mà không có mốc chốt ("Không xác định được hợp đồng chịu phí — cần chốt chỉ số khi trả phòng"); ngày ghi trùng ngày bàn giao; chưa có giá điện/nước cho kỳ.
6. Chỉ số đã nằm trong hóa đơn đã phát hành: khóa, không sửa.

**Giá điện nước — ADM-08** (§7.3). **Lịch sử chỉ số** — tab trong ADM-05 và ADM-13.

### 8.6 Hóa đơn, công nợ và thanh toán [MVP]

**Công thức (chỉ để hiển thị giải thích, không tính ở frontend):** Hóa đơn tháng T = tiền phòng tháng T + dịch vụ định kỳ tháng T + **điện nước tiêu thụ tháng T−1** + điều chỉnh hợp lệ. Tháng đầu/cuối: tiền phòng và dịch vụ chia theo ngày. Hóa đơn đầu tiên không có điện nước.

**Lập hóa đơn tháng (Admin) — modal trên ADM-16 hoặc ADM-13:**
1. Chọn kỳ T (MonthPicker); phạm vi: một hợp đồng, hoặc các hợp đồng của một tòa ([ĐỀ XUẤT UI] lập hàng loạt).
2. Kết quả theo từng hợp đồng: **Đã tạo nháp** · **Đã có hóa đơn kỳ này** (409) · **Thiếu chỉ số** (liệt kê dịch vụ/kỳ thiếu, liên kết ADM-15) · **Đang có hóa đơn tất toán**.
3. Xem lại nháp (ADM-17) → **Phát hành**. Sau khi phát hành: cư dân nhận thông báo; hóa đơn bất biến.

**Hủy và lập lại (Admin) — ADM-17:**
- Chưa có thanh toán → modal hủy (lý do bắt buộc) → nút "Lập hóa đơn thay thế" (liên kết hai chiều).
- Còn thanh toán chờ xác nhận → chặn: "Cần xử lý các thanh toán đang chờ trước khi hủy."
- Đã có thanh toán được xác nhận → chặn: "Hóa đơn đã có thanh toán — cần quy trình điều chỉnh." (điều chỉnh là [SHOULD]).

**Cư dân thanh toán — RES-05:**
1. Xem thông tin chuyển khoản + VietQR (chỉ hướng dẫn).
2. "Tôi đã chuyển khoản" → modal: số tiền (mặc định = còn lại, cho phép nhỏ hơn — trả nhiều lần), **đúng 1 ảnh** minh chứng (jpg/png/webp ≤ 5 MB). Số tiền > còn lại → lỗi.
3. Thanh toán xuất hiện "Chờ xác nhận"; **công nợ chưa giảm**.
4. Admin xác nhận → hóa đơn chuyển "Thanh toán một phần" hoặc "Đã thanh toán", sinh biên nhận; hoặc từ chối kèm lý do → cư dân thấy lý do, có thể gửi lại.

**Admin ghi nhận trực tiếp** (tiền mặt hoặc chuyển khoản đã kiểm tra): modal số tiền, hình thức, ngày nhận ([ĐỀ XUẤT UI]), ghi chú → xác nhận ngay.

**Công nợ:** cư dân xem ở RES-04; Admin ở ADM-19 [ĐỀ XUẤT UI] và KPI Dashboard. Khấu trừ cọc khi thanh lý tạo thanh toán "Khấu trừ tiền cọc", **không tính vào thực thu**.

### 8.7 Yêu cầu sửa chữa [MVP]

```
Cư dân (có hợp đồng active) gửi ──► Chờ xử lý
Admin phân công nhân viên ──► (vẫn Chờ xử lý, có người được giao)
Nhân viên "Bắt đầu xử lý" ──► Đang xử lý
Nhân viên "Hoàn thành" + ghi chú ──► Đã xử lý
Admin "Từ chối" (từ Chờ xử lý / Đang xử lý) ──► Từ chối
Admin "Mở lại" (từ Đã xử lý) ──► Đang xử lý
```
- Màn hình: RES-06/07/08, ADM-20/21, STF-01/02.
- Nhân viên chỉ thấy việc của mình; truy cập việc khác → trang 403.
- Ảnh là riêng tư (chỉ người liên quan xem).
- Thông báo khi: có yêu cầu mới (Admin), được phân công (nhân viên), đổi trạng thái (cư dân) — [ĐỀ XUẤT UI], danh sách sự kiện chính thức chưa có trong repo (Q16).
- Lịch sử chi tiết từng lần đổi trạng thái (`maintenance_status_logs`) là [SHOULD]; MVP chỉ có mốc thời gian phân công / bắt đầu / hoàn thành.

### 8.8 Lịch hẹn xem phòng [MVP]

```
Khách đặt lịch (PUB-03) ──► Chờ xác nhận
Admin xác nhận / hủy ──► Đã xác nhận / Đã hủy
Ngày hẹn: Bảo vệ check-in ──► check-out (STF-03; không đổi trạng thái)
Admin hoàn tất sau buổi xem ──► Đã hoàn tất
```
- Chỉ đặt cho phòng còn trống và công khai.
- Một SĐT chỉ có một lịch đang chờ/đã xác nhận cho cùng phòng.
- Bảo vệ chỉ thấy lịch **đã xác nhận** có ngày hẹn là **hôm nay theo giờ Việt Nam**.
- Đổi giờ hẹn: không có trong tài liệu (Q3) — prototype không dựng.

---

## 9. Modal, drawer, wizard và form quan trọng

| Thành phần | Dạng | Ở màn hình | Nhãn |
|---|---|---|---|
| Form đặt lịch xem phòng | Form trong trang | PUB-03 | [MVP] |
| Đăng nhập / Đăng ký | Trang | PUB-05/06 | [MVP] |
| Tạo/sửa tòa nhà | Drawer | ADM-02/03 | [MVP] |
| Tạo/sửa phòng + ảnh + tiện nghi | Drawer | ADM-04/05 | [MVP] |
| Tạo/sửa tiện nghi | Modal | ADM-06 | [MVP] |
| Tạo/sửa dịch vụ | Modal | ADM-07 | [MVP] |
| Thêm giá điện nước | Modal | ADM-08 | [MVP] |
| Tạo tài khoản nhân viên | Modal | ADM-09 | [MVP] (Q11) |
| Sửa hồ sơ người dùng | Drawer | ADM-10 | [MVP] |
| Khóa / mở khóa tài khoản | ConfirmDialog | ADM-09/10 | [MVP] |
| Lập hợp đồng | Wizard 8 bước | ADM-12 | [MVP] |
| Kích hoạt hợp đồng (chỉ số đầu, chênh lệch) | Modal lớn | ADM-13 | [MVP] |
| Thay đổi dịch vụ hợp đồng | Modal | ADM-13 | [MVP] |
| Ghi nhận đã nhận cọc | Modal | ADM-13 | [ĐỀ XUẤT UI] (Q15) |
| Quản lý người ở cùng | Drawer | ADM-13 | [SHOULD] |
| Thanh lý hợp đồng | Wizard 7 bước | ADM-14 | [MVP] |
| Lập hóa đơn tháng | Modal + bảng kết quả | ADM-16/13 | [MVP] |
| Phát hành hóa đơn | ConfirmDialog | ADM-17 | [MVP] |
| Hủy hóa đơn (lý do) | Modal | ADM-17 | [MVP] |
| Ghi nhận thanh toán trực tiếp | Modal | ADM-17 | [MVP] |
| Gửi minh chứng chuyển khoản | Modal | RES-05 | [MVP] |
| Xác nhận / từ chối thanh toán | Panel + modal lý do | ADM-18 | [MVP] |
| Xem ảnh minh chứng | Lightbox | ADM-18, ADM-17, RES-05 | [MVP] |
| Phân công / từ chối / mở lại sửa chữa | Modal | ADM-21 | [MVP] |
| Bắt đầu / hoàn thành việc | Nút + modal ghi chú | STF-02 | [MVP] |
| Xác nhận / hủy / hoàn tất lịch xem | Modal | ADM-22 | [MVP] |
| Check-in / check-out + ghi chú | Bottom sheet (mobile) | STF-03 | [MVP] |
| Đổi mật khẩu | Form | RES-10, ADM-25, STF-05, ACC-02 | [MVP] |
| Thả xuống thông báo | Dropdown từ chuông | Header mọi khu đăng nhập | [MVP] |

---

## 10. Trạng thái giao diện chung

| Trạng thái | Cách thể hiện |
|---|---|
| **Loading** | Skeleton theo hình dạng nội dung (bảng, thẻ, chi tiết). Nút đang gửi: spinner + vô hiệu hóa, giữ nguyên nhãn. Không dùng spinner toàn trang trừ lần tải đầu |
| **Empty** | Minh họa nhỏ + câu giải thích + hành động chính. Ví dụ: "Chưa có tòa nhà nào" + "Thêm tòa nhà"; "Bạn chưa có hóa đơn nào"; "Không có kết quả phù hợp" + "Xóa bộ lọc" |
| **Success** | Toast góc trên phải (mobile: dưới cùng), tự ẩn sau 4 giây. Thao tác quan trọng (kích hoạt, phát hành, thanh lý, xác nhận thanh toán): toast kèm mã sinh ra (HD-, INV-, RCP-) |
| **422 — dữ liệu không hợp lệ** | Lỗi dưới từng trường (chữ đỏ, viền đỏ) + Alert tóm tắt ở đầu form. Với lưới chỉ số: tô đỏ dòng lỗi |
| **409 — xung đột trạng thái** | Alert vàng/đỏ ở đầu nội dung với thông điệp tiếng Việt cụ thể + nút "Tải lại dữ liệu" |
| **401 — chưa đăng nhập / hết phiên** | Chuyển về `/login`, sau đăng nhập quay lại trang cũ |
| **403 — không có quyền** | Trang SYS-01: "Bạn không có quyền truy cập nội dung này" + nút về trang chủ khu vực |
| **404** | Trang SYS-02 thân thiện |
| **5xx / mất mạng** | Alert chung "Đã có lỗi xảy ra, vui lòng thử lại" + nút "Thử lại". Không hiển thị chi tiết kỹ thuật |
| **Quá nhiều yêu cầu** | "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" (đăng nhập, đặt lịch) |
| **Chỉ đọc** | Trường bị khóa có biểu tượng ổ khóa + tooltip lý do (ví dụ hợp đồng đã kích hoạt, hóa đơn đã phát hành) |
| **Hành động nguy hiểm** | ConfirmDialog nêu rõ hậu quả, nút màu đỏ (hủy hóa đơn, thanh lý, khóa tài khoản, xóa nháp) |

---

## 11. Yêu cầu dựng prototype (dành cho Gemini)

### 11.1 Công nghệ

- React 19 + TypeScript + Vite + **Tailwind CSS 4** (dùng `@theme` với các màu `brand-*` ở §4.1).
- React Router (khai báo route tập trung trong `src/app/router.tsx`), React Hook Form + Zod cho form, Recharts cho biểu đồ.
- **Không thêm thư viện khác** (UI kit, icon pack, date library, state management). Icon dùng SVG inline. Nếu thực sự cần thêm, liệt kê riêng để chủ dự án duyệt.
- Không gọi API thật. Mock data đặt trong `src/mocks/`, truy cập qua các hàm bất đồng bộ giả lập độ trễ 300–800 ms để thấy trạng thái loading.

### 11.2 Cấu trúc thư mục (để dễ chuyển sang dự án thật)

> **Hiện trạng:** cấu trúc thực tế của `frontend/` mô tả ở `AGENTS.md` §4 (dữ liệu giả gom vào `src/mocks/`, chưa có `mockApi.ts` theo feature).

```
src/
  app/            App.tsx, router.tsx
  components/
    layouts/      PublicLayout, DashboardShell, ResidentLayout, AdminLayout, StaffLayout
    ui/           Button, Input, Modal, Drawer, DataTable, StatusBadge, ...
  features/<feature>/   types.ts, schemas.ts (Zod), mockApi.ts, các component riêng
                        (buildings, rooms, contracts, meter-readings, invoices, payments,
                         maintenance-requests, viewing-appointments, users, notifications, settings, auth)
  pages/public|resident|admin|staff/   <Tên>Page.tsx — chỉ ghép component
  mocks/          dữ liệu mẫu
  lib/            format.ts (tiền, ngày, giờ VN, decimal)
```
- Component/page: `PascalCase.tsx`, **named export** trùng tên file; page có hậu tố `Page`, layout có hậu tố `Layout`.
- Feature không import lẫn nhau; phần dùng chung đưa vào `components/ui`, `lib`, `types`.
- Kiểu dữ liệu giữ `snake_case` như JSON API.

### 11.3 Mô hình dữ liệu mock (rút gọn, chỉ trường cần cho giao diện)

```ts
type Money = number        // số nguyên VND, có thể âm chỉ ở dòng discount
type Decimal = string      // "1234.50" — không parseFloat để tính tiền
type IsoDate = string      // "2026-10-14" (ngày lịch VN)
type IsoDateTime = string  // "2026-10-14T02:30:00Z" (UTC)

interface User { id: number; full_name: string; email: string; phone: string;
  role: 'user'|'resident'|'admin'|'technician'|'guard'; status: 'active'|'locked';
  id_number?: string | null /* chỉ có trong dữ liệu dành cho Admin */;
  date_of_birth?: IsoDate | null; gender?: string | null; permanent_address?: string | null;
  has_active_contract?: boolean }

interface Amenity { id: number; name: string; description?: string | null }
interface Building { id: number; name: string; address: string; total_floors: number;
  latitude?: Decimal | null; longitude?: Decimal | null; description?: string | null;
  status: 'active'|'inactive'; amenities: Amenity[] }
interface Room { id: number; building_id: number; code: string; floor_number: number;
  area: Decimal; base_price: Money; deposit_amount: Money; max_occupants: number;
  status: 'available'|'occupied'|'maintenance'|'inactive'; is_public: boolean;
  description?: string | null; amenities: Amenity[] /* riêng phòng */;
  photos: { id: number; url: string; is_cover: boolean; sort_order: number }[] }

interface Service { id: number; code: string; name: string;
  billing_type: 'per_room'|'per_person'|'per_unit'|'metered'; unit?: string | null;
  price: Money | null; status: 'active'|'inactive'; is_system: boolean }
interface UtilityPrice { id: number; service_id: number; unit_price: Money;
  effective_from: IsoDate /* luôn ngày 01 */; is_used: boolean }

interface Contract { id: number; contract_number: string | null; room_id: number; user_id: number;
  status: 'draft'|'active'|'terminated'; start_date: IsoDate; end_date: IsoDate /* ngày cuối được ở */;
  actual_end_date: IsoDate | null /* ngày bàn giao */; activated_at: IsoDateTime | null;
  monthly_rent: Money; occupant_count: number;
  initial_electricity_reading: Decimal | null; initial_water_reading: Decimal | null;
  deposit_amount: Money; deposit_status: 'unpaid'|'held'|'settled';
  deposit_deducted_amount: Money; deposit_refund_amount: Money;
  closure_reason: 'on_time'|'early_termination'|'same_day'|null; closure_note: string | null;
  note: string | null;
  // Chờ P2, P4, P5, P6 — tên trường là đề xuất, có thể đổi:
  early_termination_fee_type: 'none'|'fixed'|'rent_multiple'|null;
  early_termination_fee_amount: Money | null; early_termination_fee_multiplier: Decimal | null;
  waiver_conditions: { code: string; description: string }[];
  inspection_result: 'no_damage'|'damaged'|null;
  services: ContractServiceLine[]; occupants: { full_name: string; phone?: string; relationship?: string }[] }
interface ContractServiceLine { id: number; service_id: number; quantity: Decimal;
  unit_price: Money | null /* null với Điện, Nước */; start_date: IsoDate; end_date: IsoDate | null }

interface MeterReading { id: number; room_id: number; contract_id: number | null; service_id: number;
  invoice_id: number | null; kind: 'periodic'|'final'; period: IsoDate /* tháng tiêu thụ */;
  reading_date: IsoDate; previous_reading: Decimal; current_reading: Decimal; consumption: Decimal;
  unit_price: Money; amount: Money }

interface Invoice { id: number; invoice_number: string | null; contract_id: number;
  type: 'monthly'|'final'; period: IsoDate;
  status: 'draft'|'issued'|'partially_paid'|'paid'|'cancelled';
  issued_at: IsoDateTime | null; due_date: IsoDate | null; total_amount: Money; paid_amount: Money;
  related_invoice_id: number | null; cancel_reason: string | null; items: InvoiceItem[] }
interface InvoiceItem { id: number; item_type: 'rent'|'electricity'|'water'|'service'|'discount'|'other'
  /* chờ P7: |'termination_fee'|'damage' */; description: string; quantity: Decimal;
  unit_price: Money; amount: Money; meta?: Record<string, unknown> }
interface Payment { id: number; invoice_id: number; amount: Money;
  method: 'cash'|'bank_transfer'|'deposit'; status: 'pending'|'confirmed'|'rejected';
  receipt_number: string | null; submitted_by: number | null; reviewed_by: number | null;
  reviewed_at: IsoDateTime | null; reject_reason: string | null; proof_url?: string; created_at: IsoDateTime }

interface MaintenanceRequest { id: number; code: string; contract_id: number; room_id: number; user_id: number;
  assigned_to: number | null; title: string; description: string;
  priority: 'low'|'normal'|'high'|'urgent'; status: 'pending'|'in_progress'|'resolved'|'rejected';
  admin_note: string | null; handler_note: string | null; cost: Money | null;
  assigned_at: IsoDateTime | null; started_at: IsoDateTime | null; resolved_at: IsoDateTime | null;
  photos: string[]; created_at: IsoDateTime }
interface ViewingAppointment { id: number; code: string; room_id: number; user_id: number | null;
  guest_name: string; guest_phone: string; preferred_at: IsoDateTime;
  status: 'pending'|'confirmed'|'completed'|'cancelled'; admin_note: string | null;
  checked_in_at: IsoDateTime | null; checked_out_at: IsoDateTime | null; guard_note: string | null }
interface AppNotification { id: string; title: string; body: string; link?: string;
  read_at: IsoDateTime | null; created_at: IsoDateTime }
```

Trường `is_system`, `is_used`, `has_active_contract`, `proof_url`, `photos`, `title/body/link` của thông báo là trường tiện cho giao diện, có thể khác khi có API thật.

### 11.4 Bộ dữ liệu mẫu tối thiểu

"Hôm nay" của prototype: **14/10/2026**. Tên người, SĐT, CCCD đều là dữ liệu giả.

- 2 tòa nhà (một tòa 5 tầng có Thang máy/Camera/Bãi xe; một tòa 3 tầng), khoảng 15 phòng đủ 4 trạng thái, một số phòng công khai có ảnh.
- Tiện nghi: Thang máy, Camera an ninh, Bãi để xe (cấp tòa); Điều hòa, Nóng lạnh, Ban công, Tủ lạnh (cấp phòng).
- Dịch vụ: Điện (kWh), Nước (m³) là hệ thống; Internet 100.000 ₫/phòng; Vệ sinh 30.000 ₫/người; Gửi xe máy 100.000 ₫/xe. Giá mock: điện 3.500 ₫/kWh, nước 15.000 ₫/m³ từ 01/2026.
- Người dùng: 1 admin; 2 technician (1 bị khóa); 1 guard; ~8 resident (1 đã thanh lý, chỉ còn lịch sử); 3 user.
- Hợp đồng: 1 nháp; nhiều đang hiệu lực (1 sắp hết hạn, 1 **quá hạn trả phòng** vẫn active); 3 đã thanh lý — trả đúng hạn, trả trước hạn (có phí hệ số 1,5 và 1 hạng mục hư hỏng), trả trong ngày nhận phòng. Đủ 3 loại điều khoản bồi thường; 1 hợp đồng có 2 điều kiện miễn và đã áp dụng miễn.
- Chỉ số: đủ kỳ 08–09/2026 cho phòng có người; 1 phòng trống có chỉ số; kỳ 10/2026 ghi một phần (để thấy "Chưa ghi").
- Hóa đơn: đủ 5 trạng thái + 1 quá hạn + 1 cặp hủy/lập lại + 1 hóa đơn tất toán có dòng giảm trừ âm, phí trước hạn, bồi thường tài sản.
- Thanh toán: chờ xác nhận (có ảnh), đã xác nhận (có `RCP-`), bị từ chối (có lý do), tiền mặt, khấu trừ cọc.
- Sửa chữa: đủ 4 trạng thái, có cái chưa phân công, có cái khẩn cấp.
- Lịch xem: hôm nay 3 lịch đã xác nhận (1 chưa đến, 1 đã vào, 1 đã ra), các ngày khác đủ trạng thái.

### 11.5 Công cụ demo (chỉ có trong prototype)

- Trang đăng nhập có danh sách **tài khoản demo theo vai trò** (bấm để vào) — không đưa vào sản phẩm thật.
- Một nút nổi "Demo" cho phép: chuyển vai trò; giả lập trạng thái **loading / rỗng / lỗi 409 / lỗi 422 / lỗi mạng** trên trang hiện tại.

### 11.6 Tiêu chí hoàn thành prototype

- Đủ màn hình ở §5 (bỏ qua [SHOULD]/[FUTURE]); điều hướng theo menu §6 hoạt động.
- Hai wizard (lập hợp đồng, thanh lý) đi hết được bằng mock, có trạng thái lỗi ở các bước được nêu trong §8.
- Mỗi màn hình danh sách có trạng thái loading, rỗng, lỗi.
- Hiển thị đúng quy ước §3 (tiền, decimal, ngày, giờ VN, mã null).
- Kiểm tra ở bề rộng 375 px, 768 px, 1280 px; không cuộn ngang trang (bảng cuộn ngang trong khung riêng hoặc đổi sang thẻ).
- Có `aria-label` cho nút chỉ có icon; độ tương phản chữ đạt mức AA; điều hướng được bằng bàn phím trong modal/drawer (bẫy focus, Esc để đóng).

---

## 12. SHOULD và FUTURE — không dựng trong prototype

| Chức năng | Nhãn | Ghi chú |
|---|---|---|
| Gia hạn hợp đồng (tạo hợp đồng mới nối tiếp, trạng thái `expired`, cọc `transferred`) | [SHOULD] | Không hiển thị nút |
| Hóa đơn điều chỉnh (`adjustment`) sau khi đã có thanh toán | [SHOULD] | Chỉ hiện thông điệp "cần quy trình điều chỉnh" |
| Giao diện quản lý chi tiết người ở cùng | [SHOULD] | Wizard bước 7 có thể bỏ |
| Form liên hệ gửi ban quản lý (`contact_requests`) | [SHOULD] | PUB-04 chỉ hiển thị thông tin |
| Nhật ký hoạt động (`activity_logs`), lịch sử trạng thái sửa chữa | [SHOULD] | |
| Giá điện nước riêng theo hợp đồng | [SHOULD] | |
| Tải lên bản scan hợp đồng, ảnh giấy tờ tùy thân | [FUTURE] | |
| Cổng thanh toán, đối soát ngân hàng tự động | [FUTURE] | |
| Email xác minh/khôi phục (Q4 đã chốt nguyên tắc), chưa SMS/OTP | Chưa triển khai, ngoài Bước 4 | Spec Auth Q4; không coi là chức năng hoạt động |
| Tự động lập hóa đơn theo lịch | [FUTURE] | |
| Giá điện bậc thang, IoT đồng hồ | [FUTURE] | |
| Credit note / hoàn tiền tự động | [FUTURE] | Hoàn tiền ghi chú ngoài hệ thống |
| In/xuất PDF hóa đơn, xuất Excel | Chưa có trong tài liệu | Không dựng; hỏi lại nếu cần |

---

## 13. Đề xuất UI chưa được duyệt

Các điểm sau do tài liệu này đề xuất để giao diện dùng được; chủ dự án có thể bỏ hoặc sửa:

1. Khu tài khoản cho `user` đã chốt nguyên tắc Q2; chi tiết lịch hẹn, self-edit và phạm vi tích hợp không tự được duyệt theo mock. Xem AUTH-D03; số đếm phân loại UI cũ ở §5.6 là baseline thiết kế.
2. Trang ADM-19 Công nợ (gom hóa đơn còn nợ theo hợp đồng).
3. Nội dung Dashboard Admin (KPI, biểu đồ, danh sách việc cần làm).
4. Đổi placeholder `/admin/residents` thành `/admin/users` (quản lý cả nhân viên); thêm khu `/staff`.
5. Sơ đồ phòng theo tầng ở chi tiết tòa nhà; chế độ Kanban cho sửa chữa; chế độ lịch tuần cho lịch xem phòng.
6. Lập hóa đơn tháng **hàng loạt** theo tòa và phát hành hàng loạt.
7. Bố cục hai cột cho màn hình duyệt thanh toán.
8. Thanh điều hướng dưới trên mobile cho khu nhân viên; bottom sheet check-in/out.
9. Bắt buộc ghi chú xử lý khi nhân viên bấm "Hoàn thành".
10. Ẩn hợp đồng nháp và hóa đơn nháp khỏi cư dân; ẩn chi phí sửa chữa khỏi cư dân.
11. Danh sách sự kiện thông báo (§8.7) và nội dung thông báo.
12. Liên kết Google Maps thay vì nhúng bản đồ.
13. Ô "ngày nhận" khi Admin ghi nhận thanh toán trực tiếp (bảng `payments` không có cột ngày nhận riêng — có thể chỉ dùng thời điểm ghi nhận).

---

## 14. Mâu thuẫn và câu hỏi cần chủ dự án quyết định

### 14.1 Quyết định đang chờ trong kế hoạch CSDL (§14 — P1–P12) ảnh hưởng trực tiếp giao diện

| Mã | Câu hỏi | Ảnh hưởng UI | Prototype đang dùng |
|---|---|---|---|
| P1 | Baseline `end_date > start_date` vẫn hiện hành; cho phép hợp đồng dự kiến 1 ngày là mở rộng chưa duyệt | Không chặn baseline; DB-D43 chỉ đổi ý nghĩa ngày cuối | Giữ `>` |
| P2 | **Đã chốt DB-D40:** một `meter_gap_reason` chung; tách Điện/Nước chỉ là mở rộng | Không chặn kích hoạt baseline | Prototype hai ô không là nguồn yêu cầu |
| P3 | Trả **quá hạn** chưa có mã phân loại; chủ nhà đơn phương chấm dứt bị tính là "trả trước hạn" và tự tính phí cho người thuê | Bước 1 thanh lý | Cảnh báo "chờ quyết định" |
| P4 | Cách lưu điều khoản bồi thường | Bước 5 wizard | 3 radio + số tiền/hệ số |
| P5 | Cấu trúc điều kiện miễn: văn bản tự do (A), danh sách có cấu trúc (B), mẫu từ cài đặt (C)? Miễn toàn bộ hay một phần? | Bước 6 wizard, bước 4 thanh lý | B, miễn toàn bộ |
| P6 | Cách lưu kết quả kiểm tra phòng; có giữ nhiều lần kiểm tra không | Bước 3 thanh lý | Một lần kiểm tra, ghi đè |
| P7 | Loại dòng hóa đơn mới `termination_fee`, `damage` | Hiển thị hóa đơn tất toán | Dùng hai loại mới |
| P8 | Ảnh kiểm tra/hư hỏng/căn cứ miễn gắn vào hợp đồng | Upload ở thanh lý | Có upload |
| P9 | Nhận và trả cùng ngày có tính phí trả trước hạn không? | Bước 4 thanh lý | Hiển thị "Chờ duyệt" |
| P11 | Bồi thường tài sản: Admin nhập kèm căn cứ + ≥ 1 ảnh; không cần người thuê ký xác nhận trong hệ thống? | Bước 3 thanh lý | Như đề xuất |
| P12 | **Đã chốt DB-D49:** bắt buộc kiểm tra phòng với mọi thanh lý; cấu trúc P6 vẫn chưa duyệt | Nguyên tắc không còn thiếu quyết định | Có |

### 14.2 Câu hỏi phạm vi giao diện (không có câu trả lời trong tài liệu hiện có)

| Mã | Câu hỏi |
|---|---|
| Q1 | Danh sách 38 trang và các tài liệu `02`–`08`, `PROJECT_CONTEXT.md` không có trong repo. Có cần đối chiếu từng trang không? Nếu có, vui lòng bổ sung tài liệu (§15). |
| Q2 | **Đã chốt:** khách đã đăng ký có “Tài khoản của tôi”. Chi tiết tích hợp ACC-02 ở AUTH-D03; ACC-01 cần module lịch hẹn, không suy ra hoàn thành từ UI. |
| Q3 | Khách/`user` có tự hủy hoặc đổi giờ lịch xem không? Admin có đổi giờ lịch không? Có giới hạn khung giờ nhận lịch không? |
| Q4 | **Đã chốt nguyên tắc:** khôi phục qua email đã xác minh; không email cần hỗ trợ xác minh thủ công; chưa SMS/OTP. Quy trình chi tiết/triển khai nằm ngoài Bước 4. |
| Q5 | Có cho lập hợp đồng **nháp** cho phòng đang có người thuê (chuẩn bị cho người kế tiếp) không? |
| Q6 | Khi lập hợp đồng, Admin có được **tạo tài khoản** cho người thuê chưa đăng ký không, hay người thuê bắt buộc tự đăng ký trước? |
| Q7 | **CONFIRMED DB-D59 (24/10):** lấy giá danh mục và lưu snapshot; không thương lượng giá riêng. Chi tiết §25. |
| Q8 | CONFIRMED DB-D70 ngày28/10: xem/thanh toán nợ cũ của chính mình sau thanh lý, không yêu cầu active; ảnh chỉ pending, thực nhận do Admin/provider xác nhận. Quy tắc §31. |
| Q9 | Mức ưu tiên sửa chữa do cư dân chọn hay chỉ Admin đặt? |
| Q10 | **Đã chốt quyền tự sửa:** tên hiển thị, đổi mật khẩu, thay email khi xác minh; không tự sửa SĐT đăng nhập/role/pháp lý. Chi tiết xác minh và người/quy trình nhập dữ liệu pháp lý cần Spec riêng trước triển khai. |
| Q11 | **Đã chốt cách cấp:** Admin cấp technician/guard; Admin mới qua Artisan, bắt buộc email. Không suy ra được phép chuyển quyền tùy ý giữa các tài khoản; chức năng cấp nhân viên chưa triển khai. |
| Q12 | CONFIRMED 28/10: có trang Công nợ riêng ADM-19, nhóm hóa đơn còn nợ theo hợp đồng/người thuê kể cả đã thanh lý; số dư do Backend tính, pending không giảm nợ. Không cần bảng mới. Chi tiết §34. |
| Q13 | CONFIRMED DB-D69 ngày28/10: Admin được thêm other vào nháp với tên/tiền/lý do-căn cứ hợp lệ, cư dân xem được, lưu lịch sử; bất biến sau phát hành. Quy tắc §31. |
| Q14 | Nhân viên sửa chữa có được thấy tên và SĐT cư dân không (dữ liệu cá nhân)? |
| Q15 | Tiền cọc được ghi nhận "đã nhận" khi nào và bởi thao tác nào (trước/sau kích hoạt)? Có bắt buộc nhận cọc trước khi kích hoạt không? |
| Q16 | Danh sách sự kiện gửi thông báo chính thức (BR-NTF trong tài liệu `02` không có trong repo). |
| Q17 | Admin có được tự chuyển phòng sang "Đang bảo trì"/"Ngừng sử dụng" khi đang có hợp đồng active không? |

### 14.3 Mâu thuẫn tài liệu đã phát hiện (đã xử lý theo quyết định mới nhất)

| Mâu thuẫn | Xử lý trong tài liệu này |
|---|---|
| Ý nghĩa `end_date`: DB-D39 ("ngày bàn giao dự kiến, không tính") ↔ DB-D43 ("ngày cuối được ở, có tính") | Theo **DB-D43** (mới hơn, ghi rõ thay DB-D39) |
| Tài liệu cũ ghi 3 actor / 20 bảng | Theo **DB-D01, DB-D02**: 5 actor, 21 bảng |
| BR-SVC-04 cũ: dịch vụ tính trọn tháng | Theo **DB-D09**: dịch vụ định kỳ chia theo ngày ở tháng đầu/cuối |
| DB-D31 ghi lý do chênh chỉ số vào `contracts.note` | Theo **DB-D40, DB-D44**: trường riêng `meter_gap_reason` chung, không chờ tách P2 |
| `09` §5.3 bước 3: "`contract_id` tự suy từ room + reading_date" | Theo **DB-D15**: xác định theo **khoảng tiêu thụ**, không suy đoán; lỗi khi không xác định được |
| `README.md` gốc còn ghi "kế hoạch migrations đang chờ duyệt" | Không ảnh hưởng UI; trạng thái thật ở `DATABASE_IMPLEMENTATION_PLAN.md` |
| Placeholder frontend: menu Admin có "Cư dân" (`/admin/residents`), chưa có khu nhân viên | Đề xuất `/admin/users` + `/staff` (§13) |

---

## 15. Đối chiếu với con số 38 trang trong tài liệu cũ

- Danh sách 38 trang **không có trong repo** (không có trong `docs/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, mã frontend hay bản lưu `backups/handoff/`). Vì vậy **không thể đối chiếu từng trang**; mục này chỉ nêu các thay đổi chắc chắn có do quyết định ngày 14/10/2026.
- Danh sách hiện tại: **51 màn hình = 48 [MVP] + 3 [ĐỀ XUẤT UI]** (§5.6). Modal, drawer, wizard không tính là màn hình.

Các nguyên nhân làm số màn hình khác 38:

| Thay đổi | Căn cứ | Ảnh hưởng số màn hình |
|---|---|---|
| Thêm 2 vai trò Nhân viên sửa chữa, Bảo vệ và khu `/staff` | DB-D02, DB-D10 | +5 (STF-01..05) |
| Tiện nghi tách khỏi dịch vụ, có tiện nghi cấp tòa | DB-D01, DB-D03 | Danh mục tiện nghi (ADM-06) là màn hình riêng, tách khỏi Dịch vụ (ADM-07) |
| Điện nước là dịch vụ hệ thống + bảng giá theo kỳ | DB-D04, DB-D05, DB-D26, DB-D33 | Giá điện nước (ADM-08) tách riêng |
| Thanh lý gồm chốt chỉ số, kiểm tra phòng, phí trước hạn, miễn trừ, hóa đơn tất toán, đối soát cọc | DB-D45..DB-D49 | Wizard thanh lý là màn hình riêng (ADM-14) |
| Điều khoản bồi thường và điều kiện miễn khi ký | DB-D47, DB-D48 | Lập hợp đồng thành wizard riêng (ADM-12) |
| Cư dân xem lịch sử hợp đồng sau thanh lý | DB-D36 | Thêm RES-02, RES-03 |
| Một hóa đơn nhiều thanh toán, Admin duyệt minh chứng | DB-D06 | Duyệt thanh toán (ADM-18) là màn hình riêng |
| Tách màn hình chi tiết (tòa, phòng, người dùng, hóa đơn, sửa chữa) khỏi danh sách | Cách tổ chức của tài liệu này | Tăng số route; nếu gộp chi tiết vào drawer thì giảm |
| Phân loại đề xuất UI baseline 18/10 | §13; hiện trạng Q2 xem Spec Auth | +3 theo bảng đếm lịch sử (ACC-01, ACC-02, ADM-19); không coi Q2 còn chưa chốt |

Nếu cần đối chiếu chính xác, hãy bổ sung danh sách 38 trang (hoặc `02_SYSTEM_DISCOVERY.md`) vào repo; khi đó có thể lập bảng ánh xạ cũ → mới, đánh dấu trang bị gộp, tách, thêm hoặc bỏ.


## 16. Lát cắt CAT đang triển khai — Sprint MVP 23/10/2026

Chủ dự án yêu cầu triển khai ngay phần đã CONFIRMED, không khảo sát lại. Nghiệp vụ lấy từ DB09 §3.2/3.4 và ADM-02/03/06, không mở rộng quyền hoặc dữ liệu.

- Tòa nhà: danh sách/phân trang, xem đúng ID, tạo và sửa tên/địa chỉ/số tầng/tọa độ/mô tả. Tạo active theo mặc định đã thiết kế; chưa mở đổi status/xóa vật lý. Giảm tầng không được thấp hơn phòng đang có; khi chưa có schema phòng để kiểm tra thì chỉ thao tác giảm tầng bị từ chối rõ ràng. Không suy ra số phòng bằng0 khi bảng phòng chưa triển khai dev.
- Tiện nghi: danh sách/phân trang, tạo/sửa tên/mô tả; lưu trữ đúng SoftDeletes đã thiết kế, giữ bản ghi và liên kết, không tái sử dụng tên UNIQUE. Không có category hoặc status tự tạo; không tự sinh phí; khôi phục chưa mở.
- Admin active mới được quản lý; API lấy phiên/quyền từ Laravel qua middleware và Policy. Các vai trò khác403, không phiên401. Không thêm Admin dev để test.
- HTTP theo AGENTS: GET/POST `/api/v1/buildings`, GET/PATCH/PUT `/api/v1/buildings/{building}`; tương tự amenities, thêm DELETE amenities để lưu trữ204. Resource fields buildings: id/name/address/total_floors/latitude/longitude/description/status; amenities: id/name/description. List chuẩn Laravel data/links/meta,20dòng/trang, `page` khi đổi trang. Input snake_case theo DB09; duplicate422, UNIQUE race409; lỗi JSON tiếng Việt. Không có endpoint testing trong sản phẩm.
- Giữ card/table/modal Antigravity; RHF+Zod, lỗi422 theo trường, loading/empty/retry/saving và lỗi phiên/quyền rõ ràng. Màn đã nối không import mocks. Không hiện ảnh, số phòng, số nơi dùng hoặc amenities giả. Phần phòng/tiện nghi cấp tòa chưa nối hiển thị chưa tích hợp, không gán dữ liệu mock từ ID thật.
- AC CAT-A: Admin tạo/đọc/sửa và lưu trữ tiện nghi bền qua F5; validate tên trùng/độ dài/tầng/tọa độ, floor room guard,401/403/locked, mass assignment/UNIQUE race; archived giữ dữ liệu/links và không tái dùng tên. Build/lint/Pint và test MySQL test có guard; browser chạy môi trường test cô lập, không ghi/xóa dữ liệu dev cho CAT.

Điểm chưa chốt ở Hợp đồng không chặn lát cắt này. Gán tiện nghi/sơ đồ phòng phụ thuộc schema Nhóm2 trên dev được duyệt riêng; không migration dev trong Sprint khi chưa được phép. Lịch sử Q/P cũ xem đối chiếu ở Plan, không tự xem mọi nhãn chờ duyệt là blocker.


## 17. Lát cắt ROOM cơ bản — Sprint 23/10/2026

Triển khai độc lập theo DB09§3.3 và ADM-04/05: Admin active xem/phân trang/lọc building_id,status,q; tạo phòng theo tòa, mã, tầng, diện tích, giá niêm yết/cọc nguyên VND, sức chứa, is_public, mô tả; xem đúngID và sửa thông tin này. Tạo status available theo mặc định; chưa API tự đổi status hoặc xóa phòng, không sửa hợp đồng từ thông tin niêm yết. Chưa mở chuyển phòng sang tòa khác sau khi tạo (giữ building_id khi sửa). Không ảnh/tệp, không dữ liệu hợp đồng/tiện nghi/lịch sử giả. Đây là phạm vi một phần ADM-04/05, không tuyên bố hoàn tất toàn ROOM.

API GET/POST /api/v1/rooms, GET/PATCH/PUT /api/v1/rooms/{room}; list data/links/meta20dòng, thứ tựID. Resource gồm id,building_id,building:{id,name},code,floor_number,area dạngchuỗi2số,base_price/deposit_amount số nguyên,max_occupants,status,is_public,description. Trường theo DB: code<=50 unique trong tòa, floor>=1 và <=total_floors, area>0 DECIMAL8,2; tiền>=0, sức chứa>=1 UNSIGNED SMALLINT. Input được validate/allowlist tại Laravel, Policy admin; giữ photo/amenity/status/contracts ngoài payload. Giữ snapshot hợp đồng bằng cách không cập nhật contracts.

Schema rooms đã có trên DB test và sau phê duyệt riêng Nhóm 2 ngày 23/10 đã có trên dev (DB plan §18). API vẫn trả 503 rõ ràng nếu môi trường thiếu schema; không trả danh sách rỗng giả hoặc SQL500. Việc chạy migration ngoài phạm vi đã duyệt vẫn phải xin phép riêng. Form/list/detail giữ Antigravity, RHF/Zod, error/retry/loading/empty và không import mocks; chưa hỗ trợ nghiệp vụ khác thì thông báo chưa tích hợp. Chưa mở public-room API trong lát cắt này, public hiện vẫn mock có nhãn.

AC ROOM-A: Admin CRUD cơ bản khôngdelete/status; 401/403/locked,422đúng trường,409UNIQUErace,503missing schema, floor/capacity/decimal/money validation,lọc/phântrang,không ảnh hưởng contracts,F5/retry; backendtestDBguard và frontendbuild/test/browser cô lập. Q17 chỉ chặn đổi status có hợp đồng active, không chặn lát cắt này.

**Giới hạn kỹ thuật của cả hai lát cắt:** mô tả lưu cột MySQL TEXT tối đa 65.535 byte UTF-8, kiểm tra ở cả Zod và Laravel; không đánh đồng byte với số ký tự tiếng Việt. Tiền trả JSON number chỉ nhận số nguyên chính xác trong JavaScript (tối đa 9.007.199.254.740.991), từ chối số lớn hơn thay vì làm tròn. Đây là giới hạn giao tiếp kỹ thuật hiện tại, không thay đổi BIGINT của DB hoặc đặt mức giá nghiệp vụ mới; nếu cần vượt miền này phải duyệt đổi hợp đồng JSON sang chuỗi và cập nhật nơi sử dụng.

## 18. CAT-02b/03b — Dịch vụ và giá điện nước, 23/10/2026

Tiếp tục theo giao việc Sprint và DB09 §3.10/3.12/3.20, DB-D04/16/18/26/33; không khảo sát lại. Nối ADM-07/08 có sẵn; chưa thêm trang Cài đặt còn thiếu. Không chạy migration/seeder dev; dữ liệu hệ thống chỉ viết seeder và kiểm thử DB test.

- API Admin active: GET/POST `/api/v1/services`, GET/PATCH/PUT `/api/v1/services/{service}`; danh sách 20 dòng/trang, thứ tự ID. Resource: id/code/name/billing_type/unit/price/status/description. Tạo dịch vụ thường chỉ per_room/per_person/per_unit, price nguyên VND >=0, tên UNIQUE toàn bảng, code UNIQUE (trim/chữ hoa nhất quán), unit nullable tối đa20, mô tả TEXT. Không tạo metered hoặc chiếm mã ELECTRICITY/WATER qua API. Tạo active theo mặc định. Lát cắt sửa name/description và giá niêm yết dịch vụ thường; code/billing_type/unit/status, xóa/ngừng dịch vụ và sửa giá trực tiếp của metered chưa mở. Không đổi snapshot contract_services hoặc hóa đơn. Giới hạn số nguyên JSON chính xác như §17.
- GET/POST `/api/v1/utility-prices`; danh sách 20 dòng/trang, ngày hiệu lực giảm dần rồi ID; lọc service_id tùy chọn. Resource: id/service_id/service:{id,code,name,unit}/unit_price/effective_from. Chỉ dịch vụ metered được thêm giá >0; effective_from ngày01, phải lớn hơn mọi meter_readings.period của dịch vụ đó theo D33. Ngày Việt Nam là DATE, không đổi UTC. Không sửa/xóa giá ở lát cắt này. Thiếu utility_prices khi đọc hoặc thiếu meter_readings để kiểm tra khi ghi: 503 rõ ràng, không giả lịch sử rỗng. Trong transaction khóa dòng dịch vụ để tuần tự hóa các lần thêm giá; MTR sau này phải dùng cùng khóa khi chọn/snapshot giá, sau các khóa cha rooms/users/contracts theo D29, trước meter_readings.
- GET `/api/v1/settings`: chỉ 8 khóa MVP đã định nghĩa, không public, không trả key ngoài allowlist; data là danh sách key/value/type/group hiện có, kèm missing_keys cấp ngoài data khi chưa seed. Không điền giá trị giả để che cấu hình thiếu. Hai khóa số ngày đã được duyệt CAT-D01 bên dưới; các trường settings khác chỉ đọc, không chặn Dịch vụ/Giá. Không tạo trang mới trong lát cắt này.
- Seeder hệ thống riêng, idempotent: ELECTRICITY/kWh và WATER/m3 metered/price NULL, 8 khóa settings (thông tin thật để NULL, due_days5/expiring_warning_days30). Không ghi đè giá trị có sẵn, không sinh giá mẫu hoặc dữ liệu nghiệp vụ; DatabaseSeeder không tạo user mẫu. Nếu mã hệ thống đã bị dùng sai định nghĩa thì báo xung đột, không tự sửa dữ liệu đó.
- 401/403/locked/419 giữ cơ chế Auth; lỗi422 theo trường, UNIQUE race409 không lộ SQL; 404 đúng ID. Giao diện có loading/empty/retry/lỗi thật, RHF/Zod, không import mocks ở hai trang đã nối; chỉ thành công sau API. Điện nước chưa seed phải thông báo cấu hình thiếu, không tự seed qua HTTP. Phân biệt dữ liệu API thật và phần chưa tích hợp trên banner.
- AC CAT-B: test cả3 loại dịch vụ, từ chối quyền/field/metered/reserved, trùng code/tên, sửa không đổi snapshot, giá ngày01/dịch vụ/kỳ đã dùng/UNIQUE/thiếu schema, seeder lặp không ghi đè/không fakeuser/không giá mẫu, settings allowlist. Build/lint/Pint và DB test có guard; browser qua Nginx trên môi trường test cô lập, không ghi dev. Tài liệu tiến độ chỉ ghi bằng chứng thực chạy.

**CAT-D01 CONFIRMED — chủ dự án duyệt 23/10/2026:** `invoice.due_days` và `contract.expiring_warning_days` nhận số nguyên **1–365**, không nhận0. Triển khai độc lập PUT `/api/v1/settings/{key}` chỉ cho đúng2key trên, body `{ "value": 5 }`; Admin active, CSRF/Policy, trả Resource `{data:{key,value,type,group}}` (value là chuỗi theo TEXT hiện có). 422 khi ngoài khoảng/boolean/null/field điều khiển; key khác404. Giá trị chưa có được tạo bằng giá trị Admin vừa nhập; không tự seed qua API, không sửa thông tin ngân hàng/hệ thống. Không có API cập nhật settings tùy ý hoặc màn hình mới; GET giữ missing_keys để báo thiếu cấu hình. Không thay đổi hóa đơn/hợp đồng đã phát sinh; các module tương lai chỉ đọc cấu hình khi lập dữ liệu mới.

## 19. CAT-02b.4/03b.4 — Gán tiện nghi cấp tòa/phòng

Nguồn đã chốt DB-D01/03, DB09 §3.4–3.6; tiếp tục sau Nhóm2 dev đã được duyệt riêng. Không phát sinh phí, không sao chép tiện nghi tòa vào room_amenities, không đổi giá/status/hợp đồng. Chỉ Admin active, CSRF và Policy hiện có. Không thêm trang; ghép panel vào ADM-03/05 hiện hữu, giữ Antigravity.

- GET/PUT `/api/v1/buildings/{building}/amenities` và `/api/v1/rooms/{room}/amenities`, tên api.v1.buildings.amenities.index/update và tương tự rooms. Request PUT `{ "amenity_ids": [1,2] }`: thay tập tiện nghi **đang hoạt động** gán trực tiếp, [] gỡ tập hoạt động; chỉ ID thật chưa lưu trữ, distinct/integer, không nhận tập kế thừa hoặc trường tiền/quyền. Liên kết tới tiện nghi đã lưu trữ được giữ nguyên, chưa mở thao tác khôi phục/gỡ riêng chúng trong lát cắt này. Không đưa inherited IDs vào room_amenities tự động; nếu Admin tự chọn một tiện nghi vốn cũng ở tòa thì vẫn là lựa chọn riêng của phòng.
- Response200 `{data:{direct:[...],inherited:[...],effective:[...]}}`; mỗi tiện nghi id/name/description/is_archived. Building inherited=[]; Room inherited lấy từ building_amenities; effective hợp nhất theo ID không trùng, server tính. API Admin giữ dữ liệu liên kết đã lưu trữ kèm cờ để không mất lịch sử; **CAT-D02 / DB-D55 CONFIRMED (23/10/2026): hiển thị tiện nghi đã lưu trữ kèm nhãn “Đã lưu trữ”**, giữ nguyên liên kết. Không cung cấp lựa chọn gán mới/khôi phục/gỡ riêng chúng trong lát cắt này. Chọn mới chỉ từ danh mục hoạt động qua API amenities có sẵn.
- Transaction khóa Building rồi Room (nếu có), rồi các Amenity liên quan theo ID tăng dần; đọc lại tình trạng sau khóa để không gán ID vừa bị lưu trữ hoặc làm mất liên kết lưu trữ do đua request. Đồng bộ chỉ pivot mục tiêu, không tự sửa pivot phòng khác/tòa/amenity. Thiếu đúng schema cần dùng503; 401/403/404/422/409 theo quy ước; không lỗi SQL ra client.
- AC: gán/gỡ hoạt động, []/ID trùng/ID không tồn tại/lưu trữ, union không trùng và không sao chép, giữ liên kết lưu trữ, archive trong khoảng validate→write bị chặn an toàn, không đổi tiền/hợp đồng/quyền, mọi endpoint401/403/locked/419, thiếu schema503; frontend loading/empty/retry/save/error thật và F5, browser DBtest cô lập. Kiểm tra dev chỉ đọc trong lượt này, không tạo dữ liệu/Admin.


## 20. USR-A — danh sách và chi tiết tài khoản chỉ đọc

Nguồn: DB09 §3.1, DB-D19/36, ADM-09/10, Plan §12.7 và yêu cầu tiếp tục USR của chủ dự án. Không khảo sát lại; dùng User/activeContract và hai trang hiện có. Không schema/migration, không cấp nhân viên/khóa/mở khóa/đổi role/ghi hồ sơ, không công nợ/hợp đồng/sửa chữa giả. Không tạo Admin hoặc seed dev.

- Admin active: GET `/api/v1/users` (api.v1.users.index), GET `/api/v1/users/{user}` (api.v1.users.show, ID số). Sanctum session cookie, active + role middleware và UserPolicy; account khác 403, anonymous 401, ID thiếu 404. Thiếu bảng cần đọc 503, không giả đang thuê=false.
- List query: `role` theo 5 Enum, `status` active/locked, `has_active_contract` 0/1, `q` chuỗi tối đa191 (trim, tìm chuỗi con literal trong full_name/email/phone, không coi %/_ là wildcard), `page` số nguyên1..2147483647. Không có bộ lọc thì toàn bộ tài khoản; các bộ lọc kết hợp AND, ba trường tìm kiếm nằm trong nhóm OR. Phân trang20, thứ tựID tăng dần, Laravel data/links/meta. Query sai422 tiếng Việt; chỉ validated được dùng.
- Mỗi dòng: id/full_name/email(nullable)/phone/role/status/created_at (UTC ISO8601 hoặc NULL nếu dữ liệu cũ chưa có timestamp), has_active_contract và active_contract:null hoặc `{id,room:{id,code,building:{id,name}}}`. Đang thuê suy từ hợp đồng active chưa soft-delete, không từ role=resident; dữ liệu phòng/tòa lấy quan hệ thật. Chỉ eager-load cột cần thiết, không query từng người hoặc trả Model/pivot thô.
- Detail thêm id_number/date_of_birth/gender/permanent_address (đều nullable) trong Resource riêng dành Admin, theo quyền đọc hồ sơ đã chốt. Không đổi hidden của User, không đưa CCCD vào list hoặc /auth/me, không password/remember_token/hash/file/minh chứng/dòng tiền. DATE giữ YYYY-MM-DD, không tự đổi timezone. Không suy diễn giới tính lạ thành giá trị khác.
- React thay mock ở ADM-09/10, giữ Antigravity: lọc role/status/đang thuê, tìm kiếm có submit/reset trang, phân trang thật; mở đúng ID. Chi tiết có loading/404/error/retry; không fallback tài khoản mẫu. Thao tác chưa có API được bỏ/vô hiệu rõ, không toast thành công giả, không nhập @/mocks. Banner layout đánh dấu hai trang dùng API thật; phần nghiệp vụ chưa nối ghi rõ.
- AC: 2 endpoint thành công/401/403/locked; sai filters422/thiếuID404/thiếuschema503; AND/OR đúng, phân trang, wildcard literal, NULLemail, resident đã thanh lý không đang thuê, dữ liệu liên quan thật và không N+1; payload list/detail/me không rò trường nhạy cảm sai phạm vi; GET không thay user/role/status/hợp đồng. Frontend test/build/lint/Pint; browser DB test cô lập kiểm tra lọc/tìm/phân trang/detail/F5/404/quyền/lỗi mạng/retry/mobile. Không test ghi dev hoặc migration ngoài phê duyệt.


**Sau USR-A:** chính sách email/mật khẩu cấp nhân viên đã CONFIRMED riêng theo DB-D56/USR-D01, triển khai lát cắt §21. Giới hạn khóa đã duyệt DB-D57/USR-D02 tại§22: không thao tác bất kỳ Admin nào qua APIstatus.


## 21. USR-B — Admin cấp tài khoản Kỹ thuật viên/Bảo vệ

**CONFIRMED: DB-D56/USR-D01**, tiếp tục Q11; chỉ tạo mới, không nâng quyền/sửa tài khoản có sẵn. Không migration/schema/Admin thật/dev data, không khóa/mở khóa hay đổi hồ sơ, không thêm trang; modal trên ADM-09 giữ Antigravity.

- POST `/api/v1/users`, tên api.v1.users.store; Sanctum session cookie, active/role:admin + UserPolicy::createStaff + middleware spa/CSRF. Body full_name, phone, email tùy chọn, role chỉ technician/guard, password, password_confirmation. Laravel dùng validated, AuthIdentity/UniquePhone/PasswordRules có sẵn: tên<=120, emailRFC<=191 trim+lowercase/NULL khi rỗng, SĐT10–15chữ số có thể bắt đầu+, +84/84 Việt Nam về0, chặn cả biến thể cũ tương đương; password theo quy tắc đăng ký hiện có, xác nhận khớp, khôngNUL/khôngvượt72byte bcrypt. Không tự sửa dữ liệu cũ.
- Từ chối status/id/user_id/email_verified_at/remember_token/id_number/date_of_birth/gender/permanent_address/has_active_contract/active_contract và trường điều khiển khác. Không tạo role admin/user/resident; không cập nhật bất cứ tài khoản nào khi trùng định danh. Gán role đã được validate thuộc2giátrị và active tại server; email không verified. Một thao tác ghi nguyên vẹn, bắt UNIQUE race409 và lỗi DB bất ngờ bằng log đã lược bỏ dữ liệu nhạy cảm, không log SQL/bindings/payload/hash/mật khẩu.
- 201 `{data:...}` dùng AdminUserResource an toàn với has_active_contract=false/active_contract=null, không legal/password/confirmation/token/hash. Phiên Admin giữ nguyên, /auth/me vẫn tài khoản Admin; không gọi luồng register tự đăng nhập. Không trả mật khẩu để bàn giao, không emailinvitation/tokens/defaultpassword/change-first-login.
- React mở modal “Tạo tài khoản nhân viên” trên trang danh sách: RHF/Zod, chỉ2vai trò, email tùy chọn, cả2inputpassword type=password/autocomplete=new-password. Không lưu mật khẩu vào storage/log/URL/toast hoặc render plaintext, không nút hiện mật khẩu. Lỗi422 hiện đúng trường,409 nhắc xung đột,401/403/419/mấtmạng báo thật; không thành công giả. Chặn đóng/gửi lặp khi đang lưu; hủy/unmount và lưu thành công xóa state mật khẩu; thành công đóng modal, thông báo tên/vai trò không mật khẩu, refresh danh sách bằng GET API. Hướng dẫn bàn giao trực tiếp qua kênh an toàn, Admin biết mật khẩu ban đầu; chưa ép đổi lần đầu.
- AC: tạo cả2roles có/khôngemail, nhiềuNULL, chuẩn hóa/duplicateemail+phonevariants, dữ liệu/mật khẩu sai/fields cấm, anonymous401/nonadmin403/locked403/CSRF419, UNIQUE race409, DBerror500logsanitized, hash đúng/no default/no partial/no mutation existing/Adminsessionunchanged/no responseleak. Browser DB test riêng: tạo từ modal/đọc lại/lỗi/hủy/reset/giữphiênAdmin và nhânviênmới đăngnhập được trong contextkhác, không có quyền APIAdmin; password không ở UI/storage/URL/output. Build/lint/tests/Pint theo guard; không tạo nhân viên trên dev trong lượt kiểm thử.

## 22. USR-C — Admin khóa/mở khóa theo phương án A

**CONFIRMED DB-D57/USR-D02.** Không schema/migration, không đổi vai trò/mật khẩu/định danh/hồ sơ; chỉ trạng thái tài khoản. Giữ giao diện Antigravity và trang ADM-10 hiện có.

- PATCH `/api/v1/users/{user}/status`, tên api.v1.users.status; body chỉ `{status:"locked"}` hoặc `{status:"active"}`. Auth Sanctum + active + role:admin + spa/CSRF, UserPolicy::changeStatus. Admin không được thao tác chính mình hoặc bất kỳ tài khoản roleAdmin, kể cả đanglocked. Chỉ4role còn lại. ID thiếu404, input sai/trường điều khiển422, chưa đăng nhập401, sai quyền/targetAdmin403, thiếu schema503, lỗi DB ngoài dự kiến500 an toàn. 200 AdminUserResource tối thiểu, không pháp lý/password/token/hash.
- Controller authorize, Service transaction + lockForUpdate dòng users mục tiêu; kiểm tra Policy lại sau khóa để không tin target cũ. Gán trạng thái yêu cầu rõ ràng, không toggle theo trạng thái server; gửi lại cùng trạng thái không tạo thay đổi dữ liệu khác. Giữ password/role/email/phone/verified/remember_token và mọi lịch sử, không xóa session hàng loạt hoặc bảng liên quan. EnsureActiveAccount từ chối phiên cũ khi phát hiện locked và hủy phiên đó; sau mở khóa đăng nhập lại bằng mật khẩu cũ, không tự đăng nhập hay nâng quyền.
- ADM-10: nút Khóa/Mở khóa chỉ với tài khoản khôngAdmin; modal xác nhận tên + tác động, Hủy không gọi API. Chặn đóng/gửi lặp khi lưu; thành công dựa response rồi GET lại chi tiết. API lỗi hiện thật, không đổi badge/hiện thành công giả; có thể thử lại/tải lại. Admin không có nút. Bảng danh sách đọc lại trạng thái thật; không tạo trang/đổi phong cách.
- AC:4roles khóa/mở/idempotent; quyền anonymous/nonadmin/Adminlocked/targetAdmin/self; input sai và payloadrole/password/email/hồsơ không thay đổi; giữ dữ liệu và quan hệ hợp đồng/hóa đơn/payment; saiCSRF419, missing404/schema503, rollback500 không partial/ròSQL. Phiên target đăng nhập trước khóa bị403 rồi401, đăng nhập locked403 (email/SĐT), sau mở khóa login cũ thành công. Browser xác nhận/hủy/F5/list/APIquyền/phiêncũ/offline/retry/đanglưu/mobile, chỉDBtest.
- Hồ sơ: ADM-10 có nhu cầu sửa nhưng chưa chốt trường/quy trình xác minh SĐT,email,pháp lý. Lát cắt chỉ sửa họ tên đã được duyệt DB-D58/USR-D03 tại§23; không tự mở các trường khác. Không chặn khóa/mở khóa.

## 23. USR-D — Admin sửa duy nhất họ tên

**CONFIRMED DB-D58/USR-D03.** Phạm vi tên hiển thị full_name trên ADM-10, theo quyền Admin sửa hồ sơ đã mô tả; không API tự sửa hồ sơ cho các vai trò khác. Admin active có thể sửa tên tài khoản đang xem (kể cả Admin/chính mình); đây không mở quyền khóaAdmin hoặc đổi role. Chỉ một trường, không màn hình mới/schema/migration.

- PATCH `/api/v1/users/{user}`, api.v1.users.updateName; body `{full_name:"Họ tên mới"}`. Tên bắt buộc, trim, chuỗi1–120ký tự theo quy tắc có sẵn; cho trùng họ tên, không tự sửa bản ghi khác. FormRequest chỉ full_name, cấm status/role/email/phone/password/verified/legal và trường điều khiển. 200 AdminUserResource tối thiểu; 401/403/404/422/419/503/500 theo§22. PUT/DELETE vẫn không mở. PATCH cũ trong test đọc trước là405, nay inputrole/status phải422; giữ kiểm tra không đổi dữ liệu.
- Policy updateName yêu cầu Admin active; Service transaction/lock dòng users + kiểm tra lạiPolicy, chỉ gán full_name khi khác; giữ mọi trường khác trừ updated_at. Không đổi contracts/invoices/payments/tệp hoặc các quan hệ. Không đổi session/login; nếu sửa chính mình React refresh /auth/me để navbar phản ánh tên thật. LỗiDB rollback và logan toàn.
- Form1trường trong Modal có sẵn trên ADM-10, RHF/Zod, điền tên thật; không giả lưu. Hủy không gọi API; pendingchặnđóng/gửilặp; 422theotrường/401/403/409/419/mấtmạng báo thật, retryđược. Thành công đóng và GET lại hồ sơ; list/F5 phản ánh tênDB. Các trường khác tiếp tục chỉđọc. Giữ Antigravity/mobile.
- AC: đổi tên hợp lệ/trim/120/ký tựViệt/trùng tên/no-op; 121/rỗng/null/array/fields cấm422; anonymous/nonAdmin/lockedAdmin bịchặn; giữ quyền/địnhdanh/mật khẩu/hợp đồng/hóa đơn, responsean toàn; thiếuID404/schema503/CSRF419/rollback500. Browserform/save/hủy/validation/F5/list/APIquyền/offline/retry/busy/mobile/khôngmởfieldkhác; nếu đổi tên chính mình navbar/me cũng đúng. ChỉDBtest, không nhập tên người dùng thật trêndev.

## 24. LEASE-A (CTR) — hợp đồng nháp trên schema hiện có

Lát cắt thực thi theo yêu cầu tiếp tục Full MVP ngày24/10; căn cứ DB09§3.8, §8.1 ở trên và DB plan§14. Không thay nghiệp vụ hoặc duyệt thêm P4–P8. Admin active xem danh sách/chi tiết, tạo/sửa/xóa mềm nháp; active/terminated/expired chỉ đọc trong lát cắt này. Q5 nháp phòng còn người, Q6 tạo tài khoản trong wizard là tùy chọn chưa đưa vào; chỉ chọn phòng available và tài khoản user/resident active chưa có hợp đồng active. Không đổi trạng thái phòng, vai trò người thuê hoặc thu/đối soát cọc khi lưu nháp.

- GET `/api/v1/contracts`: `status`, `building_id`, `room_id`, `user_id`, `q`, `page`; kết hợp AND, tìm chuỗi literal trong mã hợp đồng/tên-SĐT-email người thuê/mã phòng, id tăng dần,20dòng/trang theo chuẩn Laravel. GET `/{contract}` chỉ bản ghi chưa xóa mềm; không tìm thấy404, không lấy bản đầu làm fallback.
- POST `/api/v1/contracts` →201; PATCH `/{contract}` →200 cho nháp; DELETE `/{contract}` →204 xóa mềm nháp. Mọi endpoint Admin Policy + auth/active/role; ghi cần SPA cookie/CSRF. Trường tạo bắt buộc: `room_id`, `user_id`, `start_date`, `end_date`, `monthly_rent`, `deposit_amount`, `occupant_count`; `note` tùy chọn/NULL. PATCH kiểm tra dữ liệu sau khi ghép với bản ghi hiện tại. DATE chính xácYYYY-MM-DD, end_date>start_date, ngày cuối inclusive theoDB-D43; tiền nguyên0..9007199254740991đồng (giới hạn JSON an toàn đang dùng ởROOM), số người1..sức chứa. Note theo giới hạn TEXT hiện có. Không nhận status/mã/cọcđãthu/đốisoát/chỉsố/kíchhoạt/thanhlý/dịchvụ/điềukhoản từ client.
- Resource trả các trường cơ bản trên, `id`, `contract_number` (NULL trước kích hoạt), `status`, `deposit_status`, hai chỉ số đầu nullable chỉ đọc, `actual_end_date`, timestamps và room tối thiểu kèm building/tenant tối thiểu. Không trả mật khẩu/token/CCCD/địa chỉ pháp lý. Không giả mãHD hoặc số tiền nghiệp vụ chưa có.
- Service transaction retry3, khóa rooms→users→contracts theoid và kiểm tra lại điều kiện/trạng thái; không cho sửa hợp đồng đã active. Tranh chấp trạng thái409; input422; lỗiDB rollback và thông báo an toàn. Xóa mềm nháp có dữ liệu con/lịch sử bị409, không tự xóa liên quan. Hoạt động trên Nhóm2; chỉ kiểm tra bảng lịch sử Nhóm3 nếu đã tồn tại, không tự migrate.
- Ba trang ADM-11/12/13 bỏ importmock, lấy API thật. Tái sử dụng ADM-12 cho `/admin/contracts/:contractId/edit`; form3bước phòng→người thuê có sẵn→ngày/tiền/số người/ghi chú. Lựa chọn không bị cắt ở20 bản ghi; dùng phân trang API. Tạo/ghi thực sự thành công mới điều hướng/hiện thông báo; lỗi422đúngtrường,409tải lại,401/403/404/mấtmạng báo thật/thử lại. Khóa thao tác khi đang gửi, mobile bảngcuộn, giữ Antigravity. Các nhánh dịch vụ/điều khoản/kích hoạt/thanh lý thông báo chưa triển khai, không nút thành công giả hoặc dữ liệu giả.
- AC: CRUDnháp/F5/filterAND/tìm literal/phântrang; tiền/ngày/sứcchứa/kiểusai/fieldcấm; 401/403/lockedAdmin/CSRF; active bất biến và softdelete404; giữ nguyên phòng/người thuê/cọc/lịch sử; lỗiDBkhôngpartial/SQL; thiếuNhóm3vẫn chạy nháp; browser qua Nginx/DBtest kiểm tra tạo/sửa/xóa/giữphiên/quyền/404/offline/mobile. Chưa coi kích hoạt/thanh lý hoặc kiểm thử Admin dev là hoàn thành.

## 25. LEASE-B (CTR) — dịch vụ hợp đồng nháp

Theo yêu cầu tiếp tục CTR và phê duyệt Q7/DB-D59. Tái sử dụng mục Dịch vụ trên ADM-13; không màn hình mới, không schema/migration. Chỉ Admin active được đọc/ghi; chỉ sửa nháp, không thay trạng thái phòng/người thuê/cọc. Kích hoạt, điều khoản P4/P5 và cọc Q15 vẫn ngoài lát cắt.

- GET chi tiết hợp đồng hiện có trả thêm `contract_services`: id, service_id, quantity (chuỗi 2 số lẻ), unit_price (snapshot nguyên VND/NULL), start_date, end_date và service tối thiểu (code/name/unit/billing_type/status). Không đưa danh sách dòng vào list hợp đồng. Hiển thị các dòng đã lưu và khoảng hiệu lực, kể cả dịch vụ danh mục ngừng hoạt động; không tự tính tiền hóa đơn ở React.
- PUT `/api/v1/contracts/{contract}/services`, body `{services:[{service_id,quantity}]}`, thay tập dịch vụ định kỳ của nháp. Mảng rỗng gỡ dịch vụ định kỳ; không xóa hợp đồng. Không nhận price/unit_price/status/ngày hoặc trường lạ. Per_room=1; per_person/per_unit là số nguyên dương trong miền DECIMAL(10,2). Gợi ý per_person bằng occupant_count khi chọn mới, không đồng bộ tự động.
- Chỉ chọn dịch vụ đang hoạt động, không chọn metered/ELECTRICITY/WATER. Laravel chụp giá cho dòng mới; dòng còn trong tập giữ unit_price cũ khi lưu lại hoặc đổi số lượng. Muốn chọn lại theo giá mới phải gỡ và lưu trước rồi thêm lại. Các dòng của active/terminated/expired chỉ đọc, PUT trả409. Các dòng nháp có lịch sử/khoảng ngày phức tạp không tự ghi đè; trả409 để kiểm tra.
- Transaction/khóa rooms→users→contracts→contract_services, kiểm tra lại trạng thái và cha; đọc giá danh mục có khóa chia sẻ trong transaction để không chụp giá giữa một cập nhật. Toàn bộ input hợp lệ mới ghi, lỗi rollback. Đổi ngày bắt đầu nháp đồng bộ ngày bắt đầu các dòng nháp đơn giản; giữ snapshot giá và số lượng. Không sửa dữ liệu hợp đồng khác hoặc hóa đơn. Quy tắc xóa nháp có con ở §24 giữ nguyên (gỡ dịch vụ trước nếu muốn xóa).
- AC: giá từ server/giữ snapshot khi giá danh mục đổi; lưu/gỡ/sửa số lượng/F5/đủ trang danh mục; metered/inactive/trùngID/giảgiá/sốlượngsai→422; active409/anonymous401/nonAdmin403/locked/CSRF419/404; lỗi cuối mảng không ghi một phần; ngày nháp đồng bộ và giữ cọc/role/phòng; lỗiDB không lộ SQL; UI pending chặn gửi lặp/hủy, 422 theo trường, offline không báo thành công, mobile bảng cuộn. Chỉ kiểm thử ghi trên DB test.

## 26. ROOM-PUB — API phòng công khai cho giao diện hiện có

Theo §7.1/DB09 §3.3/DB-D01 và quyết định CONFIRMED DB-D60. Chỉ đọc dữ liệu thực, không migration. API quản trị giữ nguyên; public không cần phiên đăng nhập. Điều kiện cố định `rooms.status=available AND is_public=true`; không cho query nới điều kiện này. Phòng không đủ điều kiện và ID không tồn tại cùng trả 404. Không tự thêm điều kiện trạng thái tòa khi chưa có quyết định.

**HTTP contract (Codex phụ trách; Antigravity dùng khi bàn giao):**

- GET `/api/v1/public/rooms`: `{data:[room,...],links,meta}` chuẩn Laravel, 20 dòng/trang. Query tùy chọn: `q` (chuỗi literal tối đa191ký tự, tìm mã phòng/tên tòa/địa chỉ); `building_id`; `min_price`, `max_price` (nguyên VND0..9007199254740991); `min_area`, `max_area` (0..999999.99, tối đa2số lẻ); `min_occupants`, `max_occupants` (1..65535, lọc sức chứa max_occupants); `amenity_ids[]` (ID dương, không trùng; phòng có đủ các tiện nghi yêu cầu trong hợp tòa/phòng); `sort` = `price_asc|price_desc|area_asc|area_desc`; `page` nguyên dương. Các bộ lọc kết hợp AND, biên min/max inclusive. Mặc định ID tăng, sort đồng giá/diện tích dùng ID tăng để phân trang ổn định. Không có sort featured vì schema chưa có trường đó.
- GET `/api/v1/public/rooms/filters`: `{data:{buildings:[{id,name}],amenities:[{id,name}]}}`. Chỉ trả lựa chọn thuộc ít nhất một phòng đủ điều kiện công khai, tiện nghi còn hoạt động; không lộ danh mục chỉ có ở phòng riêng/đã thuê. Đây là danh mục lọc, không phân trang và không chạy theo query tìm kiếm.
- GET `/api/v1/public/rooms/{room}`: `{data:room}`. `room` gồm `id`, `code`, `floor_number`, `area` (chuỗi thập phân), `base_price`, `deposit_amount` (nguyên VND), `max_occupants`, `description` nullable; `building:{id,name,address,latitude,longitude}` (tọa độ chuỗi hoặc NULL); `amenities:[{id,name,description}]` là hợp tòa/phòng, ID duy nhất tăng dần và chưa lưu trữ. Không trả tenant/users/contracts/legal/password/token hoặc các trường quản trị. Không thêm ảnh/URL giả; ảnh thật thuộc FILE và chưa có API trong lát cắt này.
- Lỗi: 422 theo trường khi query sai (max<min, kiểu sai, sort lạ, trường query ngoài contract), 404 cho detail không công khai, 503 khi thiếu bảng; JSON theo quy ước. GET không cần CSRF hoặc cookie; client dùng http chung vẫn có withCredentials. Không mở POST/PATCH/DELETE public. Admin API vẫn 401/403 theo quyền thực.
- Ví dụ minh họa (không phải dữ liệu dev): `/api/v1/public/rooms?min_price=3000000&max_price=5000000&min_occupants=2&sort=price_asc&page=1`; frontend lấy từng trang theo meta/links, không tự tính giá, không dùng mock làm fallback khi lỗi/rỗng.

**AC:** anonymous/list/detail/filter/pagination/biên giá-diện tích-sức chứa; tìm literal `%`, `_`, dấu nháy; sort ổn định; 404 mọi trạng thái không đủ điều kiện; tiện nghi hợp tòa/phòng không trùng, archived bị loại khỏi hiển thị/lọc/options nhưng pivot/Admin không đổi; query không mở khóa điều kiện cố định; không rò dữ liệu riêng; eager-load không N+1; GET không ghi nghiệp vụ; API Admin vẫn được bảo vệ. Test chỉ DB test có guard. React PUB-02/03 hiện có sẽ tích hợp riêng, giữ Antigravity; ảnh/đặt lịch VIEW chưa nối phải thông báo thật, không thành công giả. Màn hình lớn còn thiếu do Antigravity thiết kế, không chặn Backend.

## 27. CAT — tích hợp ADM-23 Cài đặt từ Antigravity

Theo yêu cầu Full MVP 27/10, tận dụng bố cục `ui-antigravity-full/src/pages/admin/AdminSettingsPage.tsx` vào frontend chính thức, áp dụng đúng API§18/CAT-D01 đã duyệt. Không đổi route/JSON/backend/schema. `/admin/settings` đặt dưới guard Admin hiện có; sidebar mở đúng mục này. Thông tin hệ thống/ngân hàng chỉ đọc sáu khóa, hiển thị NULL hoặc khóa thiếu thành “Chưa cấu hình”, không dùng giá trị prototype hoặc tự seed. Không giả QR hoặc thanh toán đã hoạt động.

Hai khóa ngày dùng **hai form/lần lưu độc lập** qua PUT `/api/v1/settings/{key}` để không tạo ảo giác lưu toàn bộ nguyên tử khi backend không có API đó. Chỉ gửi `{value: số nguyên1..365}`; RHF/Zod, 422 đúng ô, 401/403/409/419/mạng thông báo thật, pending chặn gửi lặp. Khóa thiếu có ô trống cho Admin tự nhập, chỉ tạo sau PUT thành công; GET trả missing_keys để cảnh báo thiếu cấu hình. Giá trị từ Resource trả về mới cập nhật UI; F5 đọc lại đúng DB. Không thay hóa đơn/hợp đồng đã phát sinh. Kiểm tra thao tác bằng fixture DB test; không chỉnh cấu hình dev trong lượt này. Bỏ badge tài chính/sửa chữa mẫu trên sidebar khi chưa có API số liệu, giữ kiểu dáng hiện có.

## 28. LEASE-C — nhận cọc và kích hoạt, yêu cầu tiếp tục 27/10

Triển khai theo yêu cầu trực tiếp ưu tiên nghiệp vụ xuyên suốt, DB-D61/62 và §8.1b; không migration dev. Không thay schema, không mở thanh lý hoặc thanh toán nhà cung cấp. Giữ CRUD nháp cũ; bổ sung các action Admin active, cookie/CSRF/Policy:

- PUT `/api/v1/contracts/{id}/terms`: chỉ bốn trường snapshot trong ContractTermsService, loại phí NULL được ở nháp nhưng không kích hoạt; response ContractResource. Không nhận xác nhận miễn thực tế từ client.
- POST `/api/v1/contracts/{id}/deposit`: `{confirmed:true, expected_amount:VND_nguyên, expected_revision:SHA256_bản_đã_đọc}`. Số tiền thực lấy từ DB và phải bằng số đã hiển thị để tránh nhận nhầm khi nháp vừa thay đổi. Chỉ nháp có cọc>0; server gán held/paid_at; lặp lại giữ thời điểm cũ. Không tạo invoice/payment/biên nhận doanh thu. Nháp đã nhận cọc không đổi room_id/user_id/deposit_amount hoặc bị xóa; cần quy trình hoàn cọc riêng trước các thao tác đó.
- GET `/api/v1/contracts/{id}/activation-context`: mốc đọc gần nhất từng ELECTRICITY/WATER (chuỗi chỉ số/ngày/kind hoặc NULL). Chỉ tham khảo; POST luôn kiểm lại trong transaction.
- POST `/api/v1/contracts/{id}/activate`: hai initial readings chuỗi DECIMAL(10,2), meter_gap_reason nullable, meter_gap_confirmed boolean và expected_revision bắt buộc. ContractResource chi tiết trả lifecycle_revision từ nội dung hợp đồng và snapshot dịch vụ; so dưới khóa, dữ liệu đổi trả409 kể cả số cọc không đổi. Thiếu/invalid422, xung đột trạng thái409, schema/danh mục thiếu503. Chỉ nháp; một active/phòng/người, kiểm tra tenant/sức chứa/ngày; điều khoản rõ/cọc đủ. Lịch sử phòng phải bàn giao/chốt hợp lệ, không kích hoạt ngược chuỗi. Chỉ số thấp422, cao cần lý do chung+xác nhận server ghi actor. Thêm metered đúng một lần; snapshot dịch vụ định kỳ giữ nguyên; cùng transaction sinh mã HD theo ID, active/activated_at, occupied và user→resident. Không tạo chỉ số/hóa đơn giả. Lặp kích hoạt409, không thêm dòng hay đổi mã/thời điểm.

AC: quyền 401/403/CSRF; zero/positive deposit; stale amount; held edit/delete; terms none/fixed/multiple/waiver snapshot; missing terms/deposit; initial thấp/cao/lịch sử thiếu/chồng ngày; metered thiếu/trùng; rollback lỗi DB và cạnh tranh cùng phòng/người; không tạo invoices/payments; React lưu/422/409/pending/F5/mobile; kiểm tra browser DB test riêng và dọn fixture theo run IDs. Đây là contract triển khai trong phạm vi đã giao, không tự phê duyệt U3/P3/P6/P7/P8/P9/P11.

## 29. U1 — giá điện nước theo tòa (DB-D63, tiếp tục28/10)

Giữ GET/POST `/api/v1/utility-prices`, quyền Admin/SPA/Policy hiện có. POST thêm building_id bắt buộc, tồn tại; GET lọc building_id tùy chọn kết hợp service_id/page. Resource trả building_id và building{id,name}, giữ service/price/date. UNIQUE theo tòa/dịch vụ/ngày01. D33 chỉ kiểm kỳ chỉ số của phòng thuộc đúng tòa và dịch vụ; tòa khác không chặn. Chỉ thêm lịch sử; không sửa reading/item/tổng hóa đơn đã phát hành. Tòa mới không tự có giá.

Migration U1 đã commit giữ nguyên file/hash trong pending, chỉ áp dụng tường minh DB test. API đòi cột building_id, thiếu trả503 rõ ràng, không fallback global; dev chưa migrate nên chưa dùng API scoped. API tests áp dụng DDL trước transaction fixture, rollback fixture rồi trả schema global; không RefreshDatabase quanh DDL hoặc chạy đồng thời browser. Test migration sao chép lịch sử và chặn rollback mất dữ liệu tiếp tục giữ nguyên.

Frontend: lọc tòa/dịch vụ/page bằng URL, giữ F5/Back và options bất đồng bộ; chọn tòa bắt buộc trong form, không mặc định tòa đầu. Chi tiết tòa có lịch sử phân trang/link quản lý đúng scope. Chỉ hiển thị lịch sử, không suy giá đang áp dụng từ dòng đầu hoặc tạo giá/ảnh mẫu. AC: quyền/CSRF; hai tòa cùng ngày giá khác nhau; trùng đúng scope422/race409; thiếu/sai tòa; D33 đúng tòa; snapshots issued bất biến; tòa mới không có giá; 503 legacy; create/F5/filter/mobile/error/browser trên DB test và cleanup/dev snapshot.

## 30. MTR — chỉ số chính thức (DB-D15/24–28/33–35/37/63/65/68)

Phạm vi được giao Full MVP: Admin ghi periodic thật, không mở final trực tiếp ngoài transaction thanh lý. GET `/api/v1/meter-readings` phân trang/lọc building_id,room_id,service_id,period,kind; POST cùng URL body `{readings:[{room_id,service_id,period,reading_date,current_reading}]}` tối đa100 dòng, mỗi phòng/dịch vụ một dòng/lượt. Chỉ số là chuỗi tối đa8 số nguyên/2 thập phân, kỳ ngày01 do Admin chọn; ngày đo không trước kỳ. Không nhận kind/contract_id/previous_reading/price/amount/invoice_id/actor từ client. GET `/api/v1/rooms/{room}/meter-reading-context` nhận service_id/period/reading_date, trả mốc trước/đơn giá/hợp đồng tham khảo; POST luôn đọc lại dưới khóa.

Chỉ Admin active, SPA cookie/CSRF/Policy. Thiếu schema U1/U3 trả503, không global fallback. Khóa phòng/người/hợp đồng/dịch vụ đăng ký theoID rồi services (dùng cùng khóa U1), meter_readings/invoices; giá đọc bằng locking read đúng tòa, effective_from<=period. Một transaction toàn bộ batch, lỗi một dòng không ghi dòng nào; retry deadlock3, unique cuối409. Snapshot previous/current/consumption/unit_price/amount do Backend/Money tính, chỉ trả trường cần thiết qua Resource. Không cập nhật hoặc xóa chỉ số qua API này.

Mốc hợp đồng đầu đã kích hoạt hoặc chỉ số thực liền trước; không tự lấy0. Phòng trống cần mốc thực; khoảng trộn người thuê/phòng trống hoặc thiếu mốc ngăn cách422. Kích hoạt mới dùng initial đã xác nhận, không tính phần gap cho người thuê mới; dữ liệu legacy vẫn kiểm final hợp đồng trước/chênh đã xác nhận/chỉ số đầu không giảm. Chặn nhập ngược/ngày trùng chỉ số, periodic ngày bàn giao, thiếu kỳ, chỉ số giảm, dịch vụ không phải Điện/Nước hệ thống hoặc chưa đăng ký. DB-D25 không cho gộp nhiều kỳ vào một đơn giá kể cả phòng trống: sau final chốt phần vacancy cùng kỳ, sau periodic vacancy cần kỳ kế tiếp; không tự chia lượng theo ngày. Không giới hạn N ngày từ ngày đo đến ngày nhập dữ liệu; vẫn kiểm chuỗi/người chịu phí/hóa đơn. Periodic UNIQUE hợp đồng/dịch vụ/kỳ khi đang thuê, phòng/dịch vụ/kỳ khi trống theoDB-D68; final một dòng mỗi hợp đồng/dịch vụ. Chặn ghi thêm làm thay đổi kỳ đã có hóa đơn tháng phát hành; chưa mở INV/PAY từ việc ghi chỉ số.

ADM-15 giữ Sidebar/font/sky-teal/bảng/tab Antigravity: lịch sử thật và form nhập một/hàng loạt RHF/Zod; hiển thị snapshot Backend, không tự tính tiền hoặc điền current=previous+10. Tab ảnh cư dân ghi rõ chưa triển khai cho tới U2, không dùng status submitted/confirmed trong meter_readings chính thức. AC gồm quyền/CSRF/field giả, tiền HALF_UP, giá hai tòa/lịch sử, thiếu giá/kỳ/mốc/chuỗi cắt hợp đồng, batch rollback/duplicate, context stale, snapshot issued, concurrent U1/MTR; browser lưu/F5/lọc/invalid/pending/expired/error/mobile và cleanup DB test. Không suy schema hoặc test Service là UI xuyên suốt.

## 31. INV/PAY — Business Rules Q13/Q8 đã chốt28/10

**BR-INV-PERIOD-01 (DB-D71,28/10):** Admin được chuẩn bị draft trước tháng hóa đơn; chỉ issue khi ngày Việt Nam đã tới ngày01 của kỳ. Không đổi nội dung/due_date/total sau issued.

**BR-INV-ZERO-01 (DB-D72,28/10):** tổng0 vẫn phát hành số/thời điểm hóa đơn, status=paid/paid_amount=0, không payment/RCP giả hoặc ghi doanh thu thực nhận.

**BR-INV-OTHER-01 (DB-D69):** chỉ Admin active có quyền được thêm Khoản khác vào hóa đơn draft. Bắt buộc tên khoản, số tiền nguyên VND và lý do/căn cứ thu hợp lệ hoặc thỏa thuận phù hợp. Không tự sinh phí không có căn cứ; frontend không tự tính tiền. Cư dân được đọc đầy đủ khoản thu thuộc hóa đơn của mình.

**BR-INV-OTHER-02:** lưu người/thời điểm/thao tác và nội dung trước/sau để đối chiếu; không xóa mất lịch sử khi sửa/gỡ khoản nháp. Sau issued, cấm sửa trực tiếp dòng/tổng; sai sót theo DB-D27 (hủy/lập lại khi chưa có payment hoặc quy trình điều chỉnh khi đã xác nhận). Chưa triển khai API hoặc lưu lịch sử từ việc ghi quyết định này; cách lưu/API/AC chi tiết bổ sung trước code INV.

**BR-PAY-HISTORY-01 (DB-D70):** người thuê đã terminated vẫn xem hóa đơn/công nợ cũ và gửi thanh toán của chính mình; không bắt buộc active contract. Mọi list/detail/file/submit phải kiểm owner qua hợp đồng, không tin user_id phía client. Không được xem/gửi/đọc ảnh thanh toán của người khác.

**BR-PAY-HISTORY-02:** chuyển khoản kèm ảnh chỉ tạo pending, không trừ nợ hoặc báo thành công thu tiền. Chỉ Admin đối soát thực nhận hoặc xác nhận hợp lệ của provider mới chuyển confirmed/tính paid_amount/sinh RCP; từ chối phải có lý do. Online cần kiểm xác thực thông báo, số tiền/hóa đơn và chống xử lý lặp; chưa có provider/Sandbox được xác nhận thì chỉ triển khai Backend/giả lập tách biệt, không gọi thanh toán thật đã hoạt động. Cọc giữ riêng, không tự chuyển thành doanh thu thuê.

AC INV/PAY: trái quyền/owner và người đã thanh lý, other thiếu tên-tiền-căn cứ, lịch sử sửa/gỡ, issued bất biến, pending không trừ nợ, confirm/reject thực nhận, xử lý lặp/cạnh tranh, dữ liệu provider không hợp lệ, ảnh private, UI cư dân nhìn thấy khoản/nợ đúng. Chỉ DB test; migration dev cần duyệt riêng.

## 32. U2-03 — gửi ảnh và duyệt chỉ số (DB-D64, được giao Full MVP)

Giữ hai pending migration M19/U2, không thêm bảng/cột/enum. GET `/api/v1/meter-reading-submissions` phân trang20, lọc status/period/page; Admin thêm room_id, Resident giới hạn submitted_by=self và contract.user_id=self. GET `.../context` chỉ Resident trả hợp đồng active/phòng/tòa và hai dịch vụ hệ thống. GET `.../{submission}` chi tiết; GET `.../{submission}/photo` stream private qua Policy, không URL disk/path. Resident hết hợp đồng vẫn đọc lịch sử của mình nhưng không gửi mới.

POST cùng URL multipart: service_id,period,reading_date,current_reading chuỗi và đúng1 photo JPG/PNG/WebP tối đa5MB, kiểm MIME thật/extension; cấm owner/room/contract/status/giá/tiền. Server khóa phòng→user→contract, xác minh active/owner và khoảng MTR, lưu pending+ảnh metadata nguyên khối; DB thất bại dọn đúng file vừa tạo. Pending không tạo meter_readings/invoice/payment. UNIQUE pending giữ room/service/period, giữ lịch sử từ chối và cho gửi lại.

POST `.../{submission}/approve` Admin, body rỗng: khóa cha MTR trước submission, kiểm lại owner/kỳ/mốc/giá/ảnh còn tồn tại, gọi storeBatch MTR và lưu approved_meter_reading_id/actor/time cùng transaction. Không sửa số đo khi duyệt; sai thì reject. Lặp approve trả cùng bản ghi/thời điểm, không sinh chỉ số mới; không đảo trạng thái. POST `.../{submission}/reject` bắt buộc rejection_reason, giữ ảnh/lịch sử; action trên trạng thái khác pending409. Khóa phòng tuần tự với nhập trực tiếp/kích hoạt/thanh lý; không khóa submission rồi quay lên cha. Contract thay đổi/kỳ đã ghi/issued phải lỗi, không gán chỉ số sang hợp đồng mới.

Frontend: panel gửi/lịch sử tối thiểu trên Tổng quan cư dân (không gọi toàn màn hoàn chỉnh), tab duyệt ADM-15 theo style Antigravity; RHF/Zod, không mock KPI/ảnh/tiền. Ảnh qua http blob rồi revoke URL; không private path trong DOM. Pending khóa thao tác, lỗi thật/422/401/403/409/503 rõ ràng. AC: quyền5vai trò/owner/locked/CSRF, MIME-size/field giả, pending/trùng/reject-gửi lại, approve nguyên khối/lặp/ảnhprivate/chỉsốđãghi, cạnh tranh approve/nhập trực tiếp, Desktop-Mobile lưu-F5-ảnh-lỗi, cleanup DB test. Không migration dev.

## 33. INV-02/03 — hóa đơn tháng, khoản khác, phát hành/hủy

DB-D69/70/71/72 đã duyệt; dùng invoices/invoice_items/meter_readings/payments và JSON meta hiện có, không thêm bảng/cột/migration. Final/adjustment không mở tạo trực tiếp tại lát cắt monthly; final do CLOSE thực hiện sau. GET `/api/v1/invoices` lọc status/type/period/contract_id/room_id/overdue/page, GET `/{invoice}` chi tiết. Admin active xem nháp/lịch sử, Resident active chỉ hóa đơn đã phát hành/hủy của chính mình qua contract.user_id, không đòi hợp đồng active; không thấy draft hoặc dữ liệu người khác. Resource chỉ trả dữ liệu cần thiết, số dư/quá hạn do Backend tính; đọc thiếu schema503 trước query ID.

POST `/api/v1/invoices` body contract_id/period/related_invoice_id tùy chọn: tạo monthly draft cho hợp đồng active đã kích hoạt và có ngày tính tiền trong kỳ, một monthly chưa hủy/contract/kỳ; chặn final chưa hủy. Cho chuẩn bị kỳ tương lai theo DB-D71. Tiền phòng và dịch vụ định kỳ T chia theo ngày thực trong [start_date,actual_end_date), không tự dừng ở end_date dự kiến. Quantity/unit_price dùng snapshot contract_services, không lấy giá danh mục mới hoặc tự đổi per_person theo occupant_count. Dòng snapshot nguồn/period/ngày/tổng ngày/số ngày/quantity/giá; Money HALF_UP từng dòng.

Điện/nước T−1 phải có periodic thuộc đúng contract/service/period nếu hợp đồng/dịch vụ có ngày hiệu lực trong T−1 (DB-D34), không miễn chỉ vì hóa đơn đầu tiên. Dùng amount/price/readings đã lưu, không tính lại theo giá hiện hành hoặc chia lượng theo ngày. Không gán reading phòng trống/hợp đồng khác/final vào monthly. Gắn invoice_id cùng transaction; không chiếm reading đã thuộc hóa đơn khác. Tiêu thụ0 vẫn gắn/hiển thị reading, không tạo item quantity0 (DB design quantity>0); dữ liệu reading giữ đầy đủ mốc/giá/amount0. Không tạo mốc giả.

POST `/{invoice}/refresh` tính lại phần tự sinh khi còn draft; giữ Khoản khác/lịch sử. POST `/{invoice}/other-items` và PATCH/DELETE `/{invoice}/other-items/{item}` chỉ draft, body description/amount/basis (xóa cần reason), thêm expected_revision cho mọi thay đổi invoice có sẵn. Tên/basis bắt buộc, tiền nguyên1..9007199254740991 VND; server quantity1, unit_price=amount. Audit append-only trong invoice_items.meta: actor/time/action/before/after. Gỡ khoản không xóa hàng: quantity1/unit_price0/amount0, meta.voided=true và lưu snapshot cũ; Resource không tính nó là khoản đang thu, Admin vẫn đọc audit. Không sửa/gỡ sau issue. Không tự sinh other không căn cứ.

POST `/{invoice}/issue` cần expected_revision; khóa lại nguồn và so dự toán với draft, nguồn đổi409 cần refresh/kiểm tra lại, không âm thầm đổi số rồi phát hành. Chặn trước ngày01 của kỳ theo giờ VN. Sinh INV-YYYYMM-ID khi issue trong cùng transaction (YYYYMM theo thời điểm phát hành), due_date=ngày phát hành VN+invoice.due_days (thiếu dùng5, giá trị sai chặn); total0→paid/paid_amount0, không payment/RCP. Sau phát hành dòng/hạn/tổng bất biến.

POST `/{invoice}/cancel` expected_revision+reason: nháp hoặc hóa đơn đã phát hành (gồm paid0đ/paid_amount0 không có tiền thực nhận theo DB-D72) có thể hủy/lập lại khi không pending/confirmed payment theo DB-D27; confirmed hoặc paid_amount>0 báo409 cần điều chỉnh, pending báo409 cần xử lý. Giữ hàng/number/items/rejected payments; chỉ nhả meter_readings.invoice_id, không đổi số đo/snapshot. Lập lại dùng related_invoice_id trỏ cancelled monthly cùng contract/period, không ghi đè lịch sử.

Mọi ghi transaction retry3, khóa rooms→users→contracts→contract_services→services→meter_readings→invoices→payments rồi các items dưới invoice; đọc lại dưới khóa, UNIQUE cuối409, không MAX+1 hoặc client total/due/status/number. Revision hash invoice+items ngăn thao tác từ bản cũ. Frontend ADM16/17/RES04/05 ghép bố cục Antigravity, RHF/Zod, số tiền Backend, không fake KPI/payment/online. AC: quyền/owner/terminated, thiếu/sai kỳ/price/readings, proration-tháng nhuận/snapshot catalog/gap/zero, manual audit/issuedimmutable, futureissue/due/timezone, stale/duplicate/issue-cancel/payment races, Admin→Resident/browser/Desktop-Mobile và cleanup DB test. Không migration dev.

## 34. PAY-02/03 — minh chứng private, thực nhận và số dư (DB-D27/70, thiết kế§3.16)

Phạm vi Full MVP đã giao: dùng payments/invoices/attachments M19 và morph alias payment/collection payment_proof đã thiết kế, không thêm schema/enum. Chỉ DB test áp dụng M19 tường minh; dev chưa được migrate. Online provider/Sandbox chưa xác nhận nên chưa mở API/UI báo thanh toán online thành công. Q12 đã chốt có trang Công nợ riêng ADM-19: nhóm hóa đơn chưa thanh toán theo hợp đồng/người thuê, gồm hợp đồng đã thanh lý; số dư/quá hạn do Backend tính, payment pending không giảm nợ. Không cần bảng mới.

GET /api/v1/payments phân trang20 lọc status/method/invoice_id/page, GET /{payment} và /{payment}/proof. Admin active xem tất cả, Resident active chỉ payment của hóa đơn thuộc contract.user_id=self (withTrashed), không đòi hợp đồng active và không truy cập draft/người khác. Resource không path/disk/tên ảnh gốc/dữ liệu pháp lý; chỉ metadata cần thiết, amount/status/method/RCP/time/reason, tóm tắt invoice/số dư Backend và revision cho Admin.

POST /api/v1/invoices/{invoice}/payments: Resident multipart amount+đúng1proof JPG/PNG/WebP<=5MB nội dung MIME thật; server method=bank_transfer/status=pending/submitter=self. Admin JSON amount/method cash hoặc bank_transfer/confirmed_received=true/expected_revision của invoice để ghi nhận thực nhận trực tiếp; không nhận ảnh/khoản cọc/status/receipt/client owner. Invoice phải issued/partially_paid còn nợ, amount nguyên1..9007199254740991 và không vượt số còn nợ tại lúc ghi; nhiều pending được giữ riêng theo thiết kế, pending không dự trữ hoặc giảm nợ.

POST /payments/{payment}/confirm chỉ Admin: confirmed_received=true, expected_amount trùng tiền payment, expected_revision của payment+invoice đã đọc. Pending→confirmed sau kiểm lại số dư; sinh RCP-YYYYMM-ID theo thời điểm VN, reviewer/time server. Replay confirmed giữ RCP/actor/time và không cộng tiền lần nữa (vẫn kiểm amount/role); pending ảnh không còn sẵn sàng phải chặn để đối chiếu. Pending amount vượt số dư vì giao dịch khác đã xác nhận→409, giữ pending để Admin xử lý, không tự cắt tiền. POST /{payment}/reject expected_revision+reject_reason bắt buộc: chỉ pending→rejected, giữ ảnh/hàng/lý do, không RCP hoặc giảm nợ. Không sửa/xóa payment confirmed/rejected; không API method=deposit ngoài CLOSE.

Mọi ghi khóa room→users (owner và actor theoID)→contract→invoice→payments theoID trong transaction retry3, cùng parent order INV/CLOSE, actor/owner/state kiểm lại. paid_amount phải bằng tổng confirmed hiện có, sai dữ liệu409 cần đối chiếu; confirm/direct cập nhật tổng confirmed và status partially_paid/paid cùng transaction, không đổi items/total/due. Tổng confirmed không vượt total, cọc không tính doanh thu thuê. Direct nhận tiền dùng invoice revision để double click không tạo tiền lặp. Upload lỗi/race không để file/metadata thừa; private proof tải sau Policy với nosniff/no-store, quyền cha và collection đúng.

Frontend ADM18 và panel chi tiết invoice Admin/Resident theo Antigravity: hàng chờ/status/filter, private preview, form nhận thực tế/confirm/reject với RHF/Zod, không QR/ngân hàng mẫu/provider thành công giả; invoice reload sau thao tác. AC: quyền5vai trò/owner/terminated/locked/CSRF; missing-schema503 trước queryID; số/MIME-size/forgedfields; pending không trừ nợ, partial→paid, replay/double-click/overpayment, reject/history, paid0/draft/cancel chặn, ledger/snapshot bất biến, hai process confirm-confirm/confirm-cancel/cash-cash/proof-cancel; Desktop-Mobile/Admin→Resident/F5/error và cleanup dev snapshot.
