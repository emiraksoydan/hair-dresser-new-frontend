import type { FieldValues, Path, UseFormGetValues, UseFormSetValue, } from "react-hook-form";
import * as Location from "expo-location";
import { HasLocation } from "../types";
import { useCurrentLocationSafe } from "./location-helper";



export function createStoreLocationHelpers<T extends FieldValues & HasLocation>(
    setValue: UseFormSetValue<T>,
    getValues: UseFormGetValues<T>
) {
    const updateLocation = (latitude: number, longitude: number) => {
        const addr =
            (getValues("location.addressDescription" as Path<T>) as string) ?? "";
        setValue(
            "location" as Path<T>,
            {
                latitude,
                longitude,
                addressDescription: addr,
            } as any,
            {
                shouldDirty: true,
                shouldValidate: true,
            }
        );
    };

    const reverseAndSetAddress = async (latitude: number, longitude: number) => {
        try {
            const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (!rev) return;
            const line = [rev.name, rev.district, rev.subregion, rev.region, rev.country]
                .filter(Boolean)
                .join(", ");

            if (line) {
                setValue("location.addressDescription" as Path<T>, line as any, {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
        } catch {

        }
    };

    return {
        updateLocation,
        reverseAndSetAddress,
    };
}
