import { ELEVENLABS_API_KEY } from "../config";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam (default)

/**
 * Generates audio using ElevenLabs API
 * @param {string} text The narration text
 * @param {string} voiceId The ElevenLabs voice ID (optional)
 * @returns {Promise<Object>} Audio blob and playback info
 */
export const speakNarration = async (text, voiceId = DEFAULT_VOICE_ID) => {
    if (!ELEVENLABS_API_KEY) {
        throw new Error("ElevenLabs API Key is missing. Please add it to your .env file.");
    }

    try {
        console.debug("[VoiceService] Generating narration with ElevenLabs:", text.substring(0, 50));
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[VoiceService] ElevenLabs API Error:", errorText);
            throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        console.debug("[VoiceService] Audio generated successfully. Blob size:", audioBlob.size, "bytes");
        
        // ✨ Return both blob (for transcription) and URL (for playback)
        return {
            audioBlob,      // For transcription
            audioUrl,       // For playback
            text,           // Original text
            voiceId,        // Which voice was used
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("[VoiceService] Failed to generate narration:", error);
        throw error;
    }
};

/**
 * Play audio from blob or URL
 * @param {string|Blob} audioSource Audio URL or blob
 * @returns {Promise<Audio>} Audio element with playback promise
 */
export const playAudio = async (audioSource) => {
    try {
        const audioUrl = typeof audioSource === 'string' 
            ? audioSource 
            : URL.createObjectURL(audioSource);
        
        const audio = new Audio(audioUrl);
        
        const playbackPromise = new Promise((resolve, reject) => {
            audio.onended = () => {
                if (typeof audioSource !== 'string') {
                    URL.revokeObjectURL(audioUrl);
                }
                resolve();
            };
            audio.onerror = (e) => {
                console.error("[VoiceService] Audio playback error:", e);
                reject(e);
            };
            audio.play().catch(err => {
                console.error("[VoiceService] Failed to play audio:", err);
                reject(err);
            });
        });

        return { audio, playbackPromise, audioUrl };
    } catch (error) {
        console.error("[VoiceService] Failed to play audio:", error);
        throw error;
    }
};

export const stopSpeaking = () => {
    console.debug("[VoiceService] stopSpeaking called");
};