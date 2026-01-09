import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode';
import { tokenStore } from '../lib/tokenStore';
import { JwtPayload, UserType } from '../types';
import { API_CONFIG } from '../constants/api';

const BACKGROUND_LOCATION_TASK = 'background-location-update';

// Expo Go background location'ı desteklemez
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

interface LocationData {
  locations: Location.LocationObject[];
}

// Background location task handler - sadece development/production build'de çalışır
const defineBackgroundLocationTask = () => {
  if (IS_EXPO_GO) {
    console.log('Background location task is not available in Expo Go');
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    if (data) {
      const { locations } = data as LocationData;

      if (locations && locations.length > 0) {
        const location = locations[locations.length - 1];
        const { latitude, longitude } = location.coords;

        // Token'dan user bilgilerini al
        const token = tokenStore.access;
        if (!token) return;

        try {
          const decoded = jwtDecode<JwtPayload>(token);
          const ut = decoded.userType?.toLowerCase();
          const userType = ut === 'freebarber' ? UserType.FreeBarber : null;
          const userId = decoded.identifier || (decoded as any).sub || (decoded as any).userId;

          // Sadece free barber ise konumu güncelle
          if (userType === UserType.FreeBarber && userId) {
            try {
              // API'ye konum güncellemesi gönder
              const response = await fetch(`${API_CONFIG.BASE_URL}/freebarber/update-location`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  id: userId,
                  latitude,
                  longitude,
                }),
              });

              if (!response.ok) {
                console.error('Background location update failed:', response.statusText);
              }
            } catch (error) {
              console.error('Background location update error:', error);
            }
          }
        } catch (error) {
          console.error('Token decode error in background task:', error);
        }
      }
    }
  });
};

// Task'ı tanımla
defineBackgroundLocationTask();

export { BACKGROUND_LOCATION_TASK };
