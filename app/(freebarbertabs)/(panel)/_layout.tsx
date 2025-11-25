import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const FreeBarberLayout = () => {
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

export default FreeBarberLayout

