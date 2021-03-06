import { EventEmitter } from 'events';
import { app } from '../app.test';
import { Application, DUPLEX_HANDLER } from '../../src';
import { mikudos } from '../../src/namespace';

class Grpc1 {
    test(eventName: string, data: any, socketEvent: EventEmitter) {
        setInterval(() => {
            socketEvent.emit(eventName, data);
        }, 1000);
        // client send
        socketEvent.on(`${eventName} send`, send => {
            // send to the call
        });
        // client cancel
        socketEvent.once(`${eventName} cancel`, cancel => {
            // cancel
            // return something to client
            socketEvent.emit(`${eventName} cancel`, {
                result: { success: true }
            });
        });
        // server end
        socketEvent.emit(eventName, { method: eventName, end: true });
        socketEvent.removeAllListeners(`${eventName}`);
        // call canceled from server
        if (true) {
            socketEvent.emit(eventName, { method: eventName, cancel: true });
            socketEvent.removeAllListeners(`${eventName}`);
        }
    }
}

class Service implements mikudos.DuplexService {
    public serviceKey = '';
    public serviceClass = {};
    public service: any = {};
    public before = { call: [] };
    constructor(private handler: DUPLEX_HANDLER, private app: Application) {}
}

app.duplex_services = new DUPLEX_HANDLER(app, [{ key: '', sc: Service }]);
