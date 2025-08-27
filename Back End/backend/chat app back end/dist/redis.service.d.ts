import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private client;
    private publisher;
    private subscriber;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private memoryStorage;
    private messageHistory;
    private onlineUsersMemory;
    setUserSession(userId: string, sessionData: any): Promise<void>;
    getUserSession(userId: string): Promise<any>;
    saveMessage(roomId: string, message: any): Promise<void>;
    getMessages(roomId: string, limit?: number): Promise<any[]>;
    addOnlineUser(userId: string, userData: any): Promise<void>;
    removeOnlineUser(userId: string): Promise<void>;
    getOnlineUsers(): Promise<any[]>;
}
