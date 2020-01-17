export enum MessageType {
    REQUEST = 0,
    RESPONSE = 1,
    RECEIVED = 2,
    UNRECEIVED = 3
}

export interface Message {
    msg: string;
    channelId: string;
    msgId: number;
    expire: number;
    messageType: MessageType;
}
