import { HUGGINGFACE_API_KEY as HF_API_KEY } from "../config";

export async function generateImageFromPrompt(promptText) {
  if (!promptText?.trim()) {
    console.error("No valid image prompt provided", { promptText });
    throw new Error("No image prompt provided");
  }

  console.log("Generating image with prompt:", promptText);

  const response = await fetch(
    "https://router.huggingface.co/nscale/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        prompt: promptText,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HF API error: ${text}`);
  }

  const data = await response.json();
  console.log("HF API response data:", data);

  // OpenAI-compatible format: { data: [{ b64_json: "..." }] }
  const base64Image = data?.data?.[0]?.b64_json;

  if (!base64Image) throw new Error("No image returned from HF API");

  return `data:image/png;base64,${base64Image}`;
}

