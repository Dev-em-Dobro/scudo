'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const MARGIN_PX = 10;
const GAP_PX = 8;
const DEFAULT_MAX_WIDTH_PX = 18 * 16;

type ClampedHelpTooltipProps = {
    readonly ariaLabel: string;
    readonly children: ReactNode;
    readonly tooltipId?: string;
    /** Largura máxima do balão em px (default ~288px). Use maior para textos longos. */
    readonly maxWidthPx?: number;
    /** `sm`: 32×32px (painel). `md`: 36×36px (jornada). */
    readonly size?: 'sm' | 'md';
};

export default function ClampedHelpTooltip({
    ariaLabel,
    children,
    tooltipId = 'clamped-help-tooltip',
    maxWidthPx = DEFAULT_MAX_WIDTH_PX,
    size = 'sm',
}: Readonly<ClampedHelpTooltipProps>) {
    const triggerSizeClass = size === 'md' ? 'h-9 w-9' : 'h-8 w-8';
    const triggerRef = useRef<HTMLButtonElement>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [open, setOpen] = useState(false);
    const [layout, setLayout] = useState<{
        arrowLeft: number;
        left: number;
        top: number;
        width: number;
    } | null>(null);

    const clearHideTimer = useCallback(() => {
        if (hideTimerRef.current !== null) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => {
            setOpen(false);
            hideTimerRef.current = null;
        }, 220);
    }, [clearHideTimer]);

    const openTooltip = useCallback(() => {
        clearHideTimer();
        setOpen(true);
    }, [clearHideTimer]);

    const updateLayout = useCallback(() => {
        const el = triggerRef.current;
        if (!el) {
            return;
        }
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const maxW = Math.min(maxWidthPx, vw - 2 * MARGIN_PX);
        const w = maxW;
        let left = r.left + r.width / 2 - w / 2;
        left = Math.max(MARGIN_PX, Math.min(left, vw - w - MARGIN_PX));
        const top = r.top - GAP_PX;
        const triggerCenter = r.left + r.width / 2;
        const rawArrow = triggerCenter - left - 5;
        const arrowLeft = Math.max(14, Math.min(w - 24, rawArrow));
        setLayout({ left, top, width: w, arrowLeft });
    }, [maxWidthPx]);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }
        updateLayout();
        const onScrollOrResize = () => {
            updateLayout();
        };
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [open, updateLayout]);

    useEffect(() => () => {
        clearHideTimer();
    }, [clearHideTimer]);

    const tooltipNode =
        open && layout ? (
            <div
                id={tooltipId}
                role="tooltip"
                style={{
                    left: layout.left,
                    position: 'fixed',
                    top: layout.top,
                    transform: 'translateY(-100%)',
                    width: layout.width,
                    zIndex: 9999,
                }}
                className="pointer-events-auto relative max-h-[min(70vh,28rem)] scale-100 overflow-y-auto rounded-xl border border-emerald-500/40 bg-gradient-to-b from-slate-800/98 to-slate-950/98 px-3.5 py-3 text-left text-[11px] leading-relaxed text-slate-100 opacity-100 shadow-[0_12px_40px_-4px_rgba(0,0,0,0.65),0_0_0_1px_rgba(16,185,129,0.15)] ring-1 ring-white/10 backdrop-blur-md transition-opacity duration-150 ease-out"
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleClose}
            >
                <div className="text-slate-200">{children}</div>
                <span
                    className="absolute top-full -mt-px h-2.5 w-2.5 rotate-45 border border-emerald-500/40 border-t-0 border-l-0 bg-slate-950 shadow-sm"
                    style={{ left: layout.arrowLeft }}
                    aria-hidden
                />
            </div>
        ) : null;

    return (
        <div className="relative inline-flex shrink-0">
            <button
                ref={triggerRef}
                type="button"
                aria-describedby={open ? tooltipId : undefined}
                aria-expanded={open}
                aria-label={ariaLabel}
                className={`inline-flex ${triggerSizeClass} cursor-help items-center justify-center rounded-lg border border-emerald-500/35 text-emerald-400/90 transition-colors hover:border-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark`}
                onBlur={() => {
                    scheduleClose();
                }}
                onFocus={openTooltip}
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleClose}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 0" }}
                    aria-hidden
                >
                    help
                </span>
            </button>
            {typeof document !== 'undefined' && tooltipNode ? createPortal(tooltipNode, document.body) : null}
        </div>
    );
}
