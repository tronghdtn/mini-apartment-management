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

## MTR — nguồn brief§30, DB-D15/24–28/33–35/37/63/65/68

Đang nghiệm thu, không nâng ca chưa chạy thành PASS. DDL/Feature/concurrency tuần tự trước browser/live fixture; Root điều phối cùng ba agent Luna. Không test schema khi manifest MTR tồn tại.

| ID | Luồng/điều kiện | Bằng chứng cần có |
|---|---|---|
| MTR-A01 P0 | Guest401, bốn vai trò403, locked Admin hủy phiên, CSRF419; list/context/store | Feature + live API |
| MTR-A02 P0 | Initial100→112.35, giá3500→43225; HALF_UP3501×0.5→1751, tiêu thụ0/ngày đo thực cũ nhập trễ | Feature + API/UI theo ca |
| MTR-A03 P0 | Giá đúng tòa/kỳ, giá cũ giữ snapshot, thiếu giá không fallback; D33 chặn sau ghi | Feature + live API |
| MTR-A04 P0 | Decimal chuỗi/precision/âm/date/period/unknown IDs; cấm tiền/owner/kind/final client | Feature + Node + API/UI |
| MTR-A05 P0 | Thiếu kỳ/mốc, ngày bàn giao, khoảng cắt hợp đồng, legacy thiếu final/gap, vacancy tách riêng | Feature; chưa coi closure fixture là API thanh lý |
| MTR-A06 P0 | Dòng thứ2 sai rollback dòng1; trùng lượt/trùng kỳ; không tạo invoice/payment | Feature + API/UI |
| MTR-A07 P0 | Hai process ghi trùng201/409; U1 versus MTR khóa service/giá đọc hiện hành; issued invoice bất biến | Concurrency/Feature + live đọc lại |
| MTR-A08 P1 | Lọc room/building/service/period/kind,21dòng phân2trang, URL/F5/Back/options23phòng | Browser + API/Node |
| MTR-A09 P1 | Source/chính thức Desktop1440/Mobile390, single/batch/context422/pending/expired/error-retry | Browser; U2 tab chưa API không có mẫu |
| MTR-A10 P0 | Fixture chỉ DB/account test, xác minh sở hữu, cleanup schema/manifest, dev snapshot nguyên vẹn | Root |

Kết quả MTR28/10: A01 quyền/CSRF live PASS, locked Admin chỉ Feature. A02 lưu100→112.35/43225 browser + API PASS; HALF_UP/zero/nhập trễ chỉ Feature. A03 hai tòa43225/51870 và D33 live PASS, thiếu giá browser PASS. A04 unknown/forged/decimal/date/period live/Feature/Node PASS; lower reading đúng ô browser. A05 chuỗi/legacy/vacancy chỉ Feature, chưa có API thanh lý. A06 batch lỗi không ghi một phần live/Feature PASS; browser thử lỗi rồi sửa lưu2dòng35250/60000, không invoice/payment. A07 hai process và live race201/409/đúngmộtdòng PASS; issued snapshot chỉ Feature. A08 lịch sử21/trang2/kỳ01-2025/F5/options25phòng browser PASS, Back chưa chạy. A09 Desktop1440/Mobile390/scrollWidth382/single-batch/context422/Hủy-Escape/pending PASS; chưa expired-session/503retry/responseđảo riêng MTR. Ô date do công cụ fill không phát onChange; ArrowUp/Backspace phát sự kiện, xóa URL và tải đúng lịch sử, không sửa code để né test. A10 cleanup fixture/schema/manifest và dev snapshot20bảng16migration khớp PASS. Backend1257/11013/Pint244, frontend83/build/lint0lỗi8cảnhbáocũ. Chi tiết/ảnh/log và giới hạn tại Plan§12.27.

## U2-03 — ảnh chỉ số private và duyệt, brief§32 (đã tích hợp DB test28/10)

Root browser bằng CUA; ba agent Luna chuẩn bị review nguồn, sau fullsuite mới chia live API theo account/phòng riêng. Không setup fixture trước khi PHPUnit kết thúc; không gọi test nguồn/unit là live PASS.

| ID | Ai/điều kiện/thao tác | Kết quả và mức bằng chứng cần có |
|---|---|---|
| U2-A01 P0 | Guest, user/technician/guard/resident khác, Admin; list/context/store/detail/photo/review, body sai | 401/403 đúng trước validation, own-only, locked hủy phiên, CSRF419; Feature + live |
| U2-A02 P0 | Resident active gửi ảnh/số/kỳ/ngày thực, GET/F5 | pending+metadata private, đúng contract/room/submitter, chưa official/invoice/payment; Feature + browser/API |
| U2-A03 P0 | Thiếu field/file, MIME giả/đuôiSVG/5MB±1, âm/precision/kỳ02/ngày đo, forgedowner/tiền/status | 422, không file/request thừa; giới hạn và kiểu chuỗi, Unicode reason an toàn; Feature + Node + live |
| U2-A04 P0 | Cùng phòng/service/kỳ pending, reject rồi gửi lại; lọc status/period/room/page/0-1-21dòng | trùng409, rejected giữ lịch sử/ảnh, resubmit được, phân trang/scope đúng; Feature + API/browser |
| U2-A05 P0 | Admin approve, lặp, reject/approve trạng thái xử lý | một official43225, actor/time/ID nguyên khối, replay không thay time/ID, chuyển ngược409; Feature + API/browser |
| U2-A06 P0 | MTR đã ghi trực tiếp, thiếu giá/ảnh/mốc, contract terminated/đổi người, issued hóa đơn | không partial approve hoặc gán người mới, giữ pending; MTR liên quan + Feature/API |
| U2-A07 P0 | Hai process approve/approve, approve/direct, approve/reject | cùng khóa phòng, không duplicate, trạng thái/tham chiếu nhất quán; concurrency + live race theo lane |
| U2-A08 P0 | Ảnh owner/Admin/khác/guest, local/public URL, thiếu file/metadata | stream MIME thật nosniff/private-no-store, không path, không public bypass; Feature + live/browser |
| U2-A09 P1 | Desktop/Mobile Resident form/Admin queue, lỗi field, pending, ảnh, modal/reason/Escape, F5/expired/error-retry | thao tác thực, giữ Antigravity, không success giả; ghi riêng ca chưa chạy |
| U2-A10 P0 | Chỉ SQL identity test, setup/cleanup sở hữu file+DB+schema, missing schema | 503 trước query ID, không dev migration, dev snapshot nguyên vẹn; Root + Feature |

Kết quả: A01 root live48điểm quyền/CSRF/owner PASS, locked hủy phiên chỉ Feature. A02 Resident gửi112.35/ảnh private→pending/F5, Adminapprove→official#48/43225 và Resident đọc lại PASS. A03 invalidfields/MIME/textgiảJPG/SVG/>5MB/âm/precision/date/period live422, owncount0; giới hạn đúng5MB chỉ Node, không nâng thành live. A04 duplicate409/reject/resubmit/history live PASS, status/room browser PASS; U2 paging>20 và periodfilter browser chưa thử. A05 approve/replay/invalidtransition live + Feature PASS. A06 missingphoto/directalreadyrecorded/terminated Feature PASS; thiếu giá/issued thuộc MTR Feature, chưa lặp toàn bộ qua U2/live. A07 ba races bằng hai process PASS, hai Adminapprove live200/200/cùngID-time/mộtdòng. A08 owner/AdminPNG200/nosniff/no-store-private, Guest401/sai chủ403 live PASS; framework signed/local/public chỉ foundation Feature. A09 emptyform/lowerreading đúngô/pending/ảnh/mobile/approve/rejectreason/F5 PASS; ca hết phiên browser chưa xong (chọn ảnh chậm/tab phụ loading), 503retry/mấtmạng/responseđảo chưa chạy. A10 audit7file=7metadata/invoice0/payment0, cleanupfile+schema+manifest+ownedIDs, dev20bảng16migration khớp PASS. Full1269/11243/Pint252, frontend85/build/lint0lỗi8cảnhbáocũ. Lỗi môi trường500private0700root và413Nginx1MB đã xác định, sửa test setup và chạy lại; không nới validation. Chi tiết/log/ảnh tại Plan§12.28.

## INV-02/03 — hóa đơn tháng xuyên suốt (brief§33, DB-D27/69–72)

Đang nghiệm thu, không đánh dấu ca chưa chạy là PASS. Root browser CUA, ba agent Luna kiểm tra độc lập nguồn/API ở lane riêng. PHPUnit/schema chạy xong trước fixture InvoiceBrowserFixtures; không chạy lại khi manifest đang tồn tại. Chỉ DB/account test, không dev.

| ID | Ai/điều kiện/thao tác | Kết quả cần có và bằng chứng |
|---|---|---|
| INV-A01 P0 | Guest/5vai trò/locked/CSRF, Resident của mình/khác/draft/terminated | 401/403/419 đúng, owner-only, không buộc activecontract; Feature+live |
| INV-A02 P0 | Hợp đồng/tháng đầu/tháng nhuận/quá end dự kiến, service snapshot | rent+recurring theo ngày thực/HALF_UP, không giá danh mục hoặc quantity tự đổi; Feature |
| INV-A03 P0 | Ghi chính thức E/W T−1→monthly T | amount/mốc/giá đúng, thiếu/nhầmowner/final/vacancy không dùng, zero đọc thật vẫn liên kết, không doubleclaim; Feature+live |
| INV-A04 P0 | Tạo draft/kỳ tương lai/trùng/nguồn thay đổi/refresh | UNIQUE409, refresh giữ manual, issue nguồn đổi409, day01 VN; Feature+live/browser |
| INV-A05 P0 | Admin thêm/sửa/gỡ other với tên/tiền/basis, stale revision | 422/409, audit append không mất lịch sử, Resident thấy căn cứ, unknown source không issue; Feature+live/browser |
| INV-A06 P0 | Phát hành thật và tổng0 | INV-ID/due snapshot/bất biến, zero paid0 không payment/RCP; Feature+live/browser |
| INV-A07 P0 | Hủy/lập lại, pending/confirmed/rejected payment | D27 giữ lịch sử/nhả readings/related ID; pending/confirmed409. Zero paid0 không payment được hủy/lập lại theo D27; Feature+live |
| INV-A08 P0 | Hai process create/create, issue/issue, issue/cancel | một invoice/kỳ và một trạng thái cuối, không partial; test cạnh tranh + live |
| INV-A09 P1 | Admin/Resident list/detail/Desktop1440/Mobile390/Antigravity | route thực, RHF invalid, pending, F5/filter/paging/error/auth; không mock KPI/payment; browser, ghi giới hạn riêng |
| INV-A10 P0 | final/adjustment draft, schema thiếu, fixture cleanup | monthly action không ghi đè final/adjustment,503 trước queryID, dev snapshot nguyên vẹn; Feature/root |

## U3 — conditional UNIQUE, DB-D65/68 (schema riêng, không UI)

Đã chạy8test/106assertion trên mysql_test: giữ mọi giá trị cũ khi up; periodic/final riêng cho hai hợp đồng cùng phòng/tháng; trùng periodic cùng hợp đồng/kỳ hoặc vacancy cùng phòng/kỳ; trùng final cùng hợp đồng dù khác kỳ; final NULL bị CHECK chặn; sai/thiếu owner hoặc nhiều final cũ dừng trước DDL; metadata generated STORED/VARCHAR/FK RESTRICT; safe down giữ nguyên dòng và unsafe down không mất lịch sử. Fullsuite1227/10635 PASS, test schema khôi phục baseline; snapshot dev nguyên vẹn. Chưa có bề mặt HTTP/UI U3 nên không gán các test này thành nghiệp vụ MTR/thanh lý đã chạy. Chi tiết lỗi cleanup đã sửa và giới hạn ở Plan§12.26.

Kết quả INV28/10: A01 live auth77điểm quyền/CSRF/owner PASS; locked và terminated owner chỉ Feature. A02 proration/tháng nhuận/snapshot/quáend chỉ Feature PASS. A03 API MTR2dịch vụ→invoiceT đúng3.178.475, liên kết/nhả/lập lại không doublecharge PASS; zero readings/missing/foreign chỉ Feature. A04 draft/trùng/refresh giữmanual/sourcechanged/futureday01 Feature PASS, live duplicate/refresh/stale PASS; browser future chưa thử. A05 live add/edit/remove3audit/Residentbasis/invalid/stale PASS; browser thiếufield/lưu/F5 PASS, chưa browser edit/remove/stale. A06 browser phát hành tổng3.278.475 và0đpaid0 PASS; audit payment0. A07 live hủy/lập lại/giữsnapshot PASS, paymentguards chỉ Feature. A08 ba races process PASS, livecreate201/409 vàissue200/409 PASS; chưa race confirm/cancel do PAY chưa triển khai. A09 bốn màn Desktop/Mobile/F5/Residentfilter/empty/navigation/form/pending PASS, chưa browser expired/network/503/paging>20/Back/responseđảo. A10 monthlytypegates Feature PASS, cleanup schema/ID/manifests và dev20bảng16migration nguyên vẹn PASS; invoice riêng missingtable503 chưa thêm test chuyên biệt. Full1285/11460/Pint262, frontend88/build/lint0lỗi8cảnhbáocũ. Lỗi harness prefix/account/kỳ vọngrole và chunkcũ đã xác định; không đánh thành bug nghiệp vụ. Plan§12.29 ghi chi tiết và phần thiếu.

## PAY-02/03 — thực nhận và minh chứng (brief§34, DB-D27/70)

Đang nghiệm thu: không chạy PHPUnit/schema khi PaymentBrowserFixtures còn manifest. Chỉ MySQL/account test; M19 áp dụng tường minh sau fullsuite. Root CUA Desktop1440/Mobile390 và ba agent Luna liveAPI riêng lane; online/provider/cọc do CLOSE không thuộc khoản thu trực tiếp này.

| ID | Ai/điều kiện/thao tác | Kết quả cần kiểm và bằng chứng |
|---|---|---|
| PAY-A01 P0 | Guest5vai trò/locked/CSRF, own/foreign/terminated contract | 401/403/419, owner-only list/detail/proof/submit kể cả nợ cũ; Feature+live |
| PAY-A02 P0 | Resident proof amount/file valid, đọc lại/F5 | pending không giảm nợ/reserve/sinhRCP; servermethod/submitter, photo private; Feature+API/browser |
| PAY-A03 P0 | thiếu/giả MIME/size/âm/thập phân/Boolean/owner/status/deposit/receipt | 422, không file/payment thừa; Field errors và tiền nguyên; Feature+Node+live |
| PAY-A04 P0 | Admin confirm exactamount/ack/revision/ảnh còn | partial→paid/tổngconfirmed, RCP/actor/time server, replay một tiền/mộtRCP; Feature+live/browser |
| PAY-A05 P0 | Admin cash/bank direct, stale/doubleclick | explicitrealreceived, invoice revision, no proof; khôngdeposit/providerfake; Feature+live/browser |
| PAY-A06 P0 | Reject thiếu/lý do/historystatus, canceledhistory | reasonbắtbuộc, giữfile/row, khôngRCP/nợgiảm/đổi confirmed; Feature+live/browser |
| PAY-A07 P0 | draft/paid0/cancel/overbalance/corruptledger/missingproof | chặn/giữpending/rollbackfile, không tựheal/cắtamount, invoiceitems/total/due bất biến; Feature+live |
| PAY-A08 P0 | Process sameconfirm/competingconfirm/cashcash/confirmcancel/proofcancel | ledger/receipt/file/cancel nhất quán, commonparentlocks và actor hiện hành; concurrency+live theo ca |
| PAY-A09 P1 | ADM18/panelAdminResident list/filter/page/privatepreview/form/errors/DesktopMobile/F5 | Antigravity/khôngmẫu/khôngfrontmath, statepending, lỗi thật/auth/409/503/responsecũ; browser ghi giới hạn |
| PAY-A10 P0 | thiếuM19/schema, cleanup ID/file/metadata/manifest/devsnapshot | 503trướcqueryID, exactownership, không devmigration; Feature/root |

PAY-02/03 — kết quả thực chạy 28/10: PAY-A01..08/API và Feature PASS theo phạm vi quyền, input, pending/confirmed/rejected, biên nhận, bất biến invoice và process races; PAY-A09 browser Desktop Admin payment list/detail/direct-cash/RCP và Resident invoice/payment form đọc trạng thái PASS. Chưa thao tác được Resident file-picker submit trong CUA, chưa kiểm viewport Mobile riêng; file thật và policy đã kiểm qua live API/test. PAY-A10 cleanup fixture/ảnh/metadata, Nginx hash gốc và dev snapshot 20 bảng/16 migration nguyên vẹn PASS. Full backend1298/11694; Pint272; frontend91/build/lint PASS (0 lỗi, 8 cảnh báo cũ; main chunk602.19KB). Không có VNPAY/Sandbox thật; không migration dev.

## DEBT-01 — ADM-19 Công nợ riêng, Q12

| ID | Ưu tiên | Tình huống | Kết quả cần kiểm và bằng chứng |
|---|---|---|---|
| DEBT-A01 | P0 | Guest/resident/technician/guard/locked/Admin | Chỉ Admin active đọc; lỗi401/403 phù hợp, không lộ invoice/tenant data |
| DEBT-A02 | P0 | issued/partial/paid/zero/draft/cancelled, multiple invoice/contract | Gom đúng theo contract; chỉ balance>0; exclude draft/cancelled/paid/zero |
| DEBT-A03 | P0 | pending/confirmed/rejected payment, stale/corrupt cached amount | Pending/rejected không giảm; confirmed ledger là nguồn nợ đã ghi nhận; summary/invoice一致 |
| DEBT-A04 | P0 | due today, overdue yesterday, future due, VN timezone | Chỉ due_date trước ngày VN là quá hạn; summary, tab và invoice label cùng quy tắc |
| DEBT-A05 | P1 | terminated/soft-deleted contract/tenant | Nợ lịch sử vẫn xuất hiện và mở đúng invoice; không truy cập dữ liệu khác |
| DEBT-A06 | P1 | literal search, invalid filter/page, pagination/empty/error | wildcard là literal, validate 422; summary global ổn định qua filter/page; loading/error/empty rõ |
| DEBT-A07 | P1 | UI Admin Desktop/Mobile, link to contract invoice filter, F5/Back | Antigravity layout giữ nguyên; số lấy từ API; mobile/table scroll; không mock |
DEBT kết quả29/10: Feature5/73PASS bao gồm quyền/nợterminated/pending/filterliteral/ngàyVN/pagination21/precisionchuỗi/linkinvoicecontract. Full log1302/11753PASS trước bổ sung ca mới; frontend93/build/lintPASS; Pint277PASS. DEBT-A07 browser chưa chạy: công cụ bị tắt trong Work settings, không đánh PASS.

CLOSE-02a: POST closure-preview chỉ Adminactive, Guest401/role403/locked403/CSRF419; invaliddate/thiếulýdo/forgedfee422; state/stalerevision409; missing404; same_day0/earlyfixed2000000/đúnghạn0/quáhạn0; DBcontract/room giữ nguyên, invoices/payments/meters0. Feature3test và calculator23test tổng26/98PASS. Frontend94test/build/lintPASS, browser bịtắt chưa nghiệmthu. Fullsuite/Pint kết quả ghi tại Plan§12.32.

NOTIF-02/03 (DB-D73): N01 own list/read của 5vai trò, không Admin override, locked/guest/CSRF/422; N02 invoiceissue→notification sau commit, rollback không gửi, actual directcash→paymentconfirmed notice và replay không thêm, dedup giữ read_at; N03 M20JSON/UUID/privatepayload/linkexternalnull/missing503/down từchối history; N04 paging21/unreadglobal đúng owner. Targeted4/125PASS. Hooks contract/U2 đã code, chưa có test liveAPI chuyên biệt cho từng nguồn trong đợt này; chưa VIEW/MAINT. Browser vẫn bịtắt, không gán browserPASS. Fullsuite/style kết quả cuối tại Plan§12.33.

## VIEW — lịch xem phòng, DB-D77 (30/10/2026)

| ID | Mức | Luồng và tiêu chí |
|---|---|---|
| VIEW-A01 | P0 | Khách đặt phòng public available; APT theo ID, UTC đúng, không lộ IP/user_id/admin_note; phòng ẩn/occupied/maintenance từ chối |
| VIEW-A02 | P0 | Khung giờ08:00–20:00 VN, tương lai, ngày thật/offset, TIMESTAMP giới hạn; trường giả/phone/name/honeypot/CSRF; 5attempt/giờ/REMOTE_ADDR không tin Forwarded |
| VIEW-A03 | P0 | Một phone/room có một pending/confirmed, hai process201/409; hủy giữ lịch sử và cho đặt mới |
| VIEW-A04 | P0 | Owner chỉ xem/hủy của mình trước giờ và check-in; foreign không đọc; locked403; Guest không public lookup |
| VIEW-A05 | P0 | Admin confirm/reschedule→pending/reconfirm/cancel; không đổi sau check-in, không confirm lịch quá giờ; complete sau check-out |
| VIEW-A06 | P0 | Guard chỉ confirmed hôm nay VN kể cả khác ngày UTC, check-in trước check-out một lần, actor server, không đổi status |
| VIEW-A07 | P0 | Confirm/cancel→notice chỉ người đặt đăng nhập sau commit; đổi giờ xác nhận lại có notice mới, replay không thêm; khách vãng lai không notice |
| VIEW-A08 | P1 | Lọc trạng thái/ngày/page21, scope chủ, empty/error503/missing-schema; rollback M18 từ chối history |
| VIEW-A09 | P1 | Browser Booking→own history→Admin confirm→Guard check-in/out→Admin complete, F5/Desktop/Mobile/modal/invalid fields; đối chiếu style prototype |

Trạng thái: A01..08 đang được chạy PHPUnit/API; A09 chờ môi trường HTTP test sau fullsuite. Không chạy PHPUnit khi fixture browser tồn tại. Model tester đã được chủ dự án chọn GPT-6 Luna, không hỏi lại.
VIEW kết quả30/10: full1320/12153PASS trướcphone/linkfinal; cuối14/316VIEW+NOTIFPASS, Pint300, frontend97/build/lint0lỗi8cảnhbáocũ. Browser Desktop1440/Mobile390 luồnguserbook→Adminconfirm/reschedule/reconfirm→Guardin/out; complete bằngAPI, userhistory/readnotification/F5 thật. A09 cònchưa thửnútcompleteUI, prototypebrowserđốichiếu, paging21UI, mạnglỗi/expired; không gánPASS toànbộ. A06 khácngày cóFeature, livechỉdatefilteremptykhôngcólịchtươnglai. Agentflowlỡchạyhaivòngtạo4records, rootbookthứ5; khôngcộngthànhcoverageđộclập, bookingthứ6HTTP429. Safe-linkaccount và queryprefix thôngbáo đãsửa, đọc1sauF5. DọnfixtuređúngID vàdownM20/M18; khôngdevmigration.

RES-02/03 (DB-D36, brief§38) — nhóm đọc hợp đồng:
RCTR-A01 P0 Guest401, admin/user/tech/guard403, locked403; Resident không đọc APIprojectionAdmin.
RCTR-A02 P0 ownactive/historysoftdelete200, draft/foreign404, GET không đổi contract/room/invoice/payment.
RCTR-A03 P0 snapshotfee/waiver/serviceprice/decimal preserved, nointernalnote/CCCD/contactoccupants/actor; catalogpricechange không đổi signedprice.
RCTR-A04 P1 status/page21/empty/filterinvalid422, IDmissing404; schema503 trướcquery.
RCTR-A05 P1 Desktop/Mobile/URL/F5/tabs/back/linkinvoice và thôngbáokíchhoạt tới detail; error/retry/auth, không mockfallback.
Tự động3/66PASS đầu lượt; fullsuite đang chạy, chưafixturebrowser/liveAPI. Không PHPUnit khi fixture tồn tại. ModelQA đã chọnLuna từ trước.

## MAINT — yêu cầu sửa chữa (DB-D74/75/76, Q16)

| ID | Mức | Luồng và tiêu chí |
|---|---|---|
| MAINT-A01 | P0 | Guest/role sai/locked/401-403; Resident chỉ gửi khi active contract và chỉ xem yêu cầu của mình |
| MAINT-A02 | P0 | Priority/title/description/mass assignment/page/filter; 422 input sai, không nhận status/actor/room/contract |
| MAINT-A03 | P0 | 0..5 ảnh JPG/PNG/WebP <=5MB; chặn SVG/6 ảnh/>5MB; private metadata và MIME/nosniff/no-store |
| MAINT-A04 | P0 | Admin chỉnh priority/note, chỉ gán technician active; reject có căn cứ/reopen; conflict 409 |
| MAINT-A05 | P0 | Technician chỉ xem việc assigned; start→resolve đúng trạng thái, resolve cần note; foreign/locked bị từ chối |
| MAINT-A06 | P0 | Q14: tên+SĐT trong pending/in_progress; sau resolved không SĐT; không CCCD/email/hồ sơ |
| MAINT-A07 | P0 | Q17: yêu cầu không đổi phòng occupied khi còn hợp đồng; không sinh khoản thu/hóa đơn giả |
| MAINT-A08 | P1 | Q16: created/assigned/status notifications đúng người sau commit, dedupe và owner-only read |

Kết quả 30/10: MaintenanceRequestApiTest **3/126 PASS**; full Backend **1326/12348 PASS** exit0; Pint **315 file PASS**; frontend **102 test/build PASS**, lint **0 lỗi/8 cảnh báo cũ**. Feature test áp dụng tường minh M17/M19/M20 trên mysql_test và teardown gọi down; không migration dev. Browser MAINT chưa chạy vì Work settings tắt browser; tự động không thay nghiệm thu giao diện.

## CLOSE-02b — kiểm kê hợp đồng

| ID | Mức | Phạm vi |
|---|---|---|
| CLOSE-A01 | P0 | Admin active ghi `no_damage`/`damaged`, ghi chú, actor/time server; hợp đồng active và expected_revision đúng |
| CLOSE-A02 | P0 | 401/403, foreign/locked role, trạng thái không active, stale revision; không ghi kết quả khi lỗi |
| CLOSE-A03 | P0 | 0..5 ảnh JPG/PNG/WebP ≤5MB; chặn SVG/6 ảnh/>5MB; lỗi ghi xóa file vừa upload |
| CLOSE-A04 | P0 | Ảnh disk private, owner/Admin xem; foreign Resident/Technician không xem, `nosniff` và `private/no-store` |
| CLOSE-A05 | P0 | Migration P6 thêm cột nullable/FK RESTRICT trên DB test; snapshot cũ không đổi; rollback sạch |

Kết quả 30/10: `ContractInspectionApiTest` **4/77 PASS**; ContractDraft + ContractLifecycle + ContractInspection **132/1287 PASS**. Full backend **1330/12425 PASS**, 481.99s, exit0; Pint **320 file PASS**; frontend **104 test PASS**, build PASS, lint **0 lỗi/9 cảnh báo**. Full-suite lần đầu phát hiện lookup attachments khi schema P6 thiếu; cổng yêu cầu đồng thời P6 columns và M19 table, test mock được cập nhật; lần chạy toàn phần tiếp theo đạt. P6/M19 được apply/down tường minh chỉ trong mysql_test; không migration dev. Browser trực quan chưa chạy vì local browser bị tắt trong Work settings. CLOSE-A01..05 không kiểm thử damage lines, final invoice hoặc đối soát cọc.

## CLOSE-02d — final draft và phát hành

| ID | Mức | Luồng |
|---|---|---|
| CLOSE-D01 | P0 | Admin/cookie/CSRF; 5role, locked, stale/missing, không mass assignment giá/phí/tổng/actor |
| CLOSE-D02 | P0 | Inspection→damage/ảnh private hoặc no_damage; miễn toàn bộ đúng snapshot+ảnh/căn cứ |
| CLOSE-D03 | P0 | Final meter+invoice/contract fields nguyên tử; lỗi/overflow rollback SQL và ảnh mới |
| CLOSE-D04 | P0 | Không tính lại periodic/rent đã thu; cancelled không che live monthly; giảm trừ và other không âm/phần dư ngoài hệ thống |
| CLOSE-D05 | P0 | Issue bất biến,0đ paid không payment giả; contract/room/cọc chưa terminate/settle |
| CLOSE-D06 | P0 | Cancel/reissue reuse chỉ số/ảnh, không final thứhai/không lặp; quyền ảnh và scope Resident |
| CLOSE-D07 | P1 | UI preview/create/confirm/F5/recovery/link/validation/mobile, kết quả thật qua Nginx DBtest |

Trạng thái đang nghiệm thu30/10 tại Plan§12.39; chưa đánh dấu live/browser/fullsuite hoàn thành.

Kết quả chốt30/10: full Backend1351test/12791assertionPASS (480.64s,exit0), Pint327filePASS; frontend110test/buildPASS/lint0lỗi9cảnhbáocũ.19liveHTTP cookie/CSRF/privateảnh/0đ/reissue và12tìnhhuốngbrowser lõi đã xác minh theoPlan§12.39. Hai ca tranh chấp HTTP trên2phiên độc lập: finalcreate→201/409, reissue→201/409, giữ đúng2finalmeter; không cộng chúng vào sốPHPunit. Hai lượtfixture đã dọn/downpendingchỉDBtest, dev20bảng/16migration/checksumtoànbộgiữnguyên. Chưa settle/terminate, chưa browser filechooser/offline/other-refund, chưa kiểm thử finaldev. Screenshot chỉ fixture và đã dọn; không gọi toàn bộCLOSE hoặc FullMVP hoàn thành.

## CLOSE-02e — đối soát cọc và trả phòng (30–31/10)

| ID | Mức | Tiêu chí và bằng chứng |
|---|---|---|
| CLOSE-E01 | P0 | Cọc held đủ/thiếu/dư/unpaid/0; ưu tiên due_date rồi ID; không trừ lại fee/damage; khoản hoàn final tách cọc. Feature/HTTP PASS |
| CLOSE-E02 | P0 | Sum confirmed khớp paid; pending không giảm nợ và chặn; rejected không giảm nợ; thay cash/pending/reject làm revision cũ409. Feature/HTTP/browser PASS |
| CLOSE-E03 | P0 | Transaction payment deposit/RCP+invoice+deposit+contract+service end+room; lỗi lưu phòng rollback; final0không fake receipt; giữ resident/nợ; không PII. Feature/HTTP PASS |
| CLOSE-E04 | P0 | Replay không payment/notice mới, không trả lại phòng khách mới;6racehai tiến trình thật (terminate, pending, cash, confirm, cancel final0, cancel monthly chưa payment) và2racecookieHTTP PASS |
| CLOSE-E05 | P1 |12case browser theo Plan§12.40: checkbox/stale/doubleclick/F5/mobile/pending/link, Nginx test mất kết nối/phục hồi, upload inspection/damage/waiver→issue→đối soát/giữ nợ PASS |
| CLOSE-E06 | P0 | DB-D79: chặn hủy mọi invoice sau terminated, kể cả monthly chưa payment. Regression/HTTP409/ledger bất biến PASS; Admin-only contract_status, Resident không có trường này; browser ẩn Hủy/cảnh báo điều chỉnh và nhãn Đã thanh toán PASS |

Backend checkpoint5818098: full1373/13210/Pint336 PASS; frontend114test/build/lint0lỗi9cảnhbáocũ.35HTTP và2HTTP races mới, không thay kết quả lịch sử CLOSE-D. Browser filechooser nay đã thử; offline chỉ kết nối Nginx test, chưa thử OS offline/đảo response/mất response sau commit. Chưa chốt dọn fixture/dev comparison hoặc nghiệm thu dev tại mốc này. Chi tiết/artifacts Plan§12.40.

**CHỐT31/10:** CLOSE-E01..E06 PASS trong phạm vi đã ghi. Full cuối1375/13256/Pint336; frontend114/build/lint0lỗi9cảnhbáocũ;36HTTP/13browser,6raceprocess trongPHPUnit và2raceHTTP riêng. Đã dọn fixture và khôi phục pending schema DBtest; devsnapshot identity/metadata/data/migrations khớp20bảng/16migration, RUN_MIGRATIONS=false. TệpMTRconcurrencyprivate cũ28/10 được giữ nguyên. Chưa kiểm tra OSoffline/đảo response/mất response sau commit hoặc nghiệm thu dev. Không gọi toàn bộCLOSE/FullMVP/UI52màn hoàn thành.

## CLOSE-03 — hành trình liên module (31/10/2026)

| ID | Mức | Tiêu chí / trạng thái |
|---|---|---|
| CLOSE-F01 | P0 | Nháp→terms→deposit→activate→monthly đầu→periodic→monthly sau→inspection→final: 2 kịch bản HTTP-kernel/180 assertions PASS; có cọc dư hoặc nợ còn lại |
| CLOSE-F02 | P0 | Pending không giảm nợ và chặn close; confirm/reject làm revision cũ409; invoice snapshot bất biến; hủy sau đóng409; 46 kiểm tra HTTP thật qua Nginx test PASS theo phạm vi Plan§12.41 |
| CLOSE-F03 | P0 | Cho thuê lại phòng bằng API và mốc final thật; replay hợp đồng cũ không trả phòng; chủ cũ được thu tiếp nợ cũ nhưng không đọc hợp đồng chủ mới: Feature/HTTP PASS |
| CLOSE-F04 | P1 | 9 tình huống browser đọc kết quả/F5/công nợ/lọc/search/mobile/linkscope/invoiceguard/nhãn cột PASS; chi tiết Plan§12.41. Không phải toàn bộ wizard tạo mới bằng React |
| CLOSE-F05 | P0 | Dev migration/data invariant + postflight cuối: đang chờ fullsuite và so sánh; không migration dev |
| CLOSE-F06 | P1 | Chạy toàn bộ wizard/liên module trên dev: CHƯA, cần phê duyệt schema riêng; không suy PASS từ DB test |

Pint337file và frontend114test/build/lint PASS (9cảnhbáocũ); full Backend đang chạy. Ca bản deploy thay assets khi tab cũ mở tái hiện lỗi lazy module rồi reload phục hồi; chưa gọi đây là kiểm thử deploy thành công. Fixture HTTP đã dọn trước fullsuite, hai container test trả về stopped. Không cộng số kiểm tra HTTP/browser thành số PHPUnit.

**Chốt lượt tự động31/10:** full đầu1376PASS/1FAIL do timeoutREADY của race U2; giữ nguyên test. Riêng race3/44PASS, full tiếp theo1377/13436PASS,505.61s,exit0. Không gọi đã tìm/sửa căn nguyên timeout. CLOSE-F05 đạt cho giai đoạn trước nâng cấp dev: postflighttest0data/pendingrestored và snapshotdev nguyên vẹn20bảng/16migration. CLOSE-F06 vẫn chưa nghiệm thu toàn bộ wizard trên dev. Chủ dự án vừa duyệt gói vận hành A tại DBplan§21; phê duyệt khác với đã thực hiện, chưa nâng trạng thái runtime từ câu trả lời.

**DEV-MVP-01 /31/10:** góiA13migration+SystemCatalogSeeder đã restore/diễn tập/pretend/actualdev và đối chiếu PASS theoDBplan§22/Plan§12.42.29bảng vật lý/29migration, dữliệu cũ giữ nguyên, chỉ2service/8setting;9bảng mới rỗng.4HTTPstateless8080: /HTML200,health200,publicrooms200,me401. CLOSE-F06 vẫn chưa nghiệmthu toànbộ wizard/CRUD cóghi trêndev; không lấy schemaPASS thay thế kiểmthửUI. Full1377/13436 là bộcode chạy trước nângcấp, không có fullsuite mới sau vận hành; testguard/account không thay đổi.

## MAINT — nghiệm thu live31/10/2026 (Plan§12.43)

| ID | Tình huống browser đã quan sát | Kết quả |
|---|---|---|
| MAINT-B01 | Resident gửi form thiếu tiêu đề/mô tả: lỗi đúng trường, không tạo yêu cầu | PASS |
| MAINT-B02 | Resident gửi sự cố urgent kèm PNG thật qua filechooser; chi tiết hiện ảnh private | PASS |
| MAINT-B03 | Resident F5 sau tạo: giữ phiên/yêu cầu/ảnh | PASS |
| MAINT-B04 | Admin nhận đúng thông báo created, mở đúng chi tiết | PASS |
| MAINT-B05 | Ghi chú Admin65.536 byte bị chặn tại form; ghi chú hợp lệ/đổi ưu tiên lưu thành công | PASS |
| MAINT-B06 | Admin danh sách Tất cả sau sửa: tải đúng yêu cầu thay vì lỗi422 | PASS |
| MAINT-B07 | Admin chọn/phân công technician active; không có technician locked trong lựa chọn | PASS |
| MAINT-B08 | Technician danh sách Tất cả: thấy đúng việc được giao và mở chi tiết | PASS |
| MAINT-B09 | Technician thấy SĐT ở pending, bấm Bắt đầu xử lý thành in_progress | PASS |
| MAINT-B10 | Hoàn tất thiếu ghi chú bị chặn; nhập ghi chú hợp lệ thành resolved | PASS |
| MAINT-B11 | Sau resolved, giao diện Technician không còn SĐT hoặc thao tác xử lý | PASS |
| MAINT-B12 | Sau HTTP reopen, Admin từ chối thiếu căn cứ bị chặn; có căn cứ thành rejected | PASS |
| MAINT-B13 | Resident danh sách Tất cả sau sửa: đúng yêu cầu/trạng thái rejected | PASS |
| MAINT-B14 | Resident nhận6 thông báo trạng thái đúng yêu cầu; link/F5 giữ căn cứ/ảnh và trạng thái cuối | PASS |

MAINT-A01..08 đã có bằng chứng mới bổ sung: HTTP15+12+6 kiểm tra PASS và1race hai phiên resolve200/409 PASS. Bao gồm owner/role/locked/CSRF, private ảnh, UTF-8 dung lượng, tham số status rỗng422/không gửi status200, assignment/status notifications sau commit không trùng, reopen và conflict khi rejected. Không ghi reopen/race thành thao tác browser. Regression MAINT/NOTIF8/300 và frontend116/build/lint0lỗi9cảnhbáocũ PASS; full Backend1378/13485/Pint337 PASS (599.02s,exit0); hậu kiểm DB test/dev đạt, chốt Plan§12.43. Biên upload5ảnh sát trần chưa kiểm; cấu hình nguồn20MB cần đối chiếu với5×5MB ở FILE-03.

Artifacts khôngGit: `backups/maintenance-qa-20261031/`, ảnh `technician-resolved.png` và `resident-after-f5.png`, HTTP JSON và log tự động. Fixture đã dọn đúngID/run, hai HTTP test container dừng; không ghi/migration dev. Mobile/OSoffline/mất response sau commit CHƯA kiểm trong đợt này. Không gọi toàn bộ bảy UI, toàn bộ NOTIF hoặc toàn bộ FullMVP đã hoàn thành.

## NOTIF-B — kế hoạch nghiệm thu 01/11/2026 (DB-D73/81, brief§36)

Danh sách đã lập trước chạy; kết quả mới dưới đây/Plan§12.45. Chỉ DBtest, không dữ liệu dev; nguồn UI là sự kiện nghiệp vụ thật trên fixture test, không broadcast giả.

| ID | Mức | Tình huống/tiêu chí |
| --- | --- | --- |
| N-B01 | P0 |5vai trò chỉ list/read/read-all own; Admin không override, wrong morph/foreign giữ nguyên; guest401/locked403/CSRF419/input422/schema503 |
| N-B02 | P0 | read-all mọi trang21+, marked_count đúng, replay0, read_at/updated_at đã đọc không đổi; tranh chấp read/read-all không ghi lại thời điểm |
| N-B03 | P0 | Chuông Admin/Resident/Staff vào đúng vùng; user có workspace trong account, Guard có empty thật; không fake nguồn cho Guard |
| N-B04 | P0 | Xem chi tiết đánh dấu xong mới điều hướng đúng role/owner; read lỗi không tự mở, F5/Back giữ read_at; đã đọc không gửi lại POST |
| N-B05 | P1 | all/unread,21+/trang cuối/empty; đọc dòng cuối hoặc đọc tất cả từ unread trang2 không hiện Trang2/1; URL/F5 và prefix account không đụng lịch hẹn |
| N-B06 | P1 | tải503/retry giữ status/page hợp lệ; tham số sai có lỗi/reset; session hết hạn/locked không hiện dữ liệu cache sai user |
| N-B07 | P1 | Mobile390, nội dung thực/link/nút/bảng không tràn toàn trang; loading/error/empty/timestampVN, ảnh bằng chứng |
| N-B08 | P0 | Nguồn MAINT/invoice/viewing đúng người sau commit; không thay hóa đơn/cọc/phòng khi đọc thông báo; cleanup đúng fixture, snapshotdev bằng nhau |

## FILE-03 / PAY-B — nghiệm thu 31/10–01/11/2026

Nguồn DB-D80/brief§34/41/Plan§12.44; mọi ghi trên DBtest. Đây là bằng chứng mới, không thay lịch sử PAY-A/MAINT-A.14 tình huống browser dưới đây đã quan sát sau sửa tương ứng; không tính API replay thành browser.

| ID | Tình huống browser | Kết quả |
| --- | --- | --- |
| PAY-B01 | Form trống hiển thị lỗi số tiền | PASS, không tạo payment |
| PAY-B02 | amount hợp lệ nhưng không chọn proof, trước đây RHF thiếu key lọt schema | PASS sau sửa: Cần một ảnh minh chứng trước gửi |
| PAY-B03 | Chọn PNG thật bằng filechooser, gửi100k | PASS201, modal đóng/lịch sử cập nhật |
| PAY-B04 | Các proof pending không cóRCP/không giảm nợ | PASS,1triệu còn nguyên khi cả hai pending |
| PAY-B05 | Chủ xem/ẩn/mở ảnh private | PASS, ảnh naturalWidth>0; Admin cũng xem được trong dialog |
| PAY-B06 | Resident390×844, preview mở | PASS,pageWidth382≤390, bảng cuộn trong khung; reset viewport sau thử |
| PAY-B07 | Chèn503 đúng POST proof trên vhost test rồi restore | PASS cảnh báo kết quả chưa xác định, kiểmDBkhông thêm payment; đóng/reload lịch sử trước lần tiếp theo |
| PAY-B08 | Admin confirm chưa tick thực nhận | PASS, chặn |
| PAY-B09 | Admin tick và confirm400k | PASS,RCP32/paid400k/nợ600k |
| PAY-B10 | Admin reject thiếu lý do | PASS,chặn |
| PAY-B11 | Reject100k có lý do | PASS,giữ ảnh/lý do,khôngRCP/không đổi paid |
| PAY-B12 | Ghi tiền mặt600k chưa tick | PASS,chặn |
| PAY-B13 | Ghi tiền mặt600k có tick | PASS,paid1triệu/nợ0/RCP34 |
| PAY-B14 | Admin F5 trạng thái cuối | PASS,Đã thanh toán/3historyrows/2RCP/hết thao tác nhận tiền; không đổi biên nhận cũ khi sang tháng |

26 kiểm tra HTTP cuối đều PASS: upload5, pending/quyền/CSRF/MIME12, confirm/replay4, ledger/history/notifications5. Upload gồm5ảnh×5MiB nhận đủ201; >5MiB từng ảnh422;21ảnh cộng damage/waiver422;30MiB+1byte422; body33MiB413JSON. Private proof nosniff/no-store; guest401/rolekhác403; overpayment/forgedconfirmedstatus422; missingCSRF419; replay không thêm tiền/RCP; rejectconfirmed409. Snapshot total/items/due/number không đổi; owner nhận đúng2payment.confirmed; pending/rejected không giảm nợ. Thiết lập giả lỗi đã restore trước đối soát, nginx-t/reloadPASS.

**Sự cố chưa khép nguyên nhân:** POST400k đầu gặp504; FPM201 và hậu kiểm có1pending/paid0. Không resend400k, dùngF5 phục hồi. Chưa xác minh nguyên nhân chậm; cảnh báo mạng mới không phải sửa gốc504. Đây không phải một lần happy-path upload PASS; happy-path bình thường đã thử riêng ở100k. Chưa OSoffline/đảoresponse/mất phản hồi có kiểm soát ngay sau commit; chưa browserwizardfinal21ảnh. Không có provideronline/PDF/tiềnthật/ghi nghiệp vụ dev trong vòng này.

Frontend118/build/lint0lỗi9cảnhbáocũ PASS; nhóm Backend27/565 PASS; full Backend1383/13545 (669.10s,exit0)/Pint338 PASS. Hậu kiểm test0record/schema phục hồi/quyền dev1142; snapshot dev identity/metadata/data/migrations bằng nhau29bảng/29migration. Bốn HTTPstateless dev đạt200health/401me/25MiB401/33MiB413JSON, không cookie/ghi dữ liệu. Fixture7ảnh/3payment/1invoice/1maintenance/7user được dọn đúngrun, giữ file private cũ; haiHTTPtestcontainerdừng và schema test pending khôi phục trước fullsuite. Artifacts ignored `backups/upload-pay-qa-20261031/`:26JSONchecks,logs/configs/manifest/snapshots, `admin-paid-after-f5.png`, `resident-mobile.png`, `uncertain-result.png`.

NOTIF-B kết quả01/11:25kiểm tra HTTP PASS +1kiểm tra accesslog không POST lại itemđãđọc;1race hai phiên read/read-all trên notice lịch hẹn còn unread, delayed replay giữ timestamp. UI5vai trò đã quan sát: chuông3area, Admin21/unread/page2/đọc cuối resetpage/F5/batch từallpage2 đọc20dòngẩn/nút disabled;503GETretrygiữquery và503POSTreadkhôngđiềuhướng, restore rồi mởđúng invoice/MAINT/assigned/appointments; ResidentBack/alreadyread/mobile390; khóaTechF5 vềlogin; Guardempty/URLinvalidreset; Guestmobilelịchhẹn/notice_prefix/F5/link. Không ghi race là browser; bulk từ unreadpage2 thuộc Featuretest, browser batch tại allpage2. Console cuối Guest0error chỉ document cuối, không suy vòngkhôngHTTP503 chủ động. UI mới sau bản vá mobile đã reload build121 để kiểm.

Backend targeted10/252 và morph1/10 PASS ở hai lượt; frontendcuối121/build/lint0lỗi9cảnhbáocũ PASS. Full **1390test/13682assertion PASS**,624.73s,exit0; Pint338 PASS. Số1383/13545 ở§12.44 là lịch sử. Devdata/history/schema giữ nguyên29/29; raw TABLES có21AUTO_INCREMENT cold khác warm, đã đối chiếu warm=repeat=toàn bộ snapshot xác minh lượttrước, chỉ metadata lạnh chứ không sửa counter; chi tiết Plan§12.45/dev-comparison.json. Chín bảng nghiệp vụ test count/hash bằng nhau; fixture7user/2contract/3room/2building/21repair/1invoice/1appointment/25notice đã dọn đúngrun,4schema test pending khôi phục, guarddev1142. RoleTech khóa/resetstatus trong test để kiểm lại403rồi401 theo middleware, không đổi Auth cho khớp harness. Setuphelper sai cột đã rollback0data và phục hồi đúng4bảng test rỗng trước sửa; không coi lỗihelper là lỗi sản phẩm. Cổng8082 không bind được nên dùng18082loopback/newtestcookie, không chỉnh hostnetwork/dev. ChưaOSoffline/đảoresponse/mất phản hồi đúngsaucommit/newnotice đối đầu bulk; không tuyên bốFullMVPxong. Artifacts ignored `backups/notifications-qa-20261101/`, ảnh JPEG thật (chụp khi browser hiển thị; chụp nền ban đầu không được), không stage logs/manifest/helpers/credentials.

## DASH-02/03 — ma trận nghiệm thu bốn thẻ Admin (01/11/2026, lõi đạt)

Phạm vi DB-D82/brief§42, GET /api/v1/dashboard, không query; không coi là toàn Dashboard.

| ID | Ca kiểm tra | Bằng chứng cần có |
|---|---|---|
| D-B01 | Admin active/khách/bốn role khác/locked | 200/401/403; không trả thông tin tài khoản nhạy cảm |
| D-B02 | Nguồn rỗng và nguồn thật | 0 thật khác loading/lỗi503; so với dữ liệu DB test |
| D-B03 | Thực nhận khác cọc/pending; công nợ gồm terminated | confirmed cash/bank theo reviewed_at; không cộng cọc/pending |
| D-B04 | Tháng VN/ranh giới; tổng tiền lớn | Featuretest ranh giới UTC; chuỗi nguyên/BigInt không làm tròn |
| D-B05 | F5/tải lại/error/retry | Browser qua Nginx test; không giả0 khi lỗi, giữ các bảng chưa nối có nhãn |
| D-B06 | Mobile390 và số tiền lớn | Không tràn ngang trang; ảnh và DOM thật |
| D-B07 | Chỉ đọc và cleanup | Hash bảng nghiệp vụ trước/sau; schema test phục hồi; dev29/29 nguyên vẹn |

Mới: Backend targeted6/88 PASS sau sửa fixture (Enum Held và tên cột deposit_paid_at đúng baseline; hai lượt đầu lỗi fixture, không sửa schema để chiều test). Frontend123test/build/lint PASS,0lỗi/9cảnh báo cũ. Kết quả live và full mới được ghi dưới đây; không gọi các ca chưa thử là PASS.

D-B01..07 đạt trong phạm vi:15HTTPtest(13base/permission/query/field/cache/lockedlogin +503 +bigsum),8tìnhhuốngCUAAdmin và4GETstatelessdev; chi tiết không suy rộng xem Plan§12.46. Nguồn rỗng thật, base1/300k/1.45triệu/2, large5/18014398509781982/18014398510931982/2. Tiền có thêm bank pending200k/cọc held500k nhưng không vào received; terminatedinvoice750k vẫn có nợ. Ranh giới VN/UTC và exclude confirmed-deposit/paid/draft/cancelled được Featuretest; browser không đổi đồng hồ. Không dùng thử Admin role khác bằngUI để thay bằng chứngHTTP403.

Full mới1396test/13770assertion PASS(684.97s,exit0), Pint343 PASS; frontend123test/build/lint0lỗi9cảnh báo cũ PASS. Reload buildcuối sau hàm reloadSummary vẫn đúng. Error503 không giữ số cũ; F5/auth/retry đã xem; client382/scroll382 tại viewport390 kể cả tổng lớn, hai ảnhJPEG đã xem bằng mắt; console cuối0error chỉ document cuối. Mộtwaitselector trongloading timeout, DOM vềsau đúng, không bấm lại mutation. Harnesslần đầu sai expectedlockedlogin422, sửa403 theo AuthService chứ không sửa sản phẩm;15ca là lượt đạt mới, không tính lượt dừng.

11bảng nghiệp vụ count/hash không đổi qua GETs base/large; dọn exactDASHQA11user/6contract/6room/1building/6invoice/4payment/3repair/1proof và sessiondelta; khôi phục2pendingtablesTest; pre/post-full0data/schema, testuserkhôngđọcdev1142. Devsnapshot toàn bộ bằng nhau29/29, runtimeRUNfalse/8.3.36/uploadProgressOff/32MiB64,4GETstateless khôngcookie/Origin. Không seeder/migrationdev hoặc giao dịchAdminthật. Artifacts ignored backups/dashboard-qa-20261101/.

Chưa thử race GETsnapshot với giao dịch ghi, OSoffline/mấtresponse, các khối Dashboard bên dưới, FullMVPUI/devAdmin; PAY504 căn nguyên vẫn chưa biết. Ảnh phòng là proposal tại checkpoint Dashboard; sau đó được duyệt DB-D83, bằng chứng triển khai/kiểm thử nằm RG-01..07 bên dưới.

## FILE-R01..03 — ảnh phòng DB-D83 (01/11/2026, đã nghiệm thu theo phạm vi)

Nhóm159test/1363assertion PASS gồm18test mới và2race subprocess trong1test. Full mới1414 test/14077 assertion PASS (695.91s, exit0), Pint349 file PASS; frontend126test/build/lint PASS (0 lỗi/9 cảnh báo cũ). Số1396/13770 là lịch sử trước ảnh phòng. Matrix RG-01..07 theo DB-D83/brief §43:

| ID | Luồng | Bằng chứng |
|---|---|---|
| RG-01 | Admin/quyền/CSRF/metadata | HTTP 401/403/419/422; JSON chỉ id/url/is_cover/sort_order; khóa tài khoản hủy phiên |
| RG-02 | Upload/gallery/private/Public | PNG qua chooser, thumbnail/lightbox/F5, nội dung ảnh thật và URL có kiểm soát |
| RG-03 | Cover/remove | Replay an toàn, stale 409, gỡ bìa lấy fallback từ server, lặp gỡ 404 |
| RG-04 | Dung lượng/capacity | 5MiB/30MiB/20 ảnh và vượt biên không ghi; hai subprocess upload 201/409, cover 200/409 |
| RG-05 | Parent visibility/collection | Phòng ẩn/occupied/tòa inactive chặn cả detail và ảnh Public; cross-parent/collection bị chặn |
| RG-06 | Error/retry/mobile | DELETE/list 503 có kiểm soát, không thành công giả hoặc giả rỗng; retry và mobile 390; chưa OS offline |
| RG-07 | Cleanup/dev safety | Dọn đúng run, metadata/file/schema test phục hồi; snapshot dev 29 bảng/29 migrations và guard 1142 |

Đã đạt nhóm 159 test/1363 assertion; Frontend 126 test/build/lint PASS (0 lỗi/9 cảnh báo cũ). Live 46 kiểm tra HTTP và 13 tình huống browser theo Plan §12.47; hai tình huống proxy 503 ghi riêng, hai race chạy bằng tiến trình PHP riêng, không gọi là race trên trình duyệt. Các ảnh browser là PNG 1×1 đã decode, không phải ảnh phòng thật. Chọn 21 ảnh và submit không tạo POST (counter 7→7); HTTP 21 ảnh cũng 422. Payload 6×5MiB =30MiB trả201, vượt1 byte/5MiB+1 trả422; body quá32MiB trả413. Capacity19+2/20+1 bị chặn, F5 đủ20 ảnh decode/nút thêm khóa. Không suy từ những ca này rằng toàn Full MVP đã được nghiệm thu.

Fixture chính đã dọn đúng 6 user/2 room/1 building/26 metadata+file còn lại; ảnh bìa đã gỡ trước đó không xóa lại. Sau full và chỉnh handler submit đã dùng run riêng kiểm lại upload một PNG/F5: đúng một POST201, một ảnh/bìa/file, ảnh decode sau tải. Dọn đúng6 user/2 room/1 building/1 ảnh của run cuối. M19 test phục hồi, postflight trước/sau full và sau run cuối sạch/dev bị từ chối1142. Cặp HTTP test stopped, tab agent đóng/không để viewport override; nguồn Docker PHP8.3.36/RUN_MIGRATIONS=false không đổi. Snapshot dev trước/sau live khớp; sau restart MySQL, lần đọc metadata lạnh khác AUTO_INCREMENT, bản lặp và bản cuối khớp baseline. Lượt full đầu bị Docker ngắt trước tổng kết, không ghi PASS; full retry đã đạt như trên. Chưa browser JPEG/WebP, OS offline, mất phản hồi đúng sau commit hoặc Admin thật trên dev; PAY504 cũ chưa rõ nguyên nhân. Artifacts ignored backups/room-gallery-qa-20261101/, không stage helpers/logs/credentials. Code local af77958; không push.

## CTR-API-2 — Người ở cùng (DB-D84, 02/11/2026)

| ID | Luồng | Bằng chứng hiện có |
|---|---|---|
| OCC-01 | Cookie/active/role/CSRF, trường trả về | Feature + HTTP: 401/403/419, locked; danh sách Admin chỉ trường cần thiết, role khác không đọc phone |
| OCC-02 | CRUD nháp/trim/NULL, trường cấm/độ dài | Feature + HTTP + browser thêm/sửa/gỡ; frontend schema; source hash hợp đồng/sổ tiền không đổi |
| OCC-03 | Count độc lập và sức chứa | Cảnh báo lệch không tự sửa số người; Feature chặn vượt sức chứa, đổi phòng nhỏ hoặc kích hoạt sau khi sức chứa giảm |
| OCC-04 | Lịch sử/parent/readiness | Active/terminated chỉ đọc qua API/browser; expired qua Feature; sai parent/missing/schema503 qua Feature/HTTP |
| OCC-05 | Stale/replay/rollback/tranh chấp | Feature rollback SQL/sanitized; HTTP race hai phiên 201/409; browser form cũ409/reload; hai race subprocess store/store và store/activate đã đạt2/36 |
| OCC-06 | Loading/error/retry/F5/mobile | Browser 503 POST và GET ở proxy test, không ghi/không giả rỗng, retry sau restore; F5/tab/375px, form và list không tràn |
| OCC-07 | Bảo vệ dữ liệu/vận hành | Đúng mysql_test/user riêng, dev1142; fixture source hash giữ nguyên; cleanup đúngrun, không schema/tệp mới từ QA, cấu hình proxy phục hồi checksum |

Nhóm liên quan trước race kích hoạt mới:142 test/1429 assertion PASS, gồm13 API test và một race subprocess; hai race cuối đã chạy lại2test/36assertion PASS. Frontend cuối133 test/build/lint PASS (0 lỗi/9 cảnh báo cũ, cảnh báo bundle>500KB giữ riêng). HTTP27 kiểm tra +1race hai phiên; browser12tình huống được phân biệt với HTTP/Feature. Hai503 là proxy test có kiểm soát, không phải OSoffline hoặc mất response đúng sau commit. Một wait selector hết hạn khi thao tác còn chờ, đã đọc access log/DB/DOM cuối và không gửi lại POST; không suy độ chậm công cụ là độ chậm xử lý API. Double-click tạo đúng một POST201/1row, tên/SĐT sửa đúng, count khai báo3 giữ nguyên; xóa204 quay lại empty thật, cancel không xóa. Readonly active/terminated dùng fixture trạng thái tường minh, không coi đã chạy lại kích hoạt/thanh lý toàn luồng qua UI. Dashboard503 do DBtest baseline thiếu bảng KPI là readiness đúng. Console document cuối0error không suy toàn vòng không có503 chủ động.

Run OCCQA-ffe67a1eb5:9 user/3room/1building/3contract;2 hồ sơ readonly ban đầu,4 hồ sơ draft được tạo qua HTTP/browser rồi xóa/cleanup theo manifest. Source hash8bảng giữ nguyên kể cả users/contracts/rooms/services đăng ký/invoice/payments; không phí hoặc role đổi từ thao tác People. Test runtime dùng cặp18082/RUNfalse, không migration/schema test bổ sung cho QA. Cặp đã dừng, tab agent đóng/viewportreset/browserẩn. Full1439 test/14440 assertion/Pint358 PASS (664.75s,exit0). Postflight DBtest sạch/FK1/dev denied1142; snapshotdev29bảng/29migration khớp toàn bộ, privatebaseline1tệp path+SHA256 giữ nguyên;4statelessGETdev200/200/401/401. Code local5f208e2, không push. Artifacts ignored backups/occupants-qa-20261102/, không stage fixture/log/cookie/credentials hoặc ảnh.

## PAY-C — phục hồi phản hồi chưa xác định (02/11/2026, đã kiểm thử theo phạm vi)

Phạm vi: sửa lỗi kỹ thuật trên biểu mẫu PAY đã duyệt, không đổi API/schema/quy tắc pending. Dữ liệu ghi chỉ DB test; CUA một tab riêng, API theo các lane độc lập, không sửa data đồng thời với browser. Model kiểm thử gpt-6-luna theo cấu hình đầu file.

| ID | Ca kiểm tra | Tiêu chí |
|---|---|---|
| PAY-C01 P0 | Resident gửi proof, cổng test thay response sau backend201 bằng504 | Một pending+ảnh, paid0; UI báo chưa rõ kết quả; submit bị khóa; tải lại thấy khoản đã lưu |
| PAY-C02 P0 |503 trước backend | Không thêm payment/file; cùng hướng dẫn thận trọng; chỉ đọc lại rồi thử thao tác mới |
| PAY-C03 P0 | Admin direct/confirm/reject bị mất response sau commit | Không nhắc gửi/thu lại; form khóa; reload thấy số dư/RCP/lý do từ API thật |
| PAY-C04 P1 |422/401/403/419/409/429, form sai | Giữ xử lý quyền/lỗi trường; không báo giả đã thu tiền; hồi phục phù hợp |
| PAY-C05 P1 | F5/đóng modal/mobile | Đọc lại lịch sử/số dư; không tự gửi; nút phục hồi không submit |
| PAY-C06 P0 | Baseline/postflight/schema/file/dev | Fixture đúng manifest được dọn, pending schema phục hồi; dev và private cũ nguyên vẹn |
| PAY-C07 P1 | Health+CSRF+payment latency | Đo nhiều request; phân biệt tái hiện timeout thật với fault injection; không tuyên bố đã sửa căn nguyên nếu chưa rõ |


**Kết quả PAY-C:** C01/C02/C03 đạt qua browser + DB test thực; kernel xử lý request thật rồi cổng test thay response sau commit, không sửa route hoặc bypass CSRF/quyền. C04 đạt Node classification cho401/403/409/419/422/429; HTTP thực đã kiểm401/403/409/419/422 và vai trò/owner/locked, không tuyên bố đã gây429 trên browser. C05 đạt qua nút reload/đóng modal/F5/mobile390; C06 đạt cleanup đúng run2ảnh/7tài khoản/3payment, pending M17/M19/M20 phục hồi/FK1/testdenieddev1142; private1tệp cũ giữ path+hash. Dev29bảng/29migration/data/history nguyên vẹn; metadata warm repeat và checkpoint trước khớp (rawAUTO_INCREMENT đọc lạnh khác, không chỉnhcounter). C07 đã đo10GET200/204 thành công1.019–7.371ms và timing các request qua gateway; **chưa xác định gốcPAY504**.

8nhóm browser: proof100k sau commit504; proof20k trướchandler503; cash200k saucommit504; confirm100k saucommit504; reject50k saucommit504; reloadbutton/close đọc lại; F5ledger300k/700k/3row/2RCP; mobile390 không tràn. Form submit disabled và sourceflightguard được xác minh; thử Enter lên form không focusable lỗi công cụ nên không tính PASSkeyboard-bypass. 15assertionHTTPnghiệp vụ+8quyền,10GETlatency riêng; sandboxEACCES lượt đầu không tính là lỗiserver. Console document cuối0error;503/504 được tạo có kiểm soát, không gọi toàn lượt không có lỗi.

Frontend135/build/lintPASS (0lỗi/9cảnh báo cũ); backend hồi quy18/237PASS, không đổi PHP và không fullsuite mới,1439/14440/Pint358 vẫn lịch sử. Source checkpoint90ea3d7. Test-vhost khôi phục đúng bytes, gateway/control ignored đã gỡ; testpair stopped/tabriêngđóng/viewportreset/RUNfalse. Không devwrite/migrationdev/push. Chưa OSoffline/TCPdrop thật/Adminthậtdev cho recovery; không coi lỗi gốc60s đã sửa. Bằng chứng/gateway fixture nằm trong artifacts ignored backups/pay-recovery-qa-20261102/; không Git cookie/credentials/logs.

## REFUND — xác nhận hoàn đủ cọc (DB-D85/brief§46,02/11/2026, đã kiểm thử theo phạm vi)

Môi trường ghi duy nhất mysql_test/mini_apartment_test với tài khoản riêng; RUNfalse, không migrate dev. CUA tuần tự trên một tab riêng, laneAPI/nguồn tách; không tác nhân cùng sửa file. Scope một lần hoàn đủ, không chuyển tiền hoặc payment hoàn giả.

| ID/mức | Ca kiểm thử | Kết quả cần có |
|---|---|---|
| RF-01 P0 | Migration up với dữ liệu cũ/down chưa audit/down có audit/FK | CộtNULL, dữ liệu nguyên; không tự xóa dấu vết khirollback; reviewerFKRESTRICT |
| RF-02 P0 | Admin xác nhận đúng khoản đã terminated+settled |200, chỉauditcontract/updated_at; nghĩa vụgốc giữ, outstanding0; invoice/payment/room/notice nguyên |
| RF-03 P0 | Lặp/hai Admin cùngrevision/đãxácnhận |200 cùngactor/time, một dấu vết; không trảphòng/tấttoán lại |
| RF-04 P0 | Sai tiền/stale/fieldcấm/0/âm/thập phân/Boolean/thiếuack |409/422, không audit dởdang |
| RF-05 P0 | Guest4rolekhác/lockedCSRF/actorđổiquyền/xóa mềm/missing |401/403/419/404; server kiểm lại quyền |
| RF-06 P0 | Active/draft/expired/cọc0/hếtcọc/ledger/auditlệch/SQLrollback |409/500 an toàn, không giả đã hoàn hoặc mất lịch sử |
| RF-07 P0 | DB chưa 2cột | Preview/terminate cũ vẫn200, không trường xác nhận/nút mới; POSTrefund503 |
| RF-08 P1 | Browserthêmcheckbox/hủy/doubleclick/F5/mobile/readonlypaid | Chỉ1POST; dữliệu API thật, hiện đúngactor/time, khôngfrontmath |
| RF-09 P0 |409/503 trướcghi/mấtresponse saucommit | Form cũ đóng, buộc đọc lại snapshot; không chi lại vì lỗi; replay không đổi audit |
| RF-10 P0 | Cleanup/dev/private/source | Đúngrun/IDs/schema restored/FK1/devdenied1142; devdata/history/metadata và tệp private cũ nguyên |
| RF-11 P1 | Revision trả sau terminate/confirm so với GET | Token dùng tiếp được khi dữ liệu không đổi, không409 giả do default DB chưa hydrate |


**RF kết quả mới:** full1452test/14615assertion PASS(720.15s,exit0), Pint364PASS, frontend137test/build/lintPASS(0lỗi/9cảnh báo cũ). Thêm13testbackend và2testNode. RF01/02/03/04/05/06/07/11 cóFeature/schema/process; RF08/09 browserđạt theo10nhóm bên dưới, RF10postflightđạt. Hai caRF11/race từngđỏ doModelRAM chưa hydrate mặc định payment/generated keys hợp đồng; đã giữ regression, refresh và kiểm lại2/26PASS trước full, không đổi số tiền hoặc hạ assertion.

35HTTPcheck:10input422,9quyền/CSRF,9preview/sai tiền/stale/zero/2Adminrace,7replay/finalinvoice/payment. RaceHTTP200/200 cùngactor/time, không đếm thànhraceprocesshoặcbrowser.10nhómbrowser: nghĩa vụ thật2,1triệu;khôngtick;cancel;doubleclick1POST200;F5paid+ẩnbutton;503beforekhôngaudit;504aftercommitcóaudit/reloadđúng/khôngresend;mobile390modal390=scroll390/trang382=scroll382;zero;active. Snapshot3confirmed(normal/fault/race),zero/activeNULL; tiền/phòng/dịch vụ/notice/contractngoàiaudit nguyên. Legacythiếucột kiểmFeature+Node, không tuyên bố đã thửgỡschema trongbrowser có dữliệu. Console documentcuối0error, lỗi503/504 đượcchủđộngtạo; chưa OSoffline/TCPdrop thực/Adminthậtdev. Hình refund-paid-desktop.png đã xem; hình mobilepaid chỉ chụp đầu panel, không lấy đó làm bằng chứng banner đã hoàn.

Guard ghi nhận rõ: usershash đầu đổi do CLIbcrypt12→FPMtest4; providerprobe chỉpassword/updated_at, plaintext và11danh tính/role/statuskhớp. Giữ baselinegốc và capture sauauth có lýdo, strictguard cácbảng khác không bỏ; không nói mọibyteusers nguyên từ lúcseed. Helpercleanup kiểmMAINTabsent gâySQLerrortrướcxóa, đãsửa hasTable+catchThrowableexit1 rồicleanupđạt; không thêm MAINT để tránhlỗi. Banđầu anonymousnoCSRF419 làharness, ca401cuốicóCSRFđạt. Artifacts ignored backups/refund-qa-20261102/ chứa cảlượt lỗi và lượtchốt, khôngGitsecrets/cookie/log.

RunREFUNDQA-a07613802a11user/5contract/5room/5building/2service; trạngtháiactive banđầu factory, final/terminate thực, không coi đãtestlại toànbộ wizard tạo/kíchhoạt. Exactcleanup/sessiondelta/sixpendingrestored/refund2columnsgỡ; test0data/FK1/devdenied1142. Devsnapshotidentity/metadata/data/history nguyênvẹn29bảng/29migration; privatebaseline1file nguyênpath+hash. Testproxybytesrestored/gatewaycontrolgỡ/testpairstopped/tabđóng/viewportreset/RUNfalse. Sourcecheckpoint32cab18. Migrationdev chưađượcduyệt/chạy, PAY504gốc và quy tắc dịch vụ§44 vẫn mở; không push.


## CTR-SVC — dịch vụ inactive và snapshot (DB-D86, 02/11/2026)

| ID | Luồng cần kiểm | Trạng thái trước nghiệm thu live |
|---|---|---|
| SVC-01 | Active: thêm/tăng/giảm từ kỳ sau, giữ giá cũ khi đổi lượng, mới lấy giá danh mục | Feature hiện có + kiểm lại HTTP/browser |
| SVC-02 | Inactive: giữ/giảm/ngừng được, không thêm mới/tăng; lỗi422 đúng trường | Regression đỏ422 đã tái hiện, nhóm13test/162assertion đạt; live chưa chạy |
| SVC-03 | Dòng tương lai sửa giảm nhiều lần không thêm lịch sử; invoice/items đã phát hành không đổi, lỗi giữa batch không ghi dở dang | Feature đạt; HTTP đối chiếu snapshot cần kiểm |
| SVC-04 | Revision/401/403/locked/CSRF/không mở metered hoặc nháp inactive | Feature hiện có, HTTP cần kiểm |
| SVC-05 | Modal hiện nhãn đúng, giới hạn tăng, giảm thành công/F5/không submit lặp/mobile | Frontend138test/build/lint đạt; browser chưa chạy |
| SVC-06 | Biên hôm nay/ngày cuối cảnh báo/ngoài khoảng/timezone/active; chia ngày tháng đầu/cuối không đổi | Bộ lọc13test chung đạt; hồi quy tính hóa đơn cần kiểm |

PAY504 là nhóm đo độc lập; không tạo fault injection/thay luồng thanh toán trong CTR-SVC. Cleanup theo run, testguard/dev snapshot trước-sau, không ghi nghiệp vụ dev.


**Kết quả SVC đã chốt:** SVC01–04 có Feature/HTTP tương ứng, SVC05 browser7nhóm + lượt mobile cuối, SVC06 có ContractListDueTest/Contracts+Invoices+FinalCalculation.29HTTP gồm auth/CSRF, không29nghiệp vụ độc lập; browser4PUT qua2run, doubleclick mỗi lần chỉ1. Hồi quy325/3599/Pint2file; frontend cuối138/build/lintPASS(9cảnh báo cũ). Mobile ban đầu bị cắt dù documentWidth375, không tínhPASS; sau min-w-0/táchbadge, ảnhđãxem và dialogclient=scroll334/fieldset286/không vượt375 đạt. Hai selectorloading và một lần bấm gộp không gửiPUT được ghi riêng; kiểm DB/log trước khi thử lại. Snapshot invoices/items/payments nguyên; fixture/helper lỗi scope ban đầu rollback trước setup lại. Cleanup2run đúngIDs/test0/FK1/dev1142/privatefilecũ nguyên; dev snapshot tất cảkeys khớp29bảng/30migration/RUNfalse, testpair/tabđóng/viewportreset. Không Adminthậtdev/OSoffline/TCPdrop/fullsuite mới. Code3533a56; Plan§12.54, artifacts ignored backups/service-rules-qa-20261102/.


**PAY-C07 / PAY-05 cập nhật độc lập02/11:** loggốc public-test chứng minh POST~63,8s/FPM201/Nginx504header60s, CSRF~45,1s/client499. Đo mới12GET (6health/6native) đều200: health1,634–5,785giây, bootstrap1,015–4,008giây, sau guardSQL1query0,47–1,33ms; không tái hiện60s/504. Probe đo từPHPentry, có overhead guard và chưa đo queue trướcPHP; đã gỡ/khôi phụcproxybytes. Các số cũ1.019–7.371ms là1.019–7.371mili giây (khoảng1,0–7,4giây), không khẳng định là1–7ms. PAY-05a/b đã khảo sát/đo, PAY-05c vẫn mở; không sửa PAYcode/timeout hoặc ghép với DB-D86. Chi tiết/giới hạn Plan§12.55; artifactspay-runtime riêng, không Git.

## CLOSE-SVC / ROOM-MTR — ca nghiệm thu 02/11/2026

| ID | Tình huống | Bằng chứng trước live |
|---|---|---|
| CS-01 | Bỏ đúng dòng kỳ sau chưa sử dụng, giữ dòng ban đầu/metered/lịch sử | Feature 13/159 đạt; full1469/14836 đạt |
| CS-02 | Mọi tham chiếu hóa đơn, kể cả draft/cancelled/khác hợp đồng/string ID | Feature409 + snapshot không đổi đạt; HTTP/browser chờ |
| CS-03 | SQL rollback, replay, race hai process, pending/quyền | Fullsuite đạt; HTTP hai phiên và browser chờ |
| RM-01 | Tab điện nước chỉ phòng đang mở, phân trang/lọc server, không tính tiền React | Node3ca + frontend141/build/lint đạt; live chờ |
| RM-02 | F5/URL lỗi/empty/retry/375px, bảng MTR cũ không hỏng | Browser chờ |
| SAFE-87 | Exact fixture cleanup/schema/private/dev snapshot/RUNfalse | Trước live guard đạt; hậu kiểm chờ |

Không ghi DB dev; testpair18082 dùng account riêng. PAY504 và chính sách hóa đơn kỳ áp dụng là việc độc lập, không được coi đã khép bởi nhóm này.

**Kết quả CS/RM mới:** CS01–03 có full1469test/14836assertion/Pint365; hai regression đầu đỏ rồi nhóm13/159 xanh, có rollback và race process. HTTP25check/26response +10authsetup đạt; reference409 không đổi revision, hai Admin200/200 chỉ1payment. Browser blocker/nút khóa, confirm/doubleclick1POST200/F5closed đạt. RM01–02: frontend141/build/lint0lỗi9cảnh báo cũ; phân trang20+3/23ID và các lọc/401/403/422/empty đạt. Browser lọc/resetpage/F5/URLsai/xóalọc/empty/503retry/MTRcũ/mobile375 đã kiểm; panel335=scroll335/table808 nằm trong khung334, ảnh đã xem. Chưa browser BackForward/datepicker/chuyển phòng giữa request/OSoffline/TCPdrop/Adminthậtdev; không đánh dấu các ca đó PASS.

SAFE87 đạt: exact fixture/session cleanup,6schema test khôi phục, test nguồn0/FK1/refundcolumns0/devdenied1142/privatefilepath+SHA nguyên; dev toàn bộ7nhóm snapshot khớp29bảng/30migration/RUNfalse. Proxybytes gốc/cặp18082stopped/tabđóng/viewportreset. Code e3c3030/25ae0db; Plan§12.56–57/học tập§11.63–64. Lượt HTTP đầu bị sandbox EACCES trước request, chạy lại với quyền localhost đạt; selector/getByLabel và select báo lỗi được xác minh DOM/URL, không tính là lỗi nghiệp vụ. PAY504 vẫn mở, không dùng503 chủ động ởGET làm bằng chứng đã tái hiện504 gốc.

## PROFILE-A — ma trận kiểm thử phạm vi mới (DB-D88, 03/11/2026)

| Ca | Yêu cầu | Bằng chứng cần có |
|---|---|---|
| PR-01 | 5role active tự sửa tên, giữ định danh/quyền/hash/phiên, response6trường | Feature từngrole + thử nhanh giao diện |
| PR-02 | Đổi mật khẩu hiện tại đúng, mới khác/confirmation/8ký tự/72byte/NUL/whitespace | Feature + Node; không log/response password/hash |
| PR-03 | Thu hồi mọi phiên cũ, kể cả login mới chưa/me và legacy; không ảnh hưởng user khác | Cookie/database assertions; pin hash ngay login/register |
| PR-04 | Anonymous/locked/CSRF/field cấm/rate429 | Feature, không bỏ middleware |
| PR-05 | Stale request, race2process, SQLrollback | Feature và process trênDBtest; không ghi dở dang |
| PR-06 | RHF/Zod, cancel, khóa gửi lặp, đồng bộAuth/name, login notice sau đổi/responsekhôngrõ | Frontend test/build/lint và kiểm nhanh riêng profile |
| PR-SAFE | DB testguard, baseline/cleanup, devsnapshot nguyên, không migrationdev | Hậu kiểm; browser test-only fixtures, không dùng Admin thậtdev |

Chỉ nghiệm thu phần profile mới; không tự mở email/SĐT/pháp lý hay kiểm toàn hệ thống trong lượt này.

**Kết quả PR mới (03/11):** PR01–05 có full1507/15313 trước regression literal-key cuối; nhóm Auth cuối131/2054 và Pint377 PASS. HTTP40check đạt cả5role/field cấm/401/419/422/204, hai phiên bị thu hồi/người khác còn phiên, login cũ bị từ chối/mới được chấp nhận và race204-409; process race cũng đạt. PR06: frontend146/build/lint0lỗi9cảnh báo cũ, browser lưu tên/F5/cancel/rỗng/doubleclick1PATCH/mobile375 đạt; đổi mật khẩu và login notice trực tiếp browser **chưa kiểm**, không gộp vào PASS. PR-SAFE: exactrun5user/session/cache đã dọn, test0/FK1/devdenied1142/privatefile nguyên, không schema mới; dev7nhóm snapshot khớp29bảng/30migration/RUNfalse, proxy nguyên/cặp test stopped/tab đóng/viewport reset. Lượt HTTP đầu client20s timeout499 ở PATCH đã xác minh SQL trước chạy lại; helper70s không phải bản vá PAY504. Code91a2ae8/Plan§12.59.


## SET-SYS / USR-HISTORY (03/11/2026)

| Ca | Yêu cầu | Bằng chứng mới |
|---|---|---|
| SYS01 |3keyAdmin/trim/NULL/giới hạn/email; legacyexpectedspaces | Hồi quy75/739 PASS, Node151/build/lint0lỗi9cảnhbáocũ; HTTP3key/clear/email422 |
| SYS02 | CAS409/atomic/race; giữ days/bankreadonly/quyền/CSRF | FeaturePASS; HTTP22checkgồmsetup, race200-409; browser stale409→reload giữinput→save200, doubleclick đầu1PUT |
| UH01 | user_id lọc trước paginate/counts,21 dòng20+1, không lẫn user | Feature và HTTPPASS; browser20/1/F5/URLbad/empty0 |
| SYS-UH-UI | Antigravity/mobile375/không tràn | Settings5form292=scroll292/doc367; historytable600 trongwrapper302; ảnh đã xem. Chưa OSoffline/503/BackForward/Admin thậtdev |
| SYS-UH-SAFE | cleanup/testguard/dev nguyên/private/RUNfalse | Exactrun4user22contract dọn; test0/FK1/devdenied1142/privateSHA nguyên; dev7nhómkhớp29bảng30migration; testpairdừng |

Codecd397cf/4c73544; Plan§12.60/học tập§11.67. Chưa chạy lại full PHPUnit, không dùng PASS scoped để gọi toàn hệ thống hoàn thành.


## ROOM-VIEW (DB-D90, 03/11/2026)

| Ca | Yêu cầu | Bằng chứng mới |
|---|---|---|
| RV01 | room_id chỉAdmin, lọc trướcpaginate, private-history, dateVN+status | Backend33/449PASS (gồm hồi quy2module trước); HTTP16checkgồmsetup,21lịch20+1/1confirmed/empty0 |
| RV02 | nonAdmin không nới quyền; owner/Guard vẫn scope cũ | Feature4role422/anon401/invalid422; HTTPowner22/Guard2confirmedhômnay và room_id422 |
| RV03 | readonly/tabURL/filter/page/F5/retry/mobile | BrowserAdmin:0nútghi/F5page2/confirmed1/completed0/datekey/URLbadretrygiữtab; doc367/table555trongwrapper334, ảnhđãxem |
| RVSAFE | exactcleanup/M18test/restored/devnguyên |3user22appointment2room1building dọn, M18down đúngsởhữu; test0/FK1/devdenied1142/privateSHA nguyên/dev7nhómkhớp29bảng30migration/RUNfalse/cặptestdừng |

Pint380/frontend152/build/lint0lỗi9cảnhbáocũ; codea24ecb5/Plan§12.61. Chưa503browser/OSoffline/BackForward/chuyểnroomgiữrequest/Adminthậtdev hoặc toànMVP; chưa full PHPUnit mới. Datefill côngcụ chưa phátchange, đã dùngUp/DownxácminhURL; không tuyên bố lỗi sản phẩm.


## DASH-B (DB-D91,03/11/2026)

| Ca | Yêu cầu | Bằng chứng mới |
|---|---|---|
| DB91-01 | Adminonly/locked/querystrict/no-store | Hồi quy17/252PASS, HTTP5role401/403/422; Pint383 |
| DB91-02 | Countsallroomstatus/activeoverdue/softdelete/20+1/empty0/N+1 | Feature2querybuildings; HTTP21tòa main5/2/1, tòa0thật; sourcechecksum8bảngnguyên |
| DB91-03 | Giữ4thẻ/queue servermeta/lịch5/N/khôngPII | Frontend156/build/lint0lỗi9cảnhbáocũ; HTTP2/100/900/2, queue21/2/1/1, lịch6; schema bỏphone/note |
| DB91-04 | URL/F5/errorriêng/mobile | BrowserAdminpage20→1/F5/URLbad→firstpage; mobiledoc367/table440trongwrapper294, ảnhđãxem; chưa503/OSoffline/BackForward/clickmọilink |
| DB91-SAFE | Exactcleanup/schema/dev/private/RUNfalse |6user21building5room2contract1invoice22payment3maintenance7appointment dọn, M19/18/17down đúngsởhữu; test0/FK1/devdenied1142/privateSHA nguyên/dev7nhómkhớp29bảng30migration |

Code4d5645e/Plan§12.62/học tập§11.69; không fullPHPUnit mới hoặc toànMVP. Lượt final bịngắt mấtlog đã kiểm process/baseline rồi chạy lại, không cộng kếtquảtrùng. Proxykhôngđổi/testpairdừng/viewportreset/tabđóng, khôngpush.

## E2E-ACC — nghiệm thu toàn hệ thống qua giao diện React (04/11/2026, DB test)

Một hành trình liên tục qua UI thật trên cặp 18082 (DB `mini_apartment_test` sau guard, 9 migration pending áp tạm + `SystemCatalogSeeder`, 1 Admin test do fixture tạo; mọi thực thể khác tạo bằng giao diện). Giờ VN 02:05–02:54 ngày 04/11/2026. Đây là bổ sung cho CLOSE-F04/F06: lần đầu chạy toàn bộ wizard bằng React; **không phải** nghiệm thu trên dev hay bằng Admin thật.

| ID | Vai trò | Bước / kết quả quan sát |
|---|---|---|
| E2E-01 | Admin | Tạo tòa (5 tầng), phòng E201 (25.50 m², công khai), dịch vụ Internet per_room 100.000 ₫, giá Điện 3.500/Nước 15.000 từ 01/11, 3 khóa ngân hàng + tên hệ thống, cấp Kỹ thuật viên/Bảo vệ: PASS |
| E2E-02 | Khách → Admin → Bảo vệ | Đặt lịch công khai 10:00 → APT-202611-0001 chờ xác nhận → Admin xác nhận → Bảo vệ thấy trong "hôm nay", check-in 02:33, check-out 02:33: PASS |
| E2E-03 | Khách | Tự đăng ký (có email) → vào `/account/profile`: PASS |
| E2E-04 | Admin | Hợp đồng nháp 04/11/2026–03/11/2027, 3.500.000 ₫/tháng, cọc 3.500.000 ₫; đăng ký Internet; điều khoản phí cố định 1.000.000 ₫ + 1 điều kiện miễn (thiếu mã → lỗi đúng ô); ghi nhận cọc; kích hoạt với chỉ số đầu 1200.50/85.20 → HD-2026-0161, user thành Cư dân, nút In phiếu: PASS |
| E2E-05 | Admin | Hóa đơn tháng 11: tiền phòng 3.500.000×27/30 = 3.150.000 ₫, Internet 100.000×27/30 = 90.000 ₫, không dòng điện nước (hóa đơn đầu), tổng 3.240.000 ₫; nháp không có nút In; phát hành → INV-202611-0093, hạn 09/11 (5 ngày): PASS |
| E2E-06 | Cư dân → Admin | Tổng quan: phòng/tòa/thời hạn, nợ 3.240.000 ₫, 2 thông báo; hướng dẫn chuyển khoản đúng ngân hàng Admin nhập + nội dung = mã hóa đơn; gửi minh chứng PNG → payment #28 chờ đối soát; Admin xác nhận → RCP-202611-0028, hóa đơn "Đã thanh toán"; in biên nhận đúng trường: PASS |
| E2E-07 | Cư dân → Admin → Kỹ thuật viên | Gửi MR-202611-0001 (ưu tiên Cao, ảnh private 200 image/png no-store) → Admin phân công → KTV nhận thông báo, bắt đầu, hoàn tất (ghi chú trống bị chặn); cư dân thấy "Đã hoàn tất": PASS |
| E2E-08 | Cư dân → Admin | Gửi ảnh chỉ số điện 1210.00 → Admin từ chối (lý do trống bị chặn, có lý do → đã từ chối): PASS |
| E2E-09 | Admin | Dashboard: 1 phòng thuê, thực nhận 3.240.000 ₫, nợ 0, bảng tòa 1/1/0; hồ sơ cư dân: đang thuê, nợ 0, 1 yêu cầu sửa chữa: PASS |
| E2E-10 | Admin | Thanh lý cùng ngày: kiểm tra tài sản + ảnh; thiếu lý do → chặn; xem trước "Nhận và trả cùng ngày", phí trước hạn 0 ₫ (DB-D66), điện 4.80×3.500 = 16.800 ₫, nước 0.80×15.000 = 12.000 ₫. **Lập tất toán ban đầu 409 "Hợp đồng vừa thay đổi"** (lỗi E2E-BUG-01) → sửa → 201; hóa đơn #94 tổng 0 ₫ (giảm trừ −28.800 ₫, hoàn ngoài hệ thống 3.211.200 ₫ ghi trong ghi chú), phát hành → "Đã tất toán"; đối soát cọc khấu trừ 0/hoàn 3.500.000 ₫; thanh lý 02:53 → phòng Còn trống; ghi nhận hoàn đủ cọc: PASS sau khi sửa |
| E2E-11 | Cư dân | Sau thanh lý: banner "không còn hợp đồng", ẩn nút gửi sửa chữa, nợ 0; phiếu hợp đồng in "Đã thanh lý · Nhận và trả cùng ngày · Hoàn 3.500.000 ₫": PASS |
| E2E-BUG-01 | — | `Contract::lifecycleRevision()` băm dòng dịch vụ theo thứ tự nạp; GET sắp theo id còn `ContractFinalInvoiceService::createLocked` nạp lười theo index service_id → khác hash, tất toán luôn 409 khi dịch vụ định kỳ được thêm lúc nháp (trước Điện/Nước). Đã sửa sắp theo id; `ContractRevisionOrderTest` FAIL trước/PASS sau. |
| E2E-OBS-01 | — | Ca nhận–trả cùng ngày: phiếu in hiệu lực dịch vụ "04/11/2026 – 03/11/2026" (đúng 0 ngày nhưng khó đọc). **Đã sửa 04/11:** `formatServicePeriod` hiện "Không phát sinh ngày sử dụng (bàn giao DD/MM/YYYY)" khi `end_date` < `start_date`, dùng ở tab dịch vụ Admin, chi tiết cư dân và 2 phiếu in. Browser DB test: 3 dòng dịch vụ hợp đồng cùng ngày hiện đúng cả 4 nơi; phiếu cư dân mobile 375 không tràn trang (bảng cuộn trong khung, `print:overflow-visible` có trong CSS build). PASS |
| E2E-OBS-02 | — | Khi lập tất toán bị 409, UI hiện thông điệp chung "Dữ liệu bị xung đột…" thay vì câu cụ thể của Backend. **Đã sửa 04/11:** `apiConflictMessage` chỉ dùng ở trang thanh lý (bước 2 xem trước, bước 3 lập nháp, phát hành), lấy `message` của 409 (≤300 ký tự, không giống SQL), thêm hướng dẫn tải lại nếu câu chưa có; `apiErrorMessage` chung không đổi. Bỏ dòng lỗi gốc lặp lần hai ở bước 3 (có từ 3d35433). Browser DB test: sửa hợp đồng từ phiên khác → bước 2 và bước 3 đều hiện một dòng "Hợp đồng vừa thay đổi. Vui lòng tải lại."; tải lại → lập nháp thành công. PASS |

Chưa kiểm trong lượt này: email (đã kiểm riêng §12.66), mất mạng/503 trên browser, nút Back/Forward, mobile cho toàn hành trình (các trang đã kiểm mobile riêng ở từng lát), Admin thật trên dev. Cleanup: fixture down so sánh baseline mọi bảng `diff=[]`, 24 bảng/21 migration, FK=1, file private/public mới = 0; cặp 18082 stopped, tab đóng.

### E2E-ACC-04 — nghiệm thu bổ sung (04/11/2026)

| ID | Môi trường | Kết quả quan sát |
| --- | --- | --- |
| E2E-04-MAIL | Docker dev 8080, Mailpit 8025 | Sau khi áp dụng cấu hình Compose, Laravel dùng `smtp/mailpit:1025`. Một thư thử nội bộ gửi tới địa chỉ tổng hợp xuất hiện trong API và giao diện Mailpit. Dev health 200, khách gọi `/api/v1/auth/me` nhận 401. Chưa gửi hoặc mở liên kết của tài khoản thật. |
| E2E-04-NET | Browser Public, proxy GET cổng 18083 nối DB test cổng 18082 | Chọn giá tăng dần nhận 503, trang báo lỗi và giữ `sort=price_asc`. Chọn phòng dưới 3 triệu gặp kết nối bị ngắt, trang báo lỗi và giữ `max_price=2999999`. Nút Thử lại ở cả hai ca lấy 200. Quay lại/Tiến tới khôi phục đúng hai bộ lọc. Đã dừng proxy và đóng tab. Mô phỏng ngắt một request, chưa thử mất mạng toàn máy hoặc thao tác ghi. |
| E2E-04-PRINT | Browser Admin test, 18082, khổ 375 px | Hóa đơn: trước sửa chiều rộng vùng xem/nội dung là 367/394 px, sau sửa là 367/367 px; bảng cuộn trong khung 286 px với nội dung 354 px, đủ ba dòng và tổng 3.778.475 ₫. Biên nhận có mã và số tiền, không tràn ngang (375/375 px). Chưa mở được hộp thoại in để lưu PDF. |
| E2E-04-PDF | Dev 8080, Chrome headless `Page.printToPDF`, tài khoản demo Admin + Cư dân 1 | 7 tệp PDF A4, mỗi tệp 1 trang: hóa đơn INV-202611-0001 (quá hạn, 6 dòng, tổng 6.955.000 ₫, còn 6.955.000 ₫), INV-202610-0001 (đã thanh toán, có khối chỉ số 150→280 kWh, 20→32 m3, còn 0 ₫), biên nhận RCP-202610-0001 (6.955.000 ₫, chuyển khoản, ô ký), phiếu hợp đồng HD-2026-0001 bản Admin (có liên hệ) và bản Cư dân (có địa chỉ, người ở cùng, không có liên hệ). Tiếng Việt đúng dấu, không menu/nút, bảng không cắt: PASS. Góp ý giao diện: bảng dịch vụ phiếu hợp đồng xuống dòng chữ "Theo chỉ số"/"1.00 phòng". Quan sát dữ liệu demo: INV-202611-0001 có dòng điện/nước 130 kWh/12 m3 trùng tiêu thụ kỳ 10 đã thu ở INV-202610-0001 và không gắn chỉ số (dữ liệu chèn từ `DemoDataSeeder`, không qua Service lập hóa đơn). |
