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




