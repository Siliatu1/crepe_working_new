import { LogOut, ArrowLeft } from 'lucide-react';

export default function GlobalNavBar({
  onLogout,
  onGoBack,
  onGoToPanel,
  isNavigating,
  dateSelector = null,
}) {
  return (
    <div className="global-nav-bar" style={{ flexWrap: 'nowrap' }}>
      {/* DateSelector (solo en Reservas) */}
      {dateSelector && (
        <div className="global-nav-date-selector">
          {dateSelector}
        </div>
      )}

      <div className="top-nav-btn-group global-nav-btn-group">
        {/* Botón Mis Reservas - Izquierda */}
        <button
          className="btn-outline global-nav-reservas"
          onClick={onGoToPanel}
          disabled={isNavigating}
          title="Mis Reservas"
          aria-label="Mis Reservas"
        >
          Mis reservas
        </button>

        {/* Botón Atrás - Centro */}
        <button
          className="btn-outline top-nav-icon-btn global-nav-back"
          onClick={onGoBack}
          disabled={isNavigating}
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
        </button>

        {/* Botón Salir - Derecha */}
        <button
          className="btn-outline top-nav-icon-btn global-nav-logout"
          onClick={onLogout}
          disabled={isNavigating}
          title="Cerrar sesión"
          style={{
            borderColor: 'rgba(192,57,43,0.35)',
            color: '#c0392b',
          }}
        >
          <LogOut size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
