import { Application } from './app';

export declare namespace mikudos {
    interface ConfigFunc {
        (app: Application): void;
    }

    interface Socket extends SocketIO.Socket {
        mikudos: {
            app: Application;
            provider: string;
            headers: any;
            remoteAddress: any;
            user: any;
        };
    }

    interface DuplexService {
        service: { [key: string]: Function };
        before: { [key: string]: DuplexHandle[] };
    }

    interface DuplexHandle {
        (eventName: string, data: any, socket: mikudos.Socket): Promise<
            void
        > | void;
    }
}
