import config from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";
import type { Metadata } from "next";
import { importMap } from "../importMap";

type Args = {
  params?: Promise<{ segments?: string[] } | undefined>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined } | undefined>;
};

// Next's generated types for an optional catch-all route make `segments`
// and search param values possibly-undefined; Payload's view helpers want
// non-optional shapes. Also defensive against `params`/`searchParams`
// themselves resolving to undefined — confirmed live that Next.js's
// not-found boundary can invoke a sibling route file that way, so the same
// defensive shape is used here for consistency even though the plain page
// render hasn't been observed to hit it.
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

export default async function Page(args: Args) {
  const { params, searchParams } = await normalize(args);
  return RootPage({
    config,
    importMap,
    params: Promise.resolve(params),
    searchParams: Promise.resolve(searchParams),
  });
}
