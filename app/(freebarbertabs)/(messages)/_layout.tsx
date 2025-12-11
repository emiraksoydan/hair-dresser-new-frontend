import { Stack } from 'expo-router'

const Layout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#151618' },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="[id]" />
        </Stack>
    )
}

export default Layout

