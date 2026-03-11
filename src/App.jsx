import { Routes, Route } from 'react-router-dom'
import Validar_cedula from './assets/componentes/Validar_cedula.jsx'
import Bienvenida from './assets/componentes/Bienvenida.jsx'
import Politicas from './assets/componentes/Politicas.jsx'
import Salas from './assets/componentes/Salas.jsx'
import Reservas from './assets/componentes/Reservas.jsx'
import Panel from './assets/componentes/Panel.jsx'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Validar_cedula />} />
        <Route path="/bienvenida" element={<Bienvenida />} />
        <Route path="/politicas" element={<Politicas />} />
        <Route path="/salas" element={<Salas />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/panel" element={<Panel />} />
      </Routes>
    </div>
  );
}

export default App