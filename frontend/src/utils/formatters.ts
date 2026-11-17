export function formatMoney(centavos: number): string {
  return (centavos / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatPesos(pesos: number): string {
  return pesos.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatPct(
  val: string | number,
  minDecimales = 2,
  maxDecimales = minDecimales
): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return `${(0).toFixed(minDecimales)}%`;
  return `${(num * 100).toLocaleString('en-US', {
    useGrouping: false,
    minimumFractionDigits: minDecimales,
    maximumFractionDigits: maxDecimales
  })}%`;
}
