import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Divider, Icon, IconButton, TextInput, HelperText, Button, Snackbar, Portal } from "react-native-paper";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Location from "expo-location";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { handlePickImage, pickPdf, truncateFileName } from "../utils/pick-document";
import { parseTR } from "../utils/money-helper";

import { ImageOwnerType, ServiceOfferingCreateDto, ServiceOfferingUpdateDto } from "../types";
import { useSheet } from "../context/bottomsheet";
import { resolveApiErrorMessage } from "../utils/error";
import { BUSINESS_TYPES, SERVICE_BY_TYPE, trMoneyRegex } from "../constants";


const LocationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
}).superRefine((v, ctx) => {
    if (v.latitude == null || v.longitude == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Konum seçmelisiniz" });
        return;
    }
});
const PdfAssetSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1).regex(/\.pdf$/i, "PDF uzantılı olmalı"),
    mimeType: z.string().optional(),
    size: z.number().optional(),
}).refine(v => !v.size || v.size <= 5 * 1024 * 1024, {
    message: "En fazla 5 MB",
    path: ["size"],
})
const FreeBaarberFileField = z
    .custom<{ uri: string; name: string; mimeType?: string; size?: number }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            (("uri" in (v as any) && (v as any).uri) ||
                ("name" in (v as any) && (v as any).name)),
        { message: "Lütfen PDF seçiniz." }
    )
    .pipe(PdfAssetSchema);

const schema = z
    .object({
        name: z.string().trim().min(1, "İsim zorunludur"),
        surname: z.string().trim().min(1, "Soyisim zorunludur"),
        image: z
            .object({
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
        freeBarberFile: FreeBaarberFileField,
    })
export type FormFreeBarberValues = z.input<typeof schema>;

export const FormFreeBarberOperation = ({ freeBarberId, isAdd }: { freeBarberId: string; isAdd: boolean; }) => {
    const [snackText, setSnackText] = useState("");
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackIsError, setSnackIsError] = useState<boolean>(false);
    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        trigger,
        watch,
        clearErrors,
        formState: { errors },
    } = useForm<FormFreeBarberValues>({
        resolver: zodResolver(schema),
        shouldFocusError: true,
        mode: 'onChange',
    });

    const image = watch("image");
    const selectedType = watch("type");
    const selectedOfferings = watch("offerings");
    const currentPrices = watch("prices");
    const mapBarberType = (t: string): number => {
        switch (t) {
            case 'MaleHairdresser': return 0;
            case 'FemaleHairdresser': return 1;
            default: return 0;
        }
    };
    const { dismiss } = useSheet('freeBarberMinePanel');
    const pickMainImage = async () => {
        const file = await handlePickImage()
        if (file) setValue('image', file, { shouldDirty: true, shouldValidate: true })
    }
    // const OnSubmit = async (form: FormFreeBarberValues) => {
    //     const existingImageId = mineData?.imageList?.[0]?.id;
    //     const existingOfferings = mineData?.serviceOfferings ?? [];
    //     const offeringsMapped = (form.offerings ?? [])
    //         .map((serviceKey) => {
    //             const priceStr = form.prices?.[serviceKey] ?? "";
    //             const priceNum = parseTR(priceStr);
    //             if (priceNum == null) return null;
    //             if (isAdd) {
    //                 const dto: ServiceOfferingCreateDto = {
    //                     serviceName: serviceKey,
    //                     price: priceNum,

    //                 };
    //                 return dto;
    //             } else {
    //                 const existingId = existingOfferings.find(o => o.serviceName === serviceKey)?.id;
    //                 if (!existingId) return null;

    //                 const dto: ServiceOfferingUpdateDto = {
    //                     id: existingId,
    //                     serviceName: serviceKey,
    //                     price: priceNum,
    //                     ownerId: freeBarberId,
    //                 };
    //                 return dto;
    //             }
    //         })
    //         .filter((x): x is NonNullable<typeof x> => x !== null);
    //     const imageControl =
    //         isAdd && form.image?.uri
    //             ? [{ imageUrl: form.image.uri, ownerType: ImageOwnerType.FreeBarber }] :
    //             !isAdd && form.image?.uri ? [{
    //                 id: existingImageId!,
    //                 imageUrl: form.image.uri,
    //                 imageOwnerId: freeBarberId,
    //                 ownerType: ImageOwnerType.FreeBarber,
    //             }] : [];

    //     const offerings = isAdd
    //         ? (offeringsMapped as ServiceOfferingCreateDto[])
    //         : (offeringsMapped as ServiceOfferingUpdateDto[]);


    //     const payload: any = {
    //         ...(!isAdd ? { id: mineData?.id, freeBarberUserId: mineData?.freeBarberUserId } : {}),
    //         name: form.name.trim(),
    //         surname: form.surname.trim(),
    //         freeBarberImageList: imageControl,
    //         type: mapBarberType(form.type),
    //         latitude: loc.lat,
    //         longitude: loc.lat,
    //         offerings: offerings,
    //     };
    //     try {
    //         var result = isAdd ? await addStore(payload).unwrap() : await update(payload).unwrap();
    //         console.log(result);
    //         if (result.success) {
    //             setSnackText(result.message);
    //             setSnackVisible(true);
    //             dismiss();
    //         }
    //         else {
    //             setSnackText(result.message);
    //             setSnackVisible(true);
    //         }
    //     } catch (error: any) {
    //         const msg = resolveApiErrorMessage(error);
    //         setSnackText(msg);
    //         setSnackVisible(true);
    //     }
    // };
    // const effectiveType = isAdd ? selectedType :  (data?.type ?? undefined);
    // const serviceOptions = useMemo(
    //     () => (effectiveType ? SERVICE_BY_TYPE[effectiveType] ?? [] : []),
    //     [effectiveType]
    // );

    const prevTypeRef = React.useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!isAdd) {
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

    }, [selectedType, setValue]);
    useEffect(() => {
        if (isAdd)
            setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
    }, [selectedType, setValue]);

    useEffect(() => {
        const next: Record<string, string> = { ...(currentPrices ?? {}) };
        let changed = false;
        Object.keys(next).forEach((k) => {
            if (!selectedOfferings.includes(k)) {
                delete next[k];
                changed = true;
            }
        });
        selectedOfferings.forEach((k) => {
            if (!(k in next)) {
                next[k] = "";
                changed = true;
            }
        });
        if (changed) {
            setValue("prices", next, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [selectedOfferings, currentPrices, setValue]);


    return (
        <View className="h-full">
            <View className="flex-row justify-between items-center px-4">
                <Text className="text-white flex-1 font-ibm-plex-sans-regular text-2xl">
                    Panel Düzenleme
                </Text>
                <IconButton onPress={dismiss} icon="close" iconColor="white" />
            </View>

            <Divider style={{ borderWidth: 0.1, backgroundColor: "gray" }} />

            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1 }}>
                <Text className="text-white text-xl mt-4 px-4">{isAdd ? "Panel Resmini Ekle" : "Panel Resmini Güncelle"} </Text>
                <Controller
                    control={control}
                    name="image"
                    render={() => (
                        <View className="flex items-center justify-center px-4 mt-4">
                            <TouchableOpacity
                                onPress={pickMainImage}
                                className="w-full bg-gray-800 rounded-xl overflow-hidden"
                                style={{ aspectRatio: 2 / 1 }}
                                activeOpacity={0.85}
                            >
                                {image?.uri ? (
                                    <Image className="h-full w-full object-cover" source={{ uri: image.uri }} />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Icon source="image" size={40} color="#888" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                />
                <Text className="text-white text-xl mt-6 px-4">Panel Bilgileri</Text>
                <Controller
                    control={control}
                    name="freeBarberFile"
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
                                    label="Vergi levhası (PDF)"
                                    mode="outlined"
                                    value={truncateFileName(value?.name ?? "")}
                                    editable={false}
                                    dense
                                    pointerEvents="none"
                                    textColor="white"
                                    outlineColor={errors.freeBarberFile ? "#b00020" : "#444"}
                                    theme={{
                                        roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" }
                                    }}
                                    style={{ backgroundColor: '#1F2937', borderWidth: 0 }}
                                />
                            </TouchableOpacity>
                            <HelperText type="error" visible={!!errors.freeBarberFile}>
                                {errors?.freeBarberFile?.message as string}
                            </HelperText>
                        </>
                    )}
                />
                <View className="mt-2 px-4 flex-row gap-3">
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
                                        style={{ backgroundColor: "#1F2937", borderWidth: 0 }}
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
                                        style={{ backgroundColor: "#1F2937", borderWidth: 0 }}
                                    />
                                    <HelperText type="error" visible={!!errors.surname}>
                                        {errors?.surname?.message as string}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                </View>
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
                                    onChange={(item: any) => { onChange(item.value); }}
                                    style={{
                                        height: 42,
                                        borderRadius: 10,
                                        paddingHorizontal: 12,
                                        backgroundColor: "#1F2937",
                                        borderWidth: 1,
                                        borderColor: error ? "#b00020" : "#444",
                                        justifyContent: "center",
                                        marginTop: 8,
                                    }}
                                    placeholderStyle={{ color: "gray" }}
                                    selectedTextStyle={{ color: "white" }}
                                    itemTextStyle={{ color: "white" }}
                                    containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10, overflow: "hidden" }}
                                    activeColor="#3a3b3d"
                                />
                                <HelperText type="error" visible={!!error}>
                                    {errors?.type?.message as string}
                                </HelperText>
                            </>
                        )}
                    />
                </View>
                {selectedType ? (
                    <View className="px-4 mt-1">
                        <Text className="text-white text-xl mb-2">Hizmetler ({BUSINESS_TYPES.find(t => t.value === selectedType)?.label})</Text>

                        <Controller
                            control={control}
                            name="offerings"
                            render={({ field: { value, onChange } }) => (
                                <>
                                    {/* <MultiSelect
                                        data={serviceOptions}
                                        labelField="label"
                                        valueField="value"
                                        value={(value ?? []) as string[]}
                                        onChange={(vals: string[]) => onChange(vals)}
                                        placeholder="Hizmet seçin"
                                        dropdownPosition="top"
                                        inside
                                        alwaysRenderSelectedItem
                                        visibleSelectedItem
                                        style={{
                                            backgroundColor: "#1F2937",
                                            borderColor: errors?.offerings ? "#b00020" : "#444",
                                            borderWidth: 1,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                        }}
                                        containerStyle={{
                                            backgroundColor: "#1F2937",
                                            borderWidth: 1,
                                            borderColor: "#444",
                                            borderRadius: 10,
                                            overflow: "hidden",
                                        }}
                                        placeholderStyle={{ color: "gray" }}
                                        selectedTextStyle={{ color: "white" }}
                                        itemTextStyle={{ color: "white" }}
                                        activeColor="#0f766e"
                                        selectedStyle={{
                                            borderRadius: 10,
                                            backgroundColor: "#374151",
                                            borderColor: "#0f766e",
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                        }}
                                        selectedTextProps={{ numberOfLines: 1 }}
                                    /> */}
                                    <HelperText type="error" visible={!!errors.offerings}>
                                        {errors.offerings?.message}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                ) : null}

                {(selectedOfferings ?? []).length > 0 && (
                    <View className="mt-3 mx-4 rounded-xl" style={{ backgroundColor: "#1F2937", paddingVertical: 6, paddingHorizontal: 16 }}>
                        {(selectedOfferings ?? []).map((serviceKey) => {
                            // const label = serviceOptions.find(i => i.value === serviceKey)?.label ?? serviceKey;
                            return (
                                <View key={serviceKey}>
                                    <View className="flex-row items-center gap-2 mb-0">
                                        {/* <Text className="text-white w-[35%]">{label} :</Text> */}

                                        <View className="w-[65%]">
                                            <Controller
                                                control={control}
                                                name={`prices.${serviceKey}` as const}
                                                render={({ field: { value, onChange }, fieldState: { error } }) => (
                                                    <>
                                                        <TextInput
                                                            mode="outlined"
                                                            dense
                                                            keyboardType="numeric"
                                                            label="Fiyat (₺)"
                                                            value={value ?? ""}
                                                            onChangeText={(t) => {
                                                                const raw = t.replace(/[^\d.,]/g, '');
                                                                onChange(raw);
                                                            }}
                                                            onBlur={() => {
                                                                const toTR = (s: string) => {
                                                                    const n = Number(s.replace(/\./g, '').replace(',', '.'));
                                                                    if (Number.isNaN(n)) return s;
                                                                    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
                                                                };
                                                                onChange(toTR(value ?? ''));
                                                            }}
                                                            textColor="white"
                                                            outlineColor={error ? "#b00020" : "#444"}
                                                            style={{ backgroundColor: "#1F2937", borderWidth: 0, marginTop: 20, height: 35 }}
                                                            theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                        />
                                                        <HelperText type="error" visible={!!errors.prices?.[serviceKey]}>
                                                            {errors.prices?.[serviceKey]?.message as string}
                                                        </HelperText>
                                                    </>
                                                )}
                                            />
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
            <View className="px-4 my-3">
                {/* <Button
                    style={{ borderRadius: 10 }}
                    disabled={loading}
                    loading={loading}
                    mode="contained"
                    onPress={handleSubmit(OnSubmit)}
                    buttonColor="#1F2937"
                >
                    {isAdd ? "Ekle" : "Güncelle"}
                </Button> */}
            </View>
            <Portal>
                <Snackbar
                    style={{ backgroundColor: snackIsError ? 'red' : 'green' }}
                    visible={snackVisible}
                    onDismiss={() => setSnackVisible(false)}
                    duration={3000}
                    action={{ label: "Kapat", onPress: () => setSnackVisible(false) }}>
                    {snackText}
                </Snackbar>
            </Portal>
        </View>
    );
}
