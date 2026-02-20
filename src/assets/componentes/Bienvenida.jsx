import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BsPersonCircle, BsCalendar3, BsClock, BsArrowLeft } from "react-icons/bs";

const Bienvenida = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datosEmpleado = location.state?.datosEmpleado || {};
  const fechaHoraIngreso = location.state?.fechaHoraIngreso;

  const [horaIngreso, setHoraIngreso] = useState("");
  const [fechaFormateada, setFechaFormateada] = useState("");

  useEffect(() => {
    // Formatear fecha y hora de ingreso
    if (fechaHoraIngreso) {
      const fecha = new Date(fechaHoraIngreso);
      
      const fechaFormat = fecha.toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }); 
      setFechaFormateada(fechaFormat);
      
      const horaFormat = fecha.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      setHoraIngreso(horaFormat);
    } else {
      setFechaFormateada("No disponible");
      setHoraIngreso("No disponible");
    }



 
    const timer = setTimeout(() => {
      navigate('/politicas');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    
      <div className="bienvenida-card">
        <div className="foto-container">
          {datosEmpleado.foto !== "null" ? (
            <img 
              src={datosEmpleado.foto} 
              alt="Foto del empleado" 
              className="foto-empleado"
            />
          ) : (
            <div className="foto-placeholder">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="icon-user"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </div>

        
        <h1 className="bienvenida-titulo">Hola {datosEmpleado.nombre}, <br></br>Aqui puedes hacer las reservas para el coworking</h1>

      

       
        <div className="info-empleado">
  
          
          <BsPersonCircle className="info-icon" />
          <span className="info-label">DOCUMENTO:</span>
          <span className="info-value">{datosEmpleado.document_number}</span>
          
          <BsPersonCircle className="info-icon" />
          <span className="info-label">CARGO:</span>
          <span className="info-value">{datosEmpleado.cargo}</span>
          
          <BsPersonCircle className="info-icon" />
          <span className="info-label">ÁREA:</span>
          <span className="info-value">{datosEmpleado.area_nombre}</span>
          
          <BsCalendar3 className="info-icon" />
          <span className="info-label">FECHA:</span>
          <span className="info-value">{fechaFormateada}</span>
          
          <BsClock className="info-icon" />
          <span className="info-label">HORA:</span>
          <span className="info-value">{horaIngreso}</span>
        </div>
      </div>
  );
};

export default Bienvenida;
