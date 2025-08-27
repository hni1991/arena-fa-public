// src/app/u/[username]/page.tsx
import PublicProfileClient from "./PublicProfileClient";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params; // Next.js 15: params یک Promise است
  return <PublicProfileClient username={decodeURIComponent(username)} />;
}
