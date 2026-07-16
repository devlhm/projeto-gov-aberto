#!/usr/bin/env python3
"""
Gerador de dados MOCK realistas para o protótipo "Raio de Cidadania".

Produz dois arquivos GeoJSON com o MESMO ESQUEMA que o ETL real
(etl/processar_dados.py) produziria a partir de CNES/INEP/Censo:

  app/public/data/bairros.geojson       -> polígonos de bairros + população + perfil racial
  app/public/data/equipamentos.geojson  -> pontos de equipamentos de saúde e educação

Como funciona:
  1. Cada bairro tem um "site" (centroide aproximado, ancorado em coordenadas
     REAIS extraídas dos CSVs do INEP/CNES em dados/).
  2. Os polígonos são células de Voronoi recortadas por contornos aproximados
     da porção insular e da área continental de São Vicente — assim os bairros
     ficam adjacentes, sem sobreposição, como num mapa de verdade.
  3. Os equipamentos usam nomes REAIS (UBS Catiapoã, Pronto-Socorro Central,
     Creche Municipal Cora Coralina...) posicionados dentro do bairro.
  4. A distribuição é DESIGUAL DE PROPÓSITO: a área continental (Humaitá,
     Quarentenário, Samaritá, Jardim Rio Branco) concentra os "desertos de
     serviço", refletindo a narrativa de justiça climática do projeto.

Nota metodológica (justiça racial): o campo raca.negros agrega PRETOS + PARDOS,
seguindo o enquadramento usado pelo movimento negro e por estudos de equidade
racial a partir das categorias do IBGE.

Uso:  python3 etl/gerar_dados_mock.py
"""

import json
import math
import random
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuração geral
# ---------------------------------------------------------------------------

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "app" / "public" / "data"

RNG = random.Random(42)  # semente fixa -> saída reprodutível

# Latitude de referência para projetar graus -> km (São Vicente)
LAT_REF = -23.9631
KM_POR_GRAU_LAT = 110.574
KM_POR_GRAU_LNG = 111.320 * math.cos(math.radians(LAT_REF))

# Limiares de classificação — DEVEM espelhar app/src/lib/metricas.ts
LIMIAR_SAUDE_ADEQUADO = 10_000   # hab/equip de saúde até aqui = adequado
LIMIAR_SAUDE_CRITICO = 18_000    # acima disso = crítico
LIMIAR_EDU_ADEQUADO = 6_000
LIMIAR_EDU_CRITICO = 12_000
LIMIAR_DENSIDADE_ALTA = 13_000   # hab/km²; agrava "atenção" -> "crítico"

# ---------------------------------------------------------------------------
# Contornos aproximados (lat, lng) — desenhados à mão sobre a geografia real.
# A porção insular de São Vicente (oeste da Ilha de São Vicente) e a área
# continental são separadas pelo canal do Mar Pequeno.
# ---------------------------------------------------------------------------

CONTORNO_ILHA = [
    (-23.9395, -46.4145), (-23.9385, -46.3900), (-23.9440, -46.3700),
    (-23.9560, -46.3610), (-23.9700, -46.3600), (-23.9760, -46.3680),
    (-23.9765, -46.3830), (-23.9720, -46.3925), (-23.9640, -46.4030),
    (-23.9600, -46.4150), (-23.9520, -46.4180),
]

CONTORNO_CONTINENTE = [
    (-23.9440, -46.4750), (-23.9450, -46.4380), (-23.9620, -46.4330),
    (-23.9780, -46.4380), (-23.9930, -46.4520), (-23.9960, -46.4780),
    (-23.9860, -46.5000), (-23.9640, -46.4950),
]

# Japuí é uma península isolada (região do Parque Estadual Xixová-Japuí)
CONTORNO_JAPUI = [
    (-23.9800, -46.3880), (-23.9815, -46.3990), (-23.9900, -46.4030),
    (-23.9945, -46.3950), (-23.9920, -46.3860), (-23.9840, -46.3830),
]

# ---------------------------------------------------------------------------
# Bairros: nome, grupo, centroide aproximado (lat, lng), população,
# % negros (pretos+pardos), indígenas (absoluto), % amarelos.
# Populações e recortes raciais são MOCK plausíveis — o Censo 2022 por bairro
# entra depois via ETL. A soma dos 4 grupos fecha em populacao_total.
# ---------------------------------------------------------------------------

BAIRROS = [
    # nome,                grupo,        lat,      lng,      pop,   %negros, indig, %amarelos
    ("Centro",             "ilha",       -23.9645, -46.3888, 12000, 0.38,    18,    0.012),
    ("Gonzaguinha",        "ilha",       -23.9682, -46.3832,  9000, 0.28,    12,    0.014),
    ("Itararé",            "ilha",       -23.9712, -46.3672,  9500, 0.24,    10,    0.015),
    ("Boa Vista",          "ilha",       -23.9683, -46.3745, 11500, 0.30,    14,    0.013),
    ("Vila Valença",       "ilha",       -23.9575, -46.3838, 10000, 0.40,    16,    0.010),
    ("Catiapoã",           "ilha",       -23.9590, -46.3888, 14000, 0.42,    20,    0.009),
    ("Parque Bitaru",      "ilha",       -23.9655, -46.3948,  9800, 0.44,    15,    0.008),
    # Vila Margarida: região real de palafitas; densidade altíssima + 1 equip
    # de cada tipo faz a regra de densidade escalar o status para "crítico"
    ("Vila Margarida",     "ilha",       -23.9668, -46.4075,  8500, 0.52,    22,    0.006),
    ("Parque São Vicente", "ilha",       -23.9480, -46.3985, 19000, 0.50,    30,    0.007),
    ("Cidade Náutica",     "ilha",       -23.9515, -46.4100, 14000, 0.48,    25,    0.007),
    ("Jardim Rio Branco",  "continente", -23.9780, -46.4740, 19000, 0.58,    35,    0.004),
    ("Humaitá",            "continente", -23.9524, -46.4537, 26000, 0.60,    40,    0.004),
    ("Quarentenário",      "continente", -23.9790, -46.4550, 24000, 0.62,    45,    0.003),
    ("Samaritá",           "continente", -23.9880, -46.4690, 17000, 0.56,    38,    0.004),
    # Japuí abriga a aldeia guarani Paranapuã (Parque Xixová-Japuí)
    ("Japuí",              "japui",      -23.9870, -46.3935,  6500, 0.46,   320,    0.005),
]

# ---------------------------------------------------------------------------
# Equipamentos por bairro: (nome, subtipo, endereço).
# Nomes baseados nos CSVs reais de dados/ (CNES e INEP); posições aproximadas.
# Subtipos de saúde:    UBS, ESF, Hospital, Pronto-Socorro, Pronto Atendimento,
#                       Ambulatório
# Subtipos de educação: Creche, EMEI, EMEF
# ---------------------------------------------------------------------------

EQUIPAMENTOS = {
    "Centro": [
        ("Hospital e Maternidade Municipal de São Vicente", "Hospital", "Rua Padre José de Anchieta, 370"),
        ("Pronto-Socorro Central de São Vicente", "Pronto-Socorro", "Rua Jacob Emmerich, 425"),
        ("UBS Central", "UBS", "Rua Frei Gaspar, 509"),
        ("EMEF Martim Afonso", "EMEF", "Praça João Pessoa, 44"),
        ("EMEF Padre Anchieta", "EMEF", "Rua XV de Novembro, 91"),
        ("EMEI Vinte e Dois de Janeiro", "EMEI", "Rua João Ramalho, 180"),
        ("Creche Municipal Pref. Antônio Fernando dos Reis", "Creche", "Av. Presidente Wilson, 267"),
    ],
    "Gonzaguinha": [
        ("UBS Gonzaguinha", "UBS", "Av. Capitão-Mor Aguiar, 644"),
        ("EMEI Praia do Gonzaguinha", "EMEI", "Rua Ipiranga, 320"),
        ("EMEF Cacilda Becker", "EMEF", "Av. Manoel da Nóbrega, 512"),
    ],
    "Itararé": [
        ("UBS Itararé", "UBS", "Rua Padre Manoel Anselmo, 88"),
        ("EMEI Beira-Mar", "EMEI", "Av. Ayrton Senna da Silva, 1020"),
        ("EMEF Nossa Senhora Aparecida", "EMEF", "Rua Anchieta, 215"),
    ],
    "Boa Vista": [
        ("Ambulatório de Especialidades Boa Vista", "Ambulatório", "Rua Onze de Junho, 291"),
        ("UBS Boa Vista", "UBS", "Av. Presidente Wilson, 890"),
        ("EMEF Rubens Arruda", "EMEF", "Rua Rangel Pestana, 133"),
        ("Creche Municipal Vovó Lenice", "Creche", "Rua Marechal Deodoro, 76"),
    ],
    "Vila Valença": [
        ("UBS Vila Valença", "UBS", "Rua José Bonifácio, 415"),
        ("EMEI Monteiro Lobato", "EMEI", "Rua Piratininga, 202"),
        ("EMEF Leonor Mendes de Barros", "EMEF", "Rua Bento Pereira Sales, 58"),
    ],
    "Catiapoã": [
        ("UBS Catiapoã", "UBS", "Rua Valter do Amaral, s/n"),
        ("UBS Tancredo Neves", "UBS", "Praça Tancredo Neves, 160"),
        ("Creche Municipal Catiapoã", "Creche", "Rua Ver. Bernardino Gomes, 31"),
        ("EMEF Profª Zezé Massuno", "EMEF", "Rua Frei Cosme, 140"),
        ("EMEI Menino Jesus", "EMEI", "Rua Embaré, 95"),
    ],
    "Parque Bitaru": [
        ("UBS Parque Bitaru", "UBS", "Rua São Judas Tadeu, s/n"),
        ("EMEF Heitor Villa-Lobos", "EMEF", "Av. Antônio Emmerich, 740"),
        ("Creche Municipal Sonho da Criança", "Creche", "Rua das Acácias, 33"),
    ],
    "Vila Margarida": [
        ("UBS Vila Margarida", "UBS", "Rua Santa Terezinha, 299"),
        ("Creche Municipal Vila Margarida", "Creche", "Rua Monte Belvedere, 480"),
    ],
    "Parque São Vicente": [
        ("UBS Parque São Vicente", "UBS", "Av. Salgado Filho, s/n"),
        ("UBS Sambaiatuba", "UBS", "Rua Santa Catarina, 225"),
        ("EMEF Dorival Caymmi", "EMEF", "Av. Nações Unidas, 615"),
        ("EMEI Cecília Meireles", "EMEI", "Rua Paraná, 118"),
        ("Creche Municipal Tia Nair", "Creche", "Rua Rio Grande do Sul, 52"),
    ],
    "Cidade Náutica": [
        ("Pronto Atendimento Cidade Náutica", "Pronto Atendimento", "Av. Mal. Castelo Branco, s/n"),
        ("UBS Náutica III", "UBS", "Rua Santa Rosa, 225"),
        ("EMEF Florestan Fernandes", "EMEF", "Av. Mal. Castelo Branco, 449"),
        ("Creche Municipal Tic Tac", "Creche", "Rua dos Jasmins, 87"),
    ],
    "Jardim Rio Branco": [
        ("Pronto-Socorro Rio Branco", "Pronto-Socorro", "Rua João Francisco Bensdorp, 721"),
        ("ESF Rio Branco II e III", "ESF", "Rua Manoel Alves de Deus, s/n"),
        ("EMEF Paulo Freire", "EMEF", "Av. Quarentenário, 1330"),
        ("Creche Municipal Paulo de Souza", "Creche", "Rua Padre Adelino, 209"),
    ],
    "Humaitá": [
        ("Pronto Atendimento Humaitá", "Pronto Atendimento", "Av. Dep. Ulysses Guimarães, s/n"),
        ("Creche Municipal Prof. Celso Eduardo da Silva", "Creche", "Rua Argemiro de Souza, 310"),
    ],
    "Quarentenário": [
        # Deserto proposital: NENHUM equipamento de saúde no bairro
        ("Creche Municipal Quarentenário", "Creche", "Av. Nossa Sra. das Dores, 590"),
    ],
    "Samaritá": [
        ("UBS Samaritá", "UBS", "Av. Nossa Sra. de Fátima, 70"),
        ("Creche Municipal Eng. Seitetsu Iha", "Creche", "Rua Luiz Vaz de Camões, 41"),
        ("EMEF Anísio Teixeira", "EMEF", "Av. Emílio Ribas, 826"),
    ],
    "Japuí": [
        ("ESF Japuí", "ESF", "Rua Enseada, s/n"),
        ("Creche Municipal Cora Coralina", "Creche", "Rua das Garças, 263"),
    ],
}

SUBTIPOS_SAUDE = {"UBS", "ESF", "Hospital", "Pronto-Socorro", "Pronto Atendimento", "Ambulatório"}
SUBTIPOS_24H = {"Hospital", "Pronto-Socorro", "Pronto Atendimento"}
SUBTIPOS_AMBULATORIAL = {"UBS", "ESF", "Ambulatório", "Hospital"}
SUBTIPOS_INFANTIL = {"Creche", "EMEI"}

# ---------------------------------------------------------------------------
# Geometria: projeção simples grau<->km e Voronoi por recorte de semiplanos
# ---------------------------------------------------------------------------

def para_km(p):
    """(lat, lng) -> (x, y) em km, projeção equiretangular local."""
    lat, lng = p
    return (lng * KM_POR_GRAU_LNG, lat * KM_POR_GRAU_LAT)

def para_grau(p):
    x, y = p
    return (y / KM_POR_GRAU_LAT, x / KM_POR_GRAU_LNG)

def recortar_semiplano(poligono, a, b):
    """
    Recorta `poligono` (lista de pontos em km) mantendo apenas a região mais
    próxima de `a` do que de `b` (semiplano do bissetor perpendicular).
    Algoritmo de Sutherland–Hodgman com um único plano de corte.
    """
    def dentro(p):
        # dist²(p,a) - dist²(p,b) < 0  <=>  p mais perto de a
        return ((p[0]-a[0])**2 + (p[1]-a[1])**2) <= ((p[0]-b[0])**2 + (p[1]-b[1])**2)

    def intersecao(p, q):
        # Ponto do segmento p->q sobre o bissetor de a,b (resolvido linearmente)
        f_p = ((p[0]-a[0])**2 + (p[1]-a[1])**2) - ((p[0]-b[0])**2 + (p[1]-b[1])**2)
        f_q = ((q[0]-a[0])**2 + (q[1]-a[1])**2) - ((q[0]-b[0])**2 + (q[1]-b[1])**2)
        t = f_p / (f_p - f_q)
        return (p[0] + t*(q[0]-p[0]), p[1] + t*(q[1]-p[1]))

    saida = []
    for i, p in enumerate(poligono):
        q = poligono[(i+1) % len(poligono)]
        if dentro(p):
            saida.append(p)
            if not dentro(q):
                saida.append(intersecao(p, q))
        elif dentro(q):
            saida.append(intersecao(p, q))
    return saida

def celula_voronoi(site, outros, contorno_km):
    """Célula de Voronoi do `site` limitada ao contorno do grupo."""
    celula = list(contorno_km)
    for outro in outros:
        celula = recortar_semiplano(celula, site, outro)
        if not celula:
            break
    return celula

def area_km2(poligono_km):
    """Área pela fórmula do cadarço (shoelace)."""
    s = 0.0
    for i, p in enumerate(poligono_km):
        q = poligono_km[(i+1) % len(poligono_km)]
        s += p[0]*q[1] - q[0]*p[1]
    return abs(s) / 2.0

def ponto_no_poligono(p, poligono_km):
    """Ray casting clássico."""
    x, y = p
    dentro = False
    for i, a in enumerate(poligono_km):
        b = poligono_km[(i+1) % len(poligono_km)]
        if (a[1] > y) != (b[1] > y):
            x_cruz = a[0] + (y - a[1]) * (b[0]-a[0]) / (b[1]-a[1])
            if x < x_cruz:
                dentro = not dentro
    return dentro

# ---------------------------------------------------------------------------
# Montagem dos GeoJSON
# ---------------------------------------------------------------------------

def gerar():
    contornos_km = {
        "ilha": [para_km(p) for p in CONTORNO_ILHA],
        "continente": [para_km(p) for p in CONTORNO_CONTINENTE],
        "japui": [para_km(p) for p in CONTORNO_JAPUI],
    }
    sites_km = {nome: para_km((lat, lng)) for nome, _, lat, lng, *_ in BAIRROS}

    features_bairros = []
    features_equip = []
    celulas = {}
    contador_equip = 0

    for nome, grupo, lat, lng, pop, pct_negros, indigenas, pct_amarelos in BAIRROS:
        site = sites_km[nome]
        vizinhos = [sites_km[n] for n, g, *_ in BAIRROS if g == grupo and n != nome]
        celula = celula_voronoi(site, vizinhos, contornos_km[grupo])
        celulas[nome] = celula

        area = area_km2(celula)
        densidade = pop / area

        negros = round(pop * pct_negros)
        amarelos = round(pop * pct_amarelos)
        brancos = pop - negros - indigenas - amarelos  # fecha a soma exata

        anel = [[round(g[1], 5), round(g[0], 5)] for g in map(para_grau, celula)]
        anel.append(anel[0])  # GeoJSON exige anel fechado

        features_bairros.append({
            "type": "Feature",
            "properties": {
                "nome": nome,
                "populacao_total": pop,
                "area_km2": round(area, 2),
                "densidade": round(densidade),
                # negros = pretos + pardos (agregação de justiça racial, IBGE)
                "raca": {
                    "brancos": brancos,
                    "negros": negros,
                    "indigenas": indigenas,
                    "amarelos": amarelos,
                },
            },
            "geometry": {"type": "Polygon", "coordinates": [anel]},
        })

        # Equipamentos: espalhados ao redor do site, garantidamente dentro da célula
        for eq_nome, subtipo, endereco in EQUIPAMENTOS[nome]:
            contador_equip += 1
            for _ in range(60):  # tenta até cair dentro do polígono
                dist = RNG.uniform(0.10, 0.65)
                ang = RNG.uniform(0, 2 * math.pi)
                candidato = (site[0] + dist*math.cos(ang), site[1] + dist*math.sin(ang))
                if ponto_no_poligono(candidato, celula):
                    break
            else:
                candidato = site
            eq_lat, eq_lng = para_grau(candidato)
            tipo = "saude" if subtipo in SUBTIPOS_SAUDE else "educacao"

            features_equip.append({
                "type": "Feature",
                "properties": {
                    "id": f"sv-{contador_equip:03d}",
                    "nome": eq_nome,
                    "endereco": f"{endereco} — {nome}, São Vicente/SP",
                    "bairro": nome,      # deve casar EXATAMENTE com bairros.geojson
                    "tipo": tipo,
                    "subtipo": subtipo,
                    "atende_24h": subtipo in SUBTIPOS_24H,
                    "ambulatorial": subtipo in SUBTIPOS_AMBULATORIAL,
                    "educacao_infantil": subtipo in SUBTIPOS_INFANTIL,
                    "ensino_fundamental": subtipo == "EMEF",
                    "lat": round(eq_lat, 6),
                    "lng": round(eq_lng, 6),
                },
                "geometry": {"type": "Point", "coordinates": [round(eq_lng, 6), round(eq_lat, 6)]},
            })

    SAIDA.mkdir(parents=True, exist_ok=True)
    (SAIDA / "bairros.geojson").write_text(
        json.dumps({"type": "FeatureCollection",
                    "name": "bairros_sao_vicente_mock",
                    "features": features_bairros}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    (SAIDA / "equipamentos.geojson").write_text(
        json.dumps({"type": "FeatureCollection",
                    "name": "equipamentos_sao_vicente_mock",
                    "features": features_equip}, ensure_ascii=False, indent=1),
        encoding="utf-8")

    verificar(features_bairros, features_equip)

# ---------------------------------------------------------------------------
# Verificação: reproduz as fórmulas do front (app/src/lib/metricas.ts)
# para conferir a distribuição de status pretendida.
# ---------------------------------------------------------------------------

def classificar(razao, lim_adequado, lim_critico):
    if math.isinf(razao) or razao > lim_critico:
        return "critico"
    if razao > lim_adequado:
        return "atencao"
    return "adequado"

def verificar(bairros, equipamentos):
    pior = {"adequado": 0, "atencao": 1, "critico": 2}
    print(f"{'bairro':22s} {'pop':>6s} {'km²':>5s} {'dens':>6s} {'saú':>4s} {'edu':>4s} "
          f"{'hab/saú':>8s} {'hab/edu':>8s}  status")
    for f in bairros:
        p = f["properties"]
        nome = p["nome"]
        n_saude = sum(1 for e in equipamentos
                      if e["properties"]["bairro"] == nome and e["properties"]["tipo"] == "saude")
        n_edu = sum(1 for e in equipamentos
                    if e["properties"]["bairro"] == nome and e["properties"]["tipo"] == "educacao")
        r_saude = p["populacao_total"] / n_saude if n_saude else math.inf
        r_edu = p["populacao_total"] / n_edu if n_edu else math.inf
        s_saude = classificar(r_saude, LIMIAR_SAUDE_ADEQUADO, LIMIAR_SAUDE_CRITICO)
        s_edu = classificar(r_edu, LIMIAR_EDU_ADEQUADO, LIMIAR_EDU_CRITICO)
        geral = max(s_saude, s_edu, key=lambda s: pior[s])
        if geral == "atencao" and p["densidade"] >= LIMIAR_DENSIDADE_ALTA:
            geral = "critico"  # densidade alta agrava a situação
        print(f"{nome:22s} {p['populacao_total']:>6d} {p['area_km2']:>5.2f} {p['densidade']:>6d} "
              f"{n_saude:>4d} {n_edu:>4d} "
              f"{r_saude if r_saude != math.inf else float('nan'):>8.0f} "
              f"{r_edu if r_edu != math.inf else float('nan'):>8.0f}  {geral}")
    print(f"\nTotal: {len(bairros)} bairros, {len(equipamentos)} equipamentos "
          f"({sum(1 for e in equipamentos if e['properties']['tipo']=='saude')} saúde, "
          f"{sum(1 for e in equipamentos if e['properties']['tipo']=='educacao')} educação)")

if __name__ == "__main__":
    gerar()
