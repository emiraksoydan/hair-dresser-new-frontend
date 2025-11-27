import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Divider, Icon, IconButton, TextInput, HelperText, Button, Snackbar, Portal, Switch } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import { handlePickImage, pickPdf, truncateFileName } from "../utils/pick-document";
import { parseTR } from "../utils/money-helper";
import { ImageOwnerType, ServiceOfferingCreateDto, ServiceOfferingUpdateDto } from "../types";
import { useSheet } from "../context/bottomsheet";
import { resolveApiErrorMessage } from "../utils/error";
import { BUSINESS_TYPES, SERVICE_BY_TYPE, trMoneyRegex } from "../constants";
import { useCurrentLocationSafe } from "../utils/location-helper";
import { useAddFreeBarberPanelMutation, useLazyGetFreeBarberMinePanelDetailQuery, useUpdateFreeBarberPanelMutation } from "../store/api";

// --- Schema Definitions ---

const LocationSchema = z.object({
    latitude: z.number({ required_error: "Konum gerekli" }),
    longitude: z.number({ required_error: "Konum gerekli" }),
}).refine((data) => data.latitude !== 0 && data.longitude !== 0, {
    message: "Konum seçmelisiniz",
    path: ["latitude"], // Hata mesajını latitude altına iliştirir
});

const PdfAssetSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1).regex(/\.pdf$/i, "PDF uzantılı olmalı"),
    mimeType: z.string().optional(),
    size: z.number().optional(),
}).refine(v => !v.size || v.size <= 5 * 1024 * 1024, {
    message: "En fazla 5 MB",
    path: ["size"],
});

const FreeBarberFileField = z
    .custom<{ uri: string; name: string; mimeType?: string; size?: number }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            (("uri" in (v as any) && (v as any).uri) ||
                ("name" in (v as any) && (v as any).name)),
        { message: "Lütfen PDF seçiniz." }
    )
    .pipe(PdfAssetSchema);

const schema = z.object({
    name: z.string().trim().min(1, "İsim zorunludur"),
    surname: z.string().trim().min(1, "Soyisim zorunludur"),
    image: z.object({
        uri: z.string().min(1),
        name: z.string().min(1),
        type: z.string().min(1),
    }).optional(),
    type: z.string({ required_error: 'İşletme türü zorunlu' }),
    offerings: z.array(z.string()).min(1, 'En az bir hizmet seçiniz'),
    prices: z.record(
        z.string(),
        z.string({ required_error: 'Fiyat zorunlu' }).min(1, 'Fiyat zorunlu').regex(trMoneyRegex, 'Lütfen fiyatı türkiye standartlarında girin')
    ),
    location: LocationSchema,
    freeBarberFile: FreeBarberFileField,
    isAvailable: z.boolean().default(true), // Yeni eklenen alan
});

export type FormFreeBarberValues = z.input<typeof schema>;

export const FormFreeBarberOperation = ({ freeBarberId, enabled }: { freeBarberId: string; enabled: boolean }) => {
    const [snackText, setSnackText] = useState("");
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackIsError, setSnackIsError] = useState<boolean>(false);

    const [triggerGetFreeBarberPanel, { data }] = useLazyGetFreeBarberMinePanelDetailQuery();
    const [addFreeBarber, { isLoading: addFreeBarberLoad }] = useAddFreeBarberPanelMutation();
    const [updateFreeBarber, { isLoading: updateFreeBarberLoad }] = useUpdateFreeBarberPanelMutation();

    const { dismiss } = useSheet('freeBarberMinePanel');
    const { coords, retry } = useCurrentLocationSafe(true);

    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormFreeBarberValues>({
        resolver: zodResolver(schema),
        shouldFocusError: true,
        mode: 'onChange',
        defaultValues: {
            isAvailable: true, // Varsayılan değer
        }
    });

    const image = watch("image");
    const selectedType = watch("type");
    const selectedOfferings = watch("offerings");
    const currentPrices = watch("prices");

    useEffect(() => {
        if (enabled && freeBarberId != null) {
            triggerGetFreeBarberPanel(freeBarberId);
        }
    }, [enabled, freeBarberId, triggerGetFreeBarberPanel]);

    const mapBarberType = (t: string): number => {
        switch (t) {
            case 'MaleHairdresser': return 0;
            case 'FemaleHairdresser': return 1;
            default: return 0;
        }
    };

    const pickMainImage = async () => {
        const file = await handlePickImage();
        if (file) setValue('image', file, { shouldDirty: true, shouldValidate: true });
    };

    const OnSubmit = async (form: FormFreeBarberValues) => {
        retry();
        const existingImageId = data?.imageList?.[0]?.id;
        const existingOfferings = data?.offerings ?? [];

        // Offering Mapping Logic
        const offeringsMapped = (form.offerings ?? [])
            .map((serviceKey) => {
                const priceStr = form.prices?.[serviceKey] ?? "";
                const priceNum = parseTR(priceStr);
                if (priceNum == null) return null;

                if (freeBarberId == null) {
                    const dto: ServiceOfferingCreateDto = {
                        serviceName: serviceKey,
                        price: priceNum,
                    };
                    return dto;
                } else {
                    const existingId = existingOfferings.find(o => o.serviceName === serviceKey)?.id;
                    const dto: ServiceOfferingUpdateDto = {
                        id: existingId,
                        serviceName: serviceKey,
                        price: priceNum,
                        ownerId: freeBarberId,
                    };
                    return dto;
                }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

        const imageControl =
            freeBarberId == null && form.image?.uri
                ? [{ imageUrl: form.image.uri, ownerType: ImageOwnerType.FreeBarber }] :
                freeBarberId != null && form.image?.uri ? [{
                    id: existingImageId!,
                    imageUrl: form.image.uri,
                    imageOwnerId: freeBarberId,
                    ownerType: ImageOwnerType.FreeBarber,
                }] : [];

        const offerings = freeBarberId == null
            ? (offeringsMapped as ServiceOfferingCreateDto[])
            : (offeringsMapped as ServiceOfferingUpdateDto[]);

        // *** DÜZELTME: isAvailable mantığı ***
        // Eğer freeBarberId null ise (yeni kayıt) -> true
        // Değilse formdan gelen değeri kullan.
        const availabilityStatus = freeBarberId == null ? true : form.isAvailable;

        const payload: any = {
            ...(freeBarberId != null ? { id: data?.id } : {}),
            firstName: form.name.trim(),
            lastName: form.surname.trim(),
            imageList: imageControl,
            type: mapBarberType(form.type),
            latitude: coords?.lat,
            longitude: coords?.lon,
            offerings: offerings,
            barberCertificate: form.freeBarberFile,
            isAvailable: availabilityStatus,
        };

        try {
            var result = freeBarberId == null ? await addFreeBarber(payload).unwrap() : await updateFreeBarber(payload).unwrap();

            if (result.success) {
                setSnackText(result.message);
                setSnackIsError(false);
                setSnackVisible(true);
                dismiss();
            }
            else {
                setSnackText(result.message);
                setSnackIsError(true);
                setSnackVisible(true);
            }
        } catch (error: any) {
            const msg = resolveApiErrorMessage(error);
            setSnackText(msg);
            setSnackIsError(true);
            setSnackVisible(true);
        }
    };

    const effectiveType = freeBarberId == null ? selectedType : (data?.type ?? undefined);

    const serviceOptions = useMemo(
        () => (effectiveType ? SERVICE_BY_TYPE[effectiveType] ?? [] : []),
        [effectiveType]
    );

    // Tip değişince offeringleri sıfırlama mantığı
    const prevTypeRef = React.useRef<string | undefined>(undefined);
    useEffect(() => {
        if (freeBarberId != null) {
            if (prevTypeRef.current === undefined) {
                prevTypeRef.current = selectedType;
                return;
            }
            if (selectedType && prevTypeRef.current && selectedType !== prevTypeRef.current) {
                setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
                setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
            }
            prevTypeRef.current = selectedType;
        }
    }, [selectedType, setValue, freeBarberId]);

    useEffect(() => {
        if (freeBarberId == null)
            setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
    }, [selectedType, setValue, freeBarberId]);

    // Fiyat alanlarını dinamik yönetme
    useEffect(() => {
        const next: Record<string, string> = { ...(currentPrices ?? {}) };
        let changed = false;

        // Seçilmeyenleri sil
        Object.keys(next).forEach((k) => {
            if (!selectedOfferings?.includes(k)) {
                delete next[k];
                changed = true;
            }
        });

        // Yeni seçilenleri ekle
        selectedOfferings?.forEach((k) => {
            if (!(k in next)) {
                next[k] = "";
                changed = true;
            }
        });

        if (changed) {
            setValue("prices", next, { shouldDirty: true, shouldValidate: true });
        }
    }, [selectedOfferings, currentPrices, setValue]);

    // Veri geldiğinde formu doldurma (Reset)
    useEffect(() => {
        if (!data && freeBarberId == null) return;

        if (data) {
            const firstImage = data?.imageList?.[0];
            const imageUrl = firstImage?.imageUrl;
            const taxPath = (data as any).barberCertificate as string | undefined;
            const initialOfferings = (data?.offerings ?? []).map(s => s.serviceName);
            const initialPrices = (data?.offerings ?? []).reduce((acc, s) => {
                acc[s.serviceName] = String(s.price);
                return acc;
            }, {} as Record<string, string>);

            reset({
                ...getValues(),
                name: data?.firstName,
                surname: data?.lastName,
                type: String(data?.type),
                isAvailable: data?.isAvailable ?? true, // Gelen veriyi form state'ine atıyoruz
                image: imageUrl
                    ? {
                        uri: imageUrl,
                        name: imageUrl.split("/").pop() ?? `image-${data?.id}.jpg`,
                        type: imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
                    }
                    : undefined,
                freeBarberFile: taxPath
                    ? {
                        uri: taxPath,
                        name: taxPath.split("/").pop() ?? "tax-document.pdf",
                        mimeType: "application/pdf",
                    }
                    : undefined,
                location: {
                    latitude: coords?.lat ?? 0,
                    longitude: coords?.lon ?? 0,
                },
                offerings: initialOfferings,
                prices: initialPrices,
            });
        }
    }, [data, reset, getValues, freeBarberId, coords]);

    return (
        <View className="h-full bg-gray-900">
            <View className="flex-row justify-between items-center px-4 py-2">
                <Text className="text-white flex-1 font-ibm-plex-sans-regular text-2xl">
                    {freeBarberId == null ? "Panel Oluştur" : "Panel Düzenleme"}
                </Text>
                <IconButton onPress={dismiss} icon="close" iconColor="white" />
            </View>

            <Divider style={{ borderWidth: 0.1, backgroundColor: "gray" }} />

            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}>
                <Text className="text-white text-xl mt-4 px-4">{freeBarberId == null ? "Panel Resmini Ekle" : "Panel Resmini Güncelle"} </Text>

                {/* Image Picker */}
                <Controller
                    control={control}
                    name="image"
                    render={() => (
                        <View className="flex items-center justify-center px-4 mt-4">
                            <TouchableOpacity
                                onPress={pickMainImage}
                                className="w-full bg-gray-800 rounded-xl overflow-hidden border border-gray-700"
                                style={{ aspectRatio: 2 / 1 }}
                                activeOpacity={0.85}
                            >
                                {image?.uri ? (
                                    <Image className="h-full w-full object-cover" source={{ uri: image.uri }} />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Icon source="image-plus" size={40} color="#888" />
                                        <Text className="text-gray-500 mt-2">Resim Seç</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                />

                <Text className="text-white text-xl mt-6 px-4">Panel Bilgileri</Text>

                {/* PDF File Picker */}
                <View className="px-4 mt-2">
                    <Controller
                        control={control}
                        name="freeBarberFile"
                        render={({ field: { value, onChange } }) => (
                            <>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={async () => {
                                        const file = await pickPdf();
                                        if (file) onChange(file);
                                    }}
                                >
                                    <TextInput
                                        label="Vergi levhası (PDF)"
                                        mode="outlined"
                                        value={truncateFileName(value?.name ?? "")}
                                        editable={false}
                                        dense
                                        pointerEvents="none"
                                        textColor="white"
                                        outlineColor={errors.freeBarberFile ? "#b00020" : "#444"}
                                        right={<TextInput.Icon icon="file-pdf-box" color="white" />}
                                        theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                        style={{ backgroundColor: '#1F2937' }}
                                    />
                                </TouchableOpacity>
                                <HelperText type="error" visible={!!errors.freeBarberFile}>
                                    {errors?.freeBarberFile?.message as string}
                                </HelperText>
                            </>
                        )}
                    />
                </View>

                {/* Name / Surname */}
                <View className="px-4 mt-1 flex-row gap-3">
                    <View className="flex-1">
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        label="İsim"
                                        mode="outlined"
                                        dense
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        textColor="white"
                                        outlineColor={errors.name ? "#b00020" : "#444"}
                                        theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                        style={{ backgroundColor: "#1F2937" }}
                                    />
                                    <HelperText type="error" visible={!!errors.name}>
                                        {errors?.name?.message as string}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                    <View className="flex-1">
                        <Controller
                            control={control}
                            name="surname"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        label="Soyisim"
                                        mode="outlined"
                                        dense
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        textColor="white"
                                        outlineColor={errors.surname ? "#b00020" : "#444"}
                                        theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                        style={{ backgroundColor: "#1F2937" }}
                                    />
                                    <HelperText type="error" visible={!!errors.surname}>
                                        {errors?.surname?.message as string}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                </View>

                {/* Business Type Dropdown */}
                <View className="px-4 mt-1">
                    <Controller
                        control={control}
                        name="type"
                        render={({ field: { value, onChange }, fieldState: { error } }) => (
                            <>
                                <Dropdown
                                    data={BUSINESS_TYPES as any}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="İş tanımı seç"
                                    value={value}
                                    onChange={(item: any) => onChange(item.value)}
                                    style={{
                                        height: 50,
                                        borderRadius: 10,
                                        paddingHorizontal: 12,
                                        backgroundColor: "#1F2937",
                                        borderWidth: 1,
                                        borderColor: error ? "#b00020" : "#444",
                                        marginTop: 6,
                                    }}
                                    placeholderStyle={{ color: "gray" }}
                                    selectedTextStyle={{ color: "white" }}
                                    itemTextStyle={{ color: "white" }}
                                    containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10 }}
                                    activeColor="#374151"
                                />
                                <HelperText type="error" visible={!!error}>
                                    {errors?.type?.message as string}
                                </HelperText>
                            </>
                        )}
                    />
                </View>

                {/* Offerings and Prices */}
                {selectedType ? (
                    <View className="px-4 mt-1">
                        <Text className="text-white text-xl mb-2">
                            Hizmetler ({BUSINESS_TYPES.find(t => t.value === selectedType)?.label})
                        </Text>
                        <Controller
                            control={control}
                            name="offerings"
                            render={({ field: { value, onChange } }) => (
                                <>
                                    <MultiSelect
                                        data={serviceOptions}
                                        labelField="label"
                                        valueField="value"
                                        value={(value ?? []) as string[]}
                                        onChange={onChange}
                                        placeholder="Hizmet seçin"
                                        style={{
                                            backgroundColor: "#1F2937",
                                            borderColor: errors?.offerings ? "#b00020" : "#444",
                                            borderWidth: 1,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 12,
                                        }}
                                        containerStyle={{ backgroundColor: "#1F2937", borderColor: "#444", borderRadius: 10 }}
                                        placeholderStyle={{ color: "gray" }}
                                        selectedTextStyle={{ color: "white" }}
                                        itemTextStyle={{ color: "white" }}
                                        activeColor="#374151"
                                        selectedStyle={{ borderRadius: 10, backgroundColor: "#374151", borderColor: "#0f766e" }}
                                    />
                                    <HelperText type="error" visible={!!errors.offerings}>
                                        {errors.offerings?.message}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                ) : null}

                {(selectedOfferings ?? []).length > 0 && (
                    <View className="mt-3 mx-4 rounded-xl bg-gray-800 p-4">
                        {(selectedOfferings ?? []).map((serviceKey) => {
                            const label = serviceOptions.find(i => i.value === serviceKey)?.label ?? serviceKey;
                            return (
                                <View key={serviceKey} className="flex-row items-center justify-between mb-2">
                                    <Text className="text-white w-[40%]" numberOfLines={1}>{label}</Text>
                                    <View className="w-[55%]">
                                        <Controller
                                            control={control}
                                            name={`prices.${serviceKey}` as const}
                                            render={({ field: { value, onChange }, fieldState: { error } }) => (
                                                <View>
                                                    <TextInput
                                                        mode="outlined"
                                                        dense
                                                        keyboardType="numeric"
                                                        label="Fiyat (₺)"
                                                        value={value ?? ""}
                                                        onChangeText={(t) => onChange(t.replace(/[^\d.,]/g, ''))}
                                                        onBlur={() => {
                                                            const n = Number(value?.replace(/\./g, '').replace(',', '.'));
                                                            if (!Number.isNaN(n)) {
                                                                onChange(new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n));
                                                            }
                                                        }}
                                                        textColor="white"
                                                        outlineColor={error ? "#b00020" : "#444"}
                                                        style={{ backgroundColor: "#1F2937", height: 40 }}
                                                        theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                    />
                                                </View>
                                            )}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* --- MÜSAİTLİK DURUMU SWITCH --- */}
                {/* Sadece Edit modunda (freeBarberId != null) gösterilir */}
                {freeBarberId != null && (
                    <View className="px-4 mt-6">
                        <View className="bg-gray-800 rounded-xl p-4 flex-row items-center justify-between border border-gray-700">
                            <Text className="text-white text-lg font-bold">Müsaitlik Durumu</Text>
                            <Controller
                                control={control}
                                name="isAvailable"
                                render={({ field: { value, onChange } }) => (
                                    <Switch
                                        value={value}
                                        onValueChange={onChange}
                                        color="#0f766e" // Vurgu rengi
                                    />
                                )}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>
            <View className="px-4 my-4">
                <Button
                    style={{ borderRadius: 10, paddingVertical: 4 }}
                    disabled={addFreeBarberLoad || updateFreeBarberLoad}
                    loading={addFreeBarberLoad || updateFreeBarberLoad}
                    mode="contained"
                    onPress={handleSubmit(OnSubmit)}
                    buttonColor="#1F2937"
                    labelStyle={{ fontSize: 16 }}
                >
                    {freeBarberId == null ? "Ekle" : "Güncelle"}
                </Button>
            </View>

            <Portal>
                <Snackbar
                    style={{ backgroundColor: snackIsError ? '#b91c1c' : '#15803d' }}
                    visible={snackVisible}
                    onDismiss={() => setSnackVisible(false)}
                    duration={3000}
                    action={{ label: "Tamam", onPress: () => setSnackVisible(false), textColor: 'white' }}>
                    {snackText}
                </Snackbar>
            </Portal>
        </View>
    );
}


// import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
// import { Divider, Icon, IconButton, TextInput, HelperText, Button, Snackbar, Portal } from "react-native-paper";
// import { useForm, Controller, useWatch } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as Location from "expo-location";
// import { Dropdown, MultiSelect } from "react-native-element-dropdown";
// import { BottomSheetModal } from "@gorhom/bottom-sheet";
// import { handlePickImage, pickPdf, truncateFileName } from "../utils/pick-document";
// import { parseTR } from "../utils/money-helper";
// import { ImageOwnerType, ServiceOfferingCreateDto, ServiceOfferingUpdateDto } from "../types";
// import { useSheet } from "../context/bottomsheet";
// import { resolveApiErrorMessage } from "../utils/error";
// import { BUSINESS_TYPES, SERVICE_BY_TYPE, trMoneyRegex } from "../constants";
// import { useCurrentLocationSafe } from "../utils/location-helper";
// import { useAddFreeBarberPanelMutation, useLazyGetFreeBarberMinePanelDetailQuery, useUpdateFreeBarberPanelMutation } from "../store/api";


// const LocationSchema = z.object({
//     latitude: z.number(),
//     longitude: z.number(),
// }).superRefine((v, ctx) => {
//     if (v.latitude == null || v.longitude == null) {
//         ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Konum seçmelisiniz" });
//         return;
//     }
// });
// const PdfAssetSchema = z.object({
//     uri: z.string().min(1),
//     name: z.string().min(1).regex(/\.pdf$/i, "PDF uzantılı olmalı"),
//     mimeType: z.string().optional(),
//     size: z.number().optional(),
// }).refine(v => !v.size || v.size <= 5 * 1024 * 1024, {
//     message: "En fazla 5 MB",
//     path: ["size"],
// })
// const FreeBaarberFileField = z
//     .custom<{ uri: string; name: string; mimeType?: string; size?: number }>(
//         (v) =>
//             !!v &&
//             typeof v === "object" &&
//             (("uri" in (v as any) && (v as any).uri) ||
//                 ("name" in (v as any) && (v as any).name)),
//         { message: "Lütfen PDF seçiniz." }
//     )
//     .pipe(PdfAssetSchema);

// const schema = z
//     .object({
//         name: z.string().trim().min(1, "İsim zorunludur"),
//         surname: z.string().trim().min(1, "Soyisim zorunludur"),
//         image: z
//             .object({
//                 uri: z.string().min(1),
//                 name: z.string().min(1),
//                 type: z.string().min(1),
//             }).optional(),
//         type: z.string({ required_error: 'İşletme türü zorunlu' }),
//         offerings: z.array(z.string()).min(1, 'En az bir hizmet seçiniz'),
//         prices: z.record(
//             z.string(),
//             z.string({ required_error: 'Fiyat zorunlu' }).min(1, 'Fiyat zorunlu').regex(trMoneyRegex, 'Lütfen fiyatı türkiye standartlarında girin')
//         ),
//         location: LocationSchema,
//         freeBarberFile: FreeBaarberFileField,
//     })
// export type FormFreeBarberValues = z.input<typeof schema>;

// export const FormFreeBarberOperation = ({ freeBarberId, enabled }: { freeBarberId: string; enabled: boolean }) => {
//     const [snackText, setSnackText] = useState("");
//     const [snackVisible, setSnackVisible] = useState(false);
//     const [snackIsError, setSnackIsError] = useState<boolean>(false);
//     const [triggerGetFreeBarberPanel, { data, isLoading, isError, error }] = useLazyGetFreeBarberMinePanelDetailQuery();
//     useEffect(() => {
//         if (enabled && freeBarberId != null) {
//             triggerGetFreeBarberPanel(freeBarberId);
//         }
//     }, [enabled, freeBarberId, triggerGetFreeBarberPanel]);

//     const {
//         control,
//         handleSubmit,
//         setValue,
//         getValues,
//         trigger,
//         watch,
//         reset,
//         formState: { errors },
//     } = useForm<FormFreeBarberValues>({
//         resolver: zodResolver(schema),
//         shouldFocusError: true,
//         mode: 'onChange',
//     });

//     const image = watch("image");
//     const selectedType = watch("type");
//     const selectedOfferings = watch("offerings");
//     const currentPrices = watch("prices");
//     const mapBarberType = (t: string): number => {
//         switch (t) {
//             case 'MaleHairdresser': return 0;
//             case 'FemaleHairdresser': return 1;
//             default: return 0;
//         }
//     };
//     const { dismiss } = useSheet('freeBarberMinePanel');
//     const pickMainImage = async () => {
//         const file = await handlePickImage()
//         if (file) setValue('image', file, { shouldDirty: true, shouldValidate: true })
//     }
//     const { status: locationStatus, coords, message: locationMessage, retry } = useCurrentLocationSafe(true);
//     const [addFreeBarber, { isLoading: addFreeBarberLoad }] = useAddFreeBarberPanelMutation();
//     const [updateFreeBarber, { isLoading: updateFreeBarberLoad }] = useUpdateFreeBarberPanelMutation();

//     const OnSubmit = async (form: FormFreeBarberValues) => {
//         retry();
//         const existingImageId = data?.imageList?.[0]?.id;
//         const existingOfferings = data?.offerings ?? [];
//         const offeringsMapped = (form.offerings ?? [])
//             .map((serviceKey) => {
//                 const priceStr = form.prices?.[serviceKey] ?? "";
//                 const priceNum = parseTR(priceStr);
//                 if (priceNum == null) return null;
//                 if (freeBarberId == null) {
//                     const dto: ServiceOfferingCreateDto = {
//                         serviceName: serviceKey,
//                         price: priceNum,

//                     };
//                     return dto;
//                 } else {
//                     const existingId = existingOfferings.find(o => o.serviceName === serviceKey)?.id;
//                     if (!existingId) return null;
//                     const dto: ServiceOfferingUpdateDto = {
//                         id: existingId,
//                         serviceName: serviceKey,
//                         price: priceNum,
//                         ownerId: freeBarberId,
//                     };
//                     return dto;
//                 }
//             })
//             .filter((x): x is NonNullable<typeof x> => x !== null);
//         const imageControl =
//             freeBarberId == null && form.image?.uri
//                 ? [{ imageUrl: form.image.uri, ownerType: ImageOwnerType.FreeBarber }] :
//                 freeBarberId != null && form.image?.uri ? [{
//                     id: existingImageId!,
//                     imageUrl: form.image.uri,
//                     imageOwnerId: freeBarberId,
//                     ownerType: ImageOwnerType.FreeBarber,
//                 }] : [];

//         const offerings = freeBarberId == null
//             ? (offeringsMapped as ServiceOfferingCreateDto[])
//             : (offeringsMapped as ServiceOfferingUpdateDto[]);

//         const payload: any = {
//             ...(freeBarberId != null ? { id: data?.id, freeBarberUserId: data?.freeBarberUserId } : {}),
//             firstName: form.name.trim(),
//             lastName: form.surname.trim(),
//             imageList: imageControl,
//             type: mapBarberType(form.type),
//             latitude: coords?.lat,
//             longitude: coords?.lon,
//             offerings: offerings,
//             barberCertificate: form.freeBarberFile,
//             isAvailable: freeBarberId == null ? true : data?.isAvailable,
//         };
//         try {
//             var result = freeBarberId == null ? await addFreeBarber(payload).unwrap() : await updateFreeBarber(payload).unwrap();

//             if (result.success) {
//                 setSnackText(result.message);
//                 setSnackVisible(true);
//                 dismiss();
//             }
//             else {
//                 setSnackText(result.message);
//                 setSnackVisible(true);
//             }
//         } catch (error: any) {
//             const msg = resolveApiErrorMessage(error);
//             setSnackText(msg);
//             setSnackVisible(true);
//         }
//     };
//     const effectiveType = freeBarberId == null ? selectedType : (data?.type ?? undefined);
//     const serviceOptions = useMemo(
//         () => (effectiveType ? SERVICE_BY_TYPE[effectiveType] ?? [] : []),
//         [effectiveType]
//     );
//     const prevTypeRef = React.useRef<string | undefined>(undefined);

//     useEffect(() => {
//         if (freeBarberId != null) {
//             if (prevTypeRef.current === undefined) {
//                 prevTypeRef.current = selectedType;
//                 return;
//             }
//             if (selectedType && prevTypeRef.current && selectedType !== prevTypeRef.current) {
//                 setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
//                 setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
//             }
//             prevTypeRef.current = selectedType;
//         }

//     }, [selectedType, setValue]);
//     useEffect(() => {
//         if (freeBarberId == null)
//             setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
//     }, [selectedType, setValue]);

//     useEffect(() => {
//         const next: Record<string, string> = { ...(currentPrices ?? {}) };
//         let changed = false;
//         Object.keys(next).forEach((k) => {
//             if (!selectedOfferings.includes(k)) {
//                 delete next[k];
//                 changed = true;
//             }
//         });
//         selectedOfferings.forEach((k) => {
//             if (!(k in next)) {
//                 next[k] = "";
//                 changed = true;
//             }
//         });
//         if (changed) {
//             setValue("prices", next, {
//                 shouldDirty: true,
//                 shouldValidate: true,
//             });
//         }
//     }, [selectedOfferings, currentPrices, setValue]);

//     useEffect(() => {
//         if (!data && freeBarberId == null)
//             return;
//         else {
//             const firstImage = data?.imageList?.[0];
//             const imageUrl = firstImage?.imageUrl;
//             const taxPath = (data as any).barberCertificate as string | undefined;
//             const initialOfferings = (data?.offerings ?? []).map(s => s.serviceName);
//             const initialPrices = (data?.offerings ?? []).reduce((acc, s) => {
//                 acc[s.serviceName] = String(s.price);
//                 return acc;
//             }, {} as Record<string, string>);

//             reset({
//                 ...getValues(),
//                 name: data?.firstName,
//                 surname: data?.lastName,
//                 type: String(data?.type),
//                 image: imageUrl
//                     ? {
//                         uri: imageUrl,
//                         name: imageUrl.split("/").pop() ?? `image-${data?.id}.jpg`,
//                         type: imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
//                     }
//                     : undefined,
//                 freeBarberFile: taxPath
//                     ? {
//                         uri: taxPath,
//                         name: taxPath.split("/").pop() ?? "tax-document.pdf",
//                         mimeType: "application/pdf",
//                     }
//                     : undefined,
//                 location: {
//                     latitude: coords?.lat,
//                     longitude: coords?.lon,
//                 },
//                 offerings: initialOfferings,
//                 prices: initialPrices,

//             });
//         }

//     }, [data, reset, getValues, freeBarberId]);


//     return (
//         <View className="h-full">
//             <View className="flex-row justify-between items-center px-4">
//                 <Text className="text-white flex-1 font-ibm-plex-sans-regular text-2xl">
//                     Panel Düzenleme
//                 </Text>
//                 <IconButton onPress={dismiss} icon="close" iconColor="white" />
//             </View>

//             <Divider style={{ borderWidth: 0.1, backgroundColor: "gray" }} />

//             <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1 }}>
//                 <Text className="text-white text-xl mt-4 px-4">{freeBarberId == null ? "Panel Resmini Ekle" : "Panel Resmini Güncelle"} </Text>
//                 <Controller
//                     control={control}
//                     name="image"
//                     render={() => (
//                         <View className="flex items-center justify-center px-4 mt-4">
//                             <TouchableOpacity
//                                 onPress={pickMainImage}
//                                 className="w-full bg-gray-800 rounded-xl overflow-hidden"
//                                 style={{ aspectRatio: 2 / 1 }}
//                                 activeOpacity={0.85}
//                             >
//                                 {image?.uri ? (
//                                     <Image className="h-full w-full object-cover" source={{ uri: image.uri }} />
//                                 ) : (
//                                     <View className="flex-1 items-center justify-center">
//                                         <Icon source="image" size={40} color="#888" />
//                                     </View>
//                                 )}
//                             </TouchableOpacity>
//                         </View>
//                     )}
//                 />
//                 <Text className="text-white text-xl mt-6 px-4">Panel Bilgileri</Text>
//                 <Controller
//                     control={control}
//                     name="freeBarberFile"
//                     render={({ field: { value, onChange } }) => (
//                         <>
//                             <TouchableOpacity
//                                 activeOpacity={0.85}
//                                 onPress={async () => {
//                                     const file = await pickPdf();
//                                     if (!file) return;
//                                     onChange(file);
//                                 }}
//                             >
//                                 <TextInput
//                                     label="Vergi levhası (PDF)"
//                                     mode="outlined"
//                                     value={truncateFileName(value?.name ?? "")}
//                                     editable={false}
//                                     dense
//                                     pointerEvents="none"
//                                     textColor="white"
//                                     outlineColor={errors.freeBarberFile ? "#b00020" : "#444"}
//                                     theme={{
//                                         roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" }
//                                     }}
//                                     style={{ backgroundColor: '#1F2937', borderWidth: 0 }}
//                                 />
//                             </TouchableOpacity>
//                             <HelperText type="error" visible={!!errors.freeBarberFile}>
//                                 {errors?.freeBarberFile?.message as string}
//                             </HelperText>
//                         </>
//                     )}
//                 />
//                 <View className="mt-2 px-4 flex-row gap-3">
//                     <View className="flex-1">
//                         <Controller
//                             control={control}
//                             name="name"
//                             render={({ field: { onChange, onBlur, value } }) => (
//                                 <>
//                                     <TextInput
//                                         label="İsim"
//                                         mode="outlined"
//                                         dense
//                                         value={value}
//                                         onChangeText={onChange}
//                                         onBlur={onBlur}
//                                         textColor="white"
//                                         outlineColor={errors.name ? "#b00020" : "#444"}
//                                         theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
//                                         style={{ backgroundColor: "#1F2937", borderWidth: 0 }}
//                                     />
//                                     <HelperText type="error" visible={!!errors.name}>
//                                         {errors?.name?.message as string}
//                                     </HelperText>
//                                 </>
//                             )}
//                         />
//                     </View>
//                     <View className="flex-1">
//                         <Controller
//                             control={control}
//                             name="surname"
//                             render={({ field: { onChange, onBlur, value } }) => (
//                                 <>
//                                     <TextInput
//                                         label="Soyisim"
//                                         mode="outlined"
//                                         dense
//                                         value={value}
//                                         onChangeText={onChange}
//                                         onBlur={onBlur}
//                                         textColor="white"
//                                         outlineColor={errors.surname ? "#b00020" : "#444"}
//                                         theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
//                                         style={{ backgroundColor: "#1F2937", borderWidth: 0 }}
//                                     />
//                                     <HelperText type="error" visible={!!errors.surname}>
//                                         {errors?.surname?.message as string}
//                                     </HelperText>
//                                 </>
//                             )}
//                         />
//                     </View>
//                 </View>
//                 <View className="px-4 mt-1">
//                     <Controller
//                         control={control}
//                         name="type"
//                         render={({ field: { value, onChange }, fieldState: { error } }) => (
//                             <>
//                                 <Dropdown
//                                     data={BUSINESS_TYPES as any}
//                                     labelField="label"
//                                     valueField="value"
//                                     placeholder="İş tanımı seç"
//                                     value={value}
//                                     onChange={(item: any) => { onChange(item.value); }}
//                                     style={{
//                                         height: 42,
//                                         borderRadius: 10,
//                                         paddingHorizontal: 12,
//                                         backgroundColor: "#1F2937",
//                                         borderWidth: 1,
//                                         borderColor: error ? "#b00020" : "#444",
//                                         justifyContent: "center",
//                                         marginTop: 8,
//                                     }}
//                                     placeholderStyle={{ color: "gray" }}
//                                     selectedTextStyle={{ color: "white" }}
//                                     itemTextStyle={{ color: "white" }}
//                                     containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10, overflow: "hidden" }}
//                                     activeColor="#3a3b3d"
//                                 />
//                                 <HelperText type="error" visible={!!error}>
//                                     {errors?.type?.message as string}
//                                 </HelperText>
//                             </>
//                         )}
//                     />
//                 </View>
//                 {selectedType ? (
//                     <View className="px-4 mt-1">
//                         <Text className="text-white text-xl mb-2">Hizmetler ({BUSINESS_TYPES.find(t => t.value === selectedType)?.label})</Text>

//                         <Controller
//                             control={control}
//                             name="offerings"
//                             render={({ field: { value, onChange } }) => (
//                                 <>
//                                     <MultiSelect
//                                         data={serviceOptions}
//                                         labelField="label"
//                                         valueField="value"
//                                         value={(value ?? []) as string[]}
//                                         onChange={(vals: string[]) => onChange(vals)}
//                                         placeholder="Hizmet seçin"
//                                         dropdownPosition="top"
//                                         inside
//                                         alwaysRenderSelectedItem
//                                         visibleSelectedItem
//                                         style={{
//                                             backgroundColor: "#1F2937",
//                                             borderColor: errors?.offerings ? "#b00020" : "#444",
//                                             borderWidth: 1,
//                                             borderRadius: 10,
//                                             paddingHorizontal: 12,
//                                             paddingVertical: 8,
//                                         }}
//                                         containerStyle={{
//                                             backgroundColor: "#1F2937",
//                                             borderWidth: 1,
//                                             borderColor: "#444",
//                                             borderRadius: 10,
//                                             overflow: "hidden",
//                                         }}
//                                         placeholderStyle={{ color: "gray" }}
//                                         selectedTextStyle={{ color: "white" }}
//                                         itemTextStyle={{ color: "white" }}
//                                         activeColor="#0f766e"
//                                         selectedStyle={{
//                                             borderRadius: 10,
//                                             backgroundColor: "#374151",
//                                             borderColor: "#0f766e",
//                                             paddingHorizontal: 10,
//                                             paddingVertical: 6,
//                                         }}
//                                         selectedTextProps={{ numberOfLines: 1 }}
//                                     />
//                                     <HelperText type="error" visible={!!errors.offerings}>
//                                         {errors.offerings?.message}
//                                     </HelperText>
//                                 </>
//                             )}
//                         />
//                     </View>
//                 ) : null}

//                 {(selectedOfferings ?? []).length > 0 && (
//                     <View className="mt-3 mx-4 rounded-xl" style={{ backgroundColor: "#1F2937", paddingVertical: 6, paddingHorizontal: 16 }}>
//                         {(selectedOfferings ?? []).map((serviceKey) => {
//                             const label = serviceOptions.find(i => i.value === serviceKey)?.label ?? serviceKey;
//                             return (
//                                 <View key={serviceKey}>
//                                     <View className="flex-row items-center gap-2 mb-0">
//                                         <Text className="text-white w-[35%]">{label} :</Text>
//                                         <View className="w-[65%]">
//                                             <Controller
//                                                 control={control}
//                                                 name={`prices.${serviceKey}` as const}
//                                                 render={({ field: { value, onChange }, fieldState: { error } }) => (
//                                                     <>
//                                                         <TextInput
//                                                             mode="outlined"
//                                                             dense
//                                                             keyboardType="numeric"
//                                                             label="Fiyat (₺)"
//                                                             value={value ?? ""}
//                                                             onChangeText={(t) => {
//                                                                 const raw = t.replace(/[^\d.,]/g, '');
//                                                                 onChange(raw);
//                                                             }}
//                                                             onBlur={() => {
//                                                                 const toTR = (s: string) => {
//                                                                     const n = Number(s.replace(/\./g, '').replace(',', '.'));
//                                                                     if (Number.isNaN(n)) return s;
//                                                                     return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
//                                                                 };
//                                                                 onChange(toTR(value ?? ''));
//                                                             }}
//                                                             textColor="white"
//                                                             outlineColor={error ? "#b00020" : "#444"}
//                                                             style={{ backgroundColor: "#1F2937", borderWidth: 0, marginTop: 20, height: 35 }}
//                                                             theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
//                                                         />
//                                                         <HelperText type="error" visible={!!errors.prices?.[serviceKey]}>
//                                                             {errors.prices?.[serviceKey]?.message as string}
//                                                         </HelperText>
//                                                     </>
//                                                 )}
//                                             />
//                                         </View>
//                                     </View>
//                                 </View>
//                             );
//                         })}
//                     </View>
//                 )}
//             </ScrollView>
//             <View className="px-4 my-3">
//                 <Button
//                     style={{ borderRadius: 10 }}
//                     disabled={addFreeBarberLoad || updateFreeBarberLoad}
//                     loading={addFreeBarberLoad || updateFreeBarberLoad}
//                     mode="contained"
//                     onPress={handleSubmit(OnSubmit)}
//                     buttonColor="#1F2937"
//                 >
//                     {freeBarberId == null ? "Ekle" : "Güncelle"}
//                 </Button>
//             </View>
//             <Portal>
//                 <Snackbar
//                     style={{ backgroundColor: snackIsError ? 'red' : 'green' }}
//                     visible={snackVisible}
//                     onDismiss={() => setSnackVisible(false)}
//                     duration={3000}
//                     action={{ label: "Kapat", onPress: () => setSnackVisible(false) }}>
//                     {snackText}
//                 </Snackbar>
//             </Portal>
//         </View>
//     );
// }
