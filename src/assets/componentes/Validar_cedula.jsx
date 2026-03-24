import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { IdCard } from "lucide-react";
import { createSession, getNextPathForSession, hasActiveSession, checkPoliciesAccepted } from "../../utils/sessionFlow";

const ValidarCedula = () => {
  const navigate = useNavigate();
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasActiveSession()) {
      navigate(getNextPathForSession(), { replace: true });
    }
  }, [navigate]);

  const handleUsuario = async (e) => {
    e.preventDefault();

    if (!cedula.trim()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${cedula}`
      );

      const empleado = response.data.data[0];

      // Validar que el usuario esté activo
      if (empleado.status && empleado.status.toLowerCase() === 'inactivo') {
        setError("Usuario inactivo, acérquese a bienestar");
        setLoading(false);
        return;
      }

      const fechaHoraIngreso = new Date();
      
      // Verificar si el usuario ya aceptó las políticas
      const politicasYaAceptadas = await checkPoliciesAccepted(cedula);

      createSession({
        datosEmpleado: empleado,
        fechaHoraIngreso: fechaHoraIngreso.toISOString(),
        politicasAceptadas: politicasYaAceptadas
      });

      navigate(getNextPathForSession(), {
        state: {
          datosEmpleado: empleado,
          fechaHoraIngreso: fechaHoraIngreso.toISOString(),
        },
        replace: true,
      });
    } catch (error) {
      console.error(error);
      // Extraer solo "Empleado no encontrado" del mensaje de error
      let errorMessage = error.response?.data?.detail;
      
      // Si incluye "Empleado no encontrado", mostrar solo eso
      if (errorMessage && errorMessage.includes("Empleado no encontrado")) {
        errorMessage = "Empleado no encontrado";
      }
      
      setError(errorMessage || "");
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

        <h1 className="bienvenida-saludo">¡Bienvenido a nuestro espacio de <strong>Co-Working</strong>!</h1>
        <p className="text-muted bienvenida-sub">Ingresa tu cédula para continuar</p>

        <div className="bienvenida-info">
          <form onSubmit={handleUsuario} style={{ width: "100%" }}>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ position: "relative" }}>
                <IdCard
                  size={18}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(80, 54, 41, 0.55)",
                    pointerEvents: "none",
                  }}
                />
              <input
                type="text"
                className="form-input"
                placeholder="No. de cédula"
                value={cedula}
                onChange={handleCedulaChange}
                disabled={loading}
                maxLength="10"
                style={{ paddingLeft: "40px" }}
              />
              </div>
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