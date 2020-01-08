"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_base_1 = require("./handler-base");
class MESSAGE_PUSHER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'message', roomPath = 'room' } = {}, hooks = {}) {
        super(eventPath);
        this.app = app;
        this.hooks = hooks;
    }
}
exports.MESSAGE_PUSHER = MESSAGE_PUSHER;
