#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "========================================================"
echo "   KHỞI ĐỘNG HỆ THỐNG AI CAREER COACH (DOCKER)"
echo "========================================================"

# 1. Kiểm tra Docker đã chạy chưa
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker chưa được bật! Vui lòng khởi động Docker trước."
    exit 1
fi

# 2. Dừng container cũ của dự án (không xóa dữ liệu) để giải phóng cổng
docker compose down --remove-orphans > /dev/null 2>&1 || true

# 3. Build và khởi chạy 4 container (PostgreSQL + Ollama AI + Backend + Frontend)
echo "[INFO] Đang build và khởi chạy các container..."
docker compose up --build -d

echo ""
echo "========================================================"
echo "   HỆ THỐNG ĐÃ KHỞI CHẠY THÀNH CÔNG!"
echo "   - Giao diện Web      : http://localhost:5050"
echo "   - Backend Swagger API: http://localhost:8000/docs"
echo "   - PostgreSQL         : localhost:5433"
echo ""
echo "   Lần chạy đầu tiên sẽ tải model AI qwen3.5:4b (~3.3 GB)."
echo "   Xem tiến độ: docker logs -f career_coach_ollama"
echo "========================================================"
