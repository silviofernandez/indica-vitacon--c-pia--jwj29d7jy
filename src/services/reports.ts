import pb from '@/lib/pocketbase/client'

export type ReportKind = 'indicator' | 'financial'
export type ReportFormat = 'pdf' | 'excel'

export interface GenerateReportPayload {
  kind: ReportKind
  format: ReportFormat
  indicator_id?: string
}

export interface GenerateReportResponse {
  success: boolean
  report_id?: string
  report_url?: string
  file_name?: string
  kind?: ReportKind
  format?: ReportFormat
  content_type?: string
  generated_at?: string
  metadata?: Record<string, unknown>
  error?: string
}

export interface ReportRecord {
  id: string
  owner: string
  kind: ReportKind
  format: ReportFormat
  file: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

/**
 * Chama a rota POST /backend/v1/generate-report para gerar os relatórios em PDF ou Excel.
 */
export async function generateReport(
  payload: GenerateReportPayload,
): Promise<GenerateReportResponse> {
  try {
    const res = await pb.send<GenerateReportResponse>('/backend/v1/generate-report', {
      method: 'POST',
      body: payload,
    })

    if (!res || !res.report_url) {
      return {
        success: false,
        error: 'Não foi possível gerar o relatório. Tente novamente.',
      }
    }

    // Resolve URL completa do arquivo se retornado caminho relativo
    let fullUrl = res.report_url
    if (fullUrl.startsWith('/')) {
      fullUrl = `${pb.baseUrl}${fullUrl}`
    }

    // Se o PocketBase tiver token de arquivo (para coleções protegidas)
    try {
      const fileToken = await pb.files.getToken()
      if (fileToken) {
        const separator = fullUrl.includes('?') ? '&' : '?'
        fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(fileToken)}`
      }
    } catch (_) {
      // Ignora erro ao obter token caso o endpoint de arquivo seja público
    }

    return {
      ...res,
      report_url: fullUrl,
    }
  } catch (err: unknown) {
    console.error('Erro ao gerar relatório:', err)
    const errorMsg =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      typeof (err as { response?: { error?: string } }).response?.error === 'string'
        ? (err as { response: { error: string } }).response.error
        : 'Não foi possível gerar o relatório. Tente novamente.'

    return {
      success: false,
      error: errorMsg,
    }
  }
}

/**
 * Abre ou força o download da URL do relatório gerado no navegador.
 */
export function downloadReportUrl(url: string, filename?: string): void {
  if (!url) return

  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  if (filename) {
    link.download = filename
  }
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Lista relatórios anteriores gerados pelo usuário logado
 */
export async function listUserReports(kind?: ReportKind): Promise<ReportRecord[]> {
  try {
    let filter = ''
    if (kind) {
      filter = `kind = "${kind}"`
    }
    const records = await pb.collection('reports').getFullList<ReportRecord>({
      filter,
      sort: '-created',
      requestKey: null,
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar relatórios:', err)
    return []
  }
}
