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

## 10. Giám sát hệ thống

Hệ thống sử dụng Prometheus và Grafana để giám sát các thành phần triển khai bằng Docker Compose.

### Prometheus

Truy cập:

http://localhost:9090

Prometheus thu thập metrics từ:

- cAdvisor: giám sát container
- Nginx Prometheus Exporter: giám sát Nginx
- PostgreSQL Exporter: giám sát PostgreSQL

### Grafana

Truy cập:

http://localhost:3001

Dashboard:

Fleet Management Monitoring

Dashboard gồm:

- Container Memory Usage
- Nginx Active Connections
- PostgreSQL Status

Grafana sử dụng Prometheus làm Data Source.


## 11. Log tập trung với Loki và Promtail

Hệ thống sử dụng Loki và Promtail để thu thập và truy vấn log tập trung của các container Docker.

Grafana kết nối đến Loki thông qua địa chỉ:

http://loki:3100

Các truy vấn LogQL đã kiểm thử:

- {container="fleet-nginx"}
- {container="fleet-app"}
- {container="fleet-promtail"}

Promtail thu thập log từ các container Docker và gửi về Loki. Log được truy vấn thông qua Grafana Explore.

## 12. Hardening hệ thống

Hệ thống áp dụng các biện pháp bảo mật sau:

1. Ứng dụng Node.js chạy bằng user non-root.
2. PostgreSQL và các dịch vụ nội bộ sử dụng Docker network isolation.
3. Mật khẩu và secret được lưu trong file .env và không được commit lên GitHub.
4. Nginx cấu hình các Security Headers:
   - X-Frame-Options
   - X-Content-Type-Options
   - Referrer-Policy

## 13. HTTPS Self-signed

Nginx được cấu hình hỗ trợ HTTPS sử dụng chứng chỉ self-signed.

HTTP trên cổng 80 tự động chuyển hướng sang HTTPS trên cổng 443.

Các Security Headers:

- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- X-XSS-Protection: 1; mode=block

Certificate và private key được tạo bằng OpenSSL và không được commit lên GitHub.

## 14. Giám sát bổ sung

Dashboard Fleet Management Monitoring trên Grafana gồm:

- Container Memory Usage
- Container CPU Usage (%)
- Container Network I/O
- Nginx Active Connections
- PostgreSQL Status

Các truy vấn LogQL nâng cao:

- Lọc HTTP 5xx:
  {container="fleet-nginx"} |~ "502|503|500"

- Tìm lỗi và ngoại lệ:
  {container=~"fleet-app|fleet-loki|fleet-promtail"} |~ "(?i)(error|exception|failed)"

## 15. UFW Firewall

Hệ thống sử dụng UFW với chính sách mặc định từ chối kết nối vào không được cho phép.

Các cổng được mở:

- 22/tcp: SSH
- 80/tcp: HTTP
- 443/tcp: HTTPS
- 3001/tcp: Grafana
- 5050/tcp: pgAdmin
- 9090/tcp: Prometheus

PostgreSQL, Loki và các exporter không được mở trực tiếp ra ngoài.
