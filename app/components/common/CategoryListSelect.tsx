import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";
import { Text } from "./Text";

export type CategoryItem = {
  label: string;
  value: string;
};

type CategoryListSelectProps = {
  data: CategoryItem[];
  value: string[];
  onChange: (value: string[]) => void;
  labelField?: keyof CategoryItem;
  valueField?: keyof CategoryItem;
  maxHeight?: number;
  /** Tek seçim: sadece bir eleman seçilebilir (örn. ana kategori) */
  singleSelect?: boolean;
};

export const CategoryListSelect = React.memo(
  ({
    data,
    value = [],
    onChange,
    labelField = "label",
    valueField = "value",
    singleSelect = false,
  }: CategoryListSelectProps) => {
    const valueSet = React.useMemo(() => new Set(value), [value]);

    const toggleItem = (itemValue: string) => {
      if (singleSelect) {
        onChange(valueSet.has(itemValue) ? [] : [itemValue]);
        return;
      }
      const next = valueSet.has(itemValue)
        ? value.filter((v) => v !== itemValue)
        : [...value, itemValue];
      onChange(next);
    };

    return (
      <View style={styles.container}>
        {data.map((item, index) => {
            const itemValue = item[valueField] as string;
            const itemLabel = item[labelField] as string;
            const isSelected = valueSet.has(itemValue);

            return (
              <TouchableOpacity
                key={`${itemValue}-${index}`}
                onPress={() => toggleItem(itemValue)}
                activeOpacity={0.7}
                style={[
                  styles.item,
                  isSelected && styles.itemSelected,
                ]}
              >
                <Text
                  className="text-white flex-1"
                  style={styles.label}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {itemLabel}
                </Text>
                <Icon source="chevron-right" size={20} color={isSelected ? "#ffb900" : "#6B7280"} />
              </TouchableOpacity>
            );
          })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1F2937",
    overflow: "hidden",
    marginHorizontal: 0,
    paddingHorizontal: 0,
    borderRadius: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 0,
  },
  itemSelected: {
    backgroundColor: "#374151",
    borderLeftWidth: 3,
    borderLeftColor: "#ffb900",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: "CenturyGothic",
  },
});
