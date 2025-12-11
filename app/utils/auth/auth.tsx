import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '../types';



export function getUserTypeFromToken(token: string): string | null {
    try {
        const d = jwtDecode<JwtPayload>(token);
        return d.userType ?? null;
    } catch { return null; }
}
