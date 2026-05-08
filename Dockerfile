FROM php:8.2-apache

WORKDIR /var/www/html

RUN a2enmod rewrite \
    && mkdir -p /var/www/html/storage /var/www/html/storage/projects /tmp/webinmo-sessions \
    && chown -R www-data:www-data /var/www/html /tmp/webinmo-sessions

COPY . /var/www/html

RUN chown -R www-data:www-data /var/www/html/storage

