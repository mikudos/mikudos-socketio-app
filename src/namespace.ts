import { Application } from './app';
import { DUPLEX_HANDLER } from './common';

export declare namespace mikudos {
    interface duplexHooks {
        [key: string]: ((
            eventName: string,
            data: any,
            socket: mikudos.Socket
        ) => Promise<any>)[];
    }
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
        serviceKey: string;
        serviceClass: any;
        service: { [key: string]: Function };
        before: { [key: string]: DuplexHandle[] };
    }

    interface DuplexServiceConstructor extends DuplexService {
        new (handler: DUPLEX_HANDLER, app: Application): DuplexService;
    }

    interface DuplexHandle {
        (eventName: string, data: any, socket: mikudos.Socket): Promise<
            void
        > | void;
    }
}
