"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const handler_base_1 = require("./handler-base");
const events_1 = require("events");
class DUPLEX_HANDLER extends handler_base_1.HandlerBase {
    constructor(namespaces, { eventPath = 'stream-call' } = {}) {
        super(eventPath);
        this.namespaces = {};
        this.socketStreams = {};
        this.namespaces = namespaces;
    }
    async handle(namespace, method, data, socket) {
        let event = lodash_1.get(this.socketStreams, socket.id);
        if (!event || !(event instanceof events_1.EventEmitter)) {
            event = new events_1.EventEmitter();
            lodash_1.set(this.socketStreams, socket.id, event);
        }
        try {
            this.namespaces[namespace].handle(namespace, method, data, event);
            console.log('TCL: this.socketStreams', socket.id, this.socketStreams);
            this.socketStreams[socket.id].on(`${namespace}.${method}`, (data) => {
                console.log('TCL: socketStreams data', data);
                socket.emit(`${this.eventPath} ${namespace}.${method}`, data);
            });
        }
        catch (error) {
            let event = lodash_1.get(this.socketStreams, socket.id);
            if (event)
                event.removeAllListeners(`${namespace}.${method}`);
            return { error: { message: 'Request Error' } };
        }
        return { result: { successed: true } };
    }
    async send(namespace, method, data, socket) {
        let event = lodash_1.get(this.socketStreams, socket.id);
        if (!event)
            return { error: { message: 'Request Not exist or is finished' } };
        event.emit(`${namespace}.${method} send`, data);
        return await new Promise((resolve, reject) => {
            event.once(`${namespace}.${method} send`, data => resolve(data));
            setTimeout(() => {
                resolve({
                    error: { message: 'Request Timeout' }
                });
            }, 10000);
        });
    }
    async cancel(namespace, method, socket) {
        let event = lodash_1.get(this.socketStreams, socket.id);
        if (!event)
            return {
                error: {
                    message: 'Cancel Error, Request may be closed'
                }
            };
        // cancel first
        event.emit(`${namespace}.${method} cancel`);
        event.removeAllListeners(`${namespace}.${method}`);
        return await new Promise((resolve, reject) => {
            event.once(`${namespace}.${method} cancel`, data => resolve(data));
            setTimeout(() => {
                resolve({
                    error: { message: 'Request Timeout' }
                });
            }, 10000);
        });
    }
    cancelAllOnSocket(id) {
        let event = this.socketStreams[id];
        event.removeAllListeners();
        lodash_1.unset(this.socketStreams, id);
        return { result: { successed: true } };
    }
}
exports.DUPLEX_HANDLER = DUPLEX_HANDLER;
