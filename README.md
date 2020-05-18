![Mikudos Gate](https://img.shields.io/badge/MIKUDOS-Gate-blue?style=for-the-badge&logo=appveyor)

# [![Mikudos](https://raw.githubusercontent.com/mikudos/doc/master/mikudos-logo.png)](https://mikudos.github.io/doc)

# MIKUDOS SOCKETIO SERVER

mikudos-socketio-server.

![node version](https://img.shields.io/node/v/mikudos-socketio-app) ![version](https://img.shields.io/github/package-json/v/mikudos/mikudos-socketio-app) [![npm version](https://img.shields.io/npm/v/mikudos-socketio-app)](https://www.npmjs.com/package/mikudos-socketio-app) ![license](https://img.shields.io/npm/l/mikudos-socketio-app) ![downloads](https://img.shields.io/npm/dw/mikudos-socketio-app) ![collaborators](https://img.shields.io/npm/collaborators/mikudos-socketio-app) ![typescript](https://img.shields.io/npm/types/mikudos-socketio-app)

![mikudos](https://raw.githubusercontent.com/mikudos/doc/master/assets/images/structure.png)

## Example

[A Example implementation of mikudos-socketio-app in typescript can be found as the linked repository.](https://github.com/mikudos/mikudos-messages)

## Usage

Import the mikudos-socketio-server module:

```ts
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

### implement duplex services

```ts
import { Application, DUPLEX_HANDLER } from 'mikudos-socketio-app';
import { StreamService } from './stream_service';

// register duplext service on the application
export = function (app: Application): void {
  app.duplex_services = new DUPLEX_HANDLER(app, [StreamService]);
};
// file:: stream_service
import { EventEmitter } from 'events';
import { Application, DUPLEX_HANDLER, mikudos } from 'mikudos-socketio-app';
const JsonRpcError = require('json-rpc-error');
const grpc_caller = require('grpc-caller');
import path from 'path';

const LOAD = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const key = 'stream_service';
const serverIp = '127.0.0.1';
const port = '40051';

export class StreamService implements mikudos.DuplexService {
  static serviceKey = key;
  public before = {
    all: [
      (methodPath: string, data: any, socket: mikudos.Socket) => {
        if (!socket?.mikudos?.user) {
          throw new JsonRpcError('Not Authenticated', -32088, {
            info: '未认证的请求',
          });
        }
        return data;
      },
    ],
    method1: [
      (methodPath: string, data: any, socket: mikudos.Socket) => {
        // stransport data can be modified before service method
        return data;
      },
    ],
  };
  private protoFile = path.resolve(
    __dirname,
    '../../proto/stream/stream.proto',
  );
  private serviceCaller: any;
  constructor(private handler: DUPLEX_HANDLER, private app: Application) {
    this.serviceCaller = grpc_caller(
      `${serverIp}:${port}`,
      { file: this.protoFile, load: LOAD },
      'StreamService',
    );
  }

  /**
   *
   * @param pathStr 请求方法路径： [空间].[方法名]
   * @param data 请求参数
   * @param event socketIo同步客户端触发事件
   */
  async SyncSceneInstance(
    eventName: string,
    data: any,
    socketEvent: EventEmitter,
  ) {}
}
```

### example stream.proto file

```ts
syntax = "proto3";
// import "proto/include/google/protobuf/any.proto";
package stream;

service StreamService {
  rpc SyncSceneInstance(stream ClientGameEventMessage)
      returns (stream ServerGameEventMessage) {}
}
```

new update

##### Add redisAdapter for horizontal spread

The Architecture show the way to cross centralization with help of grpc duplex communication and socketio with Event manager.

##### Migrate from 0.2.3 to 0.3.x

```ts
// 0.2.3
import { Application, DUPLEX_HANDLER } from 'mikudos-socketio-app';
import { key, RealTime } from './real_time_game';

export = function (app: Application): void {
  app.duplex_services = new DUPLEX_HANDLER(app, [{ key, sc: RealTime }]);
};

// 0.3.x
import { Application, DUPLEX_HANDLER } from 'mikudos-socketio-app';
import { key, RealTime } from './real_time_game';

export = function (app: Application): void {
  app.duplex_services = new DUPLEX_HANDLER(app, [RealTime]);
};
```

# License

[MIT](LICENSE)
