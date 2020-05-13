![Mikudos Gate](https://img.shields.io/badge/MIKUDOS-Gate-blue?style=for-the-badge&logo=appveyor)

# [![Mikudos](https://raw.githubusercontent.com/mikudos/doc/master/mikudos-logo.png)](https://mikudos.github.io/doc)

# MIKUDOS SOCKETIO GATE

mikudos-socketio-gate.

![node version](https://img.shields.io/node/v/mikudos-socketio-app) ![version](https://img.shields.io/github/package-json/v/mikudos/mikudos-socketio-app) [![npm version](https://img.shields.io/npm/v/mikudos-socketio-app)](https://www.npmjs.com/package/mikudos-socketio-app) ![license](https://img.shields.io/npm/l/mikudos-socketio-app) ![downloads](https://img.shields.io/npm/dw/mikudos-socketio-app) ![collaborators](https://img.shields.io/npm/collaborators/mikudos-socketio-app) ![typescript](https://img.shields.io/npm/types/mikudos-socketio-app)

## Example

[A Example implementation of mikudos-socketio-app in typescript can be found as the linked repository.](https://github.com/mikudos/mikudos-messages)

## Usage

```bash
npm install mikudos-socketio-app --save
```

Import the mikudos-socketio-app module:

```ts
import {
  Application,
  Authentication,
  AuthenticationRequest,
  RpcServiceMethods,
  JSON_RPC_HANDLER,
  CHAT_HANDLER,
  DUPLEX_HANDLER,
} from 'mikudos-socketio-app';

import http from 'http';
import socket from 'socket.io';
import rpcs from './rpcs';
import publish from './publish';
import authentication from './authentication';
import message from './message';
import duplexs from './duplexs';
import inter_service_clients from './inter_service_clients';

const server = http.createServer();
const io = socket(server);

const app = new Application(io);
app.configure(inter_service_clients);
app.configure(authentication);
app.configure(rpcs);
app.configure(publish);
app.configure(message);
app.configure(duplexs);

app.init();

server.listen(app.get('port'));
console.log('socket.io server started at port: ' + app.get('port'));
```

```js
var {
  Application,
  Authentication,
  AuthenticationRequest,
  RpcServiceMethods,
  JSON_RPC_HANDLER,
  CHAT_HANDLER,
  DUPLEX_HANDLER,
} = require('mikudos-socketio-app');
```

![mikudos](https://raw.githubusercontent.com/mikudos/doc/master/assets/images/structure.png)

new update

##### Add redisAdapter for horizontal spread

The Architecture show the way to cross centralization with help of grpc duplex communication and socketio with Event manager.

# License

[MIT](LICENSE)
