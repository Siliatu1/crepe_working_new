import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ValidarCedula = () => {
  const navigate = useNavigate();
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${cedula}`
      );

      const empleado = response.data.data[0];
      const fechaHoraIngreso = new Date();

      localStorage.setItem("empleadoData", JSON.stringify(empleado));
      localStorage.setItem("cedula", cedula);

      navigate("/bienvenida", {
        state: {
          datosEmpleado: empleado,
          fechaHoraIngreso: fechaHoraIngreso.toISOString(),
        },
      });
    } catch (error) {
      console.error(error);
      setError("Error al validar la cédula.");
    } finally {
      setLoading(false);
    }
  };

  const handleCedulaChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setCedula(value);
  };

  return (
    <div className="page-wrapper">
      <div className="bienvenida-card">

        <h1 className="bienvenida-saludo">
          <span className="text-accent">Crepe</span>-Working #1
        </h1>
        <p className="text-muted bienvenida-sub">Ingresa tu cédula para continuar</p>

        <div className="bienvenida-info">
          <form onSubmit={handleUsuario} style={{ width: "100%" }}>
            <div style={{ marginBottom: "12px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="No. de cédula"
                value={cedula}
                onChange={handleCedulaChange}
                disabled={loading}
                maxLength="10"
              />
            </div>

            {error && (
              <p className="text-muted" style={{ color: "#c0392b", marginBottom: "12px", fontSize: "0.85rem" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className={`btn-continuar${loading || !cedula ? " btn-continuar--disabled" : ""}`}
              disabled={loading || !cedula}
              style={{ width: "100%", marginTop: "4px" }}
            >
              {loading ? "Validando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ValidarCedula;