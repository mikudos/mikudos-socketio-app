"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const handler_base_1 = require("./handler-base");
class DUPLEX_HANDLER extends handler_base_1.HandlerBase {
    constructor(namespaces, { eventPath = 'stream-call' } = {}) {
        super(eventPath);
        this.namespaces = {};
        this.socketStreams = {};
        this.namespaces = namespaces;
    }
    async handle(namespace, method, data, socket) {
        try {
            let res = this.namespaces[namespace].handle(method, data);
            lodash_1.set(this.socketStreams, `${socket.id}.${namespace}.${method}`, res);
            this.socketStreams[socket.id][namespace][method].on('data', (data) => {
                socket.emit(`${this.eventPath} ${namespace}.${method}`, data);
            });
        }
        catch (error) {
            let res = lodash_1.get(this.socketStreams, `${socket.id}.${namespace}.${method}`);
            if (res)
                res.removeAllListeners();
            lodash_1.unset(this.socketStreams, `${socket.id}.${namespace}.${method}`);
            return { error: { message: 'Request Error' } };
        }
        return { result: { successed: true } };
    }
    async send(namespace, method, data, socket) {
        let res = lodash_1.get(this.socketStreams, `${socket.id}.${namespace}.${method}`);
        if (!res)
            return { error: { message: 'Request Not exist or is finished' } };
        try {
            res.send(data);
        }
        catch (error) {
            return {
                error: {
                    message: error.message || 'Send Error, Request may be closed'
                }
            };
        }
        return { result: { successed: true } };
    }
    async cancel(namespace, method, socket) {
        let res = lodash_1.get(this.socketStreams, `${socket.id}.${namespace}.${method}`);
        if (!res)
            return {
                error: {
                    message: 'Cancel Error, Request may be closed'
                }
            };
        // cancel first
        res.removeAllListeners();
        lodash_1.unset(this.socketStreams, `${socket.id}.${namespace}.${method}`);
    }
    cancelAllOnSocket(id) {
        for (const key in this.socketStreams[id]) {
            if (this.socketStreams[id].hasOwnProperty(key)) {
                const namespace = this.socketStreams[id][key];
                for (const nk in namespace) {
                    if (namespace.hasOwnProperty(nk)) {
                        const res = namespace[nk];
                        if (res)
                            res.removeAllListeners();
                    }
                }
            }
        }
        lodash_1.unset(this.socketStreams, id);
    }
}
exports.DUPLEX_HANDLER = DUPLEX_HANDLER;
