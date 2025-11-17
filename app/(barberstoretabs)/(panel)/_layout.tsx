import { Stack } from 'expo-router'

const StorePanelLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#151618' },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="details" />
        </Stack>
    )
}

export default StorePanelLayout

