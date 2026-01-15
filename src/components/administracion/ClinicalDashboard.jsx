import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  collectionGroup,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  FaRegCalendarAlt,
  FaBoxOpen,
  FaBell,
  FaCashRegister,
  FaPlus,
  FaUserFriends,
  FaPaw,
  FaTags,
  FaNotesMedical,
} from "react-icons/fa";
import { fetchDailyTransactions } from "../../services/cashFlowService";

const ClinicDashboard = () => {
  const [citasHoy, setCitasHoy] = useState([]);
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [vencimientosProximos, setVencimientosProximos] = useState([]);
  const [cajaSummary, setCajaSummary] = useState({
    totalEnCaja: 0,
    totalVendido: 0,
    deudaGenerada: 0,
  });
  const [recentHistory, setRecentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWidget, setExpandedWidget] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      const oneWeekFromNow = new Date(startOfDay);
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      const startTimestamp = Timestamp.fromDate(startOfDay);
      const endTimestamp = Timestamp.fromDate(endOfDay);
      const oneWeekTimestamp = Timestamp.fromDate(oneWeekFromNow);

      const citasQuery = query(
        collection(db, "citas"),
        where("startTime", ">=", startTimestamp),
        where("startTime", "<=", endTimestamp)
      );
      const pedidosQuery = query(collection(db, "pedidos"));
      const vencimientosQuery = query(
        collectionGroup(db, "vencimientos"),
        where("dueDate", ">=", startTimestamp),
        where("dueDate", "<=", oneWeekTimestamp),
        where("supplied", "==", false)
      );
      const historyQuery = query(
        collectionGroup(db, "clinical_history"),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const [
        citasSnap,
        pedidosSnap,
        vencimientosSnap,
        dailyTransactions,
        historySnap,
      ] = await Promise.all([
        getDocs(citasQuery),
        getDocs(pedidosQuery),
        getDocs(vencimientosQuery),
        fetchDailyTransactions(new Date()),
        getDocs(historyQuery),
      ]);

      setCitasHoy(
        citasSnap.docs
          .map((doc) => ({
            ...doc.data(),
            id: doc.id,
            startTime: doc.data().startTime.toDate(),
          }))
          .sort((a, b) => a.startTime - b.startTime)
      );
      setPedidosPendientes(
        pedidosSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
      );
      setVencimientosProximos(
        vencimientosSnap.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          dueDate: doc.data().dueDate.toDate(),
        }))
      );

      const summary = dailyTransactions.reduce(
        (acc, trans) => {
          if (
            trans.type === "Venta Presencial" ||
            trans.type === "Pedido Online"
          ) {
            acc.totalVendido += trans.total;
            acc.deudaGenerada += trans.debt || 0;
            (trans.payments || []).forEach(
              (p) => (acc.totalEnCaja += parseFloat(p.amount))
            );
          } else if (trans.type === "Cobro Deuda") {
            acc.totalEnCaja += trans.amount;
          }
          return acc;
        },
        { totalEnCaja: 0, totalVendido: 0, deudaGenerada: 0 }
      );
      setCajaSummary(summary);

      const historyData = await Promise.all(
        historySnap.docs.map(async (doc) => {
          const data = doc.data();
          const patientRef = doc.ref.parent.parent;
          const patientSnap = await getDoc(patientRef);
          return {
            ...data,
            id: doc.id,
            pacienteId: patientRef.id,
            pacienteName: patientSnap.exists() ? patientSnap.data().name : undefined,
            date: data.createdAt.toDate().toLocaleDateString("es-AR"),
          };
        })
      );
      setRecentHistory(historyData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleExpand = (widget) => {
    setExpandedWidget((prev) => (prev === widget ? null : widget));
  };

  const formatCurrency = (value) => {
    return value.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const scheduledOrdersCount = useMemo(
    () => pedidosPendientes.filter((p) => p.programado).length,
    [pedidosPendientes]
  );

  return (
    <div className="clinic-dashboard-container">
      <header className="dashboard-header">
        <h1>Panel de Control</h1>
        <p>
          Bienvenido. Aquí tienes un resumen de la actividad de la clínica para
          hoy.
        </p>
      </header>

      {isLoading ? (
        <p>Cargando datos del panel...</p>
      ) : (
        <main className="dashboard-grid">
          <div
            className={`dashboard-widget widget-citas ${
              expandedWidget === "citas" ? "expanded" : ""
            }`}
          >
            <div
              className="widget-header"
              onClick={() => handleToggleExpand("citas")}
            >
              <div className="header-content">
                <FaRegCalendarAlt className="widget-icon" />
                <h3>Citas del Día</h3>
              </div>
              <span className="widget-count">{citasHoy.length}</span>
            </div>
            <div className="widget-body">
              <div className="widget-content-collapsed">
                <p>
                  {citasHoy.length === 0
                    ? "No hay citas para hoy."
                    : `${citasHoy.length} ${
                        citasHoy.length === 1 ? "cita" : "citas"
                      } para hoy${
                        citasHoy[0]?.startTime
                          ? ` — primera a las ${citasHoy[0].startTime.toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""
                      }`}
                </p>
              </div>

              <div className="widget-content-expanded">
                {citasHoy.length > 0 ? (
                  citasHoy.map((cita) => (
                    <Link
                      to={`/admin/paciente-profile/${cita.pacienteId}`}
                      key={cita.id}
                      className="list-item"
                    >
                      <span className="item-time">
                        {cita.startTime.toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="item-name">{cita.pacienteName}</span>
                      <span className="item-extra">{cita.tutorName}</span>
                    </Link>
                  ))
                ) : (
                  <p className="empty-message">No hay citas para hoy.</p>
                )}
              </div>
            </div>
          </div>

          <div
            className={`dashboard-widget widget-pedidos ${
              expandedWidget === "pedidos" ? "expanded" : ""
            }`}
          >
            <div
              className="widget-header"
              onClick={() => handleToggleExpand("pedidos")}
            >
              <div className="header-content">
                <FaBoxOpen className="widget-icon" />
                <h3>Pedidos Online</h3>
              </div>
              <span className="widget-count">{pedidosPendientes.length}</span>
            </div>
            <div className="widget-body">
              <div className="widget-content-collapsed">
                <p>
                  {pedidosPendientes.length} pendientes, {scheduledOrdersCount}{" "}
                  programados
                </p>
              </div>
              <div className="widget-content-expanded">
                {pedidosPendientes.length > 0 ? (
                  pedidosPendientes.map((pedido) => (
                    <div key={pedido.id} className="list-item">
                      <span className="item-name">
                        Pedido #{pedido.id.substring(0, 6)}
                      </span>
                      <span className="item-extra">{pedido.nombre}</span>
                      <strong className="item-total">
                        ${formatCurrency(pedido.total)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="empty-message">No hay pedidos pendientes.</p>
                )}
                <Link to="/admin/handle-orders" className="widget-link">
                  Gestionar Pedidos
                </Link>
              </div>
            </div>
          </div>

          <div
            className={`dashboard-widget widget-vencimientos ${
              expandedWidget === "vencimientos" ? "expanded" : ""
            }`}
          >
            <div
              className="widget-header"
              onClick={() => handleToggleExpand("vencimientos")}
            >
              <div className="header-content">
                <FaBell className="widget-icon" />
                <h3>Vencimientos Próximos</h3>
              </div>
              <span className="widget-count">
                {vencimientosProximos.length}
              </span>
            </div>
            <div className="widget-body">
              <div className="widget-content-collapsed">
                <p>
                  {vencimientosProximos.length} vencimientos en los próximos 7
                  días
                </p>
              </div>
              <div className="widget-content-expanded">
                {vencimientosProximos.length > 0 ? (
                  vencimientosProximos.map((v) => (
                    <Link
                      to={`/admin/paciente-profile/${v.pacienteId}`}
                      key={v.id}
                      className="list-item"
                    >
                      <span className="item-name">{v.pacienteName}</span>
                      <span className="item-extra">{v.productName}</span>
                      <strong className="item-total">
                        {v.dueDate.toLocaleDateString("es-AR")}
                      </strong>
                    </Link>
                  ))
                ) : (
                  <p className="empty-message">No hay vencimientos próximos.</p>
                )}
                <Link to="/admin/monitor-vencimientos" className="widget-link">
                  Ir al Monitor
                </Link>
              </div>
            </div>
          </div>

          <div className="dashboard-widget widget-caja">
            <div className="widget-header">
              <div className="header-content">
                <FaCashRegister className="widget-icon" />
                <h3>Caja de Hoy</h3>
              </div>
            </div>
            <div className="widget-body">
              <div className="caja-summary-grid">
                <div className="caja-metric">
                  <span>Total en Caja</span>
                  <strong>${formatCurrency(cajaSummary.totalEnCaja)}</strong>
                </div>
                <div className="caja-metric">
                  <span>Total Vendido</span>
                  <strong>${formatCurrency(cajaSummary.totalVendido)}</strong>
                </div>
                <div className="caja-metric">
                  <span>Deuda Generada</span>
                  <strong>${formatCurrency(cajaSummary.deudaGenerada)}</strong>
                </div>
              </div>
              <Link to="/admin/caja-diaria" className="widget-link">
                Ver Detalle de Caja
              </Link>
            </div>
          </div>

          <div className="dashboard-widget widget-atajos">
            <div className="widget-header">
              <div className="header-content">
                <h3>Atajos Rápidos</h3>
              </div>
            </div>
            <div className="widget-body">
              <div className="atajos-grid">
                <Link to="/admin/vender" className="atajo-link">
                  <FaPlus />
                  <span>Nueva Venta</span>
                </Link>
                <Link to="/admin/tutores" className="atajo-link">
                  <FaUserFriends />
                  <span>Ver Tutores</span>
                </Link>
                <Link to="/admin/pacientes" className="atajo-link">
                  <FaPaw />
                  <span>Ver Pacientes</span>
                </Link>
                <Link to="/admin/presential-list" className="atajo-link">
                  <FaTags />
                  <span>Manejar Items</span>
                </Link>
              </div>
            </div>
          </div>

          <div
            className={`dashboard-widget widget-historial ${
              expandedWidget === "historial" ? "expanded" : ""
            }`}
          >
            <div
              className="widget-header"
              onClick={() => handleToggleExpand("historial")}
            >
              <div className="header-content">
                <FaNotesMedical className="widget-icon" />
                <h3>Historial Clínico Reciente</h3>
              </div>
              <span className="widget-count">{recentHistory.length}</span>
            </div>
            <div className="widget-body">
              <div className="widget-content-collapsed">
                <p>
                  Mostrando las {recentHistory.length} entradas más recientes.
                </p>
              </div>
              <div className="widget-content-expanded">
                {recentHistory.length > 0 ? (
                  recentHistory.map((h) => (
                    <Link
                      to={`/admin/paciente-profile/${h.pacienteId}`}
                      key={h.id}
                      className="list-item"
                    >
                      <span className="item-time">{h.date}</span>
                      <span className="item-name">
                        {h.pacienteName || "Paciente"}
                      </span>
                      <span className="item-extra">{h.reason}</span>
                    </Link>
                  ))
                ) : (
                  <p className="empty-message">No hay entradas recientes.</p>
                )}
                <Link to="/admin/monitor-clinica" className="widget-link">
                  Ir al Monitor Clínico
                </Link>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default ClinicDashboard;