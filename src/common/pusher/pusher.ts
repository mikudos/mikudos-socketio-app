import _ from 'lodash';
import { HandlerBase } from '../handler-base';
import { Application } from '../../app';
import { EventEmitter } from 'events';
import { Message, MessageType } from './interfaces';

export class PUSHER_HANDLER extends HandlerBase {
    private pusherRequest?: EventEmitter;
    constructor(
        public app: Application,
        { eventPath = 'pusher' } = {},
        public hooks: { [key: string]: Function[] } = {},
        private pusherService: any
    ) {
        super(eventPath);
    }

    register(app: Application, socket: SocketIO.Socket) {
        if (!this.pusherRequest) return;
        this.pusherRequest.removeAllListeners();
        this.pusherRequest.on('data', (data: Message) => {});
        this.pusherRequest.on('end', (data: any) => {
            this.initDuplexRequest();
            this.register(app, socket);
        });
        this.pusherRequest.on('error', (data: any) => {
            this.initDuplexRequest();
            this.register(app, socket);
        });
        socket.on('pusher', async (data: Message, callback: Function) => {
            if (data.messageType == MessageType.RECEIVED) {
                this.pusherRequest;
            }
        });
    }

    initDuplexRequest() {
        this.pusherRequest = this.pusherService.GateStream();
        console.log(
            'TCL: PUSHER_HANDLER -> initDuplexRequest -> this.pusherRequest',
            this.pusherRequest
        );
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
}
