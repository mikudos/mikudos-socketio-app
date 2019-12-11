import _ from 'lodash';
import { HandlerBase } from './handler-base';
import { Application } from '../app';

export class CHAT_HANDLER extends HandlerBase {
    roomPath: string;
    constructor(
        public app: Application,
        { eventPath = 'message', roomPath = 'room' } = {},
        public hooks: { [key: string]: Function[] } = {}
    ) {
        super(eventPath);
        this.roomPath = roomPath;
    }

    getRoom(data: any) {
        return _.get(data, this.roomPath);
    }

    getUser(data: any) {
        return _.get(data, '__proto_socket__.request.user');
    }

    async handle(data: any, socket: SocketIO.Socket) {
        const hooks = _.compact(_.concat(this.hooks.all, this.hooks.chat));
        for await (const hook of hooks) {
            await hook.call(this, data, socket);
        }
        let room = this.getRoom(data);
        if (!room)
            return {
                error: {
                    message: `${this.roomPath} key must provided`,
                    class: 'Common Error',
                    code: 1
                }
            };
        // broadcast chat message exclud self or to another socket id
        (data.__proto_socket__ as SocketIO.Socket)
            .to(room)
            .emit(
                this.eventPath,
                _.omit(data, '__proto_socket__', '__proto_app__')
            );
        return { result: { successed: true } };
    }

    async join(data: any, socket: SocketIO.Socket) {
        const hooks = _.compact(_.concat(this.hooks.all, this.hooks.join));
        for await (const hook of hooks) {
            await hook.call(this, data, socket);
        }
        let room = this.getRoom(data);
        if (!room)
            return {
                error: {
                    message: `${this.roomPath} key must provided`,
                    class: 'Common Error',
                    code: 1
                }
            };
        if (this.checkRoom(room, data.__proto_socket__))
            return {
                error: {
                    message: `you already in the room: ${room}`,
                    class: 'Common Error',
                    code: 1
                }
            };
        let user = this.getUser(data);
        if (this.app.enabled('redisAdaptered')) {
            await (data.__proto_app__ as Application).remoteJoin(
                data.__proto_socket__.id,
                room
            );
        }
        data.__proto_socket__.join(room, () => {
            data.__proto_socket__.to(room).emit(`join ${this.eventPath}`, {
                room,
                user,
                socket_id: data.__proto_socket__.id
            });
        });
        return { result: { successed: true } };
    }

    async leave(data: any, socket: SocketIO.Socket) {
        const hooks = _.compact(_.concat(this.hooks.all, this.hooks.leave));
        for await (const hook of hooks) {
            await hook.call(this, data, socket);
        }
        let room = this.getRoom(data);
        if (!this.checkRoom(room, data.__proto_socket__))
            return {
                error: {
                    message: `you are not in the room: ${room}`,
                    class: 'Wrong Room',
                    code: 2
                }
            };
        let user = this.getUser(data);
        data.__proto_socket__.to(room).emit(`leave ${this.eventPath}`, {
            room,
            user,
            socket_id: data.__proto_socket__.id
        });
        if (this.app.enabled('redisAdaptered')) {
            await (data.__proto_app__ as Application).remoteLeave(
                data.__proto_socket__.id,
                room
            );
        }
        data.__proto_socket__.leave(room);
        return { result: { successed: true } };
    }
}
