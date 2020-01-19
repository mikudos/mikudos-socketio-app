import http from 'http';
import assert from 'assert';
import { Application } from '../src';
import socket from 'socket.io';
import { it } from 'mocha';
import { MikudosSocketIoClient } from 'mikudos-socketio-client';

export const PORT = 3000;
const rootNamespace = '';

export const server = http.createServer();
const io = socket(server, {
    transports: ['websocket']
});
// const app = new Application(io, { rootNamespace });
export const app = new Application(io, {
    // redisConfig: { host: 'localhost', port: 6379 }
});

describe('Mikudos socketio application tests', () => {
    it('app implement', async () => {
        assert.ok(app instanceof Application);
    });

    it('connection', async () => {
        const client = new MikudosSocketIoClient(
            {
                uri: `ws://localhost:${PORT}`
            },
            { rootNamespace }
        );
        client.socket.on('connection', () => {
            assert.ok('connected successful');
        });
    });
});
