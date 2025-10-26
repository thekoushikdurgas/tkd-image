export const copyToClipboard = async (text: string, onSuccess?: () => void, onError?: (err: any) => void) => {
    try {
        await navigator.clipboard.writeText(text);
        onSuccess?.();
    } catch (err) {
        console.error('Could not copy text: ', err);
        onError?.(err);
    }
};

export const pasteFromClipboard = async (setter: (text: string) => void, onSuccess?: () => void, onError?: (err: any) => void) => {
    try {
        const text = await navigator.clipboard.readText();
        setter(text);
        onSuccess?.();
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        onError?.(err);
    }
};
