import { HandlerBase } from '../handler-base';
import { Application } from '../../app';
import { mikudos } from '../../namespace';

const JsonRpcError = require('json-rpc-error');

export class JSON_RPC_HANDLER extends HandlerBase {
    namespaces: any = {};
    constructor(namespaces: object, { eventPath = 'rpc-call' } = {}) {
        super(eventPath);
        this.namespaces = namespaces;
    }

    register(app: Application, socket: mikudos.Socket) {
        socket.on(this.eventPath, async (request: any, callback: Function) => {
            if (!app.io) return;
            const [namespace, method] = String(request.method).split('.');
            let response: any = await this.handle(namespace, method, request);
            response.method = `${namespace}.${method}`;
            callback(response);
            app.publishFilter && app.publishEvent(response);
        });
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
