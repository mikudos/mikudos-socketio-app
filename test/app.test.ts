import http from 'http';
import assert from 'assert';
import { Application } from '../src';
import socket from 'socket.io';
import { it } from 'mocha';
import { MikudosSocketIoClient } from 'mikudos-socketio-client';

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
app.init();

server.listen(PORT);

describe('Mikudos socketio application tests', () => {
    it('app implement', async () => {
        assert.ok(app instanceof Application);
    });

    it('connection', async () => {
        const client = new MikudosSocketIoClient(
            {
                uri: `ws://localhost:${PORT}`,
                option: {
                    transports: ['websocket']
                }
            },
            { rootNamespace }
        );
        let status = await new Promise((resolve, reject) => {
            client.socket.on('connect', () => {
                resolve(true);
            });
        });
        status && assert.ok('connected successful');
    });
});
