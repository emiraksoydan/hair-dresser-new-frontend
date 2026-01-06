import React, { useState, useRef } from 'react';
import { Portal, Snackbar } from 'react-native-paper';

export interface UseSnackbarReturn {
  snackVisible: boolean;
  snackText: string;
  snackIsError: boolean;
  showSnack: (message: string, isError?: boolean) => void;
  hideSnack: () => void;
  SnackbarComponent: React.FC;
}

/**
 * Custom hook for managing snackbar notifications
 * @returns Object with snackbar state and control functions
 */
export const useSnackbar = (): UseSnackbarReturn => {
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackText, setSnackText] = useState('');
  const [snackIsError, setSnackIsError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showSnack = React.useCallback((message: string, isError: boolean = false) => {
    // Önceki timeout'u temizle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Eğer snackbar zaten görünürse, önce kapat
    if (snackVisible) {
      setSnackVisible(false);
      // Kısa bir gecikme sonrası yeni mesajı göster
      timeoutRef.current = setTimeout(() => {
        setSnackText(message);
        setSnackIsError(isError);
        setSnackVisible(true);
      }, 100);
    } else {
      setSnackText(message);
      setSnackIsError(isError);
      setSnackVisible(true);
    }
  }, [snackVisible]);

  const hideSnack = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSnackVisible(false);
  }, []);

  const SnackbarComponent: React.FC = () => (
    <Portal>
      <Snackbar
        style={{ backgroundColor: snackIsError ? '#b91c1c' : '#15803d' }}
        visible={snackVisible}
        onDismiss={hideSnack}
        duration={3000}
        action={{ 
          label: snackIsError ? 'Kapat' : 'Tamam', 
          onPress: hideSnack, 
          textColor: 'white' 
        }}
      >
        {snackText}
      </Snackbar>
    </Portal>
  );

  return {
    snackVisible,
    snackText,
    snackIsError,
    showSnack,
    hideSnack,
    SnackbarComponent,
  };
};

