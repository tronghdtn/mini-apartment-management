#!/bin/sh
# Tạo database test mini_apartment_test và tài khoản MySQL riêng mini_apartment_test,
# chỉ có quyền trên database test. Idempotent.
# - Tự chạy khi MySQL khởi tạo volume mới (docker-entrypoint-initdb.d — file được source, không dùng exit).
# - Với volume đã có dữ liệu: chạy scripts/create-test-db.sh.
# Không đụng tới dữ liệu database phát triển ($MYSQL_DATABASE).

TEST_DB=mini_apartment_test
TEST_USER=mini_apartment_test

if [ -z "${MYSQL_TEST_PASSWORD:-}" ]; then
    echo "[mysql-init] LỖI: thiếu MYSQL_TEST_PASSWORD (DB_TEST_PASSWORD trong .env) — bỏ qua tạo database test." >&2
else
    MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${TEST_USER}'@'%' IDENTIFIED BY '${MYSQL_TEST_PASSWORD}';
ALTER USER '${TEST_USER}'@'%' IDENTIFIED BY '${MYSQL_TEST_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${TEST_DB}\`.* TO '${TEST_USER}'@'%';
-- Tách biệt hoàn toàn: tài khoản dev không cần quyền trên database test
REVOKE IF EXISTS ALL PRIVILEGES ON \`${TEST_DB}\`.* FROM '${MYSQL_USER}'@'%' IGNORE UNKNOWN USER;
SQL
    echo "[mysql-init] Database ${TEST_DB} + tài khoản ${TEST_USER} sẵn sàng."
fi
