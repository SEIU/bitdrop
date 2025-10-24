#!/bin/bash
# Install tools used by the script, if not present
sudo apt-get -y install net-tools jq coreutils 

# Install uv
export PATH="$PATH:$HOME/.local/bin"
curl -LsSf https://astral.sh/uv/install.sh | sh;

# Include ada-unified dir in PYTHONPATH
export PYTHONPATH="$PYTHONPATH:$HOME/ada-unified/server"

# Download and install nvm:
curl -so- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Configure nvm function and then install node, npm, and serve:
source "$HOME/.nvm/nvm.sh"
nvm install 22
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
    --keyfile ../temp/server.key \
    --certfile ../temp/server.crt \
    > $BACKEND_LOG 2>&1 & disown >/dev/null 2>&1
