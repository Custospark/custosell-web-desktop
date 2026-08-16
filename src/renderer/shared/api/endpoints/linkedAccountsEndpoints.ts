export const LINKED_ACCOUNTS = {
  BASE: '/linked-accounts',
  CONFIRM_LINK: '/linked-accounts/confirm',
  SWITCH: (userId: number) => `/linked-accounts/${userId}/switch`,
  SET_PRIMARY: (userId: number) => `/linked-accounts/${userId}/set-primary`,
  UNLINK: (userId: number) => `/linked-accounts/${userId}/unlink`,
  CONFIRM_UNLINK: (userId: number) => `/linked-accounts/${userId}/unlink/confirm`,
} as const;
