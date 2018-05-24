"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var storage = (typeof (cc) !== 'undefined' && cc.sys && cc.sys.localStorage)
    ? cc.sys.localStorage // compatibility with cocos creator
    : window.localStorage; // regular browser environment
function setItem(key, value) {
    storage.setItem(key, value);
}
exports.setItem = setItem;
function getItem(key, callback) {
    var value = storage.getItem('colyseusid');
    if (typeof (Promise) === 'undefined' || // old browsers
        !(value instanceof Promise)) {
        // browser has synchronous return
        callback(value);
    }
    else {
        // react-native is asynchronous
        value.then(function (id) { return callback(id); });
    }
}
exports.getItem = getItem;
