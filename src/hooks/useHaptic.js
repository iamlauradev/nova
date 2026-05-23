import { tapMedium, notifySuccess, notifyError, notifyWarning } from '../utils/haptics';

/** Centralizes haptic feedback so all screens use the same intensity. */
export function useHaptic() {
  return { tapMedium, notifySuccess, notifyError, notifyWarning };
}
