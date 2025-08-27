# DoubleTick Chat 🚀

> A modern, real-time chat application inspired by WhatsApp, built with a powerful NestJS backend and a dynamic React frontend.

This project is a full-featured chat service that demonstrates a modern web architecture using WebSockets for instant communication.
It features a clean, responsive interface and a robust backend capable of handling multiple users, real-time events, and different message types.

---

✨ Features

**Real-Time Messaging**: Instant two-way communication powered by **Socket.IO**.
**User Authentication**: Simple and secure user login to join the chat.Online User List: See a list of all currently active users in the chat room.Typing Indicators**: Know when another user is typing a message in real-time.
* **Voice-to-Text Messages**: Use your microphone to send messages, powered by the browser's Web Speech API.
* **System Messages**: Automated messages for user join/leave events to keep everyone notified.
* **Modern UI/UX**: A clean and responsive user interface designed with **Material-UI (MUI)**.

---

 🛠️ Technology Stack

This project is built with a modern, type-safe stack to ensure scalability and maintainability.

 Backend (NestJS)

| Technology             | Description                                                                          |
| :--------------------- | :----------------------------------------------------------------------------------- |
| **NestJS** | A progressive Node.js framework for building efficient and scalable server-side apps. |
| **TypeScript** | Superset of JavaScript that adds static types for more robust code.                  |
| **Socket.IO** | Enables real-time, bidirectional, and event-based communication.                     |
| **WebSocket Gateway** | The core NestJS module for managing WebSocket connections, events, and messages.     |

 Frontend (React)

| Technology         | Description                                                                              |
| :----------------- | :--------------------------------------------------------------------------------------- |
| **React** | A popular JavaScript library for building user interfaces.                               |
| **TypeScript** | Provides type safety for robust and scalable frontend code.                              |
| **Material-UI (MUI)** | A comprehensive library of UI tools and components for a polished design.                |
| **Socket.IO Client**| The client-side library to connect to the WebSocket server and handle real-time events. |

---

 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

## Prerequisites

* Node.js (v16 or later recommended)
* npm (or yarn)

### ### Installation & Setup

#### ### 1. Backend Server (NestJS)

First, set up the server which will handle all the real-time communication.

```bash
# 1. Navigate to the backend project folder
cd path/to/your/backend-folder

# 2. Install NPM packages
npm install

# 3. Start the development server
npm run start:dev
```

* The backend server will be running on `http://localhost:3001`.
* For testing, the required password is hardcoded as `mypassword` in `src/chat.gateway.ts`.

#### ### 2. Frontend Application (React)

Next, set up the client-side application.

```bash
# 1. Navigate to the frontend project folder
cd path/to/your/frontend-folder

# 2. Install NPM packages
npm install

# 3. Start the development server
npm start
```

* The React application will automatically open and run on `http://localhost:3000`.
* You can now open multiple browser tabs to simulate a conversation between different users.

---

## ## 💡 Future Enhancements

This project has a solid foundation that can be extended with more advanced features:

* **Database Integration**: Integrate MongoDB or PostgreSQL to persist users and chat history.
* **Private Messaging**: Implement 1-on-1 private chats between users.
* **Chat Rooms**: Allow users to create and join different chat rooms based on topics.
* **"Double Tick" Read Receipts**: Add functionality to show when a message has been delivered and read.
* **File Sharing**: Enable users to share images, videos, and other files.
* **JWT Authentication**: Replace the simple password system with a secure, token-based authentication flow.
  
                                                                                        THANK YOU
