export interface InvalidParam {
  field: string;
  reason: string;
  value_received?: any;
}

export interface ProblemDetailsOptions {
  detail?: string;
  instance?: string;
  traceId?: string;
  invalidParams?: InvalidParam[];
  headers?: Record<string, string>;
}

/**
 * Constrói uma resposta padronizada de erro segundo a RFC 7807 / RFC 9457 (Problem Details).
 */
export function problemDetails(
  status: number,
  code: string,
  title: string,
  options: ProblemDetailsOptions = {}
): Response {
  const body = {
    type: `https://api.docs.dev/errors/${code.toLowerCase().replace(/_/g, "-")}`,
    title,
    status,
    code,
    detail: options.detail || title,
    instance: options.instance,
    trace_id: options.traceId || `req_${crypto.randomUUID().slice(0, 8)}`,
    ...(options.invalidParams && options.invalidParams.length > 0
      ? { invalid_params: options.invalidParams }
      : {})
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/problem+json; charset=utf-8",
      ...(options.headers || {})
    }
  });
}
