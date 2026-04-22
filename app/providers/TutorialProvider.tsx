'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const DISMISSED_KEY = 'scudo_tutorial_dismissed';
const STREAK_ANNOUNCEMENT_DISMISSED_KEY = 'scudo_daily_streak_announcement_dismissed';

function parseBooleanFlag(value: string | undefined) {
    if (!value) {
        return false;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function isDailyStreakAnnouncementEnabled() {
    const rawValue = process.env.NEXT_PUBLIC_ENABLE_DAILY_STREAK_ANNOUNCEMENT;

    if (rawValue === undefined) {
        return true;
    }

    return parseBooleanFlag(rawValue);
}

type TutorialContextValue = {
    isOpen: boolean;
    isStreakAnnouncementOpen: boolean;
    openTutorial: () => void;
    closeTutorial: () => void;
    dismiss: () => void;
    dismissStreakAnnouncement: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [isOpen, setIsOpen] = useState(false);
    const [isStreakAnnouncementOpen, setIsStreakAnnouncementOpen] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
        const streakAnnouncementDismissed =
            localStorage.getItem(STREAK_ANNOUNCEMENT_DISMISSED_KEY) === 'true';

        let frameId: number | undefined;

        if (!dismissed) {
            frameId = globalThis.window.requestAnimationFrame(() => {
                setIsOpen(true);
            });
        } else if (isDailyStreakAnnouncementEnabled() && !streakAnnouncementDismissed) {
            frameId = globalThis.window.requestAnimationFrame(() => {
                setIsStreakAnnouncementOpen(true);
            });
        }

        return () => {
            if (frameId !== undefined) {
                globalThis.window.cancelAnimationFrame(frameId);
            }
        };
    }, []);

    const openStreakAnnouncementIfNeeded = useCallback(() => {
        if (!isDailyStreakAnnouncementEnabled()) {
            return;
        }

        const streakAnnouncementDismissed =
            localStorage.getItem(STREAK_ANNOUNCEMENT_DISMISSED_KEY) === 'true';

        if (!streakAnnouncementDismissed) {
            setIsStreakAnnouncementOpen(true);
        }
    }, []);

    const openTutorial = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeTutorial = useCallback(() => {
        setIsOpen(false);
        openStreakAnnouncementIfNeeded();
    }, [openStreakAnnouncementIfNeeded]);

    const dismiss = useCallback(() => {
        localStorage.setItem(DISMISSED_KEY, 'true');
        setIsOpen(false);
        openStreakAnnouncementIfNeeded();
    }, [openStreakAnnouncementIfNeeded]);

    const dismissStreakAnnouncement = useCallback(() => {
        localStorage.setItem(STREAK_ANNOUNCEMENT_DISMISSED_KEY, 'true');
        setIsStreakAnnouncementOpen(false);
    }, []);

    const contextValue = useMemo(
        () => ({
            isOpen,
            isStreakAnnouncementOpen,
            openTutorial,
            closeTutorial,
            dismiss,
            dismissStreakAnnouncement,
        }),
        [isOpen, isStreakAnnouncementOpen, openTutorial, closeTutorial, dismiss, dismissStreakAnnouncement],
    );

    return (
        <TutorialContext.Provider value={contextValue}>
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const context = useContext(TutorialContext);

    if (!context) {
        throw new Error('useTutorial deve ser usado dentro de TutorialProvider.');
    }

    return context;
}
