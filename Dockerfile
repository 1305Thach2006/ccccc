# Backend FastAPI - Python 3.11 bản gọn nhẹ (slim)
FROM python:3.11-slim

# Biến môi trường tối ưu cho Python trong Docker và múi giờ Việt Nam (UTC+7)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TZ=Asia/Ho_Chi_Minh

# Thư mục làm việc trong container
WORKDIR /app

# Cài đặt thư viện Python (psycopg2-binary đã kèm sẵn libpq, không cần cài gcc)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Sao chép mã nguồn Backend (các file thừa đã được loại trừ trong .dockerignore)
COPY main.py .

# Cổng FastAPI Backend
EXPOSE 8000

# Khởi chạy server FastAPI bằng Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
