import React, { useState, useMemo } from 'react';
import { View, Text, Dimensions, FlatList } from 'react-native';
import MotiViewExpand from '../../components/common/motiviewexpand';
import { SkeletonComponent } from '../../components/common/skeleton';
import { EmptyState } from '../../components/common/emptystateresult';
import { StoreCardInner } from '../../components/store/storecard';
import { FreeBarberCardInner } from '../../components/freebarber/freebarbercard';

export const SectionHeader = ({ title, expanded, onToggle }: any) => (
    <View className="flex flex-row justify-between items-center mt-4">
        <Text className="font-ibm-plex-sans-regular text-xl text-white">{title}</Text>
        <MotiViewExpand expanded={expanded} onPress={onToggle} />
    </View>
);

export const SkeletonList = ({ count }: { count: number }) => (
    <View className="pt-4">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonComponent key={i} />
        ))}
    </View>
);

export const EmptyStateFunc = ({ loading, hasData, hasLocation, locationStatus, fetchedOnce, message }: any) => (
    <View style={{ minHeight: 200, maxHeight: 400 }}>
        <EmptyState
            loading={loading}
            hasData={hasData}
            hasLocation={hasLocation}
            locationStatus={locationStatus}
            fetchedOnce={fetchedOnce}
            noResultText={message}
        />
    </View>
);

export const StoresSection = React.memo(({ stores, loading, hasLocation, locationStatus, fetchedOnce, isList, onPressStore, onPressRatings }: any) => {
    const [expanded, setExpanded] = useState(true);
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = expanded ? screenWidth * 0.92 : screenWidth * 0.94;

    if (loading && !stores.length) return <SkeletonList count={2} />;
    if (!stores.length) return (
        <EmptyStateFunc loading={loading} hasData={stores.length > 0} hasLocation={hasLocation} locationStatus={locationStatus} fetchedOnce={fetchedOnce} message="İşletme bulunamadı" />
    );

    return (
        <View>
            <SectionHeader title="İşletmeler" expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            {expanded ? (
                <View style={{ paddingTop: 8 }}>
                    {stores.map((s: any) => (
                        <StoreCardInner key={s.id} store={s} isList={isList} expanded={expanded} cardWidthStore={cardWidth} onPressUpdate={onPressStore} onPressRatings={onPressRatings} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={stores}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <StoreCardInner store={item} isList={isList} expanded={false} cardWidthStore={cardWidth} onPressUpdate={onPressStore} onPressRatings={onPressRatings} />
                    )}
                    contentContainerStyle={{ paddingTop: 8 }}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    nestedScrollEnabled
                    initialNumToRender={3}
                    maxToRenderPerBatch={5}
                    windowSize={7}
                    removeClippedSubviews={true}
                />
            )}
        </View>
    );
});

export const FreeBarbersSection = React.memo(({ freeBarbers, loading, hasLocation, locationStatus, fetchedOnce, isList, onPressFreeBarber, onPressRatings }: any) => {
    const [expanded, setExpanded] = useState(false);
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = expanded ? screenWidth * 0.92 : screenWidth * 0.94;

    if (loading && !freeBarbers.length) return <SkeletonList count={2} />;
    if (!freeBarbers.length) return (
        <EmptyStateFunc loading={loading} hasData={freeBarbers.length > 0} hasLocation={hasLocation} locationStatus={locationStatus} fetchedOnce={fetchedOnce} message="Serbest berber bulunamadı" />
    );

    return (
        <View>
            <SectionHeader title="Serbest Berberler" expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            {expanded ? (
                <View style={{ paddingTop: 8 }}>
                    {freeBarbers.map((fb: any) => (
                        <FreeBarberCardInner key={fb.id} freeBarber={fb} isList={isList} expanded={expanded} cardWidthFreeBarber={cardWidth} onPressUpdate={onPressFreeBarber} onPressRatings={onPressRatings} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={freeBarbers}
                    keyExtractor={(item) => (item as any).id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <FreeBarberCardInner freeBarber={item} isList={isList} expanded={false} cardWidthFreeBarber={cardWidth} onPressUpdate={onPressFreeBarber} onPressRatings={onPressRatings} />
                    )}
                    contentContainerStyle={{ paddingTop: 8 }}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    nestedScrollEnabled
                    initialNumToRender={3}
                    maxToRenderPerBatch={5}
                    windowSize={7}
                    removeClippedSubviews={true}
                />
            )}
        </View>
    );
});

export default {
    StoresSection,
    FreeBarbersSection,
    SectionHeader,
    SkeletonList,
    EmptyStateFunc
};
