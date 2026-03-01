import { MISTRAL_API_KEY } from "../config";

/**
 * Transcribes audio using Mistral's Voxtral Mini Transcribe with word-level timestamps
 * @param {Blob} audioBlob The audio blob to transcribe
 * @returns {Promise<Object>} The transcription result with word timestamps
 */
export const transcribeAudio = async (audioBlob) => {
    if (!MISTRAL_API_KEY) {
        throw new Error("Mistral API Key is missing.");
    }

    try {
        console.debug("[TranscriptionService] Sending audio to Mistral Voxtral with word timestamps...");
        
        const formData = new FormData();
        formData.append("file", audioBlob, "narration.mp3");
        formData.append("model", "voxtral-mini-latest");
        formData.append("response_format", "verbose_json");
        formData.append("timestamp_granularities", "word");  // ✨ KEY: word-level timestamps

        const response = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${MISTRAL_API_KEY}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[TranscriptionService] Mistral API Error:", errorText);
            throw new Error(`Mistral Transcription Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        console.debug("[TranscriptionService] Transcription complete:", data.text);
        console.debug("[TranscriptionService] Words with timestamps:", data.words?.length || 0, "words");
        
        // ✨ Return structured data for word-by-word highlighting
        return {
            text: data.text,
            words: data.words || [],  // Array of {word, start, end}
            language: data.language || "en",
            duration: data.duration,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("[TranscriptionService] Transcription failed:", error);
        throw error;
    }
};

/**
 * Get word at specific playback time
 * @param {Array} words Array of word objects with timestamps
 * @param {number} currentTime Current playback time in seconds
 * @returns {Object} Current word and its index
 */
export const getWordAtTime = (words, currentTime) => {
    if (!words || words.length === 0) {
        return { word: null, wordIndex: -1 };
    }

    const wordIndex = words.findIndex(w => 
        currentTime >= (w.start || 0) && currentTime <= (w.end || 0)
    );

    return {
        word: wordIndex >= 0 ? words[wordIndex] : null,
        wordIndex: wordIndex >= 0 ? wordIndex : -1,
        totalWords: words.length
    };
};