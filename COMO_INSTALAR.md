# 📱 Solo Finance — Cómo instalar en tu móvil

## Opción A: APK rápida con Expo Go (para probar)

Esta opción te permite probar la app al instante sin necesidad de compilar.

1. Instala **Expo Go** en tu móvil Android (está en Google Play)
2. En tu ordenador, abre una terminal en esta carpeta y ejecuta:
   ```bash
   npm install
   npx expo start
   ```
3. Escanea el código QR con Expo Go

---

## Opción B: APK real para instalar sin Expo (recomendado)

Esta opción genera una `.apk` real que puedes instalar en cualquier Android.

### Requisitos previos
- Node.js instalado
- Cuenta gratuita en https://expo.dev (crear una)

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Instalar EAS CLI
npm install -g eas-cli

# 3. Iniciar sesión en Expo
eas login

# 4. Configurar el proyecto (solo la primera vez)
eas build:configure

# 5. Compilar la APK
eas build --platform android --profile preview
```

Cuando termine (tarda ~10-15 min), recibirás un enlace para descargar la `.apk`.
Cópiala a tu móvil e instálala (puede que necesites activar "Instalar apps de origen desconocido" en Ajustes > Seguridad).

---

## Estructura de la app

```
App.js                  → Punto de entrada y navegación
src/
  context/
    FinanceContext.js   → Estado global y persistencia
  screens/
    HomeScreen.js       → Dashboard principal
    AccountsScreen.js   → Gestión de cuentas
    TransactionsScreen.js → Ingresos y gastos
    StatsScreen.js      → Estadísticas y gráficas
    RecurringScreen.js  → Compromisos fijos
  theme/
    index.js            → Colores y estilos Solo Leveling
  components/
    GlowCard.js         → Tarjeta con efecto glow
    SectionHeader.js    → Cabecera de sección
```

## ¿Problemas?

- Si `npm install` da errores, prueba con `npm install --legacy-peer-deps`
- Si el build falla, asegúrate de tener la sesión de Expo activa con `eas whoami`
