import { Metadata } from 'next';
import TagebuchClient from '@/components/tagebuch/TagebuchClient';

export const metadata: Metadata = {
  title: 'Pflegetagebuch | xCare',
  description: 'Tägliche Dokumentation von Vitalwerten, Stimmung, Aktivitäten und Pflegeleistungen',
};

export default function TagebuchPage() {
  return <main className="p-6"><TagebuchClient /></main>;
}
