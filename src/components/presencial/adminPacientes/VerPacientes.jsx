import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc, updateDoc, arrayRemove, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Swal from "sweetalert2";
import { FaCat, FaDog, FaPlus } from "react-icons/fa";
import { CiEdit } from "react-icons/ci";
import { MdDeleteOutline, MdMiscellaneousServices } from "react-icons/md";

const VerPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ searchTerm: "", sortOrder: "name_asc", showFallecidos: false, serviceType: "todos" });
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchPacientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "pacientes"));
      setPacientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      Swal.fire("Error", "No se pudieron cargar los pacientes.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPacientes(); }, [fetchPacientes]);

  useEffect(() => {
    let temp = [...pacientes];

    if (!filters.showFallecidos) temp = temp.filter(p => !p.fallecido);

    if (filters.serviceType !== "todos") {
      temp = temp.filter(p => {
        const services = p.serviceTypes || [];
        if (filters.serviceType === "clinical") return services.includes("clinical");
        if (filters.serviceType === "grooming") return services.includes("grooming");
        if (filters.serviceType === "both") return services.includes("clinical") && services.includes("grooming");
        return true;
      });
    }

    const term = filters.searchTerm.toLowerCase();
    if (term) {
      temp = temp.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.species?.toLowerCase().includes(term) ||
        p.tutorName?.toLowerCase().includes(term) ||
        p.chipNumber?.includes(term)
      );
    }

    temp.sort((a, b) => {
      if (filters.sortOrder === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (filters.sortOrder === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (filters.sortOrder === "tutor_asc") return (a.tutorName || "").localeCompare(b.tutorName || "");
      return 0;
    });

    setFilteredPacientes(temp);
  }, [filters, pacientes]);

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
      setPacientes(prev => prev.map(p => (p.id === paciente.id ? { ...p, serviceTypes: newTypes } : p)));
      await recalculateTutorServiceTypes(paciente.tutorId);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Servicio actualizado", showConfirmButton: false, timer: 2000 });
    } catch {
      Swal.fire("Error", `No se pudo actualizar el servicio de ${paciente.name}.`, "error");
    }
  };

  const getServiceValue = (types = []) => {
    const hasC = types.includes("clinical");
    const hasG = types.includes("grooming");
    if (hasC && hasG) return "both";
    if (hasC) return "clinical";
    if (hasG) return "grooming";
    return "none";
  };

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
        Swal.fire("Eliminado", `${paciente.name} ha sido eliminado.`, "success");
        fetchPacientes();
      } catch {
        Swal.fire("Error", `No se pudo eliminar a ${paciente.name}.`, "error");
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setCurrentPage(1);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPacientes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPacientes.length / itemsPerPage);

  return (
    <div className="presential-container">
      <div className="page-header">
        <h1>Gestión de Pacientes</h1>
        <Link to="/admin/add-paciente" className="btn btn-primary">
          <FaPlus /> Agregar Paciente
        </Link>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar por nombre, tutor, especie o chip..."
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
        </div>
        <div className="filter-group">
          <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="tutor_asc">Tutor (A-Z)</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="serviceType">Filtrar por Servicio</label>
          <select id="serviceType" name="serviceType" value={filters.serviceType} onChange={handleFilterChange}>
            <option value="todos">Todos</option>
            <option value="clinical">Clínica</option>
            <option value="grooming">Peluquería</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div className="filter-group" style={{ alignItems: "center", flex: "0 1 auto" }}>
          <input type="checkbox" id="showFallecidos" name="showFallecidos" checked={filters.showFallecidos} onChange={handleFilterChange} />
          <label htmlFor="showFallecidos">Mostrar fallecidos</label>
        </div>
      </div>

      {isLoading ? (
        <p className="loading-message">Cargando...</p>
      ) : (
        <>
          <div className="paciente-cards-grid">
            {currentItems.map((p) => (
              <div
                key={p.id}
                className={`paciente-card ${p.fallecido ? "fallecido" : ""}`}
                onClick={() => navigate(`/admin/paciente-profile/${p.id}`)}
              >
                <div className="paciente-card-header">
                  <div className="paciente-avatar">
                    {p.species?.toLowerCase().includes("canino") ? <FaDog /> : <FaCat />}
                  </div>
                  <div className="paciente-info">
                    <p className="paciente-name">
                      <Link className="link-class"
                        to={`/admin/paciente-profile/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.name}
                      </Link>
                    </p>
                    <p className="paciente-breed">{p.breed || p.species}</p>
                  </div>
                  {p.fallecido && <span className="fallecido-tag">Fallecido</span>}
                </div>

                <div className="paciente-card-body">
                  <p className="tutor-link">
                    Tutor:{" "}
                    {p.tutorId ? (
                      <Link  className="link-class"
                        to={`/admin/tutor-profile/${p.tutorId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        
                      >
                        {p.tutorName || "Ver tutor"}
                      </Link>
                    ) : (
                      p.tutorName || "Sin tutor"
                    )}
                  </p>
                </div>

                <div className="paciente-card-actions">
                  <Link
                    to={`/admin/edit-paciente/${p.id}`}
                    className="btn btn-edit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CiEdit />
                  </Link>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p);
                    }}
                    className="btn btn-delete"
                  >
                    <MdDeleteOutline />
                  </button>

                  <div className="service-type-selector" onClick={(e) => e.stopPropagation()}>
                    <MdMiscellaneousServices />
                    <select
                      value={getServiceValue(p.serviceTypes || [])}
                      onChange={(e) => handleServiceChange(p, e.target.value)}
                      className="service-type-dropdown"
                    >
                      <option value="none">Ninguno</option>
                      <option value="clinical">Clínica</option>
                      <option value="grooming">Peluquería</option>
                      <option value="both">Ambos</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
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

export default VerPacientes;
