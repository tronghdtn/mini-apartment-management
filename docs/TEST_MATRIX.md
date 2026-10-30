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
| CLOSE-E04 | P0 | Replay không payment/notice mới, không trả lại phòng khách mới;5racehai tiến trình thật (terminate, pending, cash, confirm, cancel final0) và2racecookieHTTP PASS |
| CLOSE-E05 | P1 |12case browser theo Plan§12.40: checkbox/stale/doubleclick/F5/mobile/pending/link, Nginx test mất kết nối/phục hồi, upload inspection/damage/waiver→issue→đối soát/giữ nợ PASS |
| CLOSE-E06 | P0 | Quy tắc chặn hủy mọi invoice sau terminated vừa duyệt31/10; đang bổ sung regression/guard, chưa gọi PASS |

Backend checkpoint5818098: full1373/13210/Pint336 PASS; frontend114test/build/lint0lỗi9cảnhbáocũ.35HTTP và2HTTP races mới, không thay kết quả lịch sử CLOSE-D. Browser filechooser nay đã thử; offline chỉ kết nối Nginx test, chưa thử OS offline/đảo response/mất response sau commit. Chưa chốt dọn fixture/dev comparison hoặc nghiệm thu dev tại mốc này. Chi tiết/artifacts Plan§12.40.
