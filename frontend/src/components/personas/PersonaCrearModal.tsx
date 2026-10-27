import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Banco,
  PersonaCreatePayload,
  PersonaCreateResponse
} from '../../types/persona';
import { getBancos, crearPersona } from '../../services/api/personasApi';
import { CheckCircleIcon, AlertTriangleIcon } from '../common/Icons';

interface PersonaCrearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonaCreada: (res: PersonaCreateResponse) => void;
}

export const PersonaCrearModal: React.FC<PersonaCrearModalProps> = ({
  isOpen,
  onClose,
  onPersonaCreada
}) => {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const [form, setForm] = useState<PersonaCreatePayload>({
    documento: '',
    cuil: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    domicilio: '',
    cbu: '',
    alias_cbu: '',
    banco_id: null
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setExitoMsg(null);
      getBancos()
        .then(setBancos)
        .catch(() => setBancos([]));
    }
  }, [isOpen]);

  // Autodetectar banco si se ingresan al menos 3 dígitos de CBU
  const handleCbuChange = (cbuVal: string) => {
    const clean = cbuVal.replace(/\D/g, '').slice(0, 22);
    let autoBancoId = form.banco_id;
    if (clean.length >= 3) {
      const cod3 = clean.slice(0, 3);
      const match = bancos.find((b) => b.codigo.endsWith(cod3));
      if (match) autoBancoId = match.id;
    }
    setForm((prev) => ({ ...prev, cbu: clean, banco_id: autoBancoId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    if (
      !form.documento.trim() ||
      !form.nombre.trim() ||
      !form.apellido.trim()
    ) {
      setErrorMsg('DNI, Nombre y Apellido son obligatorios.');
      return;
    }

    if (form.cbu && form.cbu.length !== 22) {
      setErrorMsg('El CBU debe contener exactamente 22 dígitos numéricos.');
      return;
    }

    setEnviando(true);
    try {
      const res = await crearPersona(form);
      setExitoMsg(res.mensaje || 'Persona dada de alta exitosamente.');
      onPersonaCreada(res);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el alta de la persona.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alta de Persona (Dual: Oracle + CoopYa)"
      maxWidth="640px"
    >
      <div className="text-[0.8rem] text-[#64748b] mb-5 bg-[#f8fafc] p-3 rounded-lg [border:1px_solid_#e2e8f0]">
        <strong>Flujo estricto:</strong> Se inserta primero en la{' '}
        <strong>DB Legacy Oracle</strong> (modo thick). Si es exitoso, replica
        en el <strong>Monolito CoopYa</strong> y almacena el CBU localmente.
      </div>

      {errorMsg && (
        <div className="bg-[#fef2f2] [border:1px_solid_#fecaca] text-[#991b1b] p-[0.75rem_1rem] rounded-lg text-[0.85rem] mb-4 flex items-center gap-2">
          <AlertTriangleIcon size={18} color="#b91c1c" />
          <span>{errorMsg}</span>
        </div>
      )}

      {exitoMsg && (
        <div className="bg-[#f0fdf4] [border:1px_solid_#bbf7d0] text-[#166534] p-[0.75rem_1rem] rounded-lg text-[0.85rem] mb-4 flex items-center gap-2">
          <CheckCircleIcon size={18} color="#16a34a" />
          <span>{exitoMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Fila 1: DNI y CUIL */}
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
              DNI / Documento *
            </label>
            <input
              type="text"
              required
              value={form.documento}
              onChange={(e) => setForm({ ...form, documento: e.target.value })}
              placeholder="Ej: 34567890"
              className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
            />
          </div>
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
              CUIL
            </label>
            <input
              type="text"
              value={form.cuil}
              onChange={(e) => setForm({ ...form, cuil: e.target.value })}
              placeholder="Ej: 20345678904"
              className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
            />
          </div>
        </div>

        {/* Fila 2: Apellido y Nombre */}
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
              Apellido *
            </label>
            <input
              type="text"
              required
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="Ej: Pérez"
              className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
            />
          </div>
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Juan Carlos"
              className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
            />
          </div>
        </div>

        {/* Fila 3: Email y Teléfono */}
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="correo@ejemplo.com"
              className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
            />
          </div>
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
              Teléfono
            </label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="Ej: 1155443322"
              className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
            />
          </div>
        </div>

        {/* Domicilio */}
        <div>
          <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
            Domicilio
          </label>
          <input
            type="text"
            value={form.domicilio}
            onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
            placeholder="Calle y número"
            className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
          />
        </div>

        {/* Datos Bancarios */}
        <div className="[border-top:1px_solid_#e2e8f0] pt-[0.875rem] mt-1">
          <div className="text-[0.825rem] font-bold text-[#1e293b] mb-[0.6rem]">
            Datos Bancarios (CBU / Desembolso)
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-3">
            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
                CBU (22 dígitos numéricos)
              </label>
              <input
                type="text"
                maxLength={22}
                value={form.cbu}
                onChange={(e) => handleCbuChange(e.target.value)}
                placeholder="0140000000000000000012"
                className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
              />
            </div>
            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
                Alias CBU
              </label>
              <input
                type="text"
                value={form.alias_cbu}
                onChange={(e) =>
                  setForm({ ...form, alias_cbu: e.target.value.toUpperCase() })
                }
                placeholder="SOCIO.TEST.CBU"
                className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
              />
            </div>
          </div>

          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-1">
              Banco Oficial
            </label>
            <select
              value={form.banco_id || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  banco_id: e.target.value ? Number(e.target.value) : null
                })
              }
              className="w-full p-[0.6rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.875rem] bg-[#ffffff] box-border"
            >
              <option value="">Seleccione o autodetecte con el CBU...</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre} (Cód. {b.codigo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 mt-4 [border-top:1px_solid_#e2e8f0] pt-4">
          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            className="p-[0.6rem_1.25rem] rounded-md [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#475569] font-semibold cursor-pointer text-[0.875rem]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className={[
              'p-[0.6rem_1.25rem] rounded-md [border:none]',
              enviando ? 'bg-[#94a3b8]' : 'bg-[#2563eb]',
              'text-[#ffffff] font-bold',
              enviando ? 'cursor-not-allowed' : 'cursor-pointer',
              'text-[0.875rem]'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {enviando ? 'Verificando con Oracle...' : 'Crear Persona'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
