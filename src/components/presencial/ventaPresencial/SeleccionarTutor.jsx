import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';


const SeleccionarTutor = ({ onTutorSelected }) => {
    const [tutors, setTutors] = useState([]);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTutors = async () => {
            setIsLoading(true);
            try {
                const tutorsCollection = collection(db, 'tutores');
                const tutorsSnapshot = await getDocs(tutorsCollection);
                const tutorsList = tutorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTutors(tutorsList);
            } catch (error) {
                console.error("Error fetching tutors:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTutors();
    }, []);

    const filteredTutors = tutors.filter(tutor =>
        (tutor.name && tutor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tutor.email && tutor.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="seleccionar-tutor">
            <h2>Paso 1: Seleccionar Tutor</h2>
            <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
            />
            {isLoading ? <p>Cargando tutores...</p> : (
                <ul className="selection-list">
                    {filteredTutors.map(tutor => (
                        <li 
                            key={tutor.id} 
                            onClick={() => setSelectedTutor(tutor)} 
                            className={selectedTutor?.id === tutor.id ? 'selected' : ''}
                        >
                            {tutor.name} <span>({tutor.email || 'Sin email'})</span>
                        </li>
                    ))}
                </ul>
            )}
            <div className="navigator-buttons" style={{ justifyContent: 'flex-end' }}>
                <button onClick={() => onTutorSelected(selectedTutor)} disabled={!selectedTutor}>Siguiente</button>
            </div>
        </div>
    );
};

export default SeleccionarTutor;

