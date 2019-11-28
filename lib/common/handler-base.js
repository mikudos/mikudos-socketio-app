"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HandlerBase {
    constructor(eventPath) {
        this.eventPath = eventPath;
    }
    checkRoom(room, socket) {
        return Object.keys(socket.rooms).includes(room);
    }
}
exports.HandlerBase = HandlerBase;
