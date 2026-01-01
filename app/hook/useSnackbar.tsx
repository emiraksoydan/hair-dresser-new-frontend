import React, { useState } from 'react';
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

  const showSnack = React.useCallback((message: string, isError: boolean = false) => {
    setSnackText(message);
    setSnackIsError(isError);
    setSnackVisible(true);
  }, []);

  const hideSnack = React.useCallback(() => {
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

