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
    origin: '*',
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


app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB!');
});



// Define a CodeBlock Schema and Model
const codeBlockSchema = new mongoose.Schema({
  title: String,
  initial_template: String,
  solution: String,
});

const CodeBlock = mongoose.model('CodeBlock', codeBlockSchema);

// API Routes
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
    const codeBlock = await CodeBlock.findById(req.params.id); // Find the document by ID
    if (!codeBlock) {
      return res.status(404).json({ message: 'Code block not found' });
    }
    res.json(codeBlock); // Return the document
  } catch (err) {
    console.error('Error fetching code block:', err);
    res.status(500).json({ message: 'Error fetching code block' });
  }
});


// WebSocket Events
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on('code-update', ({ roomId, code }) => {
    socket.to(roomId).emit('receive-code', code); // Broadcast to other users in the room
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});


// Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
