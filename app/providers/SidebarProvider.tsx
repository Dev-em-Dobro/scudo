'use client';

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

type SidebarContextValue = {
    isCollapsed: boolean;
    toggleSidebar: () => void;
};

const SIDEBAR_STORAGE_KEY = 'scudo.sidebar.collapsed';

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (globalThis.window === undefined) {
            return false;
        }

        try {
            const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            return stored === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
        } catch {
            // noop
        }
    }, [isCollapsed]);

    const value = useMemo(
        () => ({
            isCollapsed,
            toggleSidebar: () => setIsCollapsed((current) => !current),
        }),
        [isCollapsed],
    );

    return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar deve ser usado dentro de SidebarProvider.');
    }

    return context;
}
