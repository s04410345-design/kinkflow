import { loadCachedGuestName, persistGuestName, removeGuestName } from '@/lib/persistence/appStorage';

function stripIdentitySuffix(value: string): string {
  return value.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
}

export function formatGuestName(value: string): string {
  return `${stripIdentitySuffix(value)} 👻`;
}

export function formatMemberName(value: string): string {
  return `${stripIdentitySuffix(value)} ☑️`;
}

export function getStoredGuestName(): string | null {
  const storedName = loadCachedGuestName();
  return storedName ? formatGuestName(storedName) : null;
}

export function saveGuestName(value: string): void {
  persistGuestName(formatGuestName(value));
}

export function clearGuestName(): void {
  removeGuestName();
}
