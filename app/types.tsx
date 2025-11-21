import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import type { Control, UseFormSetValue, FieldPath } from "react-hook-form";
import { FormValues } from "./components/formstoreadd";

export type MyJwtPayload = {
  identifier: string;
  name: string;
  lastName: string;
  userType: string;
  exp: number;
  nbf: number;
  iss: string;
  aud: string;
}

export type JwtPayload = {
  identifier: string;
  name: string;
  lastName: string;
  userType: string;
};
export enum OtpPurpose {
  Register = 0,
  Login = 1,
  Reset = 2,
}
export enum ImageOwnerType {
  User = 1,
  Store = 2,
  ManuelBarber = 3,
  FreeBarber = 4
}
export enum UserType {
  Customer = 0,
  FreeBarber = 1,
  BarberStore = 2
}
export type LocationResult =
  | {
    ok: true;
    lat: number;
    lon: number;
  }
  | {
    ok: false;
    message: string;
  };

export type LocationStatusHelper = 'idle' | 'loading' | 'ok' | 'error';


export type SearchBarProps = {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
};
export type FormatListButtonProps = {
  isList: boolean;
  setIsList: (control: boolean) => void;
}

export type OnPressProps = {
  onPress?: () => void;
}
export type Options = {
  snapPoints?: (string | number)[];
  pressBehavior?: 'none' | 'close' | 'collapse';
  appearsOnIndex?: number;
  disappearsOnIndex?: number;
  preventDoubleOpen?: boolean;
  debounceOpenMs?: number;
};

export type ChairRowProps = {
  index: number;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;   // <-- doğru tip
  remove: () => void;
  barbers?: FormValues['barbers'];
  takenSet: Set<string>;
};

export type FileObject = { uri: string; name: string; type: string };

export type SheetKey = string; // örn: 'add', 'filter', 'storeEdit' ...
export type RefMap = Record<SheetKey, BottomSheetModal | null | undefined>;

export type Ctx = {
  setRef: (key: SheetKey, inst: BottomSheetModal | null) => void;
  present: (key: SheetKey) => void;
  dismiss: (key: SheetKey) => void;
  makeBackdrop: (opts?: {
    appearsOnIndex?: number;
    disappearsOnIndex?: number;
    pressBehavior?: 'close' | 'collapse' | 'none';
  }) => (p: BottomSheetBackdropProps) => React.ReactElement;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AccessTokenDto = {
  token: string;
  expiration: string;
  refreshToken: string;
  refreshTokenExpires: string;
};
export type BarberChairCreateDto = {
  barberId?: string;
  id: string;
  name?: string;
};
export type ServiceOfferingCreateDto = {
  price: number;
  serviceName: string;
};
export type ManuelBarberCreateDto = {
  id: string;
  fullName: string;
  profileImageUrl?: string;
};
export type WorkingHourCreateDto = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
};
export type BarberStoreCreateDto = {
  storeName: string;
  storeImageList?: CreateImageDto[];
  type: number;
  pricingType: number;
  addressDescription: string;
  latitude: number;
  longitude: number;
  pricingValue: number;
  taxDocumentFilePath: string;
  chairs: BarberChairCreateDto[];
  offerings: ServiceOfferingCreateDto[];
  manuelBarbers: ManuelBarberCreateDto[];
  workingHours: WorkingHourCreateDto[];
};
export type CreateImageDto = {
  imageUrl: string;
  ownerType: ImageOwnerType;
  imageOwnerId?: string;

}


export enum BarberType {
  MaleHairdresser = 0,
  FemaleHairdresser = 1,
  BeautySalon = 2,
}
export interface ServiceOfferingGetDto {
  id: string;
  price: number;
  serviceName: string;
}

export interface ImageGetDto {
  id: string;
  imageUrl: string;
}

export type BarberStoreGetDto = {
  id: string;
  storeName: string;
  pricingType: string;
  pricingValue: number;
  type: BarberType;
  rating: number;
  distanceKm: number;
  favoriteCount: number;
  latitude: number;
  longitude: number;
  isOpenNow: boolean;
  reviewCount: number;
  serviceOfferings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
}
export type BarberStoreMineDto = {
  id: string;
  storeName: string;
  type: BarberType;
  rating: number;
  favoriteCount: number;
  reviewCount: number;
  isOpenNow: boolean;
  serviceOfferings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
}
export type BarberStoreDetail = {
  id: string;
  storeName: string;
  imageList: ImageGetDto[];
  type: string;
  pricingType: string;
  pricingValue: number;
  latitude: number;
  longitude: number;
  isOpenNow: boolean;
  addressDescription: string;
  barberStoreChairs: BarberChairDto[];
  manuelBarbers: ManuelBarberDto[];
  serviceOfferings: ServiceOfferingGetDto[];
  workingHours: WorkingHourGetDto[];
  taxDocumentFilePath: string;
}
export type ManuelBarberDto = {
  id: string;
  fullName: string;
  profileImageUrl: string;
  rating: number;
}

export type WorkingHourGetDto = {
  dayOfWeek: number;
  endTime: string;
  id: string;
  isClosed: boolean,
  ownerId: string,
  startTime: string,
}
export type BarberChairDto = {
  id: string;
  name?: string;
  manualBarberId?: string
}

export type LocationStatus = 'unknown' | 'granted' | 'denied';

export interface VerifyOtpRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  certificateFilePath: string;
  code: string;
  device: string | null;
  userType: number;
  mode: string;
}

export type NearbyStoresRequest = {
  lat: number;
  lon: number;
  radiusKm?: number;
};

export type Pos = { lat: number; lon: number };
export type HasLocation = {
  location: {
    latitude: number;
    longitude: number;
    addressDescription: string;
  };
};
export type UseNearbyControlParams = {
  enabled: boolean;                      // ekran / tab aktif mi
  moveThresholdM?: number;               // 150m
  staleMs?: number;                      // hareketliyken 15sn
  hardRefreshMs?: number;                // hareketsizken 60sn
  onFetch: (lat: number, lon: number) => void | Promise<void>;
};

