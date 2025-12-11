import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StatusBar, View } from "react-native";

import StoreBookingContent from "../../components/store/storebooking";



export default function StoreDetail() {

    const { storeId, mode } = useLocalSearchParams<{ storeId: string; mode?: string }>();
    const isFreeBarber = mode === "free-barber";
    const isCustomer = mode == "customer"

    return (
        <View className="flex-1 bg-[#151618]">
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <StoreBookingContent storeId={storeId} isCustomer={isCustomer} isFreeBarber={isFreeBarber} isBottomSheet={false}></StoreBookingContent>
        </View>
    );
}
