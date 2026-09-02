#!/bin/bash
for i in {1..30}; do
  if curl -s --unix-socket /Users/mac368/.docker/run/docker.sock http://localhost/info --max-time 2 > /dev/null; then
    echo "Docker is up and responsive!"
    exit 0
  fi
  echo "Waiting ($i)..."
  sleep 3
done
echo "Docker failed to start."
exit 1
