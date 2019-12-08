import config from 'config';
import socket from 'socket.io';
import redisAdapter from 'socket.io-redis';
import _ from 'lodash';
import { JSON_RPC_HANDLER } from './common/json-rpc-handler';
import { Authentication, AuthenticationRequest } from './authentication.class';
import { CHAT_HANDLER, DUPLEX_HANDLER } from './common';

declare namespace mikudos {
    interface ConfigFunc {
        (app: Application): void;
    }
}

export class Application {
    settings: any;
    io: socket.Server | socket.Namespace;
    json_rpc_services?: JSON_RPC_HANDLER;
    chat_services?: CHAT_HANDLER;
    publishFilter?: (io: socket.Server | socket.Namespace) => Promise<string[]>;
    authentication?: Authentication;
    duplex_services?: DUPLEX_HANDLER;
    constructor(io: socket.Server, public rootNamespace?: string) {
        io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
        this.io = rootNamespace ? io.of(rootNamespace) : io;
        this.settings = _.merge({}, config);
    }

    bind(io: socket.Server, rootNamespace?: string) {
        io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
        this.io = rootNamespace ? io.of(rootNamespace) : io;
        this.socketInit();
        this.rootNamespace = rootNamespace;
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
        this.io.on('connection', (socket: socket.Socket) => {
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
                            (socket as any).mikudos.user = authResult.user;
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
                        socket.join('authenticated', () => {
                            this.authentication &&
                                this.authentication.authJoinCallback &&
                                this.authentication.authJoinCallback(socket);
                        });
                    }
                );
            }

            if (this.chat_services) {
                socket.on(
                    this.chat_services.eventPath,
                    async (data, callback: Function) => {
                        data.__proto_socket__ = socket;
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
                        data.__proto_socket__ = socket;
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
                        data.__proto_socket__ = socket;
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
                                'Chat service must be registered first'
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
    async publishEvent(response: any) {
        if (!this.publishFilter) return;
        (this.io.adapter as any).clients((err: any, clients: any) => {
            console.log(clients); // an array containing all connected socket ids
        });
        const rooms = await this.publishFilter(this.io);
        rooms.map(clientRoom => {
            this.io.to(clientRoom).emit('rpc-call event', response);
        });
    }

    parseRequset(request: any, socket: socket.Socket) {
        (socket as any).mikudos = {
            app: this,
            provider: 'socketio',
            headers: socket.handshake.headers,
            remoteAddress: socket.conn.remoteAddress
        };
        if (request.length === 1) return;
        if (!request[1].jsonrpc) return;
        // if request is jsonrpc request then parse the request
        request[1] = _.pick(request[1], ['jsonrpc', 'id', 'method', 'params']);
        request[1].socket = socket;
    }
}
