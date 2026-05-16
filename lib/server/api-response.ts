import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data, error: null }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}
