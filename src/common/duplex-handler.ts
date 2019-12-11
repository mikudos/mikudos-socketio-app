import { get, set, unset, keysIn, forOwn } from 'lodash';
import socket from 'socket.io';
import { HandlerBase } from './handler-base';
import { EventEmitter } from 'events';

export class DUPLEX_HANDLER extends HandlerBase {
    namespaces: any = {};
    socketStreams: { [key: string]: EventEmitter } = {};
    constructor(namespaces: object, { eventPath = 'stream-call' } = {}) {
        super(eventPath);
        this.namespaces = namespaces;
    }

    async handle(
        namespace: string,
        method: string,
        data: any,
        socket: socket.Socket,
        room: string
    ) {
        if (!this.checkRoom(room, socket))
            return {
                error: {
                    message: 'you are not in the corresponding room',
                    class: 'Wrong Room',
                    code: 2
                }
            };
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
            let before = this.namespaces[namespace].before || [];
            for await (const fn of before) {
                data = (await fn(namespace, method, data, socket)) || data;
            }
            this.namespaces[namespace].handle(namespace, method, data, event);
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

    async cancel(namespace: string, method: string, socket: SocketIO.Socket) {
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
