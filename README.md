# EchoHands - Frontend UI

Welcome to the frontend repository for **EchoHands**, a real-time Sign Language to Speech Converter. 

This repository implements the user interface, manages web camera input capture, displays real-time hand tracking landmarks, and provides instant speech synthesis output for recognized signs.

---

## 🚀 Key Features

* **Real-time Camera Stream Capture**: Standard interface for requesting user camera permissions and capturing video frames locally.
* **Hand Landmark Visualization**: Interactive canvas representation drawing 21 core hand joints and skeleton links to show real-time tracking feedback.
* **Web Speech Synthesis Integration**: Custom controls to modify speech velocity, pitch, select from localized system voices, and play translation logs aloud.
* **Futuristic Dark-First UI**: Premium responsive layout designed using HSL color systems, glassmorphic panels, and glowing scanline indicators.
* **Sign Translation Simulator**: Interactive demo mode demonstrating the end-to-end pipeline (sign gesture to spoken word) with sound synthesis.

---

## 🛠️ Technology Stack

- **Framework**: [React.js](https://react.dev/) + [Vite](https://vite.dev/) (React SPA bundle)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) for lightning-fast build compilation and design utility utilities.
- **Font**: [Outfit](https://fonts.google.com/specimen/Outfit) via Google Fonts.

---

## 📁 Repository Structure

```text
Echohands-Frontend/
├── .git/                 # Git metadata
├── .gitignore            # Git exclusion rules
├── index.html            # Primary application entrypoint
├── package.json          # Dependency scripts & configurations
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration (with Tailwind plugin)
├── public/               # Static assets
└── src/                  # Core application source
    ├── assets/           # Images and SVG icons
    ├── App.tsx           # Dashboard UI and simulation logic
    ├── index.css         # Tailwind directive imports & base styles
    └── main.tsx          # React application root DOM renderer
```

---

## 🚦 Getting Started

### Prerequisites

You must have **Node.js** (v18+) and **npm** installed on your system.

### Installation

1. Clone or navigate to the repository directory:
   ```bash
   cd Echohands-Frontend
   ```

2. Install all node dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

### Building for Production

Compile a production-ready optimized build:
```bash
npm run build
```
The output bundle will be generated under the `/dist` directory.

---

## 💡 Accessibility and Web APIs

EchoHands utilizes standard web APIs native to modern browsers:
- **MediaDevices API**: Accesses the client webcam stream for landmark tracking.
- **Canvas API**: Renders visual skeletons representing the hand joints at high frame rates.
- **SpeechSynthesis API**: Local text-to-speech engine running entirely offline inside the client browser.
