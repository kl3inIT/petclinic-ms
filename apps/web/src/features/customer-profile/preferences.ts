import { useEffect, useState } from 'react';

/**
 * Thin localStorage-backed preferences hook. Persist 1 namespace per key
 * — không expose tới BE (preferences đặt FE-side trong demo). Khi production
 * cần multi-device sync, migrate sang user-prefs endpoint /api/v1/users/me/preferences.
 */
export function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // localStorage có thể bị disabled (private mode quá strict) — skip silent.
    }
  }, [key, state]);

  return [state, setState] as const;
}

// === Notification preferences ===
export interface NotificationPreferences {
  email: { appointmentReminder: boolean; visitSummary: boolean; promotions: boolean };
  sms: { appointmentReminder: boolean; emergency: boolean };
  push: { all: boolean };
}

export const defaultNotificationPreferences: NotificationPreferences = {
  email: { appointmentReminder: true, visitSummary: true, promotions: false },
  sms: { appointmentReminder: true, emergency: true },
  push: { all: true },
};

// === Payment methods stub ===
export interface PaymentMethod {
  id: string;
  brand: 'visa' | 'mastercard' | 'jcb' | 'momo' | 'vnpay';
  last4: string;
  holderName: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

// === Language ===
export type LanguageCode = 'vi' | 'en';
export const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English (preview)', flag: '🇺🇸' },
];
