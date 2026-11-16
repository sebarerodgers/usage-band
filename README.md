# usage-band

Un mod de Claude Code que dibuja una banda encima del cuadro de texto con tres anillos de progreso y un botón para compactar la conversación.

## Qué hace

- **Tres anillos** repartidos a lo ancho de la banda:
  - **context**: porcentaje de la ventana de contexto usada.
  - **5h**: porcentaje usado del límite de 5 horas.
  - **7d**: porcentaje usado del límite semanal de 7 días.
- **Tiempo de reinicio**: bajo **5h** y **7d** aparece `reinicia en 2h 15m` (o `3d 4h` si faltan días). Si el motor no informa la hora de reinicio, no se muestra nada. El tiempo se recalcula cuando la banda se redibuja (después de cada turno o cuando cambia un límite), no segundo a segundo.
- **Color según el uso**: cada anillo va de verde (0%) a ámbar (umbral `warnAt`) y a rojo (umbral `criticalAt`), con una escala continua entre esos puntos.
- **Aviso (toast)** cuando una medida llega al umbral rojo. Avisa una sola vez por cruce y se rearma cuando la medida baja del umbral (por ejemplo, context tras `/compact`).
- **Botón Compact** a la derecha: ejecuta `/compact`.

En la terminal, que no dibuja gráficos vectoriales, los anillos se muestran como texto, por ejemplo `context 42%   5h 12% (reinicia en 2h 15m)   7d 40%`. Ahí el color no cambia, pero el aviso y el botón funcionan igual.

## Configuración: umbrales de color

| Opción | Por defecto | Rango | Qué hace |
| --- | --- | --- | --- |
| `warnAt` | `70` | 1 a 99 | Porcentaje en el que el anillo llega a ámbar. |
| `criticalAt` | `90` | 2 a 100 | Porcentaje en el que el anillo es rojo y salta el aviso. |

Cómo se usan los colores:

- Con **0%** el anillo es verde.
- Al llegar a `warnAt` es ámbar exacto; entre el verde y el ámbar pasa por amarillo-verdoso.
- Entre `warnAt` y `criticalAt` el color se acerca poco a poco al rojo.
- Desde `criticalAt` hacia arriba es rojo.

`criticalAt` siempre queda al menos un punto por encima de `warnAt`: si escribes un valor menor o igual, el mod lo corrige.

Al instalar el mod, un paso de la instalación te deja fijar estos valores. Más tarde puedes cambiarlos en el menú de configuración (`/config`), donde aparecen como filas del plugin; al cambiarlos, el mod se recarga con los nuevos valores.

## Instalación

El mod está publicado en `sebarerodgers/usage-band`.

En una sesión de terminal, en el cuadro de texto:

```
/plugin install usage-band --marketplace sebarerodgers/usage-band
```

Desde un shell:

```
claude plugin install usage-band --marketplace sebarerodgers/usage-band
```

En la app de escritorio, donde `/plugin` no funciona: pulsa **+** junto al cuadro de texto, luego **Plugins**, **Add marketplace** con `sebarerodgers/usage-band` y después **Add plugin**.

Lo que verás al instalar, en orden: `Add marketplace?` (responde `y`), los detalles del plugin con el ámbito (el de usuario aparece primero; confirma con Enter), la pantalla con `warnAt` y `criticalAt`, y por último `Installed usage-band. Plugin is now active.`

Si el repositorio es privado, solo pueden instalarlo las personas con acceso en GitHub y con una credencial de git para github.com en su ordenador (una clave SSH, o `gh auth login` seguido de `gh auth setup-git`). La instalación no pide credenciales por sí sola.

## Límites a tener en cuenta

- Los porcentajes de **5h** y **7d** solo existen con una suscripción que informe límites de uso; sin ellos los anillos marcan 0%.
- El botón Compact lanza el comando `/compact` igual que si lo escribieras.

## Desarrollo

```
claude plugin validate .
claude plugin test .
```

Las pruebas están en `register.test.tsx`.
