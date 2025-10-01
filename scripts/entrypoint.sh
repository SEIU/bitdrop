#! /bin/sh
set -e

CONF_FILE="$APP_WORK/lufi.conf"
PID_FILE="$APP_WORK/lufi.pid"
DB_FILE="$APP_WORK/lufi.db"
ENV_FILE="$APP_WORK/lufi.env"

TEMP_FOLDER="$APP_WORK/tmp"
FILE_FOLDER="$APP_WORK/files"


# VACUUM DB
if [ -f "$DB_FILE" ]; then
	echo "Vacuum $DB_FILE ..."
	echo "vacuum;" | sqlite3 "$DB_FILE"
fi

# Clean pid file
if [ -f "$PID_FILE" ]; then
	echo "Removing $PID_FILE .."
	rm -f $PID_FILE
fi

# Temp folder
if [ ! -d "$TEMP_FOLDER" ]; then
	mkdir -v --mode=0700 "$TEMP_FOLDER";
else
	# clean tmp
	rm -f "$TEMP_FOLDER"/*
fi

# Files folder
if [ ! -d "$FILE_FOLDER" ]; then
	mkdir -v --mode=0700 "$FILE_FOLDER";
fi

# Reset perms
chown -R "$APP_USER" "$APP_WORK"

# Generate env file
echo "export MOJO_CONFIG=\"$CONF_FILE\"" > "$ENV_FILE"
echo "export MOJO_TMPDIR=\"$APP_WORK/tmp\"" >> "$ENV_FILE"

# Démarrage de Lstu
exec docker-carton exec hypnotoad -f script/lufi
