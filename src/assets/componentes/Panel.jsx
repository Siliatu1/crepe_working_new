import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Avatar, Spin, Alert, Button } from "antd";
import { UserOutlined, CalendarOutlined, DesktopOutlined, ClockCircleOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const Panel = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [profileData, setProfileData]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const storedEmpleado = localStorage.getItem("empleadoData");
        const storedCedula   = localStorage.getItem("cedula");

        if (storedEmpleado) {
          setProfileData(JSON.parse(storedEmpleado));
        } else if (storedCedula) {
          const response = await axios.get(
            `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${storedCedula}`
          );
          const empleado = response.data.data[0];
          setProfileData(empleado);
          localStorage.setItem("empleadoData", JSON.stringify(empleado));
        }

        const storedReservations = localStorage.getItem("reservaciones");
        if (storedReservations) {
          setReservations(JSON.parse(storedReservations));
        } else {
          setReservations([
            { key: 1, fecha: "2026-03-05", estado: "Pendiente",  escritorio: "A-101", turno: "Mañana (8:00 - 14:00)" },
            { key: 2, fecha: "2026-03-03", estado: "Confirmada", escritorio: "B-205", turno: "Tarde (14:00 - 20:00)" },
            { key: 3, fecha: "2026-03-01", estado: "Cancelada",  escritorio: "C-310", turno: "Mañana (8:00 - 14:00)" },
          ]);
        }

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
          {new Date(fecha).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
        </span>
      ),
      sorter: (a, b) => new Date(a.fecha) - new Date(b.fecha),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: [
        { text: "Pendiente",  value: "Pendiente"  },
        { text: "Confirmada", value: "Confirmada" },
        { text: "Cancelada",  value: "Cancelada"  },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado) => {
        const colorMap = { Pendiente: "orange", Confirmada: "green", Cancelada: "red" };
        return <Tag color={colorMap[estado] || "default"}>{estado}</Tag>;
      },
    },
    {
      title: "Escritorio",
      dataIndex: "escritorio",
      key: "escritorio",
      render: (v) => <span><DesktopOutlined style={{ marginRight: 8 }} />{v}</span>,
    },
    {
      title: "Turno",
      dataIndex: "turno",
      key: "turno",
      render: (v) => <span><ClockCircleOutlined style={{ marginRight: 8 }} />{v}</span>,
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
    <div className="panel-wrapper">

      {/* Perfil */}
      <Card className="panel-card panel-card--profile" bordered={false}>
        <div className="panel-profile-row">
          <Avatar
            size={80}
            icon={<UserOutlined />}
            src={profileData?.foto !== "null" ? profileData?.foto : null}
            style={{ backgroundColor: "#7F3A14" }}
          />
          <div className="panel-profile-info">
            <h2 className="title-section">{profileData?.nombre || "Usuario"}</h2>
            <div className="panel-profile-details">
              <p className="text-body"><strong>Cédula:</strong> {profileData?.documento || profileData?.document_number || "N/A"}</p>
              <p className="text-body"><strong>Cargo:</strong>  {profileData?.cargo || "N/A"}</p>
              <p className="text-body"><strong>Área:</strong>   {profileData?.area_nombre || "N/A"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Reservas */}
      <Card
        className="panel-card"
        bordered={false}
        title={<span className="title-section">Mis Reservas</span>}
        extra={
          <button className="btn-primary" onClick={() => navigate("/reservacion")}>
            <PlusOutlined /> Nueva Reserva
          </button>
        }
      >
        <Table
          columns={columns}
          dataSource={reservations}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} reservas` }}
          locale={{ emptyText: "No hay reservas disponibles" }}
        />
      </Card>

    </div>
  );
};

export default Panel;
