import config from 'config';
import socket from 'socket.io';
const redisAdapter = require('socket.io-redis');
import _ from 'lodash';
import { JSON_RPC_HANDLER } from './common/json-rpc/json-rpc-handler';
import { Authentication, AuthenticationRequest } from './authentication.class';
import { CHAT_HANDLER, DUPLEX_HANDLER } from './common';
import { PUSHER_HANDLER } from './common/pusher/pusher';
import { mikudos } from './namespace';
import Debug from 'debug';
const debug = Debug('mikudos:app');

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
    pusher?: PUSHER_HANDLER;
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
        rootNamespace = rootNamespace || '/';
        debug('booting mikudos at rootNamespace %o', rootNamespace);
        this.settings = _.merge({}, config);

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

    get(name: string) {
        return _.get(this.settings, name);
    }

    set(name: string, value: any) {
        _.set(this.settings, name, value);
        return this;
    }

    disable(name: string) {
        _.set(this.settings, name, false);
        return this;
    }

    disabled(name: string) {
        return !_.get(this.settings, name);
    }

    enable(name: string) {
        _.set(this.settings, name, true);
        return this;
    }

    enabled(name: string) {
        return !!_.get(this.settings, name);
    }

    configure(fn: mikudos.ConfigFunc): Application {
        fn.call(this, this);

        return this;
    }

    socketInit() {
        this.io.on('connection', (socket: mikudos.Socket) => {
            debug('io connected with socket: %o', socket.id);
            socket.mikudos = {
                app: this,
                provider: 'socketio',
                headers: socket.handshake.headers,
                remoteAddress: socket.conn.remoteAddress,
                user: null
            };
            socket.use((reqData: any, next) => {
                this.parseRequset(reqData, socket);
                next();
            });

            this.authentication &&
                this.authentication.register(socket, (authResult: any) => {
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
                    this.duplex_services.cancelAllOnSocket(socket.id);
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
    async publishEvent(response: any) {
        if (!this.publishFilter) return;
        debug(
            'publishFilter method provided, publish event to all filtered socket'
        );
        const rooms = await this.publishFilter(this, this.io);
        rooms.map(clientRoom => {
            this.io.to(clientRoom).emit('rpc-call event', response);
        });
    }

    parseRequset(request: any, socket: mikudos.Socket) {
        if (request.length === 1) return;
        if (!request[1].jsonrpc) return;
        // if request is jsonrpc request then parse the request
        debug('parse request for json-rpc method');
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
        debug('remoteJoin with redisAdapter');
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
        debug('remoteLeave with redisAdapter');
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

    async isIORoomEmpty(room: string) {
        return await new Promise((resolve, reject) => {
            this.io.in(room).clients((error: Error, clients: string[]) => {
                if (error || clients.length == 0) resolve(true);
                resolve(false);
            });
        });
    }

    async allRooms() {
        if (!this.enabled('redisAdaptered')) return;
        return await new Promise((resolve, reject) => {
            (this.io.adapter as any).allRooms((err: any, rooms: string[]) => {
                if (err || !rooms)
                    reject(err || Error('get no rooms, remote error'));
                resolve(rooms);
            });
        });
    }

    async remoteDisconnect(socketId: String, close: Boolean = true) {
        if (!this.enabled('redisAdaptered')) return;
        debug('set socket %o disconnect remote server', socketId);
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
