export function pathByUserType(userType?: string | null) {
    switch (userType) {
        case 'Customer': return '/(customertabs)';
        case 'FreeBarber': return '/(freebarbertabs)';
        case 'BarberStore': return '/(barberstoretabs)';
        default: return '/(auth)';
    }
}
