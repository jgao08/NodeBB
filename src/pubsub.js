"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
        Promise.resolve().then(() => __importStar(require('./database/redis/pubsub'))).then((pubsubModule) => {
            pubsub = pubsubModule.default;
        }).catch((err) => {
            console.error('Error importing pubsub module:', err);
        });
        // pubsub = require('./database/redis/pubsub') as NewEventEmitter;
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
