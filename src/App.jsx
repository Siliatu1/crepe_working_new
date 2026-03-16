import { Routes, Route, Navigate } from 'react-router-dom'
import Validar_cedula from './assets/componentes/Validar_cedula.jsx'
import Bienvenida from './assets/componentes/Bienvenida.jsx'
import Politicas from './assets/componentes/Politicas.jsx'
import Salas from './assets/componentes/Salas.jsx'
import Reservas from './assets/componentes/Reservas.jsx'
import Panel from './assets/componentes/Panel.jsx'
import useAutoCancelarReservas from './hooks/useAutoCancelarReservas.js'
import { getSession, hasActiveSession } from './utils/sessionFlow.js'

const RouteGuard = ({ mode, children }) => {
  const session = getSession();
  if (!hasActiveSession()) {
    return <Navigate to="/" replace />;
  }

  if (mode === 'bienvenida') {
    if (session?.bienvenidaVista) {
      return <Navigate to={session?.politicasAceptadas ? '/salas' : '/politicas'} replace />;
    }
    return <Bienvenida />;
  }

  if (mode === 'politicas') {
    if (!session?.bienvenidaVista) return <Navigate to="/bienvenida" replace />;
    if (session?.politicasAceptadas) return <Navigate to="/salas" replace />;
    return <Politicas />;
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
      <Routes>
        <Route path="/" element={<Validar_cedula />} />
        <Route path="/bienvenida" element={<RouteGuard mode="bienvenida" />} />
        <Route path="/politicas" element={<RouteGuard mode="politicas" />} />
        <Route path="/salas" element={<RouteGuard mode="policies"><Salas /></RouteGuard>} />
        <Route path="/reservas" element={<RouteGuard mode="policies"><Reservas /></RouteGuard>} />
        <Route path="/panel" element={<RouteGuard><Panel /></RouteGuard>} />
      </Routes>
    </div>
  );
}

export default App