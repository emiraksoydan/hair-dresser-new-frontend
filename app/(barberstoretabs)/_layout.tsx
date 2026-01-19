import React, { useMemo } from "react";
import { View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { BaseTabLayout, TabConfig } from "../components/layout/BaseTabLayout";
import { UserType } from "../types";
import { useLanguage } from "../hook/useLanguage";
import { useBottomSheet } from "../hook/useBottomSheet";
import { DeferredRender } from "../components/common/deferredrender";
import { CrudSkeletonComponent } from "../components/common/crudskeleton";
import FormStoreAdd from "../components/store/formstoreadd";

const BarberStoreLayout = () => {
  const { t } = useLanguage();

  // Bottom sheet hook for add store
  const addStoreSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: false,
    enableOverDrag: false,
  });

  const tabs: TabConfig[] = [
    {
      name: "(panel)",
      headerTitle: t("navigation.welcome"),
      icon: "store-outline",
      iconFocused: "store",
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

  // Dropdown menu items - memoized
  const dropdownMenuItems = useMemo(
    () => [
      {
        icon: "plus",
        label: t("navigation.addStore"),
        onPress: () => addStoreSheet.present(),
      },
      {
        icon: "shopping-outline",
        label: t("navigation.shopping"),
        onPress: () => {},
      },
    ],
    [t, addStoreSheet],
  );

  // Add Store Bottom Sheet
  const renderAdditionalBottomSheets = () => (
    <BottomSheetModal
      ref={addStoreSheet.ref}
      backdropComponent={addStoreSheet.makeBackdrop()}
      handleIndicatorStyle={{ backgroundColor: "#47494e" }}
      backgroundStyle={{ backgroundColor: "#151618" }}
      onChange={addStoreSheet.handleChange}
      snapPoints={addStoreSheet.snapPoints}
      enableOverDrag={addStoreSheet.enableOverDrag}
      enablePanDownToClose={addStoreSheet.enablePanDownToClose}
    >
      <BottomSheetView className="h-full pt-2">
        <DeferredRender
          active={addStoreSheet.isOpen}
          placeholder={
            <View className="flex-1 pt-4">
              <CrudSkeletonComponent />
            </View>
          }
        >
          <FormStoreAdd onClose={() => addStoreSheet.dismiss()} />
        </DeferredRender>
      </BottomSheetView>
    </BottomSheetModal>
  );

  return (
    <BaseTabLayout
      userType={UserType.BarberStore}
      accentColor="#f05e23"
      tabs={tabs}
      dropdownMenuItems={dropdownMenuItems}
      renderAdditionalBottomSheets={renderAdditionalBottomSheets}
    />
  );
};

export default BarberStoreLayout;
