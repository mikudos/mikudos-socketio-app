"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HandlerBase {
    constructor(eventPath) {
        this.eventPath = eventPath;
    }
    async checkRoom(room, socket) {
        return (await socket.mikudos.app.clientRooms(socket)).includes(room);
    }
}
exports.HandlerBase = HandlerBase;
//# sourceMappingURL=handler-base.js.map