import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FaDog, FaCat } from 'react-icons/fa';
import LoaderSpinner from '../../utils/LoaderSpinner';

const PaymentModal = ({ tutor, onClose, onPaymentSuccess, setAlertInfo }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      setAlertInfo({ title: 'Error', text: 'Ingrese un monto válido.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const paymentRef = doc(collection(db, 'pagos_deuda'));
      batch.set(paymentRef, {
        tutorId: tutor.id,
        tutorName: tutor.name,
        amount: paymentAmount,
        paymentMethod,
        createdAt: serverTimestamp(),
      });
      const tutorRef = doc(db, 'tutores', tutor.id);
      batch.update(tutorRef, { accountBalance: increment(paymentAmount) });
      await batch.commit();
      onPaymentSuccess();
      setAlertInfo({ title: 'Éxito', text: 'Pago registrado correctamente.', type: 'success' });
    } catch (error) {
      setAlertInfo({ title: 'Error', text: 'No se pudo registrar el pago.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CustomAlert = ({ title, text, type, onClose }) => {
  const icon = type === 'error' ? '!' : '✓';
  return (
    <div className="custom-alert-overlay">
      <div className="custom-alert-content">
        <div className={`icon-circle ${type}`}>{icon}</div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="custom-alert-actions">
          <button className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cuenta');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const tutorRef = doc(db, 'tutores', id);
      const tutorSnap = await getDoc(tutorRef);
      if (!tutorSnap.exists()) {
        setAlertInfo({ title: 'Error', text: 'Tutor no encontrado.', type: 'error' });
        setTimeout(() => navigate('/admin/tutores'), 2000);
        return;
      }
      const tutorData = { id: tutorSnap.id, ...tutorSnap.data() };
      setTutor(tutorData);

      const [pacientesSnap, salesSnap, paymentsSnap, citasSnap] = await Promise.all([
        getDocs(query(collection(db, 'pacientes'), where('tutorId', '==', id))),
        getDocs(query(collection(db, 'ventas_presenciales'), where('tutorInfo.id', '==', id))),
        getDocs(query(collection(db, 'pagos_deuda'), where('tutorId', '==', id))),
        getDocs(query(collection(db, 'citas'), where('tutorId', '==', id))),
      ]);
      setPacientes(pacientesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCitas(citasSnap.docs.map((d) => ({ id: d.id, ...d.data(), startTime: d.data().startTime.toDate() })));
      const sales = salesSnap.docs.map((d) => ({ ...d.data(), id: d.id, type: 'Venta' }));
      const payments = paymentsSnap.docs.map((d) => ({ ...d.data(), id: d.id, type: 'Pago' }));
      setTransactions([...sales, ...payments].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    } catch (error) {
      setAlertInfo({ title: 'Error', text: 'No se pudieron cargar los datos del tutor.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleStartSale = () => {
    navigate('/admin/vender', { state: { tutor: { id: tutor.id, name: tutor.name } } });
  };

  if (isLoading)
    return (
      <div className="loading-message">
        <LoaderSpinner />
        <p>Cargando perfil del tutor...</p>
      </div>
    );
  if (!tutor) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pacientes':
        return (
          <div className="tab-content">
            {pacientes.length > 0 ? (
              pacientes.map((p) => (
                <div key={p.id} className="paciente-card-profile" onClick={() => navigate(`/admin/pacientes/${p.id}`)}>
                  {p.species?.toLowerCase().includes('perro') || p.species?.toLowerCase().includes('canino') ? <FaDog /> : <FaCat />}
                  <div>
                    <p className="paciente-name">{p.name}</p>
                    <p className="paciente-breed">{p.breed || p.species}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>No hay pacientes.</p>
            )}
          </div>
        );
      case 'citas':
        return (
          <div className="tab-content">
            {citas.length > 0 ? (
              citas
                .sort((a, b) => b.startTime - a.startTime)
                .map((c) => (
                  <div key={c.id} className="cita-card">
                    <p>
                      <strong>Paciente:</strong> {c.pacienteName}
                    </p>
                    <p>
                      <strong>Fecha:</strong> {c.startTime.toLocaleString('es-AR')}
                    </p>
                    <p>
                      <strong>Servicios:</strong> {c.services?.map((s) => s.nombre || s.name).join(', ') || 'N/A'}
                    </p>
                  </div>
                ))
            ) : (
              <p>No hay citas.</p>
            )}
          </div>
        );
      case 'cuenta':
        return (
          <div className="tutor-profile-tab-content">
            <div className="tutor-account-summary">
              <div className="tutor-balance-card">
                <h3>Saldo Actual</h3>
                <p className={`balance-amount ${tutor.accountBalance < 0 ? 'deudor' : ''}`}>
                  ${(tutor.accountBalance || 0).toFixed(2)}
                </p>
              </div>
              <button className="btn btn-success" onClick={() => setIsPaymentModalOpen(true)}>
                + Registrar Pago
              </button>
            </div>
            <h4>Historial de Transacciones</h4>
            <div className="tutor-transactions-list">
              {transactions.map((t) => (
                <div key={t.id} className={`transaction-item ${t.type.toLowerCase()}`}>
                  <div className="transaction-info">
                    <span className="date">{t.createdAt.toDate().toLocaleDateString('es-AR')}</span>
                    <span className="type">
                      {t.type === 'Venta' ? `Venta #${t.id.substring(0, 6)}` : `Pago con ${t.paymentMethod}`}
                    </span>
                  </div>
                  <div className="transaction-amount">
                    {t.type === 'Venta' ? (
                      <span className="debit">- ${(t.debt || 0).toFixed(2)}</span>
                    ) : (
                      <span className="credit">+ ${(t.amount || 0).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && <p>No hay transacciones.</p>}
            </div>
          </div>
        );
      default:
        return (
          <div className="tab-content details-grid">
            <div className="detail-item">
              <span>DNI</span>
              <p>{tutor.dni || 'N/A'}</p>
            </div>
            <div className="detail-item">
              <span>Email</span>
              <p>{tutor.email || 'N/A'}</p>
            </div>
            <div className="detail-item">
              <span>Tel. Principal</span>
              <p>{tutor.phone || 'N/A'}</p>
            </div>
            <div className="detail-item">
              <span>Tel. Secundario</span>
              <p>{tutor.secondaryPhone || 'N/A'}</p>
            </div>
            <div className="detail-item full-width">
              <span>Dirección</span>
              <p>{tutor.address || 'N/A'}</p>
            </div>
            <hr className="full-width" />
            <div className="detail-item">
              <span>Razón Social</span>
              <p>{tutor.billingInfo?.razonSocial || 'N/A'}</p>
            </div>
            <div className="detail-item">
              <span>CUIT/CUIL</span>
              <p>{tutor.billingInfo?.cuit || 'N/A'}</p>
            </div>
            <div className="detail-item">
              <span>Cond. Fiscal</span>
              <p>{tutor.billingInfo?.condicionFiscal || 'N/A'}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="profile-container">
      {alertInfo && <CustomAlert {...alertInfo} onClose={() => setAlertInfo(null)} />}
      {isPaymentModalOpen && (
        <PaymentModal
          tutor={tutor}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentSuccess={() => {
            setIsPaymentModalOpen(false);
            fetchAllData();
          }}
          setAlertInfo={setAlertInfo}
        />
      )}
      <div className="profile-header">
        <div className="profile-avatar">👤</div>
        <div className="profile-info">
          <h1>{tutor.name}</h1>
          <p>{tutor.email}</p>
        </div>
        <div className="profile-actions">
          <button className="btn btn-primary" onClick={handleStartSale}>
            Vender
          </button>
          <Link to={`/admin/edit-tutor/${tutor.id}`} className="btn btn-secondary">
            Editar Tutor
          </Link>
          <button className="btn" onClick={() => navigate(`/admin/add-paciente?tutorId=${id}`)}>
            + Paciente
          </button>
        </div>
      </div>
      <div className="profile-nav">
        <button className={activeTab === 'details' ? 'active' : ''} onClick={() => setActiveTab('details')}>
          Detalles
        </button>
        <button className={activeTab === 'pacientes' ? 'active' : ''} onClick={() => setActiveTab('pacientes')}>
          Pacientes ({pacientes.length})
        </button>
        <button className={activeTab === 'citas' ? 'active' : ''} onClick={() => setActiveTab('citas')}>
          Citas ({citas.length})
        </button>
        <button className={activeTab === 'cuenta' ? 'active' : ''} onClick={() => setActiveTab('cuenta')}>
          Cuenta Corriente
        </button>
      </div>
      <div className="profile-content">{renderTabContent()}</div>
    </div>
  );
};

export default TutorProfile;
