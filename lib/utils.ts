import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
    .substring(0, 14);
}

/** CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
}

/** CPF ou CNPJ automático conforme o número de dígitos */
export function maskCPFouCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
}

/** Telefone: (00) 00000-0000 ou (00) 0000-0000 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 14);
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
}

/** Moeda: 1.500,00 */
export function maskCurrency(value: string | number): string {
  const raw =
    typeof value === 'string'
      ? value.replace(/\D/g, '')
      : Math.round(Number(value) * 100).toString();

  if (!raw || raw === '0') return '0,00';

  const cents = parseInt(raw, 10);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const reaisFormatted = reais.toLocaleString('pt-BR');
  return `${reaisFormatted},${String(centavos).padStart(2, '0')}`;
}

/** Remove formatação de moeda → número */
export function unmaskCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Remove thousand dots, replace decimal comma with dot
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return Number(cleaned) || 0;
}

/** Percentual: aceita até 3 dígitos + 2 decimais, ex: "99,99" */
export function maskPercent(value: string | number): string {
  if (typeof value === 'number') {
    return value.toFixed(2).replace('.', ',');
  }
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (num > 10000) return '100,00';
  const pct = num / 100;
  return pct.toFixed(2).replace('.', ',');
}

export function unmaskPercent(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return Number(value.replace(',', '.')) || 0;
}
