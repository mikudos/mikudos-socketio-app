"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const config_1 = __importDefault(require("config"));
const redisAdapter = require('socket.io-redis');
const lodash_1 = __importDefault(require("lodash"));
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('mikudos:app');
class Application {
    constructor(rootIo, { rootNamespace, redisConfig, } = {}) {
        this.rootIo = rootIo;
        rootNamespace = rootNamespace || '/';
        debug('booting mikudos at rootNamespace %o', rootNamespace);
        this.settings = lodash_1.default.merge({}, config_1.default);
        this.enabled('redisAdaptered') &&
            (redisConfig = this.get('redisConfig'));
        if (redisConfig) {
            debug('redisAdapter activated');
            this.enable('redisAdaptered');
            rootIo.adapter(redisAdapter(redisConfig));
        }
        this.rootNamespace = rootNamespace;
        this.io = rootIo.of(rootNamespace);
    }
    init() {
        this.socketInit();
    }
    get(name) {
        return lodash_1.default.get(this.settings, name);
    }
    set(name, value) {
        lodash_1.default.set(this.settings, name, value);
        return this;
    }
    disable(name) {
        lodash_1.default.set(this.settings, name, false);
        return this;
    }
    disabled(name) {
        return !lodash_1.default.get(this.settings, name);
    }
    enable(name) {
        lodash_1.default.set(this.settings, name, true);
        return this;
    }
    enabled(name) {
        return !!lodash_1.default.get(this.settings, name);
    }
    configure(fn) {
        fn.call(this, this);
        return this;
    }
    socketInit() {
        this.io.on('connection', (socket) => {
            debug('io connected with socket: %o', socket.id);
            socket.mikudos = {
                app: this,
                provider: 'socketio',
                headers: socket.handshake.headers,
                remoteAddress: socket.conn.remoteAddress,
                user: null,
            };
            socket.use((reqData, next) => {
                this.parseRequset(reqData, socket);
                next();
            });
            this.authentication &&
                this.authentication.register(socket, (authResult) => {
                    debug('register all authenticated handlers');
                    this.pusher && this.pusher.register(socket);
                    this.json_rpc_services &&
                        this.json_rpc_services.authenticated &&
                        this.json_rpc_services.register(socket);
                    this.chat_services &&
                        this.chat_services.authenticated &&
                        this.chat_services.register(socket);
                    this.duplex_services &&
                        this.duplex_services.authenticated &&
                        this.duplex_services.register(socket);
                });
            debug('register all unauthenticated handlers');
            this.json_rpc_services &&
                !this.json_rpc_services.authenticated &&
                this.json_rpc_services.register(socket);
            this.chat_services &&
                !this.chat_services.authenticated &&
                this.chat_services.register(socket);
            this.duplex_services &&
                !this.duplex_services.authenticated &&
                this.duplex_services.register(socket);
            socket.once('disconnect', () => {
                debug('socket disconnected %o', socket.id);
                socket.leaveAll();
                debug('all rooms leaved');
                if (this.duplex_services) {
                    debug('canncel processing duplex service');
                    this.duplex_services.cancelAllOnSocket(socket);
                }
                /* … */
            });
            // socket.on('disconnecting', reason => {
            //     let rooms = Object.keys(socket.rooms);
            //     // ...
            // });
        });
    }
    // use customized publishFilter
    async publishEvent(response) {
        if (!this.publishFilter)
            return;
        debug('publishFilter method provided, publish event to all filtered socket');
        const rooms = await this.publishFilter(this, this.io);
        rooms.map((clientRoom) => {
            this.io.to(clientRoom).emit('rpc-call event', response);
        });
    }
    parseRequset(request, socket) {
        if (request.length === 1)
            return;
        if (!request[1].jsonrpc)
            return;
        // if request is jsonrpc request then parse the request
        debug('parse request for json-rpc method');
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
        debug('remoteJoin with redisAdapter');
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
        debug('remoteLeave with redisAdapter');
        await new Promise((resolve, reject) => {
            this.io.adapter.remoteLeave(socketId, room, (err) => {
                if (err)
                    reject(err);
                resolve();
            });
        });
    }
    async clientRooms(socket) {
        if (this.enabled('redisAdaptered')) {
            return await new Promise((resolve, reject) => {
                this.io.adapter.clientRooms(socket.id, (err, rooms) => {
                    if (err)
                        reject(err);
                    resolve(rooms); // return an array containing every room socketId has joined.
                });
            });
        }
        else {
            return Object.keys(socket.rooms);
        }
    }
    async isIORoomEmpty(room) {
        return await new Promise((resolve, reject) => {
            this.io.in(room).clients((error, clients) => {
                if (error || clients.length == 0)
                    resolve(true);
                resolve(false);
            });
        });
    }
    async allRooms() {
        if (!this.enabled('redisAdaptered'))
            return;
        return await new Promise((resolve, reject) => {
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
        debug('set socket %o disconnect remote server', socketId);
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
//# sourceMappingURL=app.js.map