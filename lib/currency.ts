export function formatCurrency(amountInCents: number, currencyCode: string = 'usd'): string {
  const amount = amountInCents / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    }).format(amount);
  } catch (e) {
    return `$${amount.toFixed(2)}`;
  }
}