import { EventEmitter } from 'events';
import nconf from 'nconf';
import PubSub from './database/redis/pubsub';

class CustomEventEmitter extends EventEmitter {
    publish(event: string, data: string) {
        this.emit(event, data);
    }
}

let real : CustomEventEmitter;
let noCluster : CustomEventEmitter;
let singleHost : CustomEventEmitter;

interface MessageObject{
    action: string;
    event: string;
    data: string;
}

function get() {
    if (real) {
        return real;
    }

    let pubsub : CustomEventEmitter;

    if (!nconf.get('isCluster')) {
        if (noCluster) {
            real = noCluster;
            return real;
        }
        noCluster = new CustomEventEmitter();
        noCluster.publish = noCluster.emit.bind(noCluster) as CustomEventEmitter['publish'];
        pubsub = noCluster;
    } else if (nconf.get('singleHostCluster')) {
        if (singleHost) {
            real = singleHost;
            return real;
        }
        singleHost = new CustomEventEmitter();
        if (!process.send) {
            singleHost.publish = singleHost.emit.bind(singleHost) as CustomEventEmitter['publish'];
        } else {
            singleHost.publish = function (event : string, data : string) {
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
        pubsub = new PubSub() as CustomEventEmitter;
    } else {
        throw new Error('[[error:redis-required-for-pubsub]]');
    }

    real = pubsub;
    return pubsub;
}

export const publish = function (event: string, data: string) {
    get().publish(event, data);
};

export const on = function (event: string | symbol, callback: (...args: string[]) => void) {
    get().on(event, callback);
};

export const removeAllListeners = function (event: string | symbol) {
    get().removeAllListeners(event);
};

export const reset = function () {
    real = null;
};
