import { View } from 'react-native'
import React from 'react'
import { LottieViewComponent } from '../../components/common/lottieview';
import { MESSAGES } from '../../constants/messages';

const Index = () => {
    return (
        <View className="flex-1 bg-[#151618]">
            <LottieViewComponent message={MESSAGES.EMPTY_STATE.NO_FAVORITES} />
        </View>
    )
}

export default Index

