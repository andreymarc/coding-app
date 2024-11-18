import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Lobby() {
  const [codeBlocks, setCodeBlocks] = useState([]);

  useEffect(() => {
  fetch('http://localhost:4000/api/codeblocks') // Use the correct backend URL
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => setCodeBlocks(data))
    .catch((error) => console.error('Error fetching code blocks:', error));
}, []);

  return (
    <div>
      <h1>Choose a Code Block</h1>
      <ul>
        {codeBlocks.map((block) => (
          <li key={block._id}>
            <Link to={`/codeblock/${block._id}`}>{block.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Lobby;
