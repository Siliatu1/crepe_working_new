import React, { useState } from 'react';
import sillaDis from '../../assets/sillaDis.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg from '../../assets/mesa.png';

const STATUS = {
  DISPONIBLE: 'disponible',
  OCUPADO: 'ocupado',
};

const CrepeWorking = () => {
  const [escritorios] = useState([
    { id: 1, estado: STATUS.OCUPADO },
    { id: 2, estado: STATUS.OCUPADO },
    { id: 3, estado: STATUS.OCUPADO },
    { id: 4, estado: STATUS.OCUPADO },
    { id: 5, estado: STATUS.OCUPADO },
    { id: 6, estado: STATUS.OCUPADO },
  ]);

  const getSilla = (i) =>
    escritorios[i].estado === STATUS.OCUPADO ? sillaOcu : sillaDis;

  // Cada silla: { top, left, right, bottom, rotate } en % relativo a la mesa
  const sillas = [
    { top: '5%', left: '0%',  rotate: '10deg' },       // 1 izquierda arriba
    { top: '-25%', left: '45%', rotate: '0deg'   },     // 2 arriba izquierda
    { top: '-12%', left: '57%', rotate: '0deg'   },     // 3 arriba derecha
    { top: '62%', left: '-8%',  rotate: '-90deg' },     // 4 izquierda abajo
    { bottom: '-12%', left: '27%', rotate: '180deg' },  // 5 abajo izquierda
    { top: '45%', right: '-8%', rotate: '90deg'  },     // 6 derecha
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: '#f3e5d8',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic', color: '#b37d4e' }}>
          Crepe-Working 1
        </h1>
        <button style={{
          background: '#b37d4e', color: 'white',
          padding: '4px 24px', borderRadius: '6px',
          marginTop: '4px', fontSize: '0.875rem',
          border: 'none', cursor: 'pointer',
        }}>
          Atrás
        </button>
      </div>

      {/* Área del mapa */}
      <div style={{
        flex: 1, width: '100%', maxWidth: '900px',
        background: '#e6cbb4', borderRadius: '24px',
        border: '4px solid #d4b496',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/*
          *** CONTENEDOR CRÍTICO ***
          La mesa define el tamaño. Las sillas son hijas de este div
          con position absolute. Todo se escala junto.
        */}
        <div style={{ position: 'relative', width: '55%', maxWidth: '380px' }}>

          {/* MESA */}
          <img
            src={mesaImg}
            alt="Mesa"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />

          {/* SILLAS — hijas del mismo div, se posicionan sobre la mesa */}
          {sillas.map((s, i) => (
            <img
              key={i}
              src={getSilla(i)}
              alt={`Silla ${i + 1}`}
              style={{
                position: 'absolute',
                width: '13%',
                top: s.top,
                left: s.left,
                right: s.right,
                bottom: s.bottom,
                transform: `rotate(${s.rotate})`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{
        display: 'flex', gap: '32px',
        padding: '12px 0', flexShrink: 0,
        fontWeight: 'bold', color: '#5d3a24', fontSize: '0.875rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 16, height: 16, background: '#99c199', borderRadius: '50%' }} />
          Libre
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 16, height: 16, background: '#a66a4a', borderRadius: '50%' }} />
          Ocupado
        </div>
      </div>
    </div>
  );
};

export default CrepeWorking;