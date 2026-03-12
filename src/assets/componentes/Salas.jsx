import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mesaImg from "../mesa.png";

// ── Constantes ────────────────────────────────────────────
const BASE      = 'https://macfer.crepesywaffles.com';
const API_SALAS = `${BASE}/api/working-salas`;
const ADMINS    = ["1028783377"];

// ── Iconos ────────────────────────────────────────────────
const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconChair = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M6 2v8"/><path d="M18 2v8"/><path d="M4 10h16"/>
    <path d="M6 10v10"/><path d="M18 10v10"/><path d="M9 20h6"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

// ── Normaliza una sala desde la API ───────────────────────
const normalizeSala = (item) => {
  const a = item.attributes ?? item;
  // Soporta imagen como relación Strapi (imagen.data.attributes.url) o URL directa
  let imagenUrl = null;
  if (a.imagen?.data?.attributes?.url) {
    imagenUrl = a.imagen.data.attributes.url.startsWith('http')
      ? a.imagen.data.attributes.url
      : `${BASE}${a.imagen.data.attributes.url}`;
  } else if (typeof a.imagen === 'string' && a.imagen.length > 0) {
    imagenUrl = a.imagen.startsWith('http') ? a.imagen : `${BASE}${a.imagen}`;
  } else if (a.imagenUrl) {
    imagenUrl = a.imagenUrl;
  }
  return {
    id:          item.id,
    nombre:      a.nombre      ?? a.name    ?? `Sala ${item.id}`,
    escritorios: a.escritorios ?? a.puestos ?? 0,
    monitores:   a.monitores   ?? 0,
    imagen:      imagenUrl,
    disponible:  a.disponible  !== false,
    ruta:        '/reservas',
  };
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
            <IconChair />
            <span className="text-muted">{sala.escritorios} escritorios</span>
          </div>
          {sala.monitores > 0 && (
            <div className="salas-card-feature">
              <IconMonitor />
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
              <IconArrowRight />
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
  const usuario  = location.state?.datosEmpleado || null;
  const nombre   = usuario?.nombre?.split(" ")[0] ?? "allí";

  const [salas,   setSalas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const cargarSalas = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_SALAS}?populate=imagen&sort=id:asc`)
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json.data) ? json.data : [];
        setSalas(data.map(normalizeSala));
      })
      .catch(() => setError('No se pudieron cargar las salas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargarSalas(); }, []);

  // Contenedor escala con la cantidad de salas
  const numSalas       = salas.length;
  const containerWidth = numSalas <= 1 ? '340px'
    : numSalas <= 2    ? '520px'
    : numSalas <= 4    ? '720px'
    : '940px';

  return (
    <div className="page-wrapper">
      <div
        className="bienvenida-card"
        style={{
          width: '1000px',
          transition: 'max-width 0.3s ease',
        }}
      >

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 4,
        }}>
          <div style={{ flex: 1 }}>
            <h1 className="bienvenida-saludo" style={{ textAlign: 'left', marginBottom: 4 }}>
              Hola, <span className="text-accent">{nombre}</span>
            </h1>
            <p className="text-muted bienvenida-sub" style={{ textAlign: 'left', marginBottom: 0 }}>
              Elige la sala que deseas reservar
            </p>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12, marginTop: 2 }}>
            <button
              className="btn-outline"
              onClick={() => navigate('/')}
              title="Cerrar sesión"
              style={{
                width: 32, height: 32, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '999px',
                borderColor: 'rgba(192,57,43,0.35)',
                color: '#c0392b',
              }}
            >
              <IconLogout />
            </button>
          </div>
        </div>

        <div className="bienvenida-divider" style={{ margin: '16px 0' }} />

        {/* Cargando */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#92614F', fontSize: '0.85rem' }}>
            Cargando salas…
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: '#c0392b', fontSize: '0.82rem', marginBottom: 12 }}>{error}</p>
            <button className="btn-outline" onClick={cargarSalas} style={{ fontSize: '0.8rem', padding: '7px 16px' }}>
              Reintentar
            </button>
          </div>
        )}

        {/* Vacío */}
        {!loading && !error && salas.length === 0 && (
          <p className="text-muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: '0.85rem' }}>
            No hay salas registradas.
          </p>
        )}

        {/* Grid dinámico */}
        {!loading && !error && salas.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {salas.map((sala) => (
              <SalaCard
                key={sala.id}
                sala={sala}
                onClick={() => navigate(sala.ruta, { state: { datosEmpleado: usuario } })}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}