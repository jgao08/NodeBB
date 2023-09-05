'use strict';

import EventEmitter from 'events';
import { get as _get } from 'nconf';

let real;
let noCluster;
let singleHost;

function get() {
    if (real) {
        return real;
    }

    let pubsub;

    if (!_get('isCluster')) {
        if (noCluster) {
            real = noCluster;
            return real;
        }
        noCluster = new EventEmitter();
        noCluster.publish = noCluster.emit.bind(noCluster);
        pubsub = noCluster;
    } else if (_get('singleHostCluster')) {
        if (singleHost) {
            real = singleHost;
            return real;
        }
        singleHost = new EventEmitter();
        if (!process.send) {
            singleHost.publish = singleHost.emit.bind(singleHost);
        } else {
            singleHost.publish = function (event, data) {
                process.send({
                    action: 'pubsub',
                    event: event,
                    data: data,
                });
            };
            process.on('message', (message) => {
                if (message && typeof message === 'object' && message.action === 'pubsub') {
                    singleHost.emit(message.event, message.data);
                }
            });
        }
        pubsub = singleHost;
    } else if (_get('redis')) {
        pubsub = require('./database/redis/pubsub');
    } else {
        throw new Error('[[error:redis-required-for-pubsub]]');
    }

    real = pubsub;
    return pubsub;
}

export function publish(event, data) {
    get().publish(event, data);
}
export function on(event, callback) {
    get().on(event, callback);
}
export function removeAllListeners(event) {
    get().removeAllListeners(event);
}
export function reset() {
    real = null;
}
