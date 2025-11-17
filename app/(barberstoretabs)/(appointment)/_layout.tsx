import { Stack } from 'expo-router'

const AppointmentLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#151618' },
        }}>
            <Stack.Screen name="index" />
        </Stack>
    )
}

export default AppointmentLayout
