"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("config"));
const socket_io_redis_1 = __importDefault(require("socket.io-redis"));
const lodash_1 = __importDefault(require("lodash"));
class Application {
    constructor(rootIo, { rootNamespace, redisConfig } = {}) {
        this.rootIo = rootIo;
        if (redisConfig) {
            this.enable('redisAdaptered');
            rootIo.adapter(socket_io_redis_1.default(redisConfig));
        }
        this.rootNamespace = rootNamespace;
        this.io = rootNamespace ? rootIo.of(rootNamespace) : rootIo.of('/');
        this.settings = lodash_1.default.merge({}, config_1.default);
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
                    this.publishFilter && this.publishEvent(response);
                });
            }
            if (this.authentication) {
                socket.on(this.authentication.eventPath, async (data, callback) => {
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
                    let userId = socket.mikudos.user[this.get('authentication.entityId') || 'id'];
                    if (userId) {
                        socket.join(userId);
                    }
                    socket.join('authenticated', () => {
                        this.authentication &&
                            this.authentication.authJoinCallback &&
                            this.authentication.authJoinCallback(socket, this);
                    });
                });
            }
            if (this.chat_services) {
                socket.on(this.chat_services.eventPath, async (data, callback) => {
                    data.__proto_socket__ = socket;
                    data.__proto_app__ = this;
                    // chat message
                    if (!this.chat_services)
                        throw new Error('Chat service must be registered first');
                    try {
                        let res = await this.chat_services.handle(data, socket);
                        callback(res);
                    }
                    catch (error) {
                        callback({ error });
                    }
                });
                socket.on(`join ${this.chat_services.eventPath}`, async (data, callback) => {
                    data.__proto_socket__ = socket;
                    data.__proto_app__ = this;
                    if (!this.chat_services)
                        throw new Error('Chat service must be registered first');
                    try {
                        let res = await this.chat_services.join(data, socket);
                        callback(res);
                    }
                    catch (error) {
                        callback({ error });
                    }
                });
                socket.on(`leave ${this.chat_services.eventPath}`, async (data, callback) => {
                    data.__proto_socket__ = socket;
                    data.__proto_app__ = this;
                    if (!this.chat_services)
                        throw new Error('Chat service must be registered first');
                    try {
                        let res = await this.chat_services.leave(data, socket);
                        callback(res);
                    }
                    catch (error) {
                        callback({ error });
                    }
                });
            }
            if (this.duplex_services) {
                socket.on(this.duplex_services.eventPath, async (data, callback) => {
                    const [namespace, method] = String(data.method).split('.');
                    if (!this.duplex_services)
                        throw new Error('Chat service must be registered first');
                    let res = await this.duplex_services.handle(namespace, method, data.data, socket, data.room);
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
    // use customized publishFilter
    async publishEvent(response) {
        if (!this.publishFilter)
            return;
        const rooms = await this.publishFilter(this, this.io);
        rooms.map(clientRoom => {
            this.io.to(clientRoom).emit('rpc-call event', response);
        });
    }
    parseRequset(request, socket) {
        socket.mikudos = {
            app: this,
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
    /**
     * Join the remote Room
     * @param socketId
     * @param room
     */
    async remoteJoin(socketId, room) {
        if (!this.enabled('redisAdaptered'))
            return;
        await new Promise((resolve, reject) => {
            this.io.adapter.remoteJoin(socketId, room, (err) => {
                if (err)
                    reject(err);
                resolve();
            });
        });
    }
    /**
     * Leave the remote room
     * @param socketId
     * @param room
     */
    async remoteLeave(socketId, room) {
        if (!this.enabled('redisAdaptered'))
            return;
        await new Promise((resolve, reject) => {
            this.io.adapter.remoteLeave(socketId, room, (err) => {
                if (err)
                    reject(err);
                resolve();
            });
        });
    }
    async clientRooms(socketId) {
        if (!this.enabled('redisAdaptered'))
            return;
        await new Promise((resolve, reject) => {
            this.io.adapter.clientRooms(socketId, (err, rooms) => {
                if (err)
                    reject(err);
                resolve(rooms); // return an array containing every room socketId has joined.
            });
        });
    }
    async allRooms() {
        if (!this.enabled('redisAdaptered'))
            return;
        await new Promise((resolve, reject) => {
            this.io.adapter.allRooms((err, rooms) => {
                if (err || !rooms)
                    reject(err || Error('get no rooms, remote error'));
                resolve(rooms);
            });
        });
    }
    async remoteDisconnect(socketId, close = true) {
        if (!this.enabled('redisAdaptered'))
            return;
        await new Promise((resolve, reject) => {
            this.io.adapter.remoteDisconnect(socketId, close, (err) => {
                if (err)
                    reject(err);
                resolve();
            });
        });
    }
}
exports.Application = Application;
