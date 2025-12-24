#!/bin/bash
while true; do
  echo "$(date): Checking for game updates and settlements..."
  curl -s http://localhost:3000/api/sync > /dev/null
  sleep 300
done
