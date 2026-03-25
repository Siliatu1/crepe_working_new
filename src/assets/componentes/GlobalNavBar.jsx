import { LogOut, ArrowLeft, User } from 'lucide-react';
import { Popconfirm } from 'antd';

export default function GlobalNavBar({
  onLogout,
  onGoBack,
  onGoToPanel,
  isNavigating,
  dateSelector = null,
  datosEmpleado = null,
}) {
  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="global-nav-bar" style={{ flexWrap: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '20px' }}>
      {/* Lado Izquierdo: Admin Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
        {datosEmpleado && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '24px', minWidth: 'auto', flexShrink: 0 }}>
            {datosEmpleado?.foto && datosEmpleado.foto !== "null" ? (
              <img 
                src={datosEmpleado?.foto} 
                alt="Foto" 
                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: "rgba(204,138,34,0.1)", display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <User size={20} color="#92614F" strokeWidth={2} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', minWidth: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#503629', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', alignItems: 'center', display: 'flex', gap: '4px' }}>
                ¡Hola, {String(datosEmpleado?.nombre || 'Admin').split(/\s+/)[0]}!
              </span>
              <span style={{ fontSize: '0.73rem', color: '#92614F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Panel de administración
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="top-nav-btn-group global-nav-btn-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* DateSelector (solo en Reservas) - al lado de botones */}
        {dateSelector && (
          <div className="global-nav-date-selector">
            {dateSelector}
          </div>
        )}
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
        <Popconfirm
          title="¿Estás seguro de que deseas cerrar sesión?"
          onConfirm={handleLogout}
          okText="Sí, cerrar"
          cancelText="Cancelar"
          okType="danger"
          icon={null}
          placement="topLeft"
          overlayClassName="popconfirm-logout"
        >
          <button
            className="btn-outline top-nav-icon-btn global-nav-logout"
            disabled={isNavigating}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            style={{
              borderColor: 'rgba(192,57,43,0.35)',
              color: '#c0392b',
            }}
          >
            <LogOut size={14} strokeWidth={2} />
          </button>
        </Popconfirm>
      </div>
    </div>
  );
}
