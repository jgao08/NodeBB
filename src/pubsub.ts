import { EventEmitter } from 'events';
import nconf from 'nconf';
import PubSub from './database/redis/pubsub';

let real : NewEventEmitter;
let noCluster : NewEventEmitter;
let singleHost : NewEventEmitter;

interface NewEventEmitter extends EventEmitter {
    publish(event: string, data: string): void;
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

    let pubsub : NewEventEmitter;

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
        pubsub = PubSub as NewEventEmitter;
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
