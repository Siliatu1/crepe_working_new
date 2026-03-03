import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Avatar, Spin, Alert, Button } from "antd";
import { UserOutlined, CalendarOutlined, DesktopOutlined, ClockCircleOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { getReservas } from "../../utils/reservasService";

const Panel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState([]);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        

        const storedEmpleado = localStorage.getItem('empleadoData');
        const storedCedula = localStorage.getItem('cedula');
        
        if (storedEmpleado) {
          const empleado = JSON.parse(storedEmpleado);
          setProfileData(empleado);
        } else if (storedCedula) {
          
          const response = await axios.get(
            `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${storedCedula}`
          );
          const empleado = response.data.data[0];
          setProfileData(empleado);
          localStorage.setItem('empleadoData', JSON.stringify(empleado));
        }
        
        
        const reservas = getReservas();
        setReservations(reservas);
        
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
          <CalendarOutlined style={{ marginRight: 8 }} />
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
          <DesktopOutlined style={{ marginRight: 8 }} />
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
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          {turno}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" tip="Cargando información..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Profile Section */}
      <Card
        style={{ marginBottom: 24, borderRadius: 8 }}
        bordered={false}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Avatar
            size={80}
            icon={<UserOutlined />}
            src={profileData?.foto !== "null" ? profileData?.foto : null}
            style={{ backgroundColor: "#1890ff" }}
          />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
              {profileData?.nombre || "Usuario"}
            </h2>
            <div style={{ marginTop: "8px", color: "#666" }}>
              <p style={{ margin: "4px 0" }}>
                <strong>Cédula:</strong> {profileData?.documento || profileData?.document_number || "N/A"}
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Cargo:</strong> {profileData?.cargo || "N/A"}
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Área:</strong> {profileData?.area_nombre || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Reservations Table */}
      <Card
        title={<span style={{ fontSize: "18px", fontWeight: "600" }}>Mis Reservas</span>}
        bordered={false}
        style={{ borderRadius: 8 }}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/formulario-reserva')}
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
