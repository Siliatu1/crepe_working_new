import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mesaImg from "../mesa.png";
import { Monitor, LogOut, Armchair, ArrowLeft, ArrowRight } from "lucide-react";
import axios from 'axios';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { ADMIN_DOCUMENTS } from '../../utils/reservaCommon';
import { clearSession, getSession } from "../../utils/sessionFlow";
import GlobalNavBar from './GlobalNavBar';

// ── Constantes ────────────────────────────────────────────
const BASE      = 'https://macfer.crepesywaffles.com';
const API_SALAS = `${BASE}/api/working-salas`;

// ── Normaliza una sala desde la API ───────────────────────
// El campo de imagen en Strapi es "foto" (array de medios)
const normalizeSala = (item) => {
  const a = item.attributes ?? item;

  // foto es un array de relaciones Strapi: foto.data[0].attributes.url
  let imagenUrl = null;
  const fotoArr = a.foto?.data;
  if (Array.isArray(fotoArr) && fotoArr.length > 0) {
    const url = fotoArr[0].attributes?.url;
    if (url) imagenUrl = url.startsWith('http') ? url : `${BASE}${url}`;
  } else if (typeof a.foto === 'string' && a.foto.length > 0) {
    imagenUrl = a.foto.startsWith('http') ? a.foto : `${BASE}${a.foto}`;
  }

  return {
    id:         item.id,
    nombre:     a.nombre    ?? a.name    ?? `Sala ${item.id}`,
    capacidad:  a.capacidad ?? 0,           // total de puestos
    monitores:  a.monitores ?? 0,
    imagen:     imagenUrl,
    disponible: a.disponible !== false,
    ruta:       '/reservas',
  };
};

// Lazy Loading
const SalaCardSkeleton = () => {
  return (
    <div className="salas-card salas-card--skeleton">
      <div className="salas-card-img-wrapper">
        <div className="skeleton-image" />
      </div>
      <div className="salas-card-body">
        <div className="skeleton-title" />
        <div className="bienvenida-divider" style={{ margin: "10px 0" }} />
        <div className="salas-card-features">
          <div className="skeleton-line" style={{ width: '60%' }} />
          <div className="skeleton-line" style={{ width: '50%' }} />
        </div>
        <div className="salas-card-footer">
          <div className="skeleton-button" />
        </div>
      </div>
    </div>
  );
};

// ── SalaCard ──────────────────────────────────────────────
const SalaCard = ({ sala, onClick }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`salas-card${hover && sala.disponible ? " salas-card--hover" : ""}${!sala.disponible ? " salas-card--disabled" : ""}`}
      onClick={sala.disponible ? onClick : undefined}
      onMouseEnter={() => sala.disponible && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}
    >
      {!sala.disponible && (
        <div className="salas-card-overlay">
          <span className="salas-card-badge-pronto" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
            Próximamente
          </span>
        </div>
      )}

      {/* Imagen */}
      <div className="salas-card-img-wrapper">
        <img
          src={sala.imagen ?? mesaImg}
          alt={sala.nombre}
          className={`salas-card-img${hover && sala.disponible ? " salas-card-img--hover" : ""}${!sala.disponible ? " salas-card-img--disabled" : ""}`}
          onError={e => { e.currentTarget.src = mesaImg; }}
        />
      </div>

      {/* Info */}
      <div className="salas-card-body">
        <div className="salas-card-nombre">{sala.nombre}</div>
        <div className="bienvenida-divider" style={{ margin: "10px 0" }} />
        <div className="salas-card-features">
          <div className="salas-card-feature">
            <Armchair size={16} strokeWidth={2.5} />
            <span className="text-muted">{sala.capacidad} {sala.capacidad === 1 ? 'puesto' : 'puestos'}</span>
          </div>
          {sala.monitores > 0 && (
            <div className="salas-card-feature">
              <Monitor size={16} strokeWidth={2.5} />
              <span className="text-muted">{sala.monitores} con monitor</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="salas-card-footer">
          <span className="salas-card-disponible" style={{
            color:      sala.disponible ? undefined : '#92614F',
            background: sala.disponible ? undefined : 'rgba(80,54,41,0.07)',
          }}>
            {sala.disponible ? 'Disponible' : 'No disponible'}
          </span>
          {sala.disponible && (
            <div className={`salas-card-arrow-btn${hover ? ' salas-card-arrow-btn--hover' : ''}`}>
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────
export default function Salas() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const usuario  = location.state?.datosEmpleado || session?.datosEmpleado || null;
  const esAdmin  = ADMIN_DOCUMENTS.includes(usuario?.documento ?? usuario?.document_number ?? '');
  const [isNavigating, setIsNavigating] = useState(false);

  const handleLogout = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    clearSession();
    navigate('/', { replace: true });
  }, [isNavigating, navigate]);

  const handleGoBack = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/politicas', { state: { datosEmpleado: usuario }, replace: true });
  }, [isNavigating, navigate, usuario]);

  const handleGoToPanel = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/panel', { state: { datosEmpleado: usuario }, replace: false });
  }, [isNavigating, navigate, usuario]);

  const [salas,      setSalas]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const cargarSalas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: json } = await axios.get(`${API_SALAS}?populate=foto&sort=id:asc`);
      const data = Array.isArray(json.data) ? json.data : [];
      setSalas(data.map(normalizeSala));
    } catch {
      setError('No se pudieron cargar las salas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void cargarSalas();
    }, 0);

    return () => clearTimeout(timer);
  }, [cargarSalas]);

  // ── Sincronización en tiempo real con eventos de socket ──────────────────────
  useRealtimeSync(cargarSalas);

  return (
    <div className="salas-page-wrapper">
        <div className="salas-layout">
            <GlobalNavBar
              onLogout={handleLogout}
              onGoBack={handleGoBack}
              onGoToPanel={handleGoToPanel}
              isNavigating={isNavigating}
            />

          <div className="salas-container">

            {/* Header */}
            <div className="salas-header">
              <div style={{ width: '100%', textAlign: 'center' }}>
                <h1 className="bienvenida-saludo">
                  Elige la sala
                </h1>
                <p className="text-muted bienvenida-sub">
                  Selecciona la sala para continuar con tu reserva
                </p>
              </div>
            </div>

            {/* Cargando - Skeleton Loading */}
            {loading && (
              <div className="salas-grid">
                {[...Array(1)].map((_, i) => (
                  <SalaCardSkeleton key={`skeleton-${i}`} />
                ))}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#c0392b', fontSize: '0.82rem', marginBottom: 0 }}>{error}</p>
              </div>
            )}

            {/* Vacío */}
            {!loading && !error && salas.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: '0.85rem' }}>
                No hay salas registradas.
              </p>
            )}

            {/* Grid */}
            {!loading && !error && salas.length > 0 && (
              <div className="salas-grid">
                {salas.map((sala) => (
                  <SalaCard
                    key={sala.id}
                    sala={sala}
                    onClick={() => navigate(sala.ruta, { state: { datosEmpleado: usuario, salaId: sala.id, salaNombre: sala.nombre } })}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
  );
}



