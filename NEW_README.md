## Table of contents
- [Introduction](#introduction-what-is-this)
- [Pre-requisites](#pre-requisites)
- [Setup Instructions](#setup-instructions)
- [Run as Containers](#run-as-containers)
- [Troubleshooting](#troubleshooting)

## Introduction (What is this)
This repository is a fork of the open-sourced repository of SonarWatch's Portfolio
which powers the SonarWatch's website. The missing part that was not open-source
is the REST API that was added in this fork.

The purpose of this program is to pull data from many different DeFi networks,
aggregate, analyze and/or process them for its audience.

The design philosophy of this repository is Plugin oriented. Meaning that anyone
can contribute to this concept by creating their own Plugin that pulls and
processes data from different Web3 networks.

## Pre-requisites
- This documentation is meant for technical audience familiar with:
  - POSIX commands, Git, NPM, Node.js, Docker, curl, Web APIs, and the Solana Network.
- This documentation assumes you're using POSIX-compliant Operating System.
- Have `git` installed and setup.
- Have `docker` installed on your machine.
- Have `node` and `npm` installed on your machine (Only tested with Node 21)
  - Tip: you can download and use `nvm` to manage your Node versions for convenience.
- Have `curl` installed to call the API from the command line as mentioned later
  in this document (Optional).
- Have a Solana RPC API key. You can get a free one from [Helius](https://www.helius.dev/).
- Have a reliable internet connection.

## Setup Instructions
1. Clone the repo in a folder of choice.
```bash
git clone https://github.com/iliaamiri/sonarwatch-portfolio-with-api
```

2. Create two copies from the `.env.example`. One for local and one for docker.
```bash
cp .env.example .env
cp .env.example .env.production

# Replace the Overlay HTTP bases in `.env.production` with the cache server container name for Docker.
sed -i 's|CACHE_CONFIG_OVERLAY_HTTP_BASES=http://localhost:3000/,https://portfolio-api-public.sonar.watch/v1/portfolio/cache/|CACHE_CONFIG_OVERLAY_HTTP_BASES=http://sonar-watch-portfolio-cache-server:3000/,https://portfolio-api-public.sonar.watch/v1/portfolio/cache/|g' .env.production
```

Tip: Make sure to review both ENV files `.env` and `.env.production` and fill
the RPC endpoints as you see fit. There are many different RPCs that you can use
but this documentation mainly focuses on Kamino plugin which uses a Solana RPC.
- Particularly, the `PORTFOLIO_SOLANA_RPC` must be filled in order to use Kamino
plugin's Jobs and Fetchers. Make sure you have it filled in both `.env` and 
`.env.production` files.

Tip: You can set the `PORTFOLIO_API_DEBUG` variable to `true` in `.env` or 
`.env.production` to see API logs in production servers. I set it to false to
follow best practices. But, feel free to set it to free to test it at first.

3. Install the dependencies
```bash
npm i
```

4. Run the cache server first and wait for it to actually compile and listen.
```bash
npm run start:cache
```

5. Then build and run the REST API server, which also takes time to compile and 
   listen.
```bash
npm run start:api
```

6. Once listening, go to `http://localhost:8080/v1/api` for the Swagger (OpenAPI)
   documentation. It will show you an OpenAPI documentation page if everything is
   working fine.

7. Try the `API Healthcheck` endpoint to make sure the API is healthy.

8. Try running either Kamino Jobs or Kamino Fetchers using the corresponding
   endpoints (There are also cURL examples below).

Here's the list of all the jobs and fetchers that you can pass to the API as parameters:

**Jobs**:
- `kamino-farms`
- `kamino-markets`
- `kamino-pools` - This one takes a while to pull
- `kamino-reserves` - Also relatively takes some time compared to other jobs

Example of running a job:
```bash
# kamino-markets 
curl http://localhost:8080/v1/run/jobs/kamino-markets
```

**Fetchers**:
- `kamino-farms`
- `kamino-deposits` - (aka. Lends)
- `kamino-airdrop-s1`

Example of running a fetcher:
```bash
# kamino-deposits on `D4iLWA42jbruHXUTdKTzCFUkzhyesYHYyFS2z5NHN7tu` wallet
curl http://localhost:8080/v1/run/fetchers/kamino-deposits/D4iLWA42jbruHXUTdKTzCFUkzhyesYHYyFS2z5NHN7tu
```

## Run as Containers
There is a bash file for your convenience in the root of the project to run:
```bash
chmod +x ./docker-compose-up.sh # making sure the shell file is executable.
./docker-compose-up.sh 
```

## Troubleshooting
1. A container is not healthy.
   You can inspect the container to see why it's marked (unhealthy).
```bash
# To check why the healthcheck failed for `sonar-watch-portfolio-cache-server` run:
docker inspect sonar-watch-portfolio-cache-server | grep -A 10 "Health"

# To check why the healthcheck failed for `sonar-watch-portfolio-api` run:
docker inspect sonar-watch-portfolio-api | grep -A 10 "Health"

# Tip: The error should be around the beginning of the output of these commands.
```

If nothing useful or the healthcheck is taking too long, you can also check the
logs:
```bash
docker logs sonar-watch-portfolio-api
```

2. The API is giving 500 (or Internal Server Error) response.
   You can see the logs of the API by running:
```bash
docker logs sonar-watch-portfolio-api
```

3. For anything else feel free to ask me: `iliaabedianamiri@gmail.com` - Eiliya
