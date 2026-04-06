// src/services/toast.js — NuAi Toast Service
// Singleton event emitter. No context, no props, no App.js changes.
// Usage from any component:
//   import toast from '../services/toast';
//   toast.success("Item saved");
//   toast.error("Save failed");
//   toast.warning("Item deleted", { undo: () => restoreItem(), duration: 5000 });

const _listeners = new Set();
const _dedup = new Map();
const _DEDUP_MS = 2500;

function _emit(config) {
  const _dedupKey = `${config.type}:${config.message}`;
  const _last = _dedup.get(_dedupKey);
  if (_last && Date.now() - _last < _DEDUP_MS) return;
  _dedup.set(_dedupKey, Date.now());
  _listeners.forEach((fn) => fn(config));
}

const toast = {
  /** Green — successful action */
  success: (message, opts = {}) =>
    _emit({ type: "success", message, duration: 3000, ...opts }),

  /** Red — error, stays open until dismissed */
  error: (message, opts = {}) =>
    _emit({ type: "error", message, duration: 0, ...opts }),

  /** Amber — warning or destructive action (supports undo) */
  warning: (message, opts = {}) =>
    _emit({ type: "warning", message, duration: 5000, ...opts }),

  /** Blue — neutral info */
  info: (message, opts = {}) =>
    _emit({ type: "info", message, duration: 3000, ...opts }),

  /** Subscribe to toasts. Returns unsubscribe function. */
  subscribe: (fn) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export default toast;
