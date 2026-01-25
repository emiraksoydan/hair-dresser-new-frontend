import { Stack } from 'expo-router'

const Layout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0d0d12' },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen
                name="[id]"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                }}
            />
        </Stack>
    )
}

export default Layout

