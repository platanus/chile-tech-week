import { getTotalLandingSubscribers } from '@/src/queries/landing_subs';
import SponsorDeckClient from './_components/sponsor-deck-client';

interface SponsorDeckPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function SponsorDeckPage({
  params,
}: SponsorDeckPageProps) {
  await params; // Next.js 15 requires awaiting params
  const totalSubscribers = await getTotalLandingSubscribers();

  return <SponsorDeckClient totalSubscribers={totalSubscribers} />;
}
