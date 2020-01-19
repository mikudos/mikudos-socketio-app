"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const handler_base_1 = require("../handler-base");
const events_1 = require("events");
class DUPLEX_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, namespaces, { eventPath = 'stream-call' } = {}) {
        super(eventPath);
        this.app = app;
        this.namespaces = {};
        this.socketStreams = {};
        this.namespaces = namespaces;
    }
    register(app, socket) {
        socket.on(this.eventPath, async (data, callback) => {
            const [namespace, method] = String(data.method).split('.');
            let res = await this.handle(namespace, method, data.data, socket, data.room);
            callback(res);
        });
        socket.on(`${this.eventPath} send`, async (data, callback) => {
            const [namespace, method] = String(data.method).split('.');
            let res = await this.send(namespace, method, data.data, socket);
            callback(res);
        });
        socket.on(`${this.eventPath} cancel`, async (data, callback) => {
            const [namespace, method] = String(data.method).split('.');
            let res = await this.cancel(namespace, method, socket);
            callback(res);
        });
    }
    async handle(namespace, method, data, socket, room) {
        if (room) {
            if (!(await this.checkRoom(room, socket)))
                return {
                    error: {
                        message: 'you are not in the corresponding room',
                        class: 'Wrong Room',
                        code: 2
                    }
                };
        }
        let event = lodash_1.get(this.socketStreams, socket.id);
        if (!event || !(event instanceof events_1.EventEmitter)) {
            event = new events_1.EventEmitter();
            let len = 0;
            lodash_1.forOwn(this.namespaces, space => {
                len += lodash_1.keysIn(this.namespaces).length;
            });
            event.setMaxListeners(len > 10 ? len : 10);
            lodash_1.set(this.socketStreams, socket.id, event);
        }
        try {
            if (!this.namespaces[namespace].service[method]) {
                return { error: { message: "method dosn't exist" } };
            }
            let before = (this.namespaces[namespace].before.all || []).concat(this.namespaces[namespace].before[method] || []);
            for await (const fn of before) {
                data = await fn(`${namespace}.${method}`, data, socket);
            }
            await this.namespaces[namespace].service[method](`${namespace}.${method}`, data, event);
            this.socketStreams[socket.id].on(`${namespace}.${method}`, (data) => {
                socket.emit(`${this.eventPath} ${namespace}.${method}`, data);
                if (!room)
                    return;
                socket
                    .to(room)
                    .emit(`${this.eventPath} ${namespace}.${method}`, data);
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
        if (event) {
            event.removeAllListeners();
            lodash_1.unset(this.socketStreams, id);
        }
        return { result: { successed: true } };
    }
}
exports.DUPLEX_HANDLER = DUPLEX_HANDLER;
