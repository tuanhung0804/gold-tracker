# Bổ sung Giá Vàng SJC và Giá Vàng Thế Giới

Kế hoạch này mô tả cách lấy dữ liệu "Vàng nhẫn SJC 99,99% 1 chỉ, 2 chỉ, 5 chỉ" và "Giá vàng thế giới" từ `sjc.com.vn`, đồng thời ghi nhận giá hôm qua để tính toán mức độ thay đổi.

> [!WARNING]
> **Vấn đề chặn Cloudflare trên sjc.com.vn**
> Trang web `sjc.com.vn` và API `PriceService.ashx` hiện đang được bảo vệ bởi Cloudflare (trang kiểm tra "Just a moment..."). Lệnh `curl` bạn cung cấp hoạt động được là do sử dụng cookie `cf_clearance` lấy từ trình duyệt, nhưng cookie này sẽ hết hạn. Việc gọi API tự động từ server (Next.js) sẽ bị chặn. Chúng ta cần quyết định cách giải quyết:
> 1. **Sử dụng API trung gian/Proxy**: Dùng các dịch vụ như ScraperAPI, ZenRows để vượt qua Cloudflare.
> 2. **Sử dụng nguồn khác**: Lấy giá SJC và Giá Thế Giới từ các trang không bị chặn Cloudflare gắt gao.
> 3. **Cập nhật thủ công cookie**: Hoặc chạy một script Puppeteer có stealth plugin (tuy nhiên cách này thường không ổn định trên server Linux).

> [!IMPORTANT]
> **Nguồn Giá Vàng Thế Giới (XAUUSD)**
> Trong JSON response từ `PriceService.ashx` mà bạn cung cấp, **không có dữ liệu của Giá vàng thế giới (XAUUSD)**. Trang web SJC lấy giá thế giới thông qua một Widget từ TradingView (như trong hình chụp có logo TradingView). Chúng ta sẽ cần lấy giá thế giới qua một API khác (ví dụ: hàm fetch API từ các trang tỷ giá, hoặc từ chính dữ liệu của TradingView/Yahoo Finance).

## Open Questions
1. Bạn muốn xử lý vấn đề Cloudflare chặn `sjc.com.vn` như thế nào? Chúng ta có thể dùng một nguồn dữ liệu thay thế dễ lấy hơn không?
2. Dữ liệu Giá vàng thế giới không có trong API của SJC, bạn có đồng ý dùng một nguồn API tài chính khác (như Yahoo Finance API hoặc các nguồn open API khác) để lấy giá XAUUSD không?

## Proposed Changes

### Database (Prisma)
- Đảm bảo model `PriceHistory` có thể lưu trữ và phân biệt nhiều loại vàng dựa trên trường `name` ("Vàng nhẫn SJC 99,99% 1 chỉ, 2 chỉ, 5 chỉ" và "Giá vàng thế giới").
- Hiện tại bảng `PriceHistory` lưu `buyPrice` và `sellPrice`. Với giá thế giới, ta có thể lưu giá trị vào `buyPrice` hoặc `sellPrice`.

### `src/lib/scraper.ts` (Hoặc file fetch API)
- **Cập nhật hàm fetch**: Thay vì (hoặc song song với) việc lấy giá từ `ngoccuanhabe.com`, ta sẽ thêm logic gọi API lấy giá SJC và Giá thế giới.
- **Tính toán thay đổi so với hôm qua**:
  - Khi API được gọi, ta sẽ query vào database: `prisma.priceHistory.findFirst({ where: { name: <Loại Vàng>, createdAt: { lt: startOfToday } }, orderBy: { createdAt: 'desc' } })`.
  - Tính toán `change` (Giá hiện tại - Giá hôm qua) và `percentChange` ((Change / Giá hôm qua) * 100).
- Cập nhật interface `GoldPriceData` để trả về thêm các trường: `previousBuyPrice`, `previousSellPrice`, `buyChange`, `sellChange`, `buyPercentChange`, `sellPercentChange`.

### UI Components
- **Cập nhật Widget Giá Vàng**: Hiển thị 2 dòng thông tin mới (SJC Nhẫn và XAUUSD).
- **Thêm chỉ báo tăng/giảm**: Nếu giá tăng so với hôm qua sẽ hiển thị mũi tên lên màu xanh lá, nếu giảm hiển thị mũi tên xuống màu đỏ, kèm tỷ lệ phần trăm (VD: `+50,000 (+0.03%)`).

## Verification Plan
1. Viết script test độc lập để gọi API lấy giá SJC và XAUUSD thành công (sau khi chốt được phương án vượt Cloudflare hoặc đổi nguồn).
2. Kiểm tra log của database xem giá trị có được lưu chính xác vào `PriceHistory` với đúng `name` không.
3. Chỉnh sửa ngày (createdAt) của một record trong database lùi về hôm qua để kiểm thử tính năng tính toán phần trăm thay đổi trên giao diện UI.
