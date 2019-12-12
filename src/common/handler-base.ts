import { mikudos } from '../app';

export class HandlerBase {
    constructor(public eventPath: string) {}

    checkRoom(room: string, socket: mikudos.Socket): boolean {
        return Object.keys(socket.rooms).includes(room);
    }
}
