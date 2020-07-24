"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAT_HANDLER = void 0;
const lodash_1 = __importDefault(require("lodash"));
const handler_base_1 = require("../handler-base");
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('mikudos:chat');
class CHAT_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'message', roomPath = 'room', emitToSelfPath = 'emitToSelf', authenticated = true } = {}, hooks = { before: {}, after: {} }) {
        super(eventPath);
        this.app = app;
        this.hooks = hooks;
        this.authenticated = authenticated;
        this.roomPath = roomPath;
        this.emitToSelfPath = emitToSelfPath;
    }
    register(socket) {
        debug(`register chat service ${this.authenticated ? 'with auth' : 'without auth'}`);
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
    isSelfToBeEmit(data) {
        return !!lodash_1.default.get(data, this.emitToSelfPath);
    }
    getUser(socket) {
        return socket.mikudos.user;
    }
    async handle(data, socket) {
        const beforeHooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.before.all, this.hooks.before.chat));
        const afterHooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.after.all, this.hooks.after.chat));
        for await (const hook of beforeHooks) {
            await hook.call(this, data, socket);
        }
        let room = this.getRoom(data);
        let emitToSelf = this.isSelfToBeEmit(data);
        if (!room)
            return {
                error: {
                    message: `${this.roomPath} key must provided`,
                    class: 'Common Error',
                    code: 1
                }
            };
        socket.to(room).emit(this.eventPath, data);
        debug('broadcast chat message exclud self:', data);
        if (emitToSelf) {
            socket.emit(this.eventPath, data);
            debug('emit chat message to self');
        }
        // add after hooks to chat
        for await (const hook of afterHooks) {
            await hook.call(this, data, socket);
        }
        return { result: { success: true } };
    }
    async join(data, socket) {
        const beforeHooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.before.all, this.hooks.before.join));
        const afterHooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.after.all, this.hooks.after.join));
        for await (const hook of beforeHooks) {
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
        await socket.mikudos.app.remoteJoin(socket.id, room);
        socket.join(room, () => {
            debug('joined room: %o, socket: %o', room, socket.id);
            socket.to(room).emit(`join ${this.eventPath}`, {
                room,
                user,
                socket_id: socket.id
            });
            debug('emit join event to room: %o, socket: %o', room, socket.id);
        });
        for await (const hook of afterHooks) {
            await hook.call(this, data, socket);
        }
        return { result: { success: true } };
    }
    async leave(data, socket) {
        const beforeHooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.before.all, this.hooks.before.leave));
        const afterHooks = lodash_1.default.compact(lodash_1.default.concat(this.hooks.after.all, this.hooks.after.leave));
        for await (const hook of beforeHooks) {
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
        debug('emit leave event to room: %o, socket: %o', room, socket.id);
        await socket.mikudos.app.remoteLeave(socket.id, room);
        socket.leave(room);
        debug('leaved room: %o, socket: %o', room, socket.id);
        for await (const hook of afterHooks) {
            await hook.call(this, data, socket);
        }
        return { result: { success: true } };
    }
}
exports.CHAT_HANDLER = CHAT_HANDLER;
//# sourceMappingURL=chat-handler.js.map