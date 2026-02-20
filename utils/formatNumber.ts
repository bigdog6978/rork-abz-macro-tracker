export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0';
  return parseFloat(value.toFixed(1)).toString();
}
