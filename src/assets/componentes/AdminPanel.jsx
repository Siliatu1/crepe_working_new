import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Input, DatePicker, Select, Modal, Form, message, Space, Tag, Popconfirm, Avatar } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, LogoutOutlined, ReloadOutlined, ArrowLeftOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import reservasIniciales from '../../data/reservas.json';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import syncService from '../../utils/syncService';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = location.state?.datosEmpleado || null;

  // Verificar permisos de administrador
  useEffect(() => {
    if (!usuario || (usuario.document_number !== '1019096266' && usuario.documento !== '1019096266')) {
      message.error('No tienes permisos para acceder a este panel');
      navigate('/');
      return;
    }
  }, [usuario, navigate]);

  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingReserva, setEditingReserva] = useState(null);
  const [form] = Form.useForm();

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    cedula: '',
    escritorio: null,
    fechaInicio: null,
    fechaFin: null,
    estado: null,
  });

  // Hook de sincronización en tiempo real
  const { notifyChange } = useRealtimeSync(() => {
    console.log('📡 Sincronización en AdminPanel');
    cargarReservas();
  });

  // Cargar reservas
  const cargarReservas = () => {
    setLoading(true);
    try {
      // Cargar del localStorage
      const reservasLS = JSON.parse(localStorage.getItem('reservas') || '[]');
      
      // Combinar con reservas iniciales del JSON
      const todasReservas = [...reservasIniciales, ...reservasLS];
      
      // Agregar key única para cada reserva
      const reservasConKey = todasReservas.map((r, index) => ({
        ...r,
        key: r.id || r.key || index,
      }));
      
      setReservas(reservasConKey);
      console.log('📊 Reservas cargadas:', reservasConKey.length);
    } catch (error) {
      console.error('Error cargando reservas:', error);
      message.error('Error al cargar las reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  // Filtrar reservas
  const reservasFiltradas = reservas.filter(reserva => {
    let cumpleFiltros = true;

    if (filtros.cedula) {
      cumpleFiltros = cumpleFiltros && reserva.cedula?.includes(filtros.cedula);
    }

    if (filtros.escritorio) {
      const escritorioNum = typeof reserva.escritorio === 'string' 
        ? reserva.escritorio.match(/\d+/)?.[0] 
        : reserva.escritorioId;
      cumpleFiltros = cumpleFiltros && Number(escritorioNum) === Number(filtros.escritorio);
    }

    if (filtros.fechaInicio && filtros.fechaFin) {
      const fechaReserva = dayjs(reserva.fecha);
      cumpleFiltros = cumpleFiltros && 
        fechaReserva.isSameOrAfter(filtros.fechaInicio, 'day') &&
        fechaReserva.isSameOrBefore(filtros.fechaFin, 'day');
    }

    if (filtros.estado) {
      cumpleFiltros = cumpleFiltros && reserva.estado === filtros.estado;
    }

    return cumpleFiltros;
  });

  // Abrir modal para agregar
  const abrirModalAgregar = () => {
    setEditingReserva(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (record) => {
    setEditingReserva(record);
    form.setFieldsValue({
      cedula: record.cedula,
      nombre: record.nombre,
      fecha: record.fecha ? dayjs(record.fecha) : null,
      escritorio: record.escritorioId || record.escritorio?.match(/\d+/)?.[0],
      horario: record.horario,
      estado: record.estado,
      correo: record.correo,
      cargo: record.cargo,
      area: record.area || record.area_nombre,
    });
    setIsModalVisible(true);
  };

  // Guardar reserva (crear o editar)
  const guardarReserva = async (values) => {
    try {
      const reservasLS = JSON.parse(localStorage.getItem('reservas') || '[]');
      
      if (editingReserva) {
        // Editar reserva existente
        const index = reservasLS.findIndex(r => r.key === editingReserva.key || r.id === editingReserva.id);
        
        if (index !== -1) {
          reservasLS[index] = {
            ...reservasLS[index],
            cedula: values.cedula,
            nombre: values.nombre,
            fecha: dayjs(values.fecha).format('YYYY-MM-DD'),
            escritorio: `Escritorio ${values.escritorio}`,
            escritorioId: Number(values.escritorio),
            horario: values.horario,
            estado: values.estado,
            correo: values.correo,
            cargo: values.cargo,
            area: values.area,
            updatedAt: new Date().toISOString(),
          };
          syncService.saveReservas(reservasLS);
          notifyChange(); // Notificar cambios en tiempo real
          message.success('Reserva actualizada correctamente');
        }
      } else {
        // Crear nueva reserva
        const nuevaReserva = {
          id: Date.now(),
          key: Date.now(),
          cedula: values.cedula,
          nombre: values.nombre,
          fecha: dayjs(values.fecha).format('YYYY-MM-DD'),
          escritorio: `Escritorio ${values.escritorio}`,
          escritorioId: Number(values.escritorio),
          horario: values.horario,
          turno: values.horario || 'Mañana',
          horaInicio: '08:00',
          horaFin: '17:00',
          estado: values.estado || 'Confirmada',
          correo: values.correo || '',
          cargo: values.cargo || '',
          area: values.area || '',
          createdAt: new Date().toISOString(),
        };
        
        reservasLS.push(nuevaReserva);
        syncService.saveReservas(reservasLS);
        notifyChange(); // Notificar cambios en tiempo real
        message.success('Reserva creada correctamente');
      }

      cargarReservas();
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error guardando reserva:', error);
      message.error('Error al guardar la reserva');
    }
  };

  // Cancelar reserva
  const cancelarReserva = async (record) => {
    try {
      const reservasLS = JSON.parse(localStorage.getItem('reservas') || '[]');
      const index = reservasLS.findIndex(r => r.key === record.key || r.id === record.id);
      
      if (index !== -1) {
        reservasLS[index].estado = 'Cancelada';
        reservasLS[index].updatedAt = new Date().toISOString();
        syncService.saveReservas(reservasLS);
        notifyChange(); // Notificar cambios en tiempo real
        message.success('Reserva cancelada correctamente');
        cargarReservas();
      } else {
        message.warning('Esta reserva no se puede modificar');
      }
    } catch (error) {
      console.error('Error cancelando reserva:', error);
      message.error('Error al cancelar la reserva');
    }
  };

  // Eliminar reserva
  const eliminarReserva = async (record) => {
    try {
      const reservasLS = JSON.parse(localStorage.getItem('reservas') || '[]');
      const nuevasReservas = reservasLS.filter(r => r.key !== record.key && r.id !== record.id);
      syncService.saveReservas(nuevasReservas);
      notifyChange(); // Notificar cambios en tiempo real
      message.success('Reserva eliminada correctamente');
      cargarReservas();
    } catch (error) {
      console.error('Error eliminando reserva:', error);
      message.error('Error al eliminar la reserva');
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      cedula: '',
      escritorio: null,
      fechaInicio: null,
      fechaFin: null,
      estado: null,
    });
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => (a.id || 0) - (b.id || 0),
    },
    {
      title: 'Cédula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 120,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar cédula"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button onClick={clearFilters} size="small" style={{ width: 90 }}>
              Limpiar
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) => record.cedula?.toString().includes(value),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 200,
      sorter: (a, b) => (a.nombre || '').localeCompare(b.nombre || ''),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      sorter: (a, b) => dayjs(a.fecha).unix() - dayjs(b.fecha).unix(),
      render: (fecha) => dayjs(fecha).format('DD/MM/YYYY'),
    },
    {
      title: 'Escritorio',
      dataIndex: 'escritorio',
      key: 'escritorio',
      width: 120,
      render: (_, record) => {
        const escritorioNum = typeof record.escritorio === 'string' 
          ? record.escritorio.match(/\d+/)?.[0] 
          : record.escritorioId;
        return `Escritorio ${escritorioNum}`;
      },
      sorter: (a, b) => {
        const numA = typeof a.escritorio === 'string' ? a.escritorio.match(/\d+/)?.[0] : a.escritorioId;
        const numB = typeof b.escritorio === 'string' ? b.escritorio.match(/\d+/)?.[0] : b.escritorioId;
        return Number(numA || 0) - Number(numB || 0);
      },
    },
    {
      title: 'Horario',
      dataIndex: 'horario',
      key: 'horario',
      width: 150,
      render: (horario, record) => horario || (record.horaInicio && record.horaFin ? `${record.horaInicio} - ${record.horaFin}` : 'N/A'),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      filters: [
        { text: 'Confirmada', value: 'Confirmada' },
        { text: 'Cancelada', value: 'Cancelada' },
        { text: 'Completada', value: 'Completada' },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado) => {
        let color = 'green';
        if (estado === 'Cancelada') color = 'red';
        if (estado === 'Completada') color = 'blue';
        return <Tag color={color}>{estado || 'Confirmada'}</Tag>;
      },
    },
    {
      title: 'Cargo',
      dataIndex: 'cargo',
      key: 'cargo',
      width: 150,
    },
    {
      title: 'Área',
      dataIndex: 'area',
      key: 'area',
      width: 150,
      render: (_, record) => record.area || record.area_nombre || 'N/A',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => abrirModalEditar(record)}
          >
            Editar
          </Button>
          {record.estado !== 'Cancelada' && (
            <Popconfirm
              title="¿Cancelar esta reserva?"
              onConfirm={() => cancelarReserva(record)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="default" size="small">
                Cancelar
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="¿Eliminar esta reserva?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => eliminarReserva(record)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f0f2f5', 
      padding: '24px',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      {/* Navbar del administrador */}
      <div style={{
        background: '#fff',
        padding: '16px 24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              onClick={() => navigate('/panel', { state: { datosEmpleado: usuario } })}
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
              <UserOutlined /> Mi Panel
            </button>
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
              <SettingOutlined /> Admin Panel
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
                {usuario?.nombre?.split(' ')[0] || 'Administrador'}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#78716c',
                fontWeight: '500',
              }}>
                Administrador
              </div>
            </div>
            {usuario?.foto && usuario.foto !== 'null' ? (
              <Avatar 
                src={usuario.foto} 
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
            <Button
              type="default"
              icon={<LogoutOutlined />}
              onClick={() => navigate('/')}
              style={{ 
                fontWeight: '600',
                borderRadius: '8px',
              }}
            >
              Salir
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#fff',
        padding: '20px 24px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
          Filtros de Búsqueda
        </h3>
        <Space wrap size="middle">
          <Input
            placeholder="Buscar por cédula"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={filtros.cedula}
            onChange={(e) => setFiltros({ ...filtros, cedula: e.target.value })}
            allowClear
          />
          
          <Select
            placeholder="Escritorio"
            style={{ width: 150 }}
            value={filtros.escritorio}
            onChange={(value) => setFiltros({ ...filtros, escritorio: value })}
            allowClear
          >
            {[1, 2, 3, 4, 5, 6].map(num => (
              <Option key={num} value={num}>Escritorio {num}</Option>
            ))}
          </Select>

          <RangePicker
            placeholder={['Fecha inicio', 'Fecha fin']}
            format="DD/MM/YYYY"
            onChange={(dates) => {
              if (dates) {
                setFiltros({ ...filtros, fechaInicio: dates[0], fechaFin: dates[1] });
              } else {
                setFiltros({ ...filtros, fechaInicio: null, fechaFin: null });
              }
            }}
          />

          <Select
            placeholder="Estado"
            style={{ width: 150 }}
            value={filtros.estado}
            onChange={(value) => setFiltros({ ...filtros, estado: value })}
            allowClear
          >
            <Option value="Confirmada">Confirmada</Option>
            <Option value="Cancelada">Cancelada</Option>
            <Option value="Completada">Completada</Option>
          </Select>

          <Button onClick={limpiarFiltros}>
            Limpiar Filtros
          </Button>

          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={cargarReservas}
          >
            Recargar
          </Button>
        </Space>
      </div>

      {/* Botón Agregar y Estadísticas */}
      <div style={{
        background: '#fff',
        padding: '16px 24px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Total Reservas</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1c1917' }}>
              {reservasFiltradas.length}
            </div>
          </div>
          <div style={{ width: '1px', height: '40px', background: '#e7e5e4' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Confirmadas</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>
              {reservasFiltradas.filter(r => r.estado === 'Confirmada' || !r.estado).length}
            </div>
          </div>
          <div style={{ width: '1px', height: '40px', background: '#e7e5e4' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Canceladas</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
              {reservasFiltradas.filter(r => r.estado === 'Cancelada').length}
            </div>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={abrirModalAgregar}
          size="large"
          style={{ 
            background: '#f97316', 
            borderColor: '#f97316',
            fontWeight: '600'
          }}
        >
          Agregar Reserva
        </Button>
      </div>

      {/* Tabla */}
      <div style={{
        background: '#fff',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <Table
          columns={columns}
          dataSource={reservasFiltradas}
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} reservas`,
          }}
          bordered
          size="middle"
        />
      </div>

      {/* Modal Agregar/Editar */}
      <Modal
        title={editingReserva ? 'Editar Reserva' : 'Agregar Nueva Reserva'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={guardarReserva}
          initialValues={{
            estado: 'Confirmada',
            horario: 'manana',
          }}
        >
          <Form.Item
            label="Cédula"
            name="cedula"
            rules={[{ required: true, message: 'Por favor ingrese la cédula' }]}
          >
            <Input placeholder="Número de cédula" />
          </Form.Item>

          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
          >
            <Input placeholder="Nombre completo" />
          </Form.Item>

          <Form.Item
            label="Fecha"
            name="fecha"
            rules={[{ required: true, message: 'Por favor seleccione la fecha' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            label="Escritorio"
            name="escritorio"
            rules={[{ required: true, message: 'Por favor seleccione un escritorio' }]}
          >
            <Select placeholder="Seleccione un escritorio">
              {[1, 2, 3, 4, 5, 6].map(num => (
                <Option key={num} value={num}>
                  Escritorio {num} {[1, 3, 6].includes(num) && '🖥 (Con monitor)'}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Horario"
            name="horario"
            rules={[{ required: true, message: 'Por favor seleccione un horario' }]}
          >
            <Select placeholder="Seleccione un horario">
              <Option value="manana">Mañana (8:00 am – 12:00 m)</Option>
              <Option value="tarde">Tarde (1:00 pm – 5:00 pm)</Option>
              <Option value="completo">Día completo (8:00 am – 5:00 pm)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Estado"
            name="estado"
            rules={[{ required: true, message: 'Por favor seleccione el estado' }]}
          >
            <Select placeholder="Seleccione el estado">
              <Option value="Confirmada">Confirmada</Option>
              <Option value="Cancelada">Cancelada</Option>
              <Option value="Completada">Completada</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Correo" name="correo">
            <Input placeholder="Correo electrónico" type="email" />
          </Form.Item>

          <Form.Item label="Cargo" name="cargo">
            <Input placeholder="Cargo del empleado" />
          </Form.Item>

          <Form.Item label="Área" name="area">
            <Input placeholder="Área o departamento" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}>
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{ background: '#f97316', borderColor: '#f97316' }}
              >
                {editingReserva ? 'Actualizar' : 'Guardar'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPanel;
