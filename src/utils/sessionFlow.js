const SESSION_KEY = 'crepe-working-session-v1';

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

export const createSession = ({ datosEmpleado, fechaHoraIngreso }) => {
  const session = {
    datosEmpleado: datosEmpleado ?? null,
    fechaHoraIngreso: fechaHoraIngreso ?? new Date().toISOString(),
    bienvenidaVista: false,
    politicasAceptadas: false,
  };

  return writeSession(session);
};

export const markWelcomeSeen = () => {
  const session = readSession();
  if (!session) return null;
  return writeSession({ ...session, bienvenidaVista: true });
};

export const markPoliciesAccepted = () => {
  const session = readSession();
  if (!session) return null;
  return writeSession({ ...session, politicasAceptadas: true });
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