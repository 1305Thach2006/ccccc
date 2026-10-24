# Sử dụng Node.js bản Alpine siêu nhẹ cho Frontend Server
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /usr/src/app

# Sao chép toàn bộ mã nguồn giao diện (HTML, CSS, JS, JSON)
COPY . .

# Mở cổng 5050 theo cấu hình của server.js
EXPOSE 5050

# Khởi chạy Node HTTP server phục vụ giao diện
CMD ["node", "server.js"]
