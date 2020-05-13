"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const handler_base_1 = require("../handler-base");
const interfaces_1 = require("./interfaces");
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('mikudos:pusher');
class PUSHER_HANDLER extends handler_base_1.HandlerBase {
    constructor(app, { eventPath = 'pusher', userIdPath = 'id', syncMode = 'group', groupId = 'test-group' } = {}, pusherService) {
        super(eventPath);
        this.app = app;
        this.pusherService = pusherService;
        this.userIdPath = userIdPath;
        this.syncMode = syncMode;
        this.groupId = groupId;
        this.initDuplexRequest();
    }
    register(socket) {
        var _a, _b;
        debug(`register json-rpc service with auth`);
        if (!((_b = (_a = socket.mikudos) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b[this.userIdPath]))
            console.error('socket without authenticated user can not register pusher event');
        let channelId = String(socket.mikudos.user[this.userIdPath]);
        socket.on(`${this.eventPath}`, (data) => {
            // check data type
            if (data.messageType !== interfaces_1.MessageType.RECEIVED)
                return;
            data.messageType = interfaces_1.MessageType.RECEIVED;
            data.channelId = channelId;
            this.pusherRequest.write(data);
        });
        this.pusherRequest.write({
            channelId: channelId,
            messageType: interfaces_1.MessageType.REQUEST
        });
    }
    initDuplexRequest() {
        debug('init new pusher stream Request');
        this.pusherRequest = this.pusherService.GateStream(this.syncMode === 'group'
            ? {
                group: this.groupId
            }
            : {});
        this.pusherRequest.removeAllListeners();
        this.pusherRequest.on('data', async (data) => {
            debug('new pusher message', data);
            if (!data.channelId)
                return;
            if (await this.app.isIORoomEmpty(data.channelId)) {
                // 对应组内没有用户
                data.messageType = interfaces_1.MessageType.UNRECEIVED;
                this.pusherRequest.write(data);
            }
            else {
                // 将消息发送给组内用户
                this.app.io.to(data.channelId).emit(`${this.eventPath}`, data);
            }
        });
        this.pusherRequest.on('end', (data) => {
            debug('pusher request ended:', data);
            this.initDuplexRequest();
        });
        this.pusherRequest.on('error', (data) => {
            debug('pusher request error:', data);
            this.initDuplexRequest();
        });
    }
}
exports.PUSHER_HANDLER = PUSHER_HANDLER;
//# sourceMappingURL=pusher.js.map