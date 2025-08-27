import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;
  private publisher!: RedisClientType;
  private subscriber!: RedisClientType;

  async onModuleInit() {
    try {
      // Main client for general operations
      this.client = createClient({
        url: 'redis://localhost:6379',
      });

      // Publisher for pub/sub
      this.publisher = createClient({
        url: 'redis://localhost:6379',
      });

      // Subscriber for pub/sub
      this.subscriber = createClient({
        url: 'redis://localhost:6379',
      });

      await this.client.connect();
      await this.publisher.connect();
      await this.subscriber.connect();

      console.log('✅ Connected to Redis successfully');
    } catch (error) {
      console.log('⚠️  Redis not available, using in-memory storage');
      // Fallback to in-memory storage if Redis is not available
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) await this.client.disconnect();
    if (this.publisher?.isOpen) await this.publisher.disconnect();
    if (this.subscriber?.isOpen) await this.subscriber.disconnect();
  }

  // In-memory fallbacks for when Redis is not available
  private memoryStorage = new Map<string, any>();
  private messageHistory = new Map<string, any[]>();
  private onlineUsersMemory = new Map<string, any>();

  // Store user session
  async setUserSession(userId: string, sessionData: any): Promise<void> {
    try {
      if (this.client?.isOpen) {
        await this.client.setEx(`user:${userId}`, 3600, JSON.stringify(sessionData));
      } else {
        this.memoryStorage.set(`user:${userId}`, sessionData);
      }
    } catch (error) {
      this.memoryStorage.set(`user:${userId}`, sessionData);
    }
  }

  // Get user session
  async getUserSession(userId: string): Promise<any> {
    try {
      if (this.client?.isOpen) {
        const data = await this.client.get(`user:${userId}`);
        return data ? JSON.parse(data) : null;
      } else {
        return this.memoryStorage.get(`user:${userId}`) || null;
      }
    } catch (error) {
      return this.memoryStorage.get(`user:${userId}`) || null;
    }
  }

  // Store message in chat history
  async saveMessage(roomId: string, message: any): Promise<void> {
    try {
      if (this.client?.isOpen) {
        await this.client.rPush(`room:${roomId}:messages`, JSON.stringify(message));
        await this.client.lTrim(`room:${roomId}:messages`, -100, -1);
      } else {
        const messages = this.messageHistory.get(roomId) || [];
        messages.push(message);
        if (messages.length > 100) messages.shift();
        this.messageHistory.set(roomId, messages);
      }
    } catch (error) {
      const messages = this.messageHistory.get(roomId) || [];
      messages.push(message);
      if (messages.length > 100) messages.shift();
      this.messageHistory.set(roomId, messages);
    }
  }

  // Get chat history
  async getMessages(roomId: string, limit: number = 50): Promise<any[]> {
    try {
      if (this.client?.isOpen) {
        const messages = await this.client.lRange(`room:${roomId}:messages`, -limit, -1);
        return messages.map(msg => JSON.parse(msg));
      } else {
        const messages = this.messageHistory.get(roomId) || [];
        return messages.slice(-limit);
      }
    } catch (error) {
      const messages = this.messageHistory.get(roomId) || [];
      return messages.slice(-limit);
    }
  }

  // Add user to online list
  async addOnlineUser(userId: string, userData: any): Promise<void> {
    try {
      if (this.client?.isOpen) {
        await this.client.hSet('online_users', userId, JSON.stringify(userData));
      } else {
        this.onlineUsersMemory.set(userId, userData);
      }
    } catch (error) {
      this.onlineUsersMemory.set(userId, userData);
    }
  }

  // Remove user from online list
  async removeOnlineUser(userId: string): Promise<void> {
    try {
      if (this.client?.isOpen) {
        await this.client.hDel('online_users', userId);
      } else {
        this.onlineUsersMemory.delete(userId);
      }
    } catch (error) {
      this.onlineUsersMemory.delete(userId);
    }
  }

  // Get all online users
  async getOnlineUsers(): Promise<any[]> {
    try {
      if (this.client?.isOpen) {
        const users = await this.client.hGetAll('online_users');
        return Object.entries(users).map(([userId, data]) => ({
          userId,
          ...JSON.parse(data)
        }));
      } else {
        return Array.from(this.onlineUsersMemory.entries()).map(([userId, data]) => ({
          userId,
          ...data
        }));
      }
    } catch (error) {
      return Array.from(this.onlineUsersMemory.entries()).map(([userId, data]) => ({
        userId,
        ...data
      }));
    }
  }
}
