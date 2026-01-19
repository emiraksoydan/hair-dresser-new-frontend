import React, { useState, useMemo, useCallback } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { IconButton } from "react-native-paper";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "../common/Text";
import { BadgeIconButton } from "../common/badgeiconbutton";
import { HeaderActions } from "../common/HeaderActions";
import { HeaderDropdownMenu } from "../common/headerdropdownmenu";
import { NotificationsSheet } from "../appointment/notificationsheet";
import { InfoModal } from "../common/infomodal";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { useAuth } from "../../hook/useAuth";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { useNotificationSound } from "../../hook/useNotificationSound";
import { useLanguage } from "../../hook/useLanguage";
import {
  useGetBadgeCountsQuery,
  useGetHelpGuideByUserTypeQuery,
} from "../../store/api";
import { UserType } from "../../types";

export interface TabConfig {
  name: string;
  headerTitle: string;
  icon: string;
  iconFocused: string;
  label: string;
  showHeaderLeft?: boolean;
  headerTitleAlign?: "left" | "center";
}

export interface BaseTabLayoutProps {
  userType: UserType;
  accentColor: string;
  tabs: TabConfig[];
  children?: React.ReactNode;
  dropdownMenuItems?: Array<{
    icon: string;
    label: string;
    onPress: () => void;
  }>;
  renderAdditionalBottomSheets?: () => React.ReactNode;
}

export const BaseTabLayout: React.FC<BaseTabLayoutProps> = ({
  userType,
  accentColor,
  tabs,
  children,
  dropdownMenuItems,
  renderAdditionalBottomSheets,
}) => {
  const { t } = useLanguage();
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const dispatch = useAppDispatch();
  const { userName, isAuthenticated } = useAuth();

  // Bottom sheet hook
  const notificationsSheet = useBottomSheet({
    snapPoints: ["60%", "90%"],
    enablePanDownToClose: true,
    enableOverDrag: false,
  });

  // Badge count'ları API'den al (SignalR ile anlık güncellenir)
  const { data: badgeCounts } = useGetBadgeCountsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const unreadNoti = badgeCounts?.data?.notificationUnreadCount || 0;
  const unreadMsg = badgeCounts?.data?.chatUnreadCount || 0;

  // Play notification sound when badge count changes
  useNotificationSound(unreadNoti);

  // Help guide items - API'den dinamik olarak çek
  const { data: helpGuideResponse } = useGetHelpGuideByUserTypeQuery(
    userType,
    { skip: !isAuthenticated },
  );

  // API'den gelen veriyi InfoModal formatına dönüştür
  const infoItems = useMemo(() => {
    if (helpGuideResponse?.success && helpGuideResponse?.data?.length > 0) {
      return helpGuideResponse.data.map((guide) => ({
        title: guide.title,
        description: guide.description,
      }));
    }
    return [];
  }, [helpGuideResponse]);

  // Ortak header actions callbacks
  const handleNotificationPress = useCallback(() => {
    notificationsSheet.present();
  }, [notificationsSheet]);

  const handleInfoPress = useCallback(() => {
    setInfoModalVisible(true);
  }, []);

  // Header right component - dropdown veya basit actions
  const renderHeaderRight = useCallback(
    () => {
      if (dropdownMenuItems && dropdownMenuItems.length > 0) {
        return (
          <View className="flex-row items-center justify-center mr-2">
            <BadgeIconButton
              icon="bell-outline"
              iconColor="white"
              size={20}
              badgeCount={unreadNoti}
              onPress={handleNotificationPress}
              animateWhenActive={true}
            />
            <HeaderDropdownMenu items={dropdownMenuItems} />
          </View>
        );
      }

      return (
        <HeaderActions
          unreadNoti={unreadNoti}
          onNotificationPress={handleNotificationPress}
          onInfoPress={handleInfoPress}
        />
      );
    },
    [
      unreadNoti,
      dropdownMenuItems,
      handleNotificationPress,
      handleInfoPress,
    ],
  );

  // Tab icon renderer
  const renderTabIcon = useCallback(
    (iconName: string, focused: boolean, badgeCount?: number) => {
      if (badgeCount !== undefined) {
        return (
          <BadgeIconButton
            icon={iconName}
            iconColor={focused ? accentColor : "#38393b"}
            size={30}
            badgeCount={badgeCount}
            onPress={undefined}
          />
        );
      }

      return (
        <IconButton
          icon={iconName}
          iconColor={focused ? accentColor : "#38393b"}
          size={30}
          style={{ margin: 0 }}
        />
      );
    },
    [accentColor],
  );

  // Tab label renderer
  const renderTabLabel = useCallback(
    (label: string, focused: boolean) => (
      <Text
        className={`text-xs ${focused ? `text-[${accentColor}]` : "text-[#454648]"}`}
      >
        {label}
      </Text>
    ),
    [accentColor],
  );

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#191a1c",
            borderColor: "#191a1c",
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />

        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              headerStyle: { backgroundColor: "#151618" },
              headerShown: true,
              headerTitle: () => (
                <Text className="text-lg text-white mr-0">
                  {tab.showHeaderLeft && userName
                    ? t("navigation.welcomeWithName", { name: userName })
                    : tab.headerTitle}
                </Text>
              ),
              tabBarIcon: ({ focused }) => {
                // Messages tab özel durumu - badge count ile
                if (tab.name === "(messages)") {
                  return renderTabIcon(
                    focused ? tab.iconFocused : tab.icon,
                    focused,
                    unreadMsg,
                  );
                }

                return renderTabIcon(
                  focused ? tab.iconFocused : tab.icon,
                  focused,
                );
              },
              tabBarLabel: ({ focused }) => renderTabLabel(tab.label, focused),
              headerTitleAlign: tab.headerTitleAlign || "center",
              headerRight: renderHeaderRight,
            }}
          />
        ))}
      </Tabs>

      {/* Notifications Bottom Sheet */}
      <BottomSheetModal
        ref={notificationsSheet.ref}
        backdropComponent={notificationsSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: "#47494e" }}
        backgroundStyle={{ backgroundColor: "#151618" }}
        snapPoints={notificationsSheet.snapPoints}
        enableOverDrag={notificationsSheet.enableOverDrag}
        enablePanDownToClose={notificationsSheet.enablePanDownToClose}
        onChange={notificationsSheet.handleChange}
      >
        <NotificationsSheet
          onClose={() => notificationsSheet.dismiss()}
          autoOpenFirstUnread={true}
          onDeleteSuccess={(message) =>
            dispatch(showSnack({ message, isError: false }))
          }
          onDeleteInfo={(message) =>
            dispatch(showSnack({ message, isError: true }))
          }
          onDeleteError={(message) =>
            dispatch(showSnack({ message, isError: true }))
          }
        />
      </BottomSheetModal>

      {/* Info Modal */}
      <InfoModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
        title={t("navigation.usageInfo")}
        items={infoItems}
      />

      {/* Additional Bottom Sheets */}
      {renderAdditionalBottomSheets?.()}

      {/* Additional children */}
      {children}
    </>
  );
};
