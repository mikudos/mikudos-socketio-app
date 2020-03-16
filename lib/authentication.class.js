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
    constructor(app, { protocol, host, port, path, method, headers } = {
        protocol: 'http',
        host: '127.0.0.1',
        port: 80,
        path: '/authentication',
        method: 'POST',
        headers: {}
    }, { tokenPath = 'accessToken', eventPath = 'authentication', userIdPath = 'user.id', authJoinCallback = async (socket, app) => { } } = {}) {
        this.app = app;
        this.requsetOption = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            json: true
        };
        this.eventPath = eventPath;
        this.tokenPath = tokenPath;
        this.userIdPath = userIdPath;
        this.requsetOption.uri = `${protocol}://${host}:${port}${path}`;
        this.requsetOption.method = method || this.requsetOption.method;
        lodash_1.default.assign(this.requsetOption.headers, headers);
        this.authJoinCallback = authJoinCallback;
    }
    register(socket, authCallback) {
        socket.on(this.eventPath, async (data, callback) => {
            try {
                const authResult = await this.authenticate(data);
                let channel = lodash_1.default.get(authResult, this.userIdPath);
                await this.joinSelfId(socket, channel);
                let token = lodash_1.default.get(authResult, this.tokenPath);
                if (!token)
                    throw new Error(`Can not find Token at path: ${this.tokenPath}`);
                socket.handshake.headers.authentication = token;
                socket.mikudos.user = authResult.user;
                authCallback(authResult); // !bind other handlers on the authenticated socket
                callback(authResult);
                let userId = socket.mikudos.user[this.app.get('authentication.entityId') || 'id'];
                if (userId) {
                    socket.join(userId);
                }
                socket.join('authenticated', () => {
                    this.authJoinCallback &&
                        this.authJoinCallback(socket, this.app);
                });
            }
            catch (error) {
                callback({
                    code: 501,
                    message: 'Invalid login',
                    error: {
                        info: error.message
                    }
                });
            }
        });
    }
    async joinSelfId(socket, id) {
        if (this.app.enabled('redisAdaptered')) {
            await socket.mikudos.app.remoteJoin(socket.id, id);
        }
        socket.join(id);
    }
    async authenticate(body) {
        let option = { body, ...this.requsetOption };
        return await request_promise_native_1.default({ body, ...this.requsetOption });
    }
}
exports.Authentication = Authentication;
//# sourceMappingURL=authentication.class.js.map