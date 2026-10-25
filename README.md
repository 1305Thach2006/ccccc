# 🌱 AI Career Coach - Hệ Thống Định Hướng Nghề Nghiệp Đa Ngành, Lập Lộ Trình Học Tập & Phỏng Vấn Thử AI

> **Đề án / Bài thi thực hành**: Ứng dụng Trí tuệ Nhân tạo (**LLM Qwen 3.5:4b qua Ollama** kết hợp **Hệ thống Trích xuất Kỹ năng Đa ngành Universal**) cùng **FastAPI**, **PostgreSQL 15** và **Gamification** hỗ trợ người học ở **tất cả các ngành nghề** phân tích khoảng trống kỹ năng (Skill Gap) từ CV & JD tự do, tự động lập lịch học theo thời gian rảnh (múi giờ Việt Nam `UTC+7`) và luyện phỏng vấn ngẫu nhiên đa vòng theo mô hình chuẩn **STAR**.
>
> **Đặc điểm nổi bật khi triển khai**: Toàn bộ hệ thống gồm **4 thành phần (Database PostgreSQL + AI Server Ollama + Backend FastAPI + Frontend Web)** đã được đóng gói **100% bên trong Docker**. Người chấm bài / người dùng tải về từ GitHub **không cần cài đặt Python, Node.js, PostgreSQL hay Ollama ngoài máy thật**, chỉ cần chạy duy nhất lệnh `docker compose up --build -d`.

---

## 📌 1. Giới thiệu tổng quan

**AI Career Coach** giải quyết bài toán định hướng nghề nghiệp và huấn luyện kỹ năng cho sinh viên / người đi làm ở mọi lĩnh vực thông qua quy trình khép kín 4 bước:
1. **Đánh giá năng lực hiện tại (Đa ngành nghề)**: Trích xuất tự động kỹ năng và kinh nghiệm từ file CV PDF tải lên hoặc chọn bộ hồ sơ mẫu đa lĩnh vực. Hỗ trợ nhận diện kỹ năng trên **12 nhóm ngành lớn** (*CNTT/Phần mềm, Dữ liệu/AI, Tài chính/Kế toán/Kiểm toán, Luật/Pháp chế, Marketing/Truyền thông, Nhân sự/HR, Kinh doanh/Sales, Logistics/Chuỗi cung ứng, Kỹ thuật/Sản xuất, Y dược, Giáo dục, Thiết kế/Sáng tạo*).
2. **Phân tích Độ khớp & Kết luận Chuyên sâu (Universal Skill-Gap & JD Analysis)**: So khớp hồ sơ với vị trí mẫu hoặc **Mô tả công việc (JD) dán tự do của bất kỳ ngành nào**. Chấm điểm theo công thức trọng số, vẽ biểu đồ Radar năng lực theo nhóm ngành và đưa ra **Báo cáo Kết luận & Đánh giá chuyên sâu** đa chiều.
3. **Lên lộ trình học tập & Băm giờ thông minh (Smart Study Planner - Múi giờ `UTC+7`)**: Thiết kế các bài học bù đắp đúng các kỹ năng còn thiếu, tự động cắt nhỏ thời lượng bài học để lấp vừa khít các khung giờ rảnh thực tế của người học và tự động mở khóa đúng giờ (`unlock_time` theo chuẩn giờ Việt Nam `Asia/Ho_Chi_Minh`).
4. **Luyện phỏng vấn Ngẫu nhiên Đa vòng & Chấm điểm STAR + Gamification**: Giả lập phòng phỏng vấn với 4 vòng (*Vòng Nhân sự HR, Vòng Chuyên môn Tech Lead, Vòng Văn hóa Culture Fit, Vòng Cuối Hiring Manager*). Mỗi lần vào phòng hoặc bấm đổi câu hỏi đều **sinh ngẫu nhiên bộ 3 câu hỏi mới** sát với ngành nghề, chấm điểm chi tiết (thang `1.0 – 10.0`), nhận xét ưu/nhược điểm, viết lại đáp án mẫu chuẩn **STAR** và thưởng điểm **XP** để nuôi trồng **Mầm cây tri thức** qua 6 giai đoạn.

---

## 2. Các tính năng cốt lõi đã hoàn thiện

| Phân hệ | Chi tiết tính năng |
| :--- | :--- |
| **1. Quản lý Hồ sơ & Trích xuất CV Đa Ngành (Kèm Kỹ năng mềm)** | • Đăng ký / Đăng nhập tài khoản cá nhân (tự động khởi tạo hồ sơ & chậu cây Gamification).<br>• Tải lên file CV PDF (≤ 5MB): Tự động bóc tách **Kỹ năng chuyên môn đa ngành**, **Kinh nghiệm làm việc / Đồ án**.<br>• **Trích xuất Kỹ năng mềm (Soft Skills)**: Nếu CV chưa có kỹ năng chuyên ngành, hệ thống tự động tìm và bóc tách các **Kỹ năng mềm** người dùng liệt kê trên CV (Giao tiếp, Làm việc nhóm, Giải quyết vấn đề, Quản lý thời gian, Thuyết trình, Lãnh đạo...). |
| **2. Phân tích JD Tự Do Mọi Ngành & Kết luận Chuyên sâu** | • Hỗ trợ chọn JD mẫu đa ngành hoặc **dán trực tiếp bất kỳ JD thực tế nào vào ô JD Tự do**.<br>• Tự động trích xuất danh sách kỹ năng yêu cầu từ văn bản JD tự do ở mọi ngành nghề.<br>• Công thức chấm điểm định lượng: **50% Kỹ năng chuyên môn + 25% Mức độ hứng thú + 25% Kinh nghiệm thực tế**.<br>• Sinh **Báo cáo Kết luận Chuyên sâu** gồm: Đánh giá tổng quan, Điểm mạnh cốt lõi đã đáp ứng, Phân tích lỗ hổng kỹ năng (Skill Gaps) và Khuyến nghị hành động cụ thể. |
| **3. Lộ trình Học tập, Cập nhật Lịch rảnh Giữ Lộ trình & Sơ đồ Ziczac 1 Trái - 1 Phải** | • Tự động sinh danh sách bài học thực chiến bao phủ 100% các kỹ năng còn thiếu (Gaps) và **reset toàn bộ chỉ số thống kê** khi khởi tạo một lộ trình mới.<br>• **Cập nhật lịch rảnh giữ nguyên lộ trình (`/study-plan/update-schedule`)**: Cho phép người học đổi khung giờ rảnh và tự động phân bổ lại các bài học chưa hoàn thành mà không làm mất lộ trình, không mất bài đã học hay chuỗi Streak.<br>• **Giao diện Sơ đồ Lộ trình 1 Trái - 1 Phải**: Hiển thị xuyên suốt từ bài đầu đến hết lộ trình theo bố cục đối xứng trái - phải trực quan. |
| **4. Phỏng vấn Ngẫu nhiên Đa vòng (Tiếng Việt & Tiếng Anh 100%) & Chấm điểm STAR** | • **Hỗ trợ 2 ngôn ngữ Tiếng Việt & Tiếng Anh**: Khi chọn chế độ **Tiếng Anh**, toàn bộ câu hỏi, tiêu đề, gợi ý STAR và nhận xét chấm điểm đều được AI sinh 100% bằng Tiếng Anh chuyên ngành.<br>• **Bộ câu hỏi Random theo từng lượt**: Mỗi lần vào phòng hoặc bấm đổi câu hỏi ở bất kỳ vòng nào (*HR, Chuyên môn, Văn hóa, Manager*), hệ thống đều sinh ngẫu nhiên một bộ 3 câu hỏi mới.<br>• **Chấm điểm & Sửa bài chi tiết**: Đánh giá câu trả lời trên thang điểm `1.0 – 10.0` và viết lại đáp án mẫu chuẩn STAR. |
| **5. Gamification (Nuôi Cây Theo Số Ngày Lộ Trình, 1 Ngày = 1 Streak & Phiếu Nghỉ Phép)** | • **Quá trình nuôi cây gắn liền với lộ trình**: Tổng XP mục tiêu của cây được tính theo công thức `(Tổng số bài học × 50 XP) + (Số ngày của lộ trình × 25 XP tưới cây)` qua 6 giai đoạn phát triển (*Hạt giống → Nảy mầm → Phát triển thân → Phân cành → Ra lá → Kết trái*).<br>• **Logic 1 ngày làm bài = tối đa 1 Streak**: Hoàn thành nhiều bài học trong cùng 1 ngày chỉ cộng tối đa **+1 Streak** cho ngày đó.<br>• **Thẻ Phiếu Nghỉ Phép (Giới hạn 1 lần / 1 tuần)**: Cho phép học viên đăng ký nghỉ phép 1 ngày/tuần để bảo lưu chuỗi Streak không bị đứt đoạn. |

---

## 3. Kiến trúc hệ thống (4 Containers tự động hoàn toàn)

```mermaid
flowchart LR
    subgraph Client["Trình duyệt người dùng"]
        UI["Giao diện Web SPA\nhttp://localhost:5050"]
    end

    subgraph Docker["Môi trường Docker Compose (Tự động 100%)"]
        FE["1. career_coach_frontend\nNode.js 20 Alpine (Port 5050)"]
        BE["2. career_coach_backend\nFastAPI Python 3.11 (Port 8000)\nTimezone: Asia/Ho_Chi_Minh (UTC+7)"]
        DB[("3. career_coach_pg\nPostgreSQL 15 (Port 5433)")]
        AI["4. career_coach_ollama\nOllama AI + Model qwen3.5:4b\n(Port 11435 -> 11434)"]
    end

    UI -->|Truy cập Web :5050| FE
    UI -->|Gọi REST API :8000| BE
    BE -->|SQLAlchemy ORM| DB
    BE -->|Gọi trực tiếp Qwen 3.5:4b| AI
```

> **Cơ chế kết nối AI trực tiếp (`_smart_ollama_chat` trong `main.py`)**:
> * Hệ thống tự động dò tìm dịch vụ Ollama đang chạy mô hình `qwen3.5:4b` (trên máy host hoặc trong container `career_coach_ollama`) và gọi trực tiếp mô hình AI với chế độ tối ưu tốc độ (`think=False`) mà không sử dụng dữ liệu giả lập dự phòng (no fallback).

---

## 4. Hướng dẫn cài đặt và chạy dự án từ GitHub

### Yêu cầu duy nhất trước khi chạy
* Máy tính đã cài đặt và mở sẵn **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (đảm bảo biểu tượng Docker ở góc màn hình đang ở trạng thái **Running**).
* **Không cần** cài Python, **không cần** cài Node.js, **không cần** cài PostgreSQL hay Ollama bên ngoài.

---

### Bước 1: Tải mã nguồn từ GitHub về máy
Mở **Terminal**, **Command Prompt** hoặc **PowerShell**, chạy lệnh:
```bash
git clone https://github.com/1305Thach2006/ccccc.git
cd ccccc
```

---

### Bước 2: Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất
Tại thư mục dự án, chạy lệnh:
```bash
docker compose up --build -d
```

*(Lưu ý: Nếu trước đó trên máy đang có container cũ chiếm cổng `5050`, `8000` hoặc `5433`, hãy chạy `docker rm -f career_coach_frontend career_coach_backend career_coach_pg career_coach_ollama` hoặc `docker compose down` trước khi chạy `docker compose up --build -d`).*

---

### Bước 3: Mở trình duyệt và trải nghiệm ngay
Sau khi lệnh ở Bước 2 báo `Started`, bạn mở trình duyệt web và truy cập:

| Thành phần | Đường dẫn truy cập | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Giao diện Web chính (Frontend)** | **[http://localhost:5050](http://localhost:5050)** | Giao diện sử dụng đầy đủ các tính năng của ứng dụng |
| **Tài liệu API (Swagger UI)** | **[http://localhost:8000/docs](http://localhost:8000/docs)** | Giao diện kiểm thử trực tiếp 16 REST API của Backend |
| **Kiểm tra trạng thái Backend** | **[http://localhost:8000/](http://localhost:8000/)** | Trả về thông điệp JSON xác nhận server đang hoạt động |
| **PostgreSQL Database** | `localhost:5433` | **User**: `admin` \| **Pass**: `secretpassword123` \| **DB**: `career_coach` |
| **Ollama AI Container** | `localhost:11435` | Cổng AI nội bộ trong Docker (ánh xạ ra cổng `11435` để tránh trùng cổng `11434`) |

---

## 5. Danh mục 17 API Endpoints trong hệ thống

| Phương thức | Endpoint | Chức năng xử lý |
| :---: | :--- | :--- |
| `POST` | `/auth/register` | Đăng ký tài khoản học viên mới & tự động khởi tạo chậu cây Gamification |
| `POST` | `/auth/login` | Đăng nhập hệ thống và đồng bộ hồ sơ cá nhân |
| `GET` | `/auth/verify/{profile_id}` | Xác thực phiên đăng nhập lưu trong trình duyệt (tự dọn rác nếu DB bị xóa/reset) |
| `POST` | `/profiles/extract-cv/` | **[AI + Universal NLP]** Bóc tách kỹ năng chuyên ngành, kỹ năng mềm và kinh nghiệm từ văn bản CV PDF |
| `POST` | `/jobs/extract-advanced/` | **[AI + Universal NLP]** Trích xuất kỹ năng chuyên môn kèm bằng chứng từ Mô tả công việc (JD) |
| `POST` | `/analyses/match/{profile_id}/{role_id}` | **[AI + Thuật toán]** Phân tích độ khớp CV - JD mọi ngành nghề, vẽ biểu đồ Radar & sinh Kết luận chuyên sâu |
| `POST` | `/study-plan/generate` | **[AI + Băm giờ]** Sinh lộ trình học tập mới, chia nhỏ theo lịch rảnh (`UTC+7`) và reset toàn bộ thống kê lộ trình |
| `POST` | `/study-plan/update-schedule` | **[Cập nhật lịch rảnh]** Đổi lịch rảnh và xếp lại các bài chưa học nhưng **giữ nguyên lộ trình, bài đã học & Streak** |
| `GET` | `/study-plan/schedules/{profile_id}` | Lấy danh sách các khung giờ rảnh đã lưu của học viên |
| `GET` | `/study-plan/tasks/{profile_id}` | Lấy danh sách các bài học trong lộ trình đã lưu của học viên (theo đúng thứ tự) |
| `POST` | `/study-plan/complete-task` | Hoàn thành bài học (kiểm tra giờ mở khóa `UTC+7`), cộng +50 XP & tính Streak (tối đa 1 Streak/ngày) |
| `GET` | `/gamification/{profile_id}` | Lấy dữ liệu giai đoạn mầm cây theo lộ trình, XP, chuỗi Streak, Phiếu nghỉ phép và chỉ số kỷ luật |
| `POST` | `/gamification/water-plant/{profile_id}` | Tưới nước chăm sóc mầm cây mỗi ngày một lần (+25 XP tính vào tiến độ lộ trình học) |
| `POST` | `/gamification/use-leave-pass/{profile_id}` | Đăng ký sử dụng **Thẻ Phiếu Nghỉ Phép** (giới hạn 1 lần / 1 tuần) để bảo lưu chuỗi Streak |
| `POST` | `/interview/generate` | **[AI + Random Engine]** Sinh ngẫu nhiên bộ 3 câu hỏi phỏng vấn mới theo vòng, độ khó & ngôn ngữ (`vi` / `en`) |
| `POST` | `/interview/submit-and-evaluate/{question_id}` | **[AI Giám khảo]** Chấm điểm câu trả lời phỏng vấn (`1.0 – 10.0`), nhận xét & nâng cấp STAR theo ngôn ngữ đã chọn |
| `DELETE` | `/system/reset-database/` | Xóa và khởi tạo lại toàn bộ bảng trong Database để phục vụ kiểm thử |

---

## 🛠️ 6. Các lệnh quản lý nhanh & Tiện ích mở rộng

```bash
# 1. Xem trạng thái 4 container đang chạy
docker compose ps

# 2. Xem nhật ký hoạt động của Backend theo thời gian thực
docker compose logs -f backend

# 3. Xem tiến độ tải model AI qwen3.5:4b trong container Ollama
docker logs -f career_coach_ollama

# 4. Dừng tạm thời toàn bộ hệ thống (giữ nguyên dữ liệu Database và Model AI)
docker compose stop

# 5. Bật lại hệ thống sau khi stop
docker compose start
```

* **Chạy bằng GPU rời NVIDIA (Tùy chọn)**: Nếu máy có card đồ họa NVIDIA và đã cài NVIDIA Container Toolkit:
  ```bash
  docker compose -f docker-compose.gpu.yml up --build -d
  ```

---

## 🗑️ 7. Hướng dẫn XÓA SẠCH & Gỡ cài đặt hoàn toàn (Reset về trạng thái ban đầu)

Nếu bạn muốn **xóa sạch toàn bộ container, dữ liệu Database, Image đã build và thư mục code cũ** để tải lại mới hoàn toàn từ GitHub (hoặc dọn dẹp máy sau khi chấm bài xong), hãy thực hiện theo hướng dẫn dưới đây:

### Cách 1: Chỉ xóa dữ liệu & Container Docker (Giữ lại thư mục code)
Đứng tại thư mục dự án, chạy lệnh:
```bash
# Dừng và xóa toàn bộ containers + xóa sạch dữ liệu Database & Volume
docker compose down -v
```
*(Nếu muốn xóa luôn cả các Docker Image đã build để giải phóng dung lượng ổ cứng, chạy lệnh: `docker compose down -v --rmi all`).*

---

### Cách 2: XÓA SẠCH HOÀN TOÀN (Cả Docker lẫn Thư mục code để tải lại từ đầu)

Thực hiện lần lượt **3 bước** sau trong **PowerShell** hoặc **Terminal**:

#### Bước 1: Tắt và xóa toàn bộ Container, Volume, Image của dự án
```bash
docker compose down -v --rmi all
```

#### Bước 2: Thoát ra thư mục bên ngoài và xóa thư mục mã nguồn cũ
* **Trên Windows (PowerShell)**:
  ```powershell
  cd ..
  Remove-Item -Recurse -Force ccccc
  ```
  *(Lưu ý: Nếu thư mục của bạn có tên khác như `ai-career-coach`, hãy thay `ccccc` bằng tên thư mục đó).*

* **Trên Windows (Command Prompt - CMD)**:
  ```cmd
  cd ..
  rmdir /s /q ccccc
  ```

* **Trên macOS / Linux / Git Bash**:
  ```bash
  cd ..
  rm -rf ccccc
  ```

#### Bước 3: Xóa bộ nhớ tạm trình duyệt (Nếu muốn đăng nhập tài khoản mới tinh)
Khi mở lại trang web **[http://localhost:5050](http://localhost:5050)** sau khi cài mới, bạn có thể nhấn nút **"Đăng xuất"** ở góc trên bên phải (hoặc nhấn `F12` -> `Application` -> `Local Storage` -> `Clear`) để xóa phiên đăng nhập cũ trên trình duyệt.

#### Bước 4: Tải lại từ GitHub và khởi chạy mới (Nếu cần cài lại)
```bash
git clone https://github.com/1305Thach2006/ccccc.git
cd ccccc
docker compose up --build -d
```

---

## 📂 8. Cấu trúc thư mục dự án

```text
ai-career-coach/
├── front_end/
│   ├── Dockerfile             # Dockerfile đóng gói giao diện Frontend (Node.js 20 Alpine)
│   ├── index.html             # Giao diện chính của ứng dụng (Single Page Application)
│   ├── style.css              # Hệ thống giao diện & hiệu ứng chuyển động
│   ├── app.js                 # Logic xử lý phía Client, đồ họa SVG mầm cây, âm thanh & gọi API
│   ├── store.js               # Quản lý State & tự động đồng bộ LocalStorage / SessionStorage
│   ├── data.js                # Dữ liệu mẫu CV & Vị trí công việc đa ngành nghề
│   ├── roles.json             # Danh mục ngành nghề mẫu
│   ├── sample-profiles.json   # Hồ sơ sinh viên mẫu phục vụ chấm thử nhanh
│   └── server.js              # HTTP Server Node.js phục vụ giao diện tại cổng 5050
├── Dockerfile                 # Dockerfile chính đóng gói Backend FastAPI (Python 3.11 - Cổng 8000, UTC+7)
├── docker-compose.yml         # Điều phối trọn bộ 4 container: Postgres + Ollama AI + Backend + Frontend
├── docker-compose.gpu.yml     # Cấu hình mở rộng cho phép Ollama sử dụng GPU rời NVIDIA
├── requirements.txt           # Danh sách thư viện Python cần thiết
├── .env.example               # File mẫu cấu hình biến môi trường (Ports, DB, Ollama)
├── .gitattributes             # Chuẩn hóa ký tự xuống dòng LF/CRLF giữa Windows và Linux/macOS
├── .dockerignore              # Loại trừ file thừa khi build Docker image
├── .gitignore                 # Loại trừ file rác (__pycache__, .env...) khi đẩy lên GitHub
├── run.bat                    # Tiện ích phụ: Khởi chạy tự động 1-Click trên Windows
├── stop.bat                   # Tiện ích phụ: Dừng toàn bộ container trên Windows
├── run.sh                     # Tiện ích phụ: Khởi chạy tự động trên Linux / macOS
├── README.md                  # Tài liệu hướng dẫn cài đặt, sử dụng và gỡ bỏ chi tiết
├── models.py                  # Định nghĩa các bảng cơ sở dữ liệu SQLAlchemy (PostgreSQL)
├── schemas.py                 # Định nghĩa Pydantic Schemas kiểm tra dữ liệu đầu vào/đầu ra
├── database.py                # Cấu hình kết nối PostgreSQL qua SQLAlchemy
└── main.py                    # Mã nguồn Backend FastAPI + Đa ngành NLP + Xếp lịch UTC+7 + Phỏng vấn Random + Gamification
```
