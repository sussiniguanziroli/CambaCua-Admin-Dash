import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import AddProduct from './AddProducts';
import EditProduct from './EditProduct';
import ProductList from './ProductList';
import HandleOrders from './HandleOrders';
import PedidosCompletados from "./PedidosCompletados";
import UserList from "./userManagement/UserList";
import PromosAdmin from './PromosAdmin';
import CouponAdmin from './CouponAdmin';
import PresentialList from './presencial/PresentialList';
import AddPresential from './presencial/AddPresential';
import EditPresential from './presencial/EditPresential';
import VenderNavigator from './presencial/ventaPresencial/VenderNavigator';
import VerTutores from './presencial/adminTutores/VerTutores';
import AddTutor from './presencial/adminTutores/AddTutor';
import EditTutor from './presencial/adminTutores/EditTutor';
import VerPacientes from './presencial/adminPacientes/VerPacientes';
import AddPaciente from './presencial/adminPacientes/AddPaciente';
import EditPaciente from './presencial/adminPacientes/EditPaciente';
import { FaStore, FaShoppingCart, FaUsers, FaTag, FaTicketAlt, FaPlus, FaListUl, FaHistory, FaHeartbeat, FaStethoscope, FaBars, FaTimes, FaChevronDown, FaBuilding, FaUserCircle, FaSignOutAlt, FaMoneyCheckAlt, FaUserMd, FaCashRegister, FaChartBar } from 'react-icons/fa';
import ResumenSemanal from './administracion/ResumenSemanal';
import CajaDiaria from './administracion/CajaDiaria';
import { FaBookBookmark, FaUserDoctor } from 'react-icons/fa6';
import Agenda from './presencial/agenda/Agenda';
import TutorProfile from './presencial/adminTutores/TutorProfile';
import PacienteProfile from './presencial/adminPacientes/PacienteProfile';
import { RiCalendarScheduleFill } from 'react-icons/ri';
import MonitorVencimientos from './presencial/agenda/MonitorVencimientos';
import MonitorClinica from './presencial/agenda/MonitorClinica';
import { MdDashboard } from 'react-icons/md';
import ClinicDashboard from './administracion/ClinicalDashboard';

const Dashboard = ({ user, handleLogout }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [openCategory, setOpenCategory] = useState('Administración');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const location = useLocation();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleCategory = (category) => setOpenCategory(openCategory === category ? null : category);
    const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setIsSidebarOpen(true);
            else setIsSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (window.innerWidth <= 768) setIsSidebarOpen(false);
    }, [location]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileRef]);

    const menuCategories = [
        {
            name: 'Administración',
            icon: <FaUsers />,
            items: [
                { path: '/admin/main-dashboard', label: 'Monitor General', icon: <MdDashboard /> },
                { path: '/admin/users', label: 'Ver Usuarios', icon: <FaUsers /> },
                { path: '/admin/coupons', label: 'Admin Cupones', icon: <FaTicketAlt /> },
                { path: '/admin/caja-diaria', label: 'Caja Diaria', icon: <FaCashRegister /> },
                { path: '/admin/resumen-semanal', label: 'Resumen Semanal', icon: <FaChartBar /> },
            ]
        },
        {
            name: 'Gestión Clínica',
            icon: <FaHeartbeat />,
            items: [
                 { path: '/admin/tutores', label: 'Ver Tutores', icon: <FaUserMd /> },
                 { path: '/admin/pacientes', label: 'Ver Pacientes', icon: <FaStethoscope /> },
                 { path: '/admin/agenda', label: 'Agenda', icon: <FaBookBookmark /> },
                 { path: '/admin/monitor-vencimientos', label: 'Monitor Vencimientos', icon:<RiCalendarScheduleFill /> },
                 { path: '/admin/monitor-clinica', label: 'Monitor H. Clínica', icon:<FaUserDoctor />}
            ]
        },
        {
            name: 'Pedidos Online',
            icon: <FaShoppingCart />,
            items: [
                { path: '/admin/orders', label: 'Gestionar Pedidos', icon: <FaListUl /> },
                { path: '/admin/orders/complete', label: 'Historial Pedidos', icon: <FaHistory /> },
            ]
        },
        {
            name: 'Tienda Online',
            icon: <FaStore />,
            items: [
                { path: '/admin/products', label: 'Productos Online', icon: <FaListUl /> },
                { path: '/admin/add-product', label: 'Agregar Producto Online', icon: <FaPlus /> },
                { path: '/admin/promociones', label: 'Promociones', icon: <FaTag /> },
            ]
        },
        {
            name: 'Venta Presencial',
            icon: <FaMoneyCheckAlt />,
            items: [
                 { path: '/admin/vender', label: 'Vender', icon: <FaMoneyCheckAlt /> },
            ]
        },
        {
            name: 'Items Presenciales',
            icon: <FaBuilding />,
            items: [
                { path: '/admin/presential-list', label: 'Items Presenciales', icon: <FaListUl /> },
                { path: '/admin/add-presential', label: 'Agregar Item Presencial', icon: <FaPlus /> },
            ]
        },
    ];

    return (
        <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <div className="header-bar">
                <button className="sidebar-toggle-button" onClick={toggleSidebar}>{isSidebarOpen ? <FaTimes /> : <FaBars />}</button>
                <div className="header-title">Admin Panel</div>
                <div className="user-profile" ref={profileRef}>
                    <button onClick={toggleProfile} className="profile-button"><FaUserCircle /><span className="user-email-display">{user.email}</span><FaChevronDown /></button>
                    {isProfileOpen && (<div className="profile-dropdown"><div className="dropdown-email">{user.email}</div><button onClick={handleLogout} className="logout-button"><FaSignOutAlt /> Cerrar Sesión</button></div>)}
                </div>
            </div>
            <div className="dashboard-body">
                <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <ul className="sidebar-menu">
                        {menuCategories.map(category => (
                            <li key={category.name} className={`menu-category ${openCategory === category.name ? 'open' : ''}`}>
                                <div className="category-header" onClick={() => toggleCategory(category.name)}><span className="category-icon">{category.icon}</span><span className="category-name">{category.name}</span><FaChevronDown className="category-arrow" /></div>
                                <ul className="submenu">
                                    {category.items.map(item => (<li key={item.path}><NavLink to={item.path} className={({ isActive }) => `${isActive ? 'active-link' : ''} ${item.disabled ? 'disabled-link' : ''}`} onClick={(e) => item.disabled && e.preventDefault()}><span className="item-icon">{item.icon}</span>{item.label}</NavLink></li>))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </nav>
                <main className="content">
                    <Routes>
                        <Route path="/" element={<Navigate to="/admin/main-dashboard" replace />} />
                        <Route path="/admin/add-product" element={<AddProduct />} />
                        <Route path="/admin/products" element={<ProductList />} />
                        <Route path="/admin/edit-product/:id" element={<EditProduct />} />
                        <Route path="/admin/orders" element={<HandleOrders />} />
                        <Route path="/admin/orders/complete" element={<PedidosCompletados />} />
                        <Route path="/admin/users" element={<UserList />} />
                        <Route path="/admin/promociones" element={<PromosAdmin />} />
                        <Route path="/admin/coupons" element={<CouponAdmin />} />
                        <Route path="/admin/presential-list" element={<PresentialList />} />
                        <Route path="/admin/add-presential" element={<AddPresential />} />
                        <Route path="/admin/edit-presential/:id" element={<EditPresential />} />
                        <Route path="/admin/vender" element={<VenderNavigator />} />
                        <Route path="/admin/tutores" element={<VerTutores />} />
                        <Route path="/admin/add-tutor" element={<AddTutor />} />
                        <Route path="/admin/edit-tutor/:id" element={<EditTutor />} />
                        <Route path="/admin/tutor-profile/:id" element={<TutorProfile />} /> 
                        <Route path="/admin/pacientes" element={<VerPacientes />} />
                        <Route path="/admin/add-paciente" element={<AddPaciente />} />
                        <Route path="/admin/edit-paciente/:id" element={<EditPaciente />} />
                        <Route path="/admin/paciente-profile/:id" element={<PacienteProfile />} />
                        <Route path="/admin/caja-diaria" element={<CajaDiaria />} />
                        <Route path="/admin/resumen-semanal" element={<ResumenSemanal />} />
                        <Route path="/admin/agenda" element={<Agenda />} />
                        <Route path="/admin/monitor-vencimientos" element={<MonitorVencimientos />} />
                        <Route path="/admin/monitor-clinica" element={<MonitorClinica />} />
                        <Route path="/admin/main-dashboard" element={<ClinicDashboard />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;