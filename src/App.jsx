import { Routes, Route } from 'react-router-dom'
import Validar_cedula from './assets/componentes/Validar_cedula.jsx'
import Bienvenida from './assets/componentes/Bienvenida.jsx'
import Politicas from './assets/componentes/Politicas.jsx'
import Reservacion from './assets/componentes/Reservacion.jsx'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Validar_cedula />} />
        <Route path="/bienvenida" element={<Bienvenida />} />
        <Route path="/politicas" element={<Politicas />} />
        <Route path="/reservacion" element={<Reservacion />} />
      </Routes>
    </div>
  );
}

export default App
