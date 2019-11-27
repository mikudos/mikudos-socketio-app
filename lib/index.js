"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const lodash_1 = __importDefault(require("lodash"));
const events_1 = require("events");
class MikudosSocketIoClient {
    constructor({ uri, option = {} }, { rpcEventName = 'rpc-call', chatEventName = 'message' } = {}, saveTokenCallback = (token) => { }, getTokenMethod = () => this.jwt) {
        this.saveTokenCallback = saveTokenCallback;
        this.getTokenMethod = getTokenMethod;
        this.state = false;
        this.authenticated = false;
        this.responseEventEmitter = new events_1.EventEmitter();
        this.rpcResEventEmitter = new events_1.EventEmitter();
        this.chatEventEmitter = new events_1.EventEmitter();
        if (!uri)
            throw new Error('URI can not be null for new MikudosSocketIoClient at params[0].uri');
        this.jwt = this.getTokenMethod();
        this.rpcEventName = rpcEventName;
        this.chatEventName = chatEventName;
        this.socket = socket_io_client_1.default(uri, option);
        this.init();
    }
    init() {
        this.socket.on('connect', () => {
            this.state = true;
            this.reauthentication();
        });
        this.socket.on('disconnect', () => {
            console.log('TCL: disconnect');
            this.state = false;
            this.authenticated = false;
        });
        this.socket.on('authentication', (data) => {
            this.responseEventEmitter.emit('authentication', data);
            this.jwt = lodash_1.default.get(data, 'accessToken');
            if (!this.jwt)
                return;
            this.authenticated = true;
            this.saveTokenCallback.call(this, this.jwt);
        });
        this.socket.on(this.rpcEventName, (data) => {
            const method = String(data.method);
            this.rpcResEventEmitter.emit(method, lodash_1.default.omit(data, 'method'));
        });
        // handle chat events
        this.socket.on(this.chatEventName, (data) => {
            this.chatEventEmitter.emit('chat', data);
        });
        this.socket.on(`join ${this.chatEventName}`, (data) => {
            this.chatEventEmitter.emit('join', data);
        });
        this.socket.on(`leave ${this.chatEventName}`, (data) => {
            this.chatEventEmitter.emit('leave', data);
        });
    }
    checkConnection() {
        if (!this.state)
            throw new Error('connection not stable');
    }
    async authentication(data) {
        this.checkConnection();
        return await new Promise((resolve, reject) => {
            this.socket.emit('authentication', data, (data) => {
                if (data.error)
                    reject(data);
                resolve(data);
            });
        });
    }
    async rpcCall(data) {
        this.checkConnection();
        return await new Promise((resolve, reject) => {
            this.socket.emit(this.rpcEventName, data, (data) => {
                if (data.error)
                    reject(data);
                resolve(data);
            });
        });
    }
    async reauthentication() {
        if (!this.jwt)
            return;
        // auto reauthentication
        return await new Promise((resolve, reject) => {
            this.socket.emit('authentication', {
                strategy: 'jwt',
                accessToken: this.jwt
            }, (data) => {
                if (data.error)
                    reject(data);
                resolve(data);
            });
        });
    }
    async sendChat(data = { message: 'test message', room: 'test' }) {
        return await new Promise((resolve, reject) => {
            this.socket.emit(this.chatEventName, data, (data) => {
                if (data.error)
                    reject(data);
                resolve(data);
            });
        });
    }
    async joinChat(data = { room: 'test' }) {
        return await new Promise((resolve, reject) => {
            this.socket.emit(`join ${this.chatEventName}`, data, (data) => {
                if (data.error)
                    reject(data);
                resolve(data);
            });
        });
    }
    async leaveChat(data = { room: 'test' }) {
        return await new Promise((resolve, reject) => {
            this.socket.emit(`leave ${this.chatEventName}`, data, (data) => {
                if (data.error)
                    reject(data);
                resolve(data);
            });
        });
    }
}
exports.MikudosSocketIoClient = MikudosSocketIoClient;
