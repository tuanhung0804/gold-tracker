# Quy trình triển khai hệ thống (Deployment Procedure)

Tài liệu này hướng dẫn quy trình tiêu chuẩn để cập nhật cấu trúc cơ sở dữ liệu Turso và triển khai ứng dụng Next.js lên môi trường Live trên Google Cloud Run (`gold-tracker-app` ở vùng `asia-northeast1`).

---

## 📋 Checklist Trước Khi Triển Khai

Trước khi đẩy bất kỳ mã nguồn nào lên môi trường Live, hãy đảm bảo các bước sau đã được kiểm tra:

### 1. Kiểm tra biên dịch mã nguồn (Local Build Verification)
Đảm bảo mã nguồn không chứa lỗi cú pháp, lỗi TypeScript hoặc lỗi đóng gói:
```bash
npm run build
```
*Yêu cầu:* Lệnh biên dịch thành công 100% với thông báo `✓ Compiled successfully`.

---

## 🚀 Quy Trình Triển Khai Tiêu Chuẩn 3 Bước (Standard 3-Step Deployment)

Quy trình triển khai bắt buộc tuân thủ việc xác minh môi trường cục bộ trước khi chuyển sang môi trường live. Agent KHÔNG ĐƯỢC TỰ ĐỘNG triển khai lên đám mây mà không có sự xác nhận của người dùng.

---

### BƯỚC 1: Triển khai & Xác minh Cục bộ (Localhost Deployment & Verification)
1. **Biên dịch mã nguồn cục bộ (Build)**:
   Biên dịch toàn bộ mã nguồn sang chế độ Production để tối ưu hóa hiệu năng và tránh độ trễ biên dịch on-the-fly:
   ```bash
   npm run build
   ```
2. **Khởi động Máy chủ Production Cục bộ (Start)**:
   Khởi chạy máy chủ ở chế độ Production (chạy rất nhanh, tải trang <10ms và không bị treo cổng WebSocket HMR như chế độ `dev`):
   ```bash
   npm run start
   ```
3. **Xác minh & Chụp ảnh minh chứng (Screenshot Evidence)**:
   - Agent sử dụng công cụ Playwright/Puppeteer truy cập địa chỉ IPv4 **`http://127.0.0.1:3000/login`** (tránh dùng `localhost` để không bị lỗi phân giải IPv6 `::1` trên Windows).
   - Tiến hành tự động chụp ảnh màn hình giao diện Desktop và Mobile làm bằng chứng kiểm thử thực tế.
   - Tắt máy chủ cục bộ sau khi hoàn thành.
4. **Báo cáo Local**:
   - Agent tạo hoặc cập nhật tệp báo cáo `walkthrough.md`, nhúng các đường dẫn ảnh chụp màn hình thật đã ghi lại được.
   - Gửi yêu cầu người dùng kiểm tra báo cáo trực quan này và chờ xác nhận đồng ý triển khai lên Cloud.

---

### BƯỚC 2: Đồng bộ Cơ sở dữ liệu Live (Live Database Schema Migration)
Khi người dùng đã xác nhận đồng ý triển khai, tiến hành cập nhật Schema (nếu có thay đổi trong `prisma/schema.prisma`) lên cơ sở dữ liệu Turso trên môi trường Live:

Chạy tập lệnh khởi tạo/cập nhật database:
```bash
# In Windows PowerShell
$env:DATABASE_URL="libsql://gold-tracker-db-tuanhung0804.aws-ap-northeast-1.turso.io"
$env:TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAyMTMyNjAsImlkIjoiMDE5ZTdjZjktZTQwMS03YTg1LWIxNmItZjVjYzU3Njk3NjUxIiwicmlkIjoiMWRjNzUwOWQtMGQ4My00MGVhLWEyYjQtY2MzOTI1NmRlNmIyIn0.1rr33icJ_dOPp1-FaqJIWiBxOWd6T6bdiCrHrt6xC_q8xWWMgXu7cN6V40MBoCKha5lJh61OEwGrwexXKTo7AQ"
npx tsx prisma/setup-turso.ts
```

---

### BƯỚC 3: Triển khai & Xác minh Live (Cloud Deployment & Live Verification)
1. **Triển khai lên Google Cloud Run**:
   Đẩy mã nguồn lên Cloud Build để cập nhật dịch vụ live.
   
   **Tokyo (asia-northeast1) - MAIN SERVER (Khuyên dùng do gần Turso DB):**
   ```bash
   gcloud run deploy gold-tracker-app --source . --region asia-northeast1 --project hungvt8 --set-env-vars="TURSO_AUTH_TOKEN=your_token_here"
   ```

2. **Xác minh Live & Chụp ảnh minh chứng**:
   - Truy cập trang chủ chính thức: [https://gold-tracker-app-479335197996.asia-northeast1.run.app/](https://gold-tracker-app-479335197996.asia-northeast1.run.app/)
   - Thực hiện kiểm tra các luồng đi của hệ thống (middleware chuyển hướng, đăng nhập PIN User `0811`, PIN Admin `8646`).
   - Chụp ảnh màn hình giao diện live để chứng minh các thay đổi đã hoạt động chính xác trên môi trường thực tế.
3. **Báo cáo Live**:
   - Cập nhật tệp `walkthrough.md` với các hình ảnh và thông tin kiểm thử trên môi trường Live để hoàn tất quá trình bàn giao.
Khi lệnh Deploy hoàn tất và trả về thông báo thành công:

1. Truy cập trang chủ chính thức: [https://gold-tracker-app-479335197996.asia-northeast1.run.app/](https://gold-tracker-app-479335197996.asia-northeast1.run.app/)
2. Kiểm tra xem hệ thống có tự động chuyển hướng về trang `/login` hay không (để xác minh middleware/proxy hoạt động tốt).
3. Đăng nhập thử bằng mã PIN User (`0811`) để đảm bảo kết nối DB Turso mượt mà.
4. Đăng nhập thử bằng mã PIN Admin (`8646`) và truy cập `/admin/lockouts` để xác minh dữ liệu quản trị viên.

---

## 🛠️ Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 1. Lỗi "no such table: main.[TableName]"
*   **Nguyên nhân:** Bảng mới tạo trong `schema.prisma` chưa được cập nhật lên Turso.
*   **Khắc phục:** Thực hiện lại **Bước 1** để chạy tệp script đồng bộ SQL lên Turso DB.

### 2. Gặp lỗi "DriverAdapterError" khi kết nối cơ sở dữ liệu
*   **Nguyên nhân:** Khóa `TURSO_AUTH_TOKEN` hết hạn hoặc không khớp trong biến môi trường của Cloud Run.
*   **Khắc phục:** Cập nhật lại biến môi trường trên Cloud Run Console hoặc sử dụng lệnh:
    ```bash
    gcloud run services update gold-tracker-app --set-env-vars="TURSO_AUTH_TOKEN=your_token_here" --region asia-northeast1 --project hungvt8
    ```
