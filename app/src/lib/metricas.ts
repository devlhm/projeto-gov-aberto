/**
 * Métricas de cobertura e classificação de "Deserto de Serviços".
 *
 * FÓRMULAS (documentação para a banca):
 *
 *   habitantes_por_equip_saude    = populacao_total / nº de equipamentos de saúde do bairro
 *   habitantes_por_equip_educacao = populacao_total / nº de equipamentos de educação do bairro
 *
 *   Classificação por serviço (quanto MENOR a razão, melhor a cobertura):
 *     adequado  razão <= LIMIAR_*_ADEQUADO
 *     atenção   LIMIAR_*_ADEQUADO < razão <= LIMIAR_*_CRITICO
 *     crítico   razão > LIMIAR_*_CRITICO  (ou bairro SEM equipamento — razão infinita)
 *
 *   Status geral do bairro = o PIOR entre saúde e educação; se o resultado
 *   for "atenção" e a densidade demográfica for alta (>= LIMIAR_DENSIDADE_ALTA),
 *   o status é agravado para "crítico" — muita gente disputando pouca
 *   infraestrutura caracteriza o deserto de serviços.
 *
 * Os limiares abaixo são constantes nomeadas, calibráveis conforme a equipe
 * refinar a metodologia (referência inicial: uma equipe de Saúde da Família
 * cobre ~3–4 mil pessoas; uma UBS típica referencia até ~10 mil).
 */

import type { BairroProps, EquipamentoProps, FeaturePonto } from '../types'

/* ----------------- LIMIARES CALIBRÁVEIS ----------------- */

/** Saúde: até 10 mil hab/equipamento = adequado */
export const LIMIAR_SAUDE_ADEQUADO = 10_000
/** Saúde: acima de 18 mil hab/equipamento = crítico */
export const LIMIAR_SAUDE_CRITICO = 18_000

/** Educação: até 6 mil hab/equipamento = adequado */
export const LIMIAR_EDU_ADEQUADO = 6_000
/** Educação: acima de 12 mil hab/equipamento = crítico */
export const LIMIAR_EDU_CRITICO = 12_000

/** Densidade (hab/km²) considerada alta — agrava "atenção" para "crítico" */
export const LIMIAR_DENSIDADE_ALTA = 13_000

/* --------------------------------------------------------- */

export type Status = 'adequado' | 'atencao' | 'critico'

/** Rótulos e cores semânticas de cada status (tokens em theme/tokens.css) */
export const INFO_STATUS: Record<Status, { rotulo: string; corVar: string }> = {
  adequado: { rotulo: 'Adequado', corVar: 'var(--status-adequado)' },
  atencao: { rotulo: 'Atenção', corVar: 'var(--status-atencao)' },
  critico: { rotulo: 'Crítico', corVar: 'var(--status-critico)' },
}

export interface MetricasBairro {
  nEquipSaude: number
  nEquipEducacao: number
  /** Infinity quando o bairro não tem nenhum equipamento do tipo */
  habPorEquipSaude: number
  habPorEquipEducacao: number
  statusSaude: Status
  statusEducacao: Status
  /** pior(saúde, educação), agravado por densidade alta */
  statusGeral: Status
}

const PESO_STATUS: Record<Status, number> = { adequado: 0, atencao: 1, critico: 2 }

function classificar(razao: number, limAdequado: number, limCritico: number): Status {
  if (!Number.isFinite(razao) || razao > limCritico) return 'critico'
  if (razao > limAdequado) return 'atencao'
  return 'adequado'
}

/** Conta equipamentos de saúde/educação por bairro (casamento pelo nome). */
export function contarEquipamentosPorBairro(
  equipamentos: FeaturePonto[],
): Map<string, { saude: number; educacao: number }> {
  const contagem = new Map<string, { saude: number; educacao: number }>()
  for (const { properties: eq } of equipamentos) {
    const atual = contagem.get(eq.bairro) ?? { saude: 0, educacao: 0 }
    atual[eq.tipo] += 1
    contagem.set(eq.bairro, atual)
  }
  return contagem
}

/** Calcula todas as métricas de cobertura de um bairro. */
export function calcularMetricas(
  bairro: BairroProps,
  contagem: Map<string, { saude: number; educacao: number }>,
): MetricasBairro {
  const { saude, educacao } = contagem.get(bairro.nome) ?? { saude: 0, educacao: 0 }

  const habPorEquipSaude = saude > 0 ? bairro.populacao_total / saude : Infinity
  const habPorEquipEducacao = educacao > 0 ? bairro.populacao_total / educacao : Infinity

  const statusSaude = classificar(habPorEquipSaude, LIMIAR_SAUDE_ADEQUADO, LIMIAR_SAUDE_CRITICO)
  const statusEducacao = classificar(habPorEquipEducacao, LIMIAR_EDU_ADEQUADO, LIMIAR_EDU_CRITICO)

  // pior dos dois serviços...
  let statusGeral: Status =
    PESO_STATUS[statusSaude] >= PESO_STATUS[statusEducacao] ? statusSaude : statusEducacao
  // ...agravado quando a densidade é alta (deserto de serviços)
  if (statusGeral === 'atencao' && bairro.densidade >= LIMIAR_DENSIDADE_ALTA) {
    statusGeral = 'critico'
  }

  return {
    nEquipSaude: saude,
    nEquipEducacao: educacao,
    habPorEquipSaude,
    habPorEquipEducacao,
    statusSaude,
    statusEducacao,
    statusGeral,
  }
}

/** Formata a razão hab/equipamento para exibição ("1 p/ 8.500 hab" | "sem equipamento") */
export function formatarRazao(razao: number): string {
  if (!Number.isFinite(razao)) return 'sem equipamento'
  return `1 p/ ${Math.round(razao).toLocaleString('pt-BR')} hab`
}

/** Aplica os filtros "best effort" à lista de equipamentos.
 *  Regra: o toggle de categoria restringe o tipo; os chips de flag só
 *  restringem equipamentos do SEU tipo (ex.: "24h" filtra saúde sem
 *  esconder as escolas quando a categoria é "todos"). */
export function filtrarEquipamentos(
  equipamentos: FeaturePonto[],
  filtros: {
    categoria: 'todos' | 'saude' | 'educacao'
    educacaoInfantil: boolean
    ensinoFundamental: boolean
    ambulatorial: boolean
    turno24h: boolean
  },
): FeaturePonto[] {
  return equipamentos.filter(({ properties: eq }) => {
    if (filtros.categoria !== 'todos' && eq.tipo !== filtros.categoria) return false

    if (eq.tipo === 'saude') {
      const flagsAtivas = filtros.ambulatorial || filtros.turno24h
      if (flagsAtivas) {
        const passa =
          (filtros.ambulatorial && eq.ambulatorial) || (filtros.turno24h && eq.atende_24h)
        if (!passa) return false
      }
    } else {
      const flagsAtivas = filtros.educacaoInfantil || filtros.ensinoFundamental
      if (flagsAtivas) {
        const passa =
          (filtros.educacaoInfantil && eq.educacao_infantil) ||
          (filtros.ensinoFundamental && eq.ensino_fundamental)
        if (!passa) return false
      }
    }
    return true
  })
}

export type { EquipamentoProps }
