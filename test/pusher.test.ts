import { server, app, PORT } from './app.test';
import { Application, PUSHER_HANDLER } from '../src';
const grpc_caller = require('grpc-caller');
import path from 'path';

const file = path.resolve(__dirname, './message-pusher.proto');
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
app.pusher = new PUSHER_HANDLER(app, {}, PusherService);

app.init();

server.listen(PORT);

describe('Use with message pusher service on localhost:50051', () => {
    it('Test message pusher service', async () => {
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 10000);
        });
    });
});
