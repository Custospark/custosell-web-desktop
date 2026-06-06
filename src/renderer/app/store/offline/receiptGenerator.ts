export function generateLocalReceiptNumber(): string {
  const prefix = 'OFF';
  const date = new Date();
  const yymmdd = date.getFullYear().toString().slice(2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${yymmdd}-${random}`;
}
