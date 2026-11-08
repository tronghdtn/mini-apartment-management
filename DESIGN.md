# DESIGN.md — Hệ thống thiết kế MiniApart

Tài liệu này là nguồn quy ước giao diện. Nghiệp vụ, trạng thái và quy tắc tiền vẫn theo `docs/`; `docs/FRONTEND_DESIGN_BRIEF.md` giữ sitemap và mô tả màn hình. Khi hai tài liệu khác nhau về hình thức hiển thị, làm theo file này.

## 1. Người dùng và tinh thần

- **Admin (chủ nhà/quản lý):** mở web hằng ngày để xem việc cần làm, thu tiền, lập hóa đơn. Cần nhìn nhanh, ít chữ, số rõ.
- **Cư dân, kỹ thuật viên, bảo vệ:** dùng chủ yếu trên điện thoại, vài lần mỗi tháng. Cần nút to, nhãn dễ hiểu.
- **Hướng thẩm mỹ:** *bảng điều hành yên tĩnh* — tiện dụng, gọn, nhiều khoảng trắng, màu chỉ dùng để báo trạng thái hoặc hành động chính. Trang trí ở mức tối thiểu có chủ đích.

## 2. Chữ

- Một họ chữ duy nhất: **Be Vietnam Pro** (thiết kế cho tiếng Việt, dấu rõ ở mọi cỡ). Tiêu đề dùng đậm 700, nội dung 400–500.
- Con số tiền và số lượng: `tabular-nums` để các chữ số thẳng cột; căn phải trong bảng.
- Thang cỡ: tiêu đề trang `text-2xl`, tiêu đề khối `text-base font-semibold`, nội dung `text-sm`, phụ chú `text-xs text-slate-500`.

## 3. Màu

| Vai trò | Token | Dùng cho |
|---|---|---|
| Hành động chính | `sky-600` / hover `sky-700` | Một nút chính mỗi màn, liên kết |
| Nền khung điều hướng | `white` + viền `slate-200`; mục đang chọn `sky-50`/`sky-700` + vạch `sky-600` | Sidebar Admin |
| Nền trang / thẻ | `slate-50` / `white` + viền `slate-200` | Không đổ bóng đậm |
| Thành công / đã thanh toán / đang thuê / đang hiệu lực | `emerald` | Badge, thanh tiến độ |
| Phòng còn trống, đang xử lý | `sky` | Badge thông tin |
| Chờ xử lý / sắp hết hạn | `amber` | Badge, việc cần làm |
| Quá hạn / lỗi / nguy hiểm | `rose` | Badge, cảnh báo, nút xóa |
| Trung tính / đã đóng | `slate` | Badge trạng thái kết thúc |

## 4. Bố cục

- Đơn vị khoảng cách 4px; khối cách nhau `gap-6`, trong thẻ `p-5`.
- Thẻ: `rounded-xl border border-slate-200 bg-white`. Không lồng thẻ trong thẻ quá một cấp.
- **Đầu trang:** tiêu đề + một dòng mô tả bên trái, hành động chính bên phải.
- Tab lọc: một hàng, cuộn ngang khi hẹp, không xuống dòng.
- Bảng: khung `overflow-x-auto`, tiêu đề cột chữ thường cỡ `text-xs font-medium` (không viết hoa), số và tiền căn phải `tabular-nums`, cả hàng bấm được để mở chi tiết.
- **Mỗi hàng tối đa một nút đặc** cho việc chính theo trạng thái; các việc phụ (đổi giờ, hủy, lập hợp đồng…) gom vào menu `⋯` dùng `RowMenu` (vị trí `fixed`, tự mở lên khi gần mép dưới, Esc/bấm ngoài để đóng, phím mũi tên để chọn). Việc nguy hiểm trong menu dùng `tone: 'danger'`.
- **Không có nút "Chi tiết"** trên hàng: cuối hàng là mũi tên `ChevronRight` xám. Chỉ giữ nút làm việc khác hẳn việc mở chi tiết (ví dụ "Cho thuê", "Lập hợp đồng"), dạng chữ xanh nhỏ, không nền đậm.
- Cột tiêu đề trống dùng `aria-label` trên `<th>`, **không** đặt `sr-only` bên trong: phần tử `sr-only` định vị tuyệt đối sẽ thoát khỏi khung cuộn và làm trang tràn ngang trên điện thoại.
- Không hiện số ID nội bộ (`#2`); mã nghiệp vụ (INV-, RCP-, HD-) giữ font mono cỡ nhỏ. Nhãn nút trùng nhau trên nhiều hàng thì thêm `aria-label` mô tả hàng.
- Ảnh riêng tư (minh chứng, ảnh chỉ số) mở bằng nút "Xem ảnh" + `Lightbox`, không chèn ảnh to vào ô bảng.
- `fieldset` chứa thanh lọc phải có `min-w-0` (mặc định `min-width: min-content` làm tràn ngang trên điện thoại).
- Mã/tên phòng viết "Phòng A-101" chữ đậm thường, tên tòa dòng phụ cắt bớt có `title`.

## 5. Chữ trên giao diện

- Viết cho người dùng, không viết cho lập trình viên: không lộ tên trạng thái tiếng Anh, mã nội bộ (`#id`), hay câu giải thích cách hệ thống tính toán.
- Giải thích dài chuyển vào `title`/tooltip hoặc trang chi tiết.
- Nút "Tải lại" dùng nút biểu tượng nhỏ có `aria-label`, không lặp chữ ở mỗi khối.

## 6. Biểu đồ

- Dùng Recharts (đã có trong dự án). Chọn dạng theo việc của dữ liệu; một trục giá trị, không dùng hai trục.
- Lấp đầy phòng: cột chồng ngang, màu cố định Đang thuê `#059669`, Còn trống `#38bdf8`, Bảo trì/ngừng `#d97706` (khai báo ở `features/dashboard/occupancy.ts`, đã chạy bộ kiểm tra bảng màu: qua dải sáng, độ bão hòa, tách biệt mù màu và thị lực thường).
- Màu nằm ở thanh, chữ dùng màu chữ thường; luôn có chú giải, nhãn số đọc được không cần màu, tooltip khi rê chuột và một bảng ẩn cho trình đọc màn hình.
- Bảng ẩn phải đặt trong một khối `sr-only`, không đặt `sr-only` trực tiếp lên `<table>` (bảng không co về 1px và làm tràn ngang).

## 7. Trạng thái tải và lỗi

- Lần đầu: dòng "Đang tải…" hoặc khung xương. Đổi bộ lọc: giữ dữ liệu cũ qua `RefreshingFrame`.
- Lỗi: thông điệp tiếng Việt + nút thử lại; không hiện chi tiết kỹ thuật.

## Nhật ký quyết định

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-11-08 | **Đổi Plus Jakarta Sans + Space Grotesk sang một họ Be Vietnam Pro.** | Space Grotesk là font mặc định của rất nhiều giao diện AI; Be Vietnam Pro đọc tiếng Việt tốt hơn và giữ một giọng chữ thống nhất. |
| 2026-11-08 | **Sidebar Admin nền tối, nhóm theo tần suất dùng; danh mục ít dùng gom vào nhóm thu gọn.** | Menu cũ 16 mục ngang hàng; việc hằng ngày (hợp đồng, hóa đơn, thanh toán) cần nằm trên cùng. Không đổi route. |
| 2026-11-08 | **Bỏ chú thích kỹ thuật trên màn hình; nút tải lại thành biểu tượng.** | Chủ dự án nhận xét giao diện rối; các câu giải thích cách tính làm loãng thông tin chính. |
| 2026-11-08 | **Tab lọc không xuống dòng, cuộn ngang trên màn hẹp.** | Tab Hợp đồng từng vỡ thành ba hàng. |
| 2026-11-08 | **Sidebar Admin quay lại nền sáng, giữ logo cũ (biểu tượng gradient sky→teal, chữ "Mini" đen + "Apart" xanh, dòng "Quản trị viên").** Giữ cách nhóm menu mới. | Chủ dự án thấy nền tối và chữ tên hệ thống dài trên logo kém đẹp hơn bản cũ. Thay quyết định sidebar nền tối ở trên. Logo không dùng tên hệ thống trong Cài đặt vì tên dài bị xuống dòng; tên đầy đủ để trong `title`. |
| 2026-11-08 | **Bỏ nút "Chi tiết", "Tiếp nhận & Xử lý", "Phát hành / Sửa", "Chi tiết & Thu tiền" trên các danh sách; dùng hàng bấm được + mũi tên.** | Đề xuất của chủ dự án: các nút này chỉ mở trang chi tiết, trùng với bấm hàng. Áp dụng Phòng, Sửa chữa, Hóa đơn, Tài khoản, Hợp đồng. |
| 2026-11-08 | **Phòng "Đang thuê" màu xanh lá, "Còn trống" xanh dương nhạt; cột công khai là chữ + biểu tượng mắt.** | Thống nhất với thanh lấp đầy ở Tổng quan; trước đây "Còn trống" và "Có" cùng xanh lá đứng cạnh nhau dễ nhầm. |
| 2026-11-08 | **Ưu tiên sửa chữa thấp/bình thường để chữ xám; chỉ Cao (cam) và Khẩn cấp (đỏ) có badge. "Chưa phân công" là chữ nghiêng xám. Vai trò tài khoản là chữ thường; chỉ "Đã khóa" có badge đỏ.** | Tránh trùng màu với trạng thái ("Đang xử lý" xanh dương, "Chờ tiếp nhận" cam). Màu chỉ để báo trạng thái cần chú ý. |
| 2026-11-08 | **Trang Thanh toán: bỏ "Thanh toán #id"/"Xác nhận khoản #id", hàng hiển thị người nộp + phòng + giờ nộp; nút chỉ "Xác nhận"/"Từ chối"; ảnh minh chứng mở trong khung xem ảnh.** | Chủ dự án hỏi các mã khó hiểu; số ID nội bộ không có nghĩa với chủ nhà. Câu giải thích dài thay bằng ghi chú ngắn "Chưa trừ công nợ" ở khoản chờ đối soát. |
| 2026-11-08 | **Lịch xem phòng: Chờ = cam, Đã xác nhận = xanh dương, Hoàn tất = xanh lá, Đã hủy = xám. Chỉ hành động chính (Xác nhận, Hoàn tất, Check-in/out) là nút đặc; Đổi giờ là chữ xám, Hủy lịch là chữ đỏ, Lập hợp đồng là liên kết xanh.** | Chủ dự án thấy trạng thái "Đã xác nhận" và nút "Lập hợp đồng" cùng xanh lá, hàng có 3–4 nút viền giống nhau khó nhìn. "Đã hủy" là trạng thái đóng, không phải lỗi nên không dùng đỏ. |
| 2026-11-08 | **Lịch xem phòng: chỉ giữ nút chính (Xác nhận / Hoàn tất / Check-in / Check-out), Đổi giờ, Hủy lịch, Lập hợp đồng chuyển vào menu ⋯.** Thay cách hiển thị chữ ở dòng trên. | Chủ dự án thấy cột thao tác vẫn chiếm diện tích và rối khi có 3–4 việc trên một hàng. |
| 2026-11-08 | **Phòng và Tài khoản dùng menu ⋯ thay cho liên kết "Cho thuê"/"Lập hợp đồng" trên hàng.** Phòng: Lập hợp đồng cho thuê (phòng trống), Lịch sử hợp đồng, Xem trên trang công khai (phòng trống và công khai). Tài khoản: Lập hợp đồng (khi được phép), Xem hợp đồng (khách/cư dân). Hàng không có việc phụ thì giữ mũi tên ›. | Thống nhất với Lịch xem phòng theo yêu cầu chủ dự án; chỉ một menu mở tại một thời điểm. |
| 2026-11-08 | **Khối Lấp đầy theo tòa nhà ở Tổng quan dùng biểu đồ Recharts (cột chồng ngang) thay cho thanh CSS.** Bấm thanh để mở chi tiết tòa. | Chủ dự án muốn dùng thật thư viện biểu đồ đã khai báo trong báo cáo; dữ liệu lấy từ API `dashboard/buildings` sẵn có, không thêm API. |
| 2026-11-08 | **Thanh trên khu nội bộ không còn nút "Trang công khai"; menu tài khoản (Admin/Cư dân/Nhân viên) gồm Hồ sơ cá nhân, Lịch hẹn (nếu có), Xem website (tab mới), Đăng xuất. Bỏ "Khu vực của tôi" trong khu nội bộ; chân sidebar Admin chỉ hiển thị tên.** | Chủ dự án muốn gọn thanh trên; "Trang chủ" dễ nhầm với Tổng quan nên dùng "Xem website". Menu ở trang công khai giữ "Khu vực của tôi". Không làm "xem với vai trò khác" vì quyền kiểm ở backend; demo bằng tài khoản thử từng vai trò. |
