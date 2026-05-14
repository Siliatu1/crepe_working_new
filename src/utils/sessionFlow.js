import axiosInstance from '../api/axiosInstance.js';

const SESSION_KEY = 'crepe-working-session-v1';
const API_POLITICAS_URL = 'https://macfer.crepesywaffles.com/api/working-politicas';

const readSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const writeSession = (session) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getSession = () => readSession();

export const hasActiveSession = () => {
  const session = readSession();
  const documento = String(
    session?.datosEmpleado?.document_number ?? session?.datosEmpleado?.documento ?? ''
  ).trim();
  return Boolean(documento);
};

export const createSession = ({ datosEmpleado, fechaHoraIngreso, politicasAceptadas = false }) => {
  const session = {
    datosEmpleado: datosEmpleado ?? null,
    fechaHoraIngreso: fechaHoraIngreso ?? new Date().toISOString(),
    bienvenidaVista: false,
    politicasAceptadas: politicasAceptadas,
  };

  return writeSession(session);
};

export const markWelcomeSeen = () => {
  const session = readSession();
  if (!session) return null;
  return writeSession({ ...session, bienvenidaVista: true });
};

export const markPoliciesAccepted = async () => {
  const session = readSession();
  if (!session) return null;
  
  const documento = String(
    session?.datosEmpleado?.document_number ?? session?.datosEmpleado?.documento ?? ''
  ).trim();
  
  if (!documento) return null;
  
  try {
    // Primero verificar si ya existe un registro para este documento
    const existingResponse = await axiosInstance.get(
      `${API_POLITICAS_URL}?filters[documento][$eq]=${documento}`
    );
    
    const existingRecords = existingResponse.data?.data || [];
    
    if (existingRecords.length > 0) {
      // Si existe, actualizar el registro
      const recordId = existingRecords[0].id;
      await axiosInstance.put(`${API_POLITICAS_URL}/${recordId}`, {
        data: {
          acepto: true
        }
      });
    } else {
      // Si no existe, crear uno nuevo
      await axiosInstance.post(API_POLITICAS_URL, {
        data: {
          documento: documento,
          acepto: true
        }
      });
    }
    
    return writeSession({ ...session, politicasAceptadas: true });
  } catch (error) {
    console.error('Error al guardar aceptación de políticas:', error);
    // Aún así marcar localmente para mejorar UX
    return writeSession({ ...session, politicasAceptadas: true });
  }
};

export const checkPoliciesAccepted = async (documento) => {
  if (!documento) return false;
  
  try {
    const response = await axiosInstance.get(
      `${API_POLITICAS_URL}?filters[documento][$eq]=${documento}&filters[acepto][$eq]=true`
    );
    
    // Verificar si existe al menos un registro con políticas aceptadas
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data.length > 0;
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar políticas aceptadas:', error);
    return false;
  }
};

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const getNextPathForSession = () => {
  const session = readSession();
  if (!session) return '/';
  if (!session.bienvenidaVista) return '/bienvenida';
  if (!session.politicasAceptadas) return '/politicas';
  return '/salas';
};