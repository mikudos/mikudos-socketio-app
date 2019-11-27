"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
class ServiceMethods {
    constructor(hooks, service) {
        this.hooks = hooks;
        this.service = service;
    }
    async handle(method, request) {
        let result = {
            jsonrpc: '2.0',
            id: request.id
        };
        const handleFunc = async (request, result) => {
            result.result = await this.service[method](request, ...request.params);
        };
        const passList = lodash_1.default.compact([
            ...this.hooks.before.all,
            ...(this.hooks.before[method] || []),
            handleFunc,
            ...(this.hooks.after[method] || []),
            ...this.hooks.after.all
        ]);
        for await (const hook of passList) {
            await hook.call(this, request, result);
            if (result.result)
                return result;
        }
    }
}
exports.ServiceMethods = ServiceMethods;
