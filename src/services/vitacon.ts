import pb from '@/lib/pocketbase/client'

export interface EmpreendimentoRecord {
  id: string
  nome: string
  bairro?: string
  cidade?: string
  status_obra?: string
  descricao?: string
  ativo?: boolean
  created?: string
  updated?: string
}

export interface UnidadeRecord {
  id: string
  empreendimento_id: string
  identificacao: string
  torre?: string
  metragem?: number
  valor?: number
  status?: 'disponivel' | 'vendida' | 'reservada' | string
  created?: string
  updated?: string
  expand?: {
    empreendimento_id?: EmpreendimentoRecord
  }
}

export type TipoRecompensa = 'percentual' | 'valor_fixo'

export interface ConfigRecompensaRecord {
  id: string
  tipo: TipoRecompensa
  valor: number
  descricao?: string
  ativo?: boolean
  created?: string
  updated?: string
}

export type EstagioVitacon =
  | 'lead_enviado'
  | 'reuniao_realizada'
  | 'gostou'
  | 'ficou_de_pensar'
  | 'proposta'
  | 'fechamento'

export interface EstagioMeta {
  key: EstagioVitacon
  label: string
  description: string
  step: number
  badgeColor: string
}

export const ESTAGIOS_VITACON: EstagioMeta[] = [
  {
    key: 'lead_enviado',
    label: 'Lead enviado',
    description: 'Indicação recebida pela equipe Vitacon',
    step: 1,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'reuniao_realizada',
    label: 'Reunião realizada',
    description: 'Primeiro contato e apresentação realizados',
    step: 2,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    key: 'gostou',
    label: 'Gostou',
    description: 'Indicado aprovou as opções e demonstrou forte interesse',
    step: 3,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    key: 'ficou_de_pensar',
    label: 'Ficou de pensar',
    description: 'Avaliação financeira e decisão familiar em curso',
    step: 4,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'proposta',
    label: 'Proposta',
    description: 'Proposta formal de compra da unidade enviada para análise',
    step: 5,
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    key: 'fechamento',
    label: 'Fechamento',
    description: 'Contrato assinado e compra concluída na Vitacon!',
    step: 6,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
]

export function getEstagioMeta(estagio?: string): EstagioMeta {
  const norm = (estagio || '').toLowerCase().trim()
  if (norm === 'reuniao_realizada' || norm.includes('reuni')) return ESTAGIOS_VITACON[1]
  if (norm === 'gostou') return ESTAGIOS_VITACON[2]
  if (norm === 'ficou_de_pensar' || norm.includes('pensar')) return ESTAGIOS_VITACON[3]
  if (norm === 'proposta') return ESTAGIOS_VITACON[4]
  if (norm === 'fechamento' || norm === 'closed_won' || norm === 'closed')
    return ESTAGIOS_VITACON[5]
  return ESTAGIOS_VITACON[0]
}

/* =========================================================================
   EMPREENDIMENTOS
   ========================================================================= */

export async function listEmpreendimentos(onlyActive = true): Promise<EmpreendimentoRecord[]> {
  try {
    const filter = onlyActive ? 'ativo = true' : ''
    const records = await pb.collection('empreendimentos').getFullList<EmpreendimentoRecord>({
      filter: filter || undefined,
      sort: 'nome',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar empreendimentos:', err)
    return []
  }
}

export async function createEmpreendimento(data: {
  nome: string
  bairro?: string
  cidade?: string
  status_obra?: string
  descricao?: string
  ativo?: boolean
}): Promise<EmpreendimentoRecord> {
  return await pb.collection('empreendimentos').create<EmpreendimentoRecord>({
    ...data,
    ativo: data.ativo ?? true,
  })
}

export async function updateEmpreendimento(
  id: string,
  data: Partial<EmpreendimentoRecord>,
): Promise<EmpreendimentoRecord> {
  return await pb.collection('empreendimentos').update<EmpreendimentoRecord>(id, data)
}

export async function deleteEmpreendimento(id: string): Promise<boolean> {
  return await pb.collection('empreendimentos').delete(id)
}

/* =========================================================================
   UNIDADES
   ========================================================================= */

export async function listUnidades(empreendimentoId?: string): Promise<UnidadeRecord[]> {
  try {
    const filter = empreendimentoId ? `empreendimento_id = "${empreendimentoId}"` : ''
    const records = await pb.collection('unidades').getFullList<UnidadeRecord>({
      filter: filter || undefined,
      sort: 'identificacao',
      expand: 'empreendimento_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar unidades:', err)
    return []
  }
}

export async function createUnidade(data: {
  empreendimento_id: string
  identificacao: string
  torre?: string
  metragem?: number
  valor?: number
  status?: string
}): Promise<UnidadeRecord> {
  return await pb.collection('unidades').create<UnidadeRecord>({
    ...data,
    status: data.status || 'disponivel',
  })
}

export async function updateUnidade(
  id: string,
  data: Partial<UnidadeRecord>,
): Promise<UnidadeRecord> {
  return await pb.collection('unidades').update<UnidadeRecord>(id, data)
}

export async function deleteUnidade(id: string): Promise<boolean> {
  return await pb.collection('unidades').delete(id)
}

/* =========================================================================
   CONFIGURAÇÃO DE RECOMPENSA
   ========================================================================= */

export async function getConfigRecompensa(): Promise<ConfigRecompensaRecord> {
  try {
    const records = await pb.collection('config_recompensa').getFullList<ConfigRecompensaRecord>({
      filter: 'ativo = true',
      sort: '-updated',
    })
    if (records.length > 0) {
      return records[0]
    }
    // Fallback padrão se não houver registro ativo
    return {
      id: '',
      tipo: 'percentual',
      valor: 1,
      descricao: '1% de comissão padrão Vitacon',
      ativo: true,
    }
  } catch (err) {
    console.warn('Aviso ao carregar config_recompensa:', err)
    return {
      id: '',
      tipo: 'percentual',
      valor: 1,
      descricao: '1% de comissão padrão Vitacon',
      ativo: true,
    }
  }
}

export async function saveConfigRecompensa(payload: {
  id?: string
  tipo: TipoRecompensa
  valor: number
  descricao?: string
}): Promise<ConfigRecompensaRecord> {
  if (payload.id) {
    return await pb.collection('config_recompensa').update<ConfigRecompensaRecord>(payload.id, {
      tipo: payload.tipo,
      valor: Number(payload.valor),
      descricao: payload.descricao || '',
      ativo: true,
    })
  }

  // Tenta buscar o primeiro registro para atualizar
  try {
    const list = await pb.collection('config_recompensa').getList<ConfigRecompensaRecord>(1, 1)
    if (list.items.length > 0) {
      return await pb
        .collection('config_recompensa')
        .update<ConfigRecompensaRecord>(list.items[0].id, {
          tipo: payload.tipo,
          valor: Number(payload.valor),
          descricao: payload.descricao || '',
          ativo: true,
        })
    }
  } catch {
    /* intentionally ignored */
  }

  // Cria novo se não existia
  return await pb.collection('config_recompensa').create<ConfigRecompensaRecord>({
    tipo: payload.tipo,
    valor: Number(payload.valor),
    descricao: payload.descricao || '',
    ativo: true,
  })
}

/**
 * Calcula o valor da comissão a partir do valor da compra e da regra
 */
export function calculateReward(
  compraValor: number,
  config: { tipo: TipoRecompensa; valor: number },
): number {
  if (!compraValor || compraValor <= 0) {
    if (config.tipo === 'valor_fixo') {
      return config.valor
    }
    return 0
  }
  if (config.tipo === 'valor_fixo') {
    return config.valor
  }
  // Percentual
  return Math.round(((compraValor * config.valor) / 100) * 100) / 100
}
