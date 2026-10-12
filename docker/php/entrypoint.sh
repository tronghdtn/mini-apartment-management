#!/bin/sh
set -e

cd /var/www/html

if [ ! -f vendor/autoload.php ]; then
    echo "[app] Cài đặt Composer dependencies..."
    composer install --no-interaction --prefer-dist --no-progress
fi

if [ ! -f .env ]; then
    echo "[app] Tạo backend/.env từ .env.example"
    cp .env.example .env
fi

if grep -q '^APP_KEY=$' .env; then
    echo "[app] Sinh APP_KEY"
    php artisan key:generate --force --no-interaction
fi

# Thư mục ghi của Laravel (bind mount từ host có thể chưa đủ quyền cho www-data)
mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chmod -R a+rwX storage bootstrap/cache 2>/dev/null || true

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "[app] Chạy migrations"
    php artisan migrate --force --no-interaction
fi

exec "$@"
