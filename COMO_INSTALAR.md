# Nova Finance — Cómo instalar en tu móvil

## Requisitos previos

- **Node.js** 18 o superior
- **Variable de entorno obligatoria**: `JWT_SECRET` — el servidor no arranca sin ella

## Configurar y arrancar el backend

```bash
cd backend

# Instalar dependencias
npm install

# Arrancar (imprescindible definir JWT_SECRET)
JWT_SECRET=tu_clave_secreta_aqui node server.js
```

El servidor queda en el puerto 3000 por defecto (configurable con `PORT`).

Si usas Docker:

```bash
docker-compose up --build
```

---

## Opción A: Probar con Expo Go (sin compilar)

1. Instala **Expo Go** en tu móvil Android (Google Play)
2. En la raíz del proyecto:
   ```bash
   npm install
   npx expo start
   ```
3. Escanea el código QR con Expo Go

> Asegúrate de que `src/config.js` apunta a la IP/puerto correctos de tu backend.

---

## Opción B: APK real para instalar sin Expo (recomendado)

Genera una `.apk` real que puedes instalar en cualquier Android.

### Requisitos adicionales

- Cuenta gratuita en https://expo.dev

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Instalar EAS CLI (si no lo tienes)
npm install -g eas-cli

# 3. Iniciar sesión en Expo
eas login

# 4. Configurar el proyecto (solo la primera vez)
eas build:configure

# 5. Compilar la APK
eas build --platform android --profile preview
```

Cuando termine (~10-15 min), recibirás un enlace para descargar la `.apk`.
Cópiala al móvil e instálala (puede que necesites activar "Instalar apps de origen desconocido" en Ajustes › Seguridad).

---

## Estructura del proyecto

```
App.js                          → Punto de entrada y navegación
backend/
  server.js                     → API REST (Express + SQLite)
src/
  context/
    FinanceContext.js            → Estado global y llamadas a la API
    AuthContext.js               → Autenticación y refresh de tokens
  screens/
    HomeScreen.js                → Dashboard principal
    AccountsScreen.js            → Gestión de cuentas
    TransactionsScreen.js        → Ingresos, gastos y transferencias
    StatsScreen.js               → Estadísticas, presupuestos y objetivos
    RecurringScreen.js           → Compromisos fijos, deudas y préstamos
  utils/
    autoCategory.js              → Sugerencia automática de categoría
    notifications.js             → Recordatorios de pagos
  theme/
    index.js                     → Colores, categorías y estilos base
  components/
    GlowCard.js                  → Tarjeta con efecto glow
    SectionHeader.js             → Cabecera de sección
```

## Variables de entorno

| Variable     | Requerida | Descripción                              |
|-------------|-----------|------------------------------------------|
| `JWT_SECRET` | Sí        | Clave para firmar tokens JWT             |
| `PORT`       | No        | Puerto del servidor (defecto: 3000)      |

## Solución de problemas

- Si `npm install` da errores: prueba con `npm install --legacy-peer-deps`
- Si el build falla: comprueba la sesión con `eas whoami`
- Si el servidor no arranca: asegúrate de haber definido `JWT_SECRET`
