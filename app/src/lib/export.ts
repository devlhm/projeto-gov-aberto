/**
 * Exportação de DADOS ABERTOS por bairro (JSON e CSV).
 * Pilar de transparência do projeto: qualquer pessoa — gestora, jornalista,
 * pesquisadora — pode baixar os dados brutos + métricas de um bairro.
 */

import type { BairroProps, FeaturePonto } from '../types'
import type { MetricasBairro } from './metricas'

/** Monta o pacote de dados abertos de um bairro (usado no JSON). */
function montarPacote(
  bairro: BairroProps,
  metricas: MetricasBairro,
  equipamentos: FeaturePonto[],
) {
  return {
    fonte: 'Raio de Cidadania — Observatório de Justiça Climática de São Vicente',
    gerado_em: new Date().toISOString(),
    nota_metodologica:
      '"negros" agrega pretos + pardos (categorias IBGE). ' +
      'Status: adequado/atenção/crítico conforme habitantes por equipamento e densidade — ver README do projeto.',
    bairro: {
      ...bairro,
      metricas: {
        equipamentos_saude: metricas.nEquipSaude,
        equipamentos_educacao: metricas.nEquipEducacao,
        habitantes_por_equip_saude: Number.isFinite(metricas.habPorEquipSaude)
          ? Math.round(metricas.habPorEquipSaude)
          : null,
        habitantes_por_equip_educacao: Number.isFinite(metricas.habPorEquipEducacao)
          ? Math.round(metricas.habPorEquipEducacao)
          : null,
        status_saude: metricas.statusSaude,
        status_educacao: metricas.statusEducacao,
        status_geral: metricas.statusGeral,
      },
    },
    equipamentos: equipamentos.map((e) => e.properties),
  }
}

/** Dispara o download de um arquivo gerado no navegador. */
function baixarArquivo(conteudo: string, nomeArquivo: string, mime: string) {
  const blob = new Blob([conteudo], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}

function slug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (diacríticos combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

/** Exporta os dados do bairro em JSON. */
export function exportarJSON(
  bairro: BairroProps,
  metricas: MetricasBairro,
  equipamentos: FeaturePonto[],
) {
  const pacote = montarPacote(bairro, metricas, equipamentos)
  baixarArquivo(
    JSON.stringify(pacote, null, 2),
    `raio-cidadania_${slug(bairro.nome)}.json`,
    'application/json;charset=utf-8',
  )
}

/**
 * Exporta os dados do bairro em CSV (uma linha por equipamento; as colunas
 * do bairro se repetem para facilitar análise em planilha).
 * Usa ";" como separador e BOM UTF-8 — abre corretamente no Excel pt-BR.
 */
export function exportarCSV(
  bairro: BairroProps,
  metricas: MetricasBairro,
  equipamentos: FeaturePonto[],
) {
  const cabecalho = [
    'bairro', 'populacao_total', 'area_km2', 'densidade',
    'raca_brancos', 'raca_negros', 'raca_indigenas', 'raca_amarelos',
    'habitantes_por_equip_saude', 'habitantes_por_equip_educacao',
    'status_saude', 'status_educacao', 'status_geral',
    'equipamento', 'tipo', 'subtipo', 'endereco',
    'atende_24h', 'ambulatorial', 'educacao_infantil', 'ensino_fundamental',
    'lat', 'lng',
  ]

  const colunasBairro = [
    bairro.nome, bairro.populacao_total, bairro.area_km2, bairro.densidade,
    bairro.raca.brancos, bairro.raca.negros, bairro.raca.indigenas, bairro.raca.amarelos,
    Number.isFinite(metricas.habPorEquipSaude) ? Math.round(metricas.habPorEquipSaude) : '',
    Number.isFinite(metricas.habPorEquipEducacao) ? Math.round(metricas.habPorEquipEducacao) : '',
    metricas.statusSaude, metricas.statusEducacao, metricas.statusGeral,
  ]

  // célula CSV segura (aspas duplicadas, campo entre aspas se necessário)
  const celula = (v: unknown) => {
    const s = String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const linhas: string[] = [cabecalho.join(';')]
  if (equipamentos.length === 0) {
    // bairro sem equipamento: exporta ao menos a linha de métricas
    linhas.push([...colunasBairro, '', '', '', '', '', '', '', '', '', ''].map(celula).join(';'))
  } else {
    for (const { properties: eq } of equipamentos) {
      linhas.push(
        [
          ...colunasBairro,
          eq.nome, eq.tipo, eq.subtipo, eq.endereco,
          eq.atende_24h, eq.ambulatorial, eq.educacao_infantil, eq.ensino_fundamental,
          eq.lat, eq.lng,
        ]
          .map(celula)
          .join(';'),
      )
    }
  }

  // \uFEFF = BOM para o Excel reconhecer UTF-8
  baixarArquivo(
    '\uFEFF' + linhas.join('\n'),
    `raio-cidadania_${slug(bairro.nome)}.csv`,
    'text/csv;charset=utf-8',
  )
}
