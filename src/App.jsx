import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAutoCancelarReservas from './hooks/useAutoCancelarReservas.js'
import { getSession, hasActiveSession } from './utils/sessionFlow.js'

// Lazy load components for better performance
const Validar_cedula = lazy(() => import('./assets/componentes/Validar_cedula.jsx'))
const Bienvenida = lazy(() => import('./assets/componentes/Bienvenida.jsx'))
const Politicas = lazy(() => import('./assets/componentes/Politicas.jsx'))
const Salas = lazy(() => import('./assets/componentes/Salas.jsx'))
const Reservas = lazy(() => import('./assets/componentes/Reservas.jsx'))
const Panel = lazy(() => import('./assets/componentes/Panel.jsx'))

// Loading fallback component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>
    Cargando...
  </div>
)

const RouteGuard = ({ mode, children }) => {
  const session = getSession();
  if (!hasActiveSession()) {
    return <Navigate to="/" replace />;
  }

  if (mode === 'bienvenida') {
    if (session?.bienvenidaVista) {
      return <Navigate to={session?.politicasAceptadas ? '/salas' : '/politicas'} replace />;
    }
    return children;
  }

  if (mode === 'politicas') {
    if (!session?.bienvenidaVista) return <Navigate to="/bienvenida" replace />;
    if (session?.politicasAceptadas) return <Navigate to="/salas" replace />;
    return children;
  }

  if (mode === 'policies' && !session?.politicasAceptadas) {
    return <Navigate to="/politicas" replace />;
  }

  return children;
};

function App() {
  useAutoCancelarReservas(true)

  return (
    <div className="App">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Validar_cedula />} />
          <Route path="/bienvenida" element={<RouteGuard mode="bienvenida"><Bienvenida /></RouteGuard>} />
          <Route path="/politicas" element={<RouteGuard mode="politicas"><Politicas /></RouteGuard>} />
          <Route path="/salas" element={<RouteGuard mode="policies"><Salas /></RouteGuard>} />
          <Route path="/reservas" element={<RouteGuard mode="policies"><Reservas /></RouteGuard>} />
          <Route path="/panel" element={<RouteGuard><Panel /></RouteGuard>} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App