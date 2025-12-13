import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '../../types';



export function getUserTypeFromToken(token: string): string | null {
    try {
        const d = jwtDecode<JwtPayload>(token);

        // userType'ı farklı şekillerde deneyelim (JWT claim'ler bazen farklı case'de olabilir)
        const userType = (d as any).userType
            || (d as any).UserType
            || (d as any)['userType']
            || (d as any)['UserType']
            || d.userType;

        return userType ?? null;
    } catch (error) {
        return null;
    }
}
