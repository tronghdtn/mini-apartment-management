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

## PERF-01 — tải mã trang quản trị theo nhu cầu

Không sửa nghiệp vụ/API/database. Checkpoint trước sửa c129fbd; baseline build JS815.23KB/gzip228.14KB. Dùng React.lazy + Suspense bao Outlet dưới guard hiện có; các named export/URL giữ nguyên. Nguồn [React lazy](https://react.dev/reference/react/lazy), [Suspense](https://react.dev/reference/react/Suspense); đối chiếu package React19.2.8 hiện cài, không nâng dependency.

| ID | Kiểm tra | Kết quả cần có |
|---|---|---|
| PERF-T01 | Build manifest và các static import của entry | Tổng JS tải ban đầu giảm so baseline; chunk trang quản trị tách riêng, không chỉ so mỗi file entry |
| PERF-T02 | Guest mở Home/Rooms rồi trực tiếp /admin/settings | Public render bình thường; guard chuyển login trước khi render trang quản trị |
| PERF-T03 | Admin fixture login, Settings, F5 và qua Buildings/Rooms/Contracts/Users | Named export resolve đúng, API thật, không trắng trang, sidebar giữ nguyên |
| PERF-T04 | Admin mở dashboard/mock và trở lại Settings; URL chi tiết thiếu ID | Trang còn mock giữ nhãn; route/detail404 không fallback; không tự nâng trạng thái nghiệp vụ |
| PERF-T05 | NonAdmin mở URL quản trị; logout rồi mở lại | Guard vẫn từ chối; backend vẫn bảo vệ API độc lập |
| PERF-T06 | Chặn một chunk chưa tải bằng Nginx test503, mở route rồi khôi phục file | Lỗi tiếng Việt không lộ URL/module, có Tải lại trang và hồi phục sau reload; không giả dữ liệu |

Fixture tài khoản test riêng được dọn sau regression; không chạy schema tests khi fixture tồn tại. Đo dung lượng build không được gọi là đo thời gian người dùng tải/render trên mạng thật. Không cache dữ liệu tài chính hoặc điều chỉnh ngưỡng cảnh báo để che bundle lớn.

Kết quả PERF-01: Plan§12.21 ghi số đo cuối, hồi quy UI/API và ca chunk503/phục hồi; frontend71/build/lint0lỗi9cảnhbáocũ. Guard và logout được kiểm tra lại trên bản cuối. Đã dọn năm tài khoản/phiên fixture, dừng hai container test, snapshot dev trước/sau khớp. Không kiểm thử hết18 luồng nghiệp vụ hoặc đo thời gian tải mạng thật.

## U2 — nền tảng cấu trúc/quyền/tệp, DB-D64

Đây là kiểm thử tự động nội bộ, chưa có màn hình hoặc API gửi/duyệt chỉ số. Test DDL không dùng RefreshDatabase: migrate mặc định chỉ DB test, assert hai bảng pending chưa tồn tại; apply tường minh, bắt đầu transaction fixture sau DDL, rollback fixture trước down. Theo dõi quyền sở hữu schema trước up để dọn được cả trạng thái DDL lỗi một phần; down từ chối khi còn lịch sử/metadata. Không chạy song song với fixture browser hoặc schema test khác.

| ID | Kiểm tra | Bằng chứng |
|---|---|---|
| U2-T01 | Đúng cột/type/null/default, generated STORED, indexes M19/submissions; default migrate không tự áp dụng | PHPUnit MySQL |
| U2-T02 | Pending trùng bị chặn, rejected giải phóng slot/gửi lại, khác kỳ/dịch vụ, giữ lịch sử | PHPUnit MySQL, dữ liệu trạng thái là fixture trực tiếp, chưa là thao tác duyệt |
| U2-T03 | Sáu FK RESTRICT, FK sai, UNIQUE approved reading; không tự sinh reading/invoice/payment từ pending | PHPUnit MySQL |
| U2-T04 | Decimal chuỗi/Enum/date/quan hệ/morph; ownership/status/review/path không mass-assign | PHPUnit |
| U2-T05 | Guest/sai chủ/User/Technician/Guard/locked bị chặn; Admin hoặc chủ Resident đọc, chỉ Resident đang thuê tạo, lịch sử sau thanh lý vẫn đọc | Gate/Policy tự động; chưa HTTP nghiệp vụ |
| U2-T06 | Disk private sai collection/parent/orphan bị chặn; không route/url/symlink public; URL local ký cũng không tìm thấy file private | Cấu hình + tệp UUID thật + HTTP framework test, không coi là kiểm thử download endpoint U2 |
| U2-T07 | Down từ chối khi còn submissions hoặc metadata ảnh, không đổi rows; dọn test và down rỗng thành công | PHPUnit MySQL |

Kết quả mục tiêu cuối10test/230assertion PASS. Lần đầu9/212 trước bổ sung quyền/tệp chỉ là trung gian. Test isolation file trước sửa **404 mong đợi/200 thực tế** với URL local ký; không ký đã403. Tách root private sang storage/app/evidence, local giữ nguyên storage/app/private; sau sửa cả URL ký/không ký không đọc được tệp private. Không sửa framework hoặc tuyên bố unsigned URL trước đó đọc được. Tệp test đã xóa bằng finally. Fullsuite/style/snapshot cuối ghi tại Plan§12.22 khi hoàn tất.

Chốt mã cuối: full1178test/10014assertion, Pint227file PASS; frontend71/build/lint0lỗi9cảnhbáocũ. Sau fullsuite: hai bảng pending đã gỡ khỏi DB test, không còn tệp evidence fixture; snapshot dev khớp20 bảng/16 migration. Chi tiết/giới hạn Plan§12.22. Chưa nghiệm thu UI/live API U2 vì chưa có bề mặt đó.

## LEASE-C — nhận cọc và kích hoạt, brief§28/DB-D61/62

Các ca dưới đây đang chuẩn bị/chạy, chưa tự đánh dấu PASS từ code hoặc build. Model agent QA tiếp tục gpt-6-luna theo lựa chọn đã lưu; root kiểm tra browser bằng CUA. Không chạy schema/fullsuite trong lúc fixture browser tồn tại.

| ID | Tình huống và kết quả bắt buộc | Track |
|---|---|---|
| LC-T01 P0 | Guest401, bốn role nonAdmin403, lockedAdmin403, thiếuCSRF419 cho terms/deposit/activate; context chỉAdmin | Feature + liveAPI |
| LC-T02 P0 | Nháp termsNULL chưaactivate422; none/fixed/multiple/điều kiệnJSON lưu/F5, active không sửa snapshot409; mã trùng/field giả422 | Feature + Node + browser |
| LC-T03 P0 | Cọc0 không cần nhận; cọc>0 chưaheld activate409; xác nhận đủ và expected_amount đúng → held/paid_at; sai amount/không xác nhận/giả paid_at bị chặn; không invoice/payment | Feature + liveAPI + browser |
| LC-T04 P0 | Đãheld không đổi room/user/deposit hoặc xóa; note hợp lệ vẫn sửa; receipt lặp không đổi thời điểm, active không nhận lại | Feature + browser |
| LC-T05 P0 | Hai reading chuỗi DECIMAL bắt buộc/biên; thấp hơn mốc422; cao cần lý do+xác nhận; actor server; priorfinal→vacancyperiodic→người mới hợp lệ; thiếuchốt/chồngngày bị chặn | Feature + API + browser |
| LC-T06 P0 | Một transaction HD/active/occupied/resident/ĐiệnNước đúng1lần, giữ snapshot định kỳ; lặp409; rollback lỗi không ghi một phần; cùngroom/tenant tranh chấp | Feature/MySQL + API |
| LC-T07 P0 | Draft đổi nội dung khi modal mở nhưng amount khôngđổi → expected_revision409; không ký/nhận cho nội dung mới. Pending chung chặn lưu khác; response cũ không trả UI vềdraft | Feature + browser |
| LC-T08 P1 | Form duplicatewaiver hiện lỗi; context503 không confirm; offline/422/409/retry, focus/Escape/pending, F5active/mã/paid_at/services; desktop/mobile390 không tràn | browser + resolver |
| LC-T09 P0 | Fixture mới có scope/run/SQLidentity, cleanup active đúng FK; không devmigration/seeder; so snapshotdev trước/sau; test/lint/build/Pint và stage đúng file | root |

## U1 API/UI — giá theo tòa, brief§29 / DB-D63

| ID | Ca kiểm tra và kỳ vọng | Track |
|---|---|---|
| U1-A01 P0 | Guest401/nonAdmin403/lockedAdmin403/CSRF419; missing/invalid/unknown building422 | Feature + liveAPI |
| U1-A02 P0 | Hai tòa cùng dịch vụ/ngày có giá riêng; trùng đúng scope422/race409; không sửa/xóa lịch sử | Feature + liveAPI + browser |
| U1-A03 P0 | D33 chỉ chặn giá đúng tòa/dịch vụ đã ghi kỳ; tòa khác không chặn; reading/item/issued total không đổi | Feature |
| U1-A04 P0 | Giữ test copy lịch sử/ID/ngày/rollback phân kỳ; API legacy thiếu building_id503, không fallback global | migration/Feature + API |
| U1-A05 P1 | URL building/service/page qua F5/Back; chọn tòa thứ23 sau options nhiều trang; thay filter không hiện bảng tòa trước | browser + Node |
| U1-A06 P0 | Form chọn tòa bắt buộc, prefill scope, save201/F5 đúng tòa/giá; 422 giữ input; pending chặn double submit/đóng | browser + API |
| U1-A07 P1 | Chi tiết tòa tab giá có bảng/link đúng scope, phân trang21dòng; tòa mới rỗng thật, không suy giá hiện hành; desktop/mobile | browser |
| U1-A08 P0 | Test DDL tuần tự, fixture rollback trước down; helper sở hữu schema/runIDs; cleanup và snapshot dev không đổi | root |

Các ca đang triển khai, chưa đánh dấu PASS từ code. Không chạy fullsuite/schema khi U1 browser fixture còn sống. Agent model gpt-6-luna như cấu hình chung.

## AG-UI — đối chiếu52 nguồn, layout5vai trò và bảo toàn API

Nguồn/trace: yêu cầu trực tiếp27/10, SCREEN_INVENTORY§7–8, Plan§12.23; prototype52file, không tính SYS03 chính thức vào mẫu số. Dùng gpt-6-luna cho tester theo lựa chọn đã lưu. Root thực hiện browser CUA nối bản build chính thức/Nginx DB test và prototype Vite riêng; không dùng quyền demo làm bằng chứng Auth chính thức.

| ID / mức | Kịch bản | Tiêu chí |
|---|---|---|
| AG-T01 P0 | Kiểm kê tất cả file nguồn, mapping/export/route/guard, hash nguồn trước/sau | Đúng52nguồn và không file sót; không sửa prototype, không tính file tồn tại thành UI đầy đủ |
| AG-T02 P0 | Guest/Admin/Resident/Technician/Guard login/F5/logout và mở URL sai role | Me thật; cấm role-switch/demo; sai quyền403, Guestlogin; Technician không mở lịch Guard và ngược lại |
| AG-T03 P1 | So source/chính thức desktop1440×900 và390×844: AdminSidebar, Resident/Staffheader/footer nav | Sidebar trắng/skyactive/headertrắng; fontskytealđúng; không emerald/darkamber cũ, không overflow |
| AG-T04 P1 | Menu mobile, thu gọn desktop, Escape/Tab/modal;640–767px navbarpublic | Menu không mất ở breakpoint; mở/đóng/focus/bànphím, nav có đích thật, modal không thoát focus |
| AG-T05 P0 | Hồ sơGuest/Admin/Resident/Staff, NULL email; readonly/disabled chỉnh sửa | Tên/SĐT/email/role từ me, không phòng/CCCD/tòa/Đangtrực mẫu; không lưu giả hoặc nhận mật khẩu khi chưa API |
| AG-T06 P0 | Admin Residents filter/search/paging/clear, vào accountdetail; Users tạo/name/status hồi quy | Residents dùng role=resident, tìnhtrạngthuê riêng; clear không mất role; APIs/validation/CSRF thật giữ nguyên |
| AG-T07 P1 | Mọi route mới: list/detail, tabs, form preview, back, bell, directURL/F5 | Có route đúng role; chưaAPI khác noresults; sốliệu—, lưu khóa, không chụp mock/claim nghiệp vụ hoàn tất |
| AG-T08 P0 | Những trang API đang chạy: buildings/rooms/amenities/services/prices/contracts/settings | Không fallback/mock, lỗi/empty/retry giữ nguyên; modal/formRHF/snapshot/services/saveddata không bị thay |
| AG-T09 P1 | Kiểm tra từ prototype: public filter URL, detailID, booking/contact/FAQ/thumbnail | Giữ APIcanonical/cọc thật; không hotlines/giá/QR/ảnh/claims giả hoặc querysource không hợp lệ |
| AG-T10 P1 | Build/lint/tests, bundle lazy và Reactconsole; snapshot dev và cleanup test | Ghi số thực chạy; không bỏ tests/hạ rule; không devmigration/seeder hoặc ghi nghiệp vụ dev |

Kịch bản chạy theo nhóm: S1layout/Auth (T01–05), S2Admin API (T06/08), S3route/chưaAPI (T02/07), S4Public (T04/09), S5hồi quy/bảo toàn (T10). Không gộp source-review/unit/API thành kiểm thử thị giác. Các màn chưa đầy đủ bố cục/form/flow sẽ vẫn ghi UI một phần, dù tất cả file đã có route.

Kết quả AG-UI27/10 (phân biệt mức bằng chứng):
- T01: đối chiếu nguồn52/52, file/route/exports và78hash prototype không đổi; chưa phải visual52màn.
- T02/T03/T05: browser đăng nhập cả5vai trò; hồ sơ me/role thực và layout mới Desktop/Mobile. Guest và staff đăng xuất thật; ResidentF5 giữ phiên trên hostlocalhost; Technician→Guard và Guard→Technician bị403; Resident→Admin bị403. Không báo đã F5 ở mọi route hoặc thử mọi tài khoản locked qua browser.
- T04: Admin drawer/Modal sửa tòa đã thử ShiftTab/Escape/focusreturn; Public640menu mở thật. Phát hiện768header xuống dòng, đã đổi desktop nav/actions sanglg và menu tài khoản gọn, cần xác minh lại bản cuối. Không phải mọi modal/page đã được duyệt accessibility.
- T06/T08: LiveAPI5role read_permissions/login/me/logout PASS; roomspagination23/phòng/hợp đồng và residentrole filter PASS. Browsermatrix23, roomdraft đúngdata, contractservice tab đọc, residentssearch/clear giữrole. Chưa kiểm lại toàn bộ createStaff/update/status/saveServices/settingswrite hoặc wizard cũ.
- T07: route/export52 nguồn đã review; Guard lịch/tab có—và chưa nguồn, không0/emptygiả. Các khung dùng chung vẫn chưa đủ UI chi tiết; không đánh đồng buildPASS với nghiệp vụ đã hoạt động.
- T09: Contact bỏ dữ liệu mẫu và claims; profile Guest me. Registerformrỗng hiện lỗi đúng ô, không tạo user; Login/403/404 đang nghiệm thu giao diện. Chưa kiểm toàn bộ filter/detail/bookflow Public trong đợt này.
- T10: frontend72/build PASS, lint0lỗi8cảnhbáocũ; backend1178/10014/Pint227 trước fixture. Snapshotdev20bảng16migration không đổi; cleanup fixture ghi ở Plan khi kết thúc. Có lỗi chunk404 chủ động do thaybuild trong phiên, reloadphục hồi; không coi toàn bộ console phiên cũ sạch lỗi.

Đây là một đợt tích hợp layout, chưa là releaseGo hoặc nghiệm thu FullMVP. Những dòng Chưa ở trên vẫn là ca cần chạy/triển khai, không bị xóa khỏi matrix.

### AG-T11 — Trang chủ, các khối Antigravity3–7

Sau checkpoint UI1950d1a/rooms562bc67/publiceaf73d3, tiếp tục Home trong AG-UI-04: giữ API/form hiện có; thêm lợi ích, chi phí chưa công bố, bốn bước tìm hiểu, tòa nhà có phòng công khai và CTA cuối trang theo source. Không khôi phục giá/ảnh/hotline/lịch hoặc cam kết mẫu.

Ca cần kiểm tra: (1) DB test21phòng công khai, Home hiện đúng tổng và6card đầu theo prototype; roomoccupied/private không xuất hiện. (2) Hero chọn tòa và ngân sách → querysnake_case đúng, list thật; tòa showcase link cùngbuilding_id, khôngbuildingId. (3) Đủ7khối, nguồn Antigravity không đổi, phí chưa công bố khácgiá0; không gọiđặt lịch/kýonline đã hoạt động. (4) Desktop1440 vàMobile390/640/768: không tràn, card/CTA/cột hợp lý. (5) Empty thật sau dọn fixture; error/retry giữ xử lý cũ, abortguard không mất. Kiểm tra tự động/build/lint và ghi riêng ca browser chưa thực hiện.

AG-T12 P0 — ô chọn tòa khi options tải bất đồng bộ: đã tái hiện trước sửa, URLbuilding_id=30 nhưng dropdown hiển thị Tất cả sau options200. Select dùng register không kiểm soát giá trị; option tạm bị thay khi có danh sách thật khiến native DOM chọn optionđầu. Đổi riêng building_id sang Controller của RHF để giá trị form điều khiển select. Cần kiểm: đi từ Hero/showcase, tải URL trực tiếp vàF5 giữ tòa; bấmÁp dụng không mất building_id; đổi tòa thànhTấtcả vàXóa bộ lọc vẫn xóa đúng. Không sửa schema/endpoint/SQLfilters hoặc số tiền; NodeURLtests vẫn giữ nguyên, không dùng unit chuỗi thay browser cho lỗi DOM này.

ChốtAG-T11/12:72test/build PASS/lint0lỗi8cảnhbáocũ. Browser đã thấy6card/tổng21/7section, Hero/showcasequerycanonical, filters503→error→restorebyte/hash→Thửlại loading→dữ liệu thật hồi phục. Controllergiữtòa sauoptionsloaded/Áp dụng/F5; Tấtcả vàclear xóaquery đúng. SaucleanupHome0phòng/0fixture vẫn7section. Ảnh/log ignored ở backups/antigravity-integration-20261027; không nghiệm thu giá công khai/ảnh/booking hoặc mọi tổ hợpfilter. Public768và1024bản cuối đã xác minh sửaheader; SettingsskinDesktop/Mobile/invalid0 đã kiểm, valid-save chỉ có bằng chứng lịch sử§12.20, chưa chạy lại trong đợt này. Chi tiếtcleanup/snapshot/localcommits tại Plan§12.23.

Kết quả LEASE-C 28/10: LC-T01 quyền/CSRF live API PASS; locked Admin chỉ Feature. LC-T02 terms NULL 422 bởi browser cọc0; none/duplicate waiver UI/1.50 UI/fixed API/snapshot chỉ đọc PASS. LC-T03/04 nhận cọc/kích hoạt/held edit-delete/F5 PASS. LC-T05 thấp/cao/vacancy/order chỉ Feature, chưa browser gap thật. LC-T06 Feature/hai process PHP + API PASS. LC-T07 revision cũ browser409 và pending chung PASS, chưa giả lập response đảo. LC-T08 modal Desktop/Mobile, 503 rồi phục hồi, hết phiên PASS; chưa giả lập mất mạng riêng. LC-T09 cleanup/snapshot dev nguyên vẹn PASS. Số cuối1212/10274/Pint232; frontend78/build/lint0 lỗi8 cảnh báo cũ. Chi tiết/giới hạn tại Plan §12.24; không nâng ca chưa chạy thành PASS.

Kết quả U1 28/10: A01 quyền/CSRF và input live API PASS, locked Admin chỉ Feature. A02 hai tòa giá riêng, trùng422 và live race201+422/đúng một dòng PASS. A03 D33 đúng tòa + issued snapshot chỉ Feature PASS, chưa live MTR. A04 copy lịch sử/rollback/legacy503 Feature PASS; chưa browser503. A05 options23tòa qua2trang/URL/F5/phân trang21dòng PASS, Back/response đảo chưa chạy. A06 save3500/4200 ở hai tòa/invalid0-ngày02/duplicate giữ input/pending/expired session browser PASS; Đóng/Escape đã thử. A07 tab chi tiết tòa/phân trang/link scope/tòa rỗng và Desktop/Mobile PASS theo phạm vi Plan§12.25; chưa browser đối chiếu trực tiếp prototype U1. A08 cleanup theo manifest/schema global/dev snapshots nguyên vẹn PASS. Backend1219/10529/Pint233; frontend80/build/lint0lỗi8cảnhbáocũ. Log/ảnh ignored backups/utility-scope-20261028.
