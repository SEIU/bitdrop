#!/bin/bash
set -euo pipefail

# Install uv
export PATH="$PATH:$HOME/.local/bin"
if [ "$(which uv)" == "" ]; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh;
fi

# Install Python and libraries
echo "Installing Python and library requirements..."
uv sync
source .venv/bin/activate

# Install node/npm and serve
mkdir -p $HOME/bin
export NODE_VER='node-v22.13.0-linux-x64'
export PATH="$HOME/bin/$NODE_VER/bin/:$PATH"
export NODE='https://nodejs.org/dist/v22.13.0/node-v22.13.0-linux-x64.tar.xz'
if [ "$(which npm)" == "" ]; then
    wget -q -O- $NODE | tar xJ -C $HOME/bin
fi
npm --silent install -g serve

# Rotate logs
echo "Rotating log files into $HOME/log/archive"
mkdir -p $HOME/log/archive

# Archive any old logs
gzip $HOME/log/backend-*.log || true
gzip $HOME/log/frontend-*.log || true
mv $HOME/log/*.log.gz $HOME/log/archive || true

# Shut down anything on port 3000
echo "Killing any process(es) on port 3000"
for pid in $(lsof -t -i:3000); do
    kill -9 $pid || true
done

# Shut down anything on port 3000
echo "Killing any process(es) on port 8443"
for pid in $(lsof -t -i:8443); do
    kill -9 $pid || true
done

# Start the Node server
echo "TODO: Launching the Node server..."
# cd $HOME/bitdrop/frontend
# npm --silent install --production
# npm install vite # TODO: Is this really a sound approach?
# npm run build
# # Check for npm install errors
# if [ $? -ne 0 ]; then
#     echo "Error occurred during npm install!"
#  zR   exit 1
# fi
# mkdir -p $HOME/log
# FRONTEND_LOG="$HOME/log/frontend-$(date +"%Y-%m-%d-%H-%M-%S").log"
# serve -s dist -l 3000 > $FRONTEND_LOG 2>&1 & disown >/dev/null 2>&1

# Start the FastAPI server
echo "Launching the FastAPI server..."
cd $HOME/bitdrop/server
BACKEND_LOG="$HOME/log/backend-$(date +"%Y-%m-%d-%H-%M-%S").log"
uv run python -m gunicorn \
    --timeout 0 \
    --workers 2 \
    --max-requests 100 \
    -k uvicorn.workers.UvicornWorker app.main:app \
    --access-logfile - \
    --error-logfile - \
    --bind 0.0.0.0:8443 \
    --keyfile temp/server.key \
    --certfile temp/server.crt \
    > $BACKEND_LOG 2>&1 & disown >/dev/null 2>&1
