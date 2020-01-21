import http from 'http';
import socket from 'socket.io';
import { pull } from 'lodash';
import { Application, PUSHER_HANDLER, Authentication } from '../../src';
const grpc_caller = require('grpc-caller');
import path from 'path';
import { it } from 'mocha';
import assert from 'assert';
import { MikudosSocketIoClient } from 'mikudos-socketio-client';
import { mikudos } from '../../src/namespace';

export const PORT = 3000;
export const rootNamespace = '/';

export const server = http.createServer();
const io = socket(server, {
    transports: ['websocket']
});
export const app = new Application(io, { rootNamespace });
// export const app = new Application(io, {
//     rootNamespace,
//     redisConfig: { host: 'localhost', port: 6379 }
// });

const file = path.resolve(__dirname, '../message-pusher.proto');
const load = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};
const PusherService = grpc_caller(
    `127.0.0.1:50051`,
    { file, load },
    'Message_pusher'
);

// Authentication
async function authJoinCallback(socket: mikudos.Socket, app?: Application) {
    if (app) {
        let userId = (socket as any).mikudos.user[
            app.get('authentication.entityId') || 'id'
        ];
        app.io.in(userId).clients((err: any, clients: string[]) => {
            let doubleLoginClients = pull(clients, socket.id);
            let close = true;
            clients.map(id => {
                if (app.io.sockets[id]) app.io.sockets[id].disconnect(close);
                if (app.enabled('redisAdaptered')) {
                    app.remoteDisconnect(id, close);
                }
            });
        });
    }
}
app.authentication = new Authentication(
    app,
    {},
    { authJoinCallback: authJoinCallback }
);
// Authentication

app.pusher = new PUSHER_HANDLER(app, {}, PusherService);

app.init();

server.listen(PORT);

describe('Use with message pusher service on localhost:50051', () => {
    const client = new MikudosSocketIoClient(
        {
            uri: `ws://localhost:${PORT}`,
            option: { transports: ['websocket'] }
        },
        {}
    );
    client.socket.on('connect', () => {
        console.log('client side connected');
        client.authentication({
            strategy: 'local',
            email: '',
            password: 'qiushanyu666'
        });
        assert.ok('connected successful');
    });
    it('Test message pusher service', async () => {
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 10000);
        });
    });
});
