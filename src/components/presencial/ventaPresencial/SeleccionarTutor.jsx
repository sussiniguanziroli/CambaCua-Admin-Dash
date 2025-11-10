import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// Cache for tutors data - shared with VerTutores if needed
let tutorsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const SeleccionarTutor = ({ onTutorSelected, onGenericSelected }) => {
    const [tutors, setTutors] = useState([]);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Check if cache is valid
    const isCacheValid = useCallback(() => {
        return tutorsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION);
    }, []);

    useEffect(() => {
        const fetchTutors = async () => {
            // Use cache if valid
            if (isCacheValid()) {
                setTutors(tutorsCache);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const tutorsSnapshot = await getDocs(collection(db, 'tutores'));
                const tutorsList = tutorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Update cache
                tutorsCache = tutorsList;
                cacheTimestamp = Date.now();
                
                setTutors(tutorsList);
            } catch (error) {
                console.error("Error fetching tutors:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchTutors();
    }, [isCacheValid]);

    // Memoized filtered tutors
    const filteredTutors = useMemo(() => {
        if (!searchTerm) return tutors;
        
        const term = searchTerm.toLowerCase();
        return tutors.filter(tutor =>
            (tutor.name && tutor.name.toLowerCase().includes(term)) ||
            (tutor.email && tutor.email.toLowerCase().includes(term))
        );
    }, [tutors, searchTerm]);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);

    const handleTutorClick = useCallback((tutor) => {
        setSelectedTutor(tutor);
    }, []);

    const handleNextClick = useCallback(() => {
        if (selectedTutor) {
            onTutorSelected(selectedTutor);
        }
    }, [selectedTutor, onTutorSelected]);

    return (
        <div className="venta-step-container venta-selection-container">
            <h2>Paso 1: Seleccionar Tutor</h2>
            <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="venta-search-input"
            />
            {isLoading ? (
                <p>Cargando tutores...</p>
            ) : (
                <ul className="venta-selection-list">
                    {filteredTutors.map(tutor => (
                        <TutorListItem
                            key={tutor.id}
                            tutor={tutor}
                            isSelected={selectedTutor?.id === tutor.id}
                            onSelect={handleTutorClick}
                        />
                    ))}
                </ul>
            )}
            <div className="venta-navigator-buttons">
                <button onClick={onGenericSelected} className="btn btn-secondary">
                    Vender a Cliente Genérico
                </button>
                <button 
                    onClick={handleNextClick} 
                    className="btn btn-primary" 
                    disabled={!selectedTutor}
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
};

// Memoized list item to prevent unnecessary re-renders
const TutorListItem = React.memo(({ tutor, isSelected, onSelect }) => {
    const handleClick = useCallback(() => {
        onSelect(tutor);
    }, [tutor, onSelect]);

    return (
        <li 
            onClick={handleClick}
            className={isSelected ? 'selected' : ''}
        >
            {tutor.name} <span>({tutor.email || 'Sin email'})</span>
        </li>
    );
});

TutorListItem.displayName = 'TutorListItem';

export default SeleccionarTutor;