import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private users;
    private messages;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleUserJoin(data: {
        username: string;
        password: string;
    }, client: Socket): Promise<void>;
    handleSendMessage(data: {
        message: string;
        type: string;
    }, client: Socket): void;
    handleVoiceMessage(data: {
        transcription: string;
    }, client: Socket): void;
    handleMessageDelivered(data: {
        messageId: string;
    }, client: Socket): void;
    handleTypingStop(client: Socket): void;
    handleMessageRead(data: {
        messageId: string;
    }, client: Socket): void;
    private updateOnlineUsers;
    private broadcastSystemMessage;
}
