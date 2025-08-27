"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let ChatGateway = class ChatGateway {
    constructor() {
        this.logger = new common_1.Logger('ChatGateway');
        this.users = new Map();
        this.messages = [];
    }
    handleConnection(client) {
        this.logger.log(`🔗 Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        const user = this.users.get(client.id);
        if (user) {
            this.users.delete(client.id);
            this.logger.log(`👤 User disconnected: ${user.username}`);
            this.updateOnlineUsers();
            this.broadcastSystemMessage(`${user.username} left the chat`);
        }
    }
    async handleUserJoin(data, client) {
        try {
            if (data.password !== 'mypassword') {
                client.emit('auth_error', { message: 'Invalid password' });
                return;
            }
            if (!data.username || !data.username.trim()) {
                client.emit('auth_error', { message: 'Username is required' });
                return;
            }
            const user = {
                id: client.id,
                username: data.username.trim(),
                status: 'online',
                joinTime: Date.now(),
            };
            this.users.set(client.id, user);
            this.logger.log(`✅ User joined: ${user.username}`);
            client.emit('auth_success', { user });
            client.emit('message_history', this.messages);
            this.updateOnlineUsers();
            const joinMessage = {
                id: `${Date.now()}-${Math.random()}`,
                userId: 'system',
                username: 'System',
                message: `${user.username} joined the chat`,
                timestamp: Date.now(),
                type: 'system',
                status: 'sent',
                readBy: []
            };
            this.messages.push(joinMessage);
            this.server.emit('new_message', joinMessage);
        }
        catch (error) {
            this.logger.error('Error handling user join:', error);
            client.emit('auth_error', { message: 'Server error' });
        }
    }
    handleSendMessage(data, client) {
        try {
            const user = this.users.get(client.id);
            if (!user) {
                client.emit('auth_error', { message: 'Not authenticated' });
                return;
            }
            if (!data.message || !data.message.trim()) {
                return;
            }
            const message = {
                id: `${Date.now()}-${Math.random()}`,
                userId: client.id,
                username: user.username,
                message: data.message.trim(),
                timestamp: Date.now(),
                type: data.type || 'text',
                status: 'sent',
                readBy: []
            };
            this.messages.push(message);
            this.server.emit('new_message', message);
            this.logger.log(`📝 Message from ${user.username}: ${data.message}`);
        }
        catch (error) {
            this.logger.error('Error sending message:', error);
        }
    }
    handleVoiceMessage(data, client) {
        try {
            const user = this.users.get(client.id);
            if (!user)
                return;
            const message = {
                id: `${Date.now()}-${Math.random()}`,
                userId: client.id,
                username: user.username,
                message: data.transcription,
                timestamp: Date.now(),
                type: 'voice',
                status: 'sent',
                readBy: []
            };
            this.messages.push(message);
            this.server.emit('new_message', message);
            this.logger.log(`🎤 Voice message from ${user.username}: ${data.transcription}`);
        }
        catch (error) {
            this.logger.error('Error handling voice message:', error);
        }
    }
    handleMessageDelivered(data, client) {
        const message = this.messages.find(m => m.id === data.messageId);
        if (message && message.status === 'sent') {
            this.server.emit('message_status_update', {
                messageId: data.messageId,
                status: 'delivered'
            });
        }
    }
    handleTypingStop(client) {
        const user = this.users.get(client.id);
        if (user) {
            client.broadcast.emit('user_typing', {
                username: user.username,
                typing: false
            });
        }
    }
    handleMessageRead(data, client) {
        const user = this.users.get(client.id);
        const message = this.messages.find(m => m.id === data.messageId);
        if (message && user && !message.readBy.includes(user.id)) {
            message.readBy.push(user.id);
            message.status = 'read';
            this.server.emit('message_status_update', {
                messageId: data.messageId,
                status: 'read'
            });
        }
    }
    updateOnlineUsers() {
        const usersList = Array.from(this.users.values());
        this.server.emit('online_users', usersList);
    }
    broadcastSystemMessage(message) {
        const systemMessage = {
            id: `${Date.now()}-${Math.random()}`,
            userId: 'system',
            username: 'System',
            message,
            timestamp: Date.now(),
            type: 'system',
            status: 'sent',
            readBy: []
        };
        this.messages.push(systemMessage);
        this.server.emit('new_message', systemMessage);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('user_join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleUserJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleVoiceMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message_delivered'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleMessageDelivered", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing_stop'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTypingStop", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message_read'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleMessageRead", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: 'http://localhost:3000',
            credentials: true,
        },
    })
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map