# REY Gatekeeper
> :warning: **WARNING:** This project is still in alpha, so the interface might change in the near future

## Usage

### Standalone Server

#### Via CLI
```
$ docker run -it \
  -p 8080:8080 \
  -e TARGET_URL="http://user:pass@acme.score.com:9000" \
  -e ETH_NODE_URL="https://user:secret@ethereum.io:8545" \
  -e APP_ADDRESS="0x0000000000000000000000000000000000000000" \
  reputationnetwork/gatekeeper
```

### Via Dockerfile
```Dockerfile
FROM reputationnetwork/gatekeeper:latest
ENV TARGET_URL http://user:pass@acme.score.com:9000
ENV ETH_NODE_URL="https://user:secret@ethereum.io:8545"
ENV APP_ADDRESS="0x0000000000000000000000000000000000000000"

# OPTIONAL: Make GK serve the manifest
COPY ./rey-manifest.json ./rey-manifest.json
ENV MANIFEST_URL "file:///app/rey-manifest.json"
```

## Config
A gatekeeper instances can be configured and tweaked via the following environment variables, the ones marked in **bold** are required for the server to start:

- **TARGET_URL**: The base url of the API where a REY app is running. This url can have auth and path. Auth will be used as basic authorization between gatekeeper and the target. Path will be used as a path prefix for every request that reaches the gatekeeper server.
- **ETH_NODE_URL**: Url of the ethereum node to connect to for executing smart contract calls.
- **APP_ADDRESS**: The app address this gatekeeper instance is providing validation for.
- *PORT*: Port to listen, defaults to `8080`
- *LOG_LEVEL*: Minimum log level, defaults to `info`
- *REY_CONTRACT_ADDRESS*: REY Smart Contract address, defaults to `0x`
- *MANIFEST_URL*: Fully formed URL pointing to the manifest of the app, supports `file://`(absolute path) and `https://` protocols. Defaults to `""`

## Examples

### As HTTP Requests
The following HTTP request reaches a running Gatekeeper server where `TARGET` is set to `"https://gatekeeper:secret@socring.acme.co/api/1"`:
```
GET /age HTTP/1.1
Host: public.scoring.acme.co
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0=.eyJ2ZXJzaW9uIjoiM<..OMITED..>.
```

After validating the `Authorization` header locally and against the REY smart contract,
Gatekeeper performs a request to the target REY app:

```
GET /api/1/age HTTP/1.1
Host: socring.acme.co
Authorization: Basic ${base64(gatekeeper:secret)}
X-Permission-Reader: ${base64(0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)}
X-Permission-Source: ${base64(0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)}
X-Permission-Subject: ${base64(0xcccccccccccccccccccccccccccccccccccccccc)}
X-Extra-Read-Permissions: ${base64(json([...]))}
X-Session: ${base64(json([...]))}
```

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

## Roadmap
- [ ] Cashout when sending the response from the app to the client
- [ ] Add integration tests (against a real running contract)

## LICENSE
MIT © 2018 [Reputation Network](./LICENSE)
