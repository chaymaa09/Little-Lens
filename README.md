# Little Lens

**Little Lens** is a storytelling platform for children that transforms a user’s prompt into a unique, personalized story, delivering it as an immersive visual and auditory “storybook” experience.

Each story is designed to nurture empathy, responsibility, confidence, and strong moral character — all through magical storytelling.

> *Stories that shape hearts and minds.*


---

## Features
- Story Generation: Uses natural language processing to create a multi-scene story from a simple prompt.
- Visuals: Generates unique illustrations for each scene in the story.
- Audio Narration: Provides synchronized voice-over narration for the story.
- Cinematic Mode: A full-screen, automated playthrough of the story with background music and cinematic camera movements.
- Kid-Friendly Aesthetic: A colorful, approachable, and untuitive style user interface.

## Technology Stack
- Frontend: React.js, Framer Motion 
- AI Text Generation: Mistral AI API
- AI Image Generation: Hugging Face Inference API
- AI Audio Transcription: Voxtral (Mistral AI Speech Recognition)
- AI Voice Generation: ElevenLabs API

## Quick Start

```bash
git clone https://github.com/chaymaa09/Little-Lens.git
cd Little-Lens
npm install
```

Add your API keys in `src/config.js`:

```js
export const MISTRAL_API_KEY = "your-mistral-api-key";
export const HF_API_KEY = "your-huggingface-token";
export const ELEVENLABS_API_KEY = "your-elevenlabs-api-key";
```

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000).


## Orchestration Flow

The system follows a pipeline architecture where **Mistral AI acts as the orchestrator** :

1. **User → Mistral AI** — The user sends a short story prompt from the React app. Mistral (ministral-14b-latest) generates a complete story blueprint : text, image prompts, animation cues, sound effects, and background music selection.

2. **Story → Parallel Processing** — The blueprint is split into three parallel pipelines:
   - **Narration Text → ElevenLabs API** — Each scene's narration is converted to speech audio using ElevenLabs.
   - **Image Prompts → Hugging Face API** — Scene-specific prompts are sent to Stable Diffusion XL (stable-diffusion-xl-base-1.0) to generate illustrations for each scene in parallel.
   - **Animation Cues → Framer Motion** — Camera movement instructions to animate the scene images during playback.

3. **Audio → Mistral Speech Recognition (Voxtral)** — The generated audio is sent to Voxtral Mini for transcription with word-level timestamps.


## Architecture


```
src/
├── App.js                        # Main app — UI, state, story playback logic
├── config.js                     # API keys (Mistral, HuggingFace, ElevenLabs)
└── services/
    ├── mistralService.js          # Mistral AI chat completion → JSON story blueprint
    ├── hfService.js               # Hugging Face SDXL → scene illustrations
    ├── voiceService.js            # ElevenLabs TTS → narration audio
    ├── transcriptionService.js    # Voxtral Mini → word-level timestamps
    └── bgMusicService.js          # Background music player (loop, pause, volume)

public/
├── systemPrompt.txt              # System prompt defining the story JSON schema
└── bg_sounds/                    # Background music tracks (.mp3)
```




