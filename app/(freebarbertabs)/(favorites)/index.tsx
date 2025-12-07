import { useRouter } from 'expo-router';
import { InteractionManager, Text, View } from 'react-native'
import { Avatar, Button, Divider, IconButton } from 'react-native-paper';
import { useRevokeMutation } from '../../store/api';
import { tokenStore } from '../../lib/tokenStore';
import { clearStoredTokens } from '../../lib/tokenStorage';

const Index = () => {

    return (
        <View className='flex-1 flex pl-0 pt-4   bg-[#151618]'>

        </View>
    );
}

export default Index

