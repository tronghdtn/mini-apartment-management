FROM php:8.3.36-fpm-alpine

# Extension cần cho Laravel + MySQL
RUN apk add --no-cache icu-libs libzip \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql bcmath intl zip opcache \
    && apk del .build-deps

COPY --from=composer:2.9 /usr/bin/composer /usr/bin/composer

COPY php.ini /usr/local/etc/php/conf.d/zz-app.ini
RUN sed -i 's/^pm.max_children = .*/pm.max_children = 24/; s/^pm.start_servers = .*/pm.start_servers = 8/; s/^pm.min_spare_servers = .*/pm.min_spare_servers = 6/; s/^pm.max_spare_servers = .*/pm.max_spare_servers = 16/' /usr/local/etc/php-fpm.d/www.conf
COPY entrypoint.sh /usr/local/bin/app-entrypoint
# Loại bỏ CRLF phòng trường hợp file bị checkout trên Windows
RUN sed -i 's/\r$//' /usr/local/bin/app-entrypoint && chmod +x /usr/local/bin/app-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]
