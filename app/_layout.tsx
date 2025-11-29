
import 'react-native-reanimated';
import { StatusBar, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react'
import '../global.css';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from "react-native-paper";
import { store } from './store/redux-store';
import * as SplashScreen from 'expo-splash-screen';
import { rehydrateTokens } from './store/baseQuery';
import { Stack, Tabs, Link } from 'expo-router';
import {
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { BottomSheetRegistryProvider } from './context/bottomsheet';
import { clearStoredTokens } from './lib/tokenStorage';
import { tokenStore } from './lib/tokenStore';


SplashScreen.preventAutoHideAsync();
const RootLayout = () => {
  // clearStoredTokens();
  // tokenStore.clear();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      await rehydrateTokens();
      setReady(true);
      SplashScreen.hideAsync();
    })();
  }, []);
  if (!ready) return null;

  return (
    <ReduxProvider store={store}>
      <GestureHandlerRootView className="flex flex-1">
        <PaperProvider>
          <BottomSheetRegistryProvider>
            <BottomSheetModalProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#151618' },
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(barberstoretabs)" />
                <Stack.Screen name="(freebarbertabs)" />
                <Stack.Screen name="(customertabs)" />
                <Stack.Screen name="(screens)" />
              </Stack>
              <StatusBar />
            </BottomSheetModalProvider>
          </BottomSheetRegistryProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </ReduxProvider>

  )
}

export default RootLayout

