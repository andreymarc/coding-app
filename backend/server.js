require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const http = require('http');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Explicitly allow the frontend origin
    methods: ['GET', 'POST'],        // Allowed HTTP methods
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// API Routes
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB!');
});

const codeBlockSchema = new mongoose.Schema({
  title: String,
  initial_template: String,
  solution: String,
});

const CodeBlock = mongoose.model('CodeBlock', codeBlockSchema);

app.get('/api/codeblocks', async (req, res) => {
  try {
    const codeBlocks = await CodeBlock.find();
    res.json(codeBlocks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching code blocks' });
  }
});

app.get('/api/codeblocks/:id', async (req, res) => {
  try {
    const codeBlock = await CodeBlock.findById(req.params.id);
    if (!codeBlock) {
      return res.status(404).json({ message: 'Code block not found' });
    }
    res.json(codeBlock);
  } catch (err) {
    console.error('Error fetching code block:', err);
    res.status(500).json({ message: 'Error fetching code block' });
  }
});

// WebSocket Events
const roomUsers = {};

io.on('connection', (socket) => {
  console.log(`WebSocket connected: ${socket.id}`);

  // Handle user joining a room
  socket.on('join-room', (roomId) => {
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    const existingUser = roomUsers[roomId].find((user) => user.id === socket.id);

    if (!existingUser) {
      const existingMentor = roomUsers[roomId].find((user) => user.role === 'mentor');
      const role = existingMentor ? 'student' : 'mentor';

      roomUsers[roomId].push({ id: socket.id, role });

      console.log(`Socket ${socket.id} joined room: ${roomId} as ${role}`);
      socket.emit('role-assigned', role);
      socket.join(roomId);

      // Broadcast student count to all users in the room
      const numStudents = roomUsers[roomId].filter((user) => user.role === 'student').length;
      io.to(roomId).emit('update-student-count', numStudents);
    } else {
      console.log(`Socket ${socket.id} is already in room: ${roomId}`);
    }

    console.log(`Current users in room ${roomId}:`, roomUsers[roomId]);
  });

  // Handle real-time code updates
  socket.on('code-update', async ({ roomId, code }) => {
    console.log(`Room ${roomId}: Code updated to:`, code);

    // Broadcast code changes to other users in the room
    socket.to(roomId).emit('receive-code', code);

    try {
      // Fetch the solution for the code block
      const codeBlock = await CodeBlock.findById(roomId);

      if (codeBlock && code.trim() === codeBlock.solution.trim()) {
        console.log(`Room ${roomId}: Solution matched by ${socket.id}!`);
        // Notify the client who matched the solution
        socket.emit('solution-matched', true);
      }
    } catch (error) {
      console.error(`Error checking solution for room ${roomId}:`, error);
    }
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log(`WebSocket disconnected: ${socket.id}`);

    for (const room in roomUsers) {
      const userIndex = roomUsers[room].findIndex((user) => user.id === socket.id);

      if (userIndex !== -1) {
        const user = roomUsers[room][userIndex];
        roomUsers[room].splice(userIndex, 1);

        // Broadcast updated student count to all users in the room
        const numStudents = roomUsers[room].filter((user) => user.role === 'student').length;
        io.to(room).emit('update-student-count', numStudents);

        if (user.role === 'mentor') {
          io.to(room).emit('redirect-to-lobby');
          console.log(`Mentor left room ${room}. Students have been redirected.`);
          delete roomUsers[room];
        }

        if (roomUsers[room] && roomUsers[room].length === 0) {
          delete roomUsers[room];
          console.log(`Room ${room} is now empty and has been deleted.`);
        }
      }
    }
  });
});

// Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
