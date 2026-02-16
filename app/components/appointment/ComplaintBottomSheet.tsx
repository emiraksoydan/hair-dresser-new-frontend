import React, { useState } from "react";
import { View, Image, TextInput } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Button } from "../common/Button";
import { useCreateComplaintMutation } from "../../store/api";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";

type ComplaintBottomSheetProps = {
  appointmentId: string;
  targetUserId: string;
  targetName: string;
  targetImage?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export const ComplaintBottomSheet: React.FC<ComplaintBottomSheetProps> = ({
  appointmentId,
  targetUserId,
  targetName,
  targetImage,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();
  const [reason, setReason] = useState("");
  const [createComplaint, { isLoading }] = useCreateComplaintMutation();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      showError(t("complaint.reasonRequired"));
      return;
    }

    try {
      await createComplaint({
        complaintToUserId: targetUserId,
        appointmentId: appointmentId,
        complaintReason: reason.trim(),
      }).unwrap();

      showSuccess(t("complaint.createSuccess"));
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showError(error?.data?.message || t("complaint.createError"));
    }
  };

  return (
    <BottomSheetScrollView className="flex-1 bg-[#151618]">
      {/* Header */}
      <View className="border-b border-gray-800 px-4 pb-3">
        <Text className="text-center text-lg font-bold text-white">
          {t("complaint.title")}
        </Text>
      </View>

      <View className="px-4 py-4">
        {/* Target User Info */}
        <View className="flex-row items-center mb-4 bg-[#1e2024] rounded-xl p-3">
          <Image
            source={
              targetImage
                ? { uri: targetImage }
                : {
                    uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxxOeOXHNrUgfxDbpJZJCxcDOjTlrBRlH7wA&s",
                  }
            }
            style={{ width: 48, height: 48, borderRadius: 24 }}
            resizeMode="cover"
          />
          <View className="ml-3 flex-1">
            <Text className="text-gray-400 text-xs">{t("complaint.complainingAbout")}</Text>
            <Text className="text-white text-base font-semibold">{targetName}</Text>
          </View>
        </View>

        {/* Reason Input */}
        <View className="mb-4">
          <Text className="text-white text-sm font-semibold mb-2">
            {t("complaint.reason")} *
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t("complaint.reasonPlaceholder")}
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={4}
            className="bg-[#1e2024] border border-gray-700 rounded-xl p-3 text-white text-sm"
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
        </View>

        {/* Submit Button */}
        <Button
          onPress={handleSubmit}
          disabled={isLoading || !reason.trim()}
          buttonColor="#dc2626"
          textColor="#ffffff"
          icon="alert-circle-outline"
          loading={isLoading}
        >
          {t("complaint.submit")}
        </Button>
      </View>
    </BottomSheetScrollView>
  );
};
