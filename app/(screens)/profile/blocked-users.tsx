import React from "react";
import { View, ActivityIndicator, Switch, Image, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Text } from "../../components/common/Text";
import { Icon } from "react-native-paper";
import { useGetMyBlockedUsersQuery, useUnblockUserMutation } from "../../store/api";
import { BlockedGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { LottieViewComponent } from "../../components/common/lottieview";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BlockedUsersPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { showSuccess, showError } = useAlert();

    const { data: blockedUsers, isLoading, refetch, isFetching } = useGetMyBlockedUsersQuery();
    const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();

    const safeBlockedUsers = Array.isArray(blockedUsers) ? blockedUsers : [];

    const formatDateTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${day}.${month}.${year}`;
        } catch {
            return dateStr;
        }
    };

    const getUserTypeName = (userType?: UserType | null) => {
        switch (userType) {
            case UserType.Customer:
                return t("common.customer");
            case UserType.FreeBarber:
                return t("common.freeBarber");
            case UserType.BarberStore:
                return t("common.barberStore");
            default:
                return "";
        }
    };

    const handleUnblock = async (blockedToUserId: string) => {
        try {
            await unblockUser({ blockedToUserId }).unwrap();
            showSuccess(t("profile.unblockSuccess"));
            refetch();
        } catch (error: any) {
            showError(error?.data?.message || t("profile.unblockError"));
        }
    };

    const renderBlockedItem = ({ item }: { item: BlockedGetDto }) => {
        const displayName = item.targetUserName || "Bilinmeyen Kullanıcı";
        const imageUrl = item.targetUserImage;
        const userTypeName = getUserTypeName(item.targetUserType);

        return (
            <View className="mb-3 flex-row items-center rounded-xl bg-[#1e2024] p-4">
                <View className="relative mr-3">
                    <Image
                        source={imageUrl ? { uri: imageUrl } : { uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxxOeOXHNrUgfxDbpJZJCxcDOjTlrBRlH7wA&s' }}
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                        resizeMode="cover"
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-semibold text-white">{displayName}</Text>
                    {userTypeName ? (
                        <Text className="text-xs text-gray-400">{userTypeName}</Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
                </View>
                <Switch
                    value={true}
                    onValueChange={() => handleUnblock(item.blockedToUserId)}
                    trackColor={{ false: "#767577", true: "#f05e23" }}
                    thumbColor="#fff"
                    disabled={isUnblocking}
                />
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#151618]" edges={["top"]}>
            <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon source="chevron-left" size={28} color="white" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-white ml-2">
                    {t("profile.blockedUsers")}
                </Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffb900" />
                </View>
            ) : (
                <FlatList
                    data={safeBlockedUsers}
                    keyExtractor={(item: BlockedGetDto) => item.id}
                    renderItem={renderBlockedItem}
                    contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching && !isLoading}
                            onRefresh={refetch}
                            tintColor="#ffb900"
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-4 pt-12">
                            <LottieViewComponent
                                animationSource={require("../../../assets/animations/empty.json")}
                                message={t("profile.blockedEmpty")}
                                animationSize={120}
                            />
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
