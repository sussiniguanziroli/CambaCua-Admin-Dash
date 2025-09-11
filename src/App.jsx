import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import Login from './components/Login';
import './css/main.css';
import Dashboard from './components/Dashboard';
import { BrowserRouter as Router } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
    }).catch((error) => {
      console.error('Error al cerrar sesión:', error);
    });
  };

  if (loading) {
    return <div className="loading-container">Cargando...</div>;
  }

  return (
    <Router>
      <div className='app-container'>
        {user ? (
          <Dashboard user={user} handleLogout={handleLogout} />
        ) : (
          <Login />
        )}
      </div>
    </Router>
  );
}

export default App;

