import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getBook } from "@/lib/db";
import { helperUnlockCookie, helperUnlockToken } from "@/lib/serverAuth";
import SiteViewer from "@/components/SiteViewer";
import HelperGate from "@/components/HelperGate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: { bid: string; fid: string };
}): Promise<Metadata> {
  const book = await getBook(params.bid);
  const helper = book?.cover.helperFiles?.find((h) => h.id === params.fid);
  return { title: helper?.name || "NextviroPublish" };
}

export default async function HelperPreviewPage({
  params,
}: {
  params: { bid: string; fid: string };
}) {
  const book = await getBook(params.bid);
  const helper = book?.cover.helperFiles?.find((h) => h.id === params.fid);
  if (!helper) notFound();

  if (helper.password) {
    const cookie = cookies().get(
      helperUnlockCookie(params.bid, params.fid)
    )?.value;
    if (cookie !== helperUnlockToken(params.bid, params.fid)) {
      return (
        <HelperGate bid={params.bid} fid={params.fid} title={helper.name} />
      );
    }
  }

  return <SiteViewer src={`/h/${params.bid}/${params.fid}/raw`} />;
}
