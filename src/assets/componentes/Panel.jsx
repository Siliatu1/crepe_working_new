import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Avatar, Spin, Alert, Button, Space } from "antd";
import { UserOutlined, CalendarOutlined, DesktopOutlined, ClockCircleOutlined, PlusOutlined, SettingOutlined, DashboardOutlined } from "@ant-design/icons";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { getReservas } from "../../utils/reservasService";
import VerificacionAsistencia from "./VerificacionAsistencia";
import useAutoCancelarReservas from "../../hooks/useAutoCancelarReservas";
import useRealtimeSync from "../../hooks/useRealtimeSync";

const Panel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState([]);

  // Auto-cancelar reservas vencidas cada minuto
  useAutoCancelarReservas(true);

  // Sincronización en tiempo real (webhooks simulados)
  useRealtimeSync(() => {
    console.log(' Sincronización en tiempo real activada');
    reloadReservations();
  });

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

  // Verificar si el usuario es administrador
  const isAdmin = profileData?.document_number === '1019096266' || profileData?.documento === '1019096266';
  
  console.log('🔍 Debug Admin:', {
    document_number: profileData?.document_number,
    documento: profileData?.documento,
    isAdmin: isAdmin,
    profileData: profileData
  });

  return (
    <div className="panel-container">
      {/* Navbar del administrador */}
      {isAdmin && (
        <Card
          className="admin-navigation-bar"
          bordered={false}
          style={{
            marginBottom: '24px',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            {/* Logo y título */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fb923c, #f97316)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              }}>
                <SettingOutlined style={{ fontSize: '24px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  color: '#1c1917', 
                  fontSize: '18px', 
                  fontWeight: '800',
                  letterSpacing: '-0.5px'
                }}>
                  Crepe-Working Admin
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: '#78716c', 
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  Sistema de Gestión de Reservas
                </p>
              </div>
            </div>

            {/* Navegación central */}
            <div style={{
              display: 'flex',
              gap: '8px',
              background: '#fafaf9',
              padding: '6px',
              borderRadius: '10px',
              border: '1px solid #e7e5e4',
            }}>
              <button
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #fb923c, #f97316)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'default',
                  boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <UserOutlined /> Mi Panel
              </button>
              <button
                onClick={() => navigate('/admin', { state: { datosEmpleado: profileData } })}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#57534e',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.color = '#f97316';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#57534e';
                }}
              >
                <DashboardOutlined /> Admin Panel
              </button>
            </div>

            {/* Usuario y acciones */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                textAlign: 'right',
                marginRight: '8px',
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#1c1917',
                }}>
                  {profileData?.nombre?.split(' ')[0] || 'Administrador'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#78716c',
                  fontWeight: '500',
                }}>
                  Administrador
                </div>
              </div>
              {profileData?.foto && profileData.foto !== 'null' ? (
                <Avatar 
                  src={profileData.foto} 
                  size={44}
                  style={{ 
                    border: '2px solid #fed7aa',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
              ) : (
                <Avatar 
                  icon={<UserOutlined />} 
                  size={44}
                  style={{ 
                    background: 'linear-gradient(135deg, #fb923c, #f97316)',
                    border: '2px solid #fed7aa',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
              )}
            </div>
          </div>
        </Card>
      )}

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
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/reservas')}
              className="panel-new-reservation-btn"
            >
              Nueva Reserva
            </Button>
            <Button 
              type="default" 
              icon={<LogoutOutlined />}
              onClick={() => navigate('/validar_cedula')}
              className="panel-logout-btn"
            >
              Cerrar Sesión
            </Button>
          </Space>
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
