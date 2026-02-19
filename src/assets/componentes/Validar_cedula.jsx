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
        https://crepesywaffles.buk.co/api/v1/colombia/employees?page_size=500&document_number=${cedula},
        {
          headers: {
            Accept: "application/json",
            auth_token: "tmMC1o7cUovQvWoKhvbdhYxx",
          },
        }
      );

      console.log(response.data.data);

      if (response.data.data && response.data.data.length > 0) {

        const empleado = response.data.data[0];
        
        
        if (empleado.status !== "activo") {
          setError("El empleado no está activo en el sistema");
          return;
        }
        
        localStorage.setItem("picture", empleado.picture_url || null);
        localStorage.setItem("nombre", empleado.full_name || "");
        localStorage.setItem("cedula", cedula);
        
      
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

export default ValidarEmpacador;