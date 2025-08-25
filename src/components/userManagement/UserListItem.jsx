import React from 'react';
import { FaGoogle, FaEnvelope, FaUserTag } from 'react-icons/fa';

const UserListItem = ({ user }) => {
  const providerIcon = user.provider === 'google' ? <FaGoogle className="provider-icon google" /> : <FaEnvelope className="provider-icon email" />;
  const providerText = user.provider === 'google' ? 'Google' : 'Email/Password';
  const avatarUrl = user.photoURL || `https://placehold.co/80x80/E0E0E0/7F8C8D?text=${user.nombre.charAt(0)}`;
  const userRole = user.role || 'baseCustomer';

  return (
    <div className="user-card">
      <img src={avatarUrl} alt={user.nombre} className="user-avatar" />
      <div className="user-info">
        <p className="user-name">{user.nombre}</p>
        <p className="user-email">{user.email}</p>
      </div>
      <div className="user-provider">
        {providerIcon}
        <span>{providerText}</span>
      </div>
      <div className={`user-role-badge ${userRole}`}>
        <FaUserTag />
        <span>{userRole === 'convenioCustomer' ? 'Convenio' : 'Cliente Base'}</span>
      </div>
      <div className="user-id">
        <p>ID: {user.uid}</p>
      </div>
    </div>
  );
};

export default UserListItem;
