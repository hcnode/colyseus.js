import { Signal } from '@gamestdio/signals';
import * as msgpack from 'notepack.io';

import { Connection } from './Connection';
import { Protocol } from './Protocol';
import { RECONNECTION_KEY, Room, RoomAvailable } from './Room';
import { getItem, setItem } from './Storage';
export class Client {
    public id?: string;

    // signals
    public onOpen: Signal = new Signal();
    public onMessage: Signal = new Signal();
    public onClose: Signal = new Signal();
    public onError: Signal = new Signal();

    protected connection: Connection;

    protected rooms: {[id: string]: Room} = {};
    protected connectingRooms: {[id: string]: Room} = {};
    protected requestId = 0;

    protected hostname: string;
    protected roomsAvailableRequests: {[requestId: number]: (value?: RoomAvailable[]) => void} = {};

    constructor(url: string) {
        this.hostname = url;
        getItem('colyseusid', (colyseusid) => this.connect(colyseusid));
    }

    public join<T>(roomName: string, options: any = {}): Room<T> {
        options.requestId = ++this.requestId;

        const room = new Room<T>(roomName, options);

        // remove references on leaving
        room.onLeave.addOnce(() => {
            delete this.rooms[room.id];
            delete this.connectingRooms[options.requestId];
        });

        this.connectingRooms[ options.requestId ] = room;

        getItem(RECONNECTION_KEY, (reconnectingSessionId) => {
            if (reconnectingSessionId) {
                options.sessionId = reconnectingSessionId;
            }

            this.connection.send([Protocol.JOIN_ROOM, roomName, options]);
        });

        return room;
    }

    public getAvailableRooms(roomName: string, callback: (rooms: RoomAvailable[], err?: string) => void) {
        // reject this promise after 10 seconds.
        const requestId = ++this.requestId;
        const removeRequest = () => delete this.roomsAvailableRequests[requestId];
        const rejectionTimeout = setTimeout(() => {
            removeRequest();
            callback([], 'timeout');
        }, 10000);

        // send the request to the server.
        this.connection.send([Protocol.ROOM_LIST, requestId, roomName]);

        this.roomsAvailableRequests[requestId] = (roomsAvailable) => {
            removeRequest();
            clearTimeout(rejectionTimeout);
            callback(roomsAvailable);
        };
    }

    public close() {
        this.connection.close();
    }

    protected connect(colyseusid: string) {
        this.id = colyseusid || '';

        this.connection = this.createConnection();
        this.connection.onmessage = this.onMessageCallback.bind(this);
        this.connection.onclose = (e) => this.onClose.dispatch(e);
        this.connection.onerror = (e) => this.onError.dispatch(e);

        // check for id on cookie
        this.connection.onopen = () => {
            if (this.id) {
                this.onOpen.dispatch();
            }
        };
    }

    protected createConnection(path: string = '', options: any = {}) {
        // append colyseusid to connection string.
        const params = [`colyseusid=${this.id}`];

        for (const name in options) {
            if (!options.hasOwnProperty(name)) {
                continue;
            }
            params.push(`${name}=${options[name]}`);
        }

        return new Connection(`${this.hostname}/socket.io/${path}?${params.join('&')}`);
    }

    /**
     * @override
     */
    protected onMessageCallback(event) {
        var message = (typeof Buffer != 'undefined') ? msgpack.decode((Buffer.from(event.data))) : msgpack.decode(new Uint8Array(event.data));
        const code = message[0];

        if (code === Protocol.USER_ID) {

            this.id = message[1];
            setItem('colyseusid', this.id);
            this.onOpen.dispatch();

        } else if (code === Protocol.JOIN_ROOM) {
            const requestId = message[2];
            const room = this.connectingRooms[ requestId ];

            if (!room) {
                console.warn('colyseus.js: client left room before receiving session id.');
                return;
            }

            room.id = message[1];
            this.rooms[room.id] = room;

            room.connect(this.createConnection(room.id, room.options));
            delete this.connectingRooms[ requestId ];

        } else if (code === Protocol.JOIN_ERROR) {
            console.error('colyseus.js: server error:', message[2]);

            // general error
            this.onError.dispatch(message[2]);

        } else if (code === Protocol.ROOM_LIST) {
            if (this.roomsAvailableRequests[message[1]]) {
                this.roomsAvailableRequests[message[1]](message[2]);

            } else {
                console.warn('receiving ROOM_LIST after timeout:', message[2]);
            }

        } else {
            this.onMessage.dispatch(message);
        }

    }

}
