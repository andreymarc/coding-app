import { io } from 'socket.io-client';

// Create a single WebSocket connection instance
const socket = io('http://localhost:4000', { transports: ['websocket'] });

export default socket;
