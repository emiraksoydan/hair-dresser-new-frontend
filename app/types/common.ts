/**
 * Common types used across the application
 */

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type FileObject = { 
  uri: string; 
  name: string; 
  type: string 
};

export type Pos = { 
  lat: number; 
  lon: number 
};

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
