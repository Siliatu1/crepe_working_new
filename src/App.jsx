import { Routes, Route } from 'react-router-dom'
import './App.css'
import Validar_cedula from './assets/componentes/Validar_cedula.jsx'
import Bienvenida from './assets/componentes/Bienvenida.jsx'
import Politicas from './assets/componentes/Politicas.jsx'


function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Validar_cedula />} />
        <Route path="/bienvenida" element={<Bienvenida />} />
        <Route path="/politicas" element={<Politicas />} />
      </Routes>
    </div>
  );

}

export default App
