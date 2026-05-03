import { NextResponse } from "next/server"

export const dynamic = "force-static"

export const APP_VERSION = "0.1.0"

export function GET() {
  return NextResponse.json({ status: "ok", version: APP_VERSION })
}
