import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import socket from './socket'; // Shared socket instance

function CodeBlock() {
  const { id } = useParams(); // Room ID from URL
  const navigate = useNavigate(); // Hook to navigate between pages
  const [codeBlock, setCodeBlock] = useState(null); // Code block data
  const [code, setCode] = useState(''); // Current code in the editor
  const [role, setRole] = useState(''); // User role: mentor or student
  const [loadingRole, setLoadingRole] = useState(true); // Loading state for role
  const [error, setError] = useState(null); // Error state
  const [studentCount, setStudentCount] = useState(0); // Track number of students
  const [solutionMatched, setSolutionMatched] = useState(false); // Track solution matching
  const [readOnlyMessage, setReadOnlyMessage] = useState(''); // Message for mentor
  const [chatMessages, setChatMessages] = useState([]); // Chat messages
  const [newMessage, setNewMessage] = useState(''); // Input for chat messages
  const chatBoxRef = useRef(null); // Reference for the chat box

  useEffect(() => {
    console.log('Connecting to WebSocket server...');

    // Handle connection
    socket.on('connect', () => {
      console.log('Connected to WebSocket server:', socket.id);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    // Listen for role assignment
    const handleRoleAssigned = (assignedRole) => {
      console.log(`Assigned role: ${assignedRole}`);
      setRole(assignedRole);
      setLoadingRole(false);
    };

    socket.on('role-assigned', handleRoleAssigned);

    // Listen for mentor disconnect and redirection
    const handleRedirect = () => {
      console.log('Mentor disconnected. Redirecting to lobby...');
      setCodeBlock(null); // Clear the code block state
      setCode(''); // Reset the code editor
      navigate('/'); // Redirect to the lobby page
    };

    socket.on('redirect-to-lobby', handleRedirect);

    // Listen for student count updates
    const handleStudentCountUpdate = (count) => {
      console.log(`Number of students in room: ${count}`);
      setStudentCount(count); // Update the student count state
    };

    socket.on('update-student-count', handleStudentCountUpdate);

    // Listen for solution matching
    const handleSolutionMatched = () => {
      console.log('Solution matched! 🎉');
      setSolutionMatched(true); // Display the smiley face
    };

    socket.on('solution-matched', handleSolutionMatched);

    // Listen for chat messages
    const handleReceiveMessage = ({ sender, message }) => {
      setChatMessages((prevMessages) => [...prevMessages, { sender, message }]);

      // Auto-scroll to the bottom of the chat box
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    };

    socket.on('receive-message', handleReceiveMessage);

    // Fetch code block data
    fetch(`http://localhost:4000/api/codeblocks/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch code block');
        return res.json();
      })
      .then((data) => {
        setCodeBlock(data);
        setCode(data.initial_template);
        console.log(`Fetched code block for room: ${id}`);
        socket.emit('join-room', id); // Join the WebSocket room
      })
      .catch((err) => {
        console.error('Error fetching code block:', err);
        setError('Failed to load code block. Please try again.');
      });

    // Listen for real-time updates
    const handleReceiveCode = (updatedCode) => {
      console.log('Received updated code:', updatedCode);
      setCode(updatedCode);
    };

    socket.on('receive-code', handleReceiveCode);

    // Cleanup listeners on component unmount
    return () => {
      console.log('Disconnecting from WebSocket server...');
      socket.off('role-assigned', handleRoleAssigned);
      socket.off('redirect-to-lobby', handleRedirect);
      socket.off('update-student-count', handleStudentCountUpdate);
      socket.off('solution-matched', handleSolutionMatched);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('receive-code', handleReceiveCode);
    };
  }, [id, navigate]);

  const handleCodeChange = (value) => {
    setCode(value);
    console.log('Emitting code update:', value);
    socket.emit('code-update', { roomId: id, code: value });
  };

  const handleMentorEditAttempt = () => {
    //setReadOnlyMessage('You are in read-only mode!');
    setTimeout(() => setReadOnlyMessage(''), 2000); // Clear the message after 2 seconds
  };

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    const sender = role === 'mentor' ? 'Tom (Mentor)' : 'Student';
    socket.emit('chat-message', { roomId: id, message: newMessage, sender });

    setChatMessages((prevMessages) => [...prevMessages, { sender, message: newMessage }]); // Update local state
    setNewMessage(''); // Clear the input field

    // Auto-scroll to the bottom of the chat box
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (loadingRole || !codeBlock) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ color: '#4A90E2', textAlign: 'center' }}>{codeBlock.title}</h1>
      <p style={{ textAlign: 'center', fontWeight: 'bold' }}>
        {role === 'mentor' ? 'Hello Tom' : 'Hello Student'}
      </p>
      <p style={{ textAlign: 'center' }}>Students in room: {studentCount}</p>
      {solutionMatched && (
        <div style={{ fontSize: '4rem', textAlign: 'center', margin: '20px 0', color: '#4CAF50' }}>
          😄
        </div>
      )}
      {readOnlyMessage && <p style={{ color: 'red', textAlign: 'center' }}>{readOnlyMessage}</p>}
      <CodeMirror
        value={code}
        height="400px"
        extensions={[javascript()]}
        editable={role === 'student'}
        onChange={role === 'student' ? handleCodeChange : handleMentorEditAttempt}
      />

      {/* Chat Section */}
      <div
        style={{
          marginTop: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#f9f9f9',
        }}
      >
        <h2 style={{ backgroundColor: '#4A90E2', color: 'white', margin: 0, padding: '10px' }}>
          Chat
        </h2>
        <div
          ref={chatBoxRef}
          style={{
            height: '200px',
            overflowY: 'auto',
            padding: '10px',
            backgroundColor: '#ffffff',
          }}
        >
          {chatMessages.map((msg, index) => (
            <p
              key={index}
              style={{
                margin: '5px 0',
                color: msg.sender.includes('Mentor') ? '#4A90E2' : '#333',
                fontWeight: msg.sender.includes('Mentor') ? 'bold' : 'normal',
              }}
            >
              <strong>{msg.sender}:</strong> {msg.message}
            </p>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            padding: '10px',
            borderTop: '1px solid #ccc',
            backgroundColor: '#f1f1f1',
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginRight: '10px',
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4A90E2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default CodeBlock;
