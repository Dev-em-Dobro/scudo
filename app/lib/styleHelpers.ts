/**
 * Style Helpers - Centralized CSS class generation utilities
 * 
 * This module provides consistent, reusable functions for generating
 * Tailwind CSS classes throughout the application. Following DRY principles
 * and maintaining type safety.
 * 
 * @module styleHelpers
 */

import { Job } from '@/app/types';

/**
 * Job type to icon mapping
 * Maps job types to Material Symbols icon names
 */
const JOB_ICONS: Record<Job['type'], string> = {
    match: 'cloud',
    'skill-gap': 'deployed_code',
    promoted: 'dataset',
} as const;

/**
 * Gets the appropriate Material Symbol icon for a job type
 * 
 * @param jobType - The type of job (match, skill-gap, promoted)
 * @returns Material Symbol icon name
 * 
 * @example
 * ```tsx
 * <span className="material-symbols-outlined">
 *   {getJobIcon(job.type)}
 * </span>
 * ```
 */
export function getJobIcon(jobType: Job['type']): string {
    return JOB_ICONS[jobType] || 'work';
}

/**
 * Badge style configurations for different job types
 * Includes both light and dark mode variants with proper opacity
 */
const JOB_BADGE_STYLES: Record<Job['type'], string> = {
    match: 'bg-green-100 dark:bg-primary/20 text-green-800 dark:text-primary border-green-200 dark:border-primary/30',
    'skill-gap': 'bg-amber-100 dark:bg-secondary/20 text-amber-800 dark:text-secondary border-amber-200 dark:border-secondary/30',
    promoted: 'bg-blue-100 dark:bg-accent/20 text-blue-800 dark:text-accent border-blue-200 dark:border-accent/30',
} as const;

/**
 * Gets badge styling classes for a job type
 * Handles light/dark mode with appropriate colors and opacity
 * 
 * @param jobType - The type of job
 * @returns Tailwind CSS classes for badge styling
 */
export function getJobBadgeStyles(jobType: Job['type']): string {
    return JOB_BADGE_STYLES[jobType];
}

/**
 * Hover border color styles for job cards
 */
const JOB_HOVER_STYLES: Record<Job['type'], string> = {
    match: 'hover:border-primary dark:hover:border-primary',
    'skill-gap': 'hover:border-secondary dark:hover:border-secondary',
    promoted: 'hover:border-accent dark:hover:border-accent',
} as const;

/**
 * Gets hover border styles for job cards
 * 
 * @param jobType - The type of job
 * @returns Tailwind CSS hover classes
 */
export function getJobHoverStyles(jobType: Job['type']): string {
    return JOB_HOVER_STYLES[jobType];
}

/**
 * Title hover colors for group-hover effects
 */
const JOB_TITLE_HOVER: Record<Job['type'], string> = {
    match: 'group-hover:text-primary',
    'skill-gap': 'group-hover:text-secondary',
    promoted: 'group-hover:text-accent',
} as const;

/**
 * Gets title hover color class for job cards
 * Used with Tailwind's group-hover functionality
 * 
 * @param jobType - The type of job
 * @returns Tailwind CSS group-hover class
 */
export function getJobTitleHover(jobType: Job['type']): string {
    return JOB_TITLE_HOVER[jobType];
}

/**
 * Badge label text for different job types
 */
const JOB_BADGE_LABELS: Record<Job['type'], (matchPercentage?: number) => string> = {
    match: (matchPercentage = 0) => `${matchPercentage}% Match`,
    'skill-gap': () => 'Skill Gap',
    promoted: () => 'Promoted',
} as const;

/**
 * Gets the display label for a job badge
 * 
 * @param jobType - The type of job
 * @param matchPercentage - Optional match percentage (only for 'match' type)
 * @returns Badge label text
 */
export function getJobBadgeLabel(jobType: Job['type'], matchPercentage?: number): string {
    return JOB_BADGE_LABELS[jobType](matchPercentage);
}

/**
 * Generates classes for chart bars with conditional highlighting
 * Used in weekly output card for profile views visualization
 * 
 * @param index - Current bar index
 * @param highlightIndex - Index of the bar to highlight
 * @returns Tailwind CSS classes for bar styling
 */
export function getChartBarClass(index: number, highlightIndex: number): string {
    if (index === highlightIndex) {
        return 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]';
    }
    if (index === 2) {
        return 'bg-white/50';
    }
    return 'bg-white/20';
}

/**
 * Gets rank number styling for peer leaderboard
 * Highlights current user and top rank with special colors
 * 
 * @param isCurrentUser - Whether this is the current user
 * @param rank - User's rank position
 * @returns Tailwind CSS classes for rank styling
 */
export function getPeerRankClass(isCurrentUser: boolean, rank: number): string {
    if (isCurrentUser) {
        return 'text-amber-600 dark:text-secondary';
    }
    if (rank === 1) {
        return 'text-slate-400 dark:text-secondary';
    }
    return 'text-slate-400 dark:text-slate-300';
}

/**
 * Gets XP text styling for peer leaderboard
 * Differentiates current user, top rank, and regular users
 * 
 * @param isCurrentUser - Whether this is the current user
 * @param rank - User's rank position
 * @returns Tailwind CSS classes for XP text styling
 */
export function getPeerXpClass(isCurrentUser: boolean, rank: number): string {
    if (isCurrentUser) {
        return 'text-amber-700 dark:text-secondary/80';
    }
    if (rank === 1) {
        return 'text-primary';
    }
    return 'text-slate-400 dark:text-slate-300';
}

/**
 * Determines if a skill tag should be highlighted as missing
 * Used to style skill gap indicators in job cards
 * 
 * @param tag - The skill tag text
 * @param isMissingSkill - Whether this represents a missing skill
 * @returns Tailwind CSS classes for tag styling
 */
export function getSkillTagClass(tag: string, isMissingSkill: boolean): string {
    if (isMissingSkill) {
        return 'font-bold text-amber-700 dark:text-secondary bg-amber-50 dark:bg-background-dark border border-amber-200 dark:border-secondary/40';
    }
    return 'font-medium text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark';
}

/**
 * Formats a number with zero-padding
 * Useful for rank displays and numbered lists
 * 
 * @param num - Number to format
 * @param minDigits - Minimum number of digits (default: 2)
 * @returns Zero-padded string
 * 
 * @example
 * ```typescript
 * formatWithPadding(3) // "03"
 * formatWithPadding(15) // "15"
 * ```
 */
export function formatWithPadding(num: number, minDigits: number = 2): string {
    return num.toString().padStart(minDigits, '0');
}

/**
 * Calculates percentage and returns formatted string
 * 
 * @param current - Current value
 * @param total - Total/goal value
 * @returns Percentage as string with % symbol
 */
export function calculatePercentage(current: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((current / total) * 100)}%`;
}

/**
 * Generates a consistent class string for card containers
 * Ensures all cards have the same base styling
 * 
 * @param extraClasses - Additional classes to append
 * @returns Combined Tailwind CSS classes
 */
export function getCardBaseClasses(extraClasses: string = ''): string {
    const baseClasses = 'bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm rounded-xl';
    return extraClasses ? `${baseClasses} ${extraClasses}` : baseClasses;
}

/**
 * Gets responsive padding classes for main content areas
 * Ensures consistent spacing across breakpoints
 * 
 * @returns Tailwind CSS responsive padding classes
 */
export function getContentPaddingClasses(): string {
    return 'p-6 md:p-8';
}
