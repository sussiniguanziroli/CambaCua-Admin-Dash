import { useState, useEffect } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';

const EMPTY_LINE = { productName: '', dose: '', frequency: '', duration: '' };
const today = () => new Date().toISOString().split('T')[0];

// Fecha de la receta como YYYY-MM-DD para el input: la elegida al crearla o, en recetas viejas, la de creación.
const recipeDate = (recipe) => {
    if (recipe.creationDate) return recipe.creationDate;
    return recipe.createdAt?.toDate ? recipe.createdAt.toDate().toISOString().split('T')[0] : today();
};

// Sin `recipe` crea una receta nueva; con `recipe` edita la existente (onSave recibe los datos y la receta original).
const CreateRecipeModal = ({ isOpen, onClose, onSave, recipe = null }) => {
    const isEditing = !!recipe;
    const [prescribedBy, setPrescribedBy] = useState('');
    const [generalIndications, setGeneralIndications] = useState('');
    const [creationDate, setCreationDate] = useState(today());
    const [prescriptions, setPrescriptions] = useState([{ ...EMPTY_LINE }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setPrescribedBy(recipe?.prescribedBy || '');
        setGeneralIndications(recipe?.generalIndications || '');
        setCreationDate(recipe ? recipeDate(recipe) : today());
        setPrescriptions(recipe?.prescriptions?.length ? recipe.prescriptions.map((p) => ({ ...EMPTY_LINE, ...p })) : [{ ...EMPTY_LINE }]);
    }, [isOpen, recipe]);

    const handlePrescriptionChange = (index, field, value) => {
        setPrescriptions((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    };

    const addPrescriptionLine = () => {
        setPrescriptions((prev) => [...prev, { ...EMPTY_LINE }]);
    };

    const removePrescriptionLine = (index) => {
        setPrescriptions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const recipeData = {
            prescribedBy,
            generalIndications,
            creationDate,
            prescriptions: prescriptions.filter((p) => p.productName),
        };
        Promise.resolve(onSave(recipeData, recipe)).finally(() => setIsSubmitting(false));
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content recipe-modal">
                <div className="modal-header">
                    <h3>{isEditing ? 'Editar Receta Clínica' : 'Nueva Receta Clínica'}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="prescribedBy">Recetado por:</label>
                        <input id="prescribedBy" type="text" value={prescribedBy} onChange={(e) => setPrescribedBy(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="creationDate">Fecha de Receta:</label>
                        <input id="creationDate" type="date" value={creationDate} onChange={(e) => setCreationDate(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="generalIndications">Indicaciones Generales</label>
                        <textarea id="generalIndications" value={generalIndications} onChange={(e) => setGeneralIndications(e.target.value)} />
                    </div>

                    <h4>Prescripciones</h4>
                    <div className="prescription-list">
                        {prescriptions.map((p, index) => (
                            <div key={index} className="prescription-item">
                                <input type="text" placeholder="Producto/Medicación" value={p.productName} onChange={(e) => handlePrescriptionChange(index, 'productName', e.target.value)} required />
                                <input type="text" placeholder="Dosis" value={p.dose} onChange={(e) => handlePrescriptionChange(index, 'dose', e.target.value)} required />
                                <input type="text" placeholder="Frecuencia" value={p.frequency} onChange={(e) => handlePrescriptionChange(index, 'frequency', e.target.value)} required />
                                <input type="text" placeholder="Duración" value={p.duration} onChange={(e) => handlePrescriptionChange(index, 'duration', e.target.value)} required />
                                <button type="button" className="remove-line-btn" onClick={() => removePrescriptionLine(index)}><FaTrash /></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="add-line-btn" onClick={addPrescriptionLine}><FaPlus /> Agregar Línea</button>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Guardar Receta')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRecipeModal;
