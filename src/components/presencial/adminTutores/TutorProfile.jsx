import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  increment,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { FaDog, FaCat, FaStethoscope, FaMoneyBillWave, FaExclamationTriangle, FaEllipsisV, FaTrash } from "react-icons/fa";
import { PiBathtub } from "react-icons/pi";
import LoaderSpinner from "../../utils/LoaderSpinner";
import SaleDetailModal from "../../administracion/SaleDetailModal";
import AddDebtModal from "./AddDebtModal";
import PaySaleDebtModal from "../../administracion/PaySaleDebtModal";
import SimpleAppointmentModal from "../agenda/SimpleAppointmentModal";
import { emitRecibosForSales, generateRecibosPDF } from "../../../services/reciboService";
import { exportComprasPDF, exportComprasExcel } from "../../../services/comprasReportService";
import { getNextComprobanteNumber } from "../../../services/comprobanteService";

const PaymentModal = ({ tutor, onClose, onPaymentSuccess, setAlertInfo }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      setAlertInfo({ title: "Error", text: "Ingrese un monto válido.", type: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      // Número de recibo (R…): el cobro de deuda es un recibo de pago.
      const { numero: reciboNumero, code: comprobante } = await getNextComprobanteNumber("recibos");

      const batch = writeBatch(db);
      const paymentRef = doc(collection(db, "cobros_deuda"));
      batch.set(paymentRef, {
        tutorId: tutor.id,
        tutorName: tutor.name,
        amount: paymentAmount,
        paymentMethod,
        numero: reciboNumero,
        comprobante,
        createdAt: serverTimestamp(),
        type: "Cobro Deuda",
      });
      const tutorRef = doc(db, "tutores", tutor.id);
      batch.update(tutorRef, { accountBalance: increment(paymentAmount) });
      await batch.commit();
      onPaymentSuccess();
      setAlertInfo({ title: "Éxito", text: "Pago registrado correctamente.", type: "success" });
    } catch (error) {
      setAlertInfo({ title: "Error", text: "No se pudo registrar el pago.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        <h3>Registrar Pago para {tutor.name}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Monto a Pagar</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Método de Pago</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta de Débito</option>
              <option>Tarjeta de Crédito</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CustomAlert = ({ title, text, type, onClose }) => {
  const icon = type === "error" ? "!" : "✓";
  return (
    <div className="custom-alert-overlay">
      <div className="custom-alert-content">
        <div className={`icon-circle ${type}`}>{icon}</div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="custom-alert-actions">
          <button className="btn btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};

const ConfirmAlert = ({ title, text, onConfirm, onCancel }) => {
  return (
    <div className="custom-alert-overlay">
      <div className="custom-alert-content">
        <div className="icon-circle error">!</div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="custom-alert-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
};

const TransactionMenu = ({ transaction, onDelete }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="transaction-menu-wrapper" ref={menuRef}>
      <button
        className="btn-icon-dots"
        onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }}
      >
        <FaEllipsisV />
      </button>
      {open && (
        <div className="transaction-dropdown">
          <button
            className="transaction-dropdown-item danger"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(transaction); }}
          >
            <FaTrash /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
};

const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [recibos, setRecibos] = useState([]);
  const [selectedSaleIds, setSelectedSaleIds] = useState(() => new Set());
  const [isEmittingReceipts, setIsEmittingReceipts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("cuenta");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isSimpleAppointmentOpen, setIsSimpleAppointmentOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleToPayDebt, setSaleToPayDebt] = useState(null);

  const [citasFilters, setCitasFilters] = useState({ startDate: "", endDate: "", serviceType: "todos" });
  const [salesFilters, setSalesFilters] = useState({ searchTerm: "", startDate: "", endDate: "", paymentStatus: "all" });
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const SALES_PER_PAGE = 5;

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const tutorRef = doc(db, "tutores", id);
      const tutorSnap = await getDoc(tutorRef);
      if (!tutorSnap.exists()) {
        setAlertInfo({ title: "Error", text: "Tutor no encontrado.", type: "error" });
        setTimeout(() => navigate("/admin/tutores"), 2000);
        return;
      }
      const tutorData = { id: tutorSnap.id, ...tutorSnap.data() };
      setTutor(tutorData);

      const [pacientesSnap, salesSnap, paymentsSnap, citasSnap, groomingSnap, adjustmentsSnap, recibosSnap] = await Promise.all([
        getDocs(query(collection(db, "pacientes"), where("tutorId", "==", id))),
        getDocs(query(collection(db, "ventas_presenciales"), where("tutorInfo.id", "==", id))),
        getDocs(query(collection(db, "cobros_deuda"), where("tutorId", "==", id))),
        getDocs(query(collection(db, "citas"), where("tutorId", "==", id))),
        getDocs(query(collection(db, "turnos_peluqueria"), where("tutorId", "==", id))),
        getDocs(query(collection(db, "ajustes_cuenta"), where("tutorId", "==", id))),
        getDocs(query(collection(db, "recibos"), where("tutorId", "==", id))),
      ]);

      setPacientes(pacientesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const clinicalAppointments = citasSnap.docs.map((d) => ({ ...d.data(), id: d.id, appointmentType: "clinical", startTime: d.data().startTime.toDate() }));
      const groomingAppointments = groomingSnap.docs.map((d) => ({ ...d.data(), id: d.id, appointmentType: "grooming", startTime: d.data().startTime.toDate() }));
      setAllAppointments([...clinicalAppointments, ...groomingAppointments].sort((a, b) => b.startTime - a.startTime));

      const sales = salesSnap.docs.map((d) => ({ ...d.data(), id: d.id, type: "Venta Presencial" }));
      setSalesHistory(sales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));

      const payments = paymentsSnap.docs.map((d) => ({ ...d.data(), id: d.id, type: "Cobro Deuda" }));
      const adjustments = adjustmentsSnap.docs.map((d) => ({ ...d.data(), id: d.id, type: d.data().type || "Ajuste Manual" }));

      setAccountTransactions([...sales, ...payments, ...adjustments].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));

      const recibosList = recibosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecibos(recibosList.sort((a, b) => (b.numero || 0) - (a.numero || 0)));
    } catch (error) {
      setAlertInfo({ title: "Error", text: "No se pudieron cargar los datos del tutor.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleCitasFilterChange = (e) => { const { name, value } = e.target; setCitasFilters((prev) => ({ ...prev, [name]: value })); };
  const handleSalesFilterChange = (e) => { const { name, value } = e.target; setSalesFilters((prev) => ({ ...prev, [name]: value })); };

  const filteredAppointments = useMemo(() => {
    let filtered = [...allAppointments];
    if (citasFilters.serviceType !== "todos") { filtered = filtered.filter((a) => a.appointmentType === citasFilters.serviceType); }
    if (citasFilters.startDate) { const start = new Date(citasFilters.startDate); start.setHours(0, 0, 0, 0); filtered = filtered.filter((a) => a.startTime >= start); }
    if (citasFilters.endDate) { const end = new Date(citasFilters.endDate); end.setHours(23, 59, 59, 999); filtered = filtered.filter((a) => a.startTime <= end); }
    return filtered;
  }, [allAppointments, citasFilters]);

  const getPaymentStatus = (sale) => {
    const totalPaid = (sale.payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const debtPaid = (sale.debtPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPayments = totalPaid + debtPaid;
    const currentDebt = sale.total - totalPayments;
    if (currentDebt === 0 || Math.abs(currentDebt) < 0.01) return "paid";
    if (totalPayments === 0 || Math.abs(totalPayments) < 0.01) return "unpaid";
    if (currentDebt > 0 && totalPayments > 0) return "partial";
    return "paid";
  };

  const filteredSalesHistory = useMemo(() => {
    let filtered = [...salesHistory];
    if (salesFilters.startDate) { const start = new Date(salesFilters.startDate); start.setHours(0, 0, 0, 0); filtered = filtered.filter((s) => s.createdAt.toDate() >= start); }
    if (salesFilters.endDate) { const end = new Date(salesFilters.endDate); end.setHours(23, 59, 59, 999); filtered = filtered.filter((s) => s.createdAt.toDate() <= end); }
    if (salesFilters.searchTerm) { const term = salesFilters.searchTerm.toLowerCase(); filtered = filtered.filter((s) => (s.items || []).some((item) => item.name.toLowerCase().includes(term))); }
    if (salesFilters.paymentStatus !== "all") { filtered = filtered.filter((s) => getPaymentStatus(s) === salesFilters.paymentStatus); }
    return filtered;
  }, [salesHistory, salesFilters]);

  useEffect(() => { setSalesCurrentPage(1); }, [filteredSalesHistory]);

  const handleStartSale = () => { navigate("/admin/vender", { state: { tutor: { id: tutor.id, name: tutor.name } } }); };

  const handlePaymentComplete = () => { fetchAllData(); setSaleToPayDebt(null); };

  const handleDeleteAdjustment = (transaction) => {
    setConfirmDelete(transaction);
  };

  const confirmDeleteAdjustment = async () => {
    const transaction = confirmDelete;
    setConfirmDelete(null);
    try {
      const batch = writeBatch(db);
      const adjustmentRef = doc(db, "ajustes_cuenta", transaction.id);
      batch.delete(adjustmentRef);
      const tutorRef = doc(db, "tutores", tutor.id);
      batch.update(tutorRef, { accountBalance: increment(transaction.amount) });
      await batch.commit();
      fetchAllData();
      setAlertInfo({ title: "Éxito", text: "Ajuste de deuda eliminado correctamente.", type: "success" });
    } catch (error) {
      setAlertInfo({ title: "Error", text: "No se pudo eliminar el ajuste.", type: "error" });
    }
  };

  const paidSalesInView = useMemo(
    () => filteredSalesHistory.filter((s) => getPaymentStatus(s) === "paid"),
    [filteredSalesHistory]
  );
  const allPaidSelected = paidSalesInView.length > 0 && paidSalesInView.every((s) => selectedSaleIds.has(s.id));

  const toggleSaleSelection = (saleId) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId); else next.add(saleId);
      return next;
    });
  };

  const toggleSelectAllPaid = () => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (paidSalesInView.every((s) => prev.has(s.id))) paidSalesInView.forEach((s) => next.delete(s.id));
      else paidSalesInView.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleEmitReceipts = async () => {
    const sales = salesHistory.filter((s) => selectedSaleIds.has(s.id));
    if (sales.length === 0) return;
    setIsEmittingReceipts(true);
    try {
      const created = await emitRecibosForSales({ id: tutor.id, name: tutor.name }, sales);
      await generateRecibosPDF(created, tutor);
      setSelectedSaleIds(new Set());
      setAlertInfo({ title: "Éxito", text: `${created.length} recibo(s) emitido(s) correctamente.`, type: "success" });
      fetchAllData();
    } catch (error) {
      console.error("Error emitting receipts:", error);
      setAlertInfo({ title: "Error", text: "No se pudieron emitir los recibos.", type: "error" });
    } finally {
      setIsEmittingReceipts(false);
    }
  };

  const handleReprintRecibo = async (recibo) => {
    try { await generateRecibosPDF([recibo], tutor); }
    catch (error) { setAlertInfo({ title: "Error", text: "No se pudo generar el recibo.", type: "error" }); }
  };

  const handleExportCompras = async (format) => {
    if (filteredSalesHistory.length === 0) {
      setAlertInfo({ title: "Sin datos", text: "No hay compras para exportar con los filtros actuales.", type: "error" });
      return;
    }
    setIsExporting(true);
    try {
      if (format === "excel") await exportComprasExcel(tutor, filteredSalesHistory);
      else await exportComprasPDF(tutor, filteredSalesHistory);
    } catch (error) {
      console.error("Error exporting:", error);
      setAlertInfo({ title: "Error", text: "No se pudo exportar el reporte.", type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return (<div className="loading-message"><LoaderSpinner /><p>Cargando perfil del tutor...</p></div>);
  if (!tutor) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case "pacientes":
        return (
          <div className="tab-content">
            {pacientes.length > 0 ? (
              pacientes.map((p) => (
                <div key={p.id} className={`paciente-card-profile ${p.fallecido ? "fallecido" : ""}`} onClick={() => navigate(`/admin/paciente-profile/${p.id}`)}>
                  {p.species?.toLowerCase().includes("perro") || p.species?.toLowerCase().includes("canino") ? <FaDog /> : <FaCat />}
                  <div>
                    <p className="paciente-name">{p.name}{p.fallecido && (<span className="fallecido-tag" style={{ marginLeft: "10px" }}>Fallecido</span>)}</p>
                    <p className="paciente-breed">{p.breed || p.species}</p>
                  </div>
                </div>
              ))
            ) : (<p>No hay pacientes.</p>)}
          </div>
        );

      case "citas":
        return (
          <div className="tab-content">
            <div className="citas-controls">
              <select name="serviceType" value={citasFilters.serviceType} onChange={handleCitasFilterChange}>
                <option value="todos">Todos los Servicios</option>
                <option value="clinical">Clínica</option>
                <option value="grooming">Peluquería</option>
              </select>
              <input type="date" name="startDate" value={citasFilters.startDate} onChange={handleCitasFilterChange} />
              <input type="date" name="endDate" value={citasFilters.endDate} onChange={handleCitasFilterChange} />
            </div>
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((c) => (
                <div key={c.id} className="cita-card">
                  <p><strong>Paciente:</strong> {c.pacienteName}</p>
                  <p><strong>Fecha:</strong> {c.startTime.toLocaleString("es-AR")}</p>
                  <p><strong>Servicios:</strong> {c.appointmentType === "clinical" ? c.services?.map((s) => s.nombre || s.name).join(", ") || "Consulta" : c.services?.map((s) => s.name).join(", ") || "Servicio Peluquería"}</p>
                </div>
              ))
            ) : (<p>No hay citas para los filtros seleccionados.</p>)}
          </div>
        );

      case "compras": {
        const totalSalesPages = Math.ceil(filteredSalesHistory.length / SALES_PER_PAGE);
        const currentSales = filteredSalesHistory.slice((salesCurrentPage - 1) * SALES_PER_PAGE, salesCurrentPage * SALES_PER_PAGE);
        return (
          <div className="tab-content">
            <div className="compras-controls">
              <input type="text" name="searchTerm" placeholder="Buscar por producto..." value={salesFilters.searchTerm} onChange={handleSalesFilterChange} />
              <input type="date" name="startDate" value={salesFilters.startDate} onChange={handleSalesFilterChange} />
              <input type="date" name="endDate" value={salesFilters.endDate} onChange={handleSalesFilterChange} />
              <select name="paymentStatus" value={salesFilters.paymentStatus} onChange={handleSalesFilterChange}>
                <option value="all">Todos los Estados</option>
                <option value="paid">Pagado</option>
                <option value="partial">Pago Parcial</option>
                <option value="unpaid">Sin Pagar</option>
              </select>
              <button className="btn btn-secondary" onClick={() => handleExportCompras("pdf")} disabled={isExporting}>Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => handleExportCompras("excel")} disabled={isExporting}>Exportar Excel</button>
            </div>
            {paidSalesInView.length > 0 && (
              <div className="recibos-selection-bar">
                <label className="recibos-select-all">
                  <input type="checkbox" checked={allPaidSelected} onChange={toggleSelectAllPaid} />
                  Seleccionar pagas ({paidSalesInView.length})
                </label>
                <span className="recibos-selected-count">{selectedSaleIds.size} seleccionada(s)</span>
                <button className="btn btn-primary" onClick={handleEmitReceipts} disabled={selectedSaleIds.size === 0 || isEmittingReceipts}>
                  {isEmittingReceipts ? "Emitiendo..." : "Emitir recibos"}
                </button>
              </div>
            )}
            <div className="compras-list">
              {currentSales.length > 0 ? (
                currentSales.map((sale) => {
                  const productPreview = (sale.items && sale.items.length > 0) ? `${sale.items[0].name}${sale.items.length > 1 ? ` y ${sale.items.length - 1} más...` : ""}` : "Venta sin items.";
                  const totalPaid = (sale.payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
                  const debtPaid = (sale.debtPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
                  const totalPayments = totalPaid + debtPaid;
                  const currentDebt = sale.total - totalPayments;
                  const paymentStatus = currentDebt === 0 || Math.abs(currentDebt) < 0.01 ? "paid" : totalPayments === 0 || Math.abs(totalPayments) < 0.01 ? "unpaid" : "partial";
                  const hasDebt = currentDebt > 0.01;
                  return (
                    <div key={sale.id} className={`compra-card ${paymentStatus === "unpaid" ? "unpaid" : ""} ${paymentStatus === "partial" ? "partial-payment" : ""}`}>
                      <div className="compra-card-left">
                        {paymentStatus === "paid" && (
                          <input
                            type="checkbox"
                            className="compra-select-checkbox"
                            checked={selectedSaleIds.has(sale.id)}
                            onChange={() => toggleSaleSelection(sale.id)}
                            title="Seleccionar para emitir recibo"
                          />
                        )}
                        <div className="compra-info">
                          <span className="date">{sale.createdAt.toDate().toLocaleDateString("es-AR")}{sale.comprobante ? ` · ${sale.comprobante}` : ""}</span>
                          <span className="products-preview">{productPreview}</span>
                          {hasDebt && (
                            <div className="sale-debt-indicator">
                              <FaExclamationTriangle />
                              <span>
                                {paymentStatus === "unpaid" && "Sin Pagar"}
                                {paymentStatus === "partial" && `Deuda: $${currentDebt.toFixed(2)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="compra-actions">
                        <span className="total">${sale.total.toFixed(2)}</span>
                        {hasDebt && (
                          <button className="btn btn-pay-debt" onClick={(e) => { e.stopPropagation(); setSaleToPayDebt(sale); }}>
                            <FaMoneyBillWave /> Pagar
                          </button>
                        )}
                        <button className="btn btn-secondary" onClick={() => setSelectedSale(sale)}>Ver Detalle</button>
                      </div>
                    </div>
                  );
                })
              ) : (<p>No hay compras registradas.</p>)}
            </div>
            {totalSalesPages > 1 && (
              <div className="pagination-controls">
                <button onClick={() => setSalesCurrentPage((p) => p - 1)} disabled={salesCurrentPage === 1} className="btn">Anterior</button>
                <span>Página {salesCurrentPage} de {totalSalesPages}</span>
                <button onClick={() => setSalesCurrentPage((p) => p + 1)} disabled={salesCurrentPage === totalSalesPages} className="btn">Siguiente</button>
              </div>
            )}
          </div>
        );
      }

      case "recibos":
        return (
          <div className="tab-content">
            <div className="recibos-list">
              {recibos.length > 0 ? (
                recibos.map((r) => (
                  <div key={r.id} className="recibo-card">
                    <div className="recibo-info">
                      <span className="recibo-numero">{r.comprobante}</span>
                      <span className="recibo-concept">{r.concept}</span>
                      <span className="recibo-date">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("es-AR") : "N/A"}{r.saleComprobante ? ` · Venta ${r.saleComprobante}` : ""}</span>
                    </div>
                    <div className="recibo-actions">
                      <span className="recibo-amount">${(r.amount || 0).toFixed(2)}</span>
                      <button className="btn btn-secondary" onClick={() => handleReprintRecibo(r)}>Reimprimir</button>
                    </div>
                  </div>
                ))
              ) : (<p>No hay recibos emitidos.</p>)}
            </div>
          </div>
        );

      case "cuenta":
        return (
          <div className="tutor-profile-tab-content">
            <div className="tutor-account-summary">
              <div className="tutor-balance-card">
                <h3>Saldo Actual</h3>
                <p className={`balance-amount ${tutor.accountBalance < 0 ? "deudor" : ""}`}>${(tutor.accountBalance || 0).toFixed(2)}</p>
              </div>
              <div className="account-actions">
                <button className="btn btn-success" onClick={() => setIsPaymentModalOpen(true)}>+ Registrar Pago</button>
                <button className="btn btn-danger" onClick={() => setIsDebtModalOpen(true)}>- Agregar Deuda</button>
              </div>
            </div>
            <h4>Historial de Transacciones</h4>
            <div className="tutor-transactions-list">
              {accountTransactions.map((t) => (
                <div key={t.id} className={`transaction-item ${t.type.toLowerCase().replace(/ /g, "-")}`}>
                  <div className="transaction-info">
                    <span className="date">{t.createdAt.toDate().toLocaleDateString("es-AR")}</span>
                    <span className="type">
                      {t.type === "Venta Presencial"
                        ? `Venta ${t.comprobante || `#${t.id.substring(0, 6)}`}`
                        : t.type === "Cobro Deuda"
                        ? `Pago con ${t.paymentMethod}`
                        : `${t.type} (${t.reason || "S/M"})`}
                    </span>
                  </div>
                  <div className="transaction-amount">
                    {t.type === "Venta Presencial" ? (
                      <span className="debit">- ${(t.debt || 0).toFixed(2)}</span>
                    ) : t.type === "Cobro Deuda" ? (
                      <span className="credit">+ ${(t.amount || 0).toFixed(2)}</span>
                    ) : (
                      <span className="debit">- ${(t.amount || 0).toFixed(2)}</span>
                    )}
                  </div>
                  {t.type === "Ajuste Manual - Deuda" && (
                    <TransactionMenu transaction={t} onDelete={handleDeleteAdjustment} />
                  )}
                </div>
              ))}
              {accountTransactions.length === 0 && <p>No hay transacciones.</p>}
            </div>
          </div>
        );

      default:
        return (
          <div className="tab-content details-grid">
            <div className="detail-item"><span>DNI</span><p>{tutor.dni || "N/A"}</p></div>
            <div className="detail-item"><span>Email</span><p>{tutor.email || "N/A"}</p></div>
            <div className="detail-item"><span>Tel. Principal</span><p>{tutor.phone || "N/A"}</p></div>
            <div className="detail-item"><span>Tel. Secundario</span><p>{tutor.secondaryPhone || "N/A"}</p></div>
            <div className="detail-item full-width"><span>Dirección</span><p>{tutor.address || "N/A"}</p></div>
            <hr className="full-width" />
            <div className="detail-item"><span>Razón Social</span><p>{tutor.billingInfo?.razonSocial || "N/A"}</p></div>
            <div className="detail-item"><span>CUIT/CUIL</span><p>{tutor.billingInfo?.cuit || "N/A"}</p></div>
            <div className="detail-item"><span>Cond. Fiscal</span><p>{tutor.billingInfo?.condicionFiscal || "N/A"}</p></div>
          </div>
        );
    }
  };

  return (
    <div className="profile-container">
      {alertInfo && <CustomAlert {...alertInfo} onClose={() => setAlertInfo(null)} />}
      {confirmDelete && (
        <ConfirmAlert
          title="Eliminar Ajuste"
          text={`¿Estás seguro de que querés eliminar la deuda de $${confirmDelete.amount.toFixed(2)} (${confirmDelete.reason || "S/M"})? Esta acción revertirá el saldo.`}
          onConfirm={confirmDeleteAdjustment}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {isPaymentModalOpen && (
        <PaymentModal tutor={tutor} onClose={() => setIsPaymentModalOpen(false)} onPaymentSuccess={() => { setIsPaymentModalOpen(false); fetchAllData(); }} setAlertInfo={setAlertInfo} />
      )}
      {isDebtModalOpen && (
        <AddDebtModal tutor={tutor} onClose={() => setIsDebtModalOpen(false)} onDebtAdded={() => { setIsDebtModalOpen(false); fetchAllData(); }} setAlertInfo={setAlertInfo} />
      )}
      {selectedSale && <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
      {saleToPayDebt && (
        <PaySaleDebtModal sale={saleToPayDebt} onClose={() => setSaleToPayDebt(null)} onPaymentComplete={handlePaymentComplete} />
      )}
      <SimpleAppointmentModal
        isOpen={isSimpleAppointmentOpen}
        onClose={() => setIsSimpleAppointmentOpen(false)}
        onSave={() => setIsSimpleAppointmentOpen(false)}
        tutor={{ id: tutor.id, name: tutor.name }}
      />
      <div className="profile-header">
        <div className="profile-avatar">👤</div>
        <div className="profile-info">
          <h1>{tutor.name}</h1>
          <p>{tutor.email}</p>
          {tutor.serviceTypes && tutor.serviceTypes.length > 0 && (
            <div className="service-chips-container">
              {tutor.serviceTypes.includes("clinical") && (<div className="service-chip clinical"><FaStethoscope /><span>Clínica</span></div>)}
              {tutor.serviceTypes.includes("grooming") && (<div className="service-chip grooming"><PiBathtub /><span>Peluquería</span></div>)}
            </div>
          )}
        </div>
        <div className="profile-actions">
          <button className="btn btn-primary" onClick={handleStartSale}>Vender</button>
          <button className="btn" onClick={() => setIsSimpleAppointmentOpen(true)}>+ Agendar Turno</button>
          <Link to={`/admin/edit-tutor/${tutor.id}`} className="btn btn-secondary">Editar Tutor</Link>
          <button className="btn" onClick={() => navigate(`/admin/add-paciente?tutorId=${id}`)}>+ Paciente</button>
        </div>
      </div>
      <div className="profile-nav">
        <button className={activeTab === "details" ? "active" : ""} onClick={() => setActiveTab("details")}>Detalles</button>
        <button className={activeTab === "pacientes" ? "active" : ""} onClick={() => setActiveTab("pacientes")}>Pacientes ({pacientes.length})</button>
        <button className={activeTab === "citas" ? "active" : ""} onClick={() => setActiveTab("citas")}>Citas</button>
        <button className={activeTab === "compras" ? "active" : ""} onClick={() => setActiveTab("compras")}>Historial de Compras</button>
        <button className={activeTab === "recibos" ? "active" : ""} onClick={() => setActiveTab("recibos")}>Recibos ({recibos.length})</button>
        <button className={activeTab === "cuenta" ? "active" : ""} onClick={() => setActiveTab("cuenta")}>Cuenta Corriente</button>
      </div>
      <div className="profile-content">{renderTabContent()}</div>
    </div>
  );
};

export default TutorProfile;