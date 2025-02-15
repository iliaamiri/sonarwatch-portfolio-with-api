#!/bin/bash

docker compose up --build -d

until docker inspect --format='{{json .State.Health.Status}}' sonar-watch-portfolio-api | grep -q "healthy"; do
    echo "Waiting for 'sonar-watch-portfolio-api' healthcheck result..."
    sleep 20
done
echo "Container is healthy!"
