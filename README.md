# Little Lens

Little Lens is an interactive storytelling web application designed for children. It generates unique, personalized stories based on a user's prompt, turning them into a visual and auditory "storybook" experience.

## Features
- Story Generation: Uses natural language processing to create a multi-scene story from a simple prompt.
- Visuals: Generates unique illustrations for each scene in the story.
- Audio Narration: Provides synchronized voice-over narration for the story.
- Cinematic Mode: A full-screen, automated playthrough of the story with background music and cinematic camera movements.
- Kid-Friendly Aesthetic: A colorful, approachable, "sticker-book" style user interface.

## Technology Stack
- Frontend: React.js, Framer Motion (for animations)
- AI Text Generation: Mistral AI API
- AI Image Generation: Hugging Face Inference API
- AI Voice Generation: ElevenLabs API
- AI Audio Transcription: Voxtral (Mistral AI Speech Recognition)

## Setup Instructions

Follow these step-by-step instructions to run the project locally.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- Node.js (version 16 or higher recommended)
- npm (usually comes with Node.js)
- Git

### 2. Clone the Repository
Clone the project repository to your local machine using Git:
```bash
git clone https://github.com/chaymaa09/Little-Lens.git
cd Little-Lens
```

### 3. Install Dependencies
Install all required Node.js packages:
```bash
npm install
```

### 4. Configure Environment Variables
The application requires API keys to connect to the various AI services.

1. In the root directory of the project, locate the file named `env.example`.
2. Copy this file and rename the copy to `.env`.
3. Open the `.env` file and fill in your API keys for the following variables:
   - `REACT_APP_MISTRAL_API_KEY`: Your Mistral AI API key.
   - `REACT_APP_HF_TOKEN`: Your Hugging Face access token.
   - `REACT_APP_ELEVENLABS_API_KEY`: Your ElevenLabs API key.

Note: Never commit your `.env` file to version control. It is already included in the `.gitignore` file.

### 5. Start the Development Server
Run the following command to start the React development server:
```bash
npm start
```

### 6. View the Application
Once the server starts, it should automatically open your default web browser to the application running at:
`http://localhost:3000`

## Usage
1. Open the application in your browser.
2. In the input box, type a short prompt describing the story you want to hear. Example: "A brave little toaster goes on an adventure."
3. Click the "Tell Me a Story" button.
4. Wait for the AI models to generate the text, images, and audio.
5. Once complete, you can read through the generated pages manually or click "Watch Story" to enter Cinematic Mode.
