import { Metadata } from 'next';
import SturzpraeventionClient from '@/components/sturzpraevention/SturzpraeventionClient';
export const metadata: Metadata = { title: 'Sturzprävention | xCare', description: 'Morse Fall Scale Assessment und Sturzprotokoll' };
export default function SturzpraeventionPage() { return <main className="p-6"><SturzpraeventionClient /></main>; }
