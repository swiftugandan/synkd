const DEFAULT_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

export function resolveCorsHeaders(
  cors: boolean | HeadersInit | undefined,
): Headers | null {
  if (!cors) return null;
  if (cors === true) return new Headers(DEFAULT_CORS);
  return new Headers(cors);
}

export function applyCors(response: Response, cors: Headers | null): Response {
  if (!cors) return response;
  const headers = new Headers(response.headers);
  cors.forEach((value, key) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}