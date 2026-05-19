import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
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

/**
 * Schedule a local notification N days before a recurring payment date.
 * @param {object} item  — recurring item { id, name, nextDate (ISO string), amount }
 * @param {number} daysBefore  — how many days in advance (default 2)
 */
export async function schedulePaymentReminder(item, daysBefore = 2) {
  if (!item.nextDate) return;

  const fireDate = new Date(item.nextDate);
  fireDate.setDate(fireDate.getDate() - daysBefore);
  fireDate.setHours(9, 0, 0, 0); // 9 AM

  // Don't schedule if the date is already past
  if (fireDate <= new Date()) return;

  // Cancel any previous notification for this item
  await cancelPaymentReminder(item.id);

  await Notifications.scheduleNotificationAsync({
    identifier: `recurring_${item.id}`,
    content: {
      title: '💸 Pago próximo',
      body: `"${item.name}" vence en ${daysBefore} días — ${item.amount ? item.amount.toFixed(2) + ' €' : ''}`,
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
  } catch {}
}

export async function cancelAllPaymentReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier?.startsWith('recurring_')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Reschedule all reminders from a list of recurring items.
 * Call this after adding/updating recurring items.
 */
export async function rescheduleAllReminders(recurringItems, daysBefore = 2) {
  for (const item of recurringItems) {
    if (item.active !== false) {
      await schedulePaymentReminder(item, daysBefore);
    } else {
      await cancelPaymentReminder(item.id);
    }
  }
}
