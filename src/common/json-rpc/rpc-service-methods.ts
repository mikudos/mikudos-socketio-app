import _ from 'lodash';

export class RpcServiceMethods {
    hooks: any;
    service: any;
    constructor(hooks: { before: any; after: any; error: any }, service: any) {
        this.hooks = hooks;
        this.service = service;
    }
    async handle(method: string, request: any) {
        let result: any = {
            jsonrpc: '2.0',
            id: request.id
        };
        const handleFunc = async (request: any, result: any) => {
            result.result = await this.service[method](request, request.params);
        };
        const passList = _.compact([
            ...(this.hooks.before?.all || []),
            ...(this.hooks.before?.[method] || []),
            handleFunc,
            ...(this.hooks.after?.[method] || []),
            ...(this.hooks.after?.all || [])
        ]);
        for await (const hook of passList) {
            await hook.call(this, request, result);
            if (result.result) return result;
        }
    }
}
