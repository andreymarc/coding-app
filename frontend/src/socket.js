import { io } from 'socket.io-client';

// Use environment variable or default to localhost
const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Create a single WebSocket connection instance
const socket = io(socketUrl, { transports: ['websocket'] });

export default socket;
