import { problemDetails } from "./errors";

interface Job {
  id: string;
  type: string;
  status: "queued" | "processing" | "completed";
  created_at: string;
  progress: number;
  result_url?: string;
}

const jobsDb = new Map<string, Job>();

export async function handleReports(req: Request, url: URL): Promise<Response> {
  const method = req.method;

  // POST /api/v1/reports -> Enfileira e responde com 202 Accepted
  if (method === "POST") {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Aceita body vazio ou padrão
    }

    const jobId = `job_${Math.random().toString(36).substring(2, 8)}`;
    const newJob: Job = {
      id: jobId,
      type: body.type || "sales_annual_summary",
      status: "queued",
      progress: 0,
      created_at: new Date().toISOString()
    };

    jobsDb.set(jobId, newJob);

    // Simula processamento em background assíncrono
    setTimeout(() => {
      const job = jobsDb.get(jobId);
      if (job) {
        job.status = "processing";
        job.progress = 50;
      }
    }, 3000);

    setTimeout(() => {
      const job = jobsDb.get(jobId);
      if (job) {
        job.status = "completed";
        job.progress = 100;
        job.result_url = `https://storage.exemplo.com/reports/${jobId}.pdf`;
      }
    }, 7000);

    return new Response(
      JSON.stringify(
        {
          data: {
            job_id: newJob.id,
            status: newJob.status,
            message: "O relatório foi adicionado à fila de geração assíncrona.",
            poll_url: `/api/v1/jobs/${newJob.id}`
          }
        },
        null,
        2
      ),
      {
        status: 202, // Accepted
        headers: {
          "Content-Type": "application/json",
          Location: `/api/v1/jobs/${newJob.id}`
        }
      }
    );
  }

  return problemDetails(405, "METHOD_NOT_ALLOWED", "Método Não Permitido", { instance: url.pathname });
}

export function handleJobs(req: Request, url: URL): Response {
  const pathParts = url.pathname.replace(/^\/api\/v1\/jobs\/?/, "").split("/").filter(Boolean);
  const jobId = pathParts[0];

  if (!jobId) {
    return Response.json({ data: Array.from(jobsDb.values()) });
  }

  const job = jobsDb.get(jobId);
  if (!job) {
    return problemDetails(404, "JOB_NOT_FOUND", "Tarefa Assíncrona Não Localizada", {
      detail: `O job '${jobId}' não existe ou já expirou.`,
      instance: url.pathname
    });
  }

  return Response.json({ data: job });
}
