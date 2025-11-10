import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc, updateDoc, arrayRemove, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Swal from "sweetalert2";
import { FaCat, FaDog, FaPlus } from "react-icons/fa";
import { CiEdit } from "react-icons/ci";
import { MdDeleteOutline, MdMiscellaneousServices } from "react-icons/md";

// Cache for pacientes data
let pacientesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const VerPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    searchTerm: "", 
    sortOrder: "name_asc", 
    showFallecidos: false, 
    serviceType: "todos" 
  });
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Check if cache is valid
  const isCacheValid = useCallback(() => {
    return pacientesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION);
  }, []);

  const fetchPacientes = useCallback(async (forceRefresh = false) => {
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      setPacientes(pacientesCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "pacientes"));
      const pacientesList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Update cache
      pacientesCache = pacientesList;
      cacheTimestamp = Date.now();
      
      setPacientes(pacientesList);
    } catch (error) {
      console.error("Error fetching pacientes:", error);
      Swal.fire("Error", "No se pudieron cargar los pacientes.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isCacheValid]);

  useEffect(() => { 
    fetchPacientes(); 
  }, [fetchPacientes]);

  // Memoized filtered and sorted pacientes
  const filteredPacientes = useMemo(() => {
    let temp = [...pacientes];

    // Fallecidos filter
    if (!filters.showFallecidos) {
      temp = temp.filter(p => !p.fallecido);
    }

    // Service type filter
    if (filters.serviceType !== "todos") {
      temp = temp.filter(p => {
        const services = p.serviceTypes || [];
        if (filters.serviceType === "clinical") return services.includes("clinical");
        if (filters.serviceType === "grooming") return services.includes("grooming");
        if (filters.serviceType === "both") return services.includes("clinical") && services.includes("grooming");
        return true;
      });
    }

    // Search filter
    const term = filters.searchTerm.toLowerCase();
    if (term) {
      temp = temp.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.species?.toLowerCase().includes(term) ||
        p.tutorName?.toLowerCase().includes(term) ||
        p.chipNumber?.includes(term)
      );
    }

    // Sort
    temp.sort((a, b) => {
      if (filters.sortOrder === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (filters.sortOrder === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (filters.sortOrder === "tutor_asc") return (a.tutorName || "").localeCompare(b.tutorName || "");
      return 0;
    });

    return temp;
  }, [filters, pacientes]);

  // Memoized current page items
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const items = filteredPacientes.slice(indexOfFirstItem, indexOfLastItem);
    const pages = Math.ceil(filteredPacientes.length / itemsPerPage);
    
    return { currentItems: items, totalPages: pages };
  }, [filteredPacientes, currentPage, itemsPerPage]);

  const recalculateTutorServiceTypes = async (tutorId) => {
    if (!tutorId) return;
    try {
      const q = query(collection(db, "pacientes"), where("tutorId", "==", tutorId));
      const pacSnap = await getDocs(q);
      const all = new Set();
      pacSnap.docs.forEach(docu => (docu.data().serviceTypes || []).forEach(t => all.add(t)));
      const tutorRef = doc(db, "tutores", tutorId);
      await updateDoc(tutorRef, { serviceTypes: Array.from(all) });
    } catch (e) {
      console.error("Error recalculating tutor service types:", e);
    }
  };

  const handleServiceChange = async (paciente, value) => {
    let newTypes = [];
    if (value === "clinical") newTypes = ["clinical"];
    else if (value === "grooming") newTypes = ["grooming"];
    else if (value === "both") newTypes = ["clinical", "grooming"];

    try {
      const pacienteRef = doc(db, "pacientes", paciente.id);
      await updateDoc(pacienteRef, { serviceTypes: newTypes });
      
      // Update local state
      setPacientes(prev => prev.map(p => (p.id === paciente.id ? { ...p, serviceTypes: newTypes } : p)));
      
      // Update cache
      if (pacientesCache) {
        pacientesCache = pacientesCache.map(p => (p.id === paciente.id ? { ...p, serviceTypes: newTypes } : p));
      }
      
      await recalculateTutorServiceTypes(paciente.tutorId);
      
      Swal.fire({ 
        toast: true, 
        position: "top-end", 
        icon: "success", 
        title: "Servicio actualizado", 
        showConfirmButton: false, 
        timer: 2000 
      });
    } catch (error) {
      console.error("Error updating service:", error);
      Swal.fire("Error", `No se pudo actualizar el servicio de ${paciente.name}.`, "error");
    }
  };

  const getServiceValue = useCallback((types = []) => {
    const hasC = types.includes("clinical");
    const hasG = types.includes("grooming");
    if (hasC && hasG) return "both";
    if (hasC) return "clinical";
    if (hasG) return "grooming";
    return "none";
  }, []);

  const handleDelete = async (paciente) => {
    const result = await Swal.fire({
      title: `¿Eliminar a ${paciente.name}?`,
      text: "Se eliminará el paciente y el vínculo con su tutor.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });
    
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "pacientes", paciente.id));
        
        if (paciente.tutorId) {
          const tutorRef = doc(db, "tutores", paciente.tutorId);
          await updateDoc(tutorRef, { pacienteIds: arrayRemove(paciente.id) });
          await recalculateTutorServiceTypes(paciente.tutorId);
        }
        
        // Invalidate cache and refresh
        pacientesCache = null;
        cacheTimestamp = null;
        
        Swal.fire("Eliminado", `${paciente.name} ha sido eliminado.`, "success");
        fetchPacientes(true);
      } catch (error) {
        console.error("Error deleting paciente:", error);
        Swal.fire("Error", `No se pudo eliminar a ${paciente.name}.`, "error");
      }
    }
  };

  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setCurrentPage(1);
  }, []);

  const handleCardClick = useCallback((pacienteId) => {
    navigate(`/admin/paciente-profile/${pacienteId}`);
  }, [navigate]);

  return (
    <div className="patient-list">
      <div className="patient-list__header">
        <h1>Gestión de Pacientes</h1>
        <Link to="/admin/add-paciente" className="patient-list__btn patient-list__btn--primary">
          <FaPlus /> Agregar Paciente
        </Link>
      </div>

      <div className="patient-list__filters">
        <div className="patient-list__filter-group">
          <input
            type="text"
            placeholder="Buscar por nombre, tutor, especie o chip..."
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
        </div>
        <div className="patient-list__filter-group">
          <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="tutor_asc">Tutor (A-Z)</option>
          </select>
        </div>
        <div className="patient-list__filter-group">
          <label htmlFor="serviceType">Filtrar por Servicio</label>
          <select id="serviceType" name="serviceType" value={filters.serviceType} onChange={handleFilterChange}>
            <option value="todos">Todos</option>
            <option value="clinical">Clínica</option>
            <option value="grooming">Peluquería</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div className="patient-list__filter-group patient-list__filter-group--checkbox">
          <input type="checkbox" id="showFallecidos" name="showFallecidos" checked={filters.showFallecidos} onChange={handleFilterChange} />
          <label htmlFor="showFallecidos">Mostrar fallecidos</label>
        </div>
      </div>

      {isLoading ? (
        <p className="patient-list__message">Cargando...</p>
      ) : (
        <>
          <div className="patient-list__grid">
            {currentItems.map((p) => (
              <PacienteCard
                key={p.id}
                paciente={p}
                onCardClick={handleCardClick}
                onServiceChange={handleServiceChange}
                onDelete={handleDelete}
                getServiceValue={getServiceValue}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="patient-list__pagination">
              <button 
                className="patient-list__btn" 
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                className="patient-list__btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Memoized card component to prevent unnecessary re-renders
const PacienteCard = React.memo(({ paciente, onCardClick, onServiceChange, onDelete, getServiceValue }) => {
  const handleClick = useCallback(() => {
    onCardClick(paciente.id);
  }, [paciente.id, onCardClick]);

  const handleServiceChangeLocal = useCallback((e) => {
    e.stopPropagation();
    onServiceChange(paciente, e.target.value);
  }, [paciente, onServiceChange]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    onDelete(paciente);
  }, [paciente, onDelete]);

  return (
    <div
      className={`patient-list__card ${paciente.fallecido ? "patient-list__card--fallecido" : ""}`}
      onClick={handleClick}
    >
      <div className="patient-list__card-header">
        <div className="patient-list__avatar">
          {paciente.species?.toLowerCase().includes("canino") ? <FaDog /> : <FaCat />}
        </div>
        <div className="patient-list__info">
          <p className="patient-list__name">
            <Link 
              className="patient-list__link"
              to={`/admin/paciente-profile/${paciente.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {paciente.name}
            </Link>
          </p>
          <p className="patient-list__breed">{paciente.breed || paciente.species}</p>
        </div>
        {paciente.fallecido && <span className="patient-list__fallecido-tag">Fallecido</span>}
      </div>

      <div className="patient-list__card-body">
        <p className="patient-list__tutor-link">
          Tutor:{" "}
          {paciente.tutorId ? (
            <Link 
              className="patient-list__link"
              to={`/admin/tutor-profile/${paciente.tutorId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {paciente.tutorName || "Ver tutor"}
            </Link>
          ) : (
            paciente.tutorName || "Sin tutor"
          )}
        </p>
      </div>

      <div className="patient-list__card-actions">
        <div className="patient-list__service-selector" onClick={(e) => e.stopPropagation()}>
          <MdMiscellaneousServices />
          <select
            value={getServiceValue(paciente.serviceTypes || [])}
            onChange={handleServiceChangeLocal}
            className="patient-list__service-dropdown"
          >
            <option value="none">Ninguno</option>
            <option value="clinical">Clínica</option>
            <option value="grooming">Peluquería</option>
            <option value="both">Ambos</option>
          </select>
        </div>

        <Link
          to={`/admin/edit-paciente/${paciente.id}`}
          className="patient-list__btn patient-list__btn--edit"
          onClick={(e) => e.stopPropagation()}
        >
          <CiEdit />
        </Link>

        <button
          onClick={handleDeleteClick}
          className="patient-list__btn patient-list__btn--delete"
        >
          <MdDeleteOutline />
        </button>
      </div>
    </div>
  );
});

PacienteCard.displayName = 'PacienteCard';

export default VerPacientes;