import { createContext, useCallback, useContext, useRef } from "react";
import { Ctx, RefMap, SheetKey } from "../types";
import { BottomSheetBackdrop, type BottomSheetBackdropProps, BottomSheetModal } from '@gorhom/bottom-sheet';

const RegistryCtx = createContext<Ctx | null>(null);

export const BottomSheetRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const refs = useRef<RefMap>({});
    const setRef = useCallback((key: SheetKey, inst: BottomSheetModal | null) => {
        refs.current[key] = inst ?? undefined;
    }, []);
    const present = useCallback((key: SheetKey) => refs.current[key]?.present?.(), []);
    const dismiss = useCallback((key: SheetKey) => refs.current[key]?.dismiss?.(), []);
    const makeBackdrop = useCallback(
        (opts?: { appearsOnIndex?: number; disappearsOnIndex?: number; pressBehavior?: 'close' | 'collapse' | 'none' }) =>
            (props: BottomSheetBackdropProps) => (
                <BottomSheetBackdrop
                    {...props}
                    appearsOnIndex={opts?.appearsOnIndex ?? 0}
                    disappearsOnIndex={opts?.disappearsOnIndex ?? -1}
                    pressBehavior={opts?.pressBehavior ?? 'close'}
                />
            ),
        []
    );
    return (
        <RegistryCtx.Provider value={{ setRef, present, dismiss, makeBackdrop, }}>
            {children}
        </RegistryCtx.Provider>
    );
};

export const useBottomSheetRegistry = () => {
    const ctx = useContext(RegistryCtx);
    if (!ctx) throw new Error('BottomSheetRegistryProvider eksik (Provider ile sarmayı unutma).');
    return ctx;
};
export const useSheet = (key: SheetKey) => {
    const { present, dismiss, makeBackdrop, } = useBottomSheetRegistry();
    return {

        present: () => present(key),
        dismiss: () => dismiss(key),
        makeBackdrop,
    };
};