import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../../services/userService';
import UserListItem from './UserListItem';
import UserDetailModal from '../userManagement/UserDetailModal';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await getAllUsers();
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    let sortedUsers = [...users];

    if (sortOrder === 'newest') {
      sortedUsers.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    } else {
      sortedUsers.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
    }

    const filtered = sortedUsers.filter(user => {
      const matchesSearch = user.nombre.toLowerCase().includes(lowercasedFilter) ||
                            user.email.toLowerCase().includes(lowercasedFilter);
      
      const userRole = user.role || 'baseCustomer';
      const matchesRole = roleFilter === 'all' || userRole === roleFilter;

      return matchesSearch && matchesRole;
    });

    setFilteredUsers(filtered);
  }, [searchTerm, users, sortOrder, roleFilter]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.uid === updatedUser.uid ? { ...user, ...updatedUser } : user
      )
    );
  };

  return (
    <div className="user-list-container">
      <h2 className="user-list-title">Lista de Usuarios</h2>
      <div className="user-search-wrapper">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="user-search-input"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="user-sort-select"
        >
          <option value="all">Todos los Roles</option>
          <option value="baseCustomer">Cliente Base</option>
          <option value="convenioCustomer">Convenio</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="user-sort-select"
        >
          <option value="newest">Más nuevos</option>
          <option value="oldest">Más antiguos</option>
        </select>
      </div>
      <div className="user-list-items-container">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <div key={user.uid} onClick={() => handleUserClick(user)}>
              <UserListItem user={user} />
            </div>
          ))
        ) : (
          <p>No se encontraron usuarios.</p>
        )}
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </div>
  );
};

export default UserList;
