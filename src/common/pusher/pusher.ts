import _ from 'lodash';
import { HandlerBase } from '../handler-base';
import { Application } from '../../app';
import { EventEmitter } from 'events';
import { Message, MessageType } from './interfaces';
import { mikudos } from '../../namespace';

export class PUSHER_HANDLER extends HandlerBase {
    private pusherRequest?: any;
    constructor(
        public app: Application,
        { eventPath = 'pusher' } = {},
        private pusherService: any
    ) {
        super(eventPath);
    }

    register() {
        console.debug('register pusher on Application');
        if (!this.pusherRequest) return;
        this.pusherRequest.removeAllListeners();
        this.pusherRequest.on('data', async (data: Message) => {
            if (await this.app.isIORoomEmpty(data.channelId)) {
                // 对应组内没有用户
                data.messageType = MessageType.UNRECEIVED;
                this.pusherRequest.write(data);
            } else {
                // 将消息发送给组内用户
                this.app.io.to(data.channelId).emit(`${this.eventPath}`, data);
            }
        });
        this.pusherRequest.on('end', (data: any) => {
            console.debug('request ended:', data);
            this.initDuplexRequest();
            this.register();
        });
        this.pusherRequest.on('error', (data: any) => {
            console.debug('error:', data);
            this.initDuplexRequest();
            this.register();
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
