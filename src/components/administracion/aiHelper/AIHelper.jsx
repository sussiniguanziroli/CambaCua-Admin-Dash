import React, { useState } from 'react';
import { FaRobot, FaFileInvoice, FaClipboardList } from 'react-icons/fa';
import InvoiceProcessor from './InvoiceProcessor';


const AIHelper = () => {
  const [activeModule, setActiveModule] = useState(null);

  const modules = [
    {
      id: 'invoice',
      title: 'Procesar Factura de Stock',
      description: 'Sube una foto de una factura y carga automáticamente los productos al inventario',
      icon: <FaFileInvoice />,
      component: InvoiceProcessor,
      available: true
    },
    {
      id: 'prescription',
      title: 'Procesar Receta Médica',
      description: 'Extrae medicamentos y dosis de recetas veterinarias',
      icon: <FaClipboardList />,
      component: null,
      available: false
    }
  ];

  if (activeModule) {
    const ActiveComponent = modules.find(m => m.id === activeModule)?.component;
    return (
      <div className="ai-helper-container">
        <button 
          className="back-button"
          onClick={() => setActiveModule(null)}
        >
          ← Volver al menú
        </button>
        {ActiveComponent && <ActiveComponent />}
      </div>
    );
  }

  return (
    <div className="ai-helper-container">
      <div className="ai-helper-header">
        <FaRobot className="header-icon" />
        <h1>Ayudante IA</h1>
        <p>Herramientas inteligentes para automatizar tareas repetitivas</p>
      </div>

      <div className="modules-grid">
        {modules.map(module => (
          <div 
            key={module.id}
            className={`module-card ${!module.available ? 'disabled' : ''}`}
            onClick={() => module.available && setActiveModule(module.id)}
          >
            <div className="module-icon">{module.icon}</div>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            {!module.available && <span className="coming-soon">Próximamente</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIHelper;