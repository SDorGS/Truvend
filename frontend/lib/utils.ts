
export function formatCurrency(
  amount: number
): string {
  return `₦${amount.toLocaleString()}`;
}

export function capitalize(
  text: string
): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}



