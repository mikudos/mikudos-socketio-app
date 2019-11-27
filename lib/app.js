"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("config"));
const lodash_1 = __importDefault(require("lodash"));
class Application {
    constructor(io) {
        this.io = io;
        this.settings = lodash_1.default.merge({}, config_1.default);
    }
    bind(io) {
        this.io = io;
        this.socketInit();
    }
    init() {
        this.socketInit();
    }
    get(name) {
        return this.settings[name];
    }
    set(name, value) {
        this.settings[name] = value;
        return this;
    }
    disable(name) {
        this.settings[name] = false;
        return this;
    }
    disabled(name) {
        return !this.settings[name];
    }
    enable(name) {
        this.settings[name] = true;
        return this;
    }
    enabled(name) {
        return !!this.settings[name];
    }
    configure(fn) {
        fn.call(this, this);
        return this;
    }
    socketInit() {
        this.io.on('connection', (socket) => {
            socket.use((reqData, next) => {
                this.parseRequset(reqData, socket);
                next();
            });
            // if json_rpc_services configured, then listen the coresponding event
            if (this.json_rpc_services) {
                socket.on(this.json_rpc_services.eventPath, async (request, callback) => {
                    if (!this.io || !this.json_rpc_services)
                        return;
                    const [namespace, method] = String(request.method).split('.');
                    let response = await this.json_rpc_services.handle(namespace, method, request);
                    response.method = `${namespace}.${method}`;
                    callback(response);
                    this.publishEvent(response);
                });
            }
            if (this.authentication) {
                socket.on('authentication', async (data, callback) => {
                    if (!this.authentication)
                        throw new Error('Authentication must be generate first!');
                    const Auth = this.authentication;
                    try {
                        const authResult = await Auth.authenticate(data);
                        let token = lodash_1.default.get(authResult, Auth.tokenPath);
                        if (!token)
                            throw new Error(`Can not find Token at path: ${Auth.tokenPath}`);
                        socket.handshake.headers.authentication = token;
                        socket.mikudos.user = authResult.user;
                        callback(authResult);
                    }
                    catch (error) {
                        callback({
                            code: 501,
                            message: 'Authentication Request Error!',
                            error: {
                                info: error.message
                            }
                        });
                    }
                    socket.join('authenticated', () => {
                        let rooms = Object.keys(socket.rooms);
                        console.log(rooms); // [ <socket.id>, 'room 237' ]
                    });
                });
            }
            if (this.chat_services) {
                socket.on(this.chat_services.eventPath, (data, callback) => {
                    data.__proto_socket__ = socket;
                    // chat message
                    if (!this.chat_services)
                        throw new Error('Chat service must be registered first');
                    let res = this.chat_services.handle(data);
                    callback(res);
                });
                socket.on(`join ${this.chat_services.eventPath}`, (data, callback) => {
                    data.__proto_socket__ = socket;
                    if (!this.chat_services)
                        throw new Error('Chat service must be registered first');
                    let res = this.chat_services.join(data);
                    callback(res);
                });
                socket.on(`leave ${this.chat_services.eventPath}`, (data, callback) => {
                    data.__proto_socket__ = socket;
                    if (!this.chat_services)
                        throw new Error('Chat service must be registered first');
                    let res = this.chat_services.leave(data);
                    callback(res);
                });
            }
            if (this.duplex_services) {
                socket.on(this.duplex_services.eventPath, async (data, callback) => {
                    const [namespace, method] = String(data.method).split('.');
                    if (!this.duplex_services)
                        throw new Error('Chat service must be registered first');
                    let res = await this.duplex_services.handle(namespace, method, data.data, socket);
                    callback(res);
                });
                socket.on(`${this.duplex_services.eventPath} send`, async (data, callback) => {
                    const [namespace, method] = String(data.method).split('.');
                    if (!this.duplex_services)
                        throw new Error('Chat service must be registered first');
                    let res = await this.duplex_services.send(namespace, method, data.data, socket);
                    callback(res);
                });
                socket.on(`${this.duplex_services.eventPath} cancel`, async (data, callback) => {
                    const [namespace, method] = String(data.method).split('.');
                    if (!this.duplex_services)
                        throw new Error('Chat service must be registered first');
                    let res = await this.duplex_services.cancel(namespace, method, socket);
                    callback(res);
                });
            }
            socket.on('event', data => {
                console.log('TCL: data', data);
                /* … */
            });
            socket.once('disconnect', () => {
                console.log('TCL: client disconnect');
                console.log('rooms', socket.rooms);
                socket.leaveAll();
                if (this.duplex_services) {
                    this.duplex_services.cancelAllOnSocket(socket.id);
                }
                /* … */
            });
            socket.on('disconnecting', reason => {
                let rooms = Object.keys(socket.rooms);
                // ...
            });
        });
    }
    // TODO: channel to be finished
    publishEvent(response) {
        // this.io.to('authenticated').emit('rpc-call event', response);
        console.log('sockets', this.io.sockets.sockets);
        console.log('authenticated sockets', this.io.in('authenticated').sockets.sockets);
        this.io.in('authenticated').clients((error, clients) => {
            if (error)
                throw error;
            console.log(clients); // => [Anw2LatarvGVVXEIAAAD]
            clients
                .filter(client => client)
                .map(clientRoom => {
                this.io.to(clientRoom).emit('rpc-call event', response);
            });
        });
    }
    parseRequset(request, socket) {
        socket.mikudos = {
            provider: 'socketio',
            headers: socket.handshake.headers,
            remoteAddress: socket.conn.remoteAddress
        };
        if (request.length === 1)
            return;
        if (!request[1].jsonrpc)
            return;
        // if request is jsonrpc request then parse the request
        request[1] = lodash_1.default.pick(request[1], ['jsonrpc', 'id', 'method', 'params']);
        request[1].socket = socket;
    }
}
exports.Application = Application;
