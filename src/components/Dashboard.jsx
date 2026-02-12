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
import { FaStore, FaShoppingCart, FaUsers, FaTag, FaTicketAlt, FaPlus, FaListUl, FaHistory, FaHeartbeat, FaStethoscope, FaBars, FaTimes, FaChevronDown, FaBuilding, FaUserCircle, FaSignOutAlt, FaMoneyCheckAlt, FaUserMd, FaCashRegister, FaChartBar, FaRegCalendarAlt, FaHome, FaChevronRight } from 'react-icons/fa';
import ResumenSemanal from './administracion/ResumenSemanal';
import CajaDiaria from './administracion/CajaDiaria';
import { FaBookBookmark, FaUserDoctor, FaRobot } from 'react-icons/fa6';
import Agenda from './presencial/agenda/Agenda';
import TutorProfile from './presencial/adminTutores/TutorProfile';
import PacienteProfile from './presencial/adminPacientes/PacienteProfile';
import { RiCalendarScheduleFill } from 'react-icons/ri';
import MonitorVencimientos from './presencial/agenda/MonitorVencimientos';
import MonitorClinica from './presencial/agenda/MonitorClinica';
import { MdDashboard } from 'react-icons/md';
import ClinicDashboard from './administracion/ClinicalDashboard';
import VerPeluqueros from './presencial/adminPeluqueria/VerPeluqueros';
import PeluqueroProfile from './presencial/adminPeluqueria/PeluqueroProfile';
import AddPeluquero from './presencial/adminPeluqueria/AddPeluquero';
import EditPeluquero from './presencial/adminPeluqueria/EditPeluquero';
import AgendaPeluqueria from './presencial/adminPeluqueria/AgendaPeluqueria';
import { PiBathtub } from 'react-icons/pi';
import AIHelper from './administracion/aiHelper/AIHelper';

const routeTitles = {
    '/admin/main-dashboard': 'Monitor General',
    '/admin/users': 'Usuarios',
    '/admin/coupons': 'Cupones',
    '/admin/caja-diaria': 'Caja Diaria',
    '/admin/resumen-semanal': 'Resumen Semanal',
    '/admin/ai-helper': 'Ayudante IA',
    '/admin/tutores': 'Tutores',
    '/admin/add-tutor': 'Agregar Tutor',
    '/admin/edit-tutor': 'Editar Tutor',
    '/admin/tutor-profile': 'Perfil de Tutor',
    '/admin/pacientes': 'Pacientes',
    '/admin/add-paciente': 'Agregar Paciente',
    '/admin/edit-paciente': 'Editar Paciente',
    '/admin/paciente-profile': 'Perfil de Paciente',
    '/admin/agenda': 'Agenda',
    '/admin/monitor-vencimientos': 'Monitor Vencimientos',
    '/admin/monitor-clinica': 'Monitor Historia Clínica',
    '/admin/orders': 'Gestionar Pedidos',
    '/admin/orders/complete': 'Historial de Pedidos',
    '/admin/products': 'Productos Online',
    '/admin/add-product': 'Agregar Producto',
    '/admin/edit-product': 'Editar Producto',
    '/admin/promociones': 'Promociones',
    '/admin/vender': 'Vender',
    '/admin/presential-list': 'Items Presenciales',
    '/admin/add-presential': 'Agregar Item Presencial',
    '/admin/edit-presential': 'Editar Item Presencial',
    '/admin/peluqueros': 'Peluqueros',
    '/admin/add-peluquero': 'Agregar Peluquero',
    '/admin/edit-peluquero': 'Editar Peluquero',
    '/admin/agenda-peluqueria': 'Agenda Peluquería',
};

const routeBreadcrumbs = {
    '/admin/main-dashboard': [{ label: 'Inicio', path: '/admin/main-dashboard' }],
    '/admin/users': [{ label: 'Administración', path: null }, { label: 'Usuarios', path: '/admin/users' }],
    '/admin/coupons': [{ label: 'Administración', path: null }, { label: 'Cupones', path: '/admin/coupons' }],
    '/admin/caja-diaria': [{ label: 'Administración', path: null }, { label: 'Caja Diaria', path: '/admin/caja-diaria' }],
    '/admin/resumen-semanal': [{ label: 'Administración', path: null }, { label: 'Resumen Semanal', path: '/admin/resumen-semanal' }],
    '/admin/ai-helper': [{ label: 'Administración', path: null }, { label: 'Ayudante IA', path: '/admin/ai-helper' }],
    '/admin/tutores': [{ label: 'Gestión Clínica', path: null }, { label: 'Tutores', path: '/admin/tutores' }],
    '/admin/add-tutor': [{ label: 'Gestión Clínica', path: null }, { label: 'Tutores', path: '/admin/tutores' }, { label: 'Agregar', path: '/admin/add-tutor' }],
    '/admin/edit-tutor': [{ label: 'Gestión Clínica', path: null }, { label: 'Tutores', path: '/admin/tutores' }, { label: 'Editar', path: null }],
    '/admin/tutor-profile': [{ label: 'Gestión Clínica', path: null }, { label: 'Tutores', path: '/admin/tutores' }, { label: 'Perfil', path: null }],
    '/admin/pacientes': [{ label: 'Gestión Clínica', path: null }, { label: 'Pacientes', path: '/admin/pacientes' }],
    '/admin/add-paciente': [{ label: 'Gestión Clínica', path: null }, { label: 'Pacientes', path: '/admin/pacientes' }, { label: 'Agregar', path: '/admin/add-paciente' }],
    '/admin/edit-paciente': [{ label: 'Gestión Clínica', path: null }, { label: 'Pacientes', path: '/admin/pacientes' }, { label: 'Editar', path: null }],
    '/admin/paciente-profile': [{ label: 'Gestión Clínica', path: null }, { label: 'Pacientes', path: '/admin/pacientes' }, { label: 'Perfil', path: null }],
    '/admin/agenda': [{ label: 'Gestión Clínica', path: null }, { label: 'Agenda', path: '/admin/agenda' }],
    '/admin/monitor-vencimientos': [{ label: 'Gestión Clínica', path: null }, { label: 'Monitor Vencimientos', path: '/admin/monitor-vencimientos' }],
    '/admin/monitor-clinica': [{ label: 'Gestión Clínica', path: null }, { label: 'Monitor H. Clínica', path: '/admin/monitor-clinica' }],
    '/admin/orders': [{ label: 'Pedidos Online', path: null }, { label: 'Gestionar', path: '/admin/orders' }],
    '/admin/orders/complete': [{ label: 'Pedidos Online', path: null }, { label: 'Historial', path: '/admin/orders/complete' }],
    '/admin/products': [{ label: 'Tienda Online', path: null }, { label: 'Productos', path: '/admin/products' }],
    '/admin/add-product': [{ label: 'Tienda Online', path: null }, { label: 'Productos', path: '/admin/products' }, { label: 'Agregar', path: '/admin/add-product' }],
    '/admin/edit-product': [{ label: 'Tienda Online', path: null }, { label: 'Productos', path: '/admin/products' }, { label: 'Editar', path: null }],
    '/admin/promociones': [{ label: 'Tienda Online', path: null }, { label: 'Promociones', path: '/admin/promociones' }],
    '/admin/vender': [{ label: 'Venta Presencial', path: null }, { label: 'Vender', path: '/admin/vender' }],
    '/admin/presential-list': [{ label: 'Items Presenciales', path: null }, { label: 'Lista', path: '/admin/presential-list' }],
    '/admin/add-presential': [{ label: 'Items Presenciales', path: null }, { label: 'Lista', path: '/admin/presential-list' }, { label: 'Agregar', path: '/admin/add-presential' }],
    '/admin/edit-presential': [{ label: 'Items Presenciales', path: null }, { label: 'Lista', path: '/admin/presential-list' }, { label: 'Editar', path: null }],
    '/admin/peluqueros': [{ label: 'Peluquería', path: null }, { label: 'Peluqueros', path: '/admin/peluqueros' }],
    '/admin/add-peluquero': [{ label: 'Peluquería', path: null }, { label: 'Peluqueros', path: '/admin/peluqueros' }, { label: 'Agregar', path: '/admin/add-peluquero' }],
    '/admin/edit-peluquero': [{ label: 'Peluquería', path: null }, { label: 'Peluqueros', path: '/admin/peluqueros' }, { label: 'Editar', path: null }],
    '/admin/agenda-peluqueria': [{ label: 'Peluquería', path: null }, { label: 'Agenda', path: '/admin/agenda-peluqueria' }],
};

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

    useEffect(() => {
        const pathKey = Object.keys(routeTitles).find(key => location.pathname.startsWith(key));
        const pageTitle = pathKey ? routeTitles[pathKey] : 'Admin Panel';
        document.title = `${pageTitle} - CambaCua`;
    }, [location]);

    const getBreadcrumbs = () => {
        const pathKey = Object.keys(routeBreadcrumbs).find(key => location.pathname.startsWith(key));
        return pathKey ? routeBreadcrumbs[pathKey] : [{ label: 'Inicio', path: '/admin/main-dashboard' }];
    };

    const menuCategories = [
        {
            name: 'Administración',
            icon: <FaUsers />,
            items: [
                { path: '/admin/main-dashboard', label: 'Monitor General', icon: <MdDashboard /> },
                { path: '/admin/users', label: 'Ver Usuarios', icon: <FaUsers /> },
                { path: '/admin/coupons', label: 'Admin Cupones', icon: <FaTicketAlt /> },
                { path: '/admin/caja-diaria', label: 'Caja Diaria', icon: <FaCashRegister /> },
                { path: '/admin/resumen-semanal', label: 'Estadisticas', icon: <FaChartBar /> },
                { path: '/admin/ai-helper', label: 'Ayudante IA', icon: <FaRobot /> },
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
        { 
            name: 'Peluquería', 
            icon: <PiBathtub />, 
            items: [ 
                { path: '/admin/peluqueros', label: 'Ver Peluqueros', icon: <FaUsers /> }, 
                { path: '/admin/agenda-peluqueria', label: 'Agenda Peluquería', icon: <FaRegCalendarAlt/> } ]},
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
                    <div className="breadcrumb-container">
                        <NavLink to="/admin/main-dashboard" className="breadcrumb-home">
                            <FaHome />
                        </NavLink>
                        {getBreadcrumbs().map((crumb, index) => (
                            <React.Fragment key={index}>
                                <FaChevronRight className="breadcrumb-separator" />
                                {crumb.path ? (
                                    <NavLink to={crumb.path} className="breadcrumb-link">
                                        {crumb.label}
                                    </NavLink>
                                ) : (
                                    <span className="breadcrumb-text">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
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
                        <Route path="/admin/peluqueros" element={<VerPeluqueros />} />
                        <Route path="/admin/peluqueros/:id" element={<PeluqueroProfile />} />
                        <Route path="/admin/add-peluquero" element={<AddPeluquero/>} />
                        <Route path="/admin/edit-peluquero/:id" element={<EditPeluquero />} />
                        <Route path="/admin/agenda-peluqueria" element={<AgendaPeluqueria />} />
                        <Route path="/admin/ai-helper" element={<AIHelper />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;