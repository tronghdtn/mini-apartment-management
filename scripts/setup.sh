#!/usr/bin/env sh
# Tạo/bổ sung file .env cho Docker Compose và backend.
# Chỉ thêm khóa còn thiếu hoặc đang rỗng; KHÔNG ghi đè giá trị đã có.
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

random_secret() {
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24
}

env_value() { # file key
    grep "^$2=" "$1" | head -n 1 | cut -d= -f2-
}

ensure_key() { # file key value
    if grep -q "^$2=." "$1"; then
        return 0
    fi
    if grep -q "^$2=$" "$1"; then
        tmp="$(mktemp)"
        sed "s/^$2=\$/$2=$3/" "$1" > "$tmp" && mv "$tmp" "$1"
    else
        printf '\n%s=%s\n' "$2" "$3" >> "$1"
    fi
    echo "  + $1: đặt $2"
}

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Đã tạo .env từ .env.example."
fi
ensure_key .env DB_PASSWORD "$(random_secret)"
ensure_key .env DB_ROOT_PASSWORD "$(random_secret)"
ensure_key .env DB_TEST_PASSWORD "$(random_secret)"

if [ ! -f backend/.env ]; then
    db_port="$(env_value .env DB_FORWARD_PORT)"
    sed -e "s/^DB_PORT=.*/DB_PORT=${db_port:-3307}/" backend/.env.example > backend/.env
    echo "Đã tạo backend/.env (APP_KEY sẽ được sinh khi container app khởi động)."
fi
ensure_key backend/.env DB_PASSWORD "$(env_value .env DB_PASSWORD)"
ensure_key backend/.env DB_TEST_PASSWORD "$(env_value .env DB_TEST_PASSWORD)"

for key in DB_PASSWORD DB_TEST_PASSWORD; do
    if [ "$(env_value .env $key)" != "$(env_value backend/.env $key)" ]; then
        echo "CẢNH BÁO: $key trong .env và backend/.env khác nhau — sửa tay cho khớp (script không ghi đè)." >&2
    fi
done

echo "Xong. Nếu vừa thêm DB_TEST_PASSWORD cho volume MySQL đã có: docker compose up -d mysql && sh scripts/create-test-db.sh"
