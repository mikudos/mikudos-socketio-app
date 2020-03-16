"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_base_1 = require("../handler-base");
const JsonRpcError = require('json-rpc-error');
class JSON_RPC_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, namespaces, { eventPath = 'rpc-call', authenticated = true } = {}) {
        super(eventPath);
        this.app = app;
        this.namespaces = {};
        this.authentiated = authenticated;
        this.namespaces = namespaces;
    }
    register(socket) {
        let mikudos = socket.mikudos;
        socket.on(this.eventPath, async (request, callback) => {
            if (!this.app.io)
                return;
            socket.mikudos = mikudos;
            request.socket = socket;
            const [namespace, method] = String(request.method).split('.');
            let response = await this.handle(namespace, method, request);
            response.method = `${namespace}.${method}`;
            callback(response);
            this.app.publishFilter && this.app.publishEvent(response);
        });
    }
    async handle(namespace, method, request) {
        let result = {};
        try {
            result = await this.namespaces[namespace].handle(method, request);
        }
        catch (error) {
            result.error = this.parseError(error);
        }
        return result;
    }
    parseError(error) {
        if (error instanceof JsonRpcError)
            return error;
        else if (error instanceof Error)
            return new JsonRpcError(error.message, -32000, {});
        else
            return new JsonRpcError('internal Error', -32000, {});
    }
}
exports.JSON_RPC_HANDLER = JSON_RPC_HANDLER;
//# sourceMappingURL=json-rpc-handler.js.map