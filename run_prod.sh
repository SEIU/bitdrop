# type "finish" to exit

# function called by trap
other_commands() {
    docker-compose -f docker-compose.yml down
    exit 0
}

trap 'other_commands' SIGINT

input="$@"

while true; do
  docker-compose -f docker-compose.yml build
  docker-compose -f docker-compose.yml up
done
