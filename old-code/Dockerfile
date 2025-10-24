FROM debian:buster
LABEL maintainer="s7b4 <baron.stephane@gmail.com>"

ENV APP_USER=lufi \
	APP_TREE=0.04.6

ENV APP_HOME=/opt/$APP_USER \
	APP_WORK=/home/$APP_USER

# set user/group IDs
RUN groupadd -r "$APP_USER" --gid=999 \
	&& useradd -m -r -g "$APP_USER" --uid=999 "$APP_USER"

# Perl base
RUN apt-get update \
	&& apt-get install --no-install-recommends --yes \
		procps \
		make \
		curl \
		sqlite3 \
		ca-certificates \
		shared-mime-info \
		gcc \
		libperl-dev \
		libssl-dev \
		zlib1g-dev \
		libpq-dev \
		default-libmysqlclient-dev \
		carton \
		libmodule-install-perl \
		gosu \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/*

# Lufi
RUN mkdir -p $APP_HOME $APP_WORK \
	&& curl -sSL "https://framagit.org/fiat-tux/hat-softwares/lufi/-/archive/$APP_TREE/lufi-$APP_TREE.tar.gz" \
		| tar xz --strip-component=1 -C $APP_HOME \
	&& cd $APP_HOME \
	&& carton install \
	&& rm -rf "$APP_HOME/log" "$APP_HOME/t" \
	&& rm -rf "$HOME/.cpan"*

WORKDIR $APP_HOME

COPY scripts/docker-carton /usr/local/bin/
COPY scripts/entrypoint.sh /entrypoint.sh
COPY themes /opt/lufi/themes
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 8080
VOLUME $APP_WORK
