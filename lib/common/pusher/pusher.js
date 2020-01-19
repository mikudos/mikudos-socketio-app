"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_base_1 = require("../handler-base");
const interfaces_1 = require("./interfaces");
class PUSHER_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'pusher' } = {}, hooks = {}, pusherService) {
        super(eventPath);
        this.app = app;
        this.hooks = hooks;
        this.pusherService = pusherService;
    }
    register(app) {
        console.debug('register pusher on the Application');
        if (!this.pusherRequest)
            return;
        this.pusherRequest.removeAllListeners();
        this.pusherRequest.on('data', async (data) => {
            if (await app.isIORoomEmpty(data.channelId)) {
                // 对应组内没有用户
                data.messageType = interfaces_1.MessageType.UNRECEIVED;
                this.pusherRequest.write(data);
            }
            else {
                // 将消息发送给组内用户
                app.io.to(data.channelId).emit(`${this.eventPath}`, data);
            }
        });
        this.pusherRequest.on('end', (data) => {
            console.debug('request ended:', data);
            this.initDuplexRequest();
            this.register(app);
        });
        this.pusherRequest.on('error', (data) => {
            console.debug('error:', data);
            this.initDuplexRequest();
            this.register(app);
        });
    }
    initDuplexRequest() {
        this.pusherRequest = this.pusherService.GateStream();
        console.log('TCL: PUSHER_HANDLER -> initDuplexRequest -> this.pusherRequest', this.pusherRequest);
    }
    async handle(namespace, method, data, room, socket) {
        return { result: { successed: true } };
    }
}
exports.PUSHER_HANDLER = PUSHER_HANDLER;
