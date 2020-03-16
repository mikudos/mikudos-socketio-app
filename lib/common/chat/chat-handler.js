"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const handler_base_1 = require("../handler-base");
class CHAT_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'message', roomPath = 'room', authenticated = true } = {}, hooks = {}) {
        super(eventPath);
        this.app = app;
        this.hooks = hooks;
        this.authenticated = authenticated;
        this.roomPath = roomPath;
    }
    register(socket) {
        socket.on(this.eventPath, async (data, callback) => {
            // chat message
            try {
                let res = await this.handle(data, socket);
                callback(res);
            }
            catch (error) {
                callback({ error });
            }
        });
        socket.on(`join ${this.eventPath}`, async (data, callback) => {
            try {
                let res = await this.join(data, socket);
                callback(res);
            }
            catch (error) {
                callback({ error });
            }
        });
        socket.on(`leave ${this.eventPath}`, async (data, callback) => {
            try {
                let res = await this.leave(data, socket);
                callback(res);
            }
            catch (error) {
                callback({ error });
            }
        });
    }
    getRoom(data) {
        return lodash_1.default.get(data, this.roomPath);
    }
    getUser(socket) {
        return socket.mikudos.user;
    }
    async handle(data, socket) {
        const hooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.all, this.hooks.chat));
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
    async join(data, socket) {
        const hooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.all, this.hooks.join));
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
        if (await this.checkRoom(room, socket))
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
    async leave(data, socket) {
        const hooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.all, this.hooks.leave));
        for await (const hook of hooks) {
            await hook.call(this, data, socket);
        }
        let room = this.getRoom(data);
        if (!(await this.checkRoom(room, socket)))
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
exports.CHAT_HANDLER = CHAT_HANDLER;
//# sourceMappingURL=chat-handler.js.map