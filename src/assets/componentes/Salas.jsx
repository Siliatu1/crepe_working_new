import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mesaImg from "../mesa.png";
import { Monitor, LogOut, Armchair, Ticket, ArrowLeft, ArrowRight, Users } from "lucide-react";

// ── Constantes ────────────────────────────────────────────
const BASE      = 'https://macfer.crepesywaffles.com';
const API_SALAS = `${BASE}/api/working-salas`;
const ADMINS    = ["1028783377"];

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
            <Users size={16} strokeWidth={2.5} />
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
  const usuario  = location.state?.datosEmpleado || null;
  const esAdmin  = ADMINS.includes(usuario?.documento ?? usuario?.document_number ?? '');

  const [salas,      setSalas]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const cargarSalas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_SALAS}?populate=foto&sort=id:asc`);
      const json = await response.json();
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

  return (
    <div className="salas-page-wrapper">
        <div className="salas-layout">
            <div className="top-right-nav-actions salas-header-actions" style={{ flexWrap: 'nowrap' }}>
              <div className="top-nav-btn-group">
              <button
                className="btn-outline top-nav-icon-btn"
                onClick={() => navigate('/panel', { state: { datosEmpleado: usuario } })}
                title={esAdmin ? 'Panel Admin' : 'Mis Reservas'}
                aria-label={esAdmin ? 'Panel Admin' : 'Mis Reservas'}
              >
                <Armchair size={14} strokeWidth={2.5} />
              </button>
              <button
                className="btn-outline top-nav-icon-btn"
                style={{
                  borderColor: 'rgba(192,57,43,0.35)',
                  color: '#c0392b',
                }}
                onClick={() => navigate('/')}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut size={14} strokeWidth={2} />
              </button>
              <button
                className="btn-outline reservas-btn-atras top-nav-icon-btn"
                onClick={() => navigate(-1)}
                title="Volver"
                aria-label="Volver"
              >
                <ArrowLeft size={14} strokeWidth={2.5} />
              </button>
              </div>
            </div>

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

            {/* Cargando */}
            {loading && (
              <div className="salas-state-msg">
                Cargando salas…
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



