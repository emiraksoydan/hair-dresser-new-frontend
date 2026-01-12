import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from './Text';
import { useLanguage } from '../../hook/useLanguage';

interface ServiceOffering {
  id?: string;
  serviceName: string;
  price: number | string;
}

interface ServiceOfferingsListProps {
  offerings: ServiceOffering[];
  className?: string;
}

/**
 * Reusable service offerings list component
 * Displays services in a horizontal scrollable list
 */
export const ServiceOfferingsList: React.FC<ServiceOfferingsListProps> = ({
  offerings,
  className = '',
}) => {
  const { t } = useLanguage();

  if (!offerings || offerings.length === 0) {
    return null;
  }

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
          className="flex-row bg-[#2a2b2f] px-3 py-2 rounded-lg items-center"
        >
          <Text className="text-[#d1d5db] mr-1 text-sm">
            {service.serviceName} :
          </Text>
          <Text className="text-[#a3e635] text-sm">
            {service.price} {t('card.currency')}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};
