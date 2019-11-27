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
        uri: 'http://127.0.0.1:3030/authentication',
        headers: {
            'Content-Type': 'application/json'
        },
        json: true
    };
    constructor(
        {
            protocol = 'http',
            host = '127.0.0.1',
            port = '80',
            path = '/authentication',
            method,
            headers = {}
        }: any = {},
        public tokenPath: string = 'accessToken'
    ) {
        this.requsetOption.uri = `${protocol}://${host}:${port}${path}`;
        this.requsetOption.method = method || this.requsetOption.method;
        _.assign(this.requsetOption.headers, headers);
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
