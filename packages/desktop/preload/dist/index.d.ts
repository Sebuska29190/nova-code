export interface NovaAPI {
    window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
    };
    app: {
        info: () => Promise<{
            version: string;
            platform: string;
            arch: string;
        }>;
    };
    engine: {
        sendMessage: (message: string) => Promise<void>;
        abort: () => Promise<void>;
        status: () => Promise<{
            isGenerating: boolean;
            workingDirectory: string;
            totalTokensUsed: number;
            totalCost: number;
        }>;
        providers: () => Promise<Array<{
            id: string;
            name: string;
            enabled: boolean;
            hasKey: boolean;
        }>>;
        models: (providerId: string) => Promise<Array<{
            id: string;
            name: string;
            contextWindow: number;
            maxOutput: number;
        }>>;
        setProvider: (providerId: string, modelId: string) => Promise<{
            success: boolean;
        }>;
        setApiKey: (providerId: string, apiKey: string) => Promise<{
            success: boolean;
        }>;
        getConfig: () => Promise<Record<string, unknown>>;
        updateConfig: (updates: Record<string, unknown>) => Promise<{
            success: boolean;
        }>;
    };
    dialog: {
        openDirectory: () => Promise<string | null>;
    };
    on: (channel: string, callback: (...args: unknown[]) => void) => void;
    off: (channel: string, callback: (...args: unknown[]) => void) => void;
}
declare global {
    interface Window {
        nova: NovaAPI;
    }
}
//# sourceMappingURL=index.d.ts.map