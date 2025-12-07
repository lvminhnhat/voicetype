# VoiceType

VoiceType is a modern, lightweight **Voice-to-Text** application built with Electron. It uses the power of the **Google Gemini API** to provide accurate, context-aware speech recognition in real-time.

Designed for productivity, VoiceType features a minimalist overlay, global hotkeys, and auto-paste functionality, making it easy to dictate text explicitly into any application.

![VoiceType Screenshot](assets/logo.png)

## ✨ Features

*   **🎙️ AI-Powered Transcription**: High-accuracy speech-to-text using **Gemini 2.5 Flash Lite Preview**.
*   **🤖 Smart Correction**: Automatic grammar and spelling correction using **Gemini 1.5 Flash**.
*   **🧩 Overlay UI**: Unobtrusive floating window that appears only when you need it.
*   **⌨️ Global Hotkey**: Toggle recording instantly from anywhere (Default: `Ctrl+Alt+V`).
*   **📋 Auto-Paste**: Automatically types the transcribed text into your active window.
*   **📝 History Management**: Keep track of your past transcriptions with options to copy, edit, or delete.
*   **🔑 API Key Rotation**: Support for multiple API keys to handle rate limits gracefully.
*   **🎨 Modern Design**: Sleek, dark-themed UI with cyberpunk accents.

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v16 or higher)
*   A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/lvminhnhat/voicetype.git
    cd voicetype
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the application:
    ```bash
    npm start
    ```

## ⚙️ Configuration

1.  **API Key**: On the first launch, go to the **Settings** tab and enter your Gemini API Key. You can add multiple keys for robustness.
2.  **Language**: Select your preferred language (Vietnamese `vi-VN` or English `en-US`).
3.  **Auto-Paste**: Toggle this if you want the text to be typed directly into your cursor's focus.

## 🛠️ Tech Stack

*   **Electron**: Cross-platform desktop framework.
*   **Google Gemini API**: Generative AI for speech understanding.
*   **HTML/CSS/JS**: Vanilla web technologies for a fast and lightweight frontend.

## 👤 Author

**Minnyat**
*   Website: [minnyat.dev](https://minnyat.dev)

## 📄 License

This project is licensed under the ISC License.
