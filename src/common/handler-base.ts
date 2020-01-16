import { mikudos } from '../namespace';

export class HandlerBase {
    constructor(public eventPath: string) {}

    async checkRoom(room: string, socket: mikudos.Socket): Promise<boolean> {
        return (await socket.mikudos.app.clientRooms(socket)).includes(room);
    }
}
