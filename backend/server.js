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
  // Initialize the room if it doesn't exist
  if (!roomUsers[roomId]) {
    roomUsers[roomId] = [];
  }

  // Check if the user is already in the room
  const existingUser = roomUsers[roomId].find((user) => user.id === socket.id);

  if (!existingUser) {
    // Assign role: mentor if no mentor exists, otherwise student
    const existingMentor = roomUsers[roomId].find((user) => user.role === 'mentor');
    const role = existingMentor ? 'student' : 'mentor';

    // Add the user to the room
    roomUsers[roomId].push({ id: socket.id, role });

    console.log(`Socket ${socket.id} joined room: ${roomId} as ${role}`);
    socket.emit('role-assigned', role);
    socket.join(roomId);
  } else {
    console.log(`Socket ${socket.id} is already in room: ${roomId}`);
  }

  // Debugging: Log current room users
  console.log(`Current users in room ${roomId}:`, roomUsers[roomId]);
});


  // Handle real-time code updates
  socket.on('code-update', ({ roomId, code }) => {
    console.log(`Room ${roomId}: Code updated to:`, code);
    socket.to(roomId).emit('receive-code', code); // Broadcast the code update to others in the room
  });

  // Handle user disconnecting
socket.on('disconnect', () => {
  console.log(`WebSocket disconnected: ${socket.id}`);

  for (const room in roomUsers) {
    // Find the room the user belongs to
    const userIndex = roomUsers[room].findIndex((user) => user.id === socket.id);

    if (userIndex !== -1) {
      const user = roomUsers[room][userIndex];

      // Remove the user from the room
      roomUsers[room].splice(userIndex, 1);

      // If the mentor leaves, notify all students to redirect and reset the room
      if (user.role === 'mentor') {
        io.to(room).emit('redirect-to-lobby'); // Notify students
        console.log(`Mentor left room ${room}. Students have been redirected.`);

        // Reset the room's data (e.g., code block state)
        const resetCodeBlock = {
          title: `Room ${room}`, // Example default title
          initial_template: '', // Default empty template
          solution: '', // Clear solution
        };
        // Optionally, persist reset state to a database or log it
        console.log(`Code block for room ${room} has been reset:`, resetCodeBlock);

        delete roomUsers[room]; // Clear the room
      }

      // If the room is now empty, delete it
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
