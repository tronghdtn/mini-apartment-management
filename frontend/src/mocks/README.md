# src/mocks — dữ liệu giả (tạm thời)

Thư mục này chứa **dữ liệu nghiệp vụ giả lập** cho các module chưa tích hợp Laravel API. Authentication đã dùng API thật qua `features/auth`; không lấy danh tính/quyền từ thư mục này.
Không có code nào ở đây được coi là nghiệp vụ chính thức. Từ đợt AG-UI27/10, App không mount AppProvider; mọi trang/route đang chạy không import dữ liệu mock. Những trang chưa API hiển thị trạng thái chưa kết nối rõ ràng. Các tệp ở đây và BookingForm cũ được giữ để tham khảo, không thuộc luồng sản phẩm hiện tại.

| File | Vai trò |
| --- | --- |
| `data.ts` | Dữ liệu mẫu (tòa nhà, phòng, hợp đồng, hóa đơn, thanh toán…). |
| `types.ts` | Kiểu dữ liệu của mock (camelCase). Kiểu API thật sẽ đặt ở `src/features/<feature>/types.ts`, giữ `snake_case` như JSON trả về. |
| `AppContext.tsx` | "Backend giả" trong bộ nhớ: state + các hành động (phát hành hóa đơn, xác nhận thanh toán…). Tải lại trang là mất thay đổi. |
| `RoleSwitcher.tsx` | Công cụ demo cũ không còn được layout/route nào sử dụng. Không được dùng để cấp quyền. |

## Quy tắc

- Chỗ nào React đang **tự tính tiền** đều gắn nhãn `[MOCK-TIỀN]`. Khi tích hợp, số tiền phải lấy từ Backend
  (`App\Support\Money`, BCMath, HALF_UP) — tìm nhanh bằng: `grep -rn "MOCK-TIỀN" src`.
- Gọi API thật **chỉ** qua `src/lib/http.ts`, viết trong `src/features/<feature>/api.ts`
  (Auth thật: `src/features/auth/api.ts`; mẫu health: `src/features/system/api.ts`).
- Khi một màn hình đã chuyển sang API thật, bỏ import từ `@/mocks/...` ở màn hình đó.
  Khi không còn màn hình nào import `@/mocks`, xóa cả thư mục này.
