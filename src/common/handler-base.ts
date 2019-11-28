import socket from 'socket.io';

export class HandlerBase {
    constructor(public eventPath: string) {}

    checkRoom(room: string, socket: socket.Socket): boolean {
        return Object.keys(socket.rooms).includes(room);
    }
}
