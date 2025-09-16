import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

// --- SVG Icons ---
const FaTimes = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>;

const LinkUserModal = ({ tutor, isOpen, onClose, onLinkSuccess }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        const fetchUnlinkedUsers = async () => {
            setIsLoading(true);
            try {
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const tutorsSnapshot = await getDocs(collection(db, 'tutores'));
                const linkedUserIds = new Set(tutorsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean));
                const unlinkedUsers = usersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(user => !linkedUserIds.has(user.id));
                setUsers(unlinkedUsers);
            } catch (error) {
                console.error("Error fetching unlinked users:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUnlinkedUsers();
    }, [isOpen]);

    const handleLinkUser = async () => {
        if (!selectedUser) return;
        try {
            const tutorRef = doc(db, 'tutores', tutor.id);
            await updateDoc(tutorRef, { userId: selectedUser.id });
            const userRef = doc(db, 'users', selectedUser.id);
            await updateDoc(userRef, { tutorId: tutor.id });
            onLinkSuccess();
        } catch (error) {
            console.error("Error linking user to tutor:", error);
        }
    };
    
    const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!isOpen) return null;

    return (
        <div className={`link-user-modal-overlay ${isOpen ? 'open' : ''}`}>
            <div className="link-user-modal">
                <button className="close-btn" onClick={onClose}><FaTimes /></button>
                <div className="modal-content">
                    <h3>Vincular Tutor a Usuario</h3>
                    <p>Seleccione un usuario para vincular a <strong>{tutor.name}</strong>.</p>
                    <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input"/>
                    {isLoading ? <p>Cargando...</p> : (
                        <ul className="selection-list">
                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                <li key={user.id} onClick={() => setSelectedUser(user)} className={selectedUser?.id === user.id ? 'selected' : ''}>
                                    {user.name} ({user.email})
                                </li>
                            )) : <p>No hay usuarios para vincular.</p>}
                        </ul>
                    )}
                    <div className="navigator-buttons">
                        <button onClick={handleLinkUser} disabled={!selectedUser} className="btn btn-primary">Vincular</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LinkUserModal;

