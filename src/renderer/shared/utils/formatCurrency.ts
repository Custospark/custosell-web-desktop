export function formatCurrency(amount: string | number): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return 'UGX 0.00';

  const formatted = numericAmount.toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `UGX ${parts.join('.')}`;
}
