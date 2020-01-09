import _ from 'lodash';
import { HandlerBase } from '../handler-base';
import { Application } from '../../app';

export class PUSHER_HANDLER extends HandlerBase {
    constructor(
        public app: Application,
        { eventPath = 'message' } = {},
        public hooks: { [key: string]: Function[] } = {}
    ) {
        super(eventPath);
    }
}
