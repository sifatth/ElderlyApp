# ElderlyApp

A smart, compassionate companion mobile application designed for elderly individuals and their caregivers. Built with **React Native**, **Expo**, **Firebase**, and powered by **Google Gemini Multimodal AI**.

---

## 🌟 Key Features

- **🤖 Multimodal AI Assistant**: Empathetic chat, photo & pill recognition, and voice message processing powered by Google Gemini 2.5 Flash.
- **👥 Dual Roles & Easy Pairing**: Dedicated Elderly and Caregiver modes linked seamlessly via a 12-character invite code.
- **⏰ Smart Reminders**: Real-time synchronized medication and daily wellness schedules.
- **📍 Live GPS Tracking**: Interactive map tracking for caregiver peace of mind.
- **🚨 Instant SOS Alert**: One-tap emergency alert system to notify caregivers immediately.
- **🔒 Secure Authentication**: Strict email verification on sign-up and self-service password reset.

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/sifatth/ElderlyApp.git
cd ElderlyApp

# Install npm packages
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini API Key (Get 100% free from https://aistudio.google.com/app/apikey)
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Active Multimodal AI Model
EXPO_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
```

### 3. Start the Development Server

```bash
npx expo start -c
```

Open the app using **Expo Go** on Android/iOS or run on an emulator/simulator.

---

## 🛠️ Technology Stack

- **Framework**: [Expo](https://expo.dev) / React Native (SDK 54)
- **Routing**: Expo Router (File-based navigation)
- **Backend & Database**: Firebase Authentication & Cloud Firestore
- **AI Engine**: Google Gemini API (`gemini-2.5-flash` / Google AI Studio)
- **Maps**: `react-native-maps` & `expo-location`
- **Audio & Media**: `expo-av`, `expo-image-picker`
- **UI & Icons**: `@expo/vector-icons`, `react-native-gifted-chat`
