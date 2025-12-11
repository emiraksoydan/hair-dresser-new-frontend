import React, { useState, useMemo, memo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Button } from 'react-native-paper';
import { SkeletonComponent } from './skeleton'; // Yolunu projene göre ayarla
import { LottieViewComponent } from './lottieview'; // Yolunu projene göre ayarla
import MotiViewExpand from './motiviewexpand'; // Yolunu projene göre ayarla
import { FreeBarberMineCardComp } from './freebarberminecard'; // Yolunu projene göre ayarla
import { useGetFreeBarberMinePanelQuery } from '../store/api'; // Store yolunu kontrol et
import { toggleExpand } from '../utils/common/expand-toggle';
import { resolveApiErrorMessage } from '../utils/common/error';
import { FreeBarberPanelDto } from '../types'; // Type yolunu kontrol et
import { useTrackFreeBarberLocation } from '../hook/useTrackFreeBarberLocation';

interface Props {
    isList: boolean;
    locationStatus: string;
    locationMessage: string | null;
    onOpenPanel: (id: string | null) => void;
    screenWidth: number;
    freeBarber?: FreeBarberPanelDto;
    isLoading: boolean;
    isError: boolean;
    error: any;
    isTracking: boolean;
    isUpdating: boolean;
}

// React.memo ile sarmaladık. Sadece props değişirse render olur.
export const FreeBarberPanelSection = memo(({ isList, locationStatus, locationMessage, onOpenPanel,
    screenWidth,
    freeBarber,
    isLoading,
    isError,
    error, isTracking, isUpdating }: Props) => {


    const [expandedMineStore, setExpandedMineStore] = useState(true);
    const hasMineFreeBarber = !isLoading && freeBarber?.fullName != null;
    const cardWidthFreeBarber = useMemo(
        () => (expandedMineStore ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedMineStore, screenWidth]
    );

    return (
        <>
            <View className="flex flex-row justify-between items-center mt-4">
                <View className='flex-row items-center gap-2'>
                    <Text className="font-ibm-plex-sans-regular text-xl text-white"> Panelim</Text>
                    {hasMineFreeBarber && isTracking && (
                        <View className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-yellow-400' : 'bg-green-500'}`} />
                    )}
                </View>

                {hasMineFreeBarber && (
                    <MotiViewExpand
                        expanded={expandedMineStore}
                        onPress={() => toggleExpand(expandedMineStore, setExpandedMineStore)}
                    />
                )}
            </View>
            {isLoading ? (
                <View className="flex-1 pt-4">
                    {Array.from({ length: 1 }).map((_, i) => (
                        <SkeletonComponent key={i} />
                    ))}
                </View>
            ) : !hasMineFreeBarber ? (
                <>
                    <LottieViewComponent message='Henüz eklediğiniz panel bulunmuyor.' />
                    <Button
                        style={{ marginTop: 10 }}
                        buttonColor='#c2a523'
                        mode='contained'
                        icon={'plus'}
                        onPress={() => onOpenPanel(null)}
                    >
                        Lütfen Panel Ekleyin
                    </Button>
                </>
            ) : locationStatus === 'error' ? (
                <LottieViewComponent animationSource={require('../../assets/animations/Location.json')} message={locationMessage!} />
            ) : isError ? (
                <LottieViewComponent animationSource={require('../../assets/animations/error.json')} message={resolveApiErrorMessage(error)} />
            ) : (

                <View key={freeBarber?.id}>
                    <FreeBarberMineCardComp
                        freeBarber={freeBarber as FreeBarberPanelDto}
                        isList={isList}
                        expanded={expandedMineStore}
                        cardWidthFreeBarber={cardWidthFreeBarber}
                        onPressUpdate={(barber) => onOpenPanel(barber.id)}
                    />
                </View>

            )}
        </>
    );
});