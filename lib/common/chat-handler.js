"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const handler_base_1 = require("./handler-base");
class CHAT_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'message', roomPath = 'room' } = {}) {
        super(eventPath);
        this.app = app;
        this.roomPath = roomPath;
    }
    getRoom(data) {
        return data[this.roomPath];
    }
    getUser(data) {
        return lodash_1.default.get(data, '__proto_socket__.request.user');
    }
    handle(data) {
        let room = this.getRoom(data);
        if (!this.checkRoom(room, data.__proto_socket__))
            return {
                error: {
                    message: 'you are not in the corresponding room',
                    class: 'Wrong Room',
                    code: 2
                }
            };
        // broadcast chat message exclud self
        data.__proto_socket__.to(room).send(lodash_1.default.omit(data, '__proto_socket__'));
        return { result: { successed: true } };
    }
    join(data) {
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
        data.__proto_socket__.join(room, () => {
            data.__proto_socket__.to(room).emit(`join ${this.eventPath}`, {
                room,
                user,
                socket_id: data.__proto_socket__.id
            });
        });
        return { result: { successed: true } };
    }
    leave(data) {
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
        data.__proto_socket__.leave(room);
        return { result: { successed: true } };
    }
}
exports.CHAT_HANDLER = CHAT_HANDLER;
