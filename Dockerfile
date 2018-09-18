#### Development dependencies
FROM node:8-alpine AS development_depenendecies

WORKDIR /app
# This is required to install packages from github
RUN apk add --no-cache git
# This is required for compiling some node-gyp bindings
RUN apk add --no-cache python make g++

COPY package.json ./
COPY yarn.lock ./
RUN yarn install

### Development
FROM development_depenendecies AS development
COPY . .
CMD [ "yarn", "start" ]

### Builder
FROM development AS tsbuilder
RUN yarn build
RUN rm $(find src -name *.ts)

#### Production dependencies
FROM development_depenendecies AS production_dependencies
WORKDIR /app
RUN yarn install --production
RUN ls -al node_modules
# FIXME: web3 post-install added dependencies get removed by --production flag
RUN yarn add $(cat package.json| grep '"web3"' | awk -F '"' '{ print $4 }') --force
# FIXME: We use ts paths for aliasing this usually, once it is published it will not be necessary
RUN ln -s ./rey-js/dist/module/rey-core node_modules/rey-core

### Release image
FROM node:8-alpine

# Add Tini, see: https://github.com/krallin/tini/issues/8
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

RUN apk add --no-cache curl
HEALTHCHECK --interval=5m --timeout=5s --start-period=5s --retries=3 \
    CMD curl -i http://localhost:8080/healthcheck || exit 1

WORKDIR /app
COPY --from=production_dependencies /app/node_modules ./node_modules
COPY --from=tsbuilder /app/src ./src

EXPOSE 8080
CMD [ "node", "src/server.js" ]
