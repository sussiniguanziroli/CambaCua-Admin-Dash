import React, { useState } from 'react';
import { signInWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaUser, FaLock } from 'react-icons/fa';

const ADMIN_UIDS = [
    'Co7Rg2ANZFRoCxhrK9JaHJOl2zR2',
    'Bk51tX4d7VXkjg9octa5yDUgGOr1',
    'XQcRWLm56WdX5t6lcuRrKuYZxu42'
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
      if (ADMIN_UIDS.includes(user.uid)) {
        navigate('/admin/orders'); 
      } else {
        await signOut(auth);
        Swal.fire({
            icon: 'error',
            title: 'Acceso Denegado',
            text: 'No tienes permisos para acceder al panel de administración.',
        });
      }
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          setError('El email o la contraseña son incorrectos.');
      } else {
          setError('Ocurrió un error. Por favor, intenta de nuevo.');
      }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
        <div className="login-card">
            <div className="login-header">
                <h2>Panel de Administración</h2>
                <p>Bienvenido. Por favor, inicia sesión.</p>
            </div>
            <form className='login-form' onSubmit={handleSubmit}>
                <div className="input-group">
                    <FaUser className="input-icon" />
                    <input 
                        id="email"
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="Email" 
                        required 
                    />
                </div>
                <div className="input-group">
                    <FaLock className="input-icon" />
                    <input 
                        id="password"
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Contraseña" 
                        required 
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="login-button" disabled={isLoading}>
                    {isLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
            </form>
        </div>
    </div>
  );
};

export default Login;
