FROM node:21-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nx.json ./
COPY packages/plugins/package.json ./packages/plugins/
COPY packages/core/package.json ./packages/core/

# The `ustorage` package requires a package (listhen) which requires some
# underlying packages that requrie python and linux build tools for some reason.
# TODO: the ultimate way to optimize this is to somehow completely separate the
#       cache server from the plugins pacakge. This is causing so much trouble.
RUN apk add --no-cache \
    python3 \
    make gcc g++ linux-headers udev \
    pkgconfig libusb-dev eudev-dev libtool autoconf automake

RUN npm ci --only=production

RUN npm i --no-save ts-node typescript @types/node

COPY packages ./packages
COPY typedoc*.json ./
COPY tsconfig*.json ./
COPY project.json ./
COPY migrations.json ./


FROM node:21-alpine AS cache

RUN apk add --no-cache curl

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/plugins ./packages/plugins

COPY --from=builder /app/*.json ./

# TODO: A much better approach would be to compile all the TypeScript in the
#       builder stage, and then copy the compiled JavaScript files to the
#       appropriate stages (cache or api), and simply run the JavaScript with Node.
#       This will help reducing the waiting time for containers start time
#       **significantly**.
CMD ["npx", "ts-node", "-P", "packages/plugins/tsconfig.script.json", "packages/plugins/scripts/serve-cache.ts"]


FROM node:21-alpine AS api

RUN apk add --no-cache curl

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/plugins ./packages/plugins
COPY --from=builder /app/packages/api ./packages/api

COPY --from=builder /app/*.json ./

CMD ["npx", "ts-node", "-P", "packages/api/tsconfig.json", "packages/api/src/main.ts"]
