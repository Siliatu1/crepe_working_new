import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Calendar, Clock, Monitor, LogOut, ChevronLeft, 
  CheckCircle, AlertTriangle, Info, MapPinOff, RefreshCw, 
  Building, Loader2
} from 'lucide-react';

const ESTADOS_PUESTO = {
  DISPONIBLE: 'available',
  LIMITADO: 'limited', 
  OCUPADO: 'occupied'
};

const styles = `
  /* Variables y Reseteos base */
  :root {
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --primary-light: #eff6ff;
    --text-main: #1f2937;
    --text-muted: #6b7280;
    --bg-main: #f8fafc;
    --bg-card: #ffffff;
    --border-color: #e2e8f0;
    --danger: #ef4444;
    --danger-light: #fef2f2;
    --success: #10b981;
    --warning: #f59e0b;
    --font-sans: system-ui, -apple-system, sans-serif;
  }

  .cw-app {
    font-family: var(--font-sans);
    background-color: var(--bg-main);
    color: var(--text-main);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Utilidades Generales */
  .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
  .container-sm { max-width: 800px; }
  .flex-center { display: flex; align-items: center; justify-content: center; }
  .flex-between { display: flex; align-items: center; justify-content: space-between; }
  .gap-2 { gap: 0.5rem; } .gap-3 { gap: 0.75rem; } .gap-4 { gap: 1rem; }
  .text-center { text-align: center; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  /* Botones */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 500; font-size: 0.95rem;
    cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; outline: none;
  }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-primary { background-color: var(--primary); color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .btn-primary:hover:not(:disabled) { background-color: var(--primary-hover); }
  .btn-secondary { background-color: white; color: var(--text-main); border-color: #d1d5db; }
  .btn-secondary:hover:not(:disabled) { background-color: #f9fafb; }
  .btn-danger { background-color: var(--danger-light); color: var(--danger); border-color: #fecaca; }
  .btn-danger:hover:not(:disabled) { background-color: #fee2e2; }
  .btn-icon-only { padding: 0.5rem; background: transparent; color: var(--text-muted); border-radius: 50%; }
  .btn-icon-only:hover { background-color: #f3f4f6; color: var(--text-main); }
  .btn-w-full { width: 100%; }

  /* Alertas */
  .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.9rem; }
  .alert-danger { background-color: var(--danger-light); color: #b91c1c; border: 1px solid #fecaca; }

  /* Topbar */
  .topbar {
    background-color: white; border-bottom: 1px solid var(--border-color);
    padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 40; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .topbar-title-group { display: flex; align-items: center; gap: 1rem; }
  .topbar-title { font-size: 1.25rem; font-weight: bold; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); }
  .topbar-user-group { display: flex; align-items: center; gap: 1rem; }
  .user-info-text { text-align: right; display: none; }
  .user-info-text p { margin: 0; font-size: 0.85rem; font-weight: bold; }
  .user-info-text span { font-size: 0.75rem; color: var(--text-muted); }
  .user-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-light); }
  .nav-link { background: none; border: none; color: var(--text-muted); font-weight: 500; font-size: 0.9rem; cursor: pointer; display: none; align-items: center; gap: 0.5rem; }
  .nav-link:hover { color: var(--primary); }
  .divider-v { width: 1px; height: 2rem; background-color: var(--border-color); display: none; }

  /* Vistas Específicas: Login */
  .login-wrapper { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
  .login-card { background: white; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 400px; overflow: hidden; border: 1px solid var(--border-color); }
  .login-header { background-color: var(--primary); padding: 2.5rem 2rem; text-align: center; color: white; }
  .login-header h2 { margin: 1rem 0 0.5rem; font-size: 1.5rem; }
  .login-header p { margin: 0; color: #bfdbfe; font-size: 0.95rem; }
  .login-body { padding: 2rem; }
  .form-group { margin-bottom: 1.5rem; }
  .form-label { display: block; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem; color: #374151; }
  .input-wrapper { position: relative; display: flex; align-items: center; }
  .input-icon { position: absolute; left: 1rem; color: #9ca3af; pointer-events: none; }
  .form-input { width: 100%; padding: 0.8rem 1rem 0.8rem 2.8rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
  .form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }

  /* Vistas Específicas: Welcome */
  .welcome-card { background: white; border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; border: 1px solid var(--border-color); margin-bottom: 1.5rem; }
  .profile-section { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
  .profile-pic { width: 6rem; height: 6rem; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary-light); }
  .profile-details { flex: 1; min-width: 200px; }
  .profile-details h2 { margin: 0 0 0.25rem; font-size: 1.5rem; }
  .profile-details .subtitle { margin: 0 0 0.25rem; color: var(--primary); font-weight: 500; }
  .profile-details .role { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
  .time-widget { background: var(--bg-main); padding: 1rem 1.5rem; border-radius: 0.75rem; text-align: center; }
  .time-widget .date { margin: 0; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
  .time-widget .time { margin: 0; font-size: 1.75rem; font-weight: bold; color: var(--text-main); }
  
  .policy-box { background: white; border-radius: 1rem; border: 1px solid var(--border-color); overflow: hidden; }
  .policy-header { background: var(--bg-main); padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.75rem; font-weight: bold; font-size: 1.1rem; }
  .policy-body { padding: 1.5rem; }
  .policy-list { list-style: none; padding: 0; margin: 0 0 1.5rem 0; display: flex; flex-direction: column; gap: 1.25rem; }
  .policy-item { display: flex; gap: 1rem; }
  .policy-icon { background: var(--primary-light); color: var(--primary); padding: 0.5rem; border-radius: 0.5rem; height: max-content; }
  .policy-icon.danger { background: var(--danger-light); color: var(--danger); }
  .policy-text-block strong { display: block; color: var(--text-main); margin-bottom: 0.25rem; }
  .policy-text-block { color: var(--text-muted); font-size: 0.95rem; line-height: 1.4; }
  .policy-footer { padding-top: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; }

  /* Vistas Específicas: Salas */
  .page-header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-end; }
  .page-header h2 { margin: 0 0 0.5rem; font-size: 1.8rem; }
  .page-header p { margin: 0; color: var(--text-muted); }
  .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
  .room-card { background: white; border-radius: 1rem; overflow: hidden; border: 1px solid var(--border-color); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; }
  .room-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px rgba(0,0,0,0.05); }
  .room-img-container { height: 12rem; position: relative; overflow: hidden; background: #e5e7eb; }
  .room-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
  .room-card:hover .room-img { transform: scale(1.05); }
  .room-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); }
  .room-title { position: absolute; bottom: 1rem; left: 1rem; margin: 0; color: white; font-size: 1.25rem; font-weight: bold; }
  .room-info { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex: 1; }
  .room-features p { margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-muted); }
  .room-features p:last-child { margin: 0; }
  .room-action-icon { background: var(--primary-light); color: var(--primary); padding: 0.5rem; border-radius: 50%; transition: all 0.2s; }
  .room-card:hover .room-action-icon { background: var(--primary); color: white; }

  /* Vistas Específicas: Escritorios (Desk Selection) */
  .desk-layout { display: flex; flex-direction: column; gap: 1.5rem; }
  .desk-main-area { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; }
  .desk-sidebar { background: white; border-radius: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; overflow: hidden; height: max-content; }
  
  .filters-bar { background: white; padding: 1rem 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; }
  .date-picker { font-family: inherit; font-size: 1rem; color: var(--text-main); border: none; border-bottom: 2px solid #d1d5db; outline: none; padding-bottom: 0.25rem; background: transparent; cursor: pointer; }
  .date-picker:focus { border-color: var(--primary); }
  .legend-items { display: flex; flex-wrap: wrap; gap: 1.25rem; font-size: 0.85rem; color: var(--text-muted); }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  
  .map-container { background: white; border-radius: 1rem; border: 1px solid var(--border-color); padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 400px; position: relative; overflow: hidden; }
  .table-graphic { position: relative; width: 100%; max-width: 600px; aspect-ratio: 2/1; margin: 4rem 0; }
  .table-surface { position: absolute; inset: 0; background-color: #fffbeb; border-radius: 40px; border: 8px solid rgba(120,53,15,0.1); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; z-index: 0; }
  .table-surface-inner { position: absolute; inset: 2rem; border: 1px solid rgba(120,53,15,0.05); border-radius: 24px; }
  .table-label { color: rgba(120,53,15,0.2); font-weight: bold; font-size: 2rem; text-transform: uppercase; letter-spacing: 0.1em; }
  
  .desk-node { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; cursor: pointer; z-index: 10; transition: transform 0.2s; }
  .desk-node:hover:not(.occupied) { transform: scale(1.1); }
  .desk-node.top { top: 0; transform: translate(-50%, -60%); }
  .desk-node.top:hover:not(.occupied) { transform: translate(-50%, -60%) scale(1.1); }
  .desk-node.bottom { bottom: 0; transform: translate(-50%, 60%); }
  .desk-node.bottom:hover:not(.occupied) { transform: translate(-50%, 60%) scale(1.1); }
  
  .desk-box { width: 3.5rem; height: 3.5rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.25rem; border: 3px solid transparent; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .desk-badge { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); background: white; padding: 0.1rem 0.5rem; border-radius: 1rem; border: 1px solid var(--border-color); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  
  .bg-available { background-color: var(--success); border-color: #059669; }
  .bg-limited { background-color: var(--warning); border-color: #d97706; }
  .bg-occupied { background-color: var(--danger); border-color: #b91c1c; opacity: 0.8; cursor: not-allowed; }

  .sidebar-header { background-color: var(--primary); color: white; padding: 1rem; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; }
  .sidebar-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; position: relative; }
  .sidebar-item { background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem; }
  .sidebar-desk-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0; }
  .sidebar-desk-info p { margin: 0; }
  .sidebar-desk-info .title { font-weight: 500; display: flex; align-items: center; gap: 0.25rem; font-size: 0.95rem; }
  .sidebar-desk-info .status { font-size: 0.8rem; color: var(--text-muted); }

  /* Vistas Específicas: Mis Reservas */
  .reservations-layout { display: flex; flex-direction: column; gap: 1.5rem; }
  .res-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }
  .res-user-card { background: white; border-radius: 1rem; padding: 1.5rem; text-align: center; border: 1px solid var(--border-color); }
  .res-user-card img { width: 5rem; height: 5rem; border-radius: 50%; object-fit: cover; margin-bottom: 1rem; border: 2px solid var(--primary-light); }
  .res-user-card h3 { margin: 0 0 0.5rem 0; }
  .role-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; }
  .role-admin { background: #f3e8ff; color: #7e22ce; }
  .role-user { background: var(--primary-light); color: var(--primary); }
  
  .location-card { background: white; border-radius: 1rem; padding: 1.5rem; border: 1px solid var(--border-color); }
  .location-header { margin: 0 0 1rem 0; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; }
  .location-status { background: var(--danger-light); padding: 1rem; border-radius: 0.5rem; border: 1px solid #fecaca; text-align: center; margin-bottom: 1rem; }
  .location-status p { margin: 0.5rem 0 0 0; color: #991b1b; font-weight: 500; font-size: 0.9rem; }
  .location-status span { display: block; font-size: 0.75rem; color: var(--danger); margin-top: 0.25rem; }

  .table-container { background: white; border-radius: 1rem; border: 1px solid var(--border-color); overflow: hidden; flex: 1; display: flex; flex-direction: column; }
  .table-header { padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
  .table-header h3 { margin: 0; font-size: 1.25rem; }
  .table-wrapper { overflow-x: auto; position: relative; min-height: 200px; }
  .data-table { width: 100%; border-collapse: collapse; min-width: 700px; text-align: left; }
  .data-table th { padding: 1rem 1.5rem; background: var(--bg-main); color: var(--text-muted); font-weight: 500; font-size: 0.9rem; border-bottom: 1px solid var(--border-color); }
  .data-table td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
  .data-table tr:hover { background-color: #f8fafc; }
  .status-badge { padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; border: 1px solid transparent; display: inline-block; }
  .status-badge.confirmada { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .status-badge.pendiente { background: #fffbeb; color: #b45309; border-color: #fde68a; }
  .status-badge.cancelada { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .action-btn { background: transparent; border: 1px solid var(--primary); color: var(--primary); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
  .action-btn:hover { background: var(--primary-light); }

  /* Modales */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal-content { background: white; border-radius: 1rem; padding: 1.5rem; width: 100%; max-width: 400px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); }
  .modal-content h3 { margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem; }
  .modal-content p { margin: 0 0 1.5rem 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
  .form-select { width: 100%; padding: 0.8rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-family: inherit; font-size: 0.95rem; margin-bottom: 1rem; outline: none; }
  .form-select:focus { border-color: var(--primary); }

  /* Utilities Posicionales */
  .overlay-loader { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; z-index: 20; }
  
  /* Responsive */
  @media (min-width: 640px) {
    .nav-link { display: flex; }
    .divider-v { display: block; }
    .user-info-text { display: block; }
    .welcome-card { flex-direction: row; align-items: center; }
    .time-widget { text-align: right; }
  }
  @media (min-width: 1024px) {
    .desk-layout { flex-direction: row; }
    .desk-sidebar { width: 320px; height: calc(100vh - 140px); }
    .sidebar-body { max-height: none; flex: 1; }
    .reservations-layout { flex-direction: row; }
    .res-sidebar { width: 300px; }
  }
`;

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${className}`}>
      {children}
    </button>
  );
};

export default function CoworkingApp() {
  const [currentView, setCurrentView] = useState('login'); 
  const [cedula, setCedula] = useState('');
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [userData, setUserData] = useState(null);
  const [salas, setSalas] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [ocupacion, setOcupacion] = useState({});
  const [reservas, setReservas] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [bookingDesk, setBookingDesk] = useState(null); 
  const [selectedTurno, setSelectedTurno] = useState('');
  const [motivoReserva, setMotivoReserva] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentView === 'rooms') {
      const fetchSalas = async () => {
        setLoading(true); setErrorMsg('');
        try {
          const res = await fetch('https://macfer.crepesywaffles.com/api/working-salas');
          if(!res.ok) throw new Error('Error al cargar salas');
          const data = await res.json();
          setSalas(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err); setErrorMsg('No se pudieron cargar las salas disponibles.');
        } finally { setLoading(false); }
      };
      fetchSalas();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'deskSelection' && selectedRoom) {
      const fetchDisponibilidad = async () => {
        setLoading(true); setErrorMsg('');
        try {
          const [resHorarios, resOcupacion] = await Promise.all([
            fetch('https://macfer.crepesywaffles.com/api/working-horarios'),
            fetch(`https://macfer.crepesywaffles.com/api/working-puesto?sala_id=${selectedRoom.id}&fecha=${selectedDate}`)
          ]);
          
          if(!resHorarios.ok || !resOcupacion.ok) throw new Error('Error al cargar datos de disponibilidad');
          
          const hData = await resHorarios.json();
          const oData = await resOcupacion.json();
          
          setHorarios(Array.isArray(hData) ? hData : []);
          
          const ocupMap = {};
          if (Array.isArray(oData)) {
            oData.forEach(item => { ocupMap[item.escritorio || item.puesto_id] = item; });
          }
          setOcupacion(ocupMap);
        } catch (err) {
          console.error(err); setErrorMsg('No se pudo cargar la disponibilidad de la sala.');
        } finally { setLoading(false); }
      };
      fetchDisponibilidad();
    }
  }, [currentView, selectedRoom, selectedDate]);

  useEffect(() => {
    if (currentView === 'myReservations') {
      const fetchReservas = async () => {
        setLoading(true); setErrorMsg('');
        try {
          const url = userData?.isAdmin 
            ? 'https://macfer.crepesywaffles.com/api/working-reservas' 
            : `https://macfer.crepesywaffles.com/api/working-reservas?documento=${cedula}`;
          const res = await fetch(url);
          if(!res.ok) throw new Error('Error al cargar reservas');
          const data = await res.json();
          setReservas(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err); setErrorMsg('No se pudieron cargar las reservas.');
        } finally { setLoading(false); }
      };
      fetchReservas();
    }
  }, [currentView, userData, cedula]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (cedula.length < 5) return;
    setLoading(true); setErrorMsg('');
    try {
      const res = await fetch(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${cedula}`);
      if (!res.ok) throw new Error('Error de conexión con el sistema');
      const data = await res.json();
      
      const empleado = Array.isArray(data) ? data[0] : (data.data || data);

      if (!empleado) throw new Error('Empleado no encontrado.');
      
      if (empleado.estado === 'Inactivo' || empleado.estado === 'Retirado' || empleado.activo === false) {
         throw new Error('Usuario inactivo. No tienes permisos.');
      }

      setUserData({
        name: empleado.nombres ? `${empleado.nombres} ${empleado.apellidos || ''}` : empleado.nombre || 'Colaborador',
        role: empleado.cargo || 'Staff',
        department: empleado.area || empleado.departamento || 'General',
        photo: empleado.foto || empleado.url_foto || `https://ui-avatars.com/api/?name=${empleado.nombres || 'U'}&background=2563eb&color=fff`,
        isAdmin: empleado.is_admin || false,
        cedula: cedula
      });

      try {
         const polRes = await fetch(`https://macfer.crepesywaffles.com/api/working-politicas?documento=${cedula}`);
         if(polRes.ok) {
            const polData = await polRes.json();
            if(polData.aceptadas || (Array.isArray(polData) && polData.length > 0)) {
               setPoliciesAccepted(true);
            }
         }
      } catch (e) { console.error('Aviso: Políticas no verificables', e); }

      setCurrentView('welcome');
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPolicies = async () => {
    if (policiesAccepted) {
       setCurrentView('rooms');
       return;
    }
    setLoading(true); setErrorMsg('');
    try {
       const res = await fetch('https://macfer.crepesywaffles.com/api/working-politicas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documento: cedula, aceptadas: true, fecha: new Date().toISOString() })
       });
       if(!res.ok) throw new Error('No se pudieron registrar las políticas');
       setPoliciesAccepted(true);
       setCurrentView('rooms');
    } catch(err) {
       setErrorMsg('Error al guardar tu confirmación.');
    } finally { setLoading(false); }
  };

  const handleCreateBooking = async () => {
    if (!selectedTurno) { setErrorMsg('Selecciona un turno'); return; }
    setLoading(true); setErrorMsg('');
    try {
       const res = await fetch('https://macfer.crepesywaffles.com/api/working-reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             documento: cedula, 
             sala_id: selectedRoom.id, 
             escritorio: bookingDesk, 
             fecha: selectedDate, 
             turno: selectedTurno,
             motivo: motivoReserva || 'Ninguno'
          })
       });
       if(!res.ok) throw new Error('No se pudo crear la reserva');
       setBookingDesk(null);
       setCurrentView('myReservations');
    } catch(err) {
       setErrorMsg('Error al procesar tu reserva.');
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    setCurrentView('login');
    setCedula('');
    setUserData(null);
    setPoliciesAccepted(false);
    setSelectedRoom(null);
    setShowLogoutModal(false);
    setErrorMsg('');
  };

  const renderTopBar = (title, showBack = false, onBack = null) => (
    <header className="topbar">
      <div className="topbar-title-group">
        {showBack && (
          <button onClick={onBack} className="btn-icon-only"><ChevronLeft size={24} /></button>
        )}
        <h1 className="topbar-title">
          <Building color="var(--primary)" size={24} /> {title}
        </h1>
      </div>
      
      {userData && (
        <div className="topbar-user-group">
          <button onClick={() => setCurrentView('myReservations')} className="nav-link">
            <Calendar size={18} /> Mis Reservas
          </button>
          <div className="divider-v"></div>
          <div className="flex-center gap-3">
            <div className="user-info-text">
              <p>{userData.name}</p>
              <span>ID: {userData.cedula}</span>
            </div>
            <img src={userData.photo} alt="Perfil" className="user-avatar" />
            <button onClick={() => setShowLogoutModal(true)} className="btn-icon-only" style={{marginLeft: '0.5rem'}} title="Cerrar sesión">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      )}
    </header>
  );

  const renderLogin = () => (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <Building size={48} style={{margin: '0 auto', opacity: 0.9}} />
          <h2>¡Bienvenido al Co-Working!</h2>
          <p>Gestiona tus reservas de manera rápida</p>
        </div>
        <form onSubmit={handleLogin} className="login-body">
          {errorMsg && (
            <div className="alert alert-danger">
              <AlertTriangle size={18} style={{flexShrink: 0}} /> <span>{errorMsg}</span>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="cedula" className="form-label">Ingresa tu cédula para continuar</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input
                id="cedula" type="text" value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                className="form-input" placeholder="No. de cédula" required
              />
            </div>
          </div>
          <Button type="submit" className="btn-w-full" disabled={loading} style={{padding: '0.8rem', fontSize: '1.1rem'}}>
            {loading ? <Loader2 className="spin" size={24} /> : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );

  const renderWelcome = () => (
    <>
      {renderTopBar('Inicio')}
      <div className="container container-sm" style={{paddingTop: '2rem'}}>
        <div className="welcome-card">
          <div className="profile-section flex-1">
            <img src={userData?.photo} alt={userData?.name} className="profile-pic" />
            <div className="profile-details">
              <h2>¡Hola, {userData?.name}!</h2>
              <p className="subtitle">Bienvenido a tu espacio de trabajo</p>
              <p className="role">{userData?.role} • {userData?.department}</p>
            </div>
          </div>
          <div className="time-widget">
            <p className="date">{currentTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="time">{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {!policiesAccepted ? (
          <div className="policy-box">
            <div className="policy-header">
              <Info color="var(--primary)" size={24} /> Políticas de reserva
            </div>
            <div className="policy-body">
              <p style={{marginBottom: '1.5rem', fontWeight: 500}}>Lee las condiciones antes de continuar:</p>
              <ul className="policy-list">
                <li className="policy-item">
                  <div className="policy-icon"><CheckCircle size={20} /></div>
                  <div className="policy-text-block"><strong>Una reserva por día</strong>Solo se permite 1 reserva activa por día (pendiente o confirmada)</div>
                </li>
                <li className="policy-item">
                  <div className="policy-icon"><RefreshCw size={20} /></div>
                  <div className="policy-text-block"><strong>Rotación de puesto</strong>No puedes usar el mismo puesto en días consecutivos</div>
                </li>
                <li className="policy-item">
                  <div className="policy-icon"><Calendar size={20} /></div>
                  <div className="policy-text-block"><strong>Horarios de reserva</strong>Las reservas están habilitadas en días hábiles</div>
                </li>
                <li className="policy-item">
                  <div className="policy-icon"><MapPin size={20} /></div>
                  <div className="policy-text-block"><strong>Confirmación en 15 minutos</strong>Debes confirmar el mismo día dentro de los primeros 15 minutos de tu turno, desde una ubicación permitida (1000 m)</div>
                </li>
                <li className="policy-item">
                  <div className="policy-icon danger"><MapPinOff size={20} /></div>
                  <div className="policy-text-block"><strong>Sin GPS disponible</strong>Si tu dispositivo no permite activar la ubicación, acude a recepción para confirmar tu reserva</div>
                </li>
              </ul>
              {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
              <div className="policy-footer">
                <Button disabled={loading} onClick={handleAcceptPolicies} className="btn-w-full" style={{maxWidth: '300px'}}>
                  {loading ? <Loader2 className="spin" size={18} /> : 'He leído y acepto las políticas'} 
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="policy-box" style={{padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
             <div className="flex-center gap-3">
                <div style={{background: '#d1fae5', color: '#059669', padding: '0.5rem', borderRadius: '50%'}}><CheckCircle size={24} /></div>
                <div>
                   <h3 style={{margin: '0 0 0.25rem'}}>Políticas Aceptadas</h3>
                   <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)'}}>Ya has confirmado los términos del Co-Working.</p>
                </div>
             </div>
             <Button onClick={() => setCurrentView('rooms')}>Continuar a Salas <ChevronLeft style={{transform: 'rotate(180deg)'}} size={18} /></Button>
          </div>
        )}
      </div>
    </>
  );

  const renderRooms = () => (
    <>
      {renderTopBar('Salas Disponibles', true, () => setCurrentView('welcome'))}
      <div className="container">
        <div className="page-header">
          <div>
            <h2>Elige tu sala</h2>
            <p>Selecciona la sala para continuar con tu reserva.</p>
          </div>
          {loading && <Loader2 className="spin text-primary" size={28} color="var(--primary)" />}
        </div>
        
        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
        
        <div className="rooms-grid">
          {salas.length > 0 ? salas.map((sala) => (
            <div key={sala.id} onClick={() => { 
                setSelectedRoom({ ...sala, capacity: sala.capacidad || sala.capacity || 6, withMonitor: sala.con_monitor || sala.withMonitor || [] }); 
                setCurrentView('deskSelection'); 
              }}
              className="room-card"
            >
              <div className="room-img-container">
                <img src={sala.imagen || sala.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80'} alt={sala.nombre} className="room-img" />
                <div className="room-overlay"></div>
                <h3 className="room-title">{sala.nombre || sala.name}</h3>
              </div>
              <div className="room-info">
                <div className="room-features">
                  <p><User size={18} color="var(--primary)" /> <strong>{sala.capacidad || 0} puestos</strong></p>
                  <p><Monitor size={18} color="var(--primary)" /> <span>{(sala.con_monitor || []).length} con monitor</span></p>
                </div>
                <div className="room-action-icon"><ChevronLeft style={{transform: 'rotate(180deg)'}} size={24} /></div>
              </div>
            </div>
          )) : !loading && (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '1rem', border: '1px solid var(--border-color)'}}>
              <p style={{color: 'var(--text-muted)'}}>No hay salas disponibles en este momento.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderDeskSelection = () => {
    const desks = Array.from({ length: selectedRoom?.capacity || 6 }, (_, i) => i + 1);
    const getStatusClass = (deskId) => {
      const status = (ocupacion[deskId]?.estado || ESTADOS_PUESTO.DISPONIBLE).toLowerCase();
      if (status.includes('ocupado')) return 'bg-occupied occupied';
      if (status.includes('limitado') || status.includes('parcial')) return 'bg-limited';
      return 'bg-available';
    };

    return (
      <>
        {renderTopBar(`Reservar en ${selectedRoom?.nombre || selectedRoom?.name}`, true, () => setCurrentView('rooms'))}
        
        <div className="container flex-1">
          <div className="desk-layout">
            <div className="desk-main-area">
              {errorMsg && <div className="alert alert-danger flex-between"><span>{errorMsg}</span><button onClick={() => setErrorMsg('')} style={{background:'none', border:'none', cursor:'pointer'}}><AlertTriangle size={18}/></button></div>}

              <div className="filters-bar">
                <div className="flex-center gap-2">
                  <Calendar color="var(--primary)" size={20} />
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-picker" />
                </div>
                <div className="legend-items">
                  <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--success)'}}></span> Disponible</div>
                  <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--warning)'}}></span> Medio Turno</div>
                  <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--danger)'}}></span> Ocupado</div>
                  <div className="flex-center gap-2" style={{marginLeft: '0.5rem'}}><Monitor size={16}/> Esc: {(selectedRoom?.con_monitor || []).join(', ')}</div>
                </div>
              </div>

              <div className="map-container">
                {loading && <div className="overlay-loader"><Loader2 className="spin" size={40} color="var(--primary)"/></div>}
                <div className="table-graphic">
                  <div className="table-surface">
                    <div className="table-surface-inner"></div>
                    <span className="table-label">Mesa Principal</span>
                  </div>
                  
                  {desks.map((deskId, index) => {
                    const isTop = index < desks.length / 2;
                    const positionClass = isTop ? 'top' : 'bottom';
                    const leftPercent = isTop ? 20 + (index * 30) : 20 + ((index - desks.length/2) * 30);
                    const hasMonitor = (selectedRoom?.con_monitor || []).includes(deskId);
                    const statusClass = getStatusClass(deskId);
                    const isOccupied = statusClass.includes('occupied');

                    return (
                      <div 
                        key={deskId} className={`desk-node ${positionClass} ${isOccupied ? 'occupied' : ''}`}
                        style={{ left: `${leftPercent}%` }}
                        onClick={() => { if (!isOccupied) { setBookingDesk(deskId); setSelectedTurno(''); setMotivoReserva(''); } }}
                      >
                        {isTop && hasMonitor && <Monitor size={20} color="#4b5563" />}
                        <div className={`desk-box ${statusClass}`}>{deskId}</div>
                        <span className="desk-badge">Esc. {deskId}</span>
                        {!isTop && hasMonitor && <Monitor size={20} color="#4b5563" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="desk-sidebar">
              <div className="sidebar-header"><Clock size={20} /> Ocupación Actual</div>
              <div className="sidebar-body">
                {desks.map(deskId => {
                  const ocupItem = ocupacion[deskId];
                  const hasMonitor = (selectedRoom?.con_monitor || []).includes(deskId);
                  return (
                    <div key={deskId} className="sidebar-item">
                      <div className={`sidebar-desk-icon ${getStatusClass(deskId).split(' ')[0]}`}>{deskId}</div>
                      <div className="sidebar-desk-info">
                        <p className="title">Esc. {deskId} {hasMonitor && <Monitor size={14} color="var(--primary)" />}</p>
                        {ocupItem?.usuario ? <p className="status">{ocupItem.usuario}</p> : <p className="status" style={{color: 'var(--success)', fontWeight: 500}}>Libre</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {bookingDesk && (
           <div className="modal-overlay">
             <div className="modal-content">
               <h3 style={{color: 'var(--primary)'}}><Calendar /> Confirmar Reserva</h3>
               <p>Reservando <strong>Escritorio {bookingDesk}</strong> para el <strong>{selectedDate}</strong>.</p>
               
               <label className="form-label">Turno</label>
               <select value={selectedTurno} onChange={(e) => setSelectedTurno(e.target.value)} className="form-select">
                  <option value="">Selecciona un turno...</option>
                  {horarios.map(h => <option key={h.id || h.nombre} value={h.id || h.nombre}>{h.etiqueta || h.nombre || h.id}</option>)}
               </select>
               
               <label className="form-label" style={{marginTop: '0.5rem'}}>Motivo de reserva (Opcional)</label>
               <input type="text" value={motivoReserva} onChange={(e) => setMotivoReserva(e.target.value)} placeholder="Ej. Trabajo presencial" className="form-input" style={{marginBottom: '1.5rem'}} />
               
               <div className="modal-actions">
                  <Button variant="secondary" onClick={() => setBookingDesk(null)}>Cancelar</Button>
                  <Button onClick={handleCreateBooking} disabled={!selectedTurno || loading}>{loading ? <Loader2 className="spin" size={18} /> : 'Confirmar Reserva'}</Button>
               </div>
             </div>
           </div>
        )}
      </>
    );
  };

  const renderMyReservations = () => (
    <>
      {renderTopBar(userData?.isAdmin ? "Todas las Reservas" : "Mis Reservas", true, () => setCurrentView('welcome'))}
      
      <div className="container flex-1 py-8">
        <div className="reservations-layout">
          
          <div className="res-sidebar">
            <div className="res-user-card">
              <img src={userData?.photo} alt={userData?.name} />
              <h3>{userData?.name}</h3>
              <span className={`role-badge ${userData?.isAdmin ? 'role-admin' : 'role-user'}`}>
                {userData?.isAdmin ? 'Administrador' : 'Usuario'}
              </span>
            </div>

            <div className="location-card">
              <h3 className="location-header"><MapPin color="var(--primary)" size={20} /> Ubicación</h3>
              <div className="location-status">
                <MapPinOff color="var(--danger)" size={28} style={{margin: '0 auto'}} />
                <p>Permiso denegado</p>
                <span>Para confirmar, debes estar a menos de 1000m.</span>
              </div>
              <Button className="btn-w-full" variant="secondary"><RefreshCw size={16} /> Actualizar ubicación</Button>
            </div>
          </div>

          <div className="table-container">
             <div className="table-header">
                <h3>Detalles de reserva</h3>
                {userData?.isAdmin && <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '1rem'}}>Mostrando todos los registros</span>}
             </div>
             
             {errorMsg && <div className="alert alert-danger" style={{margin: '1rem', marginBottom: 0}}>{errorMsg}</div>}

             <div className="table-wrapper">
               {loading && <div className="overlay-loader"><Loader2 className="spin" size={32} color="var(--primary)" /></div>}
               <table className="data-table">
                 <thead>
                   <tr>
                     <th>ID</th>
                     <th>Fecha</th>
                     <th>Escritorio</th>
                     <th>Horario</th>
                     <th>Estado</th>
                     <th>Motivo</th>
                     <th>Acciones</th>
                   </tr>
                 </thead>
                 <tbody>
                   {reservas.map((reserva) => {
                     const isOwner = reserva.documento === cedula;
                     const stateStr = (reserva.estado || 'desconocido').toLowerCase();
                     let stateClass = '';
                     if(stateStr.includes('confirm')) stateClass = 'confirmada';
                     else if(stateStr.includes('pend')) stateClass = 'pendiente';
                     else if(stateStr.includes('cancel')) stateClass = 'cancelada';

                     return (
                       <tr key={reserva.id}>
                         <td style={{fontWeight: 600}}>#{reserva.id}</td>
                         <td>{reserva.fecha || reserva.date}</td>
                         <td>Esc. {reserva.escritorio || reserva.desk}</td>
                         <td>{reserva.turno || reserva.time}</td>
                         <td><span className={`status-badge ${stateClass}`}>{reserva.estado || 'Desconocido'}</span></td>
                         <td style={{color: 'var(--text-muted)'}}>{reserva.motivo || 'Ninguno'}</td>
                         <td>
                           {stateStr.includes('pendiente') && isOwner && (
                             <button className="action-btn">Confirmar</button>
                           )}
                           {stateStr.includes('confirmada') && isOwner && (
                             <span style={{color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600}}><CheckCircle size={14} /> Lista</span>
                           )}
                         </td>
                       </tr>
                     );
                   })}
                   {!loading && reservas.length === 0 && (
                     <tr><td colSpan="7" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>No hay reservas para mostrar.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="cw-app">
      <style>{styles}</style>
      
      {currentView === 'login' && renderLogin()}
      {currentView === 'welcome' && renderWelcome()}
      {currentView === 'rooms' && renderRooms()}
      {currentView === 'deskSelection' && renderDeskSelection()}
      {currentView === 'myReservations' && renderMyReservations()}
      
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{color: 'var(--danger)'}}><AlertTriangle /> ¿Cerrar Sesión?</h3>
            <p>¿Estás seguro de que deseas salir de tu sesión actual?</p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleLogout}>Sí, salir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}