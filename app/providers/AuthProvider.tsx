"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { authClient } from "@/app/lib/auth-client";
import { mockUserProfile } from "@/app/lib/mockData";
import type { UserProfile } from "@/app/types";

type AuthSessionUser = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
};

type AuthSessionState = {
    user?: AuthSessionUser;
} | null;

type AuthContextValue = {
    user: UserProfile;
    isAuthenticated: boolean;
    isPending: boolean;
    refreshProfile: () => Promise<void>;
};

type ApiProfileResponse = {
    profile: {
        isOfficialStudent: boolean;
        fullName: string | null;
        linkedinUrl: string | null;
        githubUrl: string | null;
        city: string | null;
        professionalSummary: string | null;
        experiences: string[];
        knownTechnologies: string[];
        softSkills: string[];
        projects: UserProfile["projects"];
        certifications: string[];
        languages: string[];
        resumeSyncStatus: UserProfile["resumeSyncStatus"];
        resumeFileName: UserProfile["resumeFileName"];
        resumeUploadedAt: UserProfile["resumeUploadedAt"];
    };
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
    children,
    initialSession,
}: Readonly<{ children: React.ReactNode; initialSession?: AuthSessionState }>) {
    const hasInitialSession = initialSession !== undefined;
    const [session, setSession] = useState<AuthSessionState>(initialSession ?? null);
    const [isSessionPending, setIsSessionPending] = useState(!hasInitialSession);
    const [profileData, setProfileData] = useState<ApiProfileResponse["profile"] | null>(null);
    const [isProfilePending, setIsProfilePending] = useState(false);

    useEffect(() => {
        let isActive = true;

        async function loadSession() {
            if (!hasInitialSession) {
                setIsSessionPending(true);
            }

            try {
                const result = await authClient.getSession();
                if (!isActive) {
                    return;
                }
                setSession(result.data ?? null);
            } catch {
                if (!isActive) {
                    return;
                }

                // Keep current authenticated session on transient failures.
                setSession((previous) => (previous?.user ? previous : null));
            } finally {
                if (isActive) {
                    setIsSessionPending(false);
                }
            }
        }

        void loadSession();

        return () => {
            isActive = false;
        };
    }, [hasInitialSession]);

    const refreshProfile = useCallback(async () => {
        if (!session?.user) {
            setProfileData(null);
            return;
        }

        setIsProfilePending(true);
        try {
            const response = await fetch("/api/profile", {
                method: "GET",
                cache: "no-store",
                credentials: "include",
            });

            if (!response.ok) {
                setProfileData(null);
                return;
            }

            const payload = (await response.json()) as ApiProfileResponse;
            setProfileData(payload.profile);
        } finally {
            setIsProfilePending(false);
        }
    }, [session?.user]);

    useEffect(() => {
        void refreshProfile();
    }, [refreshProfile]);

    const value = useMemo<AuthContextValue>(() => {
        const guestUser: UserProfile = {
            ...mockUserProfile,
            name: "Visitante",
            email: "",
            role: "Faça login para sincronizar seu perfil",
            isOfficialStudent: false,
            knownTechnologies: [],
            projects: [],
            experiences: [],
            certifications: [],
            languages: [],
            softSkills: [],
            resumeSyncStatus: "not_uploaded",
            resumeFileName: null,
            resumeUploadedAt: null,
        };

        const baseUser: UserProfile = {
            ...mockUserProfile,
            name: session?.user?.name || session?.user?.email || mockUserProfile.name,
            email: session?.user?.email ?? "",
            avatar: session?.user?.image ?? undefined,
            role: session?.user?.email || mockUserProfile.role,
            isOfficialStudent: false,
            knownTechnologies: [],
            projects: [],
            experiences: [],
            certifications: [],
            languages: [],
            softSkills: [],
            level: 0,
            levelName: '',
            levelProgress: 0,
            xp: 0,
            linkedinUrl: null,
            githubUrl: null,
            city: null,
            professionalSummary: null,
            resumeSyncStatus: 'not_uploaded',
            resumeFileName: null,
            resumeUploadedAt: null,
        };

        const mergedUser: UserProfile = profileData
            ? {
                ...baseUser,
                isOfficialStudent: profileData.isOfficialStudent,
                name: profileData.fullName ?? baseUser.name,
                linkedinUrl: profileData.linkedinUrl,
                githubUrl: profileData.githubUrl,
                city: profileData.city,
                professionalSummary: profileData.professionalSummary,
                experiences: profileData.experiences,
                knownTechnologies: profileData.knownTechnologies,
                softSkills: profileData.softSkills,
                projects: profileData.projects,
                certifications: profileData.certifications,
                languages: profileData.languages,
                resumeSyncStatus: profileData.resumeSyncStatus,
                resumeFileName: profileData.resumeFileName,
                resumeUploadedAt: profileData.resumeUploadedAt,
            }
            : baseUser;

        if (session?.user) {
            return {
                user: mergedUser,
                isAuthenticated: true,
                isPending: isSessionPending || isProfilePending,
                refreshProfile,
            };
        }

        return {
            user: guestUser,
            isAuthenticated: false,
            isPending: isSessionPending,
            refreshProfile,
        };
    }, [isSessionPending, isProfilePending, profileData, refreshProfile, session?.user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth deve ser usado dentro de AuthProvider.");
    }

    return context;
}
