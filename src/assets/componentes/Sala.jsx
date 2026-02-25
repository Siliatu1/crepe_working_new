import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// Configuración de asientos y colores de estado
const CONFIGURACION_ASIENTOS = [
  { id: 1, etiqueta: "A1", x: -2.4, z: -0.42, sillaZ: -1.55, rotacion: 0,        tieneMonitor: true  },
  { id: 2, etiqueta: "A2", x:  0.0, z: -0.42, sillaZ: -1.55, rotacion: 0,        tieneMonitor: false },
  { id: 3, etiqueta: "A3", x:  2.4, z: -0.42, sillaZ: -1.55, rotacion: 0,        tieneMonitor: true  },
  { id: 4, etiqueta: "B1", x: -2.4, z:  0.42, sillaZ:  1.55, rotacion: Math.PI,  tieneMonitor: false },
  { id: 5, etiqueta: "B2", x:  0.0, z:  0.42, sillaZ:  1.55, rotacion: Math.PI,  tieneMonitor: false },
  { id: 6, etiqueta: "B3", x:  2.4, z:  0.42, sillaZ:  1.55, rotacion: Math.PI,  tieneMonitor: true  },
];

const ESTADO_INICIAL = { 
  1: "disponible", 
  2: "ocupado", 
  3: "disponible", 
  4: "disponible", 
  5: "disponible", 
  6: "ocupado" 
};

const COLORES_ESTADO_HEX = { 
  disponible: 0x22c55e, 
  seleccionado: 0xf59e0b, 
  ocupado: 0xef4444 
};

const COLORES_ESTADO_RGB = { 
  disponible: "#22c55e", 
  seleccionado: "#f59e0b", 
  ocupado: "#ef4444" 
};

//silla
function construirSilla(escena, x, sillaZ, rotacion, idAsiento, colorEstadoHex, etiqueta) {
  const grupo = new THREE.Group();
  grupo.userData.idAsiento = idAsiento;
  grupo.position.set(x, 0, sillaZ);
  grupo.rotation.y = rotacion;

  // Materiales
  const tela = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.0 });
  const telaAsiento = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0 });
  const cromo = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.15, metalness: 0.95 });
  const rueda = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.3 });

  // ── Cojín del asiento ──
  const geoAsiento = new THREE.BoxGeometry(0.52, 0.07, 0.50);
  const meshAsiento = new THREE.Mesh(geoAsiento, telaAsiento);
  meshAsiento.position.y = 0.47;
  meshAsiento.castShadow = true;
  grupo.add(meshAsiento);
  grupo.userData.meshAsiento = meshAsiento;

  // Borde redondeado frontal del asiento
  const curvaSiento = new THREE.CylinderGeometry(0.035, 0.035, 0.52, 12);
  const meshCurvaSiento = new THREE.Mesh(curvaSiento, telaAsiento);
  meshCurvaSiento.rotation.z = Math.PI / 2;
  meshCurvaSiento.position.set(0, 0.47, 0.25);
  grupo.add(meshCurvaSiento);

  // ── Respaldo ──
  const geoRespaldo = new THREE.BoxGeometry(0.50, 0.42, 0.06);
  const meshRespaldo = new THREE.Mesh(geoRespaldo, tela);
  meshRespaldo.position.set(0, 0.73, -0.21);
  meshRespaldo.castShadow = true;
  grupo.add(meshRespaldo);

  // Tope superior del respaldo
  const geoTopeSuperior = new THREE.CylinderGeometry(0.03, 0.03, 0.50, 10);
  const meshTopeSuperior = new THREE.Mesh(geoTopeSuperior, tela);
  meshTopeSuperior.rotation.z = Math.PI / 2;
  meshTopeSuperior.position.set(0, 0.945, -0.21);
  grupo.add(meshTopeSuperior);

  // Soporte lumbar
  const geoLumbar = new THREE.BoxGeometry(0.44, 0.14, 0.03);
  const meshLumbar = new THREE.Mesh(geoLumbar, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
  meshLumbar.position.set(0, 0.66, -0.175);
  grupo.add(meshLumbar);

  // ── Soportes del respaldo ──
  for (const posX of [-0.17, 0.17]) {
    const geoSoporte = new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8);
    const meshSoporte = new THREE.Mesh(geoSoporte, cromo);
    meshSoporte.position.set(posX, 0.56, -0.19);
    grupo.add(meshSoporte);
  }

  // ── Apoyabrazos ──
  for (const posXBrazo of [-0.30, 0.30]) {
    const geoAlmohadillaBrazo = new THREE.BoxGeometry(0.06, 0.035, 0.28);
    const almohadillaBrazo = new THREE.Mesh(geoAlmohadillaBrazo, telaAsiento);
    almohadillaBrazo.position.set(posXBrazo, 0.63, 0.02);
    grupo.add(almohadillaBrazo);

    const geoPosteBrazo = new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8);
    const posteBrazo = new THREE.Mesh(geoPosteBrazo, cromo);
    posteBrazo.position.set(posXBrazo, 0.555, 0.02);
    grupo.add(posteBrazo);
  }

  // ── Poste central de gas ──
  const geoPoste = new THREE.CylinderGeometry(0.028, 0.022, 0.46, 10);
  const meshPoste = new THREE.Mesh(geoPoste, cromo);
  meshPoste.position.y = 0.23;
  grupo.add(meshPoste);

  // ── Base de 5 estrellas ──
  for (let i = 0; i < 5; i++) {
    const angulo = (i / 5) * Math.PI * 2;
    const grupoBrazo = new THREE.Group();
    grupoBrazo.rotation.y = angulo;

    const geoBrazo = new THREE.CylinderGeometry(0.018, 0.022, 0.52, 6);
    const meshBrazo = new THREE.Mesh(geoBrazo, cromo);
    meshBrazo.rotation.z = Math.PI / 2;
    meshBrazo.position.set(0.26, 0.04, 0);
    grupoBrazo.add(meshBrazo);

    // Rueda en la punta
    const geoRueda = new THREE.SphereGeometry(0.042, 8, 6);
    const meshRueda = new THREE.Mesh(geoRueda, rueda);
    meshRueda.scale.y = 0.6;
    meshRueda.position.set(0.50, 0.035, 0);
    grupoBrazo.add(meshRueda);

    grupo.add(grupoBrazo);
  }

  // ── Indicador de estado anillo sobre la silla ──
  const geoAnillo = new THREE.TorusGeometry(0.14, 0.022, 8, 28);
  const materialAnillo = new THREE.MeshStandardMaterial({
    color: colorEstadoHex,
    emissive: colorEstadoHex,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.0,
  });
  const anillo = new THREE.Mesh(geoAnillo, materialAnillo);
  anillo.rotation.x = Math.PI / 2;
  anillo.position.y = 1.15;
  anillo.userData.esIndicador = true;
  grupo.add(anillo);
  grupo.userData.indicador = anillo;
  grupo.userData.materialIndicador = materialAnillo;

  // Punto central pequeño en el anillo
  const geoPunto = new THREE.SphereGeometry(0.045, 10, 8);
  const materialPunto = new THREE.MeshStandardMaterial({
    color: colorEstadoHex, 
    emissive: colorEstadoHex, 
    emissiveIntensity: 1.2,
  });
  const punto = new THREE.Mesh(geoPunto, materialPunto);
  punto.position.y = 1.15;
  grupo.add(punto);
  grupo.userData.materialPunto = materialPunto;

  // ── Etiqueta de texto sobre el indicador ──
  if (etiqueta) {
    const lienzoTexto = document.createElement("canvas");
    lienzoTexto.width = 256;
    lienzoTexto.height = 128;
    const contextoTexto = lienzoTexto.getContext("2d");
    
    // Fondo de la etiqueta con bordes redondeados
    contextoTexto.fillStyle = "rgba(93, 78, 55, 0.95)";
    contextoTexto.beginPath();
    const radio = 12;
    const xPos = 10, yPos = 10, ancho = 236, alto = 108;
    contextoTexto.moveTo(xPos + radio, yPos);
    contextoTexto.lineTo(xPos + ancho - radio, yPos);
    contextoTexto.arcTo(xPos + ancho, yPos, xPos + ancho, yPos + radio, radio);
    contextoTexto.lineTo(xPos + ancho, yPos + alto - radio);
    contextoTexto.arcTo(xPos + ancho, yPos + alto, xPos + ancho - radio, yPos + alto, radio);
    contextoTexto.lineTo(xPos + radio, yPos + alto);
    contextoTexto.arcTo(xPos, yPos + alto, xPos, yPos + alto - radio, radio);
    contextoTexto.lineTo(xPos, yPos + radio);
    contextoTexto.arcTo(xPos, yPos, xPos + radio, yPos, radio);
    contextoTexto.closePath();
    contextoTexto.fill();
    
    // Borde dorado
    contextoTexto.strokeStyle = "#d4a574";
    contextoTexto.lineWidth = 3;
    contextoTexto.stroke();
    
    // Texto
    contextoTexto.fillStyle = "#f5e7d3";
    contextoTexto.font = "bold 72px Arial";
    contextoTexto.textAlign = "center";
    contextoTexto.textBaseline = "middle";
    contextoTexto.fillText(etiqueta, 128, 64);
    
    const texturaTexto = new THREE.CanvasTexture(lienzoTexto);
    const materialTexto = new THREE.MeshBasicMaterial({
      map: texturaTexto,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });
    
    const geoTexto = new THREE.PlaneGeometry(0.45, 0.225);
    const meshTexto = new THREE.Mesh(geoTexto, materialTexto);
    meshTexto.position.y = 1.38;
    meshTexto.rotation.x = 0;
    grupo.add(meshTexto);
  }

  grupo.castShadow = true;
  escena.add(grupo);
  return grupo;
}

// ─── Construir escritorio ─────────────────────────────────────────────────────────────
function construirEscritorio(escena, x, z) {
  const grupo = new THREE.Group();
  grupo.position.set(x, 0, z);

  // Textura de veta de madera en canvas
  const lienzo = document.createElement("canvas");
  lienzo.width = 512; 
  lienzo.height = 256;
  const contexto = lienzo.getContext("2d");
  contexto.fillStyle = "#d4b896";
  contexto.fillRect(0, 0, 512, 256);
  
  // Vetas de madera
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * 256;
    contexto.strokeStyle = `rgba(${100+Math.random()*40},${70+Math.random()*30},${30+Math.random()*20},${0.07+Math.random()*0.12})`;
    contexto.lineWidth = 0.5 + Math.random() * 1.5;
    contexto.beginPath();
    contexto.moveTo(0, y);
    for (let xx = 0; xx < 512; xx += 40) {
      contexto.lineTo(xx, y + (Math.random() - 0.5) * 8);
    }
    contexto.stroke();
  }
  
  const texturaMadera = new THREE.CanvasTexture(lienzo);
  texturaMadera.wrapS = texturaMadera.wrapT = THREE.RepeatWrapping;

  const materialMadera = new THREE.MeshStandardMaterial({ map: texturaMadera, roughness: 0.65, metalness: 0.0 });
  const materialBordeMadera = new THREE.MeshStandardMaterial({ color: 0xc4a47a, roughness: 0.7, metalness: 0 });
  const materialPata = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.85 });

  // Superficie del escritorio
  const geoSuperficie = new THREE.BoxGeometry(1.60, 0.038, 0.85);
  const superficie = new THREE.Mesh(geoSuperficie, materialMadera);
  superficie.position.y = 0.73;
  superficie.castShadow = true;
  superficie.receiveShadow = true;
  grupo.add(superficie);

  // Franja del borde
  const geoBorde = new THREE.BoxGeometry(1.62, 0.042, 0.87);
  const borde = new THREE.Mesh(geoBorde, materialBordeMadera);
  borde.position.y = 0.728;
  grupo.add(borde);

  // 4 patas
  const posicionesPatas = [
    [-0.71, -0.375, -0.37],
    [0.71, -0.375, -0.37],
    [-0.71, -0.375, 0.37],
    [0.71, -0.375, 0.37]
  ];
  
  for (const [posX, posY, posZ] of posicionesPatas) {
    const geoPata = new THREE.BoxGeometry(0.05, 0.75, 0.05);
    const pata = new THREE.Mesh(geoPata, materialPata);
    pata.position.set(posX, 0.73 + posY, posZ);
    pata.castShadow = true;
    grupo.add(pata);
  }

  // Barra de gestión de cables
  const geoBarra = new THREE.BoxGeometry(1.44, 0.025, 0.055);
  const barra = new THREE.Mesh(geoBarra, new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a, 
    roughness: 0.4, 
    metalness: 0.7 
  }));
  barra.position.set(0, 0.42, 0);
  grupo.add(barra);

  escena.add(grupo);
  return grupo;
}

// ─── Construir pantalla de privacidad ───────────────────────────────────────────────────
function construirPantalla(escena, x, z) {
  const grupo = new THREE.Group();
  grupo.position.set(x, 0, z);

  const materialMarco = new THREE.MeshStandardMaterial({ color: 0x2d3340, roughness: 0.4, metalness: 0.6 });
  const materialTela = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.98, metalness: 0 });

  // Marco
  const geoMarco = new THREE.BoxGeometry(1.42, 0.40, 0.055);
  const marco = new THREE.Mesh(geoMarco, materialMarco);
  marco.position.y = 0.93;
  marco.castShadow = true;
  grupo.add(marco);

  // Panel de tela insertado
  const geoPanel = new THREE.BoxGeometry(1.34, 0.34, 0.035);
  const panel = new THREE.Mesh(geoPanel, materialTela);
  panel.position.y = 0.93;
  panel.position.z = 0.012;
  grupo.add(panel);

  escena.add(grupo);
}

// ─── Construir monitor ──────────────────────────────────────────────────────────
function construirMonitor(escena, x, zEscritorio, direccionVista) {
  // direccionVista: 1 = mira hacia -Z (banco superior), -1 = mira hacia +Z (banco inferior)
  const grupo = new THREE.Group();
  const alturaSuperficieEscritorio = 0.749;

  // ── Materiales ──
  const materialBisel = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 });
  const materialCromo = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.12, metalness: 0.95 });
  const materialBase  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.75 });

  // ── Textura canvas de la pantalla (escritorio UI azul-blanco brillante) ──
  const lienzoPantalla = document.createElement("canvas");
  lienzoPantalla.width = 512; 
  lienzoPantalla.height = 320;
  const contexto = lienzoPantalla.getContext("2d");

  // Gradiente de fondo
  const fondoGradiente = contexto.createLinearGradient(0, 0, 0, 320);
  fondoGradiente.addColorStop(0, "#0d1117");
  fondoGradiente.addColorStop(1, "#111827");
  contexto.fillStyle = fondoGradiente;
  contexto.fillRect(0, 0, 512, 320);

  // Barra de tareas en la parte inferior
  contexto.fillStyle = "#1e2330";
  contexto.fillRect(0, 290, 512, 30);

  // Iconos de aplicaciones falsas en la barra de tareas
  const coloresIconos = ["#60a5fa","#34d399","#f59e0b","#f87171","#a78bfa"];
  coloresIconos.forEach((color, i) => {
    contexto.fillStyle = color;
    contexto.beginPath();
    contexto.roundRect(10 + i * 36, 296, 22, 18, 4);
    contexto.fill();
  });

  // Fondo de pantalla: resplandor sutil de malla gradiente
  contexto.globalAlpha = 0.18;
  const resplandor = contexto.createRadialGradient(256, 140, 20, 256, 140, 180);
  resplandor.addColorStop(0, "#38bdf8");
  resplandor.addColorStop(1, "transparent");
  contexto.fillStyle = resplandor;
  contexto.fillRect(0, 0, 512, 280);
  contexto.globalAlpha = 1;

  // Ventana de navegador falsa
  contexto.fillStyle = "#1e293b";
  contexto.beginPath();
  contexto.roundRect(30, 20, 300, 220, 6);
  contexto.fill();
  
  // Barra de título
  contexto.fillStyle = "#0f172a";
  contexto.beginPath();
  contexto.roundRect(30, 20, 300, 24, [6,6,0,0]);
  contexto.fill();
  
  // Botones de semáforo
  [["#ef4444",46],["#f59e0b",62],["#22c55e",78]].forEach(([color, posX])=>{
    contexto.fillStyle = color; 
    contexto.beginPath();
    contexto.arc(posX, 32, 5, 0, Math.PI*2); 
    contexto.fill();
  });
  
  // Barra URL
  contexto.fillStyle = "#1e293b";
  contexto.beginPath(); 
  contexto.roundRect(90, 25, 180, 14, 3); 
  contexto.fill();
  contexto.fillStyle = "#94a3b8"; 
  contexto.font = "9px monospace";
  contexto.fillText("app.company.com/dashboard", 96, 35);

  // Barras de gráfico falsas en la ventana
  const barras = [0.4, 0.7, 0.55, 0.9, 0.65, 0.8, 0.45, 0.75];
  barras.forEach((altura, i) => {
    const alturaBarra = altura * 130;
    contexto.fillStyle = `rgba(56,189,248,${0.5+altura*0.4})`;
    contexto.beginPath();
    contexto.roundRect(45 + i*33, 220 - alturaBarra, 22, alturaBarra, [3,3,0,0]);
    contexto.fill();
  });

  // Panel lateral
  contexto.fillStyle = "#0f172a";
  contexto.beginPath(); 
  contexto.roundRect(345, 20, 140, 220, 6); 
  contexto.fill();
  contexto.fillStyle = "#1e293b";
  [40,65,90,115,140].forEach(posY => {
    contexto.beginPath(); 
    contexto.roundRect(358, posY+20, 110, 16, 4); 
    contexto.fill();
  });

  // Resplandor en el borde de la pantalla
  contexto.globalAlpha = 0.07;
  contexto.strokeStyle = "#38bdf8";
  contexto.lineWidth = 6;
  contexto.strokeRect(3, 3, 506, 314);
  contexto.globalAlpha = 1;

  const texturaPantalla = new THREE.CanvasTexture(lienzoPantalla);
  const materialPantalla = new THREE.MeshStandardMaterial({
    map: texturaPantalla,
    emissiveMap: texturaPantalla,
    emissive: new THREE.Color(0x88ccff),
    emissiveIntensity: 0.55,
    roughness: 0.05,
    metalness: 0.0,
  });

  // ── Bisel (marco exterior) ──
  const anchoBisel = 0.72, 
        alturaBisel = 0.435, 
        profundidadBisel = 0.042;
  const geoBisel = new THREE.BoxGeometry(anchoBisel, alturaBisel, profundidadBisel);
  const bisel = new THREE.Mesh(geoBisel, materialBisel);
  bisel.castShadow = true;
  grupo.add(bisel);

  // ── Panel de pantalla (insertado) ──
  const geoPantalla = new THREE.BoxGeometry(0.665, 0.385, 0.01);
  const pantalla = new THREE.Mesh(geoPantalla, materialPantalla);
  pantalla.position.z = profundidadBisel / 2 + 0.002;
  grupo.add(pantalla);

  // Luz puntual de resplandor de pantalla
  const luzResplandor = new THREE.PointLight(0x38bdf8, 0.35, 1.8);
  luzResplandor.position.z = profundidadBisel / 2 + 0.1;
  grupo.add(luzResplandor);
  grupo.userData.luzResplandor = luzResplandor;

  // ── Cuello / brazo del soporte ──
  const geoCuello = new THREE.CylinderGeometry(0.022, 0.028, 0.28, 10);
  const cuello = new THREE.Mesh(geoCuello, materialCromo);
  cuello.position.set(0, -alturaBisel / 2 - 0.14, 0);
  grupo.add(cuello);

  // ── Base ──
  const geoBase = new THREE.CylinderGeometry(0.005, 0.16, 0.022, 20);
  const base = new THREE.Mesh(geoBase, materialBase);
  base.position.set(0, -alturaBisel / 2 - 0.285, 0);
  base.castShadow = true;
  grupo.add(base);

  // ── Brazo horizontal que une el cuello a la pantalla ──
  const geoBrazo = new THREE.BoxGeometry(0.04, 0.04, 0.10);
  const brazo = new THREE.Mesh(geoBrazo, materialCromo);
  brazo.position.set(0, -alturaBisel / 2 + 0.02, -profundidadBisel / 2 - 0.05);
  grupo.add(brazo);

  // Posicionar todo el grupo del monitor en el escritorio
  const alturaMonitor = alturaSuperficieEscritorio + alturaBisel / 2 + 0.285;
  const zMonitor = zEscritorio + direccionVista * 0.18;

  grupo.position.set(x, alturaMonitor, zMonitor);
  grupo.rotation.y = direccionVista > 0 ? 0 : Math.PI;

  escena.add(grupo);
  return grupo;
}

// ─── Componente principal ─────────────────────────────────────────────────────────
export default function Sala() {
  const refMontaje = useRef(null);
  const refRenderizador = useRef(null);
  const refEscena = useRef(null);
  const refCamara = useRef(null);
  const refGruposSillas = useRef({});
  const refAnimacion = useRef(null);
  const refEstado = useRef({ ...ESTADO_INICIAL });
  const refOrbita = useRef({ 
    arrastrando: false, 
    prevX: 0, 
    prevY: 0, 
    theta: 0.52, 
    phi: 0.82, 
    radio: 14.5 
  });
  const refHover = useRef(null);
  const refTiempoInicio = useRef(performance.now());

  const [estadoAsientos, setEstadoAsientos] = useState({ ...ESTADO_INICIAL });
  const [asientoSeleccionado, setAsientoSeleccionado] = useState(null);
  const [asientoHover, setAsientoHover] = useState(null);
  const [mostrarModalTurnos, setMostrarModalTurnos] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [fechaActual] = useState(new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }));
  const refSeleccionado = useRef(null);

  const actualizarAsiento = useCallback((id, nuevoEstado) => {
    refEstado.current = { ...refEstado.current, [id]: nuevoEstado };
    setEstadoAsientos({ ...refEstado.current });
    const grupo = refGruposSillas.current[id];
    if (grupo) {
      const colorHex = COLORES_ESTADO_HEX[nuevoEstado];
      grupo.userData.materialIndicador.color.setHex(colorHex);
      grupo.userData.materialIndicador.emissive.setHex(colorHex);
      grupo.userData.materialPunto.color.setHex(colorHex);
      grupo.userData.materialPunto.emissive.setHex(colorHex);
    }
  }, []);

  useEffect(() => {
    const montaje = refMontaje.current;
    if (!montaje) return;

    // ── Renderizador ──
    const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderizador.setSize(montaje.clientWidth, montaje.clientHeight);
    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type = THREE.PCFShadowMap;
    renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    renderizador.toneMappingExposure = 1.1;
    renderizador.outputEncoding = THREE.sRGBEncoding;
    montaje.appendChild(renderizador.domElement);
    refRenderizador.current = renderizador;

    // ── Escena ──
    const escena = new THREE.Scene();
    escena.background = new THREE.Color(0x6b5b4a);
    escena.fog = new THREE.FogExp2(0x6b5b4a, 0.045);
    refEscena.current = escena;

    // ── Cámara ──
    const camara = new THREE.PerspectiveCamera(42, montaje.clientWidth / montaje.clientHeight, 0.1, 100);
    const { theta, phi, radio } = refOrbita.current;
    camara.position.set(
      radio * Math.sin(phi) * Math.sin(theta),
      radio * Math.cos(phi),
      radio * Math.sin(phi) * Math.cos(theta)
    );
    camara.lookAt(0, 0.6, 0);
    refCamara.current = camara;

    // ── Iluminación ──
    const hemisferica = new THREE.HemisphereLight(0xddeeff, 0x221a10, 0.55);
    escena.add(hemisferica);

    const sol = new THREE.DirectionalLight(0xfff5e0, 1.8);
    sol.position.set(6, 12, 8);
    sol.castShadow = true;
    sol.shadow.mapSize.width = 2048;
    sol.shadow.mapSize.height = 2048;
    sol.shadow.camera.near = 0.5;
    sol.shadow.camera.far = 40;
    sol.shadow.camera.left = -8; 
    sol.shadow.camera.right = 8;
    sol.shadow.camera.top = 8; 
    sol.shadow.camera.bottom = -8;
    sol.shadow.bias = -0.001;
    escena.add(sol);

    const luzRelleno = new THREE.DirectionalLight(0x8ab4f8, 0.4);
    luzRelleno.position.set(-5, 4, -6);
    escena.add(luzRelleno);

    // Luces puntuales cálidas sobre cada cluster de escritorios
    const luzPunto1 = new THREE.PointLight(0xffd580, 0.6, 5);
    luzPunto1.position.set(0, 2.2, 0);
    escena.add(luzPunto1);

    // ── Piso ──
    const lienzoPiso = document.createElement("canvas");
    lienzoPiso.width = 512; 
    lienzoPiso.height = 512;
    const contextoPiso = lienzoPiso.getContext("2d");
    contextoPiso.fillStyle = "#544639";
    contextoPiso.fillRect(0, 0, 512, 512);
    
    // Líneas de cuadrícula
    contextoPiso.strokeStyle = "rgba(212, 181, 150, 0.15)";
    contextoPiso.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
      const posicion = (i / 16) * 512;
      contextoPiso.beginPath(); 
      contextoPiso.moveTo(posicion, 0); 
      contextoPiso.lineTo(posicion, 512); 
      contextoPiso.stroke();
      contextoPiso.beginPath(); 
      contextoPiso.moveTo(0, posicion); 
      contextoPiso.lineTo(512, posicion); 
      contextoPiso.stroke();
    }
    
    const texturaPiso = new THREE.CanvasTexture(lienzoPiso);
    texturaPiso.wrapS = texturaPiso.wrapT = THREE.RepeatWrapping;
    texturaPiso.repeat.set(3, 3);

    const geoPiso = new THREE.PlaneGeometry(18, 14);
    const materialPiso = new THREE.MeshStandardMaterial({ map: texturaPiso, roughness: 0.85, metalness: 0.05 });
    const piso = new THREE.Mesh(geoPiso, materialPiso);
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    escena.add(piso);

    // Plano de reflexión sutil del piso
    const geoEspejo = new THREE.PlaneGeometry(18, 14);
    const materialEspejo = new THREE.MeshStandardMaterial({
      color: 0x544639, 
      roughness: 0.1, 
      metalness: 0.3, 
      transparent: true, 
      opacity: 0.18,
    });
    const espejo = new THREE.Mesh(geoEspejo, materialEspejo);
    espejo.rotation.x = -Math.PI / 2;
    espejo.position.y = 0.001;
    escena.add(espejo);

    // ── Construir escritorios ──
    for (const asiento of CONFIGURACION_ASIENTOS) {
      construirEscritorio(escena, asiento.x, asiento.z);
    }

    const gruposMonitorLocales = [];
    // Banco superior (A1,A3): silla en z=-1.55 mira hacia +Z → pantalla debe mirar -Z → direccionVista=-1
    gruposMonitorLocales.push(construirMonitor(escena, -2.4, -0.42, -1)); // A1
    gruposMonitorLocales.push(construirMonitor(escena,  2.4, -0.42, -1)); // A3
    // Banco inferior (B3): silla en z=1.55 mira hacia -Z → pantalla debe mirar +Z → direccionVista=1
    gruposMonitorLocales.push(construirMonitor(escena,  2.4,  0.42,  1)); // B3
    const gruposMonitores = gruposMonitorLocales;

    // ── Pantallas de privacidad a lo largo del centro ──
    for (let i = 0; i < 3; i++) {
      const posXPantalla = [-2.4, 0, 2.4][i];
      construirPantalla(escena, posXPantalla, 0);
    }

    // ── Construir sillas ──
    for (const asiento of CONFIGURACION_ASIENTOS) {
      const grupoSilla = construirSilla(
        escena, 
        asiento.x, 
        asiento.sillaZ, 
        asiento.rotacion, 
        asiento.id, 
        COLORES_ESTADO_HEX[refEstado.current[asiento.id]],
        asiento.etiqueta
      );
      refGruposSillas.current[asiento.id] = grupoSilla;
    }

    // ── Raycaster ──
    const raycaster = new THREE.Raycaster();
    const raton = new THREE.Vector2();

    function obtenerSillaEnRaton(evento) {
      const rectangulo = renderizador.domElement.getBoundingClientRect();
      raton.x = ((evento.clientX - rectangulo.left) / rectangulo.width) * 2 - 1;
      raton.y = -((evento.clientY - rectangulo.top) / rectangulo.height) * 2 + 1;
      raycaster.setFromCamera(raton, camara);
      
      const todasMeshesSillas = [];
      Object.values(refGruposSillas.current).forEach((grupo) => {
        grupo.traverse((hijo) => { 
          if (hijo.isMesh) todasMeshesSillas.push(hijo); 
        });
      });
      
      const impactos = raycaster.intersectObjects(todasMeshesSillas, false);
      if (!impactos.length) return null;
      
      let objeto = impactos[0].object;
      while (objeto && !objeto.userData.idAsiento) objeto = objeto.parent;
      return objeto;
    }

    function alMoverRaton(evento) {
      if (refOrbita.current.arrastrando) return;
      const grupo = obtenerSillaEnRaton(evento);
      const nuevoId = grupo ? grupo.userData.idAsiento : null;
      
      if (nuevoId !== refHover.current) {
        refHover.current = nuevoId;
        setAsientoHover(nuevoId);
        renderizador.domElement.style.cursor = nuevoId ? "pointer" : "grab";
      }
    }

    function alHacerClic(evento) {
      if (refOrbita.current.arrastrando) return;
      const grupo = obtenerSillaEnRaton(evento);
      if (!grupo) return;
      
      const id = grupo.userData.idAsiento;
      const estadoActual = refEstado.current[id];
      if (estadoActual === "ocupado") return;

      // Limpiar selección previa
      Object.entries(refEstado.current).forEach(([clave, valor]) => {
        if (valor === "seleccionado") actualizarAsiento(Number(clave), "disponible");
      });

      if (estadoActual === "disponible") {
        actualizarAsiento(id, "seleccionado");
        refSeleccionado.current = id;
        setAsientoSeleccionado(id);
      } else {
        refSeleccionado.current = null;
        setAsientoSeleccionado(null);
      }
    }

    renderizador.domElement.addEventListener("mousemove", alMoverRaton);
    renderizador.domElement.addEventListener("click", alHacerClic);

    // ── Controles de órbita ──
    function alPresionarRaton(evento) {
      refOrbita.current.arrastrando = true;
      refOrbita.current.prevX = evento.clientX;
      refOrbita.current.prevY = evento.clientY;
      renderizador.domElement.style.cursor = "grabbing";
    }
    
    function alSoltarRaton() {
      refOrbita.current.arrastrando = false;
      renderizador.domElement.style.cursor = "grab";
    }
    
    function alArrastrarRaton(evento) {
      if (!refOrbita.current.arrastrando) return;
      const diferenciaX = evento.clientX - refOrbita.current.prevX;
      const diferenciaY = evento.clientY - refOrbita.current.prevY;
      refOrbita.current.prevX = evento.clientX;
      refOrbita.current.prevY = evento.clientY;
      refOrbita.current.theta -= diferenciaX * 0.008;
      refOrbita.current.phi = Math.max(0.25, Math.min(1.4, refOrbita.current.phi + diferenciaY * 0.007));
    }
    
    function alRueda(evento) {
      refOrbita.current.radio = Math.max(7, Math.min(22, refOrbita.current.radio + evento.deltaY * 0.012));
    }
    
    renderizador.domElement.addEventListener("mousedown", alPresionarRaton);
    window.addEventListener("mouseup", alSoltarRaton);
    window.addEventListener("mousemove", alArrastrarRaton);
    renderizador.domElement.addEventListener("wheel", alRueda, { passive: true });

    // ── Soporte táctil para móviles ──
    let ultimoToque = { x: 0, y: 0 };
    let distanciaInicialPinch = 0;
    
    function alInicioTactil(evento) {
      if (evento.touches.length === 1) {
        // Un dedo: rotación
        refOrbita.current.arrastrando = true;
        ultimoToque.x = evento.touches[0].clientX;
        ultimoToque.y = evento.touches[0].clientY;
        refOrbita.current.prevX = evento.touches[0].clientX;
        refOrbita.current.prevY = evento.touches[0].clientY;
      } else if (evento.touches.length === 2) {
        // Dos dedos: zoom pinch
        const dx = evento.touches[0].clientX - evento.touches[1].clientX;
        const dy = evento.touches[0].clientY - evento.touches[1].clientY;
        distanciaInicialPinch = Math.sqrt(dx * dx + dy * dy);
      }
    }
    
    function alMoverTactil(evento) {
      evento.preventDefault();
      
      if (evento.touches.length === 1 && refOrbita.current.arrastrando) {
        // Rotación con un dedo
        const diferenciaX = evento.touches[0].clientX - refOrbita.current.prevX;
        const diferenciaY = evento.touches[0].clientY - refOrbita.current.prevY;
        refOrbita.current.prevX = evento.touches[0].clientX;
        refOrbita.current.prevY = evento.touches[0].clientY;
        refOrbita.current.theta -= diferenciaX * 0.008;
        refOrbita.current.phi = Math.max(0.25, Math.min(1.4, refOrbita.current.phi + diferenciaY * 0.007));
      } else if (evento.touches.length === 2) {
        // Zoom pinch con dos dedos
        const dx = evento.touches[0].clientX - evento.touches[1].clientX;
        const dy = evento.touches[0].clientY - evento.touches[1].clientY;
        const distanciaActual = Math.sqrt(dx * dx + dy * dy);
        const delta = distanciaInicialPinch - distanciaActual;
        refOrbita.current.radio = Math.max(7, Math.min(22, refOrbita.current.radio + delta * 0.05));
        distanciaInicialPinch = distanciaActual;
      }
    }
    
    function alFinTactil() {
      refOrbita.current.arrastrando = false;
    }
    
    renderizador.domElement.addEventListener("touchstart", alInicioTactil, { passive: true });
    renderizador.domElement.addEventListener("touchmove", alMoverTactil, { passive: false });
    renderizador.domElement.addEventListener("touchend", alFinTactil, { passive: true });
    renderizador.domElement.addEventListener("touchcancel", alFinTactil, { passive: true });

    // ── Bucle de animación ──
    function animar() {
      refAnimacion.current = requestAnimationFrame(animar);
      const tiempo = (performance.now() - refTiempoInicio.current) / 1000;

      // Actualizar cámara desde órbita
      const { theta, phi, radio } = refOrbita.current;
      camara.position.set(
        radio * Math.sin(phi) * Math.sin(theta),
        radio * Math.cos(phi),
        radio * Math.sin(phi) * Math.cos(theta)
      );
      camara.lookAt(0, 0.6, 0);

      // Animar pulso de resplandor de pantalla del monitor
      gruposMonitores.forEach((grupoMonitor, indice) => {
        if (grupoMonitor.userData.luzResplandor) {
          grupoMonitor.userData.luzResplandor.intensity = 0.28 + Math.sin(tiempo * 1.5 + indice * 1.2) * 0.08;
        }
      });

      // Animar indicadores + hover de silla
      Object.entries(refGruposSillas.current).forEach(([idStr, grupo]) => {
        const id = Number(idStr);
        const estado = refEstado.current[id];
        const estaHover = refHover.current === id;
        const estaSeleccionado = estado === "seleccionado";

        // Indicador flotante
        const indicador = grupo.userData.indicador;
        indicador.position.y = 1.15 + Math.sin(tiempo * 2.2 + id) * 0.04;
        indicador.rotation.z = tiempo * 0.6 + id;

        // Pulso emisivo
        const intensidad = estaSeleccionado
          ? 1.2 + Math.sin(tiempo * 4) * 0.4
          : estaHover && estado === "disponible"
          ? 0.9 + Math.sin(tiempo * 5) * 0.3
          : 0.6;
        grupo.userData.materialIndicador.emissiveIntensity = intensidad;
        grupo.userData.materialPunto.emissiveIntensity = intensidad + 0.4;

        // Elevación al hacer hover
        const objetivoY = estaHover && estado !== "ocupado" ? 0.06 : 0;
        grupo.position.y += (objetivoY - grupo.position.y) * 0.12;
      });

      renderizador.render(escena, camara);
    }
    animar();

    // ── Redimensionar ──
    function alRedimensionar() {
      if (!montaje) return;
      
      const ancho = montaje.clientWidth;
      const alto = montaje.clientHeight;
      const aspect = ancho / alto;
      
      camara.aspect = aspect;
      
      // Ajustar FOV para dispositivos móviles (mejora la visibilidad)
      if (ancho < 768) {
        camara.fov = aspect < 1 ? 55 : 48; // Más zoom en portrait, menos en landscape
      } else {
        camara.fov = 42; // FOV normal para desktop
      }
      
      camara.updateProjectionMatrix();
      renderizador.setSize(ancho, alto);
      renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    window.addEventListener("resize", alRedimensionar);
    
    // Llamar una vez al inicio para ajustar
    alRedimensionar();

    return () => {
      cancelAnimationFrame(refAnimacion.current);
      renderizador.domElement.removeEventListener("mousemove", alMoverRaton);
      renderizador.domElement.removeEventListener("click", alHacerClic);
      renderizador.domElement.removeEventListener("mousedown", alPresionarRaton);
      window.removeEventListener("mouseup", alSoltarRaton);
      window.removeEventListener("mousemove", alArrastrarRaton);
      renderizador.domElement.removeEventListener("wheel", alRueda);
      renderizador.domElement.removeEventListener("touchstart", alInicioTactil);
      renderizador.domElement.removeEventListener("touchmove", alMoverTactil);
      renderizador.domElement.removeEventListener("touchend", alFinTactil);
      renderizador.domElement.removeEventListener("touchcancel", alFinTactil);
      window.removeEventListener("resize", alRedimensionar);
      montaje.removeChild(renderizador.domElement);
      renderizador.dispose();
    };
  }, [actualizarAsiento]);

  const abrirModalTurnos = () => {
    if (!asientoSeleccionado) return;
    setMostrarModalTurnos(true);
  };

  const cerrarModalTurnos = () => {
    setMostrarModalTurnos(false);
    setTurnoSeleccionado(null);
  };

  const confirmarReserva = () => {
    if (!asientoSeleccionado || !turnoSeleccionado) return;
    actualizarAsiento(asientoSeleccionado, "ocupado");
    setAsientoSeleccionado(null);
    refSeleccionado.current = null;
    setMostrarModalTurnos(false);
    setTurnoSeleccionado(null);
  };
  
  const cancelarAsiento = () => {
    if (!asientoSeleccionado) return;
    actualizarAsiento(asientoSeleccionado, "disponible");
    setAsientoSeleccionado(null);
    refSeleccionado.current = null;
    setMostrarModalTurnos(false);
    setTurnoSeleccionado(null);
  };

  const conteos = {
    disponible: Object.values(estadoAsientos).filter((estado) => estado === "disponible").length,
    ocupado: Object.values(estadoAsientos).filter((estado) => estado === "ocupado").length,
  };
  
  const etiquetaSeleccionada = CONFIGURACION_ASIENTOS.find((asiento) => asiento.id === asientoSeleccionado)?.etiqueta;

  return (
    <div className="sala">
      {/* ── Barra superior ── */}
      <div className="sala__barra-superior">
        <div className="sala__barra-izquierda">
          <div className="sala__punto-vivo" />
          <span className="sala__nombre-cluster">CREPE-WORKING (1)</span>
        </div>
        <div className="sala__pastillas">
          <div className="sala__pastilla sala__pastilla--disponible">
            <div className="sala__pastilla-punto sala__pastilla-punto--disponible" />
            <span>{conteos.disponible} Disponibles</span>
          </div>
          <div className="sala__pastilla sala__pastilla--ocupado">
            <div className="sala__pastilla-punto sala__pastilla-punto--ocupado" />
            <span>{conteos.ocupado} Ocupados</span>
          </div>
        </div>
      </div>

      {/* ── Visor 3D ── */}
      <div className="sala__visor" ref={refMontaje} />

      {/* ── Pista superpuesta ── */}
      <div className="sala__pista">
        <span className="sala__pista-icono">🖱</span>
        <span>Arrastra para rotar · Scroll para zoom · Clic en silla para seleccionar</span>
      </div>

      {/* ── Leyenda ── */}
      <div className="sala__leyenda">
        {Object.entries(COLORES_ESTADO_RGB).map(([clave, color]) => (
          <div key={clave} className="sala__leyenda-item">
            <div 
              className="sala__leyenda-punto"
              style={{ 
                background: color, 
                boxShadow: `0 0 6px ${color}` 
              }} 
            />
            <span className="sala__leyenda-texto">
              {clave === "disponible" ? "Disponible" : clave === "seleccionado" ? "Seleccionado" : "Ocupado"}
            </span>
          </div>
        ))}
      </div>

      {/* ── Panel de selección ── */}
      {asientoSeleccionado && !mostrarModalTurnos && (
        <div className="sala__panel-seleccion">
          <div className="sala__seleccion-info">
            <div className="sala__seleccion-punto" />
            <div>
              <div className="sala__seleccion-titulo">Puesto {etiquetaSeleccionada} seleccionado</div>
              <div className="sala__seleccion-subtitulo">Selecciona un turno para continuar</div>
            </div>
          </div>
          <div className="sala__botones">
            <button onClick={abrirModalTurnos} className="sala__boton-confirmar">
              → Seleccionar Turno
            </button>
            <button onClick={cancelarAsiento} className="sala__boton-cancelar">
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Turnos ── */}
      {mostrarModalTurnos && (
        <div className="sala__modal-overlay" onClick={cerrarModalTurnos}>
          <div className="sala__modal-turnos" onClick={(e) => e.stopPropagation()}>
            <button className="sala__modal-cerrar" onClick={cerrarModalTurnos}>×</button>
            
            <h2 className="sala__modal-titulo">Escritorio {etiquetaSeleccionada}</h2>
            <div className="sala__modal-estado">DISPONIBLE</div>
            
            <div className="sala__modal-fecha">{fechaActual}</div>
            
            <div className="sala__modal-turnos-lista">
              <div 
                className={`sala__turno-opcion ${turnoSeleccionado === 1 ? 'sala__turno-opcion--seleccionado' : ''}`}
                onClick={() => setTurnoSeleccionado(1)}
              >
                <div className="sala__turno-radio">
                  {turnoSeleccionado === 1 && <div className="sala__turno-radio-inner" />}
                </div>
                <div className="sala__turno-info">
                  <div className="sala__turno-nombre">Turno 1</div>
                  <div className="sala__turno-horario">8:00 a.m. a 1:00 p.m.</div>
                </div>
              </div>
              
              <div 
                className={`sala__turno-opcion ${turnoSeleccionado === 2 ? 'sala__turno-opcion--seleccionado' : ''}`}
                onClick={() => setTurnoSeleccionado(2)}
              >
                <div className="sala__turno-radio">
                  {turnoSeleccionado === 2 && <div className="sala__turno-radio-inner" />}
                </div>
                <div className="sala__turno-info">
                  <div className="sala__turno-nombre">Turno 2</div>
                  <div className="sala__turno-horario">1:00 p.m. a 5:00 p.m.</div>
                </div>
              </div>
              
              <div 
                className={`sala__turno-opcion ${turnoSeleccionado === 3 ? 'sala__turno-opcion--seleccionado' : ''}`}
                onClick={() => setTurnoSeleccionado(3)}
              >
                <div className="sala__turno-radio">
                  {turnoSeleccionado === 3 && <div className="sala__turno-radio-inner" />}
                </div>
                <div className="sala__turno-info">
                  <div className="sala__turno-nombre">Turno 3</div>
                  <div className="sala__turno-horario">8:00 a.m. a 5:00 p.m.</div>
                </div>
              </div>
            </div>
            
            <button 
              className="sala__modal-boton-reservar"
              onClick={confirmarReserva}
              disabled={!turnoSeleccionado}
            >
              Reservar
            </button>
          </div>
        </div>
      )}

      {/* ── Mapa de asientos ── */}
      <div className="sala__mapa-asientos">
        {CONFIGURACION_ASIENTOS.map((asiento) => (
          <div
            key={asiento.id}
            onClick={() => {
              if (estadoAsientos[asiento.id] === "ocupado") return;
              Object.entries(refEstado.current).forEach(([clave, valor]) => {
                if (valor === "seleccionado") actualizarAsiento(Number(clave), "disponible");
              });
              if (estadoAsientos[asiento.id] === "disponible") {
                actualizarAsiento(asiento.id, "seleccionado");
                setAsientoSeleccionado(asiento.id);
                refSeleccionado.current = asiento.id;
              } else {
                setAsientoSeleccionado(null);
                refSeleccionado.current = null;
              }
            }}
            className={`sala__chip-asiento sala__chip-asiento--${estadoAsientos[asiento.id]}`}
            style={{
              borderColor: COLORES_ESTADO_RGB[estadoAsientos[asiento.id]],
              cursor: estadoAsientos[asiento.id] === "ocupado" ? "not-allowed" : "pointer",
              boxShadow: estadoAsientos[asiento.id] === "seleccionado" ? `0 0 12px #f59f0b6b` : "none",
            }}
          >
            <div 
              className="sala__chip-punto"
              style={{ 
                background: COLORES_ESTADO_RGB[estadoAsientos[asiento.id]], 
                boxShadow: `0 0 5px ${COLORES_ESTADO_RGB[estadoAsientos[asiento.id]]}` 
              }} 
            />
            <span className="sala__chip-etiqueta">
              {asiento.etiqueta}
            </span>
            {asiento.tieneMonitor && (
              <span className="sala__chip-monitor">🖥</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
