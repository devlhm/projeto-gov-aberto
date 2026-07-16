# Raio de Cidadania 🌱

Protótipo cidadão do **Observatório de Justiça Climática de São Vicente/SP**
— pilar **Serviços Públicos (Saúde e Educação)**. Disciplina Governo Aberto
2026 (Profa. Gisele S. Craveiro). Identidade visual **Coop Clima São Vicente**.

O app transforma dados públicos fragmentados (Censo 2022, INEP, CNES) em uma
ferramenta de transparência: mostra **onde estão os equipamentos públicos**,
**se o bairro tem cobertura adequada** e **como a infraestrutura se distribui
em relação às populações mais vulneráveis**.

## Como rodar

```bash
cd app
npm install
npm run dev
```

Abra o endereço indicado (padrão `http://localhost:5173`). Para testar no
celular na mesma rede: `npm run dev -- --host`.

**Links úteis para apresentação (deep links):**

| URL | O que abre |
|---|---|
| `/?demo=1` | localização simulada no Centro (dispensa GPS na banca) |
| `/?bairro=Quarentenário` | painel de um bairro crítico |
| `/?visao=ranking` | direto no ranking de cobertura |

## As 5 funcionalidades ↔ as 4 perguntas da banca

1. **Raio de Cidadania** — botão "Usar minha localização" + slider de 0,5 a
   3 km; o mapa mostra só os equipamentos dentro do raio, cada card tem
   distância e botão **Traçar rota** (link do Google Maps, sem chave de API).
   → *"Onde está a escola / unidade de saúde mais próxima?"*
2. **Filtros inteligentes** — chips Saúde/Educação, Educação Infantil,
   Ensino Fundamental, Ambulatorial e Turno 24h, combináveis com o raio.
3. **Painel do Meu Bairro** — população, perfil étnico-racial (gráfico CSS
   puro), habitantes por equipamento (saúde e educação separados) e selo de
   status. → *"Meu bairro possui cobertura adequada?"*
4. **Alertas de Deserto de Serviços** — polígonos dos bairros pintados na
   escala verde (adequado) → laranja (atenção) → vermelho terroso (crítico).
5. **Ranking de Cobertura + Dados Abertos** — bairros do melhor para o pior
   em cada serviço, com download **JSON/CSV** por bairro.
   → *"Quais regiões possuem menor oferta?"* + pilar de **transparência**.

## Estrutura do repositório

```
app/                  React + Vite + TypeScript (mobile-first)
  public/data/        bairros.geojson + equipamentos.geojson  ← troque aqui
  src/
    components/       Mapa, BottomSheet, FilterChips, BairroPanel, Ranking…
    lib/              distancia.ts (Haversine) · metricas.ts · export.ts
    theme/tokens.css  tokens da marca Coop Clima
dados/                CSVs brutos reais (CNES e INEP)
etl/                  processar_dados.py (dados reais) + gerar_dados_mock.py
notebook/             análises exploratórias
```

Stack: **React + Vite + TypeScript**, **Leaflet/react-leaflet** com tiles
OpenStreetMap (sem chave de API), dados 100% estáticos (sem backend).

## Esquema de dados (contrato front ↔ ETL)

### `bairros.geojson` — polígonos

```jsonc
{
  "nome": "Quarentenário",
  "populacao_total": 24000,
  "area_km2": 6.4,
  "densidade": 3751,            // hab/km²
  "raca": {                     // números ABSOLUTOS (Censo 2022)
    "brancos": 9003,
    "negros": 14880,            // = pretos + pardos (ver nota abaixo)
    "indigenas": 45,
    "amarelos": 72
  }
}
```

### `equipamentos.geojson` — pontos

```jsonc
{
  "id": "sv-021",
  "nome": "UBS Catiapoã",
  "endereco": "Rua Valter do Amaral, s/n — Catiapoã, São Vicente/SP",
  "bairro": "Catiapoã",         // deve casar EXATAMENTE com bairros.geojson
  "tipo": "saude",              // "saude" | "educacao"
  "subtipo": "UBS",             // UBS, ESF, Hospital, Pronto-Socorro,
                                // Pronto Atendimento, Ambulatório,
                                // Creche, EMEI, EMEF
  "atende_24h": false,
  "ambulatorial": true,
  "educacao_infantil": false,
  "ensino_fundamental": false,
  "lat": -23.95672,
  "lng": -46.38733
}
```

## Métricas e limiares (calibráveis)

Fórmulas em `app/src/lib/metricas.ts` (constantes nomeadas):

```
habitantes_por_equip_saude    = populacao_total / nº equipamentos de saúde
habitantes_por_equip_educacao = populacao_total / nº equipamentos de educação

Saúde:    adequado ≤ 10.000 < atenção ≤ 18.000 < crítico
Educação: adequado ≤  6.000 < atenção ≤ 12.000 < crítico
Bairro sem equipamento = crítico.

Status geral = pior(saúde, educação); se "atenção" e densidade ≥ 13.000
hab/km², agrava para "crítico" (deserto de serviços: muita gente
disputando pouca infraestrutura).
```

Referência inicial: uma equipe de Saúde da Família cobre ~3–4 mil pessoas;
uma UBS típica referencia até ~10 mil. Ajuste os limiares conforme a equipe
refinar a metodologia — o gerador de mock (`etl/gerar_dados_mock.py`)
espelha as mesmas constantes e imprime uma tabela de verificação.

## Trocando o mock por dados reais

Os dados atuais são **mock realistas** (nomes reais, geografia ancorada em
coordenadas reais, mas população/racial ilustrativos). Para publicar dados
reais:

```bash
python3 etl/processar_dados.py            # confere a saída em etl/saida/
python3 etl/processar_dados.py --para-app # substitui app/public/data/
```

O ETL já extrai dos CSVs reais **33 unidades de saúde públicas e 110
escolas públicas** com flags e coordenadas. Pendências documentadas em
[`etl/README.md`](etl/README.md) (malha de bairros, Censo por bairro,
normalização de grafias).

## Notas metodológicas

- **"Negros" = pretos + pardos** (categorias do IBGE), seguindo o
  enquadramento de justiça racial adotado pelo movimento negro e por
  estudos de equidade — os dados abertos exportados repetem essa nota.
- Os polígonos de bairro são **simplificados** (o IBGE não publica malha
  oficial de bairros); o diagnóstico é indicativo, não cartorial.
- A geolocalização roda só no navegador; nenhum dado do usuário é enviado
  a servidores.

## Identidade visual

Aplicação do `manual_coopclima.pdf`: cores institucionais e de apoio como
CSS variables (`app/src/theme/tokens.css`), gradientes horizontais oficiais,
**Londrina Solid** (títulos/destaques) + **Roboto** (corpo), wordmark
"COOP CLIMA" recriado com letras rotacionadas (tipografia vernacular),
cantos imperfeitos, traços tracejados "à mão" e textura sutil de madeira.
A escala de alerta usa um vermelho terroso (`#c0392b`) fora da paleta
oficial, harmonizado com o marrom da marca.
