import config from "@payload-config";
import { generatePageMetadata, NotFoundPage } from "@payloadcms/next/views";
import type { Metadata } from "next";
import { importMap } from "../importMap";

type Args = {
  params?: Promise<{ segments?: string[] } | undefined>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined } | undefined>;
};

// Next.js's automatic not-found boundary doesn't always invoke this the same
// way a normal page render would (confirmed live: `args.params` itself can
// resolve to undefined, not just `segments` being missing) — normalize
// defensively against every level being absent, not just the leaf field.
async function normalize(args: Args) {
  const [params, searchParams] = await Promise.all([args.params, args.searchParams]);
  return {
    params: { segments: params?.segments ?? [] },
    searchParams: Object.fromEntries(
      Object.entries(searchParams ?? {}).filter(([, value]) => value !== undefined),
    ) as { [key: string]: string | string[] },
  };
}

export async function generateMetadata(args: Args): Promise<Metadata> {
  const { params, searchParams } = await normalize(args);
  return generatePageMetadata({
    config,
    params: Promise.resolve(params),
    searchParams: Promise.resolve(searchParams),
  });
}

export default async function NotFound(args: Args) {
  const { params, searchParams } = await normalize(args);
  return NotFoundPage({
    config,
    importMap,
    params: Promise.resolve(params),
    searchParams: Promise.resolve(searchParams),
  });
}
