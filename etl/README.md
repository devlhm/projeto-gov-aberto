# ETL — Raio de Cidadania

"O motor" do protótipo: scripts Python (somente biblioteca padrão, sem
dependências) que produzem os GeoJSON consumidos pelo app.

## Scripts

### `gerar_dados_mock.py` — dados de demonstração

Gera os arquivos que o app usa hoje (`app/public/data/*.geojson`):

```bash
python3 etl/gerar_dados_mock.py
```

- 15 bairros reais de São Vicente, com centroides ancorados em coordenadas
  reais extraídas dos CSVs do INEP/CNES;
- polígonos por **células de Voronoi** recortadas em contornos aproximados
  da ilha, da área continental e da península do Japuí (bairros adjacentes,
  sem sobreposição);
- 51 equipamentos com nomes reais (UBS Catiapoã, Pronto-Socorro Central,
  Creche Municipal Cora Coralina…);
- distribuição **desigual de propósito**: a área continental concentra os
  desertos de serviço (Humaitá e Quarentenário críticos; Vila Margarida
  crítica por densidade — região real de palafitas);
- ao final imprime uma tabela de verificação reproduzindo as fórmulas do
  front (`app/src/lib/metricas.ts`).

### `processar_dados.py` — dados reais (CNES + INEP + Censo)

Lê os CSVs brutos de `dados/` e o `censo_bairros_exemplo.csv` e produz os
mesmos GeoJSON com **dados reais**:

```bash
python3 etl/processar_dados.py            # escreve em etl/saida/ (conferência)
python3 etl/processar_dados.py --para-app # substitui o mock do app
```

O que ele faz:

1. **Saúde (CNES)** — reconstrói as coordenadas corrompidas (pontos de
   milhar), mantém só estabelecimentos **públicos** (natureza jurídica
   `1xxx`), classifica o subtipo pelo nome (UBS, ESF, Hospital,
   Pronto-Socorro, Pronto Atendimento, Ambulatório) e deriva as flags
   `atende_24h` (turno contínuo) e `ambulatorial`.
2. **Educação (INEP)** — cruza o catálogo organizado (coordenadas) com o
   detalhe INEP (etapas de ensino, dependência administrativa), mantém só
   escolas **públicas em funcionamento** e deriva `educacao_infantil` /
   `ensino_fundamental` das etapas ofertadas.
3. **Bairros (Censo)** — lê população e recorte racial por bairro e gera o
   polígono. `negros` = **pretos + pardos** (agregação de justiça racial
   sobre as categorias do IBGE); a soma dos quatro grupos fecha a população.

Resultado da última execução com os CSVs reais: **33 unidades de saúde
públicas + 110 escolas públicas**.

## Pendências para a versão com dados 100% reais

- **Malha de bairros**: o IBGE não publica malha oficial de bairros; o
  exemplo gera polígonos circulares em volta de centroides. Substituir por
  agregação de setores censitários (função `poligono_circular` →
  `processar_bairros`).
- **Censo por bairro**: `censo_bairros_exemplo.csv` traz valores
  ilustrativos. Trocar pelo agregado real do Censo 2022 mantendo as colunas.
- **Normalização de bairros**: os cadastros usam dezenas de grafias
  ("MARGARIDA", "CJTO HUMAITA", "NAUTICA"…). Complete o dicionário
  `MAPA_BAIRROS` — o nome canônico precisa casar exatamente com
  `bairros.geojson`, pois é a chave do cruzamento no app.
