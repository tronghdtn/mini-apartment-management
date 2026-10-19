# Screen Inventory — danh mục màn hình và trạng thái

| Thuộc tính | Giá trị |
|---|---|
| Cập nhật | 18/10/2026 — đối chiếu với code `frontend/src/app/router.tsx` |
| Căn cứ | `docs/FRONTEND_DESIGN_BRIEF.md` v1.0 §5 (danh sách màn hình), quyết định CONFIRMED 14/10/2026 |
| Ứng dụng | `frontend/` — giao diện Antigravity chính thức. **Mọi màn hình đang chạy trên dữ liệu giả** (`src/mocks/`), chưa gọi API nghiệp vụ |

## 1. Cách đếm (thống nhất cho mọi tài liệu)

- **Đơn vị đếm là "màn hình" theo mã ID** trong Design Brief §5 (PUB-xx, ACC-xx, RES-xx, ADM-xx, STF-xx, SYS-xx). Modal, drawer, wizard bên trong một màn hình **không** tính thêm.
- **Tổng: 51 màn hình = 48 [MVP] + 3 [ĐỀ XUẤT UI]** (ACC-01, ACC-02, ADM-19).
- Số **route** khác số màn hình vì: ADM-12 có hai route (`/admin/contracts/new` và `/admin/contracts/:contractId/edit`); SYS-01 (403) và SYS-03 (lỗi route) không có URL riêng. Không dùng số route để báo tiến độ.

**Vì sao trước đây có các con số 52 / 49 / 26:**

| Con số cũ | Nguồn gốc | Đúng theo cách đếm mới |
|---|---|---|
| 52 | Đếm số dòng trong sitemap bên dưới, nơi ADM-12 được liệt kê thành 2 dòng (`contracts/new` và `contracts/:id/edit`) | 51 màn hình |
| 49 "MVP" | 52 − 3 màn [ĐỀ XUẤT UI], vẫn đếm thừa route sửa nháp | 48 màn [MVP] |
| 25 "Quản trị viên" trong bảng cũ ↔ 26 dòng Admin trong sitemap | Bảng cũ đếm màn hình, sitemap đếm route; tiêu đề cột bảng cũ ghi nhầm là "Số route" | 25 màn hình Admin |
| "26 màn hình còn thiếu" | 52 dòng sitemap − 26 màn Antigravity (chưa tính trang lỗi route của bản cũ) | **24 màn hình còn thiếu** + 1 route con (ADM-12 sửa nháp) |

## 2. Sitemap mục tiêu

```text
Public
├── /                         Trang chủ                                  PUB-01
├── /rooms                    Danh sách phòng trống                      PUB-02
├── /rooms/:roomId            Chi tiết phòng và đặt lịch                 PUB-03
├── /contact                  Liên hệ                                    PUB-04
├── /login                    Đăng nhập                                  PUB-05
├── /register                 Đăng ký                                    PUB-06
└── /account
    ├── appointments          Lịch hẹn của tôi [ĐỀ XUẤT UI]             ACC-01
    └── profile               Tài khoản của tôi [ĐỀ XUẤT UI]            ACC-02

Resident
└── /resident
    ├── (index)               Tổng quan                                  RES-01
    ├── contracts             Hợp đồng của tôi                           RES-02
    ├── contracts/:id         Chi tiết hợp đồng                          RES-03
    ├── invoices              Hóa đơn và công nợ                         RES-04
    ├── invoices/:id          Chi tiết hóa đơn và thanh toán             RES-05
    ├── requests              Yêu cầu sửa chữa                           RES-06
    ├── requests/new          Gửi yêu cầu sửa chữa                       RES-07
    ├── requests/:id          Chi tiết yêu cầu sửa chữa                  RES-08
    ├── notifications         Thông báo                                  RES-09
    └── profile               Thông tin cá nhân                          RES-10

Admin
└── /admin
    ├── (index)               Dashboard                                  ADM-01
    ├── buildings             Tòa nhà                                    ADM-02
    ├── buildings/:id         Chi tiết tòa nhà                           ADM-03
    ├── rooms                 Phòng                                      ADM-04
    ├── rooms/:id             Chi tiết phòng                             ADM-05
    ├── amenities             Tiện nghi                                  ADM-06
    ├── services              Dịch vụ                                    ADM-07
    ├── utility-prices        Giá điện nước                              ADM-08
    ├── users                 Người dùng                                 ADM-09
    ├── users/:id             Chi tiết người dùng                        ADM-10
    ├── contracts             Hợp đồng                                   ADM-11
    ├── contracts/new         Lập hợp đồng (wizard)                      ADM-12
    ├── contracts/:id/edit    Sửa hợp đồng nháp (cùng màn ADM-12)        ADM-12
    ├── contracts/:id         Chi tiết hợp đồng                          ADM-13
    ├── contracts/:id/terminate Thanh lý hợp đồng                        ADM-14
    ├── meter-readings        Ghi chỉ số điện nước                       ADM-15
    ├── invoices              Hóa đơn                                    ADM-16
    ├── invoices/:id          Chi tiết hóa đơn                           ADM-17
    ├── payments              Duyệt thanh toán                           ADM-18
    ├── debts                 Công nợ [ĐỀ XUẤT UI]                      ADM-19
    ├── maintenance-requests  Yêu cầu sửa chữa                           ADM-20
    ├── maintenance-requests/:id Chi tiết yêu cầu sửa chữa               ADM-21
    ├── viewing-appointments  Lịch xem phòng                             ADM-22
    ├── settings              Cài đặt                                    ADM-23
    ├── notifications         Thông báo                                  ADM-24
    └── profile               Hồ sơ cá nhân                              ADM-25

Staff
└── /staff
    ├── maintenance-requests      Việc được giao — Technician            STF-01
    ├── maintenance-requests/:id  Chi tiết việc — Technician             STF-02
    ├── appointments              Lịch xem phòng hôm nay — Guard         STF-03
    ├── notifications             Thông báo                              STF-04
    └── profile                   Hồ sơ cá nhân                          STF-05

Hệ thống
├── (tại route bị chặn)       Không có quyền 403                         SYS-01
├── *                         Không tìm thấy 404                         SYS-02
└── (error boundary)          Lỗi hệ thống / lỗi route                   SYS-03
```

## 3. Tổng hợp trạng thái (18/10/2026)

"Có giao diện" = route mở được trong `frontend/`, dùng **dữ liệu giả**. Chưa màn hình nào gọi API nghiệp vụ thật.

| Khu vực | Màn hình | [MVP] | [ĐỀ XUẤT UI] | Có giao diện (giả lập) | Còn thiếu |
|---|---:|---:|---:|---:|---:|
| Public + tài khoản khách | 8 | 6 | 2 | 8 | 0 |
| Cư dân | 10 | 10 | 0 | 0 | 10 |
| Quản trị viên | 25 | 24 | 1 | 17 | 8 |
| Nhân viên (sửa chữa + bảo vệ) | 5 | 5 | 0 | 0 | 5 |
| Hệ thống | 3 | 3 | 0 | 2 | 1 |
| **Tổng** | **51** | **48** | **3** | **27** | **24** |

Theo nhãn: [MVP] có giao diện **25/48**; [ĐỀ XUẤT UI] có giao diện **2/3** (ACC-01, ACC-02; ADM-19 chưa có).

## 4. Chi tiết theo màn hình

| ID | Route trong `frontend/` | Trạng thái | Ghi chú |
|---|---|---|---|
| PUB-01 | `/` | Có giao diện | Lọc nhanh, phòng nổi bật |
| PUB-02 | `/rooms` | Có giao diện | Tìm kiếm, lọc |
| PUB-03 | `/rooms/:roomId` | Có giao diện | Gallery + lightbox, form đặt lịch (chỉ báo thành công giả) |
| PUB-04 | `/contact` | Có giao diện | |
| PUB-05 | `/login` | Có giao diện | Chưa đăng nhập thật; nút vào nhanh theo vai trò là công cụ demo |
| PUB-06 | `/register` | Có giao diện | Chưa tạo tài khoản thật |
| ACC-01 | `/account/appointments` | Có giao diện | [ĐỀ XUẤT UI] — chờ Q2 |
| ACC-02 | `/account/profile` | Có giao diện | [ĐỀ XUẤT UI] — chờ Q2 |
| RES-01..RES-10 | — | **Chưa có** | `ResidentLayout` có sẵn, chưa gắn route |
| ADM-01 | `/admin` | Có giao diện | Số liệu tổng hợp tự cộng trong mock (`[MOCK-TIỀN]`) |
| ADM-02, ADM-03 | `/admin/buildings`, `/admin/buildings/:buildingId` | Có giao diện | |
| ADM-04, ADM-05 | `/admin/rooms`, `/admin/rooms/:roomId` | Có giao diện | |
| ADM-06 | `/admin/amenities` | Có giao diện | |
| ADM-07 | `/admin/services` | Có giao diện | |
| ADM-08 | `/admin/utility-prices` | Có giao diện | |
| ADM-09, ADM-10 | `/admin/users`, `/admin/users/:userId` | Có giao diện | |
| ADM-11 | `/admin/contracts` | Có giao diện | |
| ADM-12 | `/admin/contracts/new` | Có giao diện (một phần) | Wizard lập mới có; **route sửa nháp `/admin/contracts/:contractId/edit` chưa có**. Bước bồi thường/miễn trừ minh họa phương án chờ P4, P5 |
| ADM-13 | `/admin/contracts/:contractId` | Có giao diện | |
| ADM-14 | `/admin/contracts/:contractId/terminate` | Có giao diện | Banner "chờ duyệt P1–P12"; phí trước hạn tính trong mock (`[MOCK-TIỀN]`) |
| ADM-15 | `/admin/meter-readings` | Có giao diện | |
| ADM-16, ADM-17 | `/admin/invoices`, `/admin/invoices/:invoiceId` | Có giao diện | Phát hành/hủy theo DB-D27 trên mock state |
| ADM-18 | — | **Chưa có** | Menu hiển thị mờ "Chưa có" |
| ADM-19 | — | **Chưa có** | [ĐỀ XUẤT UI] — chờ Q12 |
| ADM-20..ADM-25 | — | **Chưa có** | Sửa chữa, lịch xem phòng, cài đặt, thông báo, hồ sơ |
| STF-01..STF-05 | — | **Chưa có** | `StaffLayout` có sẵn, chưa gắn route |
| SYS-01 | — | **Chưa có** | Cần khi có đăng nhập + phân quyền |
| SYS-02 | `*` | Có giao diện | `NotFoundPage` (Antigravity) |
| SYS-03 | error boundary | Có giao diện | `RouteErrorPage` (giữ từ bản cũ, chưa theo phong cách Antigravity) |

**Route ngoài danh mục:** `/rooms/:roomId/book` và `/book` (trang đặt lịch riêng do Antigravity thêm). Theo Brief, đặt lịch nằm trong PUB-03; hai route này không tính là màn hình — cần chủ dự án quyết định giữ hay bỏ.

## 5. Phân quyền dự kiến (khi có đăng nhập thật)

| Khu vực | Ghi chú |
|---|---|
| Public và tài khoản khách | Hai trang `/account` là đề xuất UI, chỉ đọc lịch hẹn và sửa hồ sơ |
| Cư dân | Không hiển thị CCCD; chỉ tạo yêu cầu sửa chữa khi còn hợp đồng hiệu lực |
| Quản trị viên | Gồm wizard lập/thanh lý hợp đồng và trang Công nợ đề xuất |
| Nhân viên | Technician chỉ xử lý việc được giao; Guard chỉ check-in/check-out lịch đã xác nhận hôm nay |

Các nội dung phụ thuộc P1–P9, P11–P12 được gắn nhãn **Chờ duyệt** trong giao diện. Giao diện không tự quyết định các cấu trúc lưu còn mở, không triển khai gia hạn hợp đồng, hóa đơn điều chỉnh, cổng thanh toán, email/SMS hay xuất file.

## 6. Luồng bấm thử được trong `frontend/` (dữ liệu giả, F5 là mất)

- Lọc và tìm phòng; mở chi tiết; xem ảnh (lightbox); gửi form đặt lịch.
- Chuyển vai trò demo (Khách, Khách đã đăng ký, Quản trị viên) bằng nút "Vai trò" ở header Admin hoặc nút vào nhanh ở `/login`. Cư dân, Kỹ thuật viên, Bảo vệ hiển thị mờ vì chưa có màn hình.
- Tìm kiếm, lọc tab và mở form/modal trên các trang danh sách Admin.
- Wizard lập hợp đồng và wizard thanh lý (chỉ minh họa; các bước chờ P1–P12 có nhãn).
- Ghi chỉ số điện nước; phát hành/hủy hóa đơn (chặn hủy khi có thanh toán theo DB-D27).

**Chưa có trong `frontend/`:** gửi minh chứng thanh toán, duyệt thanh toán, yêu cầu sửa chữa, luồng Technician/Guard — các luồng này từng được mô tả cho bản prototype cũ nhưng không có trong ứng dụng chính thức.
