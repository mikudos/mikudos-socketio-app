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
    userIdPath: string;
    authJoinCallback: (socket: mikudos.Socket, app?: Application) => void;
    constructor(
        public app: Application,
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
            userIdPath = 'user.id',
            authJoinCallback = async (
                socket: mikudos.Socket,
                app?: Application
            ) => {}
        } = {}
    ) {
        this.eventPath = eventPath;
        this.tokenPath = tokenPath;
        this.userIdPath = userIdPath;
        this.requsetOption.uri = `${protocol}://${host}:${port}${path}`;
        this.requsetOption.method = method || this.requsetOption.method;
        _.assign(this.requsetOption.headers, headers);
        this.authJoinCallback = authJoinCallback;
    }

    register(socket: mikudos.Socket, authCallback: Function) {
        socket.on(
            this.eventPath,
            async (data: AuthenticationRequest, callback: Function) => {
                try {
                    const authResult = await this.authenticate(data);
                    let channel = _.get(authResult, this.userIdPath);
                    await this.joinSelfId(socket, channel);
                    let token = _.get(authResult, this.tokenPath);
                    if (!token)
                        throw new Error(
                            `Can not find Token at path: ${this.tokenPath}`
                        );
                    socket.handshake.headers.authentication = token;
                    socket.mikudos.user = authResult.user;
                    authCallback(authResult); // !bind other handlers on the authenticated socket
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
                        this.app.get('authentication.entityId') || 'id'
                    ];
                if (userId) {
                    socket.join(userId);
                }
                socket.join('authenticated', () => {
                    this.authJoinCallback &&
                        this.authJoinCallback(socket, this.app);
                });
            }
        );
    }

    async joinSelfId(socket: mikudos.Socket, id: string) {
        if (this.app.enabled('redisAdaptered')) {
            await socket.mikudos.app.remoteJoin(socket.id, id);
        }
        socket.join(id);
    }

    async authenticate(body: AuthenticationRequest) {
        let option = { body, ...this.requsetOption };
        return await rp({ body, ...this.requsetOption });
    }
}
