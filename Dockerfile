# Using the official Node (version 21 - alpine) image for a couple of reasons:
# - It already has all the dependencies to use Node, NPM, and NPX.
# - The alpine version is the smallest image among the other ones (i.e. standard,
# slim).
#
# However, the final image is still huge (1.11 GB), which is due to the presence
# of `node_modules` folder. Running `du -sh node_modules` locally on the
# terminal outputs `1.2G    node_modules` for me.
#
# According to the docs, the Alpine version is ~ 20 MB total. I saved around
# ~ 100 MB just by not installing the Dev Dependencies.
#
# By the way, the reason I didn't go with Node 22 was because I've experienced
# some incompatiblitgy with it recently and decided to use the more stable
# version (21) just to be safe.
FROM node:21-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nx.json ./
COPY packages/plugins/package.json ./packages/plugins/
COPY packages/core/package.json ./packages/core/

# The `unstorage` package requires a package (listhen) which requires some
# underlying peer dependency that requries python and linux build tools for some
# reason which I guess has to do with how `unstorage` allows users to store
# data in the filesystem, so it needs an observer or similar OS features that
# rely on these libraries.
#
# Ultimately, to optimize this is to somehow completely separate the cache server
# from the plugins pacakge. This is adding unnecessary build delays and image
# size both for the API and the cache-server itself.
RUN apk add --no-cache \
    python3 \
    make gcc g++ linux-headers udev \
    pkgconfig libusb-dev eudev-dev libtool autoconf automake

# First, install everything to build the apps properly.
RUN npm ci

COPY packages ./packages
COPY typedoc*.json ./
COPY tsconfig*.json ./
COPY project.json ./
COPY migrations.json ./

# Copy over the build scripts
COPY build-cache-server.ts ./
COPY build-api-server.ts ./

# Compile both cache and api servers to reduce the container start time by
# removing the TS build part.
RUN npm run build:cache-server
RUN npm run build:api-server

# Re-install only the non-dev dependencies (helps reducing ~100 MB in the final
# image size), which is not significant but it's better than nothing.
RUN rm -rf node_modules
ENV NODE_ENV=production
RUN npm ci --production

FROM node:21-alpine AS cache

RUN apk add --no-cache curl

WORKDIR /app

# Because this is a Node application, we can't bundle everything from node_module,
# hence we have to copy over the `node_modules` folder. (See the 4th paragraph at:
# [esbuild - Bundling for Node](https://esbuild.github.io/getting-started/#bundling-for-node)).
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist/cache-server ./dist/cache-server

CMD ["node", "dist/cache-server/serve-cache.js"]

FROM node:21-alpine AS api

RUN apk add --no-cache curl

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/api ./dist/api

CMD ["node", "dist/api/api-server.js"]
