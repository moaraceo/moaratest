/**
 * 백엔드 API 클라이언트
 * - 모든 요청에 Authorization 헤더 자동 첨부
 * - accessToken은 호출 시점에 인자로 받아 순환 의존 방지
 */

const BASE_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";

export async function apiFetch<T = unknown>(
  path: string,
  accessToken: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const body = (await res.json()) as { ok: boolean; data?: T; error?: { message: string } };

  if (!body.ok) {
    throw new Error(body.error?.message ?? `API 오류 (${res.status})`);
  }
  return body.data as T;
}
