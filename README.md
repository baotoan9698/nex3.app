# NEX3 — Next.js

Bản chuyển website `nex3.app` từ Framer sang **Next.js App Router + React + TypeScript**. Chạy độc lập, không nhúng website gốc, không tải Framer runtime, không cần tài khoản Framer.

## Chạy tại máy

Khuyến nghị Node.js 22 LTS trở lên.

```bash
npm install
npm run dev
```

Mở http://127.0.0.1:3000.

```bash
npm run typecheck
npm run build
npm start
```

Deploy bằng Vercel hoặc máy chủ hỗ trợ Node.js/Next.js; không cần Framer hosting.

## Nội dung đã chuyển

- Trang chủ, `/solution`, `/partner`, `/aboutus`, `/next3-debut`, `/blog`, `/404`.
- Bốn bài blog, giữ nguyên URL, nội dung và hình ảnh.
- 319 file hình ảnh/font được lưu trong `public/assets/`.
- Bố cục và CSS responsive của thiết kế gốc, kể cả các hình SVG và gradient.
- Animation xuất hiện khi cuộn, hiệu ứng nổi lặp lại, hover, carousel có autoplay/nút điều hướng/swipe, FAQ và accordion Solutions.
- Trên mobile, ba layer Protocol Architecture dùng SVG động thay ảnh PNG tĩnh; các mục tự giãn chiều cao để không cắt hình trên màn hình hẹp.
- Menu mobile, hỗ trợ bàn phím và tùy chọn giảm chuyển động của hệ điều hành.

## Cấu trúc và chỉnh sửa

| Vị trí | Nội dung |
| --- | --- |
| `src/app/[[...slug]]/page.tsx` | Routes Next.js, static generation, metadata |
| `src/components/SitePage.tsx` | Render layout thành React Server Components và thay tương tác bằng React |
| `src/components/interactions.tsx` | Menu, carousel, accordion, form liên hệ |
| `src/components/MotionRuntime.tsx` | Animation bằng Web Animations API + IntersectionObserver |
| `src/components/ArchitectureScroll.tsx` | Ba minh họa Protocol Architecture đổi theo vị trí cuộn, hiệu ứng mở các lớp, thanh tím và icon tiến trình hai chiều |
| `src/app/globals.css` | CSS bổ sung cho tương tác và accessibility |
| `src/content/*.html` | Nội dung/layout từng trang; `home` là trang chủ, `__` thay `/` trong URL |
| `src/content/*.css` | CSS thiết kế gốc của từng trang |
| `src/content/*.animations.json` | Thông số animation xuất hiện gốc |
| `src/content/loops.json` | Thông số hiệu ứng lặp của hình minh họa |
| `src/content/faq.json` | Nội dung accordion, kể cả câu trả lời ẩn trong bản gốc |
| `public/assets` | Tài nguyên cục bộ |

Để giữ độ giống bản gốc, cấu trúc layout và tên class CSS từ bản xuất Framer được giữ lại. HTML được parse ở server thành React elements; JavaScript của Framer đã được thay bằng các component và animation cục bộ. Không dùng iframe hay thực thi JavaScript từ bản xuất.

Animation spring được tái dựng bằng timing trình duyệt, vì vậy cảm giác chuyển động có thể khác nhẹ so với engine Framer. Một số hiệu ứng hover và menu mobile được triển khai lại bằng CSS/React. Website không phụ thuộc kết nối tới Framer khi chạy.

## Form liên hệ

Sao chép `.env.example` thành `.env.local`.

- `CONTACT_EMAIL`: địa chỉ nhận bản nháp email.
- `CONTACT_WEBHOOK_URL`: endpoint server nhận JSON `{ name, email, message }`, ví dụ dịch vụ email hoặc hệ thống CRM của bạn.

Nếu chưa cấu hình webhook, form tạo liên kết để người dùng tiếp tục gửi bằng ứng dụng email. Website **không báo đã gửi** trong trường hợp này. Không có khóa API hoặc thông tin đăng nhập Framer trong source.

Các liên kết tới demo app và mạng xã hội vẫn trỏ tới dịch vụ gốc. Terms/Privacy giữ nội dung hiển thị như bản gốc vì website nguồn không cung cấp trang đích cho hai mục này.

## Làm mới bản chụp nội dung

Chỉ dùng khi muốn cập nhật lại từ website nguồn; lệnh này ghi lại các file trong `src/content/`.

```bash
python -m pip install -r scripts/requirements.txt
python scripts/migrate.py
python scripts/verify-content.py
```

Script migration chỉ chạy khi được gọi thủ công. Build và website đang chạy không tải nội dung từ website nguồn. Các file tham khảo trong `.reference/` được bỏ qua bởi Git.
