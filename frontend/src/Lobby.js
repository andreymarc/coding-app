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
    <div style={styles.container}>
      <h1 style={styles.heading}>Choose a Code Block</h1>
      <div style={styles.cardContainer}>
        {codeBlocks.map((block) => (
          <Link 
            key={block._id} 
            to={`/codeblock/${block._id}`} 
            style={styles.card}
          >
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{block.title}</h3>
              <p style={styles.cardDescription}>Click to open</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  heading: {
    color: '#343a40',
    marginBottom: '20px',
  },
  cardContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '15px',
  },
  card: {
    textDecoration: 'none',
    width: '200px',
    padding: '15px',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '1.2rem',
    color: '#007bff',
    marginBottom: '5px',
  },
  cardDescription: {
    fontSize: '0.9rem',
    color: '#6c757d',
  },
  cardHover: {
    transform: 'scale(1.05)',
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.15)',
  },
};

export default Lobby;
