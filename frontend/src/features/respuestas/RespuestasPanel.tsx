import { useEffect, useRef, useState } from "react";
import { apiClient } from "../../services/api/client";
import { formatMoney } from "../../utils/formatters";
import { CuentaCorrienteModal } from "../../components/personas/CuentaCorrienteModal";
import type { CuentaCorrienteResumen } from "../../types/persona";

type Banco = "BAPRO" | "BNA";
type Resumen = {
  total: number;
  cobrados: number;
  rechazados: number;
  duplicados: number;
  revisar: number;
  importe_centavos: number;
};
type Candidato = {
  cuota_id: string;
  prestamo_id: string;
  persona: string;
  documento: string;
  numero_cuota: number;
  vencimiento: string;
  saldo_centavos: number;
};
type Fila = {
  linea: number;
  referencia: string;
  cuenta: string;
  importe_centavos: number;
  codigo: string;
  descripcion: string;
  estado: string;
  motivo: string;
  persona?: string;
  documento?: string;
  prestamo_id?: string;
  numero_cuota?: number;
  candidatos: Candidato[];
};
type Vista = {
  confirmacion_habilitada: boolean;
  revision: string;
  banco: Banco;
  lote: number;
  fecha_cobro: string;
  resumen: Resumen;
  filas: Fila[];
  avisos: string[];
};
type Carga = {
  id: string;
  banco: Banco;
  lote: number;
  nombre_archivo: string;
  fecha_cobro: string;
  operador: string;
  resumen: Resumen;
};
type Detalle = {
  linea: number;
  persona: string;
  persona_id: number;
  prestamo_id: string;
  numero_cuota: number;
  codigo: string;
  descripcion: string;
  cobrado_centavos: number;
  capital_centavos: number;
  interes_centavos: number;
  iva_centavos: number;
  saldo_cuota_centavos: number;
  estado_cuota: string;
};
const url = "/api/v1/respuestas-bancarias";
const input =
  "block w-full mt-1 p-2.5 rounded-lg [border:1px_solid_#cbd5e1] bg-white text-[#0f172a] disabled:opacity-60";
const boton =
  "px-4 py-2.5 rounded-lg [border:1px_solid_#cbd5e1] bg-white text-[#334155] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const principal = `${boton} !bg-[#2563eb] !text-white !border-[#2563eb]`;
const celda = "p-3 text-left [border-bottom:1px_solid_#e2e8f0] align-top";
const hoy = () => new Date().toLocaleDateString("en-CA");
const mensaje = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación.";

export function RespuestasPanel({
  bancoInicial = "BAPRO",
  onAplicada,
}: {
  bancoInicial?: Banco;
  onAplicada?: () => void;
}) {
  const [banco, setBanco] = useState<Banco>(bancoInicial);
  const [lote, setLote] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
  const [vista, setVista] = useState<Vista | null>(null);
  const [seleccionPendiente, setSeleccionPendiente] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [pagina, setPagina] = useState(0);
  const [filtro, setFiltro] = useState("");
  const [historial, setHistorial] = useState<Carga[]>([]);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [paginaHistorial, setPaginaHistorial] = useState(0);
  const [revisionHistorial, setRevisionHistorial] = useState(0);
  const [detalle, setDetalle] = useState<Detalle[] | null>(null);
  const [paginaDetalle, setPaginaDetalle] = useState(0);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cuentaLocal, setCuentaLocal] = useState<CuentaCorrienteResumen | null>(
    null,
  );
  const [cargandoCuenta, setCargandoCuenta] = useState(false);
  const solicitudDetalle = useRef(0);
  const enCurso = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    apiClient<Carga[]>(`${url}?offset=${paginaHistorial * 20}&limit=20`, {
      signal: abort.signal,
    })
      .then((data) => {
        setHistorial(data);
        setErrorHistorial("");
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setHistorial([]);
          setErrorHistorial(mensaje(e));
        }
      });
    return () => abort.abort();
  }, [paginaHistorial, revisionHistorial]);

  function invalidar() {
    setVista(null);
    setAsignaciones({});
    setSeleccionPendiente(false);
    setExito("");
    setError("");
    setPagina(0);
    setFiltro("");
  }
  function datos() {
    const data = new FormData();
    data.append("banco", banco);
    data.append("lote", lote);
    data.append("fecha_cobro", fecha);
    data.append("file", archivo!);
    data.append("asignaciones", JSON.stringify(asignaciones));
    return data;
  }
  async function previsualizar(e: React.FormEvent) {
    e.preventDefault();
    if (enCurso.current || !archivo) return;
    if (archivo.size > 10 * 1024 * 1024) {
      setError("El archivo supera los 10 MB.");
      return;
    }
    enCurso.current = true;
    setOcupado(true);
    setError("");
    setExito("");
    try {
      const resultado = await apiClient<Vista>(`${url}/previsualizar`, {
        method: "POST",
        body: datos(),
      });
      setVista(resultado);
      setSeleccionPendiente(false);
      setPagina(0);
    } catch (e) {
      setVista(null);
      setError(mensaje(e));
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }
  async function confirmar() {
    if (!vista || seleccionadoInvalido || enCurso.current) return;
    const r = vista.resumen;
    if (
      !window.confirm(
        `Se registrarán ${r.cobrados} cobros por ${formatMoney(r.importe_centavos)} y ${r.rechazados} rechazos en la cuenta corriente local.\nEl lote se bloquea si hay incidencias pendientes.\n¿Confirmar la imputación?`,
      )
    )
      return;
    enCurso.current = true;
    setOcupado(true);
    setError("");
    try {
      const data = datos();
      data.append("revision", vista.revision);
      const res = await apiClient<Resumen & { id: string }>(
        `${url}/confirmar`,
        { method: "POST", body: data },
      );
      setVista(null);
      setAsignaciones({});
      setExito(
        `Carga registrada: ${res.cobrados} cobros (${formatMoney(res.importe_centavos)}) y ${res.rechazados} rechazos. ${res.revisar} filas quedaron sin imputar para revisión. La cuenta corriente local fue actualizada.`,
      );
      setPaginaHistorial(0);
      setRevisionHistorial((v) => v + 1);
      onAplicada?.();
    } catch (e) {
      setError(mensaje(e));
      setSeleccionPendiente(true);
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }
  async function verDetalle(id: string) {
    const solicitud = ++solicitudDetalle.current;
    setCargandoDetalle(true);
    setDetalle(null);
    setErrorHistorial("");
    try {
      const data = await apiClient<Detalle[]>(`${url}/${id}`);
      if (solicitud === solicitudDetalle.current) {
        setDetalle(data);
        setPaginaDetalle(0);
      }
    } catch (e) {
      if (solicitud === solicitudDetalle.current) setErrorHistorial(mensaje(e));
    } finally {
      if (solicitud === solicitudDetalle.current) setCargandoDetalle(false);
    }
  }
  async function exportar() {
    if (!vista) return;
    try {
      const { default: ExcelJS } = await import("exceljs");
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet("Respuesta");
      hoja.addRow([
        "Banco",
        "Lote",
        "Línea",
        "Referencia",
        "Cuenta",
        "Persona",
        "Préstamo",
        "Cuota",
        "Importe pesos",
        "Código",
        "Resultado",
        "Observación",
      ]);
      vista.filas.forEach((r) =>
        hoja.addRow([
          banco,
          Number(lote),
          r.linea,
          r.referencia,
          r.cuenta,
          r.persona || "",
          r.prestamo_id || "",
          r.numero_cuota || "",
          r.importe_centavos / 100,
          r.codigo,
          r.estado,
          r.motivo || r.descripcion,
        ]),
      );
      hoja.getRow(1).font = { bold: true };
      hoja.getColumn(9).numFmt = "#,##0.00";
      hoja.columns.forEach((c) => {
        c.width = 22;
      });
      const bytes = await libro.xlsx.writeBuffer();
      const enlace = document.createElement("a");
      const blobUrl = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      enlace.href = blobUrl;
      enlace.download = `respuesta-${banco}-${lote}.xlsx`;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      setError(mensaje(e));
    }
  }
  async function verCuenta(id: number) {
    setCargandoCuenta(true);
    setErrorHistorial("");
    try {
      setCuentaLocal(
        await apiClient<CuentaCorrienteResumen>(
          `${url}/cuenta-corriente/${id}`,
        ),
      );
    } catch (e) {
      setErrorHistorial(mensaje(e));
    } finally {
      setCargandoCuenta(false);
    }
  }
  const seleccionadoInvalido =
    !vista ||
    !vista.confirmacion_habilitada ||
    vista.resumen.revisar > 0 ||
    seleccionPendiente ||
    (!vista.resumen.cobrados && !vista.resumen.rechazados);
  const filas = (vista?.filas || []).filter(
    (r) => !filtro || r.estado === filtro,
  );
  return (
    <section className="text-[#0f172a]">
      <h2 className="m-0 text-2xl font-bold">Carga de respuesta</h2>
      <p className="text-[#64748b] mb-6">
        Importá las respuestas de BAPRO o Banco Nación, revisá las coincidencias
        para revisar sus resultados. La integración CoopYa está pendiente de
        homologación; Nación requiere vincular primero su presentación original.
      </p>
      <form
        onSubmit={previsualizar}
        className="bg-white rounded-xl p-5 [border:1px_solid_#e2e8f0]"
      >
        <fieldset
          disabled={ocupado}
          className="m-0 p-0 [border:none] grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <label className="text-sm font-semibold">
            Banco
            <select
              className={input}
              value={banco}
              onChange={(e) => {
                invalidar();
                setBanco(e.target.value as Banco);
              }}
            >
              <option value="BAPRO">Banco Provincia (BAPRO)</option>
              <option value="BNA">Banco Nación (BNA)</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Número de lote / archivo
            <input
              className={input}
              type="number"
              min="1"
              step="1"
              required
              value={lote}
              onChange={(e) => {
                invalidar();
                setLote(e.target.value);
              }}
            />
          </label>
          <label className="text-sm font-semibold">
            Fecha efectiva del cobro
            <input
              className={input}
              type="date"
              required
              max={hoy()}
              value={fecha}
              onChange={(e) => {
                invalidar();
                setFecha(e.target.value);
              }}
            />
          </label>
          <label className="text-sm font-semibold">
            Respuesta del banco (.txt)
            <input
              className={input}
              type="file"
              accept=".txt,.TXT,text/plain"
              required
              onChange={(e) => {
                invalidar();
                setArchivo(e.target.files?.[0] || null);
              }}
            />
          </label>
        </fieldset>
        <p className="text-xs text-[#64748b]">
          BAPRO: presentación local y referencia exacta. BNA: archivos de 128 o
          172 posiciones, sin asignación manual de cuotas. Máximo 10 MB / 100.000 registros. La vista previa no
          registra pagos.
        </p>
        <button className={principal} disabled={ocupado || !archivo}>
          {ocupado
            ? "Procesando…"
            : seleccionPendiente
              ? "Revalidar selección"
              : "Previsualizar respuesta"}
        </button>
      </form>
      {error && (
        <p role="alert" className="bg-[#fef2f2] text-[#b91c1c] p-4 rounded-lg">
          {error === "Not Found"
            ? "El servidor todavía no tiene habilitada la carga de respuestas. Es necesario actualizar el backend."
            : error}
        </p>
      )}
      {exito && (
        <p role="status" className="bg-[#ecfdf5] text-[#047857] p-4 rounded-lg">
          {exito}
        </p>
      )}
      {vista && (
        <div className="mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ["Registros", vista.resumen.total],
              ["Cobros a registrar", vista.resumen.cobrados],
              ["Importe a cobrar", formatMoney(vista.resumen.importe_centavos)],
              ["Rechazos", vista.resumen.rechazados],
              [
                "Revisar / duplicadas",
                `${vista.resumen.revisar} / ${vista.resumen.duplicados}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-white rounded-lg p-4 [border:1px_solid_#e2e8f0]"
              >
                <div className="text-xs text-[#64748b]">{label}</div>
                <strong className="block mt-2 text-xl">{value}</strong>
              </div>
            ))}
          </div>
          {vista.avisos.map((aviso) => (
            <p
              key={aviso}
              className="bg-[#fffbeb] text-[#92400e] p-3 rounded-lg text-sm"
            >
              {aviso}
            </p>
          ))}
          <p className="text-sm text-[#64748b]">
            Los cobros parciales se acumulan. Capital, interés e IVA se
            distribuyen proporcionalmente en centavos, ajustando el remanente al
            completar la cuota. Los rechazos no reducen la deuda.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <label>
              Mostrar{" "}
              <select
                aria-label="Filtrar resultado"
                className={input}
                value={filtro}
                onChange={(e) => {
                  setFiltro(e.target.value);
                  setPagina(0);
                }}
              >
                <option value="">Todos</option>
                {[
                  "COBRAR",
                  "RECHAZAR",
                  "REVISAR",
                  "DUPLICADA",
                  "CONFLICTO",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button
              className={boton}
              type="button"
              onClick={exportar}
              disabled={ocupado || seleccionPendiente}
            >
              Bajar a Excel
            </button>
          </div>
          {seleccionPendiente && (
            <p role="status" className="text-[#92400e]">
              La selección cambió o necesita revisión. Presioná “Revalidar
              selección” antes de confirmar; los totales todavía corresponden a
              la vista anterior.
            </p>
          )}
          <div className="overflow-x-auto bg-white rounded-lg [border:1px_solid_#e2e8f0]">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#f8fafc]">
                <tr>
                  {[
                    "Línea / referencia",
                    "Cuenta bancaria",
                    "Persona / préstamo / cuota",
                    "Importe",
                    "Respuesta",
                    "Imputación",
                  ].map((t) => (
                    <th key={t} className={celda}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.slice(pagina * 50, (pagina + 1) * 50).map((r) => (
                  <tr key={r.linea}>
                    <td className={celda}>
                      {r.linea}
                      <small className="block text-[#64748b]">
                        {r.referencia || "Sin referencia"}
                      </small>
                    </td>
                    <td className={`${celda} font-mono text-xs`}>{r.cuenta}</td>
                    <td className={celda}>
                      {r.persona || "Sin vincular"}
                      {r.prestamo_id && (
                        <small className="block">
                          {r.prestamo_id.slice(0, 8)} · Cuota {r.numero_cuota}
                        </small>
                      )}
                    </td>
                    <td className={`${celda} whitespace-nowrap`}>
                      {formatMoney(r.importe_centavos)}
                    </td>
                    <td className={celda}>
                      {r.codigo}
                      <small className="block text-[#64748b]">
                        {r.descripcion}
                      </small>
                    </td>
                    <td className={celda}>
                      <strong
                        className={
                          r.estado === "COBRAR"
                            ? "text-[#047857]"
                            : "text-[#92400e]"
                        }
                      >
                        {r.estado}
                      </strong>
                      <small className="block mt-1">{r.motivo}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filas.length && (
              <p className="p-4">No hay registros con este filtro.</p>
            )}
          </div>
          <Paginador
            pagina={pagina}
            total={filas.length}
            tamano={50}
            cambiar={setPagina}
          />
          <div className="bg-[#eff6ff] p-4 rounded-lg mt-4">
            <p className="m-0 mb-3">
              Se imputarán únicamente las filas COBRAR y RECHAZAR. Las demás
              conservarán su saldo actual.
            </p>
            <button
              className={principal}
              type="button"
              disabled={ocupado || seleccionadoInvalido}
              onClick={confirmar}
            >
              Confirmar e imputar respuesta
            </button>
          </div>
        </div>
      )}
      <div className="mt-8">
        <div className="flex justify-between items-center">
          <h3 className="text-lg">Historial de cargas</h3>
          <button
            type="button"
            className={boton}
            disabled={ocupado}
            onClick={() => setRevisionHistorial((v) => v + 1)}
          >
            Actualizar
          </button>
        </div>
        {errorHistorial && (
          <p role="alert" className="text-[#b91c1c]">
            {errorHistorial === "Not Found"
              ? "La carga de respuestas requiere la nueva versión del backend."
              : errorHistorial}
          </p>
        )}
        <div className="overflow-x-auto bg-white rounded-lg [border:1px_solid_#e2e8f0]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {[
                  "Banco / lote",
                  "Archivo",
                  "Fecha del cobro",
                  "Operador",
                  "Cobrado",
                  "Detalle",
                ].map((t) => (
                  <th key={t} className={celda}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => (
                <tr key={h.id}>
                  <td className={celda}>
                    {h.banco} #{h.lote}
                  </td>
                  <td className={celda}>{h.nombre_archivo}</td>
                  <td className={celda}>{h.fecha_cobro}</td>
                  <td className={celda}>{h.operador}</td>
                  <td className={celda}>
                    {formatMoney(h.resumen.importe_centavos)}
                  </td>
                  <td className={celda}>
                    <button
                      className={boton}
                      disabled={cargandoDetalle}
                      onClick={() => verDetalle(h.id)}
                    >
                      Ver imputaciones
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!historial.length && !errorHistorial && (
            <p className="p-4 text-[#64748b]">
              Sin cargas registradas en esta página.
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-3">
          <button
            className={boton}
            disabled={paginaHistorial === 0}
            onClick={() => setPaginaHistorial((v) => v - 1)}
          >
            Anterior
          </button>
          <button
            className={boton}
            disabled={historial.length < 20}
            onClick={() => setPaginaHistorial((v) => v + 1)}
          >
            Siguiente
          </button>
        </div>
        {detalle && (
          <div className="mt-4">
            <h4>Imputaciones registradas</h4>
            <div className="overflow-x-auto">
              <table className="w-full bg-white border-collapse text-sm">
                <thead>
                  <tr>
                    {[
                      "Persona / préstamo",
                      "Cuota",
                      "Resultado",
                      "Cobrado",
                      "Capital",
                      "Interés",
                      "IVA",
                      "Saldo cuota",
                    ].map((t) => (
                      <th key={t} className={celda}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle
                    .slice(paginaDetalle * 50, (paginaDetalle + 1) * 50)
                    .map((d) => (
                      <tr key={d.linea}>
                        <td className={celda}>
                          {d.persona}
                          <small className="block">
                            {d.prestamo_id.slice(0, 8)}
                          </small>
                          <button
                            type="button"
                            className={`${boton} mt-2 text-xs`}
                            disabled={cargandoCuenta}
                            onClick={() => verCuenta(d.persona_id)}
                          >
                            Cuenta corriente local
                          </button>
                        </td>
                        <td className={celda}>{d.numero_cuota}</td>
                        <td className={celda}>
                          {d.codigo} · {d.estado_cuota}
                          <small className="block">{d.descripcion}</small>
                        </td>
                        {[
                          d.cobrado_centavos,
                          d.capital_centavos,
                          d.interes_centavos,
                          d.iva_centavos,
                          d.saldo_cuota_centavos,
                        ].map((v, i) => (
                          <td key={i} className={celda}>
                            {formatMoney(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Paginador
              pagina={paginaDetalle}
              total={detalle.length}
              tamano={50}
              cambiar={setPaginaDetalle}
            />
          </div>
        )}
      </div>
      <CuentaCorrienteModal
        isOpen={cuentaLocal !== null}
        cc={cuentaLocal}
        onClose={() => setCuentaLocal(null)}
      />
    </section>
  );
}

function Paginador({
  pagina,
  total,
  tamano,
  cambiar,
}: {
  pagina: number;
  total: number;
  tamano: number;
  cambiar: (n: number) => void;
}) {
  return (
    <div className="flex justify-end gap-3 items-center mt-3 text-sm">
      <span>
        {total} registros · Página {pagina + 1} de{" "}
        {Math.max(1, Math.ceil(total / tamano))}
      </span>
      <button
        className={boton}
        disabled={!pagina}
        onClick={() => cambiar(pagina - 1)}
      >
        Anterior
      </button>
      <button
        className={boton}
        disabled={(pagina + 1) * tamano >= total}
        onClick={() => cambiar(pagina + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
