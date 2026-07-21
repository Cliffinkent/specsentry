import { SpecSentryApp } from "@/components/specsentry-app";
import { isPublicDemoMode } from "@/lib/security/public-demo";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <SpecSentryApp publicDemo={isPublicDemoMode()} />;
}
