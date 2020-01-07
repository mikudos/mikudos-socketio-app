import _ from 'lodash';
import { HandlerBase } from './handler-base';
import { Application } from '../app';

export class MESSAGE_PUSHER extends HandlerBase {
    constructor(
        public app: Application,
        { eventPath = 'message', roomPath = 'room' } = {},
        public hooks: { [key: string]: Function[] } = {}
    ) {
        super(eventPath);
    }
}
