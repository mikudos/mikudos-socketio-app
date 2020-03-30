"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('mikudos:json-rpc');
class RpcServiceMethods {
    constructor(hooks, service) {
        this.hooks = hooks;
        this.service = service;
    }
    async handle(method, request) {
        var _a, _b, _c, _d;
        let result = {
            jsonrpc: '2.0',
            id: request.id
        };
        const handleFunc = async (request, result) => {
            result.result = await this.service[method](request, request.params);
        };
        const passList = lodash_1.default.compact([
            ...(((_a = this.hooks.before) === null || _a === void 0 ? void 0 : _a.all) || []),
            ...(((_b = this.hooks.before) === null || _b === void 0 ? void 0 : _b[method]) || []),
            handleFunc,
            ...(((_c = this.hooks.after) === null || _c === void 0 ? void 0 : _c[method]) || []),
            ...(((_d = this.hooks.after) === null || _d === void 0 ? void 0 : _d.all) || [])
        ]);
        for await (const hook of passList) {
            await hook.call(this, request, result);
            if (result.result)
                return result;
        }
    }
}
exports.RpcServiceMethods = RpcServiceMethods;
//# sourceMappingURL=rpc-service-methods.js.map