import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const WS_URL =
  import.meta.env.VITE_RESERVAS_WS_URL ||
  "https://macfer.crepesywaffles.com";

const SOCKET_EVENT = "reserva3";

// ─────────────────────────────────────────────────────────────
// Singleton Socket
// ─────────────────────────────────────────────────────────────
let socket = null;

const getSocket = () => {
  if (!socket) {
    console.log("🔌 [useRealtimeSync] Conectando a:", WS_URL);

    socket = io(WS_URL, {
      transports: ["polling"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
    });

    socket.on("connect", () =>
      console.log("✅ [Socket] Conectado - ID:", socket.id)
    );

    socket.on("disconnect", (reason) => {
      console.log("❌ [Socket] Desconectado:", reason);
      if (reason === "io server disconnect") socket.connect();
    });

    socket.on("connect_error", (err) =>
      console.error("⚠️ [Socket] Error:", err.message)
    );

    socket.on("reconnect", (n) =>
      console.log("🔄 [Socket] Reconectado en intento #", n)
    );

    // Debug: loguea eventos de reservas
    socket.onAny((eventName, payload) => {
      if (eventName.includes("reserva")) {
        console.log(`📡 [Socket] Evento: ${eventName}`, payload ?? "");
      }
    });
  }

  return socket;
};

// ─────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────

/**
 * useRealtimeSync
 *
 * Escucha el evento `reserva3` del servidor para sincronizar
 * las reservas en tiempo real cuando se crea una nueva.
 *
 * @param {Function} refetch - Función para recargar las reservas
 * @returns {{ socket, notifyChange, isConnected }}
 */
export default function useRealtimeSync(refetch) {
  const refetchRef = useRef(refetch);
  const lastRefetchRef = useRef(0);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // ── Refetch con debounce ────────────────────────────────────
  const doRefetch = useCallback((source) => {
    const now = Date.now();
    if (now - lastRefetchRef.current < 300) return;
    lastRefetchRef.current = now;

    console.log(`🔄 [Sync] Actualizando reservas | Fuente: ${source}`);

    if (typeof refetchRef.current === "function") {
      refetchRef.current();
    }
  }, []);

  // ── Listener Socket.IO ──────────────────────────────────────
  useEffect(() => {
    const socketInstance = getSocket();

    const handleReserva = (payload) => {
      doRefetch(`socket:${SOCKET_EVENT}`);
    };

    socketInstance.on(SOCKET_EVENT, handleReserva);

    return () => {
      socketInstance.off(SOCKET_EVENT, handleReserva);
    };
  }, [doRefetch]);

  // ── notifyChange (para compatibilidad) ──────────────────────
  const notifyChange = useCallback(() => {
    // Solo dispara refetch local, el servidor no reenvía eventos del cliente
    doRefetch("local:notifyChange");
  }, [doRefetch]);

  return {
    socket: getSocket(),
    notifyChange,
    isConnected: socket?.connected ?? false,
  };
}