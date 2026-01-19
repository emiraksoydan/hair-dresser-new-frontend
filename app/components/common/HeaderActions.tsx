import React from "react";
import { View } from "react-native";
import { BadgeIconButton } from "./badgeiconbutton";
import { HeaderDropdownMenu } from "./headerdropdownmenu";
import { useLanguage } from "../../hook/useLanguage";

interface HeaderActionsProps {
  unreadNoti: number;
  onNotificationPress: () => void;
  onInfoPress: () => void;
  onShoppingPress?: () => void;
}

/**
 * HeaderActions - Ortak header sağ taraf aksiyonları
 *
 * Tüm layout dosyalarında tekrar eden headerRight kodunu tek bir yerde toplar:
 * - Bildirim butonu (badge ile)
 * - Dropdown menü (info, shopping vb.)
 */
export const HeaderActions = React.memo<HeaderActionsProps>(({
  unreadNoti,
  onNotificationPress,
  onInfoPress,
  onShoppingPress,
}) => {
  const { t } = useLanguage();

  const menuItems = [
    {
      icon: "information-outline",
      label: t("navigation.info"),
      onPress: onInfoPress,
    },
    {
      icon: "shopping-outline",
      label: t("navigation.shopping"),
      onPress: onShoppingPress || (() => {}),
    },
  ];

  return (
    <View className="items-center justify-center flex-row mr-2">
      <BadgeIconButton
        icon="bell-outline"
        iconColor="white"
        size={20}
        badgeCount={unreadNoti}
        onPress={onNotificationPress}
        animateWhenActive={true}
      />
      <HeaderDropdownMenu items={menuItems} />
    </View>
  );
});

HeaderActions.displayName = "HeaderActions";
