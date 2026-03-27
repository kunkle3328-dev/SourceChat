# SourceChat: Advanced AI Research & Live Voice Synthesis

SourceChat is a professional-grade AI research application designed to synthesize information from multiple sources (PDFs, text files, and websites) into actionable insights. It features a cutting-edge **Live AI Voice** interface that allows for real-time, natural language discussions with your data.

## 🚀 Key Features

### 📚 Multi-Source Notebooks
- **File Uploads:** Support for PDFs and text files with automatic content extraction.
- **Web Integration:** Paste any URL to instantly summarize and integrate web content into your research context.
- **Notebook Organization:** Group your sources into dedicated notebooks for different projects or research topics.

### 🎙️ Live AI Voice (Voice Mode)
- **Real-Time Interaction:** Engage in low-latency voice conversations with a specialized Gemini-powered AI.
- **Mini-Player Mode:** Minimize the voice modal into a sleek bottom-bar player to continue your conversation while browsing your sources.
- **Live Transcript:** View a real-time, scrolling transcript of your conversation with user and AI turns clearly marked.
- **Advanced Controls:**
    - **Web Search Toggle:** Allow the AI to supplement your sources with real-time web information.
    - **Source-Grounded Mode:** Force the AI to stick strictly to your uploaded documents.
    - **Voice Selection:** Choose from multiple professional AI voices (Puck, Charon, Kore, Fenrir, Zephyr).

### 💬 Intelligent Chat
- **Context-Aware Responses:** The AI uses all active sources in your notebook to provide grounded, accurate answers.
- **Markdown Support:** Rich text formatting for code snippets, tables, and structured data.
- **Session Summaries:** Automatically generates a detailed "Session Insights & Synthesis" report after every voice conversation.

### 📱 Premium Mobile Experience
- **Responsive Design:** Fully optimized for mobile devices with "flush" and centered layouts.
- **Keyboard Awareness:** UI elements adapt dynamically to prevent overlap when the mobile keyboard is active.
- **Glassmorphism UI:** A modern, professional aesthetic with layered blurs and high-contrast typography.

## 🛠️ Technical Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion (`motion/react`)
- **Icons:** Lucide React
- **AI Engine:** Google Gemini API (`@google/genai`)
- **Audio:** Web Audio API for real-time PCM streaming and recording
- **Persistence:** LocalStorage for notebooks, sources, and message history

## 📖 How to Use

1. **Create a Notebook:** Start by naming your research project.
2. **Add Sources:** Upload PDFs or paste website links. The AI will automatically summarize them.
3. **Ask Questions:** Use the chat interface to query your sources.
4. **Go Live:** Click the microphone icon on any AI response to start a **Live Voice Session**. Discuss the findings, ask follow-up questions, and get instant verbal responses.
5. **Review Insights:** After a voice session, check the chat history for a generated summary of the discussion.

## 🔒 Privacy & Security

- **Local Storage:** Your data (notebooks, sources, messages) is stored locally in your browser.
- **Streaming Audio:** Voice data is streamed securely to Google Gemini for real-time processing and is not stored permanently on the server.

---

*Developed with a focus on professional research workflows and cutting-edge AI interaction.*
