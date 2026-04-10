"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

interface ScreenerContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedChain: string;
    setSelectedChain: (chain: string) => void;
    currentViewData: UntypedJson[];
    setCurrentViewData: (data: UntypedJson[]) => void;
    narrativeFilter: string | null;
    setNarrativeFilter: (n: string | null) => void;
    safetyFilter: boolean;
    setSafetyFilter: (s: boolean) => void;
}

const ScreenerContext = createContext<ScreenerContextType | undefined>(undefined);

export function ScreenerProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedChain, setSelectedChain] = useState("all");
    const [currentViewData, setCurrentViewData] = useState<UntypedJson[]>([]);

    const [narrativeFilter, setNarrativeFilter] = useState<string | null>(null);
    const [safetyFilter, setSafetyFilter] = useState(false);

    const handleSetSearchQuery = useCallback((query: string) => setSearchQuery(query), []);
    const handleSetSelectedChain = useCallback((chain: string) => setSelectedChain(chain), []);
    const handleSetCurrentViewData = useCallback((data: UntypedJson[]) => setCurrentViewData(data), []);

    const value = useMemo(() => ({
        searchQuery,
        setSearchQuery: handleSetSearchQuery,
        selectedChain,
        setSelectedChain: handleSetSelectedChain,
        currentViewData,
        setCurrentViewData: handleSetCurrentViewData,
        narrativeFilter,
        setNarrativeFilter,
        safetyFilter,
        setSafetyFilter
    }), [searchQuery, selectedChain, currentViewData, narrativeFilter, safetyFilter, handleSetSearchQuery, handleSetSelectedChain, handleSetCurrentViewData]);

    return (
        <ScreenerContext.Provider value={value}>
            {children}
        </ScreenerContext.Provider>
    );
}

export function useScreener() {
    const context = useContext(ScreenerContext);
    if (!context) {
        throw new Error("useScreener must be used within a ScreenerProvider");
    }
    return context;
}
