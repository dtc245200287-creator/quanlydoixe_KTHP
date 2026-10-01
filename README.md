# HỆ THỐNG QUẢN LÝ ĐỘI XE / FLEET

## 1. Giới thiệu

Hệ thống Quản lý Đội xe là ứng dụng web phục vụ quản lý:

- Xe
- Tài xế
- Bảo dưỡng
- Lịch trình

Ứng dụng sử dụng PostgreSQL làm cơ sở dữ liệu và pgAdmin để quản lý cơ sở dữ liệu.

## 2. Công nghệ sử dụng

- Node.js
- Express
- EJS
- PostgreSQL
- pgAdmin
- Nginx
- Docker
- Docker Compose

## 3. Chức năng

### Quản lý xe

- Thêm xe
- Xem danh sách xe
- Sửa thông tin xe
- Xóa xe

### Quản lý tài xế

- Thêm tài xế
- Xem danh sách tài xế
- Sửa thông tin tài xế
- Xóa tài xế

### Quản lý bảo dưỡng

- Thêm thông tin bảo dưỡng
- Xem lịch sử bảo dưỡng
- Sửa thông tin bảo dưỡng
- Xóa thông tin bảo dưỡng

### Quản lý lịch trình

- Thêm lịch trình
- Xem danh sách lịch trình
- Sửa lịch trình
- Xóa lịch trình

## 4. Cơ sở dữ liệu

Hệ thống sử dụng PostgreSQL gồm các bảng:

- vehicles
- drivers
- maintenance
- schedules

## 5. Cách chạy hệ thống

Tạo file `.env` dựa trên `.env.example`.

Sau đó chạy:

```bash
docker compose up -d --build

## 9. Đăng nhập và đăng xuất

Hệ thống yêu cầu người dùng đăng nhập trước khi truy cập các chức năng quản lý.

Thông tin tài khoản quản trị được cấu hình thông qua các biến môi trường:

- ADMIN_USERNAME
- ADMIN_PASSWORD
- SESSION_SECRET

Mật khẩu không được lưu trực tiếp trong mã nguồn. Ứng dụng sử dụng bcrypt để mã hóa mật khẩu trước khi lưu vào PostgreSQL.

Sau khi đăng nhập thành công, người dùng có thể sử dụng các chức năng quản lý xe, tài xế, bảo dưỡng và lịch trình.

Người dùng có thể sử dụng chức năng Đăng xuất để kết thúc phiên làm việc.
