#!/bin/bash
mysql -u root -proot -h 127.0.0.1 -e "CREATE DATABASE IF NOT EXISTS logs;"
mysql -u root -proot -h 127.0.0.1 -e "CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED BY 'password' WITH MAX_USER_CONNECTIONS 3;"
mysql -u root -proot -h 127.0.0.1 -e "GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';"