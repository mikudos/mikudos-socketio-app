import _ from 'lodash';
import { HandlerBase } from './handler-base';
import { Application, mikudos } from '../app';
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

    getUser(socket: mikudos.Socket) {
        return socket.mikudos.user;
    }

    async handle(data: any, socket: mikudos.Socket) {
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
        socket.to(room).emit(this.eventPath, data);
        return { result: { successed: true } };
    }

    async join(data: any, socket: mikudos.Socket) {
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
        if (this.checkRoom(room, socket))
            return {
                error: {
                    message: `you already in the room: ${room}`,
                    class: 'Common Error',
                    code: 1
                }
            };
        let user = this.getUser(socket);
        if (this.app.enabled('redisAdaptered')) {
            await socket.mikudos.app.remoteJoin(socket.id, room);
        }
        socket.join(room, () => {
            socket.to(room).emit(`join ${this.eventPath}`, {
                room,
                user,
                socket_id: socket.id
            });
        });
        return { result: { successed: true } };
    }

    async leave(data: any, socket: mikudos.Socket) {
        const hooks = _.compact(_.concat(this.hooks.all, this.hooks.leave));
        for await (const hook of hooks) {
            await hook.call(this, data, socket);
        }
        let room = this.getRoom(data);
        if (!this.checkRoom(room, socket))
            return {
                error: {
                    message: `you are not in the room: ${room}`,
                    class: 'Wrong Room',
                    code: 2
                }
            };
        let user = this.getUser(socket);
        socket.to(room).emit(`leave ${this.eventPath}`, {
            room,
            user,
            socket_id: socket.id
        });
        if (this.app.enabled('redisAdaptered')) {
            await socket.mikudos.app.remoteLeave(socket.id, room);
        }
        socket.leave(room);
        return { result: { successed: true } };
    }
}
