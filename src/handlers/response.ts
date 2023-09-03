export interface ResponseParams {
  body: string;
  headers?: { [key: string]: string };
  status?: number;
}

export async function response(params: ResponseParams) {
  return new Response(params.body, {
    headers: (params.headers = {}),
    status: (params.status = 200),
  });
}
