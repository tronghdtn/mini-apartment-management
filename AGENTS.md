# AGENTS.md — Quy tắc cho AI/agent làm việc trên dự án

Tài liệu này là nguồn quy tắc duy nhất cho mọi AI agent (Claude, Codex, Copilot…) thao tác trong repository. Đọc toàn bộ trước khi sửa code.

## 1. Bối cảnh

- **Mini Apartment Management** — hệ thống quản lý chung cư mini, bài tập lớn môn Lập trình mã nguồn mở.
- Một chủ sở hữu quản lý nhiều tòa; mỗi tòa nhiều phòng.
- Vai trò: Khách, Cư dân, Quản trị viên. (Nhân viên sửa chữa, Bảo vệ: có thể bổ sung sau — chưa làm.)
- Ngôn ngữ giao diện và thông báo cho người dùng: **tiếng Việt**. Tên biến, hàm, class, bảng, cột: **tiếng Anh**.

## 2. Phạm vi — điều KHÔNG được tự ý làm

- Không tự thiết kế hay tạo migration/model cho các bảng nghiệp vụ. Thiết kế CSDL (~20 bảng) phải được người dùng duyệt và lưu trong `docs/` trước.
- Không tự triển khai nghiệp vụ (hợp đồng, hóa đơn, thanh toán, phòng, sửa chữa…) khi chưa được yêu cầu cụ thể.
- Không tích hợp ngân hàng/cổng thanh toán.
- Không seed dữ liệu nghiệp vụ giả vào database dùng chung. Factory/seeder chỉ dùng cho test.
- Không thêm Redux, microservices, Repository Pattern hoặc tầng trừu tượng không cần thiết.
- Không thêm thư viện mới khi chưa nêu lý do và được đồng ý.
- Không commit `.env`, secrets, `node_modules`, `vendor`, dữ liệu MySQL.
- Không push, tạo remote hay GitHub repository khi chưa được cho phép.
- Không xoá/ghi đè file hiện có của người dùng mà không hỏi trước.

## 3. Kiến trúc backend (Laravel 13, PHP 8.3)

Luồng xử lý: `routes/api.php → Controller → Service → Model (Eloquent)`

| Thành phần | Vị trí | Trách nhiệm |
| --- | --- | --- |
| Route | `routes/api.php` | Tự có prefix `/api/v1` (cấu hình trong `bootstrap/app.php`). Đặt tên route dạng `api.v1.<resource>.<action>`. |
| Controller | `app/Http/Controllers/Api/V1/` | Mỏng: nhận FormRequest, gọi `authorize`/Policy, gọi Service, trả về Resource. Không chứa logic nghiệp vụ hay query phức tạp. |
| FormRequest | `app/Http/Requests/<Resource>/` | Validate input; thông báo lỗi tiếng Việt. |
| Service | `app/Services/` | Logic nghiệp vụ, transaction (`DB::transaction`). Inject qua constructor. |
| Model | `app/Models/` | Eloquent: quan hệ, casts, scopes. Truy vấn trực tiếp qua Eloquent — **không** tạo Repository. |
| API Resource | `app/Http/Resources/` | Định dạng JSON trả về. Không trả Model thô. |
| Policy | `app/Policies/` | Phân quyền theo vai trò/sở hữu. |
| Enum | `app/Enums/` | PHP backed enum cho trạng thái/loại; cast trong Model. |

Quy ước:
- Response JSON theo chuẩn API Resource (`{ "data": ... }`); lỗi validation 422 theo mặc định của Laravel.
- Xác thực: **Sanctum SPA session cookie** (`statefulApi()`), route cần đăng nhập dùng `middleware('auth:sanctum')`. Không dùng personal access token trừ khi được yêu cầu.
- Tiền tệ lưu số nguyên (VND), không dùng float. Thời gian lưu theo `APP_TIMEZONE` (Asia/Ho_Chi_Minh).
- Mỗi endpoint mới cần Feature test trong `tests/Feature/` (PHPUnit; test dùng SQLite in-memory).
- Code style: Laravel Pint (`vendor/bin/pint`).

## 4. Kiến trúc frontend (React 19 + TypeScript + Vite)

| Thư mục | Nội dung |
| --- | --- |
| `src/app/` | `App.tsx`, `router.tsx` — khai báo toàn bộ route. |
| `src/components/layouts/` | `PublicLayout`, `ResidentLayout`, `AdminLayout` (hai layout sau dùng chung `DashboardShell`). |
| `src/components/ui/` | Component giao diện dùng chung, không phụ thuộc nghiệp vụ. |
| `src/features/<feature>/` | Mỗi nghiệp vụ một module: `api.ts` (gọi API), `types.ts`, `schemas.ts` (Zod), component riêng. |
| `src/pages/<area>/` | Trang theo khu vực `public/`, `resident/`, `admin/`; ghép component từ `features/`. |
| `src/hooks/`, `src/lib/`, `src/types/` | Hook, tiện ích (`lib/http.ts`), kiểu dùng chung. |

Quy ước:
- Import tuyệt đối qua alias `@/` (trỏ tới `src/`).
- Gọi API **chỉ** qua instance `http` trong `src/lib/http.ts` (đã bật `withCredentials` + XSRF cho Sanctum). Gọi `fetchCsrfCookie()` trước khi đăng nhập.
- Form: React Hook Form + Zod (`zodResolver`). Biểu đồ: Recharts.
- Styling: Tailwind CSS utility; màu thương hiệu `brand-*` khai báo trong `src/index.css`.
- State: `useState`/Context. Không thêm Redux hay thư viện state toàn cục khi chưa được duyệt.
- Giao diện responsive (mobile trước), văn bản tiếng Việt.

## 5. Môi trường & lệnh kiểm tra

- Chạy toàn bộ: `docker compose up -d --build` → http://localhost:8080.
- Lệnh Laravel: `docker compose exec app php artisan ...`
- Trước khi báo hoàn thành, chạy và đọc kết quả:
  - `cd frontend && npm run build && npm run lint`
  - `cd backend && php artisan test && vendor/bin/pint --test`
- Chỉ báo thành công những gì đã thực sự chạy và kiểm chứng.

## 6. Git

- Commit nhỏ, message dạng `<type>: <mô tả>` (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`).
- Kiểm tra `git status` trước khi commit để chắc chắn không có `.env` hay file rác.
