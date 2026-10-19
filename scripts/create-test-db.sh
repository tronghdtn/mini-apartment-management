#!/usr/bin/env sh
# Tạo database + tài khoản test mini_apartment_test trên MySQL đang chạy (idempotent).
# Dùng cho volume MySQL tạo trước khi có docker/mysql/init. Không đụng tới database dev.
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

docker compose exec -T mysql sh < docker/mysql/init/01-create-test-database.sh
