import _ from 'lodash';
import { HandlerBase } from '../handler-base';
import { Application } from '../../app';
import { EventEmitter } from 'events';
import { Message, MessageType } from './interfaces';
import { mikudos } from '../../namespace';

export class PUSHER_HANDLER extends HandlerBase {
    private pusherRequest?: any;
    private userIdPath: string;
    constructor(
        public app: Application,
        { eventPath = 'pusher', userIdPath = 'id' } = {},
        private pusherService: any
    ) {
        super(eventPath);
        this.userIdPath = userIdPath;
        this.initDuplexRequest();
    }

    register(socket: mikudos.Socket) {
        socket.on(`${this.eventPath}`, (data: Message) => {
            // check data type
            if (data.messageType !== MessageType.RECEIVED) return;
            data.messageType = MessageType.RECEIVED;
            data.channelId = String(socket.mikudos.user[this.userIdPath]);
            this.pusherRequest.write(data);
        });
        this.pusherRequest.write({
            channelId: String(socket.mikudos.user[this.userIdPath]),
            messageType: MessageType.REQUEST
        });
    }

    initDuplexRequest() {
        console.debug('init new duplex stream Request');
        this.pusherRequest = this.pusherService.GateStream({
            group: 'test-group'
        });
        this.pusherRequest.removeAllListeners();
        this.pusherRequest.on('data', async (data: Message) => {
            if (!data.channelId) return;
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
        });
        this.pusherRequest.on('error', (data: any) => {
            console.debug('error:', data);
            this.initDuplexRequest();
        });
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
