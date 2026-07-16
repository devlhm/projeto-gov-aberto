#!/usr/bin/env python3
"""
ETL do Raio de Cidadania — transforma os dados brutos (CNES, INEP, Censo)
nos GeoJSON consumidos pelo app (mesmo esquema do mock).

Entradas (pasta dados/):
  - "Estabelecimentos_saude_sao_vicente_cnes.xlsx - Planilha1.csv"
        Estabelecimentos de saúde do CNES/DataSUS.
  - "Tabela_Escolas_Sao_Vicente_Organizada.xlsx - Escolas.csv"
        Catálogo de escolas do INEP com coordenadas limpas.
  - "escolas_sao_vicente_inep.csv"
        Detalhe INEP: etapas de ensino, dependência administrativa e
        restrição de atendimento (usado para flags e filtros).
  - etl/censo_bairros_exemplo.csv
        População e recorte racial por bairro (Censo 2022). O arquivo de
        exemplo usa valores ilustrativos + centroides; troque pelo agregado
        real por bairro/setor censitário quando disponível.

Saídas (etl/saida/, ou app/public/data/ com --para-app):
  - equipamentos.geojson   pontos de saúde + educação PÚBLICOS, com flags
  - bairros.geojson        polígonos + população + perfil racial

Limitações documentadas:
  * As coordenadas do CNES vêm corrompidas (pontos de milhar); o parser
    abaixo as reconstrói de forma determinística.
  * O IBGE não distribui malha oficial de BAIRROS; o ETL de exemplo gera
    polígonos circulares em volta do centroide informado no CSV do Censo.
    Na versão final, plugue a malha de setores censitários agregada.
  * "negros" = pretos + pardos (agregação de justiça racial sobre as
    categorias do IBGE) — a soma dos 4 grupos deve fechar a população.

Uso:
  python3 etl/processar_dados.py            # escreve em etl/saida/
  python3 etl/processar_dados.py --para-app # escreve em app/public/data/
"""

import argparse
import csv
import json
import math
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA_DADOS = RAIZ / "dados"

ARQ_CNES = PASTA_DADOS / "Estabelecimentos_saude_sao_vicente_cnes.xlsx - Planilha1.csv"
ARQ_ESCOLAS = PASTA_DADOS / "Tabela_Escolas_Sao_Vicente_Organizada.xlsx - Escolas.csv"
ARQ_ESCOLAS_INEP = PASTA_DADOS / "escolas_sao_vicente_inep.csv"
ARQ_CENSO = Path(__file__).resolve().parent / "censo_bairros_exemplo.csv"

# Caixa delimitadora generosa de São Vicente — descarta coordenadas absurdas
LAT_MIN, LAT_MAX = -24.05, -23.85
LNG_MIN, LNG_MAX = -46.60, -46.25

# ---------------------------------------------------------------------------
# Normalização de nomes de bairro
# Os CSVs trazem variantes ("MARGARIDA", "NAUTICA", "BEIRA MAR"...). O nome
# canônico DEVE casar com bairros.geojson — é a chave do cruzamento no app.
# Complete este dicionário conforme novos bairros entrarem no recorte.
# ---------------------------------------------------------------------------

MAPA_BAIRROS = {
    "CENTRO": "Centro",
    "GONZAGUINHA": "Gonzaguinha",
    "ITARARE": "Itararé",
    "BOA VISTA": "Boa Vista",
    "VILA VALENCA": "Vila Valença",
    "VALENCA": "Vila Valença",
    "CATIAPOA": "Catiapoã",
    "PARQUE BITARU": "Parque Bitaru",
    "BITARU": "Parque Bitaru",
    "VILA MARGARIDA": "Vila Margarida",
    "MARGARIDA": "Vila Margarida",
    "PARQUE SAO VICENTE": "Parque São Vicente",
    "CIDADE NAUTICA": "Cidade Náutica",
    "NAUTICA": "Cidade Náutica",
    "JARDIM RIO BRANCO": "Jardim Rio Branco",
    "RIO BRANCO": "Jardim Rio Branco",
    "BRANCO": "Jardim Rio Branco",
    "HUMAITA": "Humaitá",
    "CJTO HUMAITA": "Humaitá",
    "CONJUNTO HUMAITA": "Humaitá",
    "QUARENTENARIO": "Quarentenário",
    "SAMARITA": "Samaritá",
    "JAPUI": "Japuí",
    # abreviações comuns nos cadastros
    "JD RIO BRANCO": "Jardim Rio Branco",
    "VL MARGARIDA": "Vila Margarida",
    "VL VALENCA": "Vila Valença",
    "PQ BITARU": "Parque Bitaru",
    "PQ SAO VICENTE": "Parque São Vicente",
}


def sem_acentos(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def normalizar_bairro(bruto: str) -> str:
    chave = sem_acentos(bruto or "").strip().upper()
    if chave in MAPA_BAIRROS:
        return MAPA_BAIRROS[chave]
    # fallback: Título Simples (bairros fora do recorte continuam no arquivo,
    # mas não casam com nenhum polígono — o app apenas os mostra no mapa)
    return (bruto or "").strip().title()


# ---------------------------------------------------------------------------
# Saúde (CNES)
# ---------------------------------------------------------------------------

def limpar_coordenada_cnes(bruta: str, inteiros: int) -> float | None:
    """
    As coordenadas do CNES chegam corrompidas por pontos de milhar:
      "-239.575.481.911" -> -23.9575481911   (2 dígitos inteiros)
      "-464.025.163.651" -> -46.4025163651
    Reconstrução: remove os pontos e reinsere a vírgula decimal após
    `inteiros` dígitos.
    """
    bruta = (bruta or "").strip()
    if not bruta:
        return None
    negativo = bruta.startswith("-")
    digitos = "".join(ch for ch in bruta if ch.isdigit())
    if len(digitos) <= inteiros:
        return None
    valor = float(digitos[:inteiros] + "." + digitos[inteiros:])
    return -valor if negativo else valor


def subtipo_saude(nome_fantasia: str) -> str | None:
    """Classifica o estabelecimento pelo nome (transparente e auditável).
    Retorna None para o que não é unidade assistencial de interesse."""
    n = sem_acentos(nome_fantasia.upper())
    if "UNIDADE BASICA DE SAUDE" in n or n.startswith("UBS"):
        return "UBS"
    if n.startswith("ESF") or "SAUDE DA FAMILIA" in n or n.startswith("USF"):
        return "ESF"
    if "PRONTO SOCORRO" in n:
        return "Pronto-Socorro"
    if "PRONTO ATENDIMENTO" in n or n.startswith("UPA"):
        return "Pronto Atendimento"
    if "HOSPITAL DE CAMPANHA" in n:
        return None  # unidade temporária, fora do diagnóstico
    if "HOSPITAL" in n or "MATERNIDADE" in n:
        return "Hospital"
    if "AMBULATORIO" in n or "POLICLINICA" in n:
        return "Ambulatório"
    return None


def eh_publico_cnes(linha: dict) -> bool:
    """Natureza jurídica 1xxx = administração pública (Concla/IBGE)."""
    return str(linha.get("CO_NATUREZA_JUR", "")).strip().startswith("1")


def processar_saude() -> list[dict]:
    equipamentos = []
    ignorados = 0
    with open(ARQ_CNES, encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            nome = (linha.get("NO_FANTASIA") or linha.get("NO_RAZAO_SOCIAL") or "").strip()
            subtipo = subtipo_saude(nome)
            if subtipo is None or not eh_publico_cnes(linha):
                ignorados += 1
                continue

            lat = limpar_coordenada_cnes(linha.get("NU_LATITUDE", ""), 2)
            lng = limpar_coordenada_cnes(linha.get("NU_LONGITUDE", ""), 2)
            if lat is None or lng is None or not (LAT_MIN < lat < LAT_MAX and LNG_MIN < lng < LNG_MAX):
                ignorados += 1
                continue

            turno = sem_acentos((linha.get("DS_TURNO_ATENDIMENTO") or "").upper())
            atende_24h = "CONTINUO" in turno or "24" in turno
            ambulatorial = (
                (linha.get("ST_ATEND_AMBULATORIAL") or "").strip() in {"1", "1.0"}
                or subtipo in {"UBS", "ESF", "Ambulatório", "Hospital"}
            )

            endereco = f"{(linha.get('NO_LOGRADOURO') or '').strip().title()}, " \
                       f"{(linha.get('NU_ENDERECO') or 's/n').strip()}"

            equipamentos.append({
                "nome": nome.title(),
                "endereco": endereco,
                "bairro": normalizar_bairro(linha.get("NO_BAIRRO", "")),
                "tipo": "saude",
                "subtipo": subtipo,
                "atende_24h": atende_24h,
                "ambulatorial": ambulatorial,
                "educacao_infantil": False,
                "ensino_fundamental": False,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
            })
    print(f"Saúde: {len(equipamentos)} unidades públicas mantidas, {ignorados} linhas ignoradas")
    return equipamentos


# ---------------------------------------------------------------------------
# Educação (INEP)
# ---------------------------------------------------------------------------

def subtipo_educacao(nome: str, etapas: str) -> str:
    n = sem_acentos(nome.upper())
    if "CRECHE" in n:
        return "Creche"
    if "EMEI" in n or ("INFANTIL" in etapas.upper() and "FUNDAMENTAL" not in etapas.upper()):
        return "EMEI"
    return "EMEF"


def processar_educacao() -> list[dict]:
    # Detalhe INEP indexado pelo código da escola (etapas, dependência, restrição)
    detalhe: dict[str, dict] = {}
    with open(ARQ_ESCOLAS_INEP, encoding="utf-8-sig") as f:
        for linha in csv.DictReader(f):
            detalhe[str(linha.get("Código INEP", "")).strip()] = linha

    equipamentos = []
    ignorados = 0
    with open(ARQ_ESCOLAS, encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            codigo = str(linha.get("Código INEP", "")).strip()
            info = detalhe.get(codigo, {})

            # Só escolas PÚBLICAS em funcionamento entram no diagnóstico
            dependencia = (info.get("Dependência Administrativa")
                           or linha.get("Categoria Administrativa") or "")
            if "PRIVADA" in dependencia.upper():
                ignorados += 1
                continue
            restricao = (info.get("Restrição de Atendimento") or "").upper()
            if "PARALISADA" in restricao or "EXTINTA" in restricao:
                ignorados += 1
                continue

            try:
                lat = float(linha.get("Latitude", ""))
                lng = float(linha.get("Longitude", ""))
            except ValueError:
                ignorados += 1
                continue
            if not (LAT_MIN < lat < LAT_MAX and LNG_MIN < lng < LNG_MAX):
                ignorados += 1
                continue

            etapas = info.get("Etapas e Modalidade de Ensino Oferecidas", "") or ""
            nome = (linha.get("Escola") or "").strip()

            equipamentos.append({
                "nome": nome.title(),
                "endereco": f"{(linha.get('Logradouro') or '').strip().title()}, "
                            f"{(linha.get('Número') or 's/n').strip()}",
                "bairro": normalizar_bairro(linha.get("Bairro", "")),
                "tipo": "educacao",
                "subtipo": subtipo_educacao(nome, etapas),
                "atende_24h": False,
                "ambulatorial": False,
                "educacao_infantil": "INFANTIL" in etapas.upper() or "CRECHE" in nome.upper(),
                "ensino_fundamental": "FUNDAMENTAL" in etapas.upper(),
                "lat": round(lat, 6),
                "lng": round(lng, 6),
            })
    print(f"Educação: {len(equipamentos)} escolas públicas mantidas, {ignorados} ignoradas")
    return equipamentos


# ---------------------------------------------------------------------------
# Bairros (Censo 2022)
# ---------------------------------------------------------------------------

def poligono_circular(lat: float, lng: float, raio_km: float, n: int = 16) -> list[list[float]]:
    """Polígono circular provisório em volta do centroide (ver limitações
    no docstring: substitua pela malha real de setores censitários)."""
    km_lat = 110.574
    km_lng = 111.320 * math.cos(math.radians(lat))
    anel = []
    for i in range(n):
        ang = 2 * math.pi * i / n
        anel.append([
            round(lng + (raio_km * math.sin(ang)) / km_lng, 5),
            round(lat + (raio_km * math.cos(ang)) / km_lat, 5),
        ])
    anel.append(anel[0])
    return anel


def processar_bairros() -> list[dict]:
    features = []
    with open(ARQ_CENSO, encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            pop = int(linha["populacao_total"])
            area = float(linha["area_km2"])
            pretos = int(linha["pretos"])
            pardos = int(linha["pardos"])
            features.append({
                "type": "Feature",
                "properties": {
                    "nome": linha["bairro"],
                    "populacao_total": pop,
                    "area_km2": round(area, 2),
                    "densidade": round(pop / area),
                    "raca": {
                        "brancos": int(linha["brancos"]),
                        # agregação de justiça racial: negros = pretos + pardos
                        "negros": pretos + pardos,
                        "indigenas": int(linha["indigenas"]),
                        "amarelos": int(linha["amarelos"]),
                    },
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poligono_circular(
                        float(linha["centroide_lat"]),
                        float(linha["centroide_lng"]),
                        float(linha["raio_km"]),
                    )],
                },
            })
    print(f"Bairros: {len(features)} polígonos gerados a partir do Censo")
    return features


# ---------------------------------------------------------------------------
# Montagem final
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--para-app",
        action="store_true",
        help="escreve direto em app/public/data/ (substitui o mock!)",
    )
    args = parser.parse_args()

    destino = (RAIZ / "app" / "public" / "data") if args.para_app \
        else Path(__file__).resolve().parent / "saida"
    destino.mkdir(parents=True, exist_ok=True)

    equipamentos = processar_saude() + processar_educacao()
    features_equip = [
        {
            "type": "Feature",
            "properties": {**eq, "id": f"sv-{i + 1:03d}"},
            "geometry": {"type": "Point", "coordinates": [eq["lng"], eq["lat"]]},
        }
        for i, eq in enumerate(equipamentos)
    ]

    (destino / "equipamentos.geojson").write_text(
        json.dumps({"type": "FeatureCollection",
                    "name": "equipamentos_sao_vicente",
                    "features": features_equip}, ensure_ascii=False, indent=1),
        encoding="utf-8")

    (destino / "bairros.geojson").write_text(
        json.dumps({"type": "FeatureCollection",
                    "name": "bairros_sao_vicente",
                    "features": processar_bairros()}, ensure_ascii=False, indent=1),
        encoding="utf-8")

    print(f"\nArquivos escritos em {destino}")
    if not args.para_app:
        print("Confira o resultado e rode com --para-app para publicar no aplicativo.")


if __name__ == "__main__":
    main()
