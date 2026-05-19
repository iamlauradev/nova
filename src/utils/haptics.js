import * as Haptics from 'expo-haptics';

// Light tap — navegar, seleccionar
export const tapLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

// Medium tap — confirmar, guardar
export const tapMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

// Heavy tap — acción importante, unlock exitoso
export const tapHeavy = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

// Éxito — transacción creada, login OK, celebración
export const notifySuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

// Error — autenticación fallida, error de red
export const notifyError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

// Warning — borrar categoría, cerrar sesión
export const notifyWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
