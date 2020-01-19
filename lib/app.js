"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("config"));
const redisAdapter = require('socket.io-redis');
const lodash_1 = __importDefault(require("lodash"));
class Application {
    constructor(rootIo, { rootNamespace, redisConfig } = {}) {
        this.rootIo = rootIo;
        this.settings = lodash_1.default.merge({}, config_1.default);
        if (redisConfig) {
            this.enable('redisAdaptered');
            rootIo.adapter(redisAdapter(redisConfig));
        }
        this.rootNamespace = rootNamespace;
        this.io = rootNamespace ? rootIo.of(rootNamespace) : rootIo.of('/');
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
        this.pusher && this.pusher.register(this);
        this.io.on('connection', (socket) => {
            socket.use((reqData, next) => {
                this.parseRequset(reqData, socket);
                next();
            });
            // if json_rpc_services configured, then listen the coresponding event
            this.json_rpc_services &&
                this.json_rpc_services.register(this, socket);
            this.authentication && this.authentication.register(this, socket);
            this.chat_services && this.chat_services.register(this, socket);
            this.duplex_services && this.duplex_services.register(this, socket);
            socket.on('event', data => {
                console.log('TCL: data', data);
                /* … */
            });
            socket.once('disconnect', () => {
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
            remoteAddress: socket.conn.remoteAddress,
            user: null
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
