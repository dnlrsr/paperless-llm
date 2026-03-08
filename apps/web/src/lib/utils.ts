import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/** Format an ISO date to a locale-aware short date string. */
export function formatDate(iso: string, locale = 'en'): string {
    return new Date(iso).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/** Truncate a string to maxLen characters and append ellipsis. */
export function truncate(s: string, maxLen = 80): string {
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}
