import config from 'config';
import socket from 'socket.io';
import _ from 'lodash';
import { JSON_RPC_HANDLER } from './common/json-rpc-handler';
import { Authentication, AuthenticationRequest } from './authentication.class';
import { ChatHandler } from './common';

declare namespace mikudos {
    interface ConfigFunc {
        (app: Application): void;
    }
}

export class Application {
    settings: any;
    io: socket.Server;
    json_rpc_services?: JSON_RPC_HANDLER;
    chat_services?: ChatHandler;
    authentication?: Authentication;
    [key: string]: any;
    constructor(io: socket.Server) {
        this.io = io;
        this.settings = _.merge({}, config);
    }

    bind(io: socket.Server) {
        this.io = io;
        this.socketInit();
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
                        this.publishEvent(response);
                    }
                );
            }

            if (this.authentication) {
                socket.on(
                    'authentication',
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
                            socket.request.user = authResult.user;
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
                            let rooms = Object.keys(socket.rooms);
                            console.log(rooms); // [ <socket.id>, 'room 237' ]
                        });
                    }
                );
            }

            if (this.chat_services) {
                socket.on(
                    this.chat_services.eventPath,
                    (data, callback: Function) => {
                        data.__proto_socket__ = socket;
                        // chat message
                        if (!this.chat_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        let res = this.chat_services.handle(data);
                        callback(res);
                    }
                );
                socket.on(
                    `join ${this.chat_services.eventPath}`,
                    (data, callback: Function) => {
                        data.__proto_socket__ = socket;
                        if (!this.chat_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        let res = this.chat_services.join(data);
                        callback(res);
                    }
                );
                socket.on(
                    `leave ${this.chat_services.eventPath}`,
                    (data, callback: Function) => {
                        data.__proto_socket__ = socket;
                        if (!this.chat_services)
                            throw new Error(
                                'Chat service must be registered first'
                            );
                        let res = this.chat_services.leave(data);
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
                /* … */
            });
            socket.on('disconnecting', reason => {
                let rooms = Object.keys(socket.rooms);
                // ...
            });
        });
    }

    publishEvent(response: any) {
        // this.io.to('authenticated').emit('rpc-call event', response);
        console.log('sockets', this.io.sockets.sockets);
        console.log(
            'authenticated sockets',
            this.io.in('authenticated').sockets.sockets
        );
        this.io.in('authenticated').clients((error: any, clients: any) => {
            if (error) throw error;
            console.log(clients); // => [Anw2LatarvGVVXEIAAAD]
            (clients as any[])
                .filter(client => client)
                .map(clientRoom => {
                    this.io.to(clientRoom).emit('rpc-call event', response);
                });
        });
    }

    parseRequset(request: any, socket: socket.Socket) {
        (socket as any).mikudos = {
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
