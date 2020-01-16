import { HandlerBase } from '../handler-base';

const JsonRpcError = require('json-rpc-error');

export class JSON_RPC_HANDLER extends HandlerBase {
    namespaces: any = {};
    constructor(namespaces: object, { eventPath = 'rpc-call' } = {}) {
        super(eventPath);
        this.namespaces = namespaces;
    }

    async handle(namespace: string, method: string, request: any) {
        let result: any = {};
        try {
            result = await this.namespaces[namespace].handle(method, request);
        } catch (error) {
            result.error = this.parseError(error);
        }
        return result;
    }

    parseError(error: Error) {
        if (error instanceof JsonRpcError) return error;
        else if (error instanceof Error)
            return new JsonRpcError(error.message, -32000, {});
        else return new JsonRpcError('internal Error', -32000, {});
    }
}
