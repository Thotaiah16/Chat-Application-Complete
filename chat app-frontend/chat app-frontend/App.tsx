import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  AppBar,
  Toolbar,
  Chip,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Send as SendIcon,
  Mic as MicIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import io, { Socket } from 'socket.io-client';

// DoubleTick theme colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#25D366', // WhatsApp green
    },
    secondary: {
      main: '#075E54', // WhatsApp dark green
    },
    background: {
      default: '#f0f0f0',
      paper: '#ffffff',
    },
  },
});

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

interface User {
  id: string;
  username: string;
  status: string;
  joinTime: number;
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginOpen, setLoginOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      setAuthenticated(false);
    });

    newSocket.on('auth_success', (data: { user: User }) => {
      setAuthenticated(true);
      setLoginOpen(false);
      console.log('Authenticated successfully');
    });

    newSocket.on('auth_error', (data: { message: string }) => {
      alert(data.message);
    });

    newSocket.on('new_message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      
      // Auto-send delivery confirmation
      newSocket.emit('message_delivered', { messageId: message.id });
      
      // Auto-mark as read after 2 seconds (simulate reading)
      setTimeout(() => {
        newSocket.emit('message_read', { messageId: message.id });
      }, 2000);
    });

    newSocket.on('message_history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    newSocket.on('online_users', (users: User[]) => {
      setOnlineUsers(users);
    });

    // Listen for blue tick updates
    newSocket.on('message_status_update', (data: { messageId: string; status: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: data.status as 'sent' | 'delivered' | 'read' }
          : msg
      ));
    });

    newSocket.on('user_typing', (data: { username: string; typing: boolean }) => {
      if (data.typing) {
        setTypingUsers(prev => 
          prev.includes(data.username) ? prev : [...prev, data.username]
        );
      } else {
        setTypingUsers(prev => prev.filter(user => user !== data.username));
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogin = () => {
    if (socket && username.trim() && password.trim()) {
      socket.emit('user_join', { username: username.trim(), password });
    }
  };

  const handleSendMessage = () => {
    if (socket && currentMessage.trim()) {
      socket.emit('send_message', { 
        message: currentMessage.trim(),
        type: 'text' 
      });
      setCurrentMessage('');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('typing_stop');
    }
  };

  const handleTyping = () => {
    if (!socket) return;

    socket.emit('typing_start');
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop');
    }, 2000);
  };

  const handleVoiceMessage = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    setIsRecording(true);
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (socket) {
        socket.emit('voice_message', { transcription: transcript });
      }
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      alert('Voice recognition error');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageContent = (message: ChatMessage) => {
    if (message.type === 'voice') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MicIcon fontSize="small" color="primary" />
          <span>{message.message}</span>
        </Box>
      );
    }
    return message.message;
  };

  // Blue tick status icons
  const getStatusIcon = (message: ChatMessage) => {
    // Only show on own messages
    if (socket && message.userId === socket.id) {
      switch (message.status) {
        case 'sent':
          return <DoneIcon sx={{ fontSize: 12, color: 'gray', ml: 0.5 }} />;
        case 'delivered':
          return <DoneAllIcon sx={{ fontSize: 12, color: 'gray', ml: 0.5 }} />;
        case 'read':
          return <DoneAllIcon sx={{ fontSize: 12, color: '#34B7F1', ml: 0.5 }} />;
        default:
          return null;
      }
    }
    return null;
  };

  // Login Dialog
  if (!authenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Dialog open={loginOpen} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Typography variant="h5" component="h2" color="primary" fontWeight="bold">
              Join  Chat App
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                margin="normal"
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && document.getElementById('password-field')?.focus()}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                margin="normal"
                id="password-field"
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleLogin()}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleLogin} 
              variant="contained" 
              fullWidth
              size="large"
              disabled={!connected || !username.trim() || !password.trim()}
            >
              {connected ? 'Join Chat' : 'Connecting...'}
            </Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
    );
  }

  // Main Chat Interface
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Chat App - {username}
            </Typography>
            <Chip 
              icon={<PersonIcon />} 
              label={`${onlineUsers.length} online`}
              color="secondary"
              sx={{ color: 'white' }}
            />
          </Toolbar>
        </AppBar>

        {/* Main Content using Flexbox Layout */}
        <Box sx={{ 
          display: 'flex', 
          flexGrow: 1, 
          height: 'calc(100vh - 64px)',
          gap: 2,
          p: 2
        }}>
          {/* Chat Area */}
          <Box sx={{ 
            flexGrow: 1, 
            width: '75%',
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            {/* Messages */}
            <Paper sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              p: 1,
              backgroundColor: '#f8f9fa',
              mb: 2
            }}>
              <List>
                {messages.map((message) => (
                  <ListItem 
                    key={message.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.type === 'system' ? 'center' : 'flex-start',
                      py: 1
                    }}
                  >
                    <Card sx={{ 
                      minWidth: message.type === 'system' ? 200 : 300,
                      maxWidth: '70%',
                      backgroundColor: message.type === 'system' 
                        ? '#e3f2fd' 
                        : message.type === 'voice'
                        ? '#fff3e0'
                        : 'white'
                    }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        {message.type !== 'system' && (
                          <Typography 
                            variant="caption" 
                            color="primary" 
                            fontWeight="bold"
                          >
                            {message.username}
                          </Typography>
                        )}
                        <Typography variant="body1">
                          {formatMessageContent(message)}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                          <TimeIcon fontSize="small" sx={{ fontSize: 12, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(message.timestamp)}
                          </Typography>
                          {getStatusIcon(message)}
                        </Box>
                      </CardContent>
                    </Card>
                  </ListItem>
                ))}
              </List>
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </Typography>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </Paper>

            {/* Message Input */}
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={currentMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setCurrentMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
                  size="small"
                />
                <IconButton 
                  color="primary" 
                  onClick={handleVoiceMessage}
                  disabled={isRecording}
                  sx={{ 
                    backgroundColor: isRecording ? 'error.main' : 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: isRecording ? 'error.dark' : 'primary.dark',
                    }
                  }}
                >
                  <MicIcon />
                </IconButton>
                <Button 
                  variant="contained" 
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim()}
                  endIcon={<SendIcon />}
                >
                  Send
                </Button>
              </Box>
            </Paper>
          </Box>

          {/* Online Users Sidebar */}
          <Box sx={{ 
            width: '25%',
            minWidth: 280,
            display: { xs: 'none', md: 'block' }
          }}>
            <Paper sx={{ height: '100%', p: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                Online Users ({onlineUsers.length})
              </Typography>
              <List>
                {onlineUsers.map((user) => (
                  <ListItem key={user.id}>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#4caf50'
                          }} />
                          {user.username}
                        </Box>
                      }
                      secondary={`Joined ${formatTime(user.joinTime)}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;