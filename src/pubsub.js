"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset = exports.removeAllListeners = exports.on = exports.publish = void 0;
const events_1 = __importDefault(require("events"));
const nconf_1 = __importDefault(require("nconf"));
let real;
let noCluster;
let singleHost;
function get() {
    if (real) {
        return real;
    }
    let pubsub;
    if (!nconf_1.default.get('isCluster')) {
        if (noCluster) {
            real = noCluster;
            return real;
        }
        noCluster = new events_1.default();
        noCluster.publish = noCluster.emit.bind(noCluster);
        pubsub = noCluster;
    }
    else if (nconf_1.default.get('singleHostCluster')) {
        if (singleHost) {
            real = singleHost;
            return real;
        }
        singleHost = new events_1.default();
        if (!process.send) {
            singleHost.publish = singleHost.emit.bind(singleHost);
        }
        else {
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
    }
    else if (nconf_1.default.get('redis')) {
        pubsub = require('./database/redis/pubsub');
    }
    else {
        throw new Error('[[error:redis-required-for-pubsub]]');
    }
    real = pubsub;
    return pubsub;
}
const publish = function (event, data) {
    get().publish(event, data);
};
exports.publish = publish;
const on = function (event, callback) {
    get().on(event, callback);
};
exports.on = on;
const removeAllListeners = function (event) {
    get().removeAllListeners(event);
};
exports.removeAllListeners = removeAllListeners;
const reset = function () {
    real = null;
};
exports.reset = reset;
