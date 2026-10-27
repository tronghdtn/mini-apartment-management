# Ma trận kiểm thử tính năng đang triển khai

Model agent kiểm thử: `gpt-6-luna` — chủ dự án chọn 27/10/2026. Môi trường duy nhất cho fixture/ghi: `mini_apartment_test` với tài khoản riêng; không tạo/ghi dữ liệu dev. Trạng thái tổng hợp và commit vẫn quản lý tại IMPLEMENTATION_PLAN.md, không dùng ma trận này làm kế hoạch công việc thứ hai.

## ROOM-PUB — nguồn brief §26 / DB-D01 / DB-D60

Tiền điều kiện: chạy guard và TestEnvironment thành công; PHPUnit đã kết thúc trước khi tạo fixture CLI PublicRoomsBrowserFixtures. App/Nginx test `http://localhost:8082`, PHP8.3.36, APP_ENV=testing, DB_CONNECTION=mysql_test, RUN_MIGRATIONS=false. Fixture có21phòng public available +1occupied +1private cùng tòa, cọc1.500.000, giá3.000.001..3.000.023, tiện nghi tòa/phòng trùng và archived. Fixture là dữ liệu minh họa test, không phải nghiệp vụ dev. Không chạy schema/fullsuite khi fixture browser tồn tại.

| ID / mức | Thao tác và dữ liệu | Kết quả cần có | Loại bằng chứng |
|---|---|---|---|
| PUB-T01 P0 | Anonymous GET list/detail/filters, mở `/rooms` |200, dữ liệu thật, không tenant/legal/auth fields; trang1tối đa20phòng, tổng21fixture | API + UI |
| PUB-T02 P0 | GET detail phòng occupied/private/IDthiếu/abc |404 đồng nhất; UI không fallback phòng khác | API + UI |
| PUB-T03 P1 | Chọn tiện nghi tòa+phòng, có IDtrùng2nguồn và archived |Chỉ phòng có đủ cả2; mỗi tiện nghi hiện1lần; archived không hiện/lọc/options, pivot còn | API + UI + PHPUnit |
| PUB-T04 P1 | Lọc đúng tòa/giá/diện tích/sức chứa, sort giá/diện tích asc/desc |AND, biên inclusive, đồnggiá dùngIDtăng; tiền nguyên/area chuỗi | API + PHPUnit |
| PUB-T05 P1 | Tìm `%`, `_`, dấu nháy, từ không tồn tại |Tìm literal, không rò/phá query; rỗng thật | API + UI |
| PUB-T06 P1 | Sai số âm/thập phân/giới hạn/kiểu/sort, max<min, query is_public/status |422tiếngViệt; UI lỗi ngaytrường, không gửi khi form sai, URLsaibáolỗi | API + UI + Node |
| PUB-T07 P1 | Trang2, F5, đổi filter/sort, Back/Forward |Dữ liệu đúng từngURL, đủmọitiệnnghi, resetvềtrang1; requestcũkhôngđèrequestmới | UI + Node |
| PUB-T08 P1 | Bộlọckhôngkếtquả/trangvượtcuối |Rỗngthật, khôngfallback; cóvềtrangđầu/xóalọc | API + UI |
| PUB-T09 P1 | NgắtAPI/app tạm trênmôitrườngtest, retry |Loading/error/retryriênglist/options; không hiện dữliệugiả hoặcthànhcông | UI |
| PUB-T10 P1 | Mở detail và `/book`, `/rooms/:id/book` |Cọcthật, khôngmặcđịnh1tháng; khôngảnh/dịchvụ/hotlinegiả; khônggửiAPTgiả | UI + source |
| PUB-T11 P1 | Mobile390×667, desktop, bànbànphím/formlabel |Khôngtrànngangtrang; đọcrõcard/chip/tiền; focus/label/errorđúng | UI |
| PUB-T12 P0 | PublicGETcả5vai trò; anonymousAdminGET; publicwrite |Publickhôngphụthuộcvaitrò; Adminvẫnbị401/403; khôngPOST/PATCH/DELETEpublic | PHPUnit + API |
| PUB-T13 P1 |20phòng/quan hệ, query log; snapshotdevtrước/sau |KhôngN+1; GETkhôngghinghiệpvụ; schema/migrations/hashdevkhớp | PHPUnit + snapshot |
| PUB-T14 P1 | Trangchủ/tìmnhanh/footer/navliênkết |Phòng vàtòa thực; bộlọcURLđúngcontract; khôngdẫnquerymockcũ | UI + source |

Luồng UI được kiểm tra tuần tự bằng CUA trên một browser khả dụng; agentAPI chia theo đọc/hạnchế/validation và agent source kiểm tra hồi quy. Các trường hợp kiểm tra API/PHPUnit không được báo thành đã thao tác UI. Kết quả thực thi ghi tại Plan§12.17 sau nghiệm thu.

## CAT-SET — ADM-23, brief§18/CAT-D01 và§27

Tiền điều kiện: backend tests đã kết thúc; app/Nginx8082 trỏ mysql_test. Dùng AuthBrowserFixtures để có tài khoản test năm vai trò; không in credentials. Sao lưu đúng hai khóa số ngày trước khi thao tác, kiểm tra dữ liệu hóa đơn/cọc không đổi, khôi phục hai khóa về trạng thái ban đầu và dọn đúng tài khoản/phiên fixture sau lượt chạy. Không chạy seeder hoặc chỉnh settings dev.

| ID / mức | Thao tác | Kết quả cần có | Bằng chứng |
|---|---|---|---|
| SET-T01 P0 | Anonymous mở/admin/settings; Admin đăng nhập và mở sidebar | Guest về login; Admin đọc API200; không có badge tiền/sửa chữa mẫu | UI + API |
| SET-T02 P0 | Bốn vai trò khác GET settings/PUT hai khóa; thiếu CSRF |403 cho sai quyền;419 khi thiếu CSRF; không đổi cấu hình | API + PHPUnit |
| SET-T03 P1 | GET thiếu tám khóa hoặc giá trịNULL |Hiện thiếu cấu hình/ô trống/Chưa cấu hình, không tự điền5/30 hoặc ngân hàng mẫu | UI + API |
| SET-T04 P1 | Nhập0,366,thập phân,rỗng rồi lưu |Lỗi đúng trường, không thành công; backend422 với input sai | UI + Node + API |
| SET-T05 P0 | Lưu invoice365, warning1; F5 |Hai PUT độc lập, chỉ `{value:int}`; phản hồi thành công mới hiển thị; F5 vẫn365/1 | UI + API |
| SET-T06 P1 | Gửi lặp khi pending, mất API và retry |Form đang lưu bị khóa, không báo thành công giả; lỗi và retry thật | UI + source |
| SET-T07 P1 | Hệ thống/ngân hàng chỉ đọc; PUT key khác hoặc field điều khiển |UI không mở sửa sáu khóa; API404/422; không seed hoặc thay dữ liệu khác | UI + API |
| SET-T08 P1 | Mobile390×667 và màn desktop |Không tràn ngang; nhãn và từng nút lưu rõ; không giả QR online | UI |

Các ca tính phí P4/P5-B/Q15 và migrationU1 không có bề mặt HTTP/UI mới: kiểm tra bằng PHPUnit có guard, không gán kết quả đó thành đã kích hoạt/thanh lý/thanh toán thực tế. Test U1 dùng đường dẫn pending tường minh và khôi phục schema global ở cuối; không chạy song song với các test khác hoặc fixture browser.

Kết quả CAT-SET ngày27/10: các bằng chứng thực thi/giới hạn ở Plan§12.20. HTTP11 nhóm PASS; UI lưu365/1/F5, invalid0, expired session, GET503/retry, Guard denied và mobile đã kiểm tra. Các input còn lại có Node/API, không tự nâng thành UI. Fixture đã khôi phục hai khóa, invoices/payments không đổi; năm tài khoản test đã dọn đúng phạm vi.
