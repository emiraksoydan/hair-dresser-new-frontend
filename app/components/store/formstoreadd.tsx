import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { Divider, Icon, IconButton, TextInput, HelperText, Button, Avatar, Chip } from 'react-native-paper';
import { useForm, Controller, useWatch, useFieldArray, } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { handlePickImage, pickPdf, truncateFileName } from '../../utils/form/pick-document';
import { useSheet } from '../../context/bottomsheet';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';
import { BUSINESS_TYPES, trMoneyRegex, SERVICE_BY_TYPE, PRICING_OPTIONS, DAYS_TR, IST } from '../../constants'
import 'react-native-get-random-values';
import { v4 as uuid } from "uuid";
import { LegendList } from '@legendapp/list';
import { fmtHHmm, fromHHmm, HOLIDAY_OPTIONS, timeHHmmRegex, toMinutes } from '../../utils/time/time-helper';
import DateTimePicker from "@react-native-community/datetimepicker";
import { parseTR } from '../../utils/form/money-helper';
import * as Location from "expo-location";
import { MapPicker } from '../common/mappicker';
import { useAddBarberStoreMutation } from '../../store/api';
import { BarberStoreCreateDto, ImageOwnerType } from '../../types';
import { resolveApiErrorMessage } from '../../utils/common/error';
import { useSnackbar } from '../../hook/useSnackbar';
import { mapBarberType, mapPricingType } from '../../utils/form/form-mappers';


const ChairPricingSchema = z.object({
    mode: z.enum(["rent", "percent"]),
    rent: z.string().regex(trMoneyRegex, 'Lütfen fiyatı türkiye standartlarında girin').optional(),
    percent: z.coerce
        .number({ required_error: 'Yüzde oranı gerekli' })
        .int("Tam sayı olmalı")
        .min(10, "En az %10")
        .max(90, "En fazla %90")
        .refine(v => v % 10 === 0, "10'un katı olmalı").optional()
}).superRefine((val, ctx) => {
    if (val.mode === "rent") {
        const n = parseTR(val.rent);
        if (n == undefined) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rent"], message: "Saatlik kira fiyatı gerekli" });
        } else if (n <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rent"], message: "Saatlik kira fiyatı pozitif olmalı" });
        }
    }
    else {
        if (val.percent == null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percent"], message: "Yüzde oranı gerekli" });
        }
    }
});
const LocationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    addressDescription: z.string({ required_error: 'Lütfen adres açıklamasını giriniz' }).min(1, "En az 1 karakter girin "),
}).superRefine((v, ctx) => {
    if (v.latitude == null || v.longitude == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Konum seçmelisiniz" });
        return;
    }
});
const WorkingDaySchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    startTime: z.string().regex(timeHHmmRegex, "HH:mm"),
    endTime: z.string().regex(timeHHmmRegex, "HH:mm"),
}).superRefine((v, ctx) => {
    if (v.isClosed) return;
    if (!v.startTime) { ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Başlangıç saati gerekli' }); return; }
    if (!v.endTime) { ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Bitiş saati gerekli' }); return; }
    if (v.startTime === "00:00") {
        ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Başlangıç 00:00 olamaz' });
    }
    const s = toMinutes(v.startTime);
    const e = toMinutes(v.endTime);
    if (s >= e) {
        ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Bitiş, başlangıçtan büyük olmalı' });
        return;
    }
    const diffMin = e - s;
    if (diffMin < 360) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Çalışma süresi en az 6 saat olmalı' });
    if (diffMin > 1080) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Çalışma süresi en fazla 18 saat olmalı' });
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
const TaxDocumentFileField = z
    .custom<{ uri: string; name: string; mimeType?: string; size?: number }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            (("uri" in (v as any) && (v as any).uri) ||
                ("name" in (v as any) && (v as any).name)),
        { message: "Lütfen PDF seçiniz." }
    )
    .pipe(PdfAssetSchema);
const BarberSchema = z.object({
    id: z.string(),
    name: z.string().trim().min(1, "Berber adı gerekli"),
    avatar: z
        .object({ uri: z.string(), name: z.string(), type: z.string().optional() })
        .nullable()
        .optional(),
});
const ChairSchema = z
    .object({
        id: z.string(),
        mode: z.enum(["named", "barber"]),
        name: z.string().trim().optional(),
        barberId: z.string().optional(),
    })
    .superRefine((v, ctx) => {
        if (v.mode === "named") {
            if (!v.name || !v.name.trim()) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "Koltuk için isim gerekli" });
            }
        } else {
            if (!v.barberId) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["barberId"], message: "Berber seçiniz" });
            }
        }
    });

const schema = z.object({
    storeImageUrl: z
        .object({
            uri: z.string().min(1),
            name: z.string().min(1),
            type: z.string().min(1),
        }).optional(),
    storeName: z.string({ required_error: 'İşletme adı zorunlu' }).trim(),
    type: z.string({ required_error: 'İşletme türü zorunlu' }),
    offerings: z.array(z.string()).min(1, 'En az bir hizmet seçiniz'),
    prices: z.record(
        z.string(),
        z.string({ required_error: 'Fiyat zorunlu' }).min(1, 'Fiyat zorunlu').regex(trMoneyRegex, 'Lütfen fiyatı türkiye standartlarında girin')
    ),
    pricingType: ChairPricingSchema,
    workingHours: z.array(WorkingDaySchema).length(7, "7 gün olmalı"),
    holidayDays: z.array(z.number().int().min(0).max(6)).default([]),
    location: LocationSchema,
    taxDocumentFilePath: TaxDocumentFileField,

})

export const fullSchema = schema.extend({
    barbers: z.array(BarberSchema).default([]),
    chairs: z.array(ChairSchema).default([]),
}).superRefine((data, ctx) => {
    const barbers = (data.barbers ?? []) as Array<z.infer<typeof BarberSchema>>;
    const chairs = (data.chairs ?? []) as Array<z.infer<typeof ChairSchema>>;
    const norm = (s?: string) => (s ?? "").trim().toLowerCase();
    const nameToIdxs = new Map<string, number[]>();
    barbers.forEach((b, i) => {
        const k = norm(b.name);
        if (!k) return;
        nameToIdxs.set(k, [...(nameToIdxs.get(k) ?? []), i]);
    });
    for (const [, idxs] of nameToIdxs) {
        if (idxs.length > 1) {
            idxs.forEach((i) =>
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["barbers", i, "name"],
                    message: "Aynı isimde başka bir berber var",
                })
            );
        }
    }
    const assigned = new Map<string, number[]>();
    chairs.forEach((c, i) => {
        if (c.mode === "barber" && c.barberId) {
            assigned.set(c.barberId, [...(assigned.get(c.barberId) ?? []), i]);
        }
    });
    for (const [, idxs] of assigned) {
        if (idxs.length > 1) {
            idxs.forEach((i) =>
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["chairs", i, "barberId"],
                    message: "Bu berber başka koltuğa da atanmış",
                })
            );
        }
    }
});
export type FormValues = z.input<typeof fullSchema>;
const FormStoreAdd = () => {
    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        trigger,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(fullSchema),
        shouldFocusError: true,
        mode: 'onChange',
        defaultValues: {
            holidayDays: [],
            offerings: [],            // iyi olur
            prices: {},               // iyi olur
            workingHours: DAYS_TR.map(d => ({
                dayOfWeek: d.day,
                isClosed: false,
                startTime: "09:00",
                endTime: "18:00",
            })),
            location: {
                latitude: IST.latitude,
                longitude: IST.longitude,
                addressDescription: "",
            },
            barbers: [],
            chairs: [],
            pricingType: { mode: "rent", rent: "", percent: undefined },

        },
    });
    const [addStore, { isLoading, isSuccess }] = useAddBarberStoreMutation();
    const [activeDay, setActiveDay] = useState<number>(1);
    const [activeStart, setActiveStart] = useState(fromHHmm("09:00"));
    const [activeEnd, setActiveEnd] = useState(fromHHmm("18:00"));
    const image = watch("storeImageUrl");
    const selectedType = watch("type");
    const selectedOfferings = watch('offerings');
    const currentPrices = watch('prices');
    const pricingMode = useWatch({ control, name: "pricingType.mode" });
    const holidayDays = watch("holidayDays");
    const working = watch("workingHours");
    const latitude = watch("location.latitude");
    const longitude = watch("location.longitude");
    const address = watch("location.addressDescription");
    const { showSnack, SnackbarComponent } = useSnackbar();
    const { dismiss } = useSheet('addStore');
    const OnSubmit = async (data: FormValues) => {
        const payload: BarberStoreCreateDto = {
            storeName: data.storeName,
            storeImageList: data?.storeImageUrl?.uri
                ? [{ imageUrl: data.storeImageUrl.uri, ownerType: ImageOwnerType.Store }]
                : [],
            type: mapBarberType(data.type),
            pricingType: mapPricingType(data.pricingType.mode),
            addressDescription: data.location.addressDescription,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            pricingValue: data.pricingType.mode == 'percent' ? data.pricingType.percent! : parseTR(data.pricingType.rent)!,
            taxDocumentFilePath: data.taxDocumentFilePath.uri,
            chairs: data.chairs!.map((c, index) => {
                return {
                    id: c.id,
                    barberId: c.barberId,
                    name: c.name,
                    storeId: undefined,
                };
            }),
            offerings: (data.offerings ?? []).map((serviceKey) => {
                const priceStr = data.prices?.[serviceKey] ?? "";
                const priceNum = parseTR(priceStr);
                if (priceNum == null) return null;
                return {
                    serviceName: serviceKey,
                    price: priceNum,
                };
            }).filter((x): x is { serviceName: string; price: number } => x !== null),
            manuelBarbers: data.barbers!.map((barber) => {
                return {
                    id: barber.id,
                    profileImageUrl: barber.avatar?.uri,
                    fullName: barber.name,
                    storeId: undefined,
                }
            }),
            workingHours: data.workingHours
        }
        try {
            var result = await addStore(payload).unwrap();
            // Result handled by RTK Query mutation
            if (result.success) {
                showSnack(result.message, false);
                dismiss();
            }
            else {
                showSnack(result.message, true);
            }
        } catch (error: any) {
            const msg = resolveApiErrorMessage(error);
            showSnack(msg, true);
        }
    };
    const {
        fields: barberFields,
        append: addBarber,
        remove: removeBarber,
        update: updateBarber,
    } = useFieldArray({ control, name: "barbers", keyName: "_key" });
    const {
        fields: chairFields,
        append: addChair,
        remove: removeChair,
        update: updateChair,
    } = useFieldArray({ control, name: "chairs", keyName: "_key" });


    const barbers = useWatch({ control, name: "barbers" }) ?? [];
    const chairs = useWatch({ control, name: "chairs" }) ?? [];


    const validBarbers = React.useMemo(
        () => (barbers ?? []).filter(b => !!b.name?.trim()),
        [barbers]
    );

    useEffect(() => {
        const validIds = new Set(validBarbers.map(b => b.id));
        (chairs ?? []).forEach((c, idx) => {
            if (c.mode === 'barber' && (!c.barberId || !validIds.has(c.barberId))) {
                setValue(`chairs.${idx}.barberId` as const, undefined, { shouldDirty: true, shouldValidate: true });
            }
        });
    }, [validBarbers]);

    const barberNamesVersion = useMemo(
        () => (barbers ?? []).map(b => `${b.id}:${b.name?.trim() ?? ''}`).join('|'),
        [barbers]
    );

    const chairAssignVersion = useMemo(
        () => (chairs ?? []).map(c => `${c.id}:${c.mode}:${c.barberId ?? ''}`).join('|'),
        [chairs]
    );

    const barberOptionsMap = React.useMemo(() => {
        const used = new Map<string, number>();
        chairs.forEach(c => {
            if (c.mode === "barber" && c.barberId) {
                used.set(c.barberId, (used.get(c.barberId) ?? 0) + 1);
            }
        });
        const map = new Map<string, { label: string; value: string }[]>();
        chairs.forEach(c => {
            const usedExceptSelf = new Map(used);
            if (c.mode === "barber" && c.barberId) {
                const left = (usedExceptSelf.get(c.barberId) ?? 0) - 1;
                left > 0 ? usedExceptSelf.set(c.barberId, left) : usedExceptSelf.delete(c.barberId);
            }
            const opts = validBarbers // <— sadece isimli berberler
                .filter(b => !usedExceptSelf.has(b.id))
                .map(b => ({ label: b.name!.trim(), value: b.id }));
            map.set(c.id, opts);
        });
        return map;
    }, [chairs, validBarbers]);



    const pickMainImage = async () => {
        const file = await handlePickImage()
        if (file) setValue('storeImageUrl', file, { shouldDirty: true, shouldValidate: true })
    }
    const serviceOptions = useMemo(
        () => (selectedType ? SERVICE_BY_TYPE[selectedType] ?? [] : []),
        [selectedType]
    );
    const chairExtra = useMemo(
        () => `${barberNamesVersion}|${chairAssignVersion}`,
        [barberNamesVersion, chairAssignVersion]
    );
    useEffect(() => {
        setValue("offerings", [], { shouldDirty: true, shouldValidate: true });
    }, [selectedType, setValue]);
    useEffect(() => {
        const next = { ...(currentPrices ?? {}) };
        let changed = false;
        Object.keys(next).forEach((k) => {
            if (!selectedOfferings?.includes(k)) {
                delete next[k];
                changed = true;
            }
        });
        (selectedOfferings ?? []).forEach((k) => {
            if (!(k in next)) {
                next[k] = '';
                changed = true;
            }
        });
        if (changed) {
            setValue('prices', next, { shouldDirty: true, shouldValidate: true });
        }
    }, [selectedOfferings]);
    useEffect(() => {
        if (pricingMode === "rent") {
            setValue("pricingType.percent", undefined, { shouldValidate: true });
        } else if (pricingMode === "percent") {
            setValue("pricingType.rent", '', { shouldValidate: true });
        }
    }, [pricingMode, setValue]);
    useEffect(() => {
        const set = new Set(holidayDays ?? []);
        const curr = getValues("workingHours") ?? [];
        curr.forEach((w, i) => {
            setValue(`workingHours.${i}.isClosed`, set.has(w.dayOfWeek), {
                shouldDirty: true, shouldValidate: true,
            });
        });
    }, [holidayDays, getValues, setValue]);
    useEffect(() => {
        const i = (working ?? []).findIndex(w => w.dayOfWeek === activeDay);
        if (i < 0) return;
        const s = getValues(`workingHours.${i}.startTime`);
        const e = getValues(`workingHours.${i}.endTime`);
        setActiveStart(fromHHmm(s, "09:00"));
        setActiveEnd(fromHHmm(e, "18:00"));
    }, [activeDay, working, getValues]);
    const updateLocation = (latitude: number, longitude: number) => {
        const addr = getValues("location.addressDescription") ?? "";
        setValue("location", { latitude: latitude, longitude: longitude, addressDescription: addr }, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }
    useEffect(() => {
        reverseAndSetAddress(IST.latitude, IST.longitude);
    }, [])

    async function getPermissionOrAsk() {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === "granted";
    }
    async function pickMyCurrentLocation() {
        const ok = await getPermissionOrAsk();
        if (!ok) {
            alert("Konum izni gerekli.");
            return;
        }
        const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        updateLocation(latitude, longitude);
        await reverseAndSetAddress(latitude, longitude);
    }
    async function reverseAndSetAddress(latitude: number, longitude: number) {
        try {
            const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (rev) {
                const line = [rev.name, rev.district, rev.subregion, rev.region, rev.country].filter(Boolean).join(", ");

                if (line) {
                    setValue("location.addressDescription", line, { shouldDirty: true, shouldValidate: true });
                }
            }
        } catch { }
    }
    const tXErrorText =
        (errors.taxDocumentFilePath as any)?.message ||
        (errors.taxDocumentFilePath as any)?.name?.message ||
        (errors.taxDocumentFilePath as any)?.size?.message;
    const barberErrorText = React.useMemo(() => {
        if (!errors.barbers) return "";
        const msgs: string[] = [];
        barbers.forEach((_, idx) => {
            const m = errors.barbers?.[idx]?.name?.message as string | undefined;
            if (m) msgs.push(`• ${idx + 1}. berber: ${m}`);
        });
        return msgs.join("\n");
    }, [errors.barbers, barbers.length]);

    const chairsErrorText = React.useMemo(() => {
        if (!errors.chairs) return "";
        const msgs: string[] = [];
        chairs.forEach((_, idx) => {
            const m1 = errors.chairs?.[idx]?.name?.message as string | undefined;
            const m2 = errors.chairs?.[idx]?.barberId?.message as string | undefined;
            if (m1 || m2) msgs.push(`• ${idx + 1}. koltuk: ${m1 ?? m2}`);
        });
        return msgs.join("\n");
    }, [errors.chairs, chairs.length]);

    return (
        <View className='h-full'>
            <View className='flex-row justify-between items-center px-4'>
                <Text className="text-white flex-1 font-ibm-plex-sans-regular text-2xl">İşletme Ekle</Text>
                <IconButton onPress={dismiss} icon="close" iconColor="white" />
            </View>
            <Divider style={{ borderWidth: 0.1, backgroundColor: "gray" }} />
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1 }}>
                <Text className="text-white text-xl mt-4 px-4">İşletme Resmi Ekle</Text>
                <Controller
                    control={control}
                    name="storeImageUrl"
                    render={() => (
                        <View className="flex items-center justify-center px-4 mt-4">
                            <TouchableOpacity
                                onPress={pickMainImage}
                                className="w-full bg-gray-800 rounded-xl overflow-hidden"
                                style={{ aspectRatio: 2 / 1 }}
                                activeOpacity={0.85}
                            >
                                {image ? (
                                    <Image
                                        className='h-full w-full object-cover'
                                        source={{ uri: image.uri }}
                                    />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Icon source="image" size={40} color="#888" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                />
                <Text className="text-white text-xl mt-6 px-4">İşletme Bilgileri</Text>
                <View className="mt-2 px-4">
                    <Controller
                        control={control}
                        name="taxDocumentFilePath"
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
                                        outlineColor={errors.taxDocumentFilePath ? "#b00020" : "#444"}
                                        theme={{
                                            roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" }
                                        }}
                                        style={{ backgroundColor: '#1F2937', borderWidth: 0 }}
                                    />
                                </TouchableOpacity>
                                <HelperText type="error" visible={!!errors.taxDocumentFilePath}>
                                    {tXErrorText}
                                </HelperText>
                            </>
                        )}
                    />
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Controller
                                control={control}
                                name="storeName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <>
                                        <TextInput
                                            label="İşletme Adı"
                                            mode="outlined"
                                            dense
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            textColor="white"
                                            outlineColor={errors.storeName ? "#b00020" : "#444"}
                                            theme={{
                                                roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" }
                                            }}
                                            style={{ backgroundColor: '#1F2937', borderWidth: 0, marginTop: -6 }}
                                        />
                                        <HelperText type="error" visible={!!errors.storeName}>
                                            {errors.storeName?.message}
                                        </HelperText>
                                    </>
                                )}
                            />
                        </View>
                        <View className="flex-1">
                            <Controller
                                control={control}
                                name="type"
                                render={({ field: { value, onChange } }) => (
                                    <>
                                        <Dropdown
                                            data={BUSINESS_TYPES as any}
                                            labelField="label"
                                            valueField="value"
                                            placeholder="İşletme Türü Seç"
                                            value={value}
                                            onChange={(item: { label: string; value: string }) => { onChange(item.value); }}
                                            style={{
                                                height: 42,
                                                borderRadius: 10,
                                                paddingHorizontal: 12,
                                                backgroundColor: "#1F2937",
                                                borderWidth: 1,
                                                borderColor: errors.type ? "#b00020" : "#444",
                                                justifyContent: "center",
                                                marginTop: 0,

                                            }}
                                            placeholderStyle={{ color: "gray" }}
                                            selectedTextStyle={{ color: "white" }}
                                            itemTextStyle={{ color: "white" }}
                                            containerStyle={{ backgroundColor: '#1F2937', borderWidth: 0, borderRadius: 10, overflow: 'hidden', }}
                                            activeColor="#3a3b3d"
                                        />
                                        <HelperText className='text-4xl' type="error" visible={!!errors.type}>
                                            {errors.type?.message}
                                        </HelperText>
                                    </>
                                )}
                            />
                        </View>
                    </View>
                    {selectedType ? (
                        <View className="mt-[-10x]">
                            <Text className="text-white text-xl mb-2">Hizmetler ({BUSINESS_TYPES.find(t => t.value === selectedType)?.label})</Text>
                            <Controller
                                control={control}
                                name="offerings"
                                render={({ field: { value, onChange } }) => {
                                    return (
                                        <>
                                            <MultiSelect
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
                                    )
                                }}
                            />
                        </View>
                    ) : null}
                    {selectedOfferings?.length > 0 && (
                        <View className="mt-0 mx-0  rounded-xl" style={{ backgroundColor: '#1F2937', paddingVertical: 6, paddingHorizontal: 16 }}>
                            {selectedOfferings.map((serviceKey) => {
                                const label = serviceOptions.find(i => i.value === serviceKey)?.label ?? serviceKey;
                                return (
                                    <View key={serviceKey}>
                                        <View className="flex-row items-center gap-2 mb-0">
                                            <Text className="text-white w-[35%]" >{label} :</Text>
                                            <View className='w-[65%]'>
                                                <Controller
                                                    control={control}
                                                    name={`prices.${serviceKey}` as const}
                                                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                                                        <TextInput
                                                            mode="outlined"
                                                            dense
                                                            keyboardType="numeric"
                                                            label="Fiyat (₺)"
                                                            value={value ?? ''}
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
                                                            outlineColor={error ? '#b00020' : '#444'}
                                                            style={{ backgroundColor: '#1F2937', borderWidth: 0, marginTop: 20, height: 35 }}
                                                            theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                        />
                                                    )}
                                                />
                                                <HelperText type="error" visible={!!errors.prices?.[serviceKey]}>
                                                    {errors.prices?.[serviceKey]?.message as string}
                                                </HelperText>
                                            </View>

                                        </View>

                                    </View>
                                );
                            })}
                        </View>
                    )}
                    <View className="mt-2 mx-0 flex-row items-center">
                        <Text className="text-white text-xl flex-1">Çalışan Berber Sayısı : {barberFields.length}  </Text>
                        <Button mode="text" textColor="#c2a523" onPress={() => addBarber({ id: uuid(), name: "", avatar: null })}>Berber Ekle</Button>
                    </View>
                    {barberFields.length > 0 && (
                        <View className="bg-[#1F2937] rounded-xl px-3 pt-4 pb-2">
                            <View style={{ height: 64 * barberFields.length }}>
                                <LegendList
                                    data={barberFields}
                                    keyExtractor={(item) => item._key}
                                    estimatedItemSize={64}
                                    extraData={barberNamesVersion}
                                    renderItem={({ item }) => {
                                        const index = barberFields.findIndex(f => f.id === item.id);
                                        return (
                                            <View className="flex-row items-center gap-3 mb-3">
                                                <TouchableOpacity
                                                    activeOpacity={0.85}
                                                    onPress={async () => {
                                                        const file = await handlePickImage();
                                                        if (file) updateBarber(index, { ...(getValues(`barbers.${index}` as const) as any), avatar: file });
                                                    }}
                                                >
                                                    {barbers[index]?.avatar?.uri
                                                        ? <Avatar.Image size={40} source={{ uri: barbers[index]?.avatar?.uri }} />
                                                        : <Avatar.Icon size={40} icon="account-circle" />}
                                                </TouchableOpacity>

                                                <Controller
                                                    control={control}
                                                    name={`barbers.${index}.name` as const}
                                                    render={({ field: { value, onChange, onBlur } }) => (
                                                        <TextInput
                                                            label="Berber adı"
                                                            mode="outlined"
                                                            dense
                                                            value={value}
                                                            onChangeText={onChange}
                                                            onBlur={onBlur}
                                                            textColor="white"
                                                            outlineColor="#444"
                                                            theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                            style={{ backgroundColor: "#1F2937", borderWidth: 0, flex: 1 }}
                                                        />
                                                    )}
                                                />

                                                <IconButton icon="delete" iconColor="#ef4444" onPress={() => removeBarber(index)} />
                                            </View>
                                        )
                                    }}
                                />
                            </View>
                            <HelperText type="error" visible={!!barberErrorText}>
                                {barberErrorText}
                            </HelperText>
                        </View>
                    )}

                    <View className="mt-4 mx-0 flex-row items-center">
                        <Text className="text-white text-xl flex-1">Koltuk Sayısı : {chairFields.length}</Text>
                        <Button mode="text" textColor="#c2a523" onPress={() => addChair({ id: uuid(), mode: "named", name: "" })}>Koltuk Ekle</Button>
                    </View>

                    {chairFields.length > 0 && (
                        <View className="bg-[#1F2937] rounded-xl px-3 pt-4 pb-2">
                            <View style={{ height: 64 * chairFields.length }}>
                                <LegendList
                                    data={chairFields}
                                    keyExtractor={(item) => item._key}
                                    estimatedItemSize={64}
                                    extraData={chairExtra}
                                    renderItem={({ item }) => {
                                        const index = chairFields.findIndex(f => f.id === item.id);
                                        const chair = chairs[index];
                                        return (
                                            <View className="flex-row items-center gap-3 mb-3">
                                                <Icon size={24} source={'chair-rolling'} color='#c2a523'></Icon>
                                                <View className='flex-1'>
                                                    <Controller
                                                        control={control}
                                                        name={`chairs.${index}.mode` as const}
                                                        render={({ field: { value, onChange } }) => (
                                                            <Dropdown
                                                                data={[{ label: "İsim ata", value: "named" }, { label: "Berber ata", value: "barber" }]}
                                                                labelField="label"
                                                                valueField="value"
                                                                value={value ?? null}
                                                                onChange={(it: any) => {
                                                                    onChange(it.value);
                                                                    if (it.value === "named") {
                                                                        setValue(`chairs.${index}.barberId`, undefined, { shouldDirty: true, shouldValidate: true });
                                                                    } else {
                                                                        setValue(`chairs.${index}.name`, undefined, { shouldDirty: true, shouldValidate: true });
                                                                    }
                                                                }}
                                                                style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#444", justifyContent: "center" }}
                                                                placeholderStyle={{ color: "gray" }}
                                                                selectedTextStyle={{ color: "white" }}
                                                                itemTextStyle={{ color: "white" }}
                                                                containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10, overflow: "hidden" }}
                                                                activeColor="#3a3b3d"
                                                            />
                                                        )}
                                                    />
                                                </View>
                                                <View className='flex-1'>
                                                    {chair?.mode === "named" ? (
                                                        <Controller
                                                            key={`named-${item._key}`}
                                                            control={control}
                                                            name={`chairs.${index}.name` as const}
                                                            render={({ field: { value, onChange, onBlur } }) => (
                                                                <TextInput
                                                                    label="Koltuk adı"
                                                                    mode="outlined"
                                                                    dense
                                                                    value={value}
                                                                    onChangeText={onChange}
                                                                    onBlur={onBlur}
                                                                    textColor="white"
                                                                    outlineColor="#444"
                                                                    theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                                    style={{ backgroundColor: "#1F2937", borderWidth: 0, marginTop: -5 }}
                                                                />
                                                            )}
                                                        />

                                                    ) : (
                                                        <Controller
                                                            key={`barber-dd-${item._key}-${barberNamesVersion}`}
                                                            control={control}
                                                            name={`chairs.${index}.barberId` as const}
                                                            render={({ field: { value, onChange } }) => {
                                                                const options = barberOptionsMap.get(chair.id) ?? [];
                                                                const disabled = options.length === 0;
                                                                return (
                                                                    <Dropdown
                                                                        data={options}
                                                                        labelField="label"
                                                                        valueField="value"
                                                                        value={value ?? null}
                                                                        onChange={(item: any) => onChange(item.value)}
                                                                        placeholder={disabled ? "Önce isimli berber ekleyin" : "Berber seç"}
                                                                        disable={disabled}
                                                                        style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#444", justifyContent: "center" }}
                                                                        containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10, overflow: "hidden" }}
                                                                        placeholderStyle={{ color: "gray" }}
                                                                        selectedTextStyle={{ color: "white" }}
                                                                        itemTextStyle={{ color: "white" }}
                                                                        activeColor="#0f766e"
                                                                    />
                                                                )
                                                            }

                                                            }
                                                        />
                                                    )}
                                                </View>
                                                <IconButton icon="delete" iconColor="#ef4444" onPress={() => removeChair(index)} />
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                            <HelperText type="error" visible={!!chairsErrorText}>
                                {chairsErrorText}
                            </HelperText>
                        </View>
                    )}

                    <Text className="text-white font-ibm-plex-sans-regular ml-0 pt-4 mt-4 pb-2 text-xl">Koltuk Fiyatları Belirle</Text>
                    <View className="mt-2 mx-0 bg-[#1F2937] rounded-xl px-3 py-3">
                        <Controller
                            control={control}
                            name="pricingType.mode"
                            render={({ field: { value, onChange } }) => (
                                <View className="flex-row justify-center gap-16 ">
                                    {PRICING_OPTIONS.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => onChange(opt.value)}
                                            className="flex-row items-center gap-2"
                                            activeOpacity={0.85}
                                        >
                                            <View
                                                className={`w-4 h-4 rounded-full border ${value === opt.value ? "bg-green-500 border-green-500" : "border-gray-400"
                                                    }`}
                                            />
                                            <Text className="text-white">{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        />
                        {pricingMode === "rent" && (
                            <Controller
                                control={control}
                                name="pricingType.rent"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <>
                                        <TextInput
                                            dense
                                            value={value?.toString() ?? ""}
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
                                            mode="outlined"
                                            label="Kiralama Fiyatı - 1 Saatlik"
                                            textColor="white"
                                            outlineColor={errors.pricingType?.rent ? "#b00020" : "#444"}
                                            theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                            style={{ backgroundColor: '#1F2937', borderWidth: 0, marginTop: 8, }}
                                            keyboardType="numeric"
                                        />
                                        <HelperText type="error" visible={!!errors.pricingType?.rent}>
                                            {errors.pricingType?.rent?.message as string}
                                        </HelperText>
                                    </>
                                )}
                            />
                        )}

                        {pricingMode === "percent" && (
                            <Controller
                                control={control}
                                name="pricingType.percent"
                                render={({ field: { value, onChange } }) => (
                                    <>
                                        <Dropdown
                                            dropdownPosition="top"
                                            data={[
                                                { label: "10%", value: "10" },
                                                { label: "20%", value: "20" },
                                                { label: "30%", value: "30" },
                                                { label: "40%", value: "40" },
                                                { label: "50%", value: "50" },
                                                { label: "60%", value: "60" },
                                                { label: "70%", value: "70" },
                                                { label: "80%", value: "80" },
                                                { label: "90%", value: "90" },
                                            ]}
                                            labelField="label"
                                            valueField="value"
                                            value={value ? String(value) : undefined}
                                            placeholder="Yüzde Seçin"
                                            onChange={(item: { label: string; value: string }) => onChange(item.value)}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 10,
                                                backgroundColor: "#1F2937",
                                                borderWidth: 1,
                                                borderColor: errors.pricingType?.percent ? "#b00020" : "#444",
                                                marginTop: 12,
                                                height: 42,
                                            }}
                                            placeholderStyle={{ color: "gray" }}
                                            selectedTextStyle={{ color: "white" }}
                                            itemTextStyle={{ color: "white" }}
                                            containerStyle={{
                                                backgroundColor: "#1F2937",
                                                borderWidth: 1,
                                                borderColor: "#444",
                                                borderRadius: 10,
                                                overflow: "hidden",
                                            }}
                                            activeColor="#0f766e"
                                        />
                                        <HelperText type="error" visible={!!errors.pricingType?.percent}>
                                            {errors.pricingType?.percent?.message as string}
                                        </HelperText>
                                    </>
                                )}
                            />
                        )}
                    </View>
                    <Text className="text-white font-ibm-plex-sans-regular ml-0 pt-4 pb-2 text-xl">Çalışma Zamanını Belirle</Text>
                    <View className='mt-2 mx-0 bg-[#1F2937] rounded-xl px-2 py-3'>
                        <Text className="text-[#c2a523] font-ibm-plex-sans-regular ml-0 pt-0 pb-2 text-sm">- Seçtiğiniz zaman dilimleri müşteri tarafında 1 saat aralıklarla gözükecek 8:00-9:00 , 10:00-11:00 gibi</Text>
                        <View className="mt-2 px-0">
                            <View className="flex-row  gap-2">
                                {DAYS_TR.map((d) => {
                                    const isHoliday = (holidayDays ?? []).includes(d.day);
                                    const isActive = activeDay === d.day;
                                    return (
                                        <TouchableOpacity
                                            key={d.day}
                                            disabled={isHoliday}
                                            onPress={() => setActiveDay(d.day)}
                                            className={`px-3 py-2 rounded-full border ${isHoliday
                                                ? "opacity-40 border-gray-600"
                                                : isActive
                                                    ? "bg-emerald-500"
                                                    : "border-gray-500"
                                                }`}
                                            activeOpacity={0.8}
                                        >
                                            <Text className="text-white text-xs">{d.label}</Text>
                                        </TouchableOpacity>

                                    );
                                })}
                            </View>
                            {(() => {
                                const idx = (working ?? []).findIndex((w) => w.dayOfWeek === activeDay);
                                if (idx < 0) return null;
                                const dayRow = working[idx];
                                const isDisabled = dayRow?.isClosed || (holidayDays ?? []).includes(activeDay);
                                const dayErr = errors.workingHours?.[idx];
                                return (
                                    <View className="mt-0 bg-[#1F2937] rounded-xl p-0">
                                        <View className="flex-row items-center mt-6">
                                            <Text className="text-white text-sm">Başlangıç saati:</Text>
                                            <DateTimePicker
                                                value={activeStart}
                                                mode="time"
                                                is24Hour
                                                locale="tr-TR"
                                                disabled={isDisabled}
                                                onChange={(_, d) => {
                                                    if (!d || isDisabled) return;
                                                    setActiveStart(d);
                                                    setValue(`workingHours.${idx}.startTime`, fmtHHmm(d), {
                                                        shouldDirty: true, shouldValidate: true,
                                                    });
                                                    trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                                                }}
                                            />
                                            <Text className="text-white text-sm ml-5">Bitiş saati:</Text>
                                            <DateTimePicker
                                                value={activeEnd}
                                                mode="time"
                                                is24Hour
                                                locale="tr-TR"
                                                disabled={isDisabled}
                                                onChange={(_, d) => {
                                                    if (!d || isDisabled) return;
                                                    setActiveEnd(d);
                                                    setValue(`workingHours.${idx}.endTime`, fmtHHmm(d), {
                                                        shouldDirty: true, shouldValidate: true,
                                                    });
                                                    trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                                                }}
                                            />
                                        </View>
                                        <HelperText type="error" visible={!!(dayErr?.startTime || dayErr?.endTime)}>
                                            {((dayErr?.startTime?.message as string) || (dayErr?.endTime?.message as string)) ?? ""}
                                        </HelperText>
                                    </View>
                                );
                            })()}
                            <Text className="text-white text-xl mt-2">Tatil Günleri</Text>
                            <Controller
                                control={control}
                                name="holidayDays"
                                render={({ field: { value, onChange }, fieldState: { error } }) => (
                                    <>
                                        <MultiSelect
                                            data={HOLIDAY_OPTIONS}
                                            labelField="label"
                                            valueField="value"
                                            value={(value ?? []).map(String)}
                                            onChange={(vals: string[]) => onChange(vals.map(v => Number(v)))}
                                            placeholder="Tatil günlerini seç"
                                            dropdownPosition="top"
                                            inside
                                            alwaysRenderSelectedItem
                                            visibleSelectedItem
                                            style={{
                                                backgroundColor: "#1F2937",
                                                borderColor: error ? "#b00020" : "#444",
                                                borderWidth: 1,
                                                borderRadius: 10,
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                marginTop: 8,
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
                                        />
                                        <HelperText type="error" visible={!!error}>
                                            {error?.message as string}
                                        </HelperText>
                                    </>
                                )}
                            />
                        </View>
                    </View>
                    <Text className="text-white font-ibm-plex-sans-regular ml-0 pt-4 pb-2 text-xl">Adres Belirle</Text>
                    <View className='mt-2 mx-0 bg-[#1F2937] rounded-xl px-2 py-3'>
                        <Text className="text-[#c2a523] font-ibm-plex-sans-regular ml-0 pt-0 pb-2 text-sm">- Eğer şuanda işletmede bulunuyorsanız aşağıdaki dükkanın konumunu ala tıklayınız ama değilseniz haritadan konumunuza tıklayınız.</Text>
                        <Button mode='contained-tonal' icon={'store'} style={{ borderRadius: 12, marginVertical: 10 }} onPress={pickMyCurrentLocation} rippleColor='#059669' buttonColor='#10B981' textColor='white'>İşletmenin konumunu al</Button>
                        <MapPicker
                            lat={latitude ?? undefined}
                            lng={longitude ?? undefined}
                            address={address}
                            onChange={async (la, ln) => { updateLocation(la, ln); await reverseAndSetAddress(la, ln); }}
                        />
                        <HelperText type="error" visible={!!(errors.location?.latitude || errors.location?.longitude)}>
                            {(errors.location?.latitude?.message as string) || (errors.location?.longitude?.message as string) || ""}
                        </HelperText>
                        <Controller
                            control={control}
                            name="location.addressDescription"
                            render={({ field: { value, onChange, onBlur } }) => (
                                <>
                                    <TextInput
                                        label="Adres açıklaması"
                                        mode="outlined"
                                        dense
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        multiline
                                        readOnly
                                        textColor="white"
                                        outlineColor={errors.location?.addressDescription ? "#b00020" : "#444"}
                                        theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                        style={{ backgroundColor: "#1F2937", borderWidth: 0, marginTop: 0 }}
                                        placeholder="Örn: X caddesi, Y sk. Z no, dükkan girişi apartman sağında..."
                                    />
                                    <HelperText type="error" visible={!!errors.location?.addressDescription}>
                                        {errors.location?.addressDescription?.message as string}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                </View>
            </ScrollView>
            <View className="px-4 my-3">
                <Button style={{ borderRadius: 10 }} disabled={isLoading} loading={isLoading} mode="contained" onPress={handleSubmit(OnSubmit)} buttonColor="#1F2937">Ekle</Button>
            </View>
            <SnackbarComponent />

        </View>
    )
}

export default FormStoreAdd

