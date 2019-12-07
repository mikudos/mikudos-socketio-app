import assert from 'assert';
import { Application } from '../src';
import socket from 'socket.io';
import { it } from 'mocha';
import { MikudosSocketIoClient } from 'mikudos-socketio-client';

const port = 3000;
const io = socket(port);
const app = new Application(io);

describe('Mikudos socketio application tests', () => {
    it('app implement', async () => {
        assert.ok(app instanceof Application);
    });

    it('connection', async () => {
        const client = new MikudosSocketIoClient({
            uri: `ws://localhost:${port}`
        });
        client.socket.on('connection', () => {
            assert.ok('connected successful');
        });
    });
});
