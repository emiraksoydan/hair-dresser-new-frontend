import { Dimensions, Text, View } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import { useToggleList } from '../../utils/service-toggle';

const Index = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);
    const { present } = useSheet('freeBarberFilter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const [expandedMineStore, setExpandedMineStore] = useState(true);
    const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: updateStore } = useSheet('updateFreeBarberMine');
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);

    const { list: selectedServices, toggle: toggleService, clear: clearServices, has: hasService, } = useToggleList<string>([]);
    const [freeBarberId, setFreeBarberId] = useState<string>("");

    const screenWidth = Dimensions.get('window').width;

    const cardWidthStores = useMemo(
        () => (expandedMineStore ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedMineStore, screenWidth]
    );
    const cardWidthFreeBarber = useMemo(
        () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [setExpandedStoreBarber, screenWidth]
    );

    // const hasMineStores = !loading && stores.length > 0;
    // const hasStoreBarbers = !loading && stores.length > 0;


    // const handlePressUpdatePanel = useCallback(
    //     (store: FreeBarberPanelDto) => {
    //         setFreeBarberId(store.id)
    //         updateStore();
    //     },
    //     [updateStore]
    // );


    return (
        <View>
            <Text>index</Text>
        </View>
    )
}

export default Index

