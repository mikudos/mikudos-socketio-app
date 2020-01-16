"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_base_1 = require("../handler-base");
class PUSHER_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'pusher' } = {}, hooks = {}, service) {
        super(eventPath);
        this.app = app;
        this.hooks = hooks;
        this.service = service;
    }
    async handle(namespace, method, data, room, socket) {
        return { result: { successed: true } };
    }
    register(app, socket) {
        this.serviceRequest.on('', (data) => { });
        socket.on('', async (data, callback) => { });
    }
}
exports.PUSHER_HANDLER = PUSHER_HANDLER;
