"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var websocket_1 = require("@gamestdio/websocket");
var msgpack = require("notepack.io");
var Connection = /** @class */ (function (_super) {
    __extends(Connection, _super);
    function Connection(url, query) {
        if (query === void 0) { query = {}; }
        var _this = _super.call(this, url) || this;
        _this._enqueuedCalls = [];
        _this.binaryType = 'arraybuffer';
        return _this;
    }
    Connection.prototype.onOpenCallback = function (event) {
        _super.prototype.onOpenCallback.call(this);
        if (this._enqueuedCalls.length > 0) {
            for (var _i = 0, _a = this._enqueuedCalls; _i < _a.length; _i++) {
                var _b = _a[_i], method = _b[0], args = _b[1];
                this[method].apply(this, args);
            }
        }
    };
    Connection.prototype.send = function (data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            return _super.prototype.send.call(this, msgpack.encode(data));
        }
        else {
            console.warn("colyseus.js: trying to send data while in " + this.ws.readyState + " state");
            // WebSocket not connected.
            // Enqueue data to be sent when readyState == OPEN
            this._enqueuedCalls.push(['send', [data]]);
        }
    };
    return Connection;
}(websocket_1.default));
exports.Connection = Connection;
