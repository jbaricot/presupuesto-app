import React from 'react';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import { calculateDaysLeft } from '../lib/helpers';

export default function TrialBanner({ trialEndsAt }) {
  const daysLeft = calculateDaysLeft(trialEndsAt);

  // Si no hay fecha de vencimiento (cuentas permanentes), no mostramos el banner
  if (daysLeft === null) return null;

  // ESTADO: Prueba vencida (Modo solo lectura)
  if (daysLeft <= 0) {
    return (
      <div className="flex items-start p-4 mb-6 border rounded-lg shadow-sm bg-gray-50 border-gray-300 text-gray-800" style={{ marginBottom: 20 }}>
        <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-gray-600" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm md:text-base mb-1">Prueba finalizada</h4>
          <p className="text-xs md:text-sm opacity-90 leading-relaxed">
            Tu acceso ha expirado y tu cuenta está en <strong>solo lectura</strong>. Puedes ver y exportar tus datos, pero no registrar nuevos.
          </p>
        </div>
        <button className="ml-4 px-4 py-2 text-xs md:text-sm font-bold text-white rounded shadow-sm bg-blue-600 hover:bg-blue-700">
          Renovar Acceso
        </button>
      </div>
    );
  }

  // ESTADO: Prueba activa (Muestra siempre los días restantes con colores dinámicos)
  const isUrgent = daysLeft <= 3;
  const isWarning = daysLeft > 3 && daysLeft <= 10;
  
  let bannerColor = 'bg-blue-50 border-blue-200 text-blue-800';
  let buttonColor = 'bg-blue-600 hover:bg-blue-700';
  let Icon = Info;
  let title = 'Acceso de prueba activo';

  if (isUrgent) {
    bannerColor = 'bg-red-50 border-red-200 text-red-800';
    buttonColor = 'bg-red-600 hover:bg-red-700';
    Icon = AlertTriangle;
    title = '¡Tu acceso de prueba está por terminar!';
  } else if (isWarning) {
    bannerColor = 'bg-yellow-50 border-yellow-200 text-yellow-800';
    buttonColor = 'bg-yellow-600 hover:bg-yellow-700';
    Icon = Clock;
    title = 'Aviso de vencimiento de prueba';
  }

  return (
    <div className={`flex items-start p-4 mb-6 border rounded-lg shadow-sm ${bannerColor}`} style={{ marginBottom: 20 }}>
      <Icon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-sm md:text-base mb-1">{title}</h4>
        <p className="text-xs md:text-sm opacity-90 leading-relaxed">
          Te quedan <strong>{daysLeft} días</strong> de acceso completo. Al vencer, tu cuenta pasará a modo de solo lectura.
        </p>
      </div>
{/*       <button className={`ml-4 px-4 py-2 text-xs md:text-sm font-bold text-white rounded transition-colors shadow-sm ${buttonColor}`}>
        Renovar Acceso
      </button> */}
    </div>
  );
}