import rp from 'request-promise-native';
import _ from 'lodash';
import { Application } from './app';

export class AuthenticationRequest {
    strategy?: string;
    [key: string]: any;
}

export class Authentication {
    requsetOption: any = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        json: true
    };
    eventPath: string;
    tokenPath: string;
    authJoinCallback: (socket: SocketIO.Socket) => void;
    constructor(
        {
            protocol = 'http',
            host = '127.0.0.1',
            port = '80',
            path = '/authentication',
            method,
            headers = {}
        }: any = {},
        {
            tokenPath = 'accessToken',
            eventPath = 'authentication',
            authJoinCallback = async (socket: SocketIO.Socket) => {}
        } = {}
    ) {
        this.eventPath = eventPath;
        this.tokenPath = tokenPath;
        this.requsetOption.uri = `${protocol}://${host}:${port}${path}`;
        this.requsetOption.method = method || this.requsetOption.method;
        _.assign(this.requsetOption.headers, headers);
        this.authJoinCallback = authJoinCallback;
    }

    async authenticate(body: AuthenticationRequest) {
        let option = { body, ...this.requsetOption };
        return await rp({ body, ...this.requsetOption });
    }
}

export default function(app: Application) {
    app.authentication = new Authentication({
        port: 3030
    });
}
