import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Swal from "sweetalert2";
import { FaPlus, FaDog, FaStethoscope } from "react-icons/fa";
import { FaUserLarge } from "react-icons/fa6";
import { CiEdit } from "react-icons/ci";
import { MdDeleteOutline } from "react-icons/md";
import { PiBathtub } from "react-icons/pi";

const VerTutores = () => {
  const [tutores, setTutores] = useState([]);
  const [filteredTutores, setFilteredTutores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortOrder: "name_asc",
    serviceType: "todos",
    showOnlyDebtors: false,
  });
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchTutores = useCallback(async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "tutores"));
      const tutorsList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTutores(tutorsList);
    } catch {
      Swal.fire("Error", "No se pudieron cargar los tutores.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTutores();
  }, [fetchTutores]);

  useEffect(() => {
    let filtered = [...tutores];

    if (filters.serviceType !== "todos") {
      filtered = filtered.filter((t) => {
        const services = t.serviceTypes || [];
        if (filters.serviceType === "clinical")
          return services.includes("clinical");
        if (filters.serviceType === "grooming")
          return services.includes("grooming");
        if (filters.serviceType === "both")
          return services.includes("clinical") && services.includes("grooming");
        return true;
      });
    }

    if (filters.showOnlyDebtors) {
      filtered = filtered.filter((t) => (t.accountBalance || 0) < 0);
    }

    const term = filters.searchTerm.toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (t) =>
          t.name?.toLowerCase().includes(term) ||
          t.email?.toLowerCase().includes(term) ||
          t.dni?.includes(term) ||
          t.phone?.includes(term)
      );
    }

    filtered.sort((a, b) => {
      const balanceA = a.accountBalance || 0;
      const balanceB = b.accountBalance || 0;

      switch (filters.sortOrder) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        case "newest":
          return (
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
          );
        case "debt_asc":
          return balanceA - balanceB;
        case "debt_desc":
          return balanceB - balanceA;
        default:
          return 0;
      }
    });

    setFilteredTutores(filtered);
  }, [filters, tutores]);

  const handleDelete = async (tutorId, tutorName) => {
    const result = await Swal.fire({
      title: `¿Eliminar a ${tutorName}?`,
      text: "Esta acción no se puede deshacer. Los pacientes asociados NO serán eliminados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tutores", tutorId));
        Swal.fire("Eliminado", `${tutorName} ha sido eliminado.`, "success");
        fetchTutores();
      } catch {
        Swal.fire("Error", `No se pudo eliminar a ${tutorName}.`, "error");
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFilters((prev) => ({ ...prev, [name]: newValue }));
    setCurrentPage(1);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTutores.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTutores.length / itemsPerPage);

  return (
    <div className="presential-container">
      <div className="page-header">
        <h1>Gestión de Tutores</h1>
        <Link to="/admin/add-tutor" className="btn btn-primary">
          <FaPlus /> Agregar Tutor
        </Link>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, email o teléfono..."
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
        </div>
        <div className="filter-group">
          <select
            name="sortOrder"
            value={filters.sortOrder}
            onChange={handleFilterChange}
          >
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="debt_desc">Deuda (Menor a Mayor)</option>
            <option value="debt_asc">Deuda (Mayor a Menor)</option>
            <option value="newest">Más nuevos</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="serviceType">Filtrar por Servicio</label>
          <select
            id="serviceType"
            name="serviceType"
            value={filters.serviceType}
            onChange={handleFilterChange}
          >
            <option value="todos">Todos</option>
            <option value="clinical">Clínica</option>
            <option value="grooming">Peluquería</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div className="filter-group checkbox-group">
          <input
            type="checkbox"
            id="showOnlyDebtors"
            name="showOnlyDebtors"
            checked={filters.showOnlyDebtors}
            onChange={handleFilterChange}
          />
          <label htmlFor="showOnlyDebtors">Ver Solo Deudores</label>
        </div>
      </div>

      {isLoading ? (
        <p className="loading-message">Cargando...</p>
      ) : (
        <>
          <div className="tutor-cards-grid">
            {currentItems.map((tutor) => (
              <div
                key={tutor.id}
                className="tutor-card"
                onClick={() => navigate(`/admin/tutor-profile/${tutor.id}`)}
              >
                <div className="tutor-card-header">
                  <div className="tutor-avatar">
                    <FaUserLarge />
                  </div>
                  <div className="tutor-info">
                    <p className="tutor-name">
                      <Link
                        className="link-class"
                        to={`/admin/tutor-profile/${tutor.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tutor.name}
                      </Link>
                    </p>
                    <p className="tutor-contact">
                      {tutor.phone || tutor.email || "Sin contacto"}
                    </p>
                  </div>
                </div>

                <div className="tutor-card-body">
                  <div className="info-chip">
                    <FaDog />
                    <span>{tutor.pacientesIds?.length || 0} Pacientes</span>
                  </div>
                  <div
                    className={`info-chip balance ${
                      tutor.accountBalance < 0 ? "deudor" : ""
                    }`}
                  >
                    <span>${tutor.accountBalance?.toFixed?.(2) || "0.00"}</span>
                  </div>
                  {tutor.serviceTypes && tutor.serviceTypes.length > 0 && (
                    <div className="service-chips-container">
                      {tutor.serviceTypes.includes("clinical") && (
                        <div className="service-chip clinical">
                          <FaStethoscope />
                          <span>Clínica</span>
                        </div>
                      )}
                      {tutor.serviceTypes.includes("grooming") && (
                        <div className="service-chip grooming">
                          <PiBathtub />
                          <span>Peluquería</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="tutor-card-actions">
                  <Link
                    to={`/admin/edit-tutor/${tutor.id}`}
                    className="btn btn-edit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CiEdit />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tutor.id, tutor.name);
                    }}
                    className="btn btn-delete"
                  >
                    <MdDeleteOutline />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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

export default VerTutores;
