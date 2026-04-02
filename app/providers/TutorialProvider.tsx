'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const DISMISSED_KEY = 'scudo_tutorial_dismissed';

type TutorialContextValue = {
    isOpen: boolean;
    openTutorial: () => void;
    closeTutorial: () => void;
    dismiss: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(DISMISSED_KEY) === 'true';

        if (!dismissed) {
            setIsOpen(true);
        }
    }, []);

    function openTutorial() {
        setIsOpen(true);
    }

    function closeTutorial() {
        setIsOpen(false);
    }

    function dismiss() {
        localStorage.setItem(DISMISSED_KEY, 'true');
        setIsOpen(false);
    }

    return (
        <TutorialContext.Provider value={{ isOpen, openTutorial, closeTutorial, dismiss }}>
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
