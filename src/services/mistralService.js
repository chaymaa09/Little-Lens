import { MISTRAL_API_KEY } from "../config.js";

export const generateStoryFromPrompt = async (prompt, systemPrompt) => {
    try {
        const promptText = typeof prompt === "string" ? prompt : String(prompt ?? "");
        const systemText = typeof systemPrompt === "string" ? systemPrompt : String(systemPrompt ?? "");

        console.debug("[Mistral] Sending request", {
            endpoint: "https://api.mistral.ai/v1/chat/completions",
            model: "ministral-14b-latest",
            hasSystemPrompt: Boolean(systemText),
            promptType: typeof prompt,
            promptPreview: promptText.slice(0, 80),
        });

        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
                model: "ministral-14b-latest",
                messages: [
                    { role: "system", content: systemText },
                    { role: "user", content: promptText },
                ],
                response_format: {
                    type: "json_object",
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "<failed to read error body>");
            console.error("[Mistral] Non-200 response", {
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
            });
            throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        console.debug("[Mistral] Raw JSON response", data);

        if (!data.choices || !data.choices[0]?.message?.content) {
            console.error("[Mistral] Invalid response structure", data);
            throw new Error("Invalid Mistral response structure");
        }

        const content = data.choices[0].message.content;
        console.debug("[Mistral] Message content", content);

        return JSON.parse(content);
    } catch (error) {
        console.error("Mistral generation failed:", error);
        throw error;
    }
};