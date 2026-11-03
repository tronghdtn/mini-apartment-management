# Screen Inventory — danh mục màn hình và trạng thái

> **Cập nhật CLOSE-02e 30–31/10/2026:** số đếm52nguồn/49API theo phạm vi/4UIđủ/48một phần không đổi. ADM-14 đã nối đối soát cọc/chặn pending/terminate/trả phòng trên DB test, kế tiếp final draft/issue/reissue. Đã kiểm tra cookie/F5, stale409, double-click, mobile, mất kết nối Nginx test/phục hồi và upload ảnh kiểm kê/bồi thường/miễn phí bằng filechooser. Cọc dư là nghĩa vụ còn phải hoàn (DB-D78), không báo đã chi hoàn. DB-D79 đã code/test: mọi invoice sau thanh lý không hủy trực tiếp; chi tiết invoice Admin có cảnh báo và ẩn Hủy, paid_amount ghi Đã thanh toán. Chốt1375/13256/Pint336;114frontend/build/lintPASS (9cảnhbáocũ),36HTTP/13browser/6raceprocess+2raceHTTP. Chưa nghiệm thu dev hoặc toàn bộ wizard/UI; Plan§12.40. Tình trạng browser bị tắt của lượt cũ là lịch sử.

> **PAY cập nhật 30/10:** ADM-18 đã nối API payments và thanh toán minh chứng/thực nhận; RES-05 có form/history; ADM-19 Q12 đã có API và trang Công nợ theo hợp đồng, chưa nghiệm thu trực quan; online provider chưa xác nhận. Plan§12.30–31.

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
| RES-01, RES-04..RES-10 | — | Chưa tích hợp đầy đủ | Các màn còn lại chưa triển khai API nghiệp vụ hoặc chỉ có panel/thông báo một phần; xem bảng Antigravity dưới đây |
| RES-02 | `/resident/contracts` | Đã nối API thật, test DB cô lập | Danh sách chỉ hợp đồng active/terminated/expired của chính người thuê; không hiện draft, có lọc/phân trang; UI vẫn thiếu một phần so với màn nguồn |
| RES-03 | `/resident/contracts/:contractId` | Đã nối API thật, test DB cô lập | Tab tổng quan/điều khoản/dịch vụ; snapshot hợp đồng và cọc; hiện kết quả/ghi chú/ảnh kiểm tra và hóa đơn final nếu Backend đã lưu; không lộ liên hệ riêng |
| ADM-01 | `/admin` | Bốn thẻ API thật, DBtest§12.46 | DB-D82; không mock/tự tính tiền. Bảng/danh sách bên dưới chưa nối, không coi là Dashboard đầy đủ. |
| ADM-02, ADM-03 | `/admin/buildings`, `/admin/buildings/:buildingId` | Đã tích hợp cơ bản trên DB test | Tạo/xem/sửa thật; chưa status/xóa/gán tiện nghi/sơ đồ phòng |
| ADM-04, ADM-05 | `/admin/rooms`, `/admin/rooms/:roomId` | Đã tích hợp cơ bản trên DB test | Lọc/tạo/xem/sửa thật; chưa status/chuyển tòa/xóa/ảnh/public API; dev đã có schema, chưa AdminCRUD |
| ADM-06 | `/admin/amenities` | Đã tích hợp trên DB test | Tạo/sửa/soft archive thật, giữ UNIQUE tên; chưa gán/khôi phục |
| ADM-07 | `/admin/services` | Đã tích hợp trên DB test | Tạo/sửa danh mục thật; chỉ3kiểu thường, metered giá qua bảng giá; chưa status/xóa/đổi kiểu |
| ADM-08 | `/admin/utility-prices` | Đã tích hợp trên DB test | Lịch sử/lọc/thêm giá ngày01 và D33; chưa sửa/xóa; dev đã có utility_prices, ghi giá cần meter_readingsNhóm3 |
| ADM-09, ADM-10 | `/admin/users`, `/admin/users/:userId` | API thật đọc/cấp/status/họ tên; browserstatus13+họ tên12 DBtest | List/filter/search/pagination/detail; cấp technician/guard, khóa/mở khôngAdmin, sửa full_name. SĐT/email/password/role/pháp lý chỉđọc; không mock/fallback, Plan§12.10–11 |
| ADM-11 | `/admin/contracts` | API thật, giao diện CTR-UI đã kiểm browser DBtest 01/11 | Tab trạng thái + tìm kiếm giữ trên URL/F5, cảnh báo quá ngày cuối (không phải status mới), thẻ mobile/bảng desktop, rỗng/lỗi/URL sai. CTR-API 02/11: thêm tab Sắp hết hạn/Quá hạn trả phòng và số đếm từ `meta.counts` của API, đã kiểm browser DBtest |
| ADM-12 | `/admin/contracts/new`, `/admin/contracts/:contractId/edit` | API nháp thật, giao diện CTR-UI đã kiểm browser DBtest 01/11 | Form 3 bước + tóm tắt giá trị đang nhập; khối quy trình chỉ đúng nơi xử lý thật (dịch vụ/điều khoản/cọc/kích hoạt ở chi tiết, bàn giao sau hiệu lực); bỏ câu lỗi thời “Thanh lý chưa tích hợp”. Người ở cùng quản lý tại tab chi tiết bản nháp theo DB-D84/Plan§12.50 |
| ADM-13 | `/admin/contracts/:contractId` | API thật, giao diện CTR-UI đã kiểm browser DBtest 01/11 | Header theo trạng thái, checklist chuẩn bị kích hoạt từ dữ liệu đã lưu, tab giữ trên URL; tab Hóa đơn dùng GET /invoices?contract_id; liên kết Bàn giao/Kết quả thanh lý. CTR-API 02/11: thay dịch vụ hợp đồng hiệu lực (modal, áp dụng 01 tháng sau) đã nối API, kiểm browser DBtest. Tab Người ở cùng đã duyệt D84 và nối CRUD nháp/chỉ đọc lịch sử; đã kiểm full1439/14440/Pint358 và browser§12.50 |
| ADM-14 | `/admin/contracts/:contractId/terminate` | API preview/kiểm kê/final/đối soát/terminate thật; giao diện CTR-UI đã kiểm browser DBtest 01/11 | Thứ tự 1 kiểm kê → 2 ngày bàn giao/chỉ số chốt → 3 tất toán → 4 đối soát; cột tóm tắt hợp đồng, điều khoản đã ký và tiến trình đọc từ dữ liệu; không tính phí ở React. Chi hoàn cọc ngoài hệ thống chưa có xác nhận |
| ADM-15 | `/admin/meter-readings` | Có giao diện | |
| ADM-16, ADM-17 | `/admin/invoices`, `/admin/invoices/:invoiceId` | Có giao diện | Phát hành/hủy theo DB-D27 trên mock state |
| ADM-18 | P/admin/AdminPaymentsPage.tsx | F/admin/AdminPaymentsPage.tsx + features/payments/PaymentsWorkspace.tsx | Một phần; danh sách/lọc/đối soát API thật, chưa đầy đủ mọi khối nguồn | Có: list/detail/proof/submit/confirm/reject | Không trên luồng đang chạy | Admin xem khoản chờ/đã xác nhận/từ chối, ảnh private, nhận thực tế và sinh RCP; Desktop browser đã kiểm. Chưa browser Mobile; provider online không có. Plan§12.30. |
| ADM-19 | P/admin/AdminDebtsPage.tsx | F/admin/AdminDebtsPage.tsx | Chưa; hiện là UnavailableWorkspace | Chưa | Không trên luồng đang chạy | Q12 đã duyệt trang riêng gom hóa đơn còn nợ theo người/hợp đồng, kể cả đã thanh lý; chưa có API tổng hợp hoặc UI thật. |
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

## 7. Cách đếm và tiêu chí đối chiếu mới — 27/10

Nguồn duy nhất của đợt UI này là `ui-antigravity-full/src/`, baseline hash tất cả78file nguồn và120file frontend ở `backups/antigravity-integration-20261027/source-before.json` (ignored); Git main8b52ec5, một worktree. Không thay prototype hoặc commit toàn bộ thư mục nguồn. Ba lượt đọc độc lập bao phủ Public, Admin, Resident/Staff; root đối chiếu thành phần dùng chung và kiểm tra browser riêng.

**52 màn hình theo file nguồn** =26Admin +10Resident +5Staff +9Public/Guest (kể cả Booking) +2hệ thống. Không đếm StaffProfile/Notifications hai lần vì dùng chung Technician/Guard. Inventory51 ID cũ =52 trừ Booking/Residents mới cộng SYS03 chỉ có ở frontend; đây là hai mẫu số khác nhau. Các modal/wizard/tab không thêm màn hình. Bảng§8 có đúng52 dòng; SYS03 ghi riêng ngoài mẫu số.

UI **đủ** chỉ khi đã đưa cấu trúc/thành phần mới vào đường dẫn chính thức, điều chỉnh nghiệp vụ đúng, kiểm tra desktop/mobile/điều hướng/trạng thái; tồn tại file, ảnh đẹp hay buildPASS không đủ. API **có** nghĩa dữ liệu/thao tác được nêu thực sự dùng endpoint hiện có; không suy mọi tính năng prototype đã chạy. Bảng ghi riêng phạm vi API và phần thiếu. API chưa có phải hiện trạng thái chưa kết nối, không giả tập rỗng/số0, không toast thành công, không fallback người đầu tiên.

Baseline:28file có ánh xạ,24thiếu;19màn dùng API dữ liệu chính (13Admin +6Public),6màn còn mock reachable (5Admin +Contact),27màn còn lại chưa có API hoặc không cần API. Chưa nghiệm thu UI mới đợt này; không nâng số UI đủ từ28file có sẵn. Header/footer/token đã cùng họ sky/teal, nhưng Admin sidebar tối và Staff header tối/amber là bản cũ; Resident còn emerald. Font nguồn và chính thức giống nhau. Public nav có lỗi640–767px không menu ở cả hai bản, cần sửa thay vì sao chép lỗi.

## 8. Đối chiếu toàn bộ52 màn hình — cập nhật MAINT 30/10

Đường dẫn đầy đủ: **P/** = ui-antigravity-full/src/pages/; **F/** = frontend/src/pages/. Bảng giữ 52 màn nguồn duy nhất, loại hai dòng ADM-18/19 alias lặp ở đầu bảng khi đếm. Cột UI vẫn là Một phần nếu thiếu thành phần nguồn hoặc chưa kiểm tra trực quan. Trạng thái API/mock cập nhật đến MAINT 30/10; API Có chỉ áp dụng phạm vi ghi rõ.

| Màn hình | File Antigravity | File chính thức | UI mới | API thật | Mock còn lại | UI thiếu/khác hoặc điều chỉnh bắt buộc |
|---|---|---|---|---|---|---|
| Trang chủ | P/HomePage.tsx | F/public/HomePage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: rooms/options | Không trên luồng đang chạy | Đã đưa đủ7khối, hero gradient/glass,6phòng API, tòa theo building_id và CTA. Ảnh RoomCard đã nối DB-D83; giá dịch vụ/booking theo lát cắt riêng; không phục hồi giá/hotline/cam kết mẫu. |
| Tìm phòng | P/RoomListPage.tsx | F/public/RoomListPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: list/filter/page | Không trên luồng đang chạy | Ảnh bìa API DB-D83. Sửa dropdown tòa giữ lựa chọn URL khi options tải xong; skin filter/icon/chip/header còn thiếu. Giữ query/validation thật. |
| Chi tiết phòng | P/RoomDetailPage.tsx | F/public/RoomDetailPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: roomID | Không trên luồng đang chạy | Metrics4ô/breadcrumb/mobileCTA; Gallery ảnh API thật DB-D83; phí/lịch chỉ theo nguồn đã tích hợp, không giả |
| Đặt lịch riêng | P/BookingPage.tsx | F/public/BookingPage.tsx | Một phần; form thật theo nguồn | Có: room detail + appointment store | Không trên luồng đang chạy | RHF/Zod/CSRF, ngày giờ VN, gửi pending và đọc lịch riêng; /book chọn phòng qua danh sách thật. Chưa dropdown toàn bộ phòng/cam kết của nguồn. Plan§12.34. |
| Liên hệ | P/ContactPage.tsx | F/public/ContactPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: public rooms/filters, tên tòa có phòng công khai | Không trên luồng đang chạy | Card liên hệ/FAQ đã bỏ mẫu; tòa lấy API. Chưa có nguồn hotline/email/giờ/ảnh nên không công bố giả. |
| Đăng nhập | P/public/LoginPage.tsx | F/public/LoginPage.tsx | Đủ UI trong phạm vi đã điều chỉnh nghiệp vụ | Có: login/me/session | Không trên luồng đang chạy | Giữ thiết kế nguồn, bỏ quick-role/demo; cookie/CSRF/validation thật. |
| Đăng ký | P/public/RegisterPage.tsx | F/public/RegisterPage.tsx | Đủ UI trong phạm vi đã điều chỉnh nghiệp vụ | Có: register/auto-login | Không trên luồng đang chạy | Giữ form nguồn; email tùy chọn đúng nghiệp vụ, không tạo tài khoản khi form không hợp lệ. |
| Lịch hẹn khách | P/public/GuestAppointmentsPage.tsx | F/public/GuestAppointmentsPage.tsx | Một phần; lịch hẹn và thông báo riêng | Có: own appointment list/cancel + own notifications/read/read-all | Không trên luồng đang chạy | Giữ scope lịch đã có§12.34; thông báo/prefix/mobilemenu/F5/link đã thử§12.45, không ghi đè status lịch. Chưa thẻ chi tiết đầy đủ nguồn. |
| Tài khoản khách | P/public/GuestProfilePage.tsx | F/public/GuestProfilePage.tsx | PROFILE-A đã tích hợp DBtest; browser Admin đã kiểm | Có: me/profile/password, tự sửa tên/đổi mật khẩu DB-D88 | Không trên luồng đang chạy | Dùng AccountProfile chung, giữ email/SĐT/role/pháp lý; đổi mật khẩu thu hồi mọi phiên. Frontend146/build/lint đạt; HTTP đổi mật khẩu/thu hồi phiên đạt, browser Admin tên/F5/mobile375 đạt; chưa browser đổi mật khẩu/4role khác/Admin thậtdev. Plan§12.59, không coi toàn hồ sơ/email đã xong. |
| Không quyền403 | P/ForbiddenPage.tsx | F/ForbiddenPage.tsx | Đủ UI trong phạm vi đã điều chỉnh nghiệp vụ | Guard thật | Không trên luồng đang chạy | Card nguồn, role đọc từ me; nút quay lại/trang chủ/hồ sơ đúng quyền. |
| Không tìm thấy404 | P/NotFoundPage.tsx | F/NotFoundPage.tsx | Đủ UI trong phạm vi đã điều chỉnh nghiệp vụ | Không cần | Không trên luồng đang chạy | Giữ card nguồn và links về trang chủ/tìm phòng. |
| Admin tổng quan | P/admin/AdminDashboardPage.tsx | F/admin/AdminDashboardPage.tsx | Một phần; bốn thẻ đã nghiệm thu DBtest | Có: GET dashboard,4thẻ DB-D82 | Không trên luồng đang chạy | Có số thật/0thật/loading/error503/retry/F5/mobile390/tổng VND lớn; bảng/danh sách bên dưới vẫn ghi chưa nối. Không thêm màn hoặc coi toàn Dashboard hoàn tất. |
| Tòa nhà | P/admin/AdminBuildingsPage.tsx | F/admin/AdminBuildingsPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: CRUD cơ bản | Không trên luồng đang chạy | Card mới/stats/phòng/liên hệ; không tạo dữ liệu chưa có |
| Chi tiết tòa | P/admin/AdminBuildingDetailPage.tsx | F/admin/AdminBuildingDetailPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: info/amenities/rooms/giá theo tòa | Không trên luồng đang chạy | Tab giá lịch sử phân trang/link scope đã tích hợp DB test U1; chưa toàn bộ skin/khối nguồn. Plan§12.25. |
| Phòng | P/admin/AdminRoomsPage.tsx | F/admin/AdminRoomsPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: list/create | Không trên luồng đang chạy | Tabs/status/tenant/CTA; giữ giới hạn thao tác API |
| Chi tiết phòngAdmin | P/admin/AdminRoomDetailPage.tsx | F/admin/AdminRoomDetailPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: info/edit/amenities/maintenance list theo room_id | Không trên luồng đang chạy | Tab sửa chữa đọc danh sách thật theo phòng và mở đúng detail; ảnh, sidebar, điện nước, lịch còn thiếu hoặc chưa API. |
| Tiện nghi | P/admin/AdminAmenitiesPage.tsx | F/admin/AdminAmenitiesPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: list/create/edit/archive | Không trên luồng đang chạy | Không khôi phục category không có schema; giữ gán tiện nghi thật |
| Dịch vụ | P/admin/AdminServicesPage.tsx | F/admin/AdminServicesPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: list/create/edit | Không trên luồng đang chạy | Metered intro/panel/table; không giá meter trực tiếp hoặc loại free |
| Giá điện nước | P/admin/AdminUtilityPricesPage.tsx | F/admin/AdminUtilityPricesPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: lịch sử/lọc/thêm theo tòa | Không trên luồng đang chạy | U1 DB test: URL/form/tòa/dịch vụ/giá/F5/Desktop/Mobile thật; chưa thẻ giá hiện hành từ Backend, không lấy dòng đầu hoặc giá mẫu. Dev thiếu ALTER nên503. Plan§12.25. |
| Tài khoảnAdmin | P/admin/AdminUsersPage.tsx | F/admin/AdminUsersPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: filters/createStaff | Không trên luồng đang chạy | Giữ API/RHF hiện có, title/skin mới; tabs/summary nguồn còn thiếu. |
| Chi tiết tài khoản | P/admin/AdminUserDetailPage.tsx | F/admin/AdminUserDetailPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: read/name/status | Không trên luồng đang chạy | Summary/history chưa API; giữ cấm sửa role/SĐT/pháp lý |
| Hợp đồngAdmin | P/admin/AdminContractsPage.tsx | F/admin/AdminContractsPage.tsx | Đủ theo phạm vi API hiện có (CTR-UI 01/11) | Có: list/filter/search/page | Không trên luồng đang chạy | Tab trạng thái/tìm kiếm trên URL, cảnh báo quá ngày cuối; tab Sắp hết hạn/Quá hạn trả phòng và số đếm từ API (CTR-API 02/11). Plan§12.48–12.49 |
| Tạo/sửa nháp | P/admin/AdminContractNewPage.tsx | F/admin/AdminContractNewPage.tsx | Một phần (CTR-UI 01/11) | Có: draftCRUD/options | Không trên luồng đang chạy | Giữ 3 bước + tóm tắt; 8 bước nguồn được ánh xạ sang nơi xử lý thật thay vì wizard giả. Người ở cùng có tab quản lý riêng sau lưu nháp (D84), không ép wizard8bước. Plan§12.48/50 |
| Chi tiết hợp đồng | P/admin/AdminContractDetailPage.tsx | F/admin/AdminContractDetailPage.tsx | Đủ theo phạm vi API hiện có (CTR-UI 01/11) | Có: draft/services/terms/deposit/activate/invoices | Không trên luồng đang chạy | 5 tab giữ trên URL/F5, tab Hóa đơn thật, checklist kích hoạt, header theo trạng thái; thay dịch vụ hợp đồng hiệu lực từ tháng sau (CTR-API 02/11). Người ở cùng D84 đã nối API draftCRUD/readonly lịch sử; đã kiểm full/browser§12.50. Plan§12.48–12.50 |
| Thanh lý | P/admin/AdminContractTerminatePage.tsx | F/admin/AdminContractTerminatePage.tsx | Một phần; lõi bàn giao/đối soát/trả phòng đã tích hợp DBtest | Có: closure-preview/final-meter-preview/inspection/private attachment/final-invoice/settlement-preview/terminate, issue qua invoices | Không trên luồng đang chạy | Cọc theo hạn nợ, pending chặn, snapshot cũ409, giữ nợ/role, đọc kết quả/F5; cọc dư chưa xác nhận chi hoàn. Browser đã upload kiểm kê/damage/waiver, thử mất kết nối Nginx test/phục hồi, double-click và mobile. Bố cục CTR-UI 01/11: tóm tắt/điều khoản/tiến trình, đánh số bước theo phụ thuộc. Chưa xác nhận chi hoàn cọc hoặc dev. Plan§12.39–40, §12.48. |
| Chỉ số điện nước | P/admin/AdminMeterReadingsPage.tsx | F/admin/AdminMeterReadingsPage.tsx | Một phần; còn KPI/preview toàn bộ nguồn | Có: meter-readings/context, submissions và approve/reject/photo | Không trên luồng đang chạy | MTR nhập một/hàng loạt, lịch sử và U2 duyệt/từ chối ảnh private đã kiểm DB test/API/Desktop-Mobile. Giữ font/sidebar/tab/cards mới; chưa KPI tổng hợp hoặc thanh lý/hóa đơn. Plan§12.27–28. |
| Hóa đơnAdmin | P/admin/AdminInvoicesPage.tsx | F/admin/AdminInvoicesPage.tsx | Một phần; monthly đã nghiệm thu | Có: list/filter/create monthly | Không trên luồng đang chạy | Bảng/tab/RHF lập nháp thật, Desktop-Mobile/F5; còn KPI/tìm kiếm/khối nguồn và final. Không lấy tổng trang làm tổng hệ thống. Plan§12.29. |
| Chi tiết hóa đơnAdmin | P/admin/AdminInvoiceDetailPage.tsx | F/admin/AdminInvoiceDetailPage.tsx | Một phần; monthly và final lõi đã nghiệm thu DBtest | Có: detail/refresh/other audit/issue/cancel/reissue final | Không trên luồng đang chạy | Final sau F5/lập lại có nút issue, giữ link hóa đơn nguồn/ảnh căn cứ/ghi chú bàn giao Admin; snapshot/tổng từ Backend. Payment theo§12.30; online/print và khối UI nguồn còn thiếu. Plan§12.29/39. |
| Cài đặt | P/admin/AdminSettingsPage.tsx | F/admin/AdminSettingsPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có:8key/read,2key/write | Không trên luồng đang chạy | Đã kiểm tra3khối đánh số Desktop/Mobile và invalid0; giữ6readonly/2save độc lập. Chưa chạy lại valid-save trên bản skin cuối. |
| Lịch xemAdmin | P/admin/AdminAppointmentsPage.tsx | F/admin/AdminAppointmentsPage.tsx | Một phần; bảng/tab/modal đúng phong cách nguồn | Có: list/filter/date/page/confirm/reschedule/cancel/complete | Không trên luồng đang chạy | Đổi giờ về pending, xác nhận lại, hoàn tất sau check-out; chưa KPI/tìm kiếm/lọc tòa. Plan§12.34. |
| Công nợ | P/admin/AdminDebtsPage.tsx | F/admin/AdminDebtsPage.tsx | Một phần; đã có API và trang riêng theo Q12 | Có: GET `/api/v1/debts`; invoice list nhận `contract_id` | Không trên luồng đang chạy | Admin xem nợ theo hợp đồng, gồm hợp đồng đã thanh lý; tab quá hạn/chưa đến hạn, tìm kiếm, phân trang và mở hóa đơn. Backend tính số dư; payment pending không giảm nợ. Chưa nghiệm thu trực quan Desktop/Mobile. Plan§12.31. |
| Sửa chữaAdmin | P/admin/AdminMaintenancePage.tsx | F/admin/AdminMaintenancePage.tsx | Một phần; luồng lõi đã nghiệm thu browser DBtest | Có: GET list/filter; PATCH priority/note; POST assign/reject/reopen | Không trên luồng đang chạy | Bảng và lọc status lấy dữ liệu thật; Admin chỉnh ưu tiên/ghi chú, phân công technician active, từ chối có căn cứ hoặc mở lại. Plan §12.36/12.43. |
| Chi tiết sửa chữaAdmin | P/admin/AdminMaintenanceDetailPage.tsx | F/admin/AdminMaintenanceDetailPage.tsx | Một phần; luồng lõi đã nghiệm thu browser DBtest | Có: GET detail, assign/reject/reopen, private photo | Không trên luồng đang chạy | Contact projection và ảnh qua Policy; tiếp nhận, phân công, từ chối, mở lại; chưa chi phí/ảnh nghiệm thu. Plan §12.36/12.43. |
| Thanh toán/đối soát | P/admin/AdminPaymentsPage.tsx | F/admin/AdminPaymentsPage.tsx | Một phần; workspace thực nhận/đối soát | Có: payments list/filter/confirm/reject/private proof | Không trên luồng đang chạy | Lõi PAY đã thử Admin confirm/reject/cash/RCP và F5 trênDBtest§12.44; lỗi checkbox/lý do giữ nguyên sổ tiền. KPI/online/PDF/một số khối nguồn còn thiếu. |
| Thông báoAdmin | P/admin/AdminNotificationsPage.tsx | F/admin/AdminNotificationsPage.tsx | Một phần UI nguồn; lõi đã tích hợp/nghiệm thu DBtest | Có: own/list/unread/read/read-all | Không trên luồng đang chạy | Chuông/21notice/page2/503retry/F5/batch và timestamps đã thử§12.45; không soạn tay/broadcast/đọc hộ. |
| Hồ sơAdmin | P/admin/AdminProfilePage.tsx | F/admin/AdminProfilePage.tsx | PROFILE-A đã tích hợp DBtest; browser Admin đã kiểm | Có: me/profile/password, tự sửa tên/đổi mật khẩu DB-D88 | Không trên luồng đang chạy | Dùng AccountProfile chung, giữ email/SĐT/role/pháp lý; đổi mật khẩu thu hồi mọi phiên. Frontend146/build/lint đạt; HTTP đổi mật khẩu/thu hồi phiên đạt, browser Admin tên/F5/mobile375 đạt; chưa browser đổi mật khẩu/4role khác/Admin thậtdev. Plan§12.59, không coi toàn hồ sơ/email đã xong. |
| Cư dânAdmin | P/admin/AdminResidentsPage.tsx | F/admin/AdminResidentsPage.tsx | Một phần; chưa nghiệm thu đầy đủ | Có: users role=resident, filters/page | Không trên luồng đang chạy | Dùng màn users lọc role=resident; phân biệt vai trò với đang thuê; chưa có KPI/vehicles/history như nguồn. |
| Resident tổng quan | P/resident/ResidentOverviewPage.tsx | F/resident/ResidentOverviewPage.tsx | Lõi RES-01 đã tích hợp DB test; chưa nghiệm thu toàn hệ thống | Có: resident/overview, own requests, unread notifications và panel U2 | Không trên luồng đang chạy | Phòng/hợp đồng/cảnh báo hạn và công nợ do Backend tổng hợp; 3 yêu cầu gần đây/thông báo thật, giữ panel gửi chỉ số. Claude đã kiểm nhanh browser theo Plan§12.58; Codex chạy lại22test/351assertion và frontend143/build/lint, chưa chạy lại browser. Không còn placeholder tổng quan; không tăng số màn nguồn52. |
| Resident hợp đồng | P/resident/ResidentContractsPage.tsx | F/resident/ResidentContractsPage.tsx | Một phần; cards/tab thật theo nguồn | Có: own contracts/status/page | Không trên luồng đang chạy | Danh sách hiện tại/lịch sử của chính chủ, không nháp/fallback người khác; đọc cả soft-delete. Kiểm thử/browser tại Plan§12.35. |
| Resident chi tiếtHĐ | P/resident/ResidentContractDetailPage.tsx | F/resident/ResidentContractDetailPage.tsx | Một phần; overview/terms/services thật | Có: own detail/signed snapshots/services/occupants | Không trên luồng đang chạy | Chỉ đọc, không note nội bộ/CCCD/contact người ở cùng; kết quả thanh lý chưa có trảnull, không coi CLOSE đã hoàn thành. Plan§12.35. |
| Resident hóa đơn | P/resident/ResidentInvoicesPage.tsx | F/resident/ResidentInvoicesPage.tsx | Một phần; đọc invoice thật đã nghiệm thu | Có: own list/filter | Không trên luồng đang chạy | Thẻ theo nguồn, status/period/overdue/page bằng URL; ẩn draft, own-only kể cả terminated theo Feature. Desktop-Mobile/F5 thật; thanh toán thao tác tại chi tiết. Plan§12.29–30. |
| Resident chi tiếtHĐơn | P/resident/ResidentInvoiceDetailPage.tsx | F/resident/ResidentInvoiceDetailPage.tsx | Một phần; invoice + payment panel API | Có: own invoice/items/basis/payment submit/history/private proof | Không trên luồng đang chạy | Đã gửi PNG thật bằng filechooser, preview private/validation/pending, mobile390px và F5 trênDBtest§12.44. Invoice paid hiển thị Đã thanh toán; không provider online/PDF, chưa ghi nghiệp vụ dev. Giới hạn file picker ở mốc§12.30 đã được kiểm lại thành công. |
| Resident sửa chữa | P/resident/ResidentRequestsPage.tsx | F/resident/ResidentRequestsPage.tsx | Một phần; luồng lõi đã nghiệm thu browser DBtest | Có: GET own list/filter | Không trên luồng đang chạy | Danh sách và trạng thái của cư dân; form ở RES-07, detail ở RES-08. Plan §12.36/12.43. |
| Resident báo sự cố | P/resident/ResidentRequestNewPage.tsx | F/resident/ResidentRequestNewPage.tsx | Một phần; luồng lõi đã nghiệm thu browser DBtest | Có: GET context; POST create + private photos | Không trên luồng đang chạy | Phòng lấy từ hợp đồng active; priority/mô tả/tối đa5 ảnh private; không nhận room/user/status từ client. Plan §12.36/12.43. |
| Resident chi tiết sự cố | P/resident/ResidentRequestDetailPage.tsx | F/resident/ResidentRequestDetailPage.tsx | Một phần; luồng lõi đã nghiệm thu browser DBtest | Có: GET own detail/private photos | Không trên luồng đang chạy | Xem tiến độ, ảnh, ghi chú của yêu cầu thuộc mình; không có thao tác giả. Plan §12.36/12.43. |
| Resident thông báo | P/resident/ResidentNotificationsPage.tsx | F/resident/ResidentNotificationsPage.tsx | Một phần UI nguồn; lõi đã tích hợp/nghiệm thu DBtest | Có: own/list/read/read-all/link | Không trên luồng đang chạy | Chuông,2nguồn INV/MAINT, open lỗi503/khôi phục/Back/đã đọc không POST/mobile390 đã thử§12.45. |
| Resident hồ sơ | P/resident/ResidentProfilePage.tsx | F/resident/ResidentProfilePage.tsx | PROFILE-A đã tích hợp DBtest; browser Admin đã kiểm | Có: me/profile/password, tự sửa tên/đổi mật khẩu DB-D88 | Không trên luồng đang chạy | Dùng AccountProfile chung, giữ email/SĐT/role/pháp lý; đổi mật khẩu thu hồi mọi phiên. Frontend146/build/lint đạt; HTTP đổi mật khẩu/thu hồi phiên đạt, browser Admin tên/F5/mobile375 đạt; chưa browser đổi mật khẩu/4role khác/Admin thậtdev. Plan§12.59, không coi toàn hồ sơ/email đã xong. |
| Technician việc giao | P/staff/TechnicianTasksPage.tsx | F/staff/TechnicianTasksPage.tsx | Một phần; luồng lõi đã nghiệm thu browser DBtest | Có: GET assigned requests/filter | Không trên luồng đang chạy | API chỉ trả việc đã giao cho tài khoản hiện tại. Plan §12.36/12.43. |
| Technician chi tiết việc | P/staff/TechnicianTaskDetailPage.tsx | F/staff/TechnicianTaskDetailPage.tsx | Một phần; luồng lõi đã nghiệm thu browser DBtest | Có: GET detail/photos; POST start/resolve | Không trên luồng đang chạy | Chỉ người được giao bắt đầu/hoàn tất; tên+SĐT chỉ pending/in_progress, sau đó ẩn SĐT. Chưa ảnh nghiệm thu. Plan §12.36/12.43. |
| Guard lịch hôm nay | P/staff/GuardAppointmentsPage.tsx | F/staff/GuardAppointmentsPage.tsx | Một phần; luồng đón khách thật | Có: confirmed hôm nay VN + check-in/check-out | Không trên luồng đang chạy | Actor/thời điểm server, một lần và đúng thứ tự; chưa thẻ/KPI/tabs riêng theo nguồn. Plan§12.34. |
| Staff thông báo | P/staff/StaffNotificationsPage.tsx | F/staff/StaffNotificationsPage.tsx | Một phần UI nguồn; lõi đã tích hợp/nghiệm thu DBtest | Có: own/list/read/read-all/link | Không trên luồng đang chạy | Technician assignedlink tới việc thật, khóa phiên vềlogin; Guardemptytrungthực/URLinvalidretry đã thử§12.45, không broadcast giả. |
| Staff hồ sơ | P/staff/StaffProfilePage.tsx | F/staff/StaffProfilePage.tsx | PROFILE-A đã tích hợp DBtest; browser Admin đã kiểm | Có: me/profile/password, tự sửa tên/đổi mật khẩu DB-D88 | Không trên luồng đang chạy | Dùng AccountProfile chung, giữ email/SĐT/role/pháp lý; đổi mật khẩu thu hồi mọi phiên. Frontend146/build/lint đạt; HTTP đổi mật khẩu/thu hồi phiên đạt, browser Admin tên/F5/mobile375 đạt; chưa browser đổi mật khẩu/4role khác/Admin thậtdev. Plan§12.59, không coi toàn hồ sơ/email đã xong. |

SYS03 `F/RouteErrorPage.tsx` không có file Antigravity tương ứng, nằm ngoài52. Giữ bắt lỗi404/thông báo an toàn/reload; có thể dùng cùng card hệ thống403/404. Các component chết BookingForm/RoomGallery không được tính là đã tích hợp vì không được page import.

## 9. Trạng thái Antigravity và API đến MAINT 30/10

52 dòng nguồn/route đã được ánh xạ theo cách đếm lịch sử §8; **4/52 đủ UI đã điều chỉnh nghiệp vụ** (Login, Register,403,404), **48/52 còn một phần hoặc chưa hoàn chỉnh**. Con số4 không tính các trang chỉ có khung dùng chung, hồ sơ chỉ đọc hoặc màn đã có API nhưng thiếu tab/khối/form của nguồn. Layout dùng chung Admin/Resident/Technician/Guard đã đổi sang bản trắng/sky/teal mới; layout không cộng thêm vào52.

**50/52 màn dùng API thật theo phạm vi ghi trong bảng** =26Admin +9Public/Guest +10Resident +5Staff; không đếm lặp alias ADM-18/19. DASH-02/03 thêm API cho ADM-01. Đã đếm54dòng mapping thành52file nguồn riêng (Admin28dòng/26file; Payment/Debt có alias). Bảy màn MAINT được nối trong §12.36. Hai màn còn lại là trang lỗi hệ thống không cần API nghiệp vụ. Không dùng50/52 làm tỷ lệ hoàn thành chức năng. **0 màn còn dùng mock trên luồng chạy**. Bốn màn đủ UI/48 màn còn một phần; luồng lõi MAINT đã nghiệm thu browser DBtest §11, chưa nghiệm thu đầy đủ UI/dev. API thật không đồng nghĩa UI đầy đủ.

Các tệp mock cũ và BookingForm chưa gắn route được giữ ngoài luồng chạy; App không còn mount AppProvider. Source Antigravity78file giữ nguyên SHA256; không copy đè toàn bộ. Bằng chứng và giới hạn browser/test nằm ở Plan§12.23 và TEST_MATRIX AG-UI. Tiếp theo: port từng bố cục chuyên biệt thay khung dùng chung; hoàn thiện Public, các trang Admin cóAPI, rồi API nghiệp vụ đủ quyết định. Chưa hoàn thành toàn bộ yêu cầu tích hợp/FullMVP.

## 10. CLOSE-03 — nghiệm thu liên module ngày31/10/2026

Không đổi mẫu số màn hình hoặc nâng cả module thành hoàn thành. ADM-14 đã được đọc lại trên browser sau hành trình HTTP đầy đủ: terminated, công nợ hiện tại đúng và phòng hiện occupied do hợp đồng mới. ADM-19 đã kiểm trực quan desktop/mobile390px, tổng1.650.000, hợp đồng đã kết thúc, lọc quá hạn rỗng không làm đổi summary, tìm kiếm/F5 và link invoice có contract_id đúng. ADM-16 sửa riêng tiêu đề paid_amount thành Đã thanh toán; status Đã tất toán giữ nguyên; bản build cuối đã được xác minh trên browser. ADM-17 còn cảnh báo không hủy sau thanh lý, không có nút Hủy.

9 tình huống browser mới không thay thế kiểm thử toàn bộ52màn hoặc toàn bộ wizard. 46 kiểm tra HTTP thật và2hành trình HTTP-kernel là bằng chứng riêng, xem Plan§12.41/TEST_MATRIX CLOSE-F. Màn Sửa chữa, PAY Mobile/upload bằng UI và các giới hạn trước đó không tự trở thành PASS từ lượt này. Không migration hoặc nghiệm thu ghi dữ liệu dev. Trạng thái49API/4UIđủ/48một phần giữ nguyên; không suy UI đủ chỉ từ việc đổi một nhãn.

**Cập nhật runtime dev31/10 — góiA:** schema đã nâng cấp đủ29bảng vật lý/29migration theo phêduyệt,2dịch vụ hệthống/8settings đã có; localhost8080 vàhealth/publicrooms/me đã kiểm stateless200/200/200/401 (me khôngcookie). Không còn blocker thiếu Nhóm3/M17..21/U1/U2/U3 trêndev; mốc20/16 ở các phần cũ là lịch sử. Không thêm màn hình, không tăng số UIđủ/không coi49API đã nghiệmthu mọi thao tác trêndev; dữliệu nghiệpvụ mới vẫn rỗng, không dùngmock. Plan§12.42/DBplan§22.

## 11. MAINT — nghiệm thu luồng lõi31/10/2026

RES-06/07/08, ADM-20/21, STF-01/02 đã đi qua luồng API/browser DBtest theo Plan§12.43: tạo có PNG private, xem/F5, Admin ưu tiên/phân công, Technician bắt đầu/hoàn tất và ẩn SĐT, Admin từ chối có căn cứ, Resident nhận thông báo và xem kết quả. Reopen/tranh chấp hai phiên được thử HTTP, không ghi thành thao tác browser. Đã sửa Tất cả trạng thái gửi tham số rỗng và nội dung TEXT quá dung lượng.

Chỉ nâng mức bằng chứng của luồng lõi; giữ49/52 màn API và4/52 đủ UI. Chưa nghiệm thu đầy đủ giao diện/mobile/ghi MAINT dev, chưa ảnh nghiệm thu/lịch sử trạng thái SHOULD. StaffProfile stale asset sau build được khôi phục bằng reload; chưa sửa chiến lược deploy/cache.


### FILE-03/PAY — bằng chứng bổ sung 31/10–01/11 (Plan§12.44)

Giữ giao diện Antigravity, không thêm màn hình. Form final cộng tổng ảnh damage+waiver theo DB-D80, hiện lỗi20ảnh/30MiB; chưa thử chọn21ảnh trong wizard bằng browser (schema/API đã kiểm). Resident invoice/payment và Admin đối soát/chi tiết invoice đã kiểm14 tình huống browser lõi,26kiểm tra HTTP; không nâng số màn UI hoàn chỉnh hoặc suy đã nghiệm thu toàn bộ52màn. Một504 được hậu kiểm có pending đã lưu; đã thêm cảnh báo kết quả chưa xác định, căn nguyên timeout còn chưa biết. File chooser PNG/private preview đã kiểm lại đạt, không giữ kết luận cũ chưa mở được là trạng thái hiện tại. Ảnh `backups/upload-pay-qa-20261031/admin-paid-after-f5.png`, `resident-mobile.png`; dữ liệu ảnh chỉ DBtest, chưa thao tác tài chính dev.

### NOTIF-03 — bằng chứng bổ sung01/11/2026, Plan§12.45

Admin/Resident/Staff và workspace Khách trong /account/appointments đã kiểm theo vai trò trênDBtest. Nút đọc tất cả mới đúng DB-D81, mở chi tiết thường đánh dấu xong mới navigate, đã đọc không gửi POST thêm; phân trang/chưađọc/error/retry/URL/F5 đã thử theo phạm vi. Menu mobile Public bổ sung Lịch hẹn của tôi đã có ở desktop, không thay quyền. Không thêm màn, sửa sidebar hoặc nâng mẫu số49/52API,4/52UIđủ chỉ từ lần nghiệm thu này. Mobile390 scrollWidth390, ảnh `backups/notifications-qa-20261101/resident-notifications-mobile.jpg`; Admin batch từ trang2 đọc cả trang1, giữ dòng đã đọc. Chưa OSoffline/responseđảo, không email/SMS/push. Dashboard4thẻ mới duyệt DB-D82 chưa code tại checkpoint này, phần bảng/biểu đồ còn chưa nối.

### DASH-02/03 — bốn thẻ Admin,01/11/2026 (Plan§12.46)

Không thiết kế lại Antigravity. Thay bốn giá trị chưa nối bằng GET dashboard theo DB-D82, giữ bảng/danh sách bên dưới ghi rõ chưa tích hợp. Trạng thái0 thật, loading, lỗi503/retry, F5 và mobile390 đã xem trên DBtest. Tổng VND lớn vẫn đúng từng chữ số, scrollWidth382=clientWidth382 tại viewport390. Ảnh `backups/dashboard-qa-20261101/dashboard-mobile.jpg` và `dashboard-mobile-large.jpg`; ảnh sau build cuối đã kiểm bằng mắt. Lõi4thẻ đạt bằng chứng live; full1396/13770/Pint343 và frontend123/build/lint PASS, chốt ở Plan. Không nâng UI4/52 thành hoàn chỉnh chỉ vì có API; không kiểm Dashboard bằng Admin thật trên dev trong lượt này.

### FILE-ROOM — ảnh phòng DB-D83 (01/11/2026, Plan §12.47)

ADM-05 có panel ảnh trong tab Thông tin: upload/list/chọn bìa/gỡ/lightbox dùng API thật, không thêm màn/sidebar. Sau gỡ, React tải lại danh sách và bìa server trả. PUB-01/02 dùng bìa API trong RoomCard; PUB-03 tái dùng RoomGallery/Lightbox Antigravity và đặt lại lựa chọn khi danh sách/thứ tự đổi. Resource Admin/Public có photos gồm bốn trường an toàn. Phòng ẩn/occupied hoặc tòa inactive chặn URL ảnh Public, không đổi quyền các collection private khác.

Đã đạt 13 tình huống browser DB test và 46 kiểm tra HTTP theo Plan; mobile390 không tràn ngang, F5 đủ20 ảnh đều decode và nút thêm bị khóa. PNG1×1 là fixture hiển thị trắng, không phải ảnh phòng thật/stock. Đã xem public-gallery-mobile.jpg, admin-gallery-mobile.jpg, admin-cap20-mobile.jpg; không tăng UI4/52 hoặc API50/52 chỉ từ ảnh phòng. Full Backend1414 test/14077 assertion/Pint349 file và frontend126 test/build/lint PASS (0 lỗi/9 cảnh báo cũ). Sau sửa handler form đã kiểm lại upload một PNG/F5/ảnh decode trên run riêng và lưu admin-gallery-final.png. Fixture/ảnh/schema test đã dọn; dev29 bảng/29 migrations và snapshot cuối nguyên vẹn. Code local af77958, không push. Chưa browser JPEG/WebP/OS offline hoặc ghi ảnh bằng Admin thật trên dev. Các bảng/biểu đồ Dashboard và phần UI khác vẫn chưa hoàn thiện.

### CTR-API-2 — Người ở cùng (DB-D84,02/11/2026; Plan§12.50)

ADM-13 thêm tab Người ở cùng giữ ?tab=occupants, không màn mới/sidebar/wizard8bước. Admin đọc danh sách thật ở mọi trạng thái; nháp thêm/sửa/gỡ qua modal RHF/Zod và xác nhận. Hiệu lực/đã thanh lý không có nút ghi; Backend vẫn chặn409. Hiển thị số khai báo, số có hồ sơ gồm đại diện, sức chứa/cảnh báo lệch; không đổi số người hoặc phí. Các hướng dẫn tạo/xóa nháp đã chỉ đúng nơi quản lý mới. Lát cắt này đã được duyệt, không còn blocker Người ở cùng từ§12.49 cũ; không mở activeCRUD.

12tìnhhuốngbrowser gồm empty/validation/double-submit/CRUD/F5/stale409/cancel/POST503/GET503-retry/readonly/mobile375 và đọc lại bundle cuối;27HTTP+1race hai phiên, hai race process riêng. Form375/scroll375, list367/scroll367; ảnh occupant-form-mobile.png và occupants-list-mobile.png trong artifacts ignored. Full1439/14440/Pint358, frontend133/build/lintPASS (9cảnh báo cũ). Source hash hợp đồng/phòng/tài khoản/sổ tiền trên DBtest giữ nguyên qua PeopleCRUD; fixture đã dọn, dev29bảng/29migration/privatebaseline nguyên vẹn. Code local5f208e2; không push. Không nâng tổng UI/API coverage52màn chỉ vì thêm một tab, không nghiệm thu lại toàn bộ wizard/FullMVP hoặc thao tác Admin thậtdev từ lát cắt này.


### PAY-04 — phục hồi phản hồi thanh toán (02/11/2026,Plan§12.51)

Các biểu mẫu thanh toán trong chi tiết hóa đơn Admin/Resident và ADM-18 đối soát giữ giao diện hiện có. Sau lỗi mạng/5xx/kết quả chưa rõ, khóa submit và cho tải lại hóa đơn/lịch sử; đóng modal cũng đọc lại. Nhãn reload trung tính, không thông báo giả đã thu tiền. Không màn/API/schema/quyền mới, không thay đổi số màn đã tích hợp. BrowserDBtest đã kiểm proof/cash/confirm/reject saucommit504,503trướchandler,reload/F5/mobile390; ledger cuối300kđãtrả/700knợ/2RCP/1rejected. Frontend135/build/lintPASS, backend hồi quy18/237; code90ea3d7. Chưa OSoffline/TCPdrop/Adminthậtdev và chưa khép căn nguyên PAY504; không suy toàn FullMVP/UI hoàn thiện từ lượt này.


### CTR-API-4 — xác nhận hoàn đủ cọc (DB-D85,02/11/2026;Plan§12.52)

ADM-14 tái dùng panel đối soát trên trang Bàn giao/thanh lý: hợp đồng terminated còn cọc dư có nút Ghi nhận đã hoàn đủ cọc, modal checkbox và snapshot tiền; hoàn đủ một lần bên ngoài, không chuyển khoản thật. Sau ghi hiện số gốc/người/thời điểm và số còn phải hoàn0, bỏ nút. Cọc0/active không có thao tác; môi trường thiếu2cột giữ luồng cũ và báo tính năng chưa sẵn sàng, không màn hoặc sidebar mới.10tìnhhuốngbrowser DBtest gồm validation/cancel/doubleclick/F5/503trướcghi/504saucommit/reload/mobile390/zero/active;35HTTP có1race2phiên,1race2process riêng. Full1452/14615/Pint364, frontend137/build/lintPASS(9cảnh báo cũ), code32cab18. Không tăng tổng sốmàn/tỷlệ hoàn thiện từ thêm một nút; devchưa migration, chưa thao tác Adminthậtdev/OSoffline/TCPdrop hoặc hoàn từng phần/hủy audit.


**CTR-RF-DEV02/11 — cập nhật vận hành sau§12.52:** đúng1migration đã được duyệt riêng và áp dụng dev,29bảng/30migration; ADM-14 có đủ schema cho panel hoàn cọc hiện có. Không thay UI/API hoặc nâng số màn hoàn chỉnh. Restore/diễn tập/pretend/đối chiếu dữ liệu và4HTTPstateless8080 đạt; chưa nhấn xác nhận đã chi bằng Admin thậtdev, không tạo giao dịch thử. Các dòng “devchưa migration” ở checkpoint CTR-API-4 phía trên là lịch sử. Plan§12.53/DBplan§23.


### CTR-API-3b — ADM-13 dịch vụ inactive (DB-D86,02/11/2026)
Modal hiện có cho giữ/giảm/ngừng inactive, chặn tăng trướcPUT và vẫn kiểmBackend; giá snapshot/kỳ sau/hóa đơn cũ giữ nguyên. Badge chỉ nhãn, lời giải thích xuống dòng; fieldsetmin-w-0 sửa tràn375px phát hiện qua ảnh thật (không thay Modal/Badge dùng chung). Dialogclient=scroll334/fieldset286, ảnh inactive-mobile-fixed.png đã xem; frontend138/build/lintPASS,29HTTP/7nhóm browser và kiểm lại bảnmobile cuối, backend325/3599/Pint2file. Code3533a56, Plan§12.54/học tập§11.61. Chưa Adminthậtdev/OSoffline/TCPdrop hoặc toànUI; không tăng sốmàn hoàn chỉnh từ việc thêm validation. Dev29bảng/30migration/data/history toàn bộ nguyên vẹn, không schema/devwrite/PAYcode.

### CLOSE-SVC / ROOM-MTR — cập nhật 02/11/2026

- **ADM-14:** panel đối soát hiện có hiển thị blocker từ Laravel và khóa nút khi dịch vụ tương lai đã được hóa đơn tham chiếu. Dòng chưa sử dụng, không có tham chiếu được bỏ trong transaction thanh lý. Browser xác nhận/F5/bấm hai lần chỉ1POST200; không thêm màn hình hoặc thao tác hoàn tiền.
- **ADM-05:** tab Điện nước đã đọc API thật theo phòng, lọc dịch vụ/kỳ/loại, phân trang20dòng, giữ URL khi F5. Bảng cuộn trong khung ở375px; có loading/rỗng/URLsai/503 và thử lại. ADM-07 tái dùng cùng bảng, đã smoke20dòng. Tab Lịch xem còn placeholder vì API chưa nhận room_id; không lọc một trang bằngReact.
- Code e3c3030/25ae0db; full1469/14836/Pint365, frontend141/build/lint0lỗi9cảnh báo cũ; bằng chứng và giới hạn Plan§12.56–57. Không tăng số màn hoàn chỉnh từ hai lát cắt; chưa Admin thậtdev/BackForward/OSoffline/TCPdrop. DB dev không thay đổi.
