# REY Gatekeeper
[![Build Status][travis-image]][travis-url]
[![Coverage][codecov-image]][codecov-url]
[![Dependency Status][depstat-image]][depstat-url]

> :warning: **WARNING:** This project is still in alpha, so the interface might change in the near future

## Usage

### Standalone Server

#### Via CLI
```
$ docker run -it \
  -p 8080:8080 \
  -e TARGET_APP_URL="http://user:pass@acme.score.com:9000" \
  -e BLOCKCHAIN_NODE_URL="https://user:secret@ethereum.io:8545" \
  -e APP_ADDRESS="0x0000000000000000000000000000000000000000" \
  reputationnetwork/gatekeeper
```

### Via Dockerfile
```Dockerfile
FROM reputationnetwork/gatekeeper:latest
ENV TARGET_APP_URL http://user:pass@acme.score.com:9000
ENV BLOCKCHAIN_NODE_URL="https://user:secret@ethereum.io:8545"
ENV APP_ADDRESS="0x0000000000000000000000000000000000000000"
```

## Config
Gatekeeper will proxy all requests that reach it to a target server, defined by `TARGET_APP_URL`. Requests to the endpoint defined by `SECURED_PATH` will require an authorization header that is compliant with the REY spec of app access requests.

A gatekeeper instance can be configured and tweaked via the following environment variables, the ones marked in **bold** are required for the server to start:

- **TARGET_APP_URL**: The base of the API where a REY app is running. If url includes auth, it will be used as basic authorization between gatekeeper and the target.
- **BLOCKCHAIN_NODE_URL**: Url of the ethereum node to connect to for executing smart contract calls.
- **APP_ADDRESS**: The app address this gatekeeper instance is providing validation for.
- *APP_ACCOUNT_PASSWORD*: The password for unlocking the app address's account of this app in the blockchain node. This is needed for signing responses.
- *PORT*: Port to listen, defaults to `8080`
- *LOG_LEVEL*: Minimum log level, defaults to `info`
- *REY_CONTRACT_ADDRESS*: REY Smart Contract address, defaults to `0x`
- *SECURED_PATH*: Path where the app is exposed, defaults to `/data`

## Tests
```
$ yarn install
$ yarn test
```

## Debugging tests
First of all, you can always try to debug your problem adding logger statements on the code of the elements under test. If you end up using logger (instead of `console.log`), make sure to write meaningful logs using `logger.debug` or `logger.verbose` levels and enable logs during tests by setting the env var `LOG_LEVEL` (`LOG_LEVEL=verbose yarn test`). This type of logs can be kept since they might provide useful information when debugging other problems in the future.

### Using VSCode
- Change to the debug view
- Open the test file you want to debug
- Place a breakpoint somewhere
- Change the launch config to **Mocha Current File** (on the upper left corner)
- Press the Start Debugging button

### With Chrome DevTools
- Place a `debugger` statement on the code of the test file you want to debug
- Run the following from the command line `yarn test --inspect-brk=0.0.0.0:9229`
- Open (Chrome Inspect DevTools)[chrome://inspect]
- Press **Inspect** for your entry under **Remote Target**
- Press **Resume Script Execution** once, this will allow the inspector to load the source maps, file strcture and then will stop on the `debugger` statement you placed

## TODO List
- [x] Add integration tests (against a real running contract)
- [ ] Cashout when sending the response from the app to the client

## LICENSE
MIT © 2018 [Reputation Network](./LICENSE)

[travis-image]: https://travis-ci.org/reputation-network/rey-gatekeeper.svg?branch=master
[travis-url]: https://travis-ci.org/reputation-network/rey-gatekeeper
[codecov-image]: https://codecov.io/github/reputation-network/rey-gatekeeper/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/reputation-network/rey-gatekeeper?branch=master
[depstat-image]: https://img.shields.io/david/reputation-network/rey-gatekeeper/master.svg
[depstat-url]: https://david-dm.org/reputation-network/rey-gatekeeper
