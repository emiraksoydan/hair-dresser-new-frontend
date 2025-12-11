import { useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import { tokenStore } from '../lib/tokenStore';
import { JwtPayload, UserType } from '../types';

interface AuthResult {
    userType: UserType | null;
    userId: string | null;
    isAuthenticated: boolean;
    token: string | null;
}

/**
 * Custom hook for authentication state and user information
 * Centralizes JWT decoding logic to avoid code duplication
 */
export const useAuth = (): AuthResult => {
    const token = tokenStore.access;

    const userType = useMemo(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            const ut = decoded.userType?.toLowerCase();
            if (ut === 'customer') return UserType.Customer;
            if (ut === 'freebarber') return UserType.FreeBarber;
            if (ut === 'barberstore') return UserType.BarberStore;
            return null;
        } catch {
            return null;
        }
    }, [token]);

    const userId = useMemo(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            // Try multiple possible fields for userId
            return (decoded as any).sub || (decoded as any).userId || decoded.identifier || null;
        } catch {
            return null;
        }
    }, [token]);

    return {
        userType,
        userId,
        isAuthenticated: !!token,
        token,
    };
};

