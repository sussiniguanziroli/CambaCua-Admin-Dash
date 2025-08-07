import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../../services/userService';
import UserListItem from './UserListItem';
import UserDetailModal from './UserDetailModal'; // Import the new modal component


const UserList = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // State for the modal
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

    // Sorting logic based on sortOrder state
    if (sortOrder === 'newest') {
      sortedUsers.sort((a, b) => {
        // Ensure createdAt exists and is a valid Timestamp before comparing
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
    } else {
      sortedUsers.sort((a, b) => {
        // Ensure createdAt exists and is a valid Timestamp before comparing
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateA - dateB;
      });
    }

    const filtered = sortedUsers.filter(user =>
      user.nombre.toLowerCase().includes(lowercasedFilter) ||
      user.email.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users, sortOrder]);

  // Handler to open the modal
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // Handler to close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
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

      {/* The modal is rendered here, but only when isModalOpen is true */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default UserList;
