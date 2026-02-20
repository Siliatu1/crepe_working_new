import { useState } from 'react'
import './App.css'
import Validar_cedula from './assets/componentes/Validar_cedula.jsx'
import Bienvenida from './assets/componentes/Bienvenida.jsx'
import Politicas from './assets/componentes/Politicas.jsx'


function App() {
  const [vistaActual, setVistaActual] = useState('login'); 

  const[datosEmpleado, setDatosEmpleado] =useState(null)

  const handleValidacionExitosa = (empleado) => {
    setDatosEmpleado(empleado);
    setVistaActual('bienvenida');
  };

  const handleContinuarEspera = () => {
    setVistaActual('politicas');
  };

  const handleContinuarPoliticas = () => {
    // Aquí puedes agregar la lógica para continuar a la siguiente vista
    console.log('Políticas aceptadas, continuar');
  };

  const handleCancelarPoliticas = () => {
    setVistaActual('login');
  };

  const handleVolver = () => {
    setVistaActual('login');
  };

   return (
    <div className="App">
      {vistaActual === 'login' ? (
        <Validar_cedula onValidacionExitosa={handleValidacionExitosa} setDatosEmpleado={setDatosEmpleado}/>
      ) : vistaActual === 'bienvenida' ? (
        <Bienvenida onContinuar={handleContinuarEspera} onVolver={handleVolver} datosEmpleado={datosEmpleado} />
      ) : vistaActual === 'politicas' ? (
        <Politicas onContinuar={handleContinuarPoliticas} onCancelar={handleCancelarPoliticas} />
      ) : null}
    </div>
    );

}

export default App
