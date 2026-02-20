import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BsShieldCheck, BsPersonBadge } from "react-icons/bs";
import "./validar_cedula.css";


const ValidarCedula = () => {
  const navigate = useNavigate();
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleUsuario = async (e) => {
    e.preventDefault();
    
    if (!cedula.trim()) {
      setError("Por favor ingrese el número de cédula");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${cedula}`,
     
      );

      const empleado = response.data.data[0];

      const fechaHoraIngreso = new Date();
   
      console.log("Respuesta de la API:", response.data.data);
      

      navigate('/bienvenida', { 
        state: { 
          datosEmpleado: empleado,
          fechaHoraIngreso: fechaHoraIngreso.toISOString()
        } 
      });
   
    } catch (error) {
      console.error(error);
      setError("Error al validar la cédula. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCedulaChange = (e) => {
    
    const value = e.target.value.replace(/\D/g, "");
    setCedula(value);
  };

  return (
    
      <div className="login-card">
        <h1 className="login-title">Crepe-Working</h1>
        
        <form onSubmit={handleUsuario} className="login-form">
          <div className="form-group">
            <label htmlFor="cedula" className="form-label">
              <BsPersonBadge className="icon-label" /> Número de Cédula
            </label>
            <input
              type="text"
              id="cedula"
              className="form-input"
              placeholder="Ingrese su número de cédula"
              value={cedula}
              onChange={handleCedulaChange}
              disabled={loading || success}
              maxLength="15"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">¡Acceso concedido!</div>}

          <button
            type="submit"
            className="submit-button"
            disabled={loading || success}
          >
            {loading ? "Validando..." : "Ingresar"}
          </button>
        </form>
      </div>
  );
};

export default ValidarCedula;