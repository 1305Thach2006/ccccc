#!/usr/bin/env bash
set -e

echo "========================================================"
echo "   KHỞI ĐỘNG HỆ THỐNG AI CAREER COACH (DOCKER)"
echo "========================================================"

# 1. Tự động tạo file .env từ .env.example nếu chưa có
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[INFO] Đang tạo file .env từ .env.example..."
    cp .env.example .env
fi

# 2. Kiểm tra Docker đã chạy chưa
if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker chưa được bật! Vui lòng khởi động Docker trước."
    exit 1
fi

# 3. Build và khởi chạy các container (PostgreSQL + Ollama AI + Backend + Frontend)
echo "[INFO] Đang build và khởi chạy các container (PostgreSQL, Ollama AI, Backend, Frontend)..."
docker compose up --build -d

echo ""
echo "========================================================"
echo "   HỆ THỐNG ĐÃ KHỞI CHẠY THÀNH CÔNG!"
echo "   - Giao diện Frontend : http://localhost:5050"
echo "   - Backend Swagger API: http://localhost:8000/docs"
echo "   - PostgreSQL Database: localhost:5433"
echo "========================================================"
