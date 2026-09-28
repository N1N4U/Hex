export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

let toastsState = $state<ToastItem[]>([]);

export const toasts = {
  get items() {
    return toastsState;
  }
};

export function addToast(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration = 4000
) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastItem = { id, message, type, duration };

  if (toastsState.length >= 5) {
    toastsState = [...toastsState.slice(1), newToast];
  } else {
    toastsState = [...toastsState, newToast];
  }

  return id;
}

export function removeToast(id: string) {
  toastsState = toastsState.filter((t) => t.id !== id);
}
