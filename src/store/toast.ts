import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (text: string, kind?: Toast['kind']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (text, kind = 'ok') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
