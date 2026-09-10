import React from 'react';
import { generateEstudioPDF } from '../../../services/estudioService';
import { getDatosPaciente, formatFechaEstudio } from '../../../services/pdf/estudioPdf';

const ViewEstudioModal = ({ isOpen, onClose, estudio, paciente }) => {
    if (!isOpen || !estudio) return null;

    const fecha = formatFechaEstudio(estudio) || 'N/A';
    const datos = getDatosPaciente(estudio, paciente);
    const especieRaza = [datos.especie, datos.raza].filter(Boolean).join(' - ');
    const sexoEdad = [datos.sexo, datos.edad].filter(Boolean).join(' · ');

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
                    <p><strong>Paciente:</strong> {datos.pacienteNombre || 'N/A'}{especieRaza && ` (${especieRaza})`}</p>
                    {sexoEdad && <p><strong>Sexo / Edad:</strong> {sexoEdad}</p>}
                    <p><strong>Tutor:</strong> {datos.tutorNombre || 'N/A'}{datos.telefono && ` — Tel. ${datos.telefono}`}</p>
                    <h4>Estudios</h4>
                    <ul className="estudio-view-list">
                        {(estudio.tipos || []).map((t, i) => (
                            <li key={i}>
                                <strong>{t.nombre}</strong>
                                {t.descripcion && <span> — {t.descripcion}</span>}
                            </li>
                        ))}
                    </ul>
                    {estudio.diagnostico && (<><h4>Diagnóstico</h4><p className="estudio-view-notas">{estudio.diagnostico}</p></>)}
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
