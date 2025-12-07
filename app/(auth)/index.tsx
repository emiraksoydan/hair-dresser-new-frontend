import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { Button, TextInput, HelperText, Snackbar, ActivityIndicator, Portal, Modal } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { pickPdf, truncateFileName } from '../utils/pick-document';
import { Dropdown } from "react-native-element-dropdown";
import { userTypeItems } from '../constants';
import { usePasswordMutation, useSendOtpMutation, useVerifyOtpMutation } from '../store/api';
import { OtpInput } from "react-native-otp-entry";
import { tokenStore } from '../lib/tokenStore';
import { loadTokens, saveTokens } from '../lib/tokenStorage';
import { jwtDecode } from 'jwt-decode';
import { MyJwtPayload, OtpPurpose, UserType } from '../types';
import { useRouter } from 'expo-router';
import { pathByUserType } from '../utils/redirect-by-user-type';

const PdfAssetSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1).regex(/\.pdf$/i, "PDF uzantılı olmalı"),
    mimeType: z.string().optional(),
    size: z.number().optional(),
}).refine(v => !v.size || v.size <= 5 * 1024 * 1024, {
    message: "En fazla 5 MB",
    path: ["size"],
})
const CertificationFileField = z
    .custom<{ uri: string; name: string; mimeType?: string; size?: number }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            (("uri" in (v as any) && (v as any).uri) ||
                ("name" in (v as any) && (v as any).name)),
        { message: "Lütfen PDF seçiniz." }
    )
    .pipe(PdfAssetSchema);

const registerSchema = z.object({
    mode: z.literal("register"),
    firstName: z.string({ required_error: "İsim gerekli" })
        .min(2, "Karakter sayısı minimum 2 olmalı").max(20, "Karakter sayısı maximum 20 yi geçmemeli").regex(/^\S+$/, "Boşluk kullanmayın")
        .transform(value => value.replace(/\s+/g, '')),
    surname: z.string({ required_error: "Soyisim gerekli" })
        .max(20, "Karakter sayısı maximum 20 yi geçmemeli").min(2, "Karakter sayısı minimum 2 olmalı").regex(/^\S+$/, "Boşluk kullanmayın").transform(value => value.replace(/\s+/g, '')).transform(value => value.replace(/\s+/g, '')),
    phone: z.string({ required_error: "Telefon gerekli" }).length(10, "Numara 10 haneli olmalı"),
    certificationFile: CertificationFileField,
    userType: z.enum(["customer", "freeBarber", "barberStore"], {
        errorMap: () => ({ message: "Kullanıcı türü zorunludur" }),
    }),
});
const loginSchema = z.object({
    mode: z.literal("login"),
    phone: z.string({ required_error: "Telefon gerekli" }).length(10, "Numara 10 haneli olmalı"),
    firstName: z.string().optional(),
    surname: z.string().optional(),
    certificationFile: CertificationFileField.optional(),
    userType: z.enum(["customer", "freeBarber", "barberStore"]).optional(),

});

const schema = z.discriminatedUnion("mode", [loginSchema, registerSchema]);
type FormData = z.infer<typeof schema>;


const Index = () => {
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
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackText, setSnackText] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [phone, setPhone] = useState("");
    const [left, setLeft] = useState(0);
    const isRegister = watch("mode") === "register";

    const cfErrorText = isRegister
        ? (errors.certificationFile?.message ||
            (errors.certificationFile as any)?.name?.message ||
            (errors.certificationFile as any)?.size?.message)
        : undefined;
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
            if (data.phone.startsWith("0")) { data.phone = data.phone.substring(1); }
            if (!data.phone.startsWith("+90")) { data.phone = `+90${data.phone}`; }
            const payloadForSendOtp: { phoneNumber: string; userType?: UserType; Otppurpose: OtpPurpose; } = {
                phoneNumber: data.phone,
                Otppurpose: isRegister ? OtpPurpose.Register : OtpPurpose.Login,
                ...(isRegister ? { userType: mapUserTypeToNumber(data.userType) } : {}),
            };
            setPhone(data.phone);
            doVerify("123456");
            // const res = await sendOtp(payloadForSendOtp).unwrap();
            // if (res.success) {
            //     setPhone(data.phone);
            //     setLeft(600);
            //     setModalVisible(true);
            // } else {
            //     setSnackVisible(true);
            //     setSnackText(res.message);
            // }
        } catch (err: any) {
            console.log("🔴 SEND OTP HATASI:", JSON.stringify(err, null, 2));
            setSnackText(err.data.message);
            setSnackVisible(true);
        }
    };
    const mmss = useMemo(() => {
        const m = Math.floor(left / 60).toString().padStart(2, "0");
        const s = (left % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }, [left]);
    const doVerify = async (code: string) => {

        try {
            const f = getValues();
            // const result = await verifyOtp({ firstName: f.firstName ?? '', lastName: f.surname ?? '', phoneNumber: phone, certificateFilePath: f.certificationFile?.uri ?? '', code: code, device: null, userType: mapUserTypeToNumber(f.userType) ?? 0, mode: isRegister ? 'register' : 'login' }).unwrap();

            const result = await sendPassword({ firstName: f.firstName ?? '', lastName: f.surname ?? '', phoneNumber: phone, certificateFilePath: f.certificationFile?.uri ?? '', code: code, device: null, userType: mapUserTypeToNumber(f.userType) ?? 0, mode: isRegister ? 'register' : 'login', password: '1234', }).unwrap();
            if (result.success === true) {
                tokenStore.set({
                    accessToken: result?.data?.token!,
                    refreshToken: result?.data?.refreshToken!,
                });
                await saveTokens({
                    accessToken: result?.data?.token!,
                    refreshToken: result?.data?.refreshToken!,
                });
                const t = await loadTokens();
                const decoded = jwtDecode<MyJwtPayload>(t.accessToken);
                route.replace(pathByUserType(decoded.userType));
            } else {
                setSnackText(result.message ?? 'Hata oluştu');
                setSnackVisible(true);
            }
        } catch (err: any) {

            console.log("🔴 DO VERIFY HATASI:", JSON.stringify(err, null, 2));
            setSnackText(err?.data?.message ?? 'Hata oluştu');
            setSnackVisible(true);
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
        // if (!canResend) return;
        // try {
        //     const res = await sendOtp({ phoneNumber: phone, Otppurpose: isRegister ? OtpPurpose.Register : OtpPurpose.Login }).unwrap();
        //     if (res.success) {
        //         setLeft(600);
        //     } else {
        //         setSnackVisible(true);
        //         setSnackText(res.message);
        //     }
        // } catch (err: any) {
        //     setSnackText(err.data.message);
        //     setSnackVisible(true);
        // }
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
                            <View className="w-full mt-[-8px]">
                                <Controller
                                    control={control}
                                    name="certificationFile"
                                    render={({ field: { value, onChange } }) => (
                                        <>
                                            <TouchableOpacity
                                                activeOpacity={0.85}
                                                onPress={async () => {
                                                    const file = await pickPdf();
                                                    if (!file) return;
                                                    onChange(file);
                                                }}
                                            >
                                                <TextInput
                                                    label="Kalfalık / Ustalık Belgesi (PDF)"
                                                    mode="outlined"
                                                    value={truncateFileName(value?.name ?? "")}
                                                    editable={false}
                                                    dense
                                                    pointerEvents="none"
                                                    textColor="white"
                                                    outlineColor="white"
                                                    theme={{
                                                        colors: {
                                                            onSurfaceVariant: "white",
                                                            background: "#2a2b2d",
                                                            primary: "white",
                                                        },
                                                    }}
                                                    style={{
                                                        flexShrink: 1,
                                                        minWidth: 0,
                                                        overflow: "hidden",
                                                    }}
                                                />
                                            </TouchableOpacity>
                                            <HelperText type="error" visible={!!isRegister && !!errors.certificationFile}>
                                                {cfErrorText}
                                            </HelperText>
                                        </>
                                    )}
                                />
                            </View>
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
                                            <HelperText type="error" visible={!!isRegister && !!errors.userType}>
                                                {errors.userType?.message as string}
                                            </HelperText>
                                        </View>
                                    )}
                                />
                            </View>
                        </>
                    )}
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
                    {/* <View className='flex flex-row gap-2'>
                        <View className='flex-1'>
                            <Controller
                                control={control}
                                name="firstName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <>
                                        <TextInput
                                            mode='outlined'
                                            textColor='white'
                                            outlineColor='white'
                                            theme={{
                                                colors: {
                                                    onSurfaceVariant: 'white',
                                                    background: '#2a2b2d',
                                                    primary: 'white',
                                                },
                                            }}
                                            label="İsim"
                                            dense
                                            onBlur={onBlur}
                                            value={value}
                                            onChangeText={onChange}
                                            returnKeyType="next"
                                            onSubmitEditing={() => setFocus("firstName")}
                                        />
                                        <HelperText type="error" visible={!!errors.firstName}>
                                            {errors.firstName?.message}
                                        </HelperText>
                                    </>
                                )}
                            />
                        </View>
                        <View className='w-1/2'>
                            <Controller
                                control={control}
                                name="surname"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <>
                                        <TextInput
                                            textColor='white'
                                            outlineColor='white'
                                            theme={{
                                                colors: {
                                                    onSurfaceVariant: 'white',
                                                    background: '#2a2b2d',
                                                    primary: 'white',
                                                },
                                            }}
                                            label="Soyisim"
                                            mode='outlined'
                                            dense
                                            onBlur={onBlur}
                                            value={value}
                                            onChangeText={onChange}
                                            returnKeyType="next"
                                            onSubmitEditing={() => setFocus("surname")}
                                        />
                                        <HelperText type="error" visible={!!errors.surname}>
                                            {errors.surname?.message}
                                        </HelperText>
                                    </>
                                )}
                            />
                        </View>
                    </View>
                    <View className='mt-[-8px]'>
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        label="Telefon"
                                        mode='outlined'
                                        textColor='white'
                                        dense
                                        outlineColor='white'
                                        keyboardType="number-pad"
                                        onBlur={onBlur}
                                        value={value}
                                        onChangeText={onChange}
                                        returnKeyType="done"
                                        placeholderTextColor={'gray'}
                                        placeholder='555-555-5555'
                                        onSubmitEditing={() => setFocus("phone")}
                                        theme={{
                                            colors: {
                                                onSurfaceVariant: 'white',
                                                background: '#2a2b2d',
                                                primary: 'white',
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
                    <View className="w-full mt-[-8px]">
                        <Controller
                            control={control}
                            name="certificationFile"
                            render={({ field: { value, onChange } }) => (
                                <>
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={async () => {
                                            const file = await pickPdf();
                                            if (!file) return;
                                            onChange(file);
                                        }}
                                    >
                                        <TextInput
                                            label="Kalfalık / Ustalık Belgesi (PDF)"
                                            mode="outlined"
                                            value={truncateFileName(value?.name ?? "")}
                                            editable={false}
                                            dense
                                            pointerEvents="none"
                                            textColor="white"
                                            outlineColor="white"
                                            theme={{
                                                colors: {
                                                    onSurfaceVariant: "white",
                                                    background: "#2a2b2d",
                                                    primary: "white",
                                                },
                                            }}
                                            style={{ flexShrink: 1, minWidth: 0, overflow: "hidden" }}

                                        />
                                    </TouchableOpacity>
                                    <HelperText type="error" visible={!!errors.certificationFile}>
                                        {cfErrorText}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                    <View className="w-full mt-[-4px]">
                        <Controller
                            control={control}
                            name="userType"
                            render={({ field: { value, onChange } }) => {
                                return (
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
                                            selectedTextStyle={{ color: "white", }}
                                            itemTextStyle={{ color: "white", fontSize: 10, }}
                                            containerStyle={{
                                                backgroundColor: "#2a2b2d",
                                                borderWidth: 1,
                                                borderColor: "#3a3a3a",
                                                elevation: 12,
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                            }}
                                            activeColor="#3a3a3a"
                                            onChange={item => {
                                                onChange(item.value);
                                            }}
                                            dropdownPosition="top"
                                        />
                                        <HelperText type="error" visible={!!errors.userType}>
                                            {errors.userType?.message as string}
                                        </HelperText>
                                    </View>
                                );
                            }}
                        />
                    </View> */}
                </View>
                <Button style={{ width: '95%', borderRadius: 5 }} buttonColor='black' mode="contained" onPress={handleSubmit(onSubmit)} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator /> : "İleri"}
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
                        onFilled={(code: any) => doVerify(code)}
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
            <Snackbar
                style={{ backgroundColor: '#E53935' }}
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                duration={3000}
                action={{ label: "Kapat", onPress: () => setSnackVisible(false) }}>
                {snackText}
            </Snackbar>
        </View>
    )
}

export default Index

