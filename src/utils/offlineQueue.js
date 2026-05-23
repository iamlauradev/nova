import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@nova_offline_queue';

/** Adds a failed operation to the retry queue. */
export async function enqueueOperation(op) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...op, queuedAt: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

/** Returns all queued operations. */
export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

/** Removes successfully processed operations by their queuedAt timestamp. */
export async function removeFromQueue(queuedAt) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(queue.filter(op => op.queuedAt !== queuedAt)),
    );
  } catch (_) {}
}

/** Clears the entire queue. */
export async function clearQueue() {
  try { await AsyncStorage.removeItem(QUEUE_KEY); } catch (_) {}
}

/**
 * Processes the offline queue. For each op, calls executor(op).
 * Removes succeeded ops; leaves failed ones for next attempt.
 */
export async function processQueue(executor) {
  const queue = await getQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const op of queue) {
    try {
      await executor(op);
    } catch (_) {
      remaining.push(op);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining)).catch(() => {});
}
