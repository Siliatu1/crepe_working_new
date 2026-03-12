import React, { useState, useEffect, useRef } from "react";
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
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

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
            <IconChair />
            <span className="text-muted">{sala.capacidad} {sala.capacidad === 1 ? 'puesto' : 'puestos'}</span>
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

// ── Modal: crear nueva sala ───────────────────────────────
const initialForm = { nombre: '', capacidad: '', monitores: '' };

const CrearSalaModal = ({ onClose, onCreated }) => {
  const [form,    setForm]    = useState(initialForm);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nombre    = form.nombre.trim();
    const capacidad = parseInt(form.capacidad, 10);
    const monitores = parseInt(form.monitores,  10) || 0;
    if (!nombre)          return setError('El nombre es obligatorio.');
    if (isNaN(capacidad) || capacidad < 1) return setError('La capacidad debe ser mayor a 0.');
    if (monitores > capacidad) return setError('Los monitores no pueden superar la capacidad.');

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_SALAS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { nombre, capacidad, monitores } }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      onCreated(normalizeSala(json.data));
    } catch {
      setError('No se pudo crear la sala. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="salas-modal-backdrop" onClick={onClose}>
      <div className="salas-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="salas-modal-header">
          <span className="salas-modal-title">Nueva sala</span>
          <button className="salas-modal-close" onClick={onClose} aria-label="Cerrar"><IconClose /></button>
        </div>

        <form onSubmit={handleSubmit} className="salas-modal-form">
          <div className="salas-modal-field">
            <label className="salas-modal-label">Nombre *</label>
            <input
              ref={inputRef}
              className="form-input"
              type="text"
              placeholder="Ej: CREPE WORKING 2"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              maxLength={80}
              disabled={saving}
            />
          </div>

          <div className="salas-modal-row">
            <div className="salas-modal-field">
              <label className="salas-modal-label">Puestos totales *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="100"
                placeholder="6"
                value={form.capacidad}
                onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="salas-modal-field">
              <label className="salas-modal-label">Con monitor</label>
              <input
                className="form-input"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={form.monitores}
                onChange={e => setForm(f => ({ ...f, monitores: e.target.value }))}
                disabled={saving}
              />
            </div>
          </div>

          {error && <p className="salas-modal-error">{error}</p>}

          <div className="salas-modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear sala'}
            </button>
          </div>
        </form>
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
  const esAdmin  = ADMINS.includes(usuario?.documento ?? usuario?.document_number ?? '');

  const [salas,      setSalas]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [modalOpen,  setModalOpen]  = useState(false);

  const cargarSalas = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_SALAS}?populate=foto&sort=id:asc`)
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json.data) ? json.data : [];
        setSalas(data.map(normalizeSala));
      })
      .catch(() => setError('No se pudieron cargar las salas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargarSalas(); }, []);

  const handleCreated = (nuevaSala) => {
    setSalas(prev => [...prev, nuevaSala]);
    setModalOpen(false);
  };

  return (
    <>
      {modalOpen && (
        <CrearSalaModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      )}

      <div className="salas-page-wrapper">
        <div className="salas-container">

          {/* Header */}
          <div className="salas-header">
            <div>
              <h1 className="bienvenida-saludo salas-title">Elige la sala que deseas reservar</h1>
            </div>

            <div className="salas-header-actions">
              <button
                className="salas-icon-btn"
                onClick={cargarSalas}
                title="Refrescar"
                aria-label="Refrescar salas"
              >
                <IconRefresh />
              </button>
              {esAdmin && (
                <button
                  className="salas-icon-btn salas-icon-btn--primary"
                  onClick={() => setModalOpen(true)}
                  title="Crear nueva sala"
                  aria-label="Crear nueva sala"
                >
                  <IconPlus />
                </button>
              )}
              <button
                className="salas-icon-btn salas-icon-btn--danger"
                onClick={() => navigate('/')}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <IconLogout />
              </button>
            </div>
          </div>

          <div className="bienvenida-divider" style={{ margin: '16px 0' }} />

          {/* Cargando */}
          {loading && (
            <div className="salas-state-msg">
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
    </>
  );
}