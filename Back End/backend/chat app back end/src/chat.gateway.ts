import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { never, NEVER } from 'rxjs';

interface User {
  id: string;
  username: string;
  status: string;
  joinTime: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'text' | 'voice' | 'system';
  status: 'sent' | 'delivered' | 'read';
  readBy: string[];
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('ChatGateway');
  private users = new Map<string, User>();
  private messages: ChatMessage[] = [];

  handleConnection(client: Socket) {
    this.logger.log(`🔗 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
      this.users.delete(client.id);
      this.logger.log(`👤 User disconnected: ${user.username}`);
      this.updateOnlineUsers();
      this.broadcastSystemMessage(`${user.username} left the chat`);
    }
  }

  @SubscribeMessage('user_join')
  async handleUserJoin(
    @MessageBody() data: { username: string; password: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Simple password validation
      if (data.password !== 'mypassword') {
        client.emit('auth_error', { message: 'Invalid password' });
        return;
      }

      if (!data.username || !data.username.trim()) {
        client.emit('auth_error', { message: 'Username is required' });
        return;
      }

      const user: User = {
        id: client.id,
        username: data.username.trim(),
        status: 'online',
        joinTime: Date.now(),
      };

      this.users.set(client.id, user);
      this.logger.log(`✅ User joined: ${user.username}`);

      // Send authentication success
      client.emit('auth_success', { user });
      
      // Send message history
      client.emit('message_history', this.messages);
      
      // Update online users list
      this.updateOnlineUsers();

      // Broadcast join message
      const joinMessage: ChatMessage = {
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
    } catch (error) {
      this.logger.error('Error handling user join:', error);
      client.emit('auth_error', { message: 'Server error' });
    }
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    @MessageBody() data: { message: string; type: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = this.users.get(client.id);
      if (!user) {
        client.emit('auth_error', { message: 'Not authenticated' });
        return;
      }

      if (!data.message || !data.message.trim()) {
        return;
      }

      const message: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        userId: client.id,
        username: user.username,
        message: data.message.trim(),
        timestamp: Date.now(),
        type: (data.type as 'text' | 'voice') || 'text',
        status: 'sent',
        readBy: []
      };

      this.messages.push(message);
      this.server.emit('new_message', message);
      this.logger.log(`📝 Message from ${user.username}: ${data.message}`);
    } catch (error) {
      this.logger.error('Error sending message:', error);
    }
  }

  @SubscribeMessage('voice_message')
  handleVoiceMessage(
    @MessageBody() data: { transcription: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = this.users.get(client.id);
      if (!user) return;

      const message: ChatMessage = {
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
    } catch (error) {
      this.logger.error('Error handling voice message:', error);
    }
  }

  @SubscribeMessage('message_delivered')
  handleMessageDelivered(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = this.messages.find(m => m.id === data.messageId);
    if (message && message.status === 'sent') {
    this.server.emit('message_status_update', { 
        messageId: data.messageId, 
        status: 'delivered' 
        
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(@ConnectedSocket() client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
      client.broadcast.emit('user_typing', { 
        username: user.username, 
        typing: false 
      });
    }
  }
  @SubscribeMessage('message_read')
  handleMessageRead(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
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

  private updateOnlineUsers() {
    const usersList = Array.from(this.users.values());
    this.server.emit('online_users', usersList);
  }

  private broadcastSystemMessage(message: string) {
    const systemMessage: ChatMessage = {
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
}