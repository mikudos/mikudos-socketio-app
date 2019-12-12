import config from 'config';
import socket from 'socket.io';
const redisAdapter = require('socket.io-redis');
import _ from 'lodash';
import { JSON_RPC_HANDLER } from './common/json-rpc-handler';
import { Authentication, AuthenticationRequest } from './authentication.class';
import { CHAT_HANDLER, DUPLEX_HANDLER } from './common';

export declare namespace mikudos {
    interface ConfigFunc {
        (app: Application): void;
    }

    interface Socket extends SocketIO.Socket {
        mikudos: {
            app: Application;
            provider: string;
            headers: any;
            remoteAddress: any;
            user: any;
        };
    }
}

export class Application {
    settings: any;
    io: socket.Namespace;
    json_rpc_services?: JSON_RPC_HANDLER;
    chat_services?: CHAT_HANDLER;
    rootNamespace?: string;
    publishFilter?: (
        app: Application,
        io: socket.Namespace
    ) => Promise<string[]>;
    authentication?: Authentication;
    duplex_services?: DUPLEX_HANDLER;
    constructor(
        public rootIo: socket.Server,
        {
            rootNamespace,
            redisConfig
        }: {
            rootNamespace?: string;
            redisConfig?: { host: string; port: number };
        } = {}
    ) {
        this.settings = _.merge({}, config);
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

    get(name: string) {
        return this.settings[name];
    }

    set(name: string, value: any) {
        this.settings[name] = value;
        return this;
    }

    disable(name: string) {
        this.settings[name] = false;
        return this;
    }

    disabled(name: string) {
        return !this.settings[name];
    }

    enable(name: string) {
        this.settings[name] = true;
        return this;
    }

    enabled(name: string) {
        return !!this.settings[name];
    }

    configure(fn: mikudos.ConfigFunc): Application {
        fn.call(this, this);

        return this;
    }

    socketInit() {
        this.io.on('connection', (socket: mikudos.Socket) => {
            socket.use((reqData: any, next) => {
                this.parseRequset(reqData, socket);
                next();
            });

            // if json_rpc_services configured, then listen the coresponding event
            if (this.json_rpc_services) {
                socket.on(
                    this.json_rpc_services.eventPath,
                    async (request: any, callback: Function) => {
                        if (!this.io || !this.json_rpc_services) return;
                        const [namespace, method] = String(
                            request.method
                        ).split('.');
                        let response: any = await this.json_rpc_services.handle(
                            namespace,
                            method,
                            request
                        );
                        response.method = `${namespace}.${method}`;
                        callback(response);
                        this.publishFilter && this.publishEvent(response);
                    }
                );
            }

            if (this.authentication) {
                socket.on(
                    this.authentication.eventPath,
                    async (data: AuthenticationRequest, callback: Function) => {
                        if (!this.authentication)
                            throw new Error(
                                'Authentication must be generate first!'
                            );
                        const Auth = this.authentication;
                        try {
                            const authResult = await Auth.authenticate(data);
                            let token = _.get(authResult, Auth.tokenPath);
                            if (!token)
                                throw new Error(
                                    `Can not find Token at path: ${Auth.tokenPath}`
                                );
                            socket.handshake.headers.authentication = token;
                            socket.mikudos.user = authResult.user;
                            callback(authResult);
                        } catch (error) {
                            callback({
                                code: 501,
                                message: 'Authentication Request Error!',
                                error: {
                                    info: error.message
                                }
                            });
                        }
                        let userId =
                            socket.mikudos.user[
                                this.get('authentication.entityId') || 'id'
                            ];
                        if (userId) {
                            socket.join(userId);
                        }
                        socket.join('authenticated', () => {
                            this.authentication &&
                                this.authentication.authJoinCallback &&
                                this.authentication.authJoinCallback(
                                    socket,
                                    this
                                );
                        });
                    }
                );
            }

            if (this.chat_services) {
                socket.on(
                    this.chat_services.eventPath,
                    async (data, callback: Function) => {
                        // chat message
                        if (!this.chat_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        try {
                            let res = await this.chat_services.handle(
                                data,
                                socket
                            );
                            callback(res);
                        } catch (error) {
                            callback({ error });
                        }
                    }
                );
                socket.on(
                    `join ${this.chat_services.eventPath}`,
                    async (data, callback: Function) => {
                        if (!this.chat_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        try {
                            let res = await this.chat_services.join(
                                data,
                                socket
                            );
                            callback(res);
                        } catch (error) {
                            callback({ error });
                        }
                    }
                );
                socket.on(
                    `leave ${this.chat_services.eventPath}`,
                    async (data, callback: Function) => {
                        if (!this.chat_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        try {
                            let res = await this.chat_services.leave(
                                data,
                                socket
                            );
                            callback(res);
                        } catch (error) {
                            callback({ error });
                        }
                    }
                );
            }

            if (this.duplex_services) {
                socket.on(
                    this.duplex_services.eventPath,
                    async (data, callback: Function) => {
                        const [namespace, method] = String(data.method).split(
                            '.'
                        );
                        if (!this.duplex_services)
                            throw new Error(
                                'Duplex service must be registered first'
                            );
                        let res = await this.duplex_services.handle(
                            namespace,
                            method,
                            data.data,
                            socket,
                            data.room
                        );
                        callback(res);
                    }
                );
                socket.on(
                    `${this.duplex_services.eventPath} send`,
                    async (data, callback: Function) => {
                        const [namespace, method] = String(data.method).split(
                            '.'
                        );
                        if (!this.duplex_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        let res = await this.duplex_services.send(
                            namespace,
                            method,
                            data.data,
                            socket
                        );
                        callback(res);
                    }
                );
                socket.on(
                    `${this.duplex_services.eventPath} cancel`,
                    async (data, callback: Function) => {
                        const [namespace, method] = String(data.method).split(
                            '.'
                        );
                        if (!this.duplex_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        let res = await this.duplex_services.cancel(
                            namespace,
                            method,
                            socket
                        );
                        callback(res);
                    }
                );
            }

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
    async publishEvent(response: any) {
        if (!this.publishFilter) return;
        const rooms = await this.publishFilter(this, this.io);
        rooms.map(clientRoom => {
            this.io.to(clientRoom).emit('rpc-call event', response);
        });
    }

    parseRequset(request: any, socket: mikudos.Socket) {
        socket.mikudos = {
            app: this,
            provider: 'socketio',
            headers: socket.handshake.headers,
            remoteAddress: socket.conn.remoteAddress,
            user: null
        };
        if (request.length === 1) return;
        if (!request[1].jsonrpc) return;
        // if request is jsonrpc request then parse the request
        request[1] = _.pick(request[1], ['jsonrpc', 'id', 'method', 'params']);
        request[1].socket = socket;
    }

    /**
     * Join the remote Room
     * @param socketId
     * @param room
     */
    async remoteJoin(socketId: string, room: string) {
        if (!this.enabled('redisAdaptered')) return;
        await new Promise((resolve, reject) => {
            (this.io.adapter as any).remoteJoin(socketId, room, (err: any) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    /**
     * Leave the remote room
     * @param socketId
     * @param room
     */
    async remoteLeave(socketId: string, room: string) {
        if (!this.enabled('redisAdaptered')) return;
        await new Promise((resolve, reject) => {
            (this.io.adapter as any).remoteLeave(socketId, room, (err: any) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    async clientRooms(socket: mikudos.Socket): Promise<string[]> {
        if (this.enabled('redisAdaptered')) {
            return await new Promise((resolve, reject) => {
                (this.io.adapter as any).clientRooms(
                    socket.id,
                    (err: any, rooms: string[]) => {
                        if (err) reject(err);
                        resolve(rooms); // return an array containing every room socketId has joined.
                    }
                );
            });
        } else {
            return Object.keys(socket.rooms);
        }
    }

    async allRooms() {
        if (!this.enabled('redisAdaptered')) return;
        await new Promise((resolve, reject) => {
            (this.io.adapter as any).allRooms((err: any, rooms: string[]) => {
                if (err || !rooms)
                    reject(err || Error('get no rooms, remote error'));
                resolve(rooms);
            });
        });
    }

    async remoteDisconnect(socketId: String, close: Boolean = true) {
        if (!this.enabled('redisAdaptered')) return;
        await new Promise((resolve, reject) => {
            (this.io.adapter as any).remoteDisconnect(
                socketId,
                close,
                (err: any) => {
                    if (err) reject(err);
                    resolve();
                }
            );
        });
    }
}
