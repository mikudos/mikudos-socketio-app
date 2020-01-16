"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_base_1 = require("../handler-base");
const JsonRpcError = require('json-rpc-error');
class JSON_RPC_HANDLER extends handler_base_1.HandlerBase {
    constructor(namespaces, { eventPath = 'rpc-call' } = {}) {
        super(eventPath);
        this.namespaces = {};
        this.namespaces = namespaces;
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
