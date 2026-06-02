export function formatCurrency(amount: string | number): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return 'UGX 0.00';
  }

  return `UGX ${numericAmount.toLocaleString('en-UG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
