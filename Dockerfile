# Sử dụng Python 3.11 bản gọn nhẹ (slim)
FROM python:3.11-slim

# Thiết lập biến môi trường tối ưu cho Python trong Docker
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các gói phụ thuộc hệ thống cần thiết cho psycopg2 / PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Sao chép file requirements.txt và cài đặt thư viện Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn dự án vào container
COPY . .

# Mở cổng 8000 cho FastAPI Backend
EXPOSE 8000

# Lệnh khởi chạy server FastAPI bằng Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
