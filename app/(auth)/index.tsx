import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { TextInput, HelperText, ActivityIndicator, Portal, Modal } from "react-native-paper";
import { showSnack } from '../store/snackbarSlice';
import { Button } from '../components/common/Button';
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dropdown } from "react-native-element-dropdown";
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


const registerSchema = z.object({
    mode: z.literal("register"),
    firstName: z.string({ required_error: "İsim gerekli" })
        .min(2, "Karakter sayısı minimum 2 olmalı").max(20, "Karakter sayısı maximum 20 yi geçmemeli").regex(/^\S+$/, "Boşluk kullanmayın")
        .transform(value => value.replace(/\s+/g, '')),
    surname: z.string({ required_error: "Soyisim gerekli" })
        .max(20, "Karakter sayısı maximum 20 yi geçmemeli").min(2, "Karakter sayısı minimum 2 olmalı").regex(/^\S+$/, "Boşluk kullanmayın").transform(value => value.replace(/\s+/g, '')).transform(value => value.replace(/\s+/g, '')),
    phone: z.string({ required_error: "Telefon gerekli" }).length(10, "Numara 10 haneli olmalı"),
    userType: z.enum(["customer", "freeBarber", "barberStore"], {
        errorMap: () => ({ message: "Kullanıcı türü zorunludur" }),
    }),
});
const loginSchema = z.object({
    mode: z.literal("login"),
    phone: z.string({ required_error: "Telefon gerekli" }).length(10, "Numara 10 haneli olmalı"),
    firstName: z.string().optional(),
    surname: z.string().optional(),
    userType: z.enum(["customer", "freeBarber", "barberStore"], {
        errorMap: () => ({ message: "Kullanıcı türü zorunludur" }),
    }),
});

const schema = z.discriminatedUnion("mode", [loginSchema, registerSchema]);
type FormData = z.infer<typeof schema>;


const Index = () => {
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
            // Error is already handled by RTK Query, no need to log here
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
            // Login ve Register modunda userType zorunlu
            const userTypeToSend = mapUserTypeToNumber(f.userType) ?? UserType.Customer;

            // phoneNumber parametresi varsa onu kullan, yoksa phone state'ini kullan
            const phoneToSend = phoneNumber || phone;

            // phoneToSend boşsa hata ver
            if (!phoneToSend || phoneToSend.trim() === '') {
                dispatch(showSnack({ message: 'Telefon numarası gerekli', isError: true }));
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
                // Login sonrası badge count'u invalidate et - böylece giriş yaptığında bildirim sayısı görünecek
                dispatch(api.util.invalidateTags(['Badge', 'Notification']));
                // Token'ı set ettikten sonra useAuth hook'u ile userType'ı al
                // Ancak burada hook kullanamayız, token'ı direkt decode etmeliyiz
                const t = await loadTokens();
                const userTypeFromToken = getUserTypeFromToken(t.accessToken);
                const targetPath = pathByUserType(userTypeFromToken);
                route.replace(targetPath);
            } else {
                dispatch(showSnack({ message: result.message ?? 'Hata oluştu', isError: true }));
            }
        } catch (err: any) {
            // Error is already handled by RTK Query, no need to log here
            dispatch(showSnack({ message: err?.data?.message ?? 'Hata oluştu', isError: true }));
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
        <View className='flex-1'>
            <ScrollView contentContainerClassName='justify-start items-center' className=" bg-[#151618] flex flex-1">
                <View className='w-full aspect-[1.7] mr-0'>
                    <Image
                        className='w-full h-full '
                        source={require('../../assets/images/logonewimage.png')}
                        style={{ resizeMode: 'contain' }}
                    />
                </View>
                <Text style={{ fontSize: 40 }} className='text-[#d6d6c9]'>GÜMÜŞ</Text>
                <Text style={{ fontSize: 30 }} className='text-[#d6d6c9] mt-1 '>MAKAS</Text>
                <View className=' w-full p-4 pb-0  mt-0'>
                    {isRegister && (
                        <>
                            <View className="flex flex-row gap-2">
                                <View className="flex-1">
                                    <Controller
                                        control={control}
                                        name="firstName"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <>
                                                <TextInput
                                                    mode="outlined"
                                                    textColor="white"
                                                    outlineColor="white"
                                                    theme={{
                                                        colors: {
                                                            onSurfaceVariant: "white",
                                                            background: "#2a2b2d",
                                                            primary: "white",
                                                        },
                                                    }}
                                                    label="İsim"
                                                    dense
                                                    onBlur={onBlur}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => setFocus("surname")}
                                                />
                                                <HelperText type="error" visible={!!isRegister && !!errors.firstName}>
                                                    {errors.firstName?.message}
                                                </HelperText>
                                            </>
                                        )}
                                    />
                                </View>
                                <View className="w-1/2">
                                    <Controller
                                        control={control}
                                        name="surname"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <>
                                                <TextInput
                                                    textColor="white"
                                                    outlineColor="white"
                                                    theme={{
                                                        colors: {
                                                            onSurfaceVariant: "white",
                                                            background: "#2a2b2d",
                                                            primary: "white",
                                                        },
                                                    }}
                                                    label="Soyisim"
                                                    mode="outlined"
                                                    dense
                                                    onBlur={onBlur}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => setFocus("phone")}
                                                />
                                                <HelperText type="error" visible={!!isRegister && !!errors.surname}>
                                                    {errors.surname?.message}
                                                </HelperText>
                                            </>
                                        )}
                                    />
                                </View>
                            </View>
                        </>
                    )}
                    <View className="w-full mt-[-4px]">
                        <Controller
                            control={control}
                            name="userType"
                            render={({ field: { value, onChange } }) => (
                                <View>
                                    <Dropdown
                                        data={userTypeItems}
                                        labelField="label"
                                        valueField="value"
                                        value={value ?? null}
                                        placeholder="Kullanıcı türü seçin"
                                        search={false}
                                        style={{
                                            backgroundColor: "#2a2b2d",
                                            borderWidth: 1,
                                            borderColor: errors.userType ? "#ef4444" : "white",
                                            borderRadius: 4,
                                            paddingHorizontal: 12,
                                            height: 42,
                                        }}
                                        placeholderStyle={{ color: "#cfcfcf" }}
                                        selectedTextStyle={{ color: "white" }}
                                        itemTextStyle={{ color: "white", fontSize: 10 }}
                                        containerStyle={{
                                            backgroundColor: "#2a2b2d",
                                            borderWidth: 1,
                                            borderColor: "#3a3a3a",
                                            elevation: 12,
                                            borderRadius: 10,
                                            overflow: "hidden",
                                        }}
                                        activeColor="#3a3a3a"
                                        onChange={item => onChange(item.value)}
                                        dropdownPosition="top"
                                    />
                                    <HelperText type="error" visible={!!errors.userType}>
                                        {errors.userType?.message as string}
                                    </HelperText>
                                </View>
                            )}
                        />
                    </View>
                    <View className="mt-[-8px]">
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        label="Telefon"
                                        mode="outlined"
                                        textColor="white"
                                        dense
                                        outlineColor="white"
                                        keyboardType="number-pad"
                                        onBlur={onBlur}
                                        value={value}
                                        onChangeText={onChange}
                                        returnKeyType="done"
                                        placeholderTextColor="gray"
                                        placeholder="555-555-5555"
                                        onSubmitEditing={() => setFocus("phone")}
                                        theme={{
                                            colors: {
                                                onSurfaceVariant: "white",
                                                background: "#2a2b2d",
                                                primary: "white",
                                            },
                                        }}
                                    />
                                    <HelperText type="error" visible={!!errors.phone}>
                                        {errors.phone?.message}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                </View>
                <Button style={{ width: '95%', borderRadius: 5 }} buttonColor='black' mode="contained" onPress={handleSubmit(onSubmit)} disabled={isLoading} loading={isLoading}>
                    İleri
                </Button>
                <View className='flex-row my-3 items-center gap-2'>
                    <Text className='text-sm text-white'>{isRegister ? 'Hesabınız varmı' : 'Hesabınız yokmu'}</Text>
                    <TouchableOpacity onPress={() => toggleMode()}>
                        <Text className='text-base underline font-bold text-blue-500 '>{isRegister ? 'Giriş yap' : 'Kayıt ol'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: "white",
                        padding: 20,
                        margin: 20,
                        borderRadius: 16,
                    }}
                >
                    <Text className='text-xl mt-1' >
                        Telefonunu doğrula
                    </Text>
                    <Text className='opacity-80 mt-4' >
                        {phone} numarasına gelen 6 haneli kodu gir.
                    </Text>

                    <OtpInput
                        numberOfDigits={6}
                        onFilled={(code: any) => doVerify(code, phone)}
                        focusColor="#6200EE"
                        theme={{
                            containerStyle: { marginBottom: 12 },
                            pinCodeContainerStyle: {
                                width: 48, height: 56, borderRadius: 12, borderWidth: 1, borderColor: "#e0e0e0",
                            },
                            pinCodeTextStyle: { fontSize: 22 },
                        }}
                        type='numeric'

                    />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <Text className='text-blue-500 opacity-70'>Süre: {mmss}</Text>
                        <Button mode="text" onPress={onResend} disabled={!canResend}>
                            Kodu yeniden gönder
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    )
}

export default Index

