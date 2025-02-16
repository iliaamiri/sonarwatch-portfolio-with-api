#!/bin/bash

docker compose up --build -d

echo "Waiting for 'sonar-watch-portfolio-api' healthcheck result..."

until docker inspect --format='{{json .State.Health.Status}}' sonar-watch-portfolio-api | grep -q "healthy"; do
    sleep 2
done
echo "Container is healthy!"
