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
var Clock = require("@gamestdio/clock");
var signals_1 = require("@gamestdio/signals");
var state_listener_1 = require("@gamestdio/state-listener");
var fossilDelta = require("fossil-delta");
var msgpack = require("notepack.io");
var Protocol_1 = require("./Protocol");
var Storage_1 = require("./Storage");
exports.RECONNECTION_KEY = 'reconnection';
var Room = /** @class */ (function (_super) {
    __extends(Room, _super);
    function Room(name, options) {
        var _this = _super.call(this, {}) || this;
        _this.clock = new Clock(); // experimental
        _this.remoteClock = new Clock(); // experimental
        // Public signals
        _this.onJoin = new signals_1.Signal();
        _this.onStateChange = new signals_1.Signal();
        _this.onMessage = new signals_1.Signal();
        _this.onError = new signals_1.Signal();
        _this.onLeave = new signals_1.Signal();
        _this.id = null;
        _this.name = name;
        _this.options = options;
        _this.onLeave.add(function () {
            _this.refreshAutoReconnection();
            _this.removeAllListeners();
        });
        return _this;
    }
    Room.prototype.connect = function (connection) {
        var _this = this;
        this.connection = connection;
        this.connection.reconnectEnabled = false;
        this.connection.onmessage = this.onMessageCallback.bind(this);
        this.connection.onclose = function (e) { return _this.onLeave.dispatch(e); };
        this.connection.onerror = function (e) {
            console.warn("Possible causes: room's onAuth() failed or maxClients has been reached.");
            _this.onError.dispatch(e);
        };
    };
    Room.prototype.leave = function () {
        if (this.connection) {
            this.connection.close();
        }
        else {
            this.onLeave.dispatch();
        }
    };
    Room.prototype.send = function (data) {
        this.connection.send([Protocol_1.Protocol.ROOM_DATA, this.id, data]);
    };
    Room.prototype.removeAllListeners = function () {
        _super.prototype.removeAllListeners.call(this);
        this.onJoin.removeAll();
        this.onStateChange.removeAll();
        this.onMessage.removeAll();
        this.onError.removeAll();
        this.onLeave.removeAll();
    };
    Room.prototype.onMessageCallback = function (event) {
        var message = (typeof Buffer != 'undefined') ? msgpack.decode((Buffer.from(event.data))) : msgpack.decode(new Uint8Array(event.data));
        var code = message[0];
        if (code === Protocol_1.Protocol.JOIN_ROOM) {
            this.sessionId = message[1];
            this.refreshAutoReconnection();
            this.onJoin.dispatch();
        }
        else if (code === Protocol_1.Protocol.JOIN_ERROR) {
            console.error("Error: " + message[1]);
            this.onError.dispatch(message[1]);
        }
        else if (code === Protocol_1.Protocol.ROOM_STATE) {
            var state = message[1];
            var remoteCurrentTime = message[2];
            var remoteElapsedTime = message[3];
            this.setState(state, remoteCurrentTime, remoteElapsedTime);
        }
        else if (code === Protocol_1.Protocol.ROOM_STATE_PATCH) {
            this.patch(message[1]);
        }
        else if (code === Protocol_1.Protocol.ROOM_DATA) {
            this.onMessage.dispatch(message[1]);
        }
        else if (code === Protocol_1.Protocol.LEAVE_ROOM) {
            this.leave();
        }
    };
    Room.prototype.refreshAutoReconnection = function () {
        Storage_1.setItem(exports.RECONNECTION_KEY, this.sessionId);
    };
    Room.prototype.setState = function (encodedState, remoteCurrentTime, remoteElapsedTime) {
        var state = msgpack.decode(encodedState);
        this.set(state);
        this._previousState = new Uint8Array(encodedState);
        // set remote clock properties
        if (remoteCurrentTime && remoteElapsedTime) {
            this.remoteClock.currentTime = remoteCurrentTime;
            this.remoteClock.elapsedTime = remoteElapsedTime;
        }
        this.clock.start();
        this.onStateChange.dispatch(state);
    };
    Room.prototype.patch = function (binaryPatch) {
        // apply patch
        this._previousState = Buffer.from(fossilDelta.apply(this._previousState, binaryPatch));
        // trigger state callbacks
        this.set(msgpack.decode(this._previousState));
        this.onStateChange.dispatch(this.state);
    };
    return Room;
}(state_listener_1.StateContainer));
exports.Room = Room;
