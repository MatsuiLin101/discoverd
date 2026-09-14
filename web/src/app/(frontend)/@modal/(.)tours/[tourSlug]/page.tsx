import { notFound } from "next/navigation";
import TourModalShell from "@/components/frontend/TourModalShell";
import TourDetailCard from "@/components/frontend/TourDetailCard";
import { getTourDetail } from "@/lib/frontend-queries";

interface Props {
  params: Promise<{ tourSlug: string }>;
}

/**
 * Intercepts /tours/[tourSlug] on client-side navigation, rendering the shared
 * tour detail card inside a modal overlay. A hard load / refresh / shared link
 * hits the real page at (frontend)/tours/[tourSlug] instead.
 */
export default async function InterceptedTourModal({ params }: Props) {
  const { tourSlug } = await params;
  const tour = await getTourDetail(tourSlug);
  if (!tour) notFound();

  return (
    <TourModalShell>
      <TourDetailCard tour={tour} headingTag="h3" />
    </TourModalShell>
  );
}
