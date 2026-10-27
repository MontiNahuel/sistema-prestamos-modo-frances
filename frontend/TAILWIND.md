# Estilos del frontend

El frontend usa Tailwind CSS 4 con `@tailwindcss/vite`. El diseño conserva las medidas, colores y tipografías de la interfaz anterior.

- Los componentes usan utilidades en `className`. Los valores entre corchetes conservan medidas y colores exactos cuando no coinciden con la escala predeterminada.
- `src/index.css` carga Tailwind y define las bases globales con `@apply`: tipografía, tamaño de caja, transiciones y barras de desplazamiento.
- `src/features/reportes/reportes.css` agrupa patrones repetidos de reportes en `@layer components`, usando `@apply`. Las utilidades de un componente pueden sobrescribir estos patrones.
- Se importan las capas de tema y utilidades sin Preflight para conservar los valores nativos de formularios, títulos y listas usados por el diseño existente.
- Los estados usan variantes como `hover:` y `enabled:hover:`. Las clases condicionales deben escribirse completas para que Tailwind las detecte al compilar.
- Los colores de `Badge` y los anchos de `Modal` tienen mapas de clases estáticas. Para agregar una variante o un ancho, ampliar su mapa.

No agregar objetos `style` ni modificar `element.style` para estados visuales. Mantener la lógica de negocio separada de los estilos.

Desarrollo: `npm ci` y `npm run dev`. Compilación: `npm run build`. Comprobaciones existentes: `npm run lint` y `npm run test:reportes`.
