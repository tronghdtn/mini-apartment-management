# Screen Inventory — danh mục màn hình và trạng thái

> **LEASE-A/CTR mới24/10:** ADM11/12/13 đọc và CRUDnháp đã nối API, route sửa nháp dùng lại ADM12. Backend963/7930, frontend58, browser12/12 +liveAPI12/12 DBtest PASS. Chưa kích hoạt/dịch vụ/điều khoản/thanh lý; ADM14 vẫn mock có nhãn, không dẫn từ trangthật. Plan§12.13/học tập§11.21; kiểm thử Admin dev còn chờ phiên người dùng.

> **USR-C/D mới 24/10/2026:** ADM-09/10 có API đọc/cấp nhân viên/khóa-mở khôngAdmin/sửa duy nhất họ tên, giữ Antigravity. Backend867/6970, frontend52, browser13status+12họ tên/hồi quy DBtest PASS. Các nhóm trước là lịch sử; Dev không ghi/migration mới/chưaAdmin. Plan§12.10–11, học tập§11.19–20.

> **Mốc Group2 trước USR23/10/2026:** Schema dev20bảng/16migrations đã áp dụng riêng; APIgán tiện nghi đã test650/4667 toàn Backend, frontend32testPASS. Panel đã ghép theo CAT-D02 (hiện nhãn Đã lưu trữ); browser mới 14/14 ca PASS trên DB test cô lập. Dev chưa Admin/seeder/CRUDquảntrị.

> **Mốc CAT-B trước đó23/10/2026:** ADM-07/08 đã nối API thật; 12/12 ca browser DB test cô lập PASS. Settings chỉ có API đọc8key/lưu2key số ngày đã duyệt1–365; chưa màn hình. Dev không migration/seed mới. Xem Plan§12.4–12.6, học tập§11.14.

> **Mốc CAT/ROOM trước đó 23/10/2026:** ADM-02/03/04/05/06 đã nối API thật, 16/16 ca browser trên DB test cô lập PASS; Phòng trên dev chưa có schema, không dữ liệu giả thay thế. Dịch vụ/settings/giá và các nghiệp vụ khác chưa nối. Plan §12 và học tập §11.13 quản lý bằng chứng mới.

> **Đối chiếu Auth 22/10/2026 — Bước 4 (lịch sử):** PUB-05/06 và ACC-02 đã dùng 4 API thật, guard và 17 ca Chrome/Nginx trên DB test cô lập đạt. AUTH-D01/D02/D03 CONFIRMED: auto-login user, tài khoản tối thiểu cho Resident/Staff, profile chỉ đọc; ACC-01 hiện thông báo chưa triển khai. Các trang nghiệp vụ Admin/public còn mock có nhãn; đã kiểm thử bộ Docker dev 8080: 7 ca PASS (Plan §10). [Plan](IMPLEMENTATION_PLAN.md) quản lý Tasks; số đếm UI 18/10 bên dưới là baseline, không phải tiến độ chức năng.

| Thuộc tính | Giá trị |
|---|---|
| Cập nhật | 23/10/2026 — cập nhật Auth + CAT/ROOM cơ bản; kiểm kê UI baseline 18/10 theo code `frontend/src/app/router.tsx` |
| Căn cứ | `docs/FRONTEND_DESIGN_BRIEF.md` v1.0 §5 (danh sách màn hình), quyết định CONFIRMED 14/10/2026 |
| Ứng dụng | `frontend/` — giao diện Antigravity chính thức. Auth và 9 trang CAT/ROOM/USR dùng API thật; nghiệp vụ khác còn `src/mocks/` có nhãn minh họa |

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

Bảng này là **baseline UI 18/10**, không tính lại cho Bước 4. Khi đó giao diện dùng dữ liệu giả; hiện trạng Auth/guard403 đã cập nhật ở đầu tài liệu và §4. Trạng thái CAT/ROOM mới đã ghi riêng ở đầu tài liệu và các dòng dưới.

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
| PUB-05 | `/login` | Đã tích hợp Auth trên DB test | Email/SĐT, lỗi thật; đã bỏ nút vào nhanh/demo |
| PUB-06 | `/register` | Đã tích hợp Auth trên DB test | Email tùy chọn, user/active, auto-login được duyệt |
| ACC-01 | `/account/appointments` | Trang thông báo chưa triển khai | Có guard; không lịch cá nhân mock hoặc thao tác lưu giả; API lịch hẹn chưa làm |
| ACC-02 | `/account/profile` | Đã tích hợp đọc me trên DB test | Cả 5 vai trò, chỉ đọc; Resident/Staff có thông báo khu chưa hoàn thiện; không tự sửa SĐT |
| RES-01..RES-10 | — | **Chưa có** | `ResidentLayout` có sẵn, chưa gắn route |
| ADM-01 | `/admin` | Có giao diện | Số liệu tổng hợp tự cộng trong mock (`[MOCK-TIỀN]`) |
| ADM-02, ADM-03 | `/admin/buildings`, `/admin/buildings/:buildingId` | Đã tích hợp cơ bản trên DB test | Tạo/xem/sửa thật; chưa status/xóa/gán tiện nghi/sơ đồ phòng |
| ADM-04, ADM-05 | `/admin/rooms`, `/admin/rooms/:roomId` | Đã tích hợp cơ bản trên DB test | Lọc/tạo/xem/sửa thật; chưa status/chuyển tòa/xóa/ảnh/public API; dev đã có schema, chưa AdminCRUD |
| ADM-06 | `/admin/amenities` | Đã tích hợp trên DB test | Tạo/sửa/soft archive thật, giữ UNIQUE tên; chưa gán/khôi phục |
| ADM-07 | `/admin/services` | Đã tích hợp trên DB test | Tạo/sửa danh mục thật; chỉ3kiểu thường, metered giá qua bảng giá; chưa status/xóa/đổi kiểu |
| ADM-08 | `/admin/utility-prices` | Đã tích hợp trên DB test | Lịch sử/lọc/thêm giá ngày01 và D33; chưa sửa/xóa; dev đã có utility_prices, ghi giá cần meter_readingsNhóm3 |
| ADM-09, ADM-10 | `/admin/users`, `/admin/users/:userId` | API thật đọc/cấp/status/họ tên; browserstatus13+họ tên12 DBtest | List/filter/search/pagination/detail; cấp technician/guard, khóa/mở khôngAdmin, sửa full_name. SĐT/email/password/role/pháp lý chỉđọc; không mock/fallback, Plan§12.10–11 |
| ADM-11 | `/admin/contracts` | API thật, đã tích hợp DBtest | Danh sách/tìm/lọc/phântrang; chưa nghiệp vụ kích hoạt |
| ADM-12 | `/admin/contracts/new`, `/admin/contracts/:contractId/edit` | API nháp thật, đã tích hợp DBtest | Wizard3bước cơ bản; chưa dịch vụ/P4/P5/kích hoạt, không lưu giả |
| ADM-13 | `/admin/contracts/:contractId` | API thật, đã tích hợp DBtest | Đọc đúngID/404; sửa/xóa mềm nháp, trạng thái khác chỉ đọc; chưa Thanh lý |
| ADM-14 | `/admin/contracts/:contractId/terminate` | Có giao diện | Banner "chờ duyệt P1–P12"; phí trước hạn tính trong mock (`[MOCK-TIỀN]`) |
| ADM-15 | `/admin/meter-readings` | Có giao diện | |
| ADM-16, ADM-17 | `/admin/invoices`, `/admin/invoices/:invoiceId` | Có giao diện | Phát hành/hủy theo DB-D27 trên mock state |
| ADM-18 | — | **Chưa có** | Menu hiển thị mờ "Chưa có" |
| ADM-19 | — | **Chưa có** | [ĐỀ XUẤT UI] — chờ Q12 |
| ADM-20..ADM-25 | — | **Chưa có** | Sửa chữa, lịch xem phòng, cài đặt, thông báo, hồ sơ |
| STF-01..STF-05 | — | **Chưa có** | `StaffLayout` có sẵn, chưa gắn route |
| SYS-01 | — | Có thông báo 403 trong guard | Không thêm route/màn hình riêng; Laravel vẫn kiểm tra quyền API |
| SYS-02 | `*` | Có giao diện | `NotFoundPage` (Antigravity) |
| SYS-03 | error boundary | Có giao diện | `RouteErrorPage` (giữ từ bản cũ, chưa theo phong cách Antigravity) |

**Route ngoài danh mục:** `/rooms/:roomId/book` và `/book` (trang đặt lịch riêng do Antigravity thêm). Theo Brief, đặt lịch nằm trong PUB-03; hai route này không tính là màn hình — cần chủ dự án quyết định giữ hay bỏ.

## 5. Phân quyền và ranh giới tích hợp

| Khu vực | Ghi chú |
|---|---|
| Public và tài khoản khách | ACC-02 đã đọc me theo D03, không sửa/lưu giả. ACC-01 chờ API lịch hẹn; Resident/Staff tạm dùng ACC-02 theo D02 |
| Cư dân | Không hiển thị CCCD; chỉ tạo yêu cầu sửa chữa khi còn hợp đồng hiệu lực |
| Quản trị viên | Gồm wizard lập/thanh lý hợp đồng và trang Công nợ đề xuất |
| Nhân viên | Technician chỉ xử lý việc được giao; Guard chỉ check-in/check-out lịch đã xác nhận hôm nay |

Các nội dung phụ thuộc P1–P9, P11–P12 được gắn nhãn **Chờ duyệt** trong giao diện. Giao diện không tự quyết định các cấu trúc lưu còn mở, không triển khai gia hạn hợp đồng, hóa đơn điều chỉnh, cổng thanh toán, email/SMS hay xuất file.

## 6. Luồng hiện có và dữ liệu còn giả

Auth dùng session thật và F5 khôi phục từ me. Ngoại trừ 5 trang CAT/ROOM đã ghi rõ ở trên (bền qua F5), các thao tác nghiệp vụ minh họa dưới đây vẫn chỉ ở bộ nhớ, F5 mất thay đổi; không phải API đã hoàn thành.

- Lọc và tìm phòng; mở chi tiết; xem ảnh (lightbox); gửi form đặt lịch.
- Auth đã thật: đăng nhập/đăng ký, F5, logout và quyền theo tài khoản từ Laravel. Đã gỡ chuyển vai trò/quick-entry khỏi luồng đang chạy. Resident/Staff xem tài khoản tối thiểu, không dashboard giả.
- Tìm kiếm, lọc tab và mở form/modal trên các trang danh sách Admin.
- Wizard lập hợp đồng và wizard thanh lý (chỉ minh họa; các bước chờ P1–P12 có nhãn).
- Ghi chỉ số điện nước; phát hành/hủy hóa đơn (chặn hủy khi có thanh toán theo DB-D27).

**Chưa có trong `frontend/`:** gửi minh chứng thanh toán, duyệt thanh toán, yêu cầu sửa chữa, luồng Technician/Guard — các luồng này từng được mô tả cho bản prototype cũ nhưng không có trong ứng dụng chính thức.
