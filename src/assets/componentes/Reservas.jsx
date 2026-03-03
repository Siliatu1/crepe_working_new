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
    { id: 1, nombre: 'Escritorio 1', estado: STATUS.OCUPADO },
    { id: 2, nombre: 'Escritorio 2', estado: STATUS.OCUPADO },
    { id: 3, nombre: 'Escritorio 3', estado: STATUS.OCUPADO },
    { id: 4, nombre: 'Escritorio 4', estado: STATUS.OCUPADO },
    { id: 5, nombre: 'Escritorio 5', estado: STATUS.OCUPADO },
    { id: 6, nombre: 'Escritorio 6', estado: STATUS.OCUPADO },
  ]);

  const getSillaImage = (estado) => (estado === STATUS.OCUPADO ? sillaOcu : sillaDis);

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#f3e5d8] overflow-hidden p-4">

      {/* Header */}
      <div className="text-center mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold italic text-[#b37d4e]">Crepe-Working 1</h1>
        <button className="bg-[#b37d4e] text-white px-6 py-1 rounded-md my-2 text-sm shadow-md">Atrás</button>
      </div>

      {/* Área del mapa */}
      <div className="relative flex-1 w-full max-w-[900px] bg-[#e6cbb4] rounded-3xl shadow-inner flex items-center justify-center overflow-hidden border-4 border-[#d4b496]">

        {/* Contenedor de la mesa con tamaño máximo absoluto */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: '70%', height: '70%'}}
        >
          {/* Mesa */}
          <img
            src={mesaImg}
            alt="Mesa"
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
            className="pointer-events-none"
          />

          {/* Sillas - Fila Superior */}
          <div className="absolute top-[18%] left-[8%]" style={{ width: '10%', maxWidth: '40px' }}>
            <img src={getSillaImage(escritorios[0].estado)} className="w-full rotate-[-15deg]" alt="1" />
          </div>
          <div className="absolute top-[8%] left-[44%]" style={{ width: '10%', maxWidth: '40px' }}>
            <img src={getSillaImage(escritorios[1].estado)} className="w-full" alt="2" />
          </div>
          <div className="absolute top-[13%] right-[10%]" style={{ width: '10%', maxWidth: '40px' }}>
            <img src={getSillaImage(escritorios[2].estado)} className="w-full rotate-[15deg]" alt="3" />
          </div>

          {/* Sillas - Fila Inferior */}
          <div className="absolute bottom-[18%] left-[8%]" style={{ width: '10%', maxWidth: '40px' }}>
            <img src={getSillaImage(escritorios[3].estado)} className="w-full rotate-[15deg] scale-y-[-1]" alt="4" />
          </div>
          <div className="absolute bottom-[8%] left-[44%]" style={{ width: '10%', maxWidth: '40px' }}>
            <img src={getSillaImage(escritorios[4].estado)} className="w-full rotate-180" alt="5" />
          </div>
          <div className="absolute bottom-[13%] right-[10%]" style={{ width: '10%', maxWidth: '40px' }}>
            <img src={getSillaImage(escritorios[5].estado)} className="w-full rotate-[-15deg] scale-y-[-1]" alt="6" />
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-8 py-4 flex-shrink-0 font-bold text-[#5d3a24] text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#99c199] rounded-full"></div> Libre
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#a66a4a] rounded-full"></div> Ocupado
        </div>
      </div>
    </div>
  );
};

export default CrepeWorking;