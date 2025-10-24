#!/bin/bash

cd /home/ubuntu/docker-lufi
docker exec docker-lufi_lufi_1 /bin/bash -c "find /home/lufi/files* -mtime +5 -exec rm -rf {} \;"
