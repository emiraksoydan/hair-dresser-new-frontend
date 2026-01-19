import React from "react";
import { BaseTabLayout, TabConfig } from "../components/layout/BaseTabLayout";
import { UserType } from "../types";
import { useLanguage } from "../hook/useLanguage";

const CustomerLayout = () => {
  const { t } = useLanguage();

  const tabs: TabConfig[] = [
    {
      name: "(panel)",
      headerTitle: t("navigation.welcome"),
      icon: "home-outline",
      iconFocused: "home",
      label: t("navigation.shops"),
      showHeaderLeft: true,
      headerTitleAlign: "left",
    },
    {
      name: "(appointment)",
      headerTitle: t("navigation.myAppointments"),
      icon: "clock-outline",
      iconFocused: "clock",
      label: t("navigation.appointments"),
    },
    {
      name: "(messages)",
      headerTitle: t("navigation.myMessages"),
      icon: "message-outline",
      iconFocused: "message",
      label: t("navigation.messages"),
    },
    {
      name: "(favorites)",
      headerTitle: t("navigation.myFavorites"),
      icon: "heart-outline",
      iconFocused: "heart",
      label: t("navigation.favorites"),
    },
    {
      name: "(profile)",
      headerTitle: t("profile.myProfile"),
      icon: "account-outline",
      iconFocused: "account",
      label: t("navigation.profile"),
    },
  ];

  return (
    <BaseTabLayout
      userType={UserType.Customer}
      accentColor="#c2a523"
      tabs={tabs}
    />
  );
};

export default CustomerLayout;
