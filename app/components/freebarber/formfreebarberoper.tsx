import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Divider, Icon, IconButton, TextInput, HelperText, Button, Switch } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import { handlePickImage, pickPdf, truncateFileName } from "../../utils/form/pick-document";
import { parseTR } from "../../utils/form/money-helper";
import { ImageOwnerType, ServiceOfferingCreateDto, ServiceOfferingUpdateDto } from "../../types";
import { useSheet } from "../../context/bottomsheet";
import { resolveApiErrorMessage } from "../../utils/common/error";
import { BUSINESS_TYPES, SERVICE_BY_TYPE, trMoneyRegex } from "../../constants";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { useSnackbar } from "../../hook/useSnackbar";
import { mapBarberType, mapTypeToLabel } from "../../utils/form/form-mappers";
import {
    useAddFreeBarberPanelMutation,
    useLazyGetFreeBarberMinePanelDetailQuery,
    useUpdateFreeBarberPanelMutation,
} from "../store/api";
import { CrudSkeletonComponent } from "./crudskeleton";

// --- Schema Definitions ---
const LocationSchema = z
    .object({
        latitude: z.number({ required_error: "Konum gerekli" }),
        longitude: z.number({ required_error: "Konum gerekli" }),
    })
    .refine((data) => data.latitude !== 0 && data.longitude !== 0, {
        message: "Konum seçmelisiniz",
        path: ["latitude"],
    });

const PdfAssetSchema = z
    .object({
        uri: z.string().min(1),
        name: z.string().min(1).regex(/\.pdf$/i, "PDF uzantılı olmalı"),
        mimeType: z.string().optional(),
        size: z.number().optional(),
    })
    .refine((v) => !v.size || v.size <= 5 * 1024 * 1024, {
        message: "En fazla 5 MB",
        path: ["size"],
    });

const FreeBarberFileField = z
    .custom<{ uri: string; name: string; mimeType?: string; size?: number }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            (("uri" in (v as any) && (v as any).uri) || ("name" in (v as any) && (v as any).name)),
        { message: "Lütfen PDF seçiniz." }
    )
    .pipe(PdfAssetSchema);

const schema = z.object({
    name: z.string({ required_error: 'İsim gerekli' }).trim().min(1, "En az 1 karakter gerekli"),
    surname: z.string({ required_error: 'Soyisim gerekli' }).trim().min(1, "En az 1 karakter gerekli"),
    image: z
        .object({
            uri: z.string().min(1),
            name: z.string().min(1),
            type: z.string().min(1),
        })
        .optional(),
    type: z.string({ required_error: "İşletme türü zorunlu" }),
    offerings: z.array(z.string()).min(1, "En az bir hizmet seçiniz"),
    prices: z.record(
        z.string(),
        z
            .string({ required_error: "Fiyat zorunlu" })
            .min(1, "Fiyat zorunlu")
            .regex(trMoneyRegex, "Lütfen fiyatı türkiye standartlarında girin")
    ),
    location: LocationSchema, // UI yok ama form state'de olacak
    freeBarberFile: FreeBarberFileField,
    isAvailable: z.boolean().default(true),
});

export type FormFreeBarberValues = z.input<typeof schema>;

type Props = { freeBarberId: string | null; enabled: boolean };

export const FormFreeBarberOperation = ({ freeBarberId, enabled }: Props) => {
    const isEdit = freeBarberId != null;

    const { showSnack, SnackbarComponent } = useSnackbar();

    const [triggerGetFreeBarberPanel, { data }] = useLazyGetFreeBarberMinePanelDetailQuery();
    const [addFreeBarber, { isLoading: addFreeBarberLoad }] = useAddFreeBarberPanelMutation();
    const [updateFreeBarber, { isLoading: updateFreeBarberLoad }] = useUpdateFreeBarberPanelMutation();

    const { dismiss } = useSheet("freeBarberMinePanel");

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
        mode: "onChange",
        defaultValues: {
            isAvailable: true,
            location: { latitude: 0, longitude: 0 },
            offerings: [],
            prices: {},
        },
    });

    const image = watch("image");
    const selectedType = watch("type");
    const selectedOfferings = watch("offerings");
    const currentPrices = watch("prices");


    // Edit ise panel detay çek
    useEffect(() => {
        if (!enabled) return;
        if (!isEdit) return;
        triggerGetFreeBarberPanel(freeBarberId!);
    }, [enabled, isEdit, freeBarberId, triggerGetFreeBarberPanel]);


    const pickMainImage = async () => {
        const file = await handlePickImage();
        if (file) setValue("image", file, { shouldDirty: true, shouldValidate: true });
    };
    const gettingLocRef = useRef(false);
    const setLocationNow = async (): Promise<boolean> => {
        if (gettingLocRef.current) return false;
        gettingLocRef.current = true;
        try {
            const res = await getCurrentLocationSafe();
            if (!res.ok) {
                showSnack(res.message ?? "Konum alınamadı", true);
                return false;
            }
            setValue(
                "location",
                { latitude: res.lat, longitude: res.lon },
                { shouldDirty: true, shouldValidate: true }
            );
            return true;
        } finally {
            gettingLocRef.current = false;
        }
    };

    // ✅ Create modunda: form açılınca 1 kere konumu al ve set et
    const didInitCreateLoc = useRef(false);
    useEffect(() => {
        if (!enabled) return;
        if (isEdit) return;
        if (didInitCreateLoc.current) return;
        didInitCreateLoc.current = true;
        setLocationNow();
    }, [enabled, isEdit]);

    useEffect(() => {
        if (!isEdit) return;
        if (!data) return;

        const firstImage = data?.imageList?.[0];
        const imageUrl = firstImage?.imageUrl;

        const taxPath = (data as any).barberCertificate as string | undefined;
        let pdfName = "tax-document.pdf"; // Varsayılan isim
        if (taxPath) {
            const extractedName = taxPath.split("/").pop();
            if (extractedName) {
                // Eğer çekilen isim .pdf ile bitmiyorsa, biz ekleyelim ki Zod hata vermesin
                pdfName = extractedName.toLowerCase().endsWith('.pdf')
                    ? extractedName
                    : `${extractedName}.pdf`;
            }
        }
        const initialOfferings = (data?.offerings ?? []).map((s: any) => s.serviceName);
        const initialPrices = (data?.offerings ?? []).reduce((acc: Record<string, string>, s: any) => {
            acc[s.serviceName] = String(s.price);
            return acc;
        }, {});

        const initialType = data?.type != null ? mapTypeToLabel(data.type) : "";
        reset({
            ...getValues(),
            name: data?.firstName ?? "",
            surname: data?.lastName ?? "",
            type: initialType,
            isAvailable: data?.isAvailable ?? true,
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
                    name: pdfName, // Düzeltilmiş ismi buraya veriyoruz
                    mimeType: "application/pdf",
                }
                : undefined,
            location: {
                latitude: (data as any)?.latitude ?? 0,
                longitude: (data as any)?.longitude ?? 0
            },
            offerings: initialOfferings,
            prices: initialPrices,
        });
        if (!data?.latitude || data.latitude === 0)
            setLocationNow();

    }, [data, isEdit, reset, getValues]);

    const effectiveType = selectedType ? selectedType : data?.type != null ? mapTypeToLabel(data.type) : undefined;

    const serviceOptions = useMemo(
        () => (effectiveType ? SERVICE_BY_TYPE[effectiveType] ?? [] : []),
        [effectiveType]
    );

    // Tip değişince offering/price reset
    const prevTypeRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (isEdit) {
            if (prevTypeRef.current === undefined) {
                prevTypeRef.current = selectedType;
                return;
            }
            if (selectedType && prevTypeRef.current && selectedType !== prevTypeRef.current) {
                setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
                setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
            }
            prevTypeRef.current = selectedType;
            return;
        }

        // create
        setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
        setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
    }, [selectedType, setValue, isEdit]);

    // prices sync
    useEffect(() => {
        const next: Record<string, string> = { ...(currentPrices ?? {}) };
        let changed = false;

        Object.keys(next).forEach((k) => {
            if (!selectedOfferings?.includes(k)) {
                delete next[k];
                changed = true;
            }
        });

        selectedOfferings?.forEach((k) => {
            if (!(k in next)) {
                next[k] = "";
                changed = true;
            }
        });

        if (changed) setValue("prices", next, { shouldDirty: true, shouldValidate: true });
    }, [selectedOfferings, currentPrices, setValue]);

    const OnSubmit = async (form: FormFreeBarberValues) => {
        if (isEdit) {
            const ok = await setLocationNow();
            if (!ok) return;
            form = { ...form, location: getValues("location") };
        } else {
            if (!form.location?.latitude || !form.location?.longitude || (form.location.latitude === 0 && form.location.longitude === 0)) {
                const ok = await setLocationNow();
                if (!ok) return;
                form = { ...form, location: getValues("location") };
            }
        }

        const existingImageId = data?.imageList?.[0]?.id;
        const existingOfferings = data?.offerings ?? [];

        const offeringsMapped = (form.offerings ?? [])
            .map((serviceKey) => {
                const priceStr = form.prices?.[serviceKey] ?? "";
                const priceNum = parseTR(priceStr);
                if (priceNum == null) return null;

                if (!isEdit) {
                    const dto: ServiceOfferingCreateDto = { serviceName: serviceKey, price: priceNum };
                    return dto;
                } else {
                    const existingId = (existingOfferings as any[]).find((o) => o.serviceName === serviceKey)?.id;
                    const dto: ServiceOfferingUpdateDto = {
                        id: existingId,
                        serviceName: serviceKey,
                        price: priceNum,
                        ownerId: freeBarberId!,
                    };
                    return dto;
                }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

        const imageControl =
            !isEdit && form.image?.uri
                ? [{ imageUrl: form.image.uri, ownerType: ImageOwnerType.FreeBarber }]
                : isEdit && form.image?.uri
                    ? [
                        {
                            id: existingImageId!,
                            imageUrl: form.image.uri,
                            imageOwnerId: freeBarberId!,
                            ownerType: ImageOwnerType.FreeBarber,
                        },
                    ]
                    : [];

        const offerings = !isEdit
            ? (offeringsMapped as ServiceOfferingCreateDto[])
            : (offeringsMapped as ServiceOfferingUpdateDto[]);

        const payload: any = {
            ...(isEdit ? { id: data?.id } : {}),
            firstName: form.name.trim(),
            lastName: form.surname.trim(),
            imageList: imageControl,
            type: mapBarberType(form.type),
            latitude: form.location.latitude,
            longitude: form.location.longitude,
            offerings,
            barberCertificate: form.freeBarberFile.uri,
            isAvailable: isEdit ? form.isAvailable : true,
        };
        // Payload validation passed, proceed with submission

        try {
            const result = !isEdit ? await addFreeBarber(payload).unwrap() : await updateFreeBarber(payload).unwrap();
            if (result.success) {
                showSnack(result.message, false);
                dismiss();
            } else {
                showSnack(result.message, true);
            }
        } catch (error: any) {
            showSnack(resolveApiErrorMessage(error), true);
        }
    };
    const onErrors = (errors: any) => {
        // Validation errors are displayed to user via form state
    };

    // Skeleton sadece edit + data gelene kadar
    const showSkeleton = isEdit && !data;

    return (
        <View className="h-full">
            <View className="flex-row justify-between items-center px-4 py-2">
                <Text className="text-white flex-1 font-ibm-plex-sans-regular text-2xl">
                    {!isEdit ? "Panel Oluştur" : "Panel Düzenleme"}
                </Text>
                <IconButton onPress={dismiss} icon="close" iconColor="white" />
            </View>

            <Divider style={{ borderWidth: 0.1, backgroundColor: "gray" }} />

            {showSkeleton ? (
                <View className="flex-1 pt-4">
                    <CrudSkeletonComponent />
                </View>
            ) : (
                <>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}>
                        <Text className="text-white text-xl mt-4 px-4">{!isEdit ? "Panel Resmini Ekle" : "Panel Resmini Güncelle"} </Text>

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

                        {/* PDF */}
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
                                                style={{ backgroundColor: "#1F2937" }}
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
                        <View className="px-4 mt-0 flex-row gap-3">
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

                        {/* Type */}
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

                        {/* Offerings */}
                        {selectedType ? (
                            <View className="px-4 mt-1">
                                <Text className="text-white text-xl mb-2">
                                    Hizmetler ({BUSINESS_TYPES.find((t) => t.value === selectedType)?.label})
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
                                                dropdownPosition="top"
                                                inside
                                                alwaysRenderSelectedItem
                                                visibleSelectedItem
                                                style={{
                                                    backgroundColor: "#1F2937",
                                                    borderColor: errors.offerings ? "#b00020" : "#444",
                                                    borderWidth: 1,
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 8,
                                                }}
                                                containerStyle={{
                                                    backgroundColor: "#1F2937",
                                                    borderWidth: 1,
                                                    borderColor: '#444',
                                                    borderRadius: 10,
                                                    overflow: 'hidden',

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
                                                    margin: 0,
                                                }}
                                                selectedTextProps={{ numberOfLines: 1 }}


                                            />
                                            <HelperText type="error" visible={!!errors.offerings}>
                                                {errors.offerings?.message}
                                            </HelperText>
                                        </>
                                    )}
                                />
                            </View>
                        ) : null}

                        {/* Prices */}
                        {(selectedOfferings ?? []).length > 0 && (
                            <View className="mt-3 mx-4 rounded-xl bg-gray-800 p-4">
                                {(selectedOfferings ?? []).map((serviceKey) => {
                                    const label = (serviceOptions as any[]).find((i) => i.value === serviceKey)?.label ?? serviceKey;
                                    return (
                                        <View key={serviceKey} className="flex-row items-center justify-between mb-2">
                                            <Text className="text-white w-[40%]" numberOfLines={1}>
                                                {label}
                                            </Text>
                                            <View className="w-[55%]">
                                                <Controller
                                                    control={control}
                                                    name={`prices.${serviceKey}` as const}
                                                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                                                        <TextInput
                                                            mode="outlined"
                                                            dense
                                                            keyboardType="numeric"
                                                            label="Fiyat (₺)"
                                                            value={value ?? ""}
                                                            onChangeText={(t) => onChange(t.replace(/[^\d.,]/g, ""))}
                                                            onBlur={() => {
                                                                const n = Number(value?.replace(/\./g, "").replace(",", "."));
                                                                if (!Number.isNaN(n)) {
                                                                    onChange(
                                                                        new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
                                                                    );
                                                                }
                                                            }}
                                                            textColor="white"
                                                            outlineColor={error ? "#b00020" : "#444"}
                                                            style={{ backgroundColor: "#1F2937", height: 40 }}
                                                            theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                        />
                                                    )}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Availability (sadece edit) */}
                        {isEdit && (
                            <View className="px-4 mt-6">
                                <View className="bg-gray-800 rounded-xl p-4 flex-row items-center justify-between border border-gray-700">
                                    <Text className="text-white text-lg font-bold">Müsaitlik Durumu</Text>
                                    <Controller
                                        control={control}
                                        name="isAvailable"
                                        render={({ field: { value, onChange } }) => (
                                            <Switch value={value} onValueChange={onChange} color="#0f766e" />
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
                            onPress={handleSubmit(OnSubmit, onErrors)}
                            buttonColor="#1F2937"
                            labelStyle={{ fontSize: 16 }}
                        >
                            {!isEdit ? "Ekle" : "Güncelle"}
                        </Button>
                    </View>
                </>
            )}

            <SnackbarComponent />
        </View>
    );
};
