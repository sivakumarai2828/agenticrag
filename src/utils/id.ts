export const generateId = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) {
        // Fallback to manual generation
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
