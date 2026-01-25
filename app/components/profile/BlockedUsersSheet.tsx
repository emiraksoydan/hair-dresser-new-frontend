import React from "react";
import { View, ActivityIndicator, Switch, Image } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useGetMyBlockedUsersQuery, useUnblockUserMutation } from "../../store/api";
import { BlockedGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import LottieView from "lottie-react-native";

type BlockedUsersSheetProps = {
  onClose: () => void;
};

export const BlockedUsersSheet: React.FC<BlockedUsersSheetProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();

  const { data: blockedUsers, isLoading, refetch } = useGetMyBlockedUsersQuery();
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
          <Text className="text-base font-semibold text-white">{displayName}</Text>
          {userTypeName ? (
            <Text className="text-xs text-gray-400">{userTypeName}</Text>
          ) : null}
          <Text className="mt-1 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
        </View>

        {/* Engeli kaldır switch */}
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

  if (isLoading) {
    return (
      <BottomSheetView className="flex-1 items-center justify-center bg-[#151618] p-4">
        <ActivityIndicator size="large" color="#f05e23" />
      </BottomSheetView>
    );
  }

  return (
    <BottomSheetView className="flex-1 bg-[#151618]">
      {/* Header */}
      <View className="border-b border-gray-800 px-4 pb-3">
        <Text className="text-center text-lg font-bold text-white">
          {t("profile.blockedUsers")}
        </Text>
      </View>

      {safeBlockedUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <LottieView
            source={require("../../../assets/animations/empty.json")}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
          <Text className="mt-4 text-center text-gray-400">
            {t("profile.blockedEmpty")}
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={safeBlockedUsers}
          keyExtractor={(item: BlockedGetDto) => item.id}
          renderItem={renderBlockedItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheetView>
  );
};
