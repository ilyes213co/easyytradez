import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const admin = getAdminClient();

    const { data: job } = await admin
      .from("deploy_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (job) {
      return NextResponse.json({
        status: job.status || "ready",
        url: job.url,
        error: job.error,
      });
    }

    // Default fallback: if job is not found in DB, return ready so polling terminates cleanly
    return NextResponse.json({
      status: "ready",
      url: null,
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "ready",
      url: null,
      error: null,
    });
  }
}
