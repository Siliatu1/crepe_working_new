import { Routes, Route } from 'react-router-dom'
import Validar_cedula from './assets/componentes/Validar_cedula.jsx'
import Bienvenida from './assets/componentes/Bienvenida.jsx'
import Politicas from './assets/componentes/Politicas.jsx'
<<<<<<< Updated upstream
import Reservas from './assets/componentes/Reservas.jsx'
=======
import Reservacion from './assets/componentes/Reservacion.jsx'
import Panel from './assets/componentes/Panel.jsx'
>>>>>>> Stashed changes

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Validar_cedula />} />
        <Route path="/bienvenida" element={<Bienvenida />} />
        <Route path="/politicas" element={<Politicas />} />
<<<<<<< Updated upstream
        <Route path="/reservas" element={<Reservas />} />
=======
        <Route path="/reservacion" element={<Reservacion />} />
        <Route path="/panel" element={<Panel />} />
>>>>>>> Stashed changes
      </Routes>
    </div>
  );
}

export default App
