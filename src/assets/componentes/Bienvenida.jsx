import React from "react";
import { useEffect, useState } from "react";
import { BsPersonCircle, BsCalendar3, BsClock, BsArrowLeft } from "react-icons/bs";
import "./Bienvenida.css";

const Bienvenida = ({ onContinuar, onVolver }) => {
  const [datosEmpleado, setDatosEmpleado] = useState({
    picture: "",
    nombre: "",
    cedula: "",
    cargo: "",
    area_nombre: "",
    horaIngreso: "",
    fecha: ""
  });

  useEffect(() => {
   
    const picture = localStorage.getItem("picture");
    const nombre = localStorage.getItem("nombre");
    const cedula = localStorage.getItem("cedula");
    const cargo = localStorage.getItem("cargo");
    const area_nombre = localStorage.getItem("area_nombre");
    const horaIngreso = localStorage.getItem("horaIngreso");
    let fechaFormateada = "No disponible";
    let horaFormateada = "No disponible";

    if (horaIngreso) {
      const fecha = new Date(horaIngreso);
      fechaFormateada = fecha.toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      horaFormateada = fecha.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }

    setDatosEmpleado({
      picture: picture || "",
      nombre: nombre || "No disponible",
      cedula: cedula || "No disponible",
      cargo: cargo || "No disponible",
      area_nombre: area_nombre || "No disponible",
      horaIngreso: horaFormateada,
      fecha: fechaFormateada
    });

    console.log("Datos del empleado")
    const timer = setTimeout(() => {
      if (onContinuar) {
        onContinuar();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onContinuar]);

  return (
    
      <div className="bienvenida-card">
        
        <div className="foto-container">
          {datosEmpleado.picture && datosEmpleado.picture !== "null" ? (
            <img 
              src={datosEmpleado.picture} 
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

        
        <h1 className="bienvenida-titulo">Aqui puedes hacer las reservas para el coworking</h1>

      

       
        <div className="info-empleado">
          <BsPersonCircle className="info-icon" />
          <span className="info-label">NOMBRE:</span>
          <span className="info-value">{datosEmpleado.nombre}</span>
          
          <BsPersonCircle className="info-icon" />
          <span className="info-label">DOCUMENTO:</span>
          <span className="info-value">{datosEmpleado.cedula}</span>
          
          <BsPersonCircle className="info-icon" />
          <span className="info-label">CARGO:</span>
          <span className="info-value">{datosEmpleado.cargo}</span>
          
          <BsPersonCircle className="info-icon" />
          <span className="info-label">ÁREA:</span>
          <span className="info-value">{datosEmpleado.area_nombre}</span>
          
          <BsCalendar3 className="info-icon" />
          <span className="info-label">FECHA:</span>
          <span className="info-value">{datosEmpleado.fecha}</span>
          
          <BsClock className="info-icon" />
          <span className="info-label">HORA:</span>
          <span className="info-value">{datosEmpleado.horaIngreso}</span>
        </div>
      </div>
  );
};

export default Bienvenida;
