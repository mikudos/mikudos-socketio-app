import _ from 'lodash';
import { HandlerBase } from '../handler-base';
import { Application } from '../../app';

export class PUSHER_HANDLER extends HandlerBase {
    private serviceRequest: any;
    constructor(
        public app: Application,
        { eventPath = 'pusher' } = {},
        public hooks: { [key: string]: Function[] } = {},
        private service: any
    ) {
        super(eventPath);
    }

    async handle(
        namespace: string,
        method: string,
        data: any,
        room: string,
        socket: SocketIO.Socket
    ) {
        return { result: { successed: true } };
    }

    register(app: Application, socket: SocketIO.Socket) {
        this.serviceRequest.on('', (data: any) => {});
        socket.on('', async (data, callback: Function) => {});
    }
}
