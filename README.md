# docker-lufi

## Projet Lufi

https://framagit.org/fiat-tux/hat-softwares/lufi#tab-readme

## Compose

### `docker-compose.yml`

	services:
	  app:
	    image: s7b4/lufi
	    init: true
	    network_mode: bridge
	    ports:
	    - 8080:8080/tcp
	    restart: always
	version: '2.2'

## Cron lufi

### Nettoyage de la db

	docker-compose exec app docker-carton exec script/lufi cron cleanbdd --mode production

### Nettoyage des fichiers

	docker-compose exec app docker-carton exec script/lufi cron cleanfiles --mode production
