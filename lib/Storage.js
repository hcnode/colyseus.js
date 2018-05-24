"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var storage = (typeof (cc) !== 'undefined' && cc.sys && cc.sys.localStorage)
    ? cc.sys.localStorage // compatibility with cocos creator
    : (typeof (window) != 'undefined') ? window.localStorage : null; // regular browser environment
function setItem(key, value) {
    storage && storage.setItem(key, value);
}
exports.setItem = setItem;
function getItem(key, callback) {
    var value = storage && storage.getItem('colyseusid');
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
