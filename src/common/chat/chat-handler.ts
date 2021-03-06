import _ from 'lodash';
import { HandlerBase } from '../handler-base';
import { Application } from '../../app';
import { mikudos } from '../../namespace';
import Debug from 'debug';
const debug = Debug('mikudos:chat');
export class CHAT_HANDLER extends HandlerBase {
    roomPath: string;
    emitToSelfPath: string;
    public authenticated: boolean;
    constructor(
        public app: Application,
        {
            eventPath = 'message',
            roomPath = 'room',
            emitToSelfPath = 'emitToSelf',
            authenticated = true
        } = {},
        public hooks: {
            before: { [key: string]: Function[] };
            after: { [key: string]: Function[] };
        } = { before: {}, after: {} }
    ) {
        super(eventPath);
        this.authenticated = authenticated;
        this.roomPath = roomPath;
        this.emitToSelfPath = emitToSelfPath;
    }

    register(socket: mikudos.Socket) {
        debug(
            `register chat service ${
                this.authenticated ? 'with auth' : 'without auth'
            }`
        );
        socket.on(this.eventPath, async (data, callback: Function) => {
            // chat message
            try {
                let res = await this.handle(data, socket);
                callback(res);
            } catch (error) {
                callback({ error });
            }
        });
        socket.on(
            `join ${this.eventPath}`,
            async (data, callback: Function) => {
                try {
                    let res = await this.join(data, socket);
                    callback(res);
                } catch (error) {
                    callback({ error });
                }
            }
        );
        socket.on(
            `leave ${this.eventPath}`,
            async (data, callback: Function) => {
                try {
                    let res = await this.leave(data, socket);
                    callback(res);
                } catch (error) {
                    callback({ error });
                }
            }
        );
    }

    getRoom(data: any) {
        return _.get(data, this.roomPath);
    }

    isSelfToBeEmit(data: any) {
        return !!_.get(data, this.emitToSelfPath);
    }

    getUser(socket: mikudos.Socket) {
        return socket.mikudos.user;
    }

    async handle(data: any, socket: mikudos.Socket) {
        const beforeHooks = _.compact(
            _.concat(this.hooks.before.all, this.hooks.before.chat)
        );
        const afterHooks = _.compact(
            _.concat(this.hooks.after.all, this.hooks.after.chat)
        );
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

    async join(data: any, socket: mikudos.Socket) {
        const beforeHooks = _.compact(
            _.concat(this.hooks.before.all, this.hooks.before.join)
        );
        const afterHooks = _.compact(
            _.concat(this.hooks.after.all, this.hooks.after.join)
        );
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

    async leave(data: any, socket: mikudos.Socket) {
        const beforeHooks = _.compact(
            _.concat(this.hooks.before.all, this.hooks.before.leave)
        );
        const afterHooks = _.compact(
            _.concat(this.hooks.after.all, this.hooks.after.leave)
        );
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
