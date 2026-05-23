import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recordatorios', {
      name: 'Recordatorios de pagos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Compute the next calendar date when a monthly item fires.
// Returns a Date or null if dayOfMonth is not set / not a number.
function computeNextOccurrence(dayOfMonth) {
  const day = parseInt(dayOfMonth, 10);
  if (!day || day < 1 || day > 31) return null;

  const now = new Date();
  // Try this calendar month first
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  if (thisMonth > now) return thisMonth;

  // Already passed this month → use next month
  return new Date(now.getFullYear(), now.getMonth() + 1, day);
}

/**
 * Schedule a local notification 3 days before a recurring item's next payment.
 * Works for monthly items (uses dayOfMonth).
 * For items with an explicit nextDate ISO string it uses that directly.
 */
export async function schedulePaymentReminder(item, daysBefore = 3) {
  // Resolve the next occurrence date
  let nextOccurrence = null;
  if (item.nextDate) {
    nextOccurrence = new Date(item.nextDate);
  } else if (item.dayOfMonth && (item.frequency === 'monthly' || !item.frequency)) {
    nextOccurrence = computeNextOccurrence(item.dayOfMonth);
  }

  if (!nextOccurrence) return;

  const fireDate = new Date(nextOccurrence);
  fireDate.setDate(fireDate.getDate() - daysBefore);
  fireDate.setHours(9, 0, 0, 0); // 9 AM

  if (fireDate <= new Date()) return;

  await cancelPaymentReminder(item.id);

  await Notifications.scheduleNotificationAsync({
    identifier: `recurring_${item.id}`,
    content: {
      title: '📅 Pago próximo',
      body: `"${item.name}" vence en ${daysBefore} días${item.amount ? ` — ${Number(item.amount).toFixed(2)} €` : ''}`,
      data: { itemId: item.id, type: 'recurring' },
    },
    trigger: {
      date: fireDate,
      channelId: 'recordatorios',
    },
  });
}

export async function cancelPaymentReminder(itemId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`recurring_${itemId}`);
  } catch (_) {}
}

export async function cancelAllPaymentReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier?.startsWith('recurring_')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function rescheduleAllReminders(recurringItems, daysBefore = 3) {
  for (const item of recurringItems) {
    if (item.active !== false) {
      await schedulePaymentReminder(item, daysBefore);
    } else {
      await cancelPaymentReminder(item.id);
    }
  }
}
