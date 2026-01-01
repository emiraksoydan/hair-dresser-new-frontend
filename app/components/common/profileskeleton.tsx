import { View } from 'react-native';
import { Skeleton } from 'moti/skeleton';

export const ProfileSkeleton = () => {
    return (
        <View className='flex-1 bg-[#0A0B0F] px-6 pt-6'>
            {/* Avatar Section */}
            <View className="items-center mb-6">
                <Skeleton width={120} height={120} radius="round" />
                <View className="h-3" />
                <Skeleton width={160} height={20} radius={8} />
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-700 mb-6" />

            {/* Profile Info Title */}
            <Skeleton width={120} height={18} radius={8} />
            <View className="h-4" />

            {/* Form Container */}
            <View className="bg-[#1F2937] rounded-xl p-4">
                {/* Name Fields Row */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                        <Skeleton width={60} height={14} radius={6} />
                        <View className="h-2" />
                        <Skeleton width="100%" height={48} radius={8} />
                    </View>
                    <View className="flex-1">
                        <Skeleton width={70} height={14} radius={6} />
                        <View className="h-2" />
                        <Skeleton width="100%" height={48} radius={8} />
                    </View>
                </View>

                {/* Phone Field */}
                <View className="mb-4">
                    <Skeleton width={100} height={14} radius={6} />
                    <View className="h-2" />
                    <Skeleton width="100%" height={48} radius={8} />
                </View>

                {/* Update Button */}
                <Skeleton width="100%" height={48} radius={8} />
            </View>

            {/* Logout Section */}
            <View className="mt-6">
                <Skeleton width={100} height={18} radius={8} />
                <View className="h-4" />
                <Skeleton width="100%" height={56} radius={12} />
            </View>
        </View>
    );
};
