#!/usr/bin/env sh
# Tạo file .env cho Docker Compose và backend nếu chưa có. Không ghi đè file đã tồn tại.
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

random_secret() {
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24
}

if [ -f .env ]; then
    echo "Đã có .env — bỏ qua."
else
    sed -e "s/^DB_PASSWORD=$/DB_PASSWORD=$(random_secret)/" \
        -e "s/^DB_ROOT_PASSWORD=$/DB_ROOT_PASSWORD=$(random_secret)/" \
        .env.example > .env
    echo "Đã tạo .env với mật khẩu MySQL ngẫu nhiên."
fi

if [ -f backend/.env ]; then
    echo "Đã có backend/.env — bỏ qua."
else
    db_password="$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)"
    db_port="$(grep '^DB_FORWARD_PORT=' .env | cut -d= -f2-)"
    sed -e "s/^DB_PASSWORD=.*/DB_PASSWORD=${db_password}/" \
        -e "s/^DB_PORT=.*/DB_PORT=${db_port:-3307}/" \
        backend/.env.example > backend/.env
    echo "Đã tạo backend/.env (APP_KEY sẽ được sinh khi container app khởi động)."
fi
