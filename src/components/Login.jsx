import React, { useState } from 'react';
import { signInWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// List of authorized admin UIDs
const ADMIN_UIDS = [
    'Co7Rg2ANZFRoCxhrK9JaHJOl2zR2', // celesteguanziroli@yahoo.com.ar
    'Bk51tX4d7VXkjg9octa5yDUgGOr1',
    'XQcRWLm56WdX5t6lcuRrKuYZxu42'  // paddycheto@gmail.com
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if the logged-in user's UID is in the admin list
      if (ADMIN_UIDS.includes(user.uid)) {
        // If user is an admin, proceed to the admin panel
        navigate('/admin/handle-orders'); 
      } else {
        // If not an admin, show an error and sign them out
        await signOut(auth);
        Swal.fire({
            icon: 'error',
            title: 'Acceso Denegado',
            text: 'No tienes permisos para acceder al panel de administración.',
        });
      }
    } catch (error) {
      // Handle standard login errors (wrong password, etc.)
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          setError('El email o la contraseña son incorrectos.');
      } else {
          setError('Ocurrió un error. Por favor, intenta de nuevo.');
      }
      console.error("Login error:", error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
        <form className='login-form' onSubmit={handleSubmit}>
            <h2>Panel de Administración</h2>
            <div className="input-group">
                <label htmlFor="email">Email</label>
                <input 
                    id="email"
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="tucorreo@ejemplo.com" 
                    required 
                />
            </div>
            <div className="input-group">
                <label htmlFor="password">Contraseña</label>
                <input 
                    id="password"
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    required 
                />
            </div>
            <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
            {error && <p className="error-message">{error}</p>}
        </form>
    </div>
  );
};

export default Login;
