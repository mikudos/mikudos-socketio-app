import rp from 'request-promise-native';
import _ from 'lodash';
import { Application } from './app';
import { mikudos } from './namespace';

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
    authJoinCallback: (socket: mikudos.Socket, app?: Application) => void;
    constructor(
        { protocol, host, port, path, method, headers }: any = {
            protocol: 'http',
            host: '127.0.0.1',
            port: 80,
            path: '/authentication',
            method: 'POST',
            headers: {}
        },
        {
            tokenPath = 'accessToken',
            eventPath = 'authentication',
            authJoinCallback = async (
                socket: mikudos.Socket,
                app?: Application
            ) => {}
        } = {}
    ) {
        this.eventPath = eventPath;
        this.tokenPath = tokenPath;
        this.requsetOption.uri = `${protocol}://${host}:${port}${path}`;
        this.requsetOption.method = method || this.requsetOption.method;
        _.assign(this.requsetOption.headers, headers);
        this.authJoinCallback = authJoinCallback;
    }

    register(app: Application, socket: mikudos.Socket) {
        socket.on(
            this.eventPath,
            async (data: AuthenticationRequest, callback: Function) => {
                try {
                    const authResult = await this.authenticate(data);
                    let token = _.get(authResult, this.tokenPath);
                    if (!token)
                        throw new Error(
                            `Can not find Token at path: ${this.tokenPath}`
                        );
                    socket.handshake.headers.authentication = token;
                    socket.mikudos.user = authResult.user;
                    callback(authResult);
                } catch (error) {
                    callback({
                        code: 501,
                        message: 'Authentication Request Error!',
                        error: {
                            info: error.message
                        }
                    });
                }
                let userId =
                    socket.mikudos.user[
                        app.get('authentication.entityId') || 'id'
                    ];
                if (userId) {
                    socket.join(userId);
                }
                socket.join('authenticated', () => {
                    this.authJoinCallback && this.authJoinCallback(socket, app);
                });
            }
        );
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
