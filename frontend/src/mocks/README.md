# src/mocks — dữ liệu giả (tạm thời)

Thư mục này chứa **mọi thứ giả lập** để xem giao diện khi chưa tích hợp Laravel API.
Không có code nào ở đây được coi là nghiệp vụ chính thức.

| File | Vai trò |
| --- | --- |
| `data.ts` | Dữ liệu mẫu (tòa nhà, phòng, hợp đồng, hóa đơn, thanh toán…). |
| `types.ts` | Kiểu dữ liệu của mock (camelCase). Kiểu API thật sẽ đặt ở `src/features/<feature>/types.ts`, giữ `snake_case` như JSON trả về. |
| `AppContext.tsx` | "Backend giả" trong bộ nhớ: state + các hành động (phát hành hóa đơn, xác nhận thanh toán…). Tải lại trang là mất thay đổi. |
| `RoleSwitcher.tsx` | Nút chuyển vai trò demo. Sẽ thay bằng đăng nhập thật (Sanctum). |

## Quy tắc

- Chỗ nào React đang **tự tính tiền** đều gắn nhãn `[MOCK-TIỀN]`. Khi tích hợp, số tiền phải lấy từ Backend
  (`App\Support\Money`, BCMath, HALF_UP) — tìm nhanh bằng: `grep -rn "MOCK-TIỀN" src`.
- Gọi API thật **chỉ** qua `src/lib/http.ts`, viết trong `src/features/<feature>/api.ts`
  (mẫu: `src/features/system/api.ts`).
- Khi một màn hình đã chuyển sang API thật, bỏ import từ `@/mocks/...` ở màn hình đó.
  Khi không còn màn hình nào import `@/mocks`, xóa cả thư mục này.
