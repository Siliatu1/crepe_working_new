import React from "react";
import { useState } from "react";
import axios from "axios";
import { BsShieldCheck, BsPersonBadge } from "react-icons/bs";
import "./validar_cedula.css";

const ValidarCedula = ({ onValidacionExitosa }) => {
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
        `https://apialohav2.crepesywaffles.com/buk/empleados3?page_size=500&document_number=${cedula}`,
        {
          headers: {
            Accept: "application/json",
            auth_token: "tmMC1o7cUovQvWoKhvbdhYxx",
          },
        }
      );

      console.log("Respuesta de la API:", response.data.data);

      if (response.data.data && response.data.data.length > 0) {
        // Buscar el empleado que coincida exactamente con la cédula ingresada
        const empleado = response.data.data.find(
          (emp) => emp.document_number.toString() === cedula.toString()
        );
        
        if (!empleado) {
          setError("No se encontró ningún empleado con esa cédula");
          return;
        }
        
        console.log("Empleado encontrado:", empleado);
        
        if (empleado.status !== "activo") {
          setError("El empleado no está activo en el sistema");
          return;
        }
        
        // Guardar datos del empleado en localStorage
        localStorage.setItem("picture", empleado.foto || "");
        localStorage.setItem("nombre", empleado.nombre || "");
        localStorage.setItem("cedula", empleado.document_number || "");
        localStorage.setItem("cargo", empleado.cargo || "");
        //localStorage.setItem("area_nombre", empleado.area_nombre || "");
        
        const horaIngreso = new Date().toISOString();
        localStorage.setItem("horaIngreso", horaIngreso);
        
        console.log("Hora de ingreso:", horaIngreso);
        
        setSuccess(true);
        setError("");
        
        
        setTimeout(() => {
          if (onValidacionExitosa) {
            onValidacionExitosa();
          }
        }, 1000);
      } else {
        setError("No se encontró ningún empleado con esa cédula");
      }
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
    <div className="login-container">
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
    </div>
  );
};

export default ValidarCedula;