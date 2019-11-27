import _ from 'lodash';
import { HandlerBase } from './handler-base';
import { Application } from '../app';

export class ChatHandler extends HandlerBase {
    roomPath: string;
    constructor(
        public app: Application,
        { eventPath = 'message', roomPath = 'room' } = {}
    ) {
        super(eventPath);
        this.roomPath = roomPath;
    }

    getRoom(data: any) {
        return data[this.roomPath];
    }

    getUser(data: any) {
        return _.get(data, '__proto_socket__.request.user');
    }

    handle(data: any) {
        let room = this.getRoom(data);
        if (Object.keys(data.__proto_socket__.rooms).includes(room)) {
            // broadcast chat message exclud self
            data.__proto_socket__
                .to(room)
                .send(_.omit(data, '__proto_socket__'));
            return { result: { successed: true } };
        } else {
            return {
                error: {
                    message: 'you are not in the corresponding room',
                    class: 'Wrong Room',
                    code: 2
                }
            };
        }
    }

    join(data: any) {
        let room = this.getRoom(data);
        if (!room)
            return {
                error: {
                    message: `${this.roomPath} key must provided`,
                    class: 'Common Error',
                    code: 1
                }
            };
        if (Object.keys(data.__proto_socket__.rooms).includes(room))
            return {
                error: {
                    message: `you already in the room: ${room}`,
                    class: 'Common Error',
                    code: 1
                }
            };
        let user = this.getUser(data);
        data.__proto_socket__.join(room, () => {
            data.__proto_socket__.to(room).emit(`join ${this.eventPath}`, {
                room,
                user,
                socket_id: data.__proto_socket__.id
            });
        });
        return { result: { successed: true } };
    }

    leave(data: any) {
        let room = this.getRoom(data);
        if (!Object.keys(data.__proto_socket__.rooms).includes(room))
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
        data.__proto_socket__.leave(room);
        return { result: { successed: true } };
    }
}
