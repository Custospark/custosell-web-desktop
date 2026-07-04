export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000/api/v1'
  : (import.meta.env.VITE_API_BASE_URL || 'https://api.custosell.com/api/v1');

export const API_TIMEOUT = import.meta.env.DEV ? 60000 : 60000;
