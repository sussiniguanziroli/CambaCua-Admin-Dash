import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { CiUser } from 'react-icons/ci';

const PeluqueroProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [peluquero, setPeluquero] = useState(null);
    const [turnos, setTurnos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const peluqueroRef = doc(db, 'peluqueros', id);
            const peluqueroSnap = await getDoc(peluqueroRef);
            if (!peluqueroSnap.exists()) { navigate('/admin/peluqueros'); return; }
            setPeluquero({ id: peluqueroSnap.id, ...peluqueroSnap.data() });

            const turnosCollection = collection(db, 'turnos_peluqueria');
            const query1 = query(turnosCollection, where('peluqueroId', '==', id), orderBy('startTime', 'desc'));
            const query2 = query(turnosCollection, where('peluqueroid', '==', id), orderBy('startTime', 'desc'));
            
            const [snap1, snap2] = await Promise.all([getDocs(query1), getDocs(query2)]);

            const combinedTurnos = new Map();
            snap1.docs.forEach(d => combinedTurnos.set(d.id, { id: d.id, ...d.data(), startTime: d.data().startTime.toDate() }));
            snap2.docs.forEach(d => combinedTurnos.set(d.id, { id: d.id, ...d.data(), startTime: d.data().startTime.toDate() }));

            const sortedTurnos = Array.from(combinedTurnos.values()).sort((a, b) => b.startTime - a.startTime);
            setTurnos(sortedTurnos);

        } catch (error) { console.error("Error fetching data:", error); } 
        finally { setIsLoading(false); }
    }, [id, navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (isLoading) return <p className="loading-message">Cargando perfil...</p>;
    if (!peluquero) return null;

    return (
        <div className="profile-container">
            <div className="profile-header">
                <div className="profile-avatar"><CiUser /></div>
                <div className="profile-info"><h1>{peluquero.name}</h1><p>{peluquero.phone}</p></div>
                <div className="profile-actions"><button className="btn btn-primary" onClick={() => navigate('/admin/agenda-peluqueria')}>Ir a la Agenda</button></div>
            </div>
            <div className="profile-content" style={{padding: '2rem'}}>
                <h3>Turnos Asignados</h3>
                <div className="turnos-list">
                    {turnos.length > 0 ? turnos.map(t => (
                        <div key={t.id} className="cita-card">
                            <p><strong>Paciente:</strong> {t.pacienteName}</p>
                            <p><strong>Fecha:</strong> {t.startTime.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs</p>
                            <p><strong>Servicios:</strong> {(t.services || []).map(s => s.name).join(', ')}</p>
                        </div>
                    )) : <p>No hay turnos asignados.</p>}
                </div>
            </div>
        </div>
    );
};

export default PeluqueroProfile;