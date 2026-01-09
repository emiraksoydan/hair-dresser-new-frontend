import { Alert, FlatList, ScrollView, TouchableOpacity, View, StatusBar, Image } from 'react-native'
import { Text } from '../../components/common/Text'
import React, { useCallback, useMemo, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetFreeBarberForUsersQuery } from '../../store/api';
import { Icon } from 'react-native-paper';
import FilterChip from '../../components/common/filter-chip';
import { getBarberTypeName } from '../../utils/store/barber-type';
import FreeBarberBookingContent from '../../components/freebarber/freebarberbooking';

const FreeBarberDetail = () => {

    const router = useRouter();
    const { freeBarberId, freeBarber, mode, appointmentId } = useLocalSearchParams<{
        freeBarberId?: string;
        freeBarber?: string;
        mode?: string;
        appointmentId?: string;
    }>();
    const frbId = (freeBarberId ?? freeBarber ?? "").toString();
    const bookingMode = mode === "add-store" ? "add-store" : undefined;

    return (
        <View className="flex-1 bg-[#151618]">
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <FreeBarberBookingContent
                barberId={frbId}
                isBottomSheet={false}
                mode={bookingMode}
                appointmentId={appointmentId}
            />
            <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-10 left-5 z-20 rounded-full p-3"
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            >
                <Icon source="chevron-left" size={25} color="white" />
            </TouchableOpacity>
        </View>
    );
}

export default FreeBarberDetail

