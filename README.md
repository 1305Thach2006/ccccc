# AI Career Coach - Hệ Thống Định Hướng Nghề Nghiệp & Phỏng Vấn AI

Dự án **AI Career Coach** tích hợp trí tuệ nhân tạo (**Qwen 3.5:4b** qua **Ollama**) giúp sinh viên và ứng viên phân tích mức độ phù hợp CV với JD, tự động lên lộ trình học tập cá nhân hóa theo khung giờ rảnh, phỏng vấn thử theo mô hình STAR và theo dõi tiến độ học tập qua Gamification (Nuôi trồng mầm cây & Chuỗi Streak).

---

## Kiến trúc hệ thống

- **Backend (`main.py`)**: FastAPI (Python 3.11), SQLAlchemy ORM, kết nối PostgreSQL & Ollama AI (`qwen3.5:4b`). Chạy tại cổng `8000`.
- **Frontend (`front_end/`)**: Vanilla JavaScript SPA + Node.js HTTP Server (`server.js`). Chạy tại cổng `5050`.
- **Database (`postgres_db`)**: PostgreSQL 15 lưu trữ hồ sơ, phân tích khoảng trống kỹ năng, lộ trình học tập, chuỗi ngày học (Streak/XP) và lịch sử phỏng vấn. Ánh xạ cổng `5433:5432`.

---

## Hướng dẫn khởi chạy nhanh (Khuyên dùng khi chấm bài)

### Cách 1: Chạy tự động 1-Click bằng Script
* **Trên Windows**: Nhấp đúp chuột vào file **`run.bat`** (hoặc gõ `.\run.bat` trong Terminal). Script sẽ tự động tạo file `.env`, giải phóng cổng `5050` nếu bị kẹt, khởi chạy Docker Compose và mở trình duyệt. Để dừng hệ thống, chạy **`stop.bat`**.
* **Trên Linux / macOS**:
  ```bash
  chmod +x run.sh
  ./run.sh
  ```

### Cách 2: Chạy bằng lệnh Docker Compose

1. **Chế độ tiêu chuẩn** (Dùng Ollama cài sẵn trên máy thật):
   ```bash
   docker compose up --build -d
   ```

2. **Chế độ GPU đầy đủ** (Đóng gói cả Ollama chạy GPU NVIDIA bên trong Docker):
   ```bash
   docker compose -f docker-compose.gpu.yml up --build -d
   ```

Sau khi các container khởi chạy thành công:
- **Giao diện người dùng (Frontend)**: [http://localhost:5050](http://localhost:5050)
- **Tài liệu API (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: `localhost:5433` (User: `admin` | Password: `secretpassword123` | DB: `career_coach`)

---

## Cấu trúc thư mục

```text
ai-career-coach/
├── front_end/
│   ├── Dockerfile             # Dockerfile đóng gói giao diện Frontend (Node.js)
│   ├── index.html             # Giao diện chính của ứng dụng
│   ├── style.css              # Thiết kế giao diện
│   ├── app.js                 # Logic xử lý phía Client & gọi API
│   ├── store.js               # Quản lý State & LocalStorage/SessionStorage
│   ├── data.js                # Dữ liệu mẫu CV & Vị trí công việc
│   ├── roles.json             # Danh mục ngành nghề mẫu
│   ├── sample-profiles.json   # Hồ sơ sinh viên mẫu
│   └── server.js              # Server Node.js chạy cổng 5050
├── Dockerfile                 # Dockerfile chính đóng gói Backend FastAPI (Cổng 8000)
├── docker-compose.yml         # Điều phối Postgres + Backend + Frontend (kết nối Ollama máy chủ)
├── docker-compose.gpu.yml     # Điều phối trọn bộ kèm container Ollama sử dụng GPU NVIDIA
├── requirements.txt           # Danh sách thư viện Python
├── .env.example               # File mẫu cấu hình biến môi trường
├── .gitattributes             # Chuẩn hóa ký tự xuống dòng LF/CRLF giữa Windows và Linux
├── .dockerignore              # Loại trừ file thừa khi build Docker image
├── .gitignore                 # Loại trừ file thừa khi đẩy lên GitHub
├── run.bat                    # Script khởi chạy tự động 1-click trên Windows
├── stop.bat                   # Script dừng toàn bộ container trên Windows
├── run.sh                     # Script khởi chạy tự động trên Linux/macOS
└── main.py                    # Mã nguồn Backend FastAPI + AI + Gamification
```
