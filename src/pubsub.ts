import EventEmitter from 'events';
import nconf from 'nconf';

let real: NewEventEmitter;
let noCluster: NewEventEmitter;
let singleHost: NewEventEmitter;

interface NewEventEmitter extends EventEmitter {
    publish(event: string, data: any): void;
}

interface MessageObject{
    action: string;
    event: string;
    data: string;
}

function get() {
    if (real) {
        return real;
    }

    let pubsub: NewEventEmitter;

    if (!nconf.get('isCluster')) {
        if (noCluster) {
            real = noCluster;
            return real;
        }
        noCluster = new EventEmitter() as NewEventEmitter;
        noCluster.publish = noCluster.emit.bind(noCluster) as NewEventEmitter['publish'];
        pubsub = noCluster;
    } else if (nconf.get('singleHostCluster')) {
        if (singleHost) {
            real = singleHost;
            return real;
        }
        singleHost = new EventEmitter() as NewEventEmitter;
        if (!process.send) {
            singleHost.publish = singleHost.emit.bind(singleHost) as NewEventEmitter['publish'];
        } else {
            singleHost.publish = function (event : string | symbol, data: any) {
                process.send({
                    action: 'pubsub',
                    event: event,
                    data: data,
                });
            };
            process.on('message', (message : MessageObject) => {
                if (message && typeof message === 'object' && message.action === 'pubsub') {
                    singleHost.emit(message.event, message.data);
                }
            });
        }
        pubsub = singleHost;
    } else if (nconf.get('redis')) {
        pubsub = require('./database/redis/pubsub') as NewEventEmitter;
    } else {
        throw new Error('[[error:redis-required-for-pubsub]]');
    }

    real = pubsub;
    return pubsub;
}

export const publish = function (event: any, data: any) {
    get().publish(event, data);
};

export const on = function (event: string | any, callback: (...args: any[]) => void) {
    get().on(event, callback);
};

export const removeAllListeners = function (event: string | any) {
    get().removeAllListeners(event);
};

export const reset = function () {
    real = null;
};
