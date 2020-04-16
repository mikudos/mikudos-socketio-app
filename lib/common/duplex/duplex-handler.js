"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const handler_base_1 = require("../handler-base");
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('mikudos:duplex');
class DUPLEX_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, serviceClasses, { eventPath = 'stream-call', authenticated = true } = {}) {
        super(eventPath);
        this.app = app;
        this.namespaces = {};
        this.socketStreams = {};
        this.authenticated = authenticated;
        serviceClasses.forEach((c) => {
            this.namespaces[c.key] = new c.sc(this, app);
        });
    }
    register(socket) {
        debug(`register duplex service ${this.authenticated ? 'with auth' : 'without auth'}`);
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
        var _a, _b, _c, _d, _e, _f;
        if (room) {
            if (!(await this.checkRoom(room, socket)))
                return {
                    error: {
                        message: 'you are not in the corresponding room',
                        class: 'Wrong Room',
                        code: 2,
                    },
                };
        }
        let event = lodash_1.get(this.socketStreams, socket.id);
        if (!event || !(event instanceof events_1.EventEmitter)) {
            event = new events_1.EventEmitter();
            let len = 0;
            lodash_1.forOwn(this.namespaces, (space) => {
                len += lodash_1.keysIn(this.namespaces).length;
            });
            event.setMaxListeners(len > 10 ? len : 10);
            lodash_1.set(this.socketStreams, socket.id, event);
        }
        try {
            if (!this.namespaces[namespace][method]) {
                return { error: { message: "method dosn't exist" } };
            }
            let before = (((_c = (_b = (_a = this.namespaces) === null || _a === void 0 ? void 0 : _a[namespace]) === null || _b === void 0 ? void 0 : _b.before) === null || _c === void 0 ? void 0 : _c.all) || []).concat(((_f = (_e = (_d = this.namespaces) === null || _d === void 0 ? void 0 : _d[namespace]) === null || _e === void 0 ? void 0 : _e.before) === null || _f === void 0 ? void 0 : _f[method]) || []);
            for await (const fn of before) {
                data = await fn(`${namespace}.${method}`, data, socket);
            }
            await this.namespaces[namespace][method](`${namespace}.${method}`, data, event);
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
            console.error('DUPLEX_HANDLER -> error', error);
            let event = lodash_1.get(this.socketStreams, socket.id);
            if (event)
                event.removeAllListeners(`${namespace}.${method}`);
            return { error: { message: 'Request Error' } };
        }
        return { result: { success: true } };
    }
    async send(namespace, method, data, socket) {
        let event = lodash_1.get(this.socketStreams, socket.id);
        if (!event)
            return { error: { message: 'Request Not exist or is finished' } };
        event.emit(`${namespace}.${method} send`, data, socket.mikudos);
    }
    async cancel(namespace, method, socket) {
        let event = lodash_1.get(this.socketStreams, socket.id);
        if (!event)
            return {
                error: {
                    message: 'Cancel Error, Request may be closed',
                },
            };
        // cancel first
        event.emit(`${namespace}.${method} cancel`, {
            mikudos: socket.mikudos,
        });
        event.removeAllListeners(`${namespace}.${method}`);
    }
    cancelAllOnSocket(id) {
        let event = this.socketStreams[id];
        if (event) {
            debug('socket has duplex eventStream to be remove: %o', id);
            event.removeAllListeners();
            lodash_1.unset(this.socketStreams, id);
        }
        return { result: { success: true } };
    }
}
exports.DUPLEX_HANDLER = DUPLEX_HANDLER;
//# sourceMappingURL=duplex-handler.js.map