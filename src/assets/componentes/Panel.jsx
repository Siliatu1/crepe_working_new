import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Avatar, Spin, Alert, Button } from "antd";
import { UserOutlined, CalendarOutlined, DesktopOutlined, ClockCircleOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { getReservas } from "../../utils/reservasService";
import VerificacionAsistencia from "./VerificacionAsistencia";
import useAutoCancelarReservas from "../../hooks/useAutoCancelarReservas";

const Panel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState([]);

  // Auto-cancelar reservas vencidas cada minuto
  useAutoCancelarReservas(true);

  // Función para recargar reservas
  const reloadReservations = () => {
    try {
      const storedCedula = localStorage.getItem('cedula');
      const storedEmpleado = localStorage.getItem('empleadoData');
      let empleadoData = null;
      
      if (storedEmpleado) {
        empleadoData = JSON.parse(storedEmpleado);
      }
      
      const todasReservas = getReservas();
      const cedulaUsuario = storedCedula || empleadoData?.documento || empleadoData?.document_number;
      
      const reservasUsuario = todasReservas.filter(
        reserva => reserva.cedula === cedulaUsuario
      );
      
      console.log('🔄 Reservas recargadas:', reservasUsuario.length);
      setReservations(reservasUsuario);
    } catch (err) {
      console.error('Error al recargar reservas:', err);
    }
  };

  // Callback cuando se verifica la asistencia
  const handleVerified = (reservaActualizada) => {
    console.log('✅ Asistencia verificada, recargando reservas...');
    reloadReservations();
  };


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        let empleadoData = null;
        const storedEmpleado = localStorage.getItem('empleadoData');
        const storedCedula = localStorage.getItem('cedula');
        
        if (storedEmpleado) {
          empleadoData = JSON.parse(storedEmpleado);
          setProfileData(empleadoData);
        } else if (storedCedula) {
          
          const response = await axios.get(
            `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${storedCedula}`
          );
          empleadoData = response.data.data[0];
          setProfileData(empleadoData);
          localStorage.setItem('empleadoData', JSON.stringify(empleadoData));
        }
        
      
        const todasReservas = getReservas();
        const cedulaUsuario = storedCedula || empleadoData?.documento || empleadoData?.document_number;
        
        console.log('🔍 Debug - Cedula usuario:', cedulaUsuario);
        console.log('📋 Total reservas:', todasReservas.length);
        console.log('📋 Reservas en sistema:', todasReservas.map(r => ({ cedula: r.cedula, nombre: r.nombre })));
        
        const reservasUsuario = todasReservas.filter(
          reserva => reserva.cedula === cedulaUsuario
        );
        
        console.log('✅ Reservas filtradas para usuario:', reservasUsuario.length);
        
        setReservations(reservasUsuario);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Error al cargar los datos del perfil");
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  
  const columns = [
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      render: (fecha) => (
        <span>
          <CalendarOutlined className="panel-table-icon" />
          {new Date(fecha).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      ),
      sorter: (a, b) => new Date(a.fecha) - new Date(b.fecha),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: [
        { text: "Pendiente", value: "Pendiente" },
        { text: "Confirmada", value: "Confirmada" },
        { text: "Cancelada", value: "Cancelada" },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado) => {
        let color = "";
        switch (estado) {
          case "Pendiente":
            color = "orange";
            break;
          case "Confirmada":
            color = "green";
            break;
          case "Cancelada":
            color = "red";
            break;
          default:
            color = "default";
        }
        return <Tag color={color}>{estado}</Tag>;
      },
    },
    {
      title: "Escritorio",
      dataIndex: "escritorio",
      key: "escritorio",
      render: (escritorio) => (
        <span>
          <DesktopOutlined className="panel-table-icon" />
          {escritorio}
        </span>
      ),
    },
    {
      title: "Turno",
      dataIndex: "turno",
      key: "turno",
      render: (turno) => (
        <span>
          <ClockCircleOutlined className="panel-table-icon" />
          {turno}
        </span>
      ),
    },
    {
      title: "Acción",
      key: "accion",
      align: "center",
      render: (_, record) => (
        <VerificacionAsistencia 
          reserva={record} 
          onVerified={handleVerified}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="panel-loading">
        <Spin size="large" tip="Cargando información..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-error">
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="panel-container">
      {/* Profile Section */}
      <Card
        className="panel-profile-card"
        bordered={false}
      >
        <div className="panel-profile-content">
          <div className="panel-avatar">
            <Avatar
              icon={<UserOutlined />}
              src={profileData?.foto !== "null" ? profileData?.foto : null}
            />
          </div>
          <div className="panel-profile-info">
            <h2 className="panel-profile-name">
              {profileData?.nombre || "Usuario"}
            </h2>
            <div className="panel-profile-details">
              <p>
                <strong>Cédula:</strong> {profileData?.documento || profileData?.document_number || "N/A"}
              </p>
              <p>
                <strong>Cargo:</strong> {profileData?.cargo || "N/A"}
              </p>
              <p>
                <strong>Área:</strong> {profileData?.area_nombre || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Reservations Table */}
      <Card
        className="panel-reservations-card"
        title={<span className="panel-reservations-title">Mis Reservas</span>}
        bordered={false}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/formulario-reserva')}
            className="panel-new-reservation-btn"
          >
            Nueva Reserva
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={reservations}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} reservas`,
          }}
          locale={{
            emptyText: "No hay reservas disponibles"
          }}
        />
      </Card>
    </div>
  );
};

export default Panel;
