# MIKUDOS SOCKETIO CLIENT

mikudos-socketio-client for connection and call methods and sync events on mikudos-socketio-app server, which is provided only for socket.io connection.

## Usage

Import the mikudos-socketio-client module:

```ts
import { MikudosSocketIoClient } from 'mikudos-socketio-client';
```

```js
var { MikudosSocketIoClient } = require('mikudos-socketio-client');
```

### MikudosSocketIoClient

General client for MikudosSocketIoClient:

```js & ts
const client = new MikudosSocketIoClient(
    {
        // same uri and option string will pass to socket.io generator as io(uri, option);
        uri: 'ws://localhost:3030',
        option: {}
    },
    {
        rpcEventName: 'rpc-call' // the path for remote rpc-call
    },
    token => {
        saveToken(token);
    },
    () => window.localstorage.jwt
);
```

### Authentication

Authentication the client connection.

```js
client
    .authentication({
        strategy: 'local',
        email: 'email',
        password: 'password'
    })
    .then(res => {
        console.log('TCL: res', res);
    })
    .catch(err => {
        console.log('TCL: err', err);
    });

client
    .authentication({
        strategy: 'jwt',
        accessToken: 'your_token' || 'Bearer your_token'
    })
    .then(res => {
        console.log('TCL: res', res);
    })
    .catch(err => {
        console.log('TCL: err', err);
    });
```

### Call JSON-rpc server method

```js
client
    .rpcCall({
        method: 'rpc_1.add',
        params: [1, 6],
        id: 4
    })
    .then(res => {
        console.log('TCL: res', res);
    })
    .catch(err => {
        console.log('TCL: err', err);
    });
```

# License

[MIT](LICENSE)
