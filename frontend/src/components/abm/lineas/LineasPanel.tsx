import React, { useEffect, useState } from 'react';
import { LineaPrestamo, LineaPrestamoCreate } from '../../../types/linea';
import {
  getLineas,
  createLinea,
  updateLinea,
  deleteLinea
} from '../../../services/api/lineasApi';
import { Badge } from '../../common/Badge';
import { LineaModal } from './LineaModal';
import { formatMoney, formatPct } from '../../../utils/formatters';
import { PlusIcon, EditIcon, TrashIcon, SlidersIcon } from '../../common/Icons';

export const LineasPanel: React.FC<{ onNuevaLinea: () => void }> = ({
  onNuevaLinea
}) => {
  const [lineas, setLineas] = useState<LineaPrestamo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [lineaSeleccionada, setLineaSeleccionada] =
    useState<LineaPrestamo | null>(null);

  const cargarLineas = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getLineas();
      setLineas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar líneas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLineas();
  }, []);

  const handleNuevo = () => {
    onNuevaLinea();
  };

  const handleEditar = (l: LineaPrestamo) => {
    setLineaSeleccionada(l);
    setModalAbierto(true);
  };

  const handleSave = async (data: LineaPrestamoCreate) => {
    if (lineaSeleccionada) {
      await updateLinea(lineaSeleccionada.id, data);
    } else {
      await createLinea(data);
    }
    await cargarLineas();
  };

  const handleToggleActivo = async (l: LineaPrestamo) => {
    try {
      await updateLinea(l.id, { activo: !l.activo });
      await cargarLineas();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  const handleEliminar = async (l: LineaPrestamo) => {
    if (!window.confirm(`¿Estás seguro de eliminar la línea "${l.nombre}"?`))
      return;

    try {
      await deleteLinea(l.id);
      await cargarLineas();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar línea');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-[0.6rem]">
            <div className="w-[36px] h-[36px] rounded-lg bg-[#dbeafe] text-[#1d4ed8] flex items-center justify-center">
              <SlidersIcon size={20} />
            </div>
            <div>
              <h2 className="text-[1.5rem] font-bold m-0 text-[#0f172a] tracking-[-0.02em]">
                Líneas de Préstamo
              </h2>
              <p className="m-[0.2rem_0_0] text-[#64748b] text-[0.875rem]">
                Catálogo comercial de productos crediticios, montos límite,
                plazos y motor financiero asignado.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleNuevo}
          className="inline-flex items-center gap-2 p-[0.65rem_1.25rem] [background:linear-gradient(135deg,_#2563eb_0%,_#1d4ed8_100%)] text-[#fff] [border:none] rounded-lg font-semibold cursor-pointer text-[0.875rem] shadow-[0_2px_4px_rgba(37,_99,_235,_0.2)] [transition:all_0.15s_ease]"
        >
          <PlusIcon size={18} />
          Nueva Línea de Préstamo
        </button>
      </div>

      {error && (
        <div className="p-[0.85rem_1.25rem] bg-[#fee2e2] text-[#991b1b] rounded-lg mb-5 [border:1px_solid_#fecaca]">
          {error}
        </div>
      )}

      <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <table className="w-full border-collapse text-left text-[0.875rem]">
          <thead className="bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0] text-[#475569]">
            <tr>
              <th className="p-[0.85rem_1.25rem] font-semibold">
                Código / Nombre
              </th>
              <th className="p-[0.85rem_1.25rem] font-semibold">
                Motor de Fórmula
              </th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Tasa / IVA</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">
                Rango Montos
              </th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Plazos</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Condición</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Estado</th>
              <th className="p-[0.85rem_1.25rem] font-semibold text-center">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {lineas.length > 0 ? (
              lineas.map((l) => (
                <tr
                  key={l.id}
                  className="[border-bottom:1px_solid_#f1f5f9] [transition:background_0.15s]"
                >
                  <td className="p-[1rem_1.25rem]">
                    <div className="font-semibold text-[#0f172a]">
                      {l.nombre}
                    </div>
                    <div className="text-[#64748b] text-[0.78rem] mt-[0.15rem]">
                      <code className="bg-[#f1f5f9] p-[0.15rem_0.35rem] rounded-sm text-[#334155] [font-family:monospace]">
                        {l.codigo}
                      </code>
                    </div>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <div className="font-semibold text-[#1e293b]">
                      {l.motor?.nombre || `Motor #${l.motor_id}`}
                    </div>
                    <div className="text-[#64748b] text-[0.78rem] mt-[0.15rem]">
                      {l.motor?.convencion_tasa} • {l.motor?.modalidad_iva}
                    </div>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <div className="font-bold text-[#2563eb] text-[0.9rem]">
                      {l.tipo_tasa ||
                        (l.motor?.convencion_tasa?.includes('TEA')
                          ? 'TEA'
                          : 'TNA')}
                      : {formatPct(l.tasa_default)}
                    </div>
                    <div className="text-[#64748b] text-[0.78rem] mt-[0.15rem]">
                      IVA: {formatPct(l.alicuota_iva)}{' '}
                      {l.permite_override_tasa && (
                        <span className="text-[#059669] font-medium">
                          • Variable
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <div className="text-[0.825rem] text-[#64748b]">
                      Mín:{' '}
                      <strong className="text-[#1e293b]">
                        {formatMoney(l.monto_minimo_centavos)}
                      </strong>
                    </div>
                    <div className="text-[0.825rem] text-[#64748b] mt-[0.1rem]">
                      Máx:{' '}
                      <strong className="text-[#1e293b]">
                        {formatMoney(l.monto_maximo_centavos)}
                      </strong>
                    </div>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <span className="font-semibold text-[#1e293b]">
                      {l.plazo_minimo_meses}
                    </span>{' '}
                    a{' '}
                    <span className="font-semibold text-[#1e293b]">
                      {l.plazo_maximo_meses}
                    </span>{' '}
                    cuotas
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <Badge
                      variant={l.requiere_socio_al_dia ? 'warning' : 'neutral'}
                    >
                      {l.requiere_socio_al_dia ? 'Exige Al Día' : 'Flexible'}
                    </Badge>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <span
                      onClick={() => handleToggleActivo(l)}
                      className="cursor-pointer [display:inline-block]"
                      title="Haz click para alternar estado"
                    >
                      <Badge variant={l.activo ? 'success' : 'danger'}>
                        {l.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </span>
                  </td>
                  <td className="p-[1rem_1.25rem] text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEditar(l)}
                        title="Editar Línea"
                        className="inline-flex items-center gap-[0.35rem] p-[0.4rem_0.75rem] rounded-md [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#334155] text-[0.775rem] font-medium cursor-pointer"
                      >
                        <EditIcon size={14} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(l)}
                        title="Eliminar Línea"
                        className="inline-flex items-center gap-[0.35rem] p-[0.4rem_0.75rem] rounded-md [border:1px_solid_#fee2e2] bg-[#fef2f2] text-[#991b1b] text-[0.775rem] font-medium cursor-pointer"
                      >
                        <TrashIcon size={14} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-14 text-center text-[#94a3b8]">
                  {cargando
                    ? 'Cargando líneas de préstamo...'
                    : 'No hay líneas de crédito registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LineaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={handleSave}
        lineaParaEditar={lineaSeleccionada}
      />
    </div>
  );
};
