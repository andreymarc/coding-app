import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import socket from './socket'; // Shared socket instance

function CodeBlock() {
  const { id } = useParams(); // Room ID from URL
  const [codeBlock, setCodeBlock] = useState(null); // Code block data
  const [code, setCode] = useState(''); // Current code in the editor
  const [role, setRole] = useState(''); // User role: mentor or student
  const [loadingRole, setLoadingRole] = useState(true); // Loading state for role
  const [error, setError] = useState(null); // Error state

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
      socket.off('receive-code', handleReceiveCode);
    };
  }, [id]);

  const handleCodeChange = (value) => {
    setCode(value);
    console.log('Emitting code update:', value);
    socket.emit('code-update', { roomId: id, code: value });
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (loadingRole || !codeBlock) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{codeBlock.title}</h1>
      <p>{role === 'mentor' ? 'Hello Tom' : 'Hello Student'}</p> {/* Greeting */}
      <CodeMirror
        value={code}
        height="400px"
        extensions={[javascript()]}
        onChange={role === 'student' ? handleCodeChange : undefined} // Read-only for mentor
      />
    </div>
  );
}

export default CodeBlock;