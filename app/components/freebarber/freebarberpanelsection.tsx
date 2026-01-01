import React, { useState, useMemo, memo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Button } from 'react-native-paper';
import { SkeletonComponent } from '../common/skeleton';
import { LottieViewComponent } from '../common/lottieview';
import MotiViewExpand from '../common/motiviewexpand';
import { FreeBarberMineCardComp } from './freebarberminecard';
import { useGetFreeBarberMinePanelQuery } from '../../store/api';
import { toggleExpand } from '../../utils/common/expand-toggle';
import { resolveApiErrorMessage } from '../../utils/common/error';
import { FreeBarberPanelDto } from '../../types';
import { useTrackFreeBarberLocation } from '../../hook/useTrackFreeBarberLocation';
import { shouldShowFreeBarberPanel } from '../../utils/filter/panel-filters';
import type { AppliedFilters } from '../../utils/filter/panel-filters';

interface Props {
    isList: boolean;
    locationStatus: string;
    locationMessage: string | null;
    onOpenPanel: (id: string | null) => void;
    onPressRatings?: (freeBarberId: string, freeBarberName: string) => void;
    screenWidth: number;
    freeBarber?: FreeBarberPanelDto;
    isLoading: boolean;
    isError: boolean;
    error: any;
    isTracking: boolean;
    isUpdating: boolean;
    searchQuery?: string;
    appliedFilters?: AppliedFilters;
    categoryNameById?: Map<string, string>;
}

// React.memo ile sarmaladık. Sadece props değişirse render olur.
export const FreeBarberPanelSection = memo(({ isList, locationStatus, locationMessage, onOpenPanel, onPressRatings,
    screenWidth,
    freeBarber,
    isLoading,
    isError,
    error, isTracking, isUpdating, searchQuery = '', appliedFilters, categoryNameById }: Props) => {


    const [expandedMineStore, setExpandedMineStore] = useState(true);
    const hasMineFreeBarber = !isLoading && freeBarber?.fullName != null;
    const cardWidthFreeBarber = useMemo(
        () => (expandedMineStore ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedMineStore, screenWidth]
    );

    // Filtre kontrolü - freeBarber paneli filtrelere uyuyor mu?
    const shouldShow = useMemo(() => {
        if (!appliedFilters || !categoryNameById) return true;
        return shouldShowFreeBarberPanel(freeBarber, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById
        });
    }, [freeBarber, searchQuery, appliedFilters, categoryNameById]);

    // Filtre sonucu gösterilmemeli ise null dön
    if (hasMineFreeBarber && !shouldShow) {
        return null;
    }

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
                <LottieViewComponent animationSource={require('../../../assets/animations/Location.json')} message={locationMessage!} />
            ) : isError ? (
                <LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(error)} />
            ) : (

                <View key={freeBarber?.id}>
                    <FreeBarberMineCardComp
                        freeBarber={freeBarber as FreeBarberPanelDto}
                        isList={isList}
                        expanded={expandedMineStore}
                        cardWidthFreeBarber={cardWidthFreeBarber}
                        onPressUpdate={(barber) => onOpenPanel(barber.id)}
                        onPressRatings={onPressRatings}
                    />
                </View>

            )}
        </>
    );
});