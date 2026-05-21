@echo off
cd /d "C:\Users\Christian Hesselmann\Documents\Claude\Projects\care\xcare"
git add src/components/anspruch/AnspruchsRechnerMitSpeichern.tsx
git add src/lib/supabase/database.types.ts
git commit -m "fix: TS build errors JSX quote and database types"
git push origin main
