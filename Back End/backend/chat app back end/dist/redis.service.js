"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const redis_1 = require("redis");
let RedisService = class RedisService {
    constructor() {
        this.memoryStorage = new Map();
        this.messageHistory = new Map();
        this.onlineUsersMemory = new Map();
    }
    async onModuleInit() {
        try {
            this.client = (0, redis_1.createClient)({
                url: 'redis://localhost:6379',
            });
            this.publisher = (0, redis_1.createClient)({
                url: 'redis://localhost:6379',
            });
            this.subscriber = (0, redis_1.createClient)({
                url: 'redis://localhost:6379',
            });
            await this.client.connect();
            await this.publisher.connect();
            await this.subscriber.connect();
            console.log('✅ Connected to Redis successfully');
        }
        catch (error) {
            console.log('⚠️  Redis not available, using in-memory storage');
        }
    }
    async onModuleDestroy() {
        var _a, _b, _c;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen)
            await this.client.disconnect();
        if ((_b = this.publisher) === null || _b === void 0 ? void 0 : _b.isOpen)
            await this.publisher.disconnect();
        if ((_c = this.subscriber) === null || _c === void 0 ? void 0 : _c.isOpen)
            await this.subscriber.disconnect();
    }
    async setUserSession(userId, sessionData) {
        var _a;
        try {
            if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) {
                await this.client.setEx(`user:${userId}`, 3600, JSON.stringify(sessionData));
            }
            else {
                this.memoryStorage.set(`user:${userId}`, sessionData);
            }
        }
        catch (error) {
            this.memoryStorage.set(`user:${userId}`, sessionData);
        }
    }
    async getUserSession(userId) {
        var _a;
        try {
            if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) {
                const data = await this.client.get(`user:${userId}`);
                return data ? JSON.parse(data) : null;
            }
            else {
                return this.memoryStorage.get(`user:${userId}`) || null;
            }
        }
        catch (error) {
            return this.memoryStorage.get(`user:${userId}`) || null;
        }
    }
    async saveMessage(roomId, message) {
        var _a;
        try {
            if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) {
                await this.client.rPush(`room:${roomId}:messages`, JSON.stringify(message));
                await this.client.lTrim(`room:${roomId}:messages`, -100, -1);
            }
            else {
                const messages = this.messageHistory.get(roomId) || [];
                messages.push(message);
                if (messages.length > 100)
                    messages.shift();
                this.messageHistory.set(roomId, messages);
            }
        }
        catch (error) {
            const messages = this.messageHistory.get(roomId) || [];
            messages.push(message);
            if (messages.length > 100)
                messages.shift();
            this.messageHistory.set(roomId, messages);
        }
    }
    async getMessages(roomId, limit = 50) {
        var _a;
        try {
            if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) {
                const messages = await this.client.lRange(`room:${roomId}:messages`, -limit, -1);
                return messages.map(msg => JSON.parse(msg));
            }
            else {
                const messages = this.messageHistory.get(roomId) || [];
                return messages.slice(-limit);
            }
        }
        catch (error) {
            const messages = this.messageHistory.get(roomId) || [];
            return messages.slice(-limit);
        }
    }
    async addOnlineUser(userId, userData) {
        var _a;
        try {
            if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) {
                await this.client.hSet('online_users', userId, JSON.stringify(userData));
            }
            else {
                this.onlineUsersMemory.set(userId, userData);
            }
        }
        catch (error) {
            this.onlineUsersMemory.set(userId, userData);
        }
    }
    async removeOnlineUser(userId) {
        var _a;
        try {
            if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) {
                await this.client.hDel('online_users', userId);
            }
            else {
                this.onlineUsersMemory.delete(userId);
            }
        }
        catch (error) {
            this.onlineUsersMemory.delete(userId);
        }
    }
    async getOnlineUsers() {
        var _a;
        try {
            if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) {
                const users = await this.client.hGetAll('online_users');
                return Object.entries(users).map(([userId, data]) => (Object.assign({ userId }, JSON.parse(data))));
            }
            else {
                return Array.from(this.onlineUsersMemory.entries()).map(([userId, data]) => (Object.assign({ userId }, data)));
            }
        }
        catch (error) {
            return Array.from(this.onlineUsersMemory.entries()).map(([userId, data]) => (Object.assign({ userId }, data)));
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map