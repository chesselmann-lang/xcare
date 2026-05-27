# xcare Mobile App

React Native / Expo app for xcare.

## Setup
```bash
cd mobile
npx create-expo-app@latest . --template blank-typescript
npm install @supabase/supabase-js expo-router expo-notifications
```

## Features
- Notfall-Knopf (Offline-fähig)
- Vitaldaten-Eingabe
- Pflegebörse durchsuchen
- Video-Konsultation (Daily.co)
- Push-Benachrichtigungen
- Apple Health / Google Fit Integration

## Build
```bash
eas build --platform all
eas submit --platform all
```

## Deep Links
- xcare://notfall → Notfallkarte
- xcare://buchung → Pflegebörse
