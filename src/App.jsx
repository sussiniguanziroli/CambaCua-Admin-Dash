import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config'; // Importa auth desde config.js
import Login from './components/Login'; // Asegúrate de que la ruta sea correcta
import './css/main.css'; // Importa tus estilos
import Dashboard from './components/Dashboard';
import { BrowserRouter as Router } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
    }).catch((error) => {
      console.error('Error al cerrar sesión:', error);
    });
  };

  return (
    <Router>
      <div className='app-div'>
        {user ? (
          <>
            <h1>Bienvenido, {user.email}</h1>
            <button className='cerrar-sesion' onClick={handleLogout}>Cerrar sesión</button>
            <Dashboard />
          </>
        ) : (
          <>
            <h1>Por favor, inicia sesión</h1>
            <Login /> {/* Renderizar el componente de Login aquí */}
          </>
        )}
      </div>
    </Router>
  );
}

export default App;
