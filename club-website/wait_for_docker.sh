#!/bin/bash
echo "Waiting for Docker to start..."
for i in {1..30}; do
  if docker info >/dev/null 2>&1; then
    echo "Docker is up!"
    exit 0
  fi
  echo "Still waiting... ($i)"
  sleep 2
done
echo "Docker did not start in time."
exit 1
