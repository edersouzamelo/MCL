import { NextResponse } from "next/server";
import oms from "@/data/oms.json";

export async function GET() {
  return NextResponse.json(oms);
}
