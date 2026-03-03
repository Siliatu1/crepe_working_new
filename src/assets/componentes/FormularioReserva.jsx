import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addReserva } from "../../utils/reservasService";
import { BsCalendar3, BsDesktop, BsClock } from "react-icons/bs";

const FormularioReserva = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fecha: "",
    escritorio: "",
    turno: ""
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.fecha || !formData.escritorio || !formData.turno) {
      setError("Por favor complete todos los campos");
      return;
    }

    // Obtener datos del empleado desde localStorage
    const empleadoData = localStorage.getItem('empleadoData');
    const cedula = localStorage.getItem('cedula');
    
    if (!cedula) {
      setError("No se encontró información del usuario. Por favor inicie sesión nuevamente.");
      return;
    }

    const empleado = empleadoData ? JSON.parse(empleadoData) : {};

    // Crear nueva reserva con el servicio
    const nuevaReserva = addReserva({
      fecha: formData.fecha,
      escritorio: formData.escritorio,
      turno: formData.turno,
      cedula: cedula,
      nombreEmpleado: empleado.nombre || "N/A",
      area: empleado.area_nombre || "N/A"
    });

    if (nuevaReserva) {
      // Navegar al panel para ver la reserva creada
      navigate('/panel');
    } else {
      setError("Error al crear la reserva. Por favor intente nuevamente.");
    }
  };

  const handleViewPanel = () => {
    navigate('/panel');
  };

  return (
    <div className="reservacion-container" style={{ 
      padding: "24px", 
      maxWidth: "600px", 
      margin: "0 auto",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div className="reservacion-card" style={{ 
        backgroundColor: "#fff", 
        padding: "32px", 
        borderRadius: "8px", 
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        width: "100%"
      }}>
        <h1 style={{ 
          marginBottom: "24px", 
          fontSize: "28px", 
          fontWeight: "600", 
          textAlign: "center",
          color: "#333"
        }}>
          Nueva Reservación
        </h1>

        {error && (
          <div style={{
            padding: "12px",
            marginBottom: "16px",
            backgroundColor: "#fff2f0",
            border: "1px solid #ffccc7",
            borderRadius: "4px",
            color: "#cf1322"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Fecha */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "8px", 
              fontWeight: "500",
              color: "#333"
            }}>
              <BsCalendar3 style={{ marginRight: "8px" }} />
              Fecha
            </label>
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                fontSize: "14px"
              }}
            />
          </div>

          {/* Escritorio */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "8px", 
              fontWeight: "500",
              color: "#333"
            }}>
              <BsDesktop style={{ marginRight: "8px" }} />
              Escritorio
            </label>
            <select
              name="escritorio"
              value={formData.escritorio}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                fontSize: "14px"
              }}
            >
              <option value="">Seleccione un escritorio</option>
              <option value="A-101">A-101</option>
              <option value="A-102">A-102</option>
              <option value="A-103">A-103</option>
              <option value="B-201">B-201</option>
              <option value="B-202">B-202</option>
              <option value="B-203">B-203</option>
              <option value="C-301">C-301</option>
              <option value="C-302">C-302</option>
              <option value="C-303">C-303</option>
            </select>
          </div>

          {/* Turno */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "8px", 
              fontWeight: "500",
              color: "#333"
            }}>
              <BsClock style={{ marginRight: "8px" }} />
              Turno
            </label>
            <select
              name="turno"
              value={formData.turno}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                fontSize: "14px"
              }}
            >
              <option value="">Seleccione un turno</option>
              <option value="Mañana (8:00 - 14:00)">Mañana (8:00 - 14:00)</option>
              <option value="Tarde (14:00 - 20:00)">Tarde (14:00 - 20:00)</option>
              <option value="Turno Completo (8:00 - 20:00)">Turno Completo (8:00 - 20:00)</option>
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#1890ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.3s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#40a9ff"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#1890ff"}
            >
              Reservar
            </button>
            <button
              type="button"
              onClick={handleViewPanel}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#52c41a",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.3s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#73d13d"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#52c41a"}
            >
              Ver Mis Reservas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioReserva;
