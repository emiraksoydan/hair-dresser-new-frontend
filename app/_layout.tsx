
import 'react-native-reanimated';
import { StatusBar, StyleSheet, View } from 'react-native'
import { Text } from './components/common/Text'
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react'
import { useFonts } from 'expo-font';
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
import { clearStoredTokens } from './lib/tokenStorage';
import { tokenStore } from './lib/tokenStore';
import { useSignalR } from './hook/useSignalR';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useFcmToken } from './hook/useFcmToken';
import { GlobalSnackbar } from './hook/useSnackbar';
// Background location task'ı kaydet (Expo Go'da çalışmaz)
import './tasks/backgroundLocation';


SplashScreen.preventAutoHideAsync();
const RootLayout = () => {
  const [ready, setReady] = useState(false);

  // Fontları yükle
  const [fontsLoaded] = useFonts({
    'CenturyGothic': require('../assets/fonts/centurygothic.ttf'),
    'CenturyGothic-Bold': require('../assets/fonts/centurygothic_bold.ttf'),
  });

  useEffect(() => {
    (async () => {
      try {
        await rehydrateTokens();
      } catch {
        // Ignore token errors
      }

      // Fontlar yüklendikten sonra hazır ol
      if (fontsLoaded) {
        setReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch {
          // Ignore splash screen errors
        }
      }
    })();
  }, [fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <GestureHandlerRootView className="flex flex-1">
          <PaperProvider>
            <BottomSheetModalProvider>
              <SignalRBootstrap />
              <FcmTokenBootstrap />
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
              <GlobalSnackbar />
            </BottomSheetModalProvider>
          </PaperProvider>
        </GestureHandlerRootView>
      </ReduxProvider>
    </ErrorBoundary>
  )
}

function SignalRBootstrap() {
  useSignalR();
  return null;
}

function FcmTokenBootstrap() {
  useFcmToken();
  return null;
}

export default RootLayout

