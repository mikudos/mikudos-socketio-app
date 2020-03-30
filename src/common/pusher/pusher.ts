import _ from 'lodash';
import { HandlerBase } from '../handler-base';
import { Application } from '../../app';
import { EventEmitter } from 'events';
import { Message, MessageType } from './interfaces';
import { mikudos } from '../../namespace';
import Debug from 'debug';
const debug = Debug('mikudos:pusher');

export class PUSHER_HANDLER extends HandlerBase {
    private pusherRequest?: any;
    private userIdPath: string;
    private syncMode: string;
    private groupId: string;
    constructor(
        public app: Application,
        {
            eventPath = 'pusher',
            userIdPath = 'id',
            syncMode = 'group',
            groupId = 'test-group'
        } = {},
        private pusherService: any
    ) {
        super(eventPath);
        this.userIdPath = userIdPath;
        this.syncMode = syncMode;
        this.groupId = groupId;
        this.initDuplexRequest();
    }

    register(socket: mikudos.Socket) {
        debug(`register json-rpc service with auth`);
        if (!socket.mikudos?.user?.[this.userIdPath])
            console.error(
                'socket without authenticated user can not register pusher event'
            );
        let channelId = String(socket.mikudos.user[this.userIdPath]);
        socket.on(`${this.eventPath}`, (data: Message) => {
            // check data type
            if (data.messageType !== MessageType.RECEIVED) return;
            data.messageType = MessageType.RECEIVED;
            data.channelId = channelId;
            this.pusherRequest.write(data);
        });
        this.pusherRequest.write({
            channelId: channelId,
            messageType: MessageType.REQUEST
        });
    }

    initDuplexRequest() {
        debug('init new pusher stream Request');
        this.pusherRequest = this.pusherService.GateStream(
            this.syncMode === 'group'
                ? {
                      group: this.groupId
                  }
                : {}
        );
        this.pusherRequest.removeAllListeners();
        this.pusherRequest.on('data', async (data: Message) => {
            debug('new pusher message', data);
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
            debug('pusher request ended:', data);
            this.initDuplexRequest();
        });
        this.pusherRequest.on('error', (data: any) => {
            debug('pusher request error:', data);
            this.initDuplexRequest();
        });
    }
}
