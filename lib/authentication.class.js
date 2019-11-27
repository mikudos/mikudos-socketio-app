"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_promise_native_1 = __importDefault(require("request-promise-native"));
const lodash_1 = __importDefault(require("lodash"));
class AuthenticationRequest {
}
exports.AuthenticationRequest = AuthenticationRequest;
class Authentication {
    constructor({ protocol = 'http', host = '127.0.0.1', port = '80', path = '/authentication', method, headers = {} } = {}, tokenPath = 'accessToken') {
        this.tokenPath = tokenPath;
        this.requsetOption = {
            method: 'POST',
            uri: 'http://127.0.0.1:3030/authentication',
            headers: {
                'Content-Type': 'application/json'
            },
            json: true
        };
        this.requsetOption.uri = `${protocol}://${host}:${port}${path}`;
        this.requsetOption.method = method || this.requsetOption.method;
        lodash_1.default.assign(this.requsetOption.headers, headers);
    }
    async authenticate(body) {
        let option = { body, ...this.requsetOption };
        return await request_promise_native_1.default({ body, ...this.requsetOption });
    }
}
exports.Authentication = Authentication;
function default_1(app) {
    app.authentication = new Authentication({
        port: 3030
    });
}
exports.default = default_1;
