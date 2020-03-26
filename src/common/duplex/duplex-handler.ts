import { get, set, unset, keysIn, forOwn } from 'lodash';
import socket from 'socket.io';
import { HandlerBase } from '../handler-base';
import { EventEmitter } from 'events';
import { Application } from '../../';
import { mikudos } from '../../namespace';

export class DUPLEX_HANDLER extends HandlerBase {
    public authenticated: boolean;
    namespaces: { [key: string]: mikudos.DuplexService } = {};
    socketStreams: { [key: string]: EventEmitter } = {};
    constructor(
        public app: Application,
        serviceClasses: [{ key: string; sc: mikudos.DuplexServiceConstructor }],
        { eventPath = 'stream-call', authenticated = true } = {}
    ) {
        super(eventPath);
        this.authenticated = authenticated;
        serviceClasses.forEach(c => {
            this.namespaces[c.key] = new c.sc(this, app);
        });
    }

    register(socket: mikudos.Socket) {
        socket.on(this.eventPath, async (data, callback: Function) => {
            const [namespace, method] = String(data.method).split('.');
            let res = await this.handle(
                namespace,
                method,
                data.data,
                socket,
                data.room
            );
            callback(res);
        });
        socket.on(
            `${this.eventPath} send`,
            async (data, callback: Function) => {
                const [namespace, method] = String(data.method).split('.');
                let res = await this.send(namespace, method, data.data, socket);
                callback(res);
            }
        );
        socket.on(
            `${this.eventPath} cancel`,
            async (data, callback: Function) => {
                const [namespace, method] = String(data.method).split('.');
                let res = await this.cancel(namespace, method, socket);
                callback(res);
            }
        );
    }

    async handle(
        namespace: string,
        method: string,
        data: any,
        socket: mikudos.Socket,
        room?: string
    ) {
        if (room) {
            if (!(await this.checkRoom(room, socket)))
                return {
                    error: {
                        message: 'you are not in the corresponding room',
                        class: 'Wrong Room',
                        code: 2
                    }
                };
        }
        let event = get(this.socketStreams, socket.id);
        if (!event || !(event instanceof EventEmitter)) {
            event = new EventEmitter();
            let len = 0;
            forOwn(this.namespaces, space => {
                len += keysIn(this.namespaces).length;
            });
            event.setMaxListeners(len > 10 ? len : 10);
            set(this.socketStreams, socket.id, event);
        }
        try {
            if (!this.namespaces[namespace][method]) {
                return { error: { message: "method dosn't exist" } };
            }
            let before = (
                this.namespaces?.[namespace]?.before?.all || []
            ).concat(this.namespaces?.[namespace]?.before?.[method] || []);
            for await (const fn of before) {
                data = await fn(`${namespace}.${method}`, data, socket);
            }
            await this.namespaces[namespace][method](
                `${namespace}.${method}`,
                data,
                event
            );

            this.socketStreams[socket.id].on(
                `${namespace}.${method}`,
                (data: any) => {
                    socket.emit(
                        `${this.eventPath} ${namespace}.${method}`,
                        data
                    );
                    if (!room) return;
                    socket
                        .to(room)
                        .emit(`${this.eventPath} ${namespace}.${method}`, data);
                }
            );
        } catch (error) {
            console.error('DUPLEX_HANDLER -> error', error);
            let event = get(this.socketStreams, socket.id);
            if (event) event.removeAllListeners(`${namespace}.${method}`);
            return { error: { message: 'Request Error' } };
        }
        return { result: { successed: true } };
    }

    async send(
        namespace: string,
        method: string,
        data: any,
        socket: SocketIO.Socket
    ) {
        let event = get(this.socketStreams, socket.id);
        if (!event)
            return { error: { message: 'Request Not exist or is finished' } };
        event.emit(`${namespace}.${method} send`, data);
        return await new Promise((resolve, reject) => {
            event.once(`${namespace}.${method} send`, data => resolve(data));
            setTimeout(() => {
                resolve({
                    error: { message: 'Request Timeout' }
                });
            }, 10000);
        });
    }

    async cancel(namespace: string, method: string, socket: mikudos.Socket) {
        let event = get(this.socketStreams, socket.id);
        if (!event)
            return {
                error: {
                    message: 'Cancel Error, Request may be closed'
                }
            };
        // cancel first
        event.emit(`${namespace}.${method} cancel`);
        event.removeAllListeners(`${namespace}.${method}`);
        return await new Promise((resolve, reject) => {
            event.once(`${namespace}.${method} cancel`, data => resolve(data));
            setTimeout(() => {
                resolve({
                    error: { message: 'Request Timeout' }
                });
            }, 10000);
        });
    }

    cancelAllOnSocket(id: string) {
        let event = this.socketStreams[id];
        if (event) {
            event.removeAllListeners();
            unset(this.socketStreams, id);
        }
        return { result: { successed: true } };
    }
}
