window.DayzMapAssistantConfig = {
    enabled: (function () {
        const env = window.DayzMapRuntimeEnv || {};
        const value = String(env.DAYZ_MAP_ASSISTANT_ENABLED || "").trim().toLowerCase();
        return value === "1" || value === "true" || value === "yes" || value === "on";
    })(),
    ollamaBaseUrl: "./assistant-api",
    requestTimeoutMs: 300000
};
