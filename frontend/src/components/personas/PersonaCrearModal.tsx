import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Banco, PersonaCreatePayload, PersonaCreateResponse } from '../../types/persona';
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
      getBancos().then(setBancos).catch(() => setBancos([]));
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

    if (!form.documento.trim() || !form.nombre.trim() || !form.apellido.trim()) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Alta de Persona (Dual: Oracle + CoopYa)" maxWidth="640px">
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <strong>Flujo estricto:</strong> Se inserta primero en la <strong>DB Legacy Oracle</strong> (modo thick). Si es exitoso, replica en el <strong>Monolito CoopYa</strong> y almacena el CBU localmente.
      </div>

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangleIcon size={18} color="#b91c1c" />
          <span>{errorMsg}</span>
        </div>
      )}

      {exitoMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircleIcon size={18} color="#16a34a" />
          <span>{exitoMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Fila 1: DNI y CUIL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              DNI / Documento *
            </label>
            <input
              type="text"
              required
              value={form.documento}
              onChange={(e) => setForm({ ...form, documento: e.target.value })}
              placeholder="Ej: 34567890"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              CUIL
            </label>
            <input
              type="text"
              value={form.cuil}
              onChange={(e) => setForm({ ...form, cuil: e.target.value })}
              placeholder="Ej: 20345678904"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Fila 2: Apellido y Nombre */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Apellido *
            </label>
            <input
              type="text"
              required
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="Ej: Pérez"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Nombre *
            </label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Juan Carlos"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Fila 3: Email y Teléfono */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="correo@ejemplo.com"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Teléfono
            </label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="Ej: 1155443322"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Domicilio */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
            Domicilio
          </label>
          <input
            type="text"
            value={form.domicilio}
            onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
            placeholder="Calle y número"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Datos Bancarios */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.875rem', marginTop: '0.25rem' }}>
          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem' }}>
            Datos Bancarios (CBU / Desembolso)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                CBU (22 dígitos numéricos)
              </label>
              <input
                type="text"
                maxLength={22}
                value={form.cbu}
                onChange={(e) => handleCbuChange(e.target.value)}
                placeholder="0140000000000000000012"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Alias CBU
              </label>
              <input
                type="text"
                value={form.alias_cbu}
                onChange={(e) => setForm({ ...form, alias_cbu: e.target.value.toUpperCase() })}
                placeholder="SOCIO.TEST.CBU"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Banco Oficial
            </label>
            <select
              value={form.banco_id || ''}
              onChange={(e) => setForm({ ...form, banco_id: e.target.value ? Number(e.target.value) : null })}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff', boxSizing: 'border-box' }}
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', border: 'none', background: enviando ? '#94a3b8' : '#2563eb', color: '#ffffff', fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            {enviando ? 'Verificando con Oracle...' : 'Crear Persona'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
