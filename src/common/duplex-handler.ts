import { get, set, unset } from 'lodash';
import { HandlerBase } from './handler-base';

export class DUPLEX_HANDLER extends HandlerBase {
    namespaces: any = {};
    socketStreams: any = {};
    constructor(namespaces: object, { eventPath = 'stream-call' } = {}) {
        super(eventPath);
        this.namespaces = namespaces;
    }

    async handle(
        namespace: string,
        method: string,
        data: any,
        socket: SocketIO.Socket
    ) {
        try {
            let res = this.namespaces[namespace].handle(method, data);
            set(this.socketStreams, `${socket.id}.${namespace}.${method}`, res);
            this.socketStreams[socket.id][namespace][method].on(
                'data',
                (data: any) => {
                    socket.emit(
                        `${this.eventPath} ${namespace}.${method}`,
                        data
                    );
                }
            );
        } catch (error) {
            let res = get(
                this.socketStreams,
                `${socket.id}.${namespace}.${method}`
            );
            if (res) res.removeAllListeners();
            unset(this.socketStreams, `${socket.id}.${namespace}.${method}`);
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
        let res = get(
            this.socketStreams,
            `${socket.id}.${namespace}.${method}`
        );
        if (!res)
            return { error: { message: 'Request Not exist or is finished' } };
        try {
            res.send(data);
        } catch (error) {
            return {
                error: {
                    message:
                        error.message || 'Send Error, Request may be closed'
                }
            };
        }
        return { result: { successed: true } };
    }

    async cancel(namespace: string, method: string, socket: SocketIO.Socket) {
        let res = get(
            this.socketStreams,
            `${socket.id}.${namespace}.${method}`
        );
        if (!res)
            return {
                error: {
                    message: 'Cancel Error, Request may be closed'
                }
            };
        // cancel first
        res.removeAllListeners();
        unset(this.socketStreams, `${socket.id}.${namespace}.${method}`);
        return { result: { successed: true } };
    }

    cancelAllOnSocket(id: string) {
        for (const key in this.socketStreams[id]) {
            if (this.socketStreams[id].hasOwnProperty(key)) {
                const namespace = this.socketStreams[id][key];
                for (const nk in namespace) {
                    if (namespace.hasOwnProperty(nk)) {
                        const res = namespace[nk];
                        if (res) res.removeAllListeners();
                    }
                }
            }
        }
        unset(this.socketStreams, id);
        return { result: { successed: true } };
    }
}
