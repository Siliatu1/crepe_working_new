import { useState } from 'react'
import './App.css'
import Validar_cedula from './assets/componentes/Validar_cedula.jsx'
import Bienvenida from './assets/componentes/Bienvenida.jsx'


function App() {
  const [vistaActual, setVistaActual] = useState('login'); 

  const handleValidacionExitosa = () => {
    setVistaActual('bienvenida');
  };

  const handleContinuarEspera = () => {
    // Aquí puedes agregar la lógica para continuar a otra vista
    console.log('Continuar');
  };

  const handleVolver = () => {
    setVistaActual('login');
  };

   return (
    <div className="App">
      {vistaActual === 'login' ? (
        <Validar_cedula onValidacionExitosa={handleValidacionExitosa} />
      ) : vistaActual === 'bienvenida' ? (
        <Bienvenida onContinuar={handleContinuarEspera} onVolver={handleVolver} />
      ) : null}
    </div>
    );

}

export default App
