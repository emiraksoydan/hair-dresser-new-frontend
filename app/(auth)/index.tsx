import { TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Text } from '../components/common/Text'
import React, { useEffect, useMemo, useState } from 'react'
import { TextInput, HelperText, Portal, Modal, Icon } from "react-native-paper";
import { showSnack } from '../store/snackbarSlice';
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { userTypeItems } from '../constants';
import { usePasswordMutation, useSendOtpMutation, useVerifyOtpMutation, api } from '../store/api';
import { OtpInput } from "react-native-otp-entry";
import { tokenStore } from '../lib/tokenStore';
import { loadTokens, saveTokens } from '../lib/tokenStorage';
import { OtpPurpose, UserType } from '../types';
import { useRouter } from 'expo-router';
import { pathByUserType } from '../utils/auth/redirect-by-user-type';
import { useAppDispatch } from '../store/hook';
import { getUserTypeFromToken } from '../utils/auth/auth';
import { useTheme } from '../hook/useTheme';
import { useLanguage } from '../hook/useLanguage';
import { LanguageSelector } from '../components/common/LanguageSelector';

// Schema'yı dinamik olarak oluşturmak için fonksiyon
const createSchemas = (t: (key: string) => string) => {
    const registerSchema = z.object({
        mode: z.literal("register"),
        firstName: z.string({
            required_error: t('auth.firstName') + ' ' + t('common.required'),
            invalid_type_error: t('auth.firstName') + ' ' + t('common.invalid')
        })
            .min(2, { message: t('auth.firstName') + ' ' + t('common.minLength').replace('{{min}}', '2') })
            .max(20, { message: t('auth.firstName') + ' ' + t('common.maxLength').replace('{{max}}', '20') })
            .regex(/^\S+$/, { message: t('auth.firstName') + ' ' + t('common.noSpaces') })
            .transform(value => value.replace(/\s+/g, '')),
        surname: z.string({
            required_error: t('auth.lastName') + ' ' + t('common.required'),
            invalid_type_error: t('auth.lastName') + ' ' + t('common.invalid')
        })
            .min(2, { message: t('auth.lastName') + ' ' + t('common.minLength').replace('{{min}}', '2') })
            .max(20, { message: t('auth.lastName') + ' ' + t('common.maxLength').replace('{{max}}', '20') })
            .regex(/^\S+$/, { message: t('auth.lastName') + ' ' + t('common.noSpaces') })
            .transform(value => value.replace(/\s+/g, '')),
        phone: z.string({
            required_error: t('auth.phoneNumber') + ' ' + t('common.required'),
            invalid_type_error: t('auth.phoneNumber') + ' ' + t('common.invalid')
        })
            .length(10, { message: t('auth.phoneNumber') + ' ' + t('common.exactLength').replace('{{length}}', '10') }),
        userType: z.enum(["customer", "freeBarber", "barberStore"], {
            errorMap: () => ({ message: t('auth.userType') + ' ' + t('common.required') }),
        }),
    });
    const loginSchema = z.object({
        mode: z.literal("login"),
        phone: z.string({
            required_error: t('auth.phoneNumber') + ' ' + t('common.required'),
            invalid_type_error: t('auth.phoneNumber') + ' ' + t('common.invalid')
        })
            .length(10, { message: t('auth.phoneNumber') + ' ' + t('common.exactLength').replace('{{length}}', '10') }),
        firstName: z.string().optional(),
        surname: z.string().optional(),
        userType: z.enum(["customer", "freeBarber", "barberStore"], {
            errorMap: () => ({ message: t('auth.userType') + ' ' + t('common.required') }),
        }),
    });
    return z.discriminatedUnion("mode", [loginSchema, registerSchema]);
};

type FormData = z.infer<ReturnType<typeof createSchemas>>;

const Index = () => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const schema = useMemo(() => createSchemas(t), [t]);
    const dispatch = useAppDispatch();
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        setFocus,
        getValues,
        setValue,
        watch
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        mode: "onChange",
        shouldUnregister: false,
        defaultValues: {
            mode: 'register',
        }
    });
    const route = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [phone, setPhone] = useState("");
    const [left, setLeft] = useState(0);
    const isRegister = watch("mode") === "register";
    const selectedUserType = watch("userType");

    const toggleMode = () => setValue("mode", isRegister === true ? "login" : "register");
    const [sendOtp, { isLoading, isError, data, error }] = useSendOtpMutation();
    const [sendPassword, { isLoading: isPerr, isError: iE, data: id, error: ie }] = usePasswordMutation();
    const [verifyOtp] = useVerifyOtpMutation();

    useEffect(() => {
        if (!modalVisible || left <= 0) return;
        const t = setInterval(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [modalVisible, left]);

    const onSubmit = async (data: FormData) => {
        try {
            let normalizedPhone = data.phone;
            if (normalizedPhone.startsWith("0")) { normalizedPhone = normalizedPhone.substring(1); }
            if (!normalizedPhone.startsWith("+90")) { normalizedPhone = `+90${normalizedPhone}`; }
            const payloadForSendOtp: { phoneNumber: string; userType?: UserType; Otppurpose: OtpPurpose; } = {
                phoneNumber: normalizedPhone,
                Otppurpose: isRegister ? OtpPurpose.Register : OtpPurpose.Login,
                ...(isRegister ? { userType: mapUserTypeToNumber(data.userType) } : {}),
            };
            setPhone(normalizedPhone);
            doVerify("123456", normalizedPhone);
        } catch (err: any) {
            dispatch(showSnack({ message: err.data.message, isError: true }));
        }
    };

    const mmss = useMemo(() => {
        const m = Math.floor(left / 60).toString().padStart(2, "0");
        const s = (left % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }, [left]);

    const doVerify = async (code: string, phoneNumber?: string) => {
        try {
            const f = getValues();
            const userTypeToSend = mapUserTypeToNumber(f.userType) ?? UserType.Customer;
            const phoneToSend = phoneNumber || phone;

            if (!phoneToSend || phoneToSend.trim() === '') {
                dispatch(showSnack({ message: t('auth.phoneNumber') + ' ' + t('common.error'), isError: true }));
                return;
            }

            const result = await sendPassword({
                firstName: f.firstName ?? '',
                lastName: f.surname ?? '',
                phoneNumber: phoneToSend,
                code: code,
                device: null,
                userType: userTypeToSend,
                mode: isRegister ? 'register' : 'login',
                password: '1234',
            }).unwrap();
            if (result.success === true) {
                tokenStore.set({
                    accessToken: result?.data?.token!,
                    refreshToken: result?.data?.refreshToken!,
                });
                await saveTokens({
                    accessToken: result?.data?.token!,
                    refreshToken: result?.data?.refreshToken!,
                });
                dispatch(api.util.invalidateTags(['Notification']));
                const t = await loadTokens();
                const userTypeFromToken = getUserTypeFromToken(t.accessToken);
                const targetPath = pathByUserType(userTypeFromToken);
                route.replace(targetPath);
            } else {
                dispatch(showSnack({ message: result.message ?? t('common.error'), isError: true }));
            }
        } catch (err: any) {
            dispatch(showSnack({ message: err?.data?.message ?? t('common.error'), isError: true }));
        }
    };

    const mapUserTypeToNumber = (ut: FormData["userType"]) => {
        switch (ut) {
            case "customer": return UserType.Customer;
            case "freeBarber": return UserType.FreeBarber;
            case "barberStore": return UserType.BarberStore;
            default: return 0;
        }
    };

    const canResend = left === 0;
    const onResend = async () => {
        // OTP resend functionality can be implemented here if needed
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                keyboardShouldPersistTaps="handled"
                style={{ backgroundColor: colors.background }}
            >
                <View className="flex-1 items-center justify-center p-4">
                    {/* Header Section */}
                    <View className="items-center justify-center mb-4" style={{ backgroundColor: colors.background }}>
                        <Text className="text-4xl font-bold mb-1" style={{ color: isDark ? '#ffffff' : '#000000', letterSpacing: 0.5 }}>
                            {t('auth.title').toUpperCase()}
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View className="w-10/12 max-w-sm mx-4 rounded-2xl p-4" style={{ backgroundColor: colors.card }}>
                        {/* Name and Surname (Register only) */}
                        {isRegister && (
                            <>
                                <View style={{ marginBottom: 4 }}>
                                    <Controller
                                        control={control}
                                        name="firstName"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <>
                                                <TextInput
                                                    mode="outlined"
                                                    dense
                                                    label={t('auth.firstName')}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => setFocus("surname")}
                                                    placeholder={t('auth.firstName')}
                                                    placeholderTextColor={colors.textTertiary}
                                                    textColor={colors.text}
                                                    outlineColor={errors.firstName ? '#ef4444' : colors.inputBorder}
                                                    style={{ backgroundColor: colors.inputBackground, fontSize: 14 }}
                                                    contentStyle={{ height: 44, paddingVertical: 0 }}
                                                    theme={{
                                                        colors: {
                                                            background: colors.inputBackground,
                                                            onSurface: colors.text,
                                                            primary: colors.primary,
                                                        },
                                                    }}
                                                />
                                                {errors.firstName && (
                                                    <HelperText
                                                        type="error"
                                                        visible={true}
                                                        style={{ color: '#ef4444', fontSize: 11, fontWeight: '500', marginTop: -4, marginBottom: 0, paddingHorizontal: 0 }}
                                                    >
                                                        {errors.firstName?.message}
                                                    </HelperText>
                                                )}
                                            </>
                                        )}
                                    />
                                </View>
                                <View style={{ marginBottom: 4 }}>
                                    <Controller
                                        control={control}
                                        name="surname"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <>
                                                <TextInput
                                                    mode="outlined"
                                                    dense
                                                    label={t('auth.lastName')}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => setFocus("phone")}
                                                    placeholder={t('auth.lastName')}
                                                    placeholderTextColor={colors.textTertiary}
                                                    textColor={colors.text}
                                                    outlineColor={errors.surname ? '#ef4444' : colors.inputBorder}
                                                    style={{ backgroundColor: colors.inputBackground, fontSize: 14 }}
                                                    contentStyle={{ height: 44, paddingVertical: 0 }}
                                                    theme={{
                                                        colors: {
                                                            background: colors.inputBackground,
                                                            onSurface: colors.text,
                                                            primary: colors.primary,
                                                        },
                                                    }}
                                                />
                                                {errors.surname && (
                                                    <HelperText
                                                        type="error"
                                                        visible={true}
                                                        style={{ color: '#ef4444', fontSize: 11, fontWeight: '500', marginTop: -4, marginBottom: 0, paddingHorizontal: 0 }}
                                                    >
                                                        {errors.surname?.message}
                                                    </HelperText>
                                                )}
                                            </>
                                        )}
                                    />
                                </View>
                            </>
                        )}

                        {/* Phone Number Input */}
                        <View style={{ marginBottom: 4 }}>
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <>
                                        <TextInput
                                            mode="outlined"
                                            dense
                                            label={t('auth.phoneNumber')}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            keyboardType="number-pad"
                                            placeholder="555 555 5555"
                                            placeholderTextColor={colors.textTertiary}
                                            textColor={colors.text}
                                            outlineColor={errors.phone ? '#ef4444' : colors.inputBorder}
                                            left={
                                                <TextInput.Icon
                                                    icon="phone"
                                                    color={colors.textSecondary}
                                                    style={{ marginTop: 6 }}
                                                />
                                            }
                                            style={{ backgroundColor: colors.inputBackground, fontSize: 14 }}
                                            contentStyle={{ height: 44, paddingVertical: 0 }}
                                            theme={{
                                                colors: {
                                                    background: colors.inputBackground,
                                                    onSurface: colors.text,
                                                    primary: colors.primary,
                                                },
                                            }}
                                        />
                                        {errors.phone && (
                                            <HelperText
                                                type="error"
                                                visible={true}
                                                style={{ color: '#ef4444', fontSize: 11, fontWeight: '500', marginTop: -4, marginBottom: 0, paddingHorizontal: 0 }}
                                            >
                                                {errors.phone?.message}
                                            </HelperText>
                                        )}
                                    </>
                                )}
                            />
                        </View>

                        {/* User Type Selection */}
                        <View style={{ marginBottom: 0 }}>
                            <Text className="text-sm mb-1" style={{ color: colors.text }}>{t('auth.userType')}</Text>
                            <Controller
                                control={control}
                                name="userType"
                                render={({ field: { value, onChange } }) => (
                                    <View>
                                        <View className="flex-row gap-2">
                                            {userTypeItems.map((item) => {
                                                const isSelected = value === item.value;
                                                return (
                                                    <TouchableOpacity
                                                        key={item.value}
                                                        className="flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-lg"
                                                        style={{
                                                            backgroundColor: isSelected
                                                                ? '#1a1a1a'
                                                                : '#ffffff',
                                                            borderWidth: isSelected ? 1.5 : 1,
                                                            borderColor: isSelected
                                                                ? '#1a1a1a'
                                                                : '#e0e0e0',
                                                        }}
                                                        onPress={() => onChange(item.value)}
                                                    >
                                                        <Icon
                                                            source={item.icon}
                                                            size={18}
                                                            color={isSelected ? '#ffffff' : colors.text}
                                                        />
                                                        <Text
                                                            className="text-xs ml-2 font-medium"
                                                            style={{
                                                                color: isSelected
                                                                    ? '#ffffff'
                                                                    : colors.text
                                                            }}
                                                        >
                                                            {item.value === 'customer' ? t('auth.customer') :
                                                                item.value === 'freeBarber' ? t('auth.barber') :
                                                                    t('auth.salon')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                        <HelperText
                                            type="error"
                                            visible={!!errors.userType}
                                            style={{ color: '#ef4444', fontSize: 12, fontWeight: '600', marginTop: 0, marginBottom: 0 }}
                                        >
                                            {errors.userType?.message as string}
                                        </HelperText>
                                    </View>
                                )}
                            />
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            className="w-full rounded-lg py-3  items-center justify-center"
                            style={{
                                backgroundColor: '#1a1a1a',
                                opacity: isPerr ? 0.6 : 1,
                            }}
                            onPress={handleSubmit(onSubmit)}
                            disabled={isPerr}
                            activeOpacity={0.8}
                        >
                            {isPerr ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <Text className="text-base font-semibold" style={{ color: '#ffffff' }}>
                                    {t('auth.start')}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Login/Register Toggle */}
                        <View className="flex-row items-center justify-center gap-2 mt-4">
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>
                                {isRegister ? t('auth.alreadyHaveAccount') : t('auth.noAccount')}
                            </Text>
                            <TouchableOpacity onPress={toggleMode} className="flex-row items-center ">
                                <Text className="text-sm underline" style={{ color: colors.text }}>
                                    {isRegister ? t('auth.login') : t('auth.register')}
                                </Text>
                                <View className="ml-0.5">
                                    <Icon source="arrow-right" size={16} color={colors.text} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Language Selector */}
                        <View className="mt-4 mb-0.5 items-center">
                            <LanguageSelector showLabel={true} />
                        </View>
                    </View>

                    {/* OTP Modal */}
                    <Portal>
                        <Modal
                            visible={modalVisible}
                            onDismiss={() => setModalVisible(false)}
                            contentContainerStyle={{
                                padding: 20,
                                margin: 20,
                                borderRadius: 16,
                                backgroundColor: colors.card,
                            }}
                        >
                            <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>
                                {t('auth.verifyPhone')}
                            </Text>
                            <Text className="text-sm mb-5" style={{ color: colors.textSecondary }}>
                                {t('auth.enterCode', { phone })}
                            </Text>

                            <OtpInput
                                numberOfDigits={6}
                                onFilled={(code: any) => doVerify(code, phone)}
                                focusColor={colors.primary}
                                theme={{
                                    containerStyle: { marginBottom: 12 },
                                    pinCodeContainerStyle: {
                                        width: 48,
                                        height: 56,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: colors.inputBorder,
                                        backgroundColor: colors.inputBackground,
                                    },
                                    pinCodeTextStyle: {
                                        fontSize: 22,
                                        color: colors.text,
                                    },
                                }}
                                type='numeric'
                            />

                            <View className="flex-row justify-between items-center">
                                <Text className="text-sm" style={{ color: colors.textSecondary }}>
                                    {t('auth.timeRemaining', { time: mmss })}
                                </Text>
                                <TouchableOpacity
                                    onPress={onResend}
                                    disabled={!canResend}
                                    style={{ opacity: canResend ? 1 : 0.5 }}
                                >
                                    <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
                                        {t('auth.resendCode')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Modal>
                    </Portal>
                </View>
            </ScrollView >
        </KeyboardAvoidingView >
    )
}

export default Index
