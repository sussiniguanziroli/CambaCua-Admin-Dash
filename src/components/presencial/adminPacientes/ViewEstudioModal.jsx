import React from 'react';
import { generateEstudioPDF } from '../../../services/estudioService';

const ViewEstudioModal = ({ isOpen, onClose, estudio, paciente }) => {
    if (!isOpen || !estudio) return null;

    const fecha = estudio.fecha || (estudio.createdAt?.toDate ? estudio.createdAt.toDate().toLocaleDateString('es-AR') : 'N/A');

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content recipe-modal">
                <div className="modal-header">
                    <h3>Solicitud de Estudios</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="estudio-view-body">
                    <p><strong>Fecha:</strong> {fecha}</p>
                    <p><strong>Solicitado por:</strong> {estudio.solicitadoPor || 'N/A'}</p>
                    <h4>Estudios</h4>
                    <ul className="estudio-view-list">
                        {(estudio.tipos || []).map((t, i) => (
                            <li key={i}>
                                <strong>{t.nombre}</strong>
                                {t.descripcion && <span> — {t.descripcion}</span>}
                            </li>
                        ))}
                    </ul>
                    {estudio.notas && (<><h4>Notas</h4><p className="estudio-view-notas">{estudio.notas}</p></>)}
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="button" className="btn btn-primary" onClick={() => generateEstudioPDF(estudio, paciente)}>Imprimir PDF</button>
                </div>
            </div>
        </div>
    );
};

export default ViewEstudioModal;
