import { Signal } from '@gamestdio/signals';
import { Connection } from './Connection';
import { Room, RoomAvailable } from './Room';
export declare class Client {
    id?: string;
    onOpen: Signal;
    onMessage: Signal;
    onClose: Signal;
    onError: Signal;
    protected connection: Connection;
    protected rooms: {
        [id: string]: Room;
    };
    protected connectingRooms: {
        [id: string]: Room;
    };
    protected requestId: number;
    protected hostname: string;
    protected roomsAvailableRequests: {
        [requestId: number]: (value?: RoomAvailable[]) => void;
    };
    protected option: any;
    constructor(url: string, option?: any);
    join<T>(roomName: string, options?: any): Room<T>;
    getAvailableRooms(roomName: string, callback: (rooms: RoomAvailable[], err?: string) => void): void;
    close(): void;
    protected connect(colyseusid: string): void;
    protected createConnection(path?: string, options?: any): Connection;
    /**
     * @override
     */
    protected onMessageCallback(event: any): void;
}
