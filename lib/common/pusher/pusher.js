"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_base_1 = require("../handler-base");
class PUSHER_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'message' } = {}, hooks = {}) {
        super(eventPath);
        this.app = app;
        this.hooks = hooks;
    }
}
exports.PUSHER_HANDLER = PUSHER_HANDLER;
