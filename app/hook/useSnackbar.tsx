import React, { useState, useRef, useCallback } from 'react';
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
  const queueRef = useRef<Array<{ message: string; isError: boolean }>>([]);
  const isProcessingRef = useRef(false);
  const snackVisibleRef = useRef(false);

  // snackVisible state'ini ref ile senkronize et
  React.useEffect(() => {
    snackVisibleRef.current = snackVisible;
  }, [snackVisible]);

  const processQueue = React.useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    const next = queueRef.current.shift();
    if (!next) {
      isProcessingRef.current = false;
      return;
    }

    // Eğer snackbar görünürse, önce kapat ve kuyruğa ekle
    if (snackVisibleRef.current) {
      setSnackVisible(false);
      // Kısa bir gecikme sonrası yeni mesajı göster
      timeoutRef.current = setTimeout(() => {
        setSnackText(next.message);
        setSnackIsError(next.isError);
        setSnackVisible(true);
        isProcessingRef.current = false;
        // Kuyrukta daha fazla mesaj varsa, bu mesaj kapandığında işle
        const nextTimeout = setTimeout(() => {
          if (queueRef.current.length > 0) {
            processQueue();
          }
        }, 3000); // Snackbar duration
        timeoutRef.current = nextTimeout;
      }, 300); // Kapanma animasyonu için bekle
    } else {
      setSnackText(next.message);
      setSnackIsError(next.isError);
      setSnackVisible(true);
      isProcessingRef.current = false;
      // Kuyrukta daha fazla mesaj varsa, bu mesaj kapandığında işle
      const nextTimeout = setTimeout(() => {
        if (queueRef.current.length > 0) {
          processQueue();
        }
      }, 3000); // Snackbar duration
      timeoutRef.current = nextTimeout;
    }
  }, []);

  const showSnack = React.useCallback((message: string, isError: boolean = false) => {
    // Önceki timeout'u temizle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Kuyruğa ekle
    queueRef.current.push({ message, isError });
    
    // Kuyruğu işle
    processQueue();
  }, [processQueue]);

  const hideSnack = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSnackVisible(false);
    isProcessingRef.current = false;
    // Kuyrukta daha fazla mesaj varsa, işle
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        processQueue();
      }
    }, 100);
  }, [processQueue]);

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

