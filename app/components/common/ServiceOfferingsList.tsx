import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { Icon } from 'react-native-paper';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

interface ServiceOffering {
  id?: string;
  serviceName: string;
  price: number | string;
}

interface ServiceOfferingsListProps {
  offerings: ServiceOffering[];
  className?: string;
  /** 'horizontal' = yatay kaydırmalı (varsayılan), 'vertical' = dikey liste */
  layout?: 'horizontal' | 'vertical';
  /** Dikey modda gösterilecek önizleme sayısı (undefined = hepsini göster) */
  previewCount?: number;
  /** "Tümünü Göster" butonu gösterilsin mi */
  showExpandButton?: boolean;
}

/**
 * Reusable service offerings list component
 * Supports horizontal scrollable and vertical list layouts
 */
export const ServiceOfferingsList: React.FC<ServiceOfferingsListProps> = ({
  offerings,
  className = '',
  layout = 'horizontal',
  previewCount,
  showExpandButton = false,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!offerings || offerings.length === 0) {
    return null;
  }

  // Horizontal layout (eski davranış)
  if (layout === 'horizontal') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={`mt-2 ${className}`}
        contentContainerStyle={{ gap: 8 }}
      >
        {offerings.map((service, index) => (
          <View
            key={service.id ?? service.serviceName ?? index}
            style={{ backgroundColor: colors.cardBg2 }}
            className="flex-row px-3 py-2 rounded-lg items-center"
          >
            <Text style={{ color: colors.sectionHeaderText }} className="mr-1 text-sm">
              {service.serviceName} :
            </Text>
            <Text className="text-[#a3e635] text-sm">
              {service.price} {t('card.currency')}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // Vertical layout
  const displayCount = (showExpandButton && !isExpanded && previewCount)
    ? previewCount
    : offerings.length;
  const displayedOfferings = offerings.slice(0, displayCount);
  const hasMore = showExpandButton && previewCount != null && offerings.length > previewCount;

  return (
    <View className={`mt-0 mb-2 ${className}`}>
      {displayedOfferings.map((service, index) => {
        // İlk ve son eleman kontrolü
        const isFirst = index === 0;
        const isLast = index === displayedOfferings.length - 1;

        return (
          <View
            key={service.id ?? service.serviceName ?? index}
            style={{
              backgroundColor: colors.cardBg2,
              borderBottomWidth: !isLast ? 1 : 0,
              borderBottomColor: !isLast ? colors.borderColor : undefined,
            }}
            className={`flex-row justify-between items-center px-3 py-2.5
          ${isFirst ? 'rounded-t-xl' : ''}
          ${isLast ? 'rounded-b-xl' : ''}`}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] mr-2" />
              <Text style={{ color: colors.sectionHeaderText }} className="text-sm flex-1" numberOfLines={1}>
                {service.serviceName}
              </Text>
            </View>
            <Text className="text-[#a3e635] text-sm font-century-gothic-bold">
              {service.price} {t('card.currency')}
            </Text>
          </View>
        );
      })}

      {hasMore && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          className="flex-row items-center justify-center py-2 mt-1"
          activeOpacity={0.7}
        >
          <Text className="text-[#60a5fa] text-sm mr-1">
            {isExpanded ? t('common.showLess') : t('common.showAll')} ({offerings.length})
          </Text>
          <Icon
            source={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#60a5fa"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};
