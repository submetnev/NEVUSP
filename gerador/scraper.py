import os
import json
import requests
import time
import re
import unicodedata
from bs4 import BeautifulSoup

# ==================================================
# CONFIGURAÇÕES - PREENCHA AQUI
# ==================================================
API_KEY = ""  # SUA CHAVE
PASTA_REVISTAS = "C:/SubmetNEV/revistas"

# Modelo com maior cota (mais estável e gratuito)
MODELO = "gemini-2.5-flash-lite"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent?key={API_KEY}"

# Cabeçalho para simular navegador e evitar bloqueios (403)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
}

# ==================================================
# FUNÇÃO PARA GERAR NOMES DE ARQUIVO (TEMPLATE E IMAGEM)
# ==================================================
def gerar_nome_arquivo(nome_revista, tipo_texto="", extensao="template"):
    """
    Gera nomes de arquivo limpos para templates e imagens.
    extensao: "template" ou "imagem"
    """
    nome_limpo = unicodedata.normalize('NFKD', nome_revista).encode('ASCII', 'ignore').decode('ASCII')
    nome_limpo = nome_limpo.lower().replace(' ', '_').replace('-', '_')
    nome_limpo = re.sub(r'[^a-z0-9_]', '', nome_limpo)
    
    if len(nome_limpo) > 50:
        nome_limpo = nome_limpo[:50]
    
    if extensao == "template":
        if tipo_texto:
            tipo_limpo = tipo_texto.lower().replace(' ', '_').replace('ç', 'c').replace('ã', 'a').replace('á', 'a')
            tipo_limpo = re.sub(r'[^a-z0-9_]', '', tipo_limpo)
            if len(tipo_limpo) > 40:
                tipo_limpo = tipo_limpo[:40]
            return f"templates/{nome_limpo}_{tipo_limpo}.docx"
        else:
            return f"templates/{nome_limpo}.docx"
    elif extensao == "imagem":
        return f"imagem/{nome_limpo}.png"
    return ""

# ==================================================
# EXTRAIR TEXTO DE UMA URL (COM HEADERS PARA EVITAR BLOQUEIO)
# ==================================================
def extrair_texto_da_url(url):
    """Extrai seções importantes da página usando headers de navegador"""
    try:
        print(f"🔍 Acessando: {url}")
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove elementos que não são conteúdo principal
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
            tag.decompose()
        
        # Palavras-chave que indicam seções importantes
        palavras_chave = [
            "instrução", "norma", "diretriz", "submissão", "formatação", "limite", 
            "preparação", "original", "avaliação", "checklist", "política editorial",
            "sobre a revista", "escopo", "foco", "público-alvo", "periodicidade",
            "taxa", "licença", "preprint", "direitos autorais", "conflito de interesses",
            "financiamento", "disponibilidade de dados", "como submeter", "author guidelines",
            "submission guidelines", "manuscript preparation", "reference style"
        ]
        
        # Procura por headings (h1, h2, h3) ou textos em negrito que contenham as palavras-chave
        secoes_interessantes = []
        for tag in soup.find_all(['h1', 'h2', 'h3', 'b', 'strong']):
            texto_tag = tag.get_text().strip().lower()
            if any(palavra in texto_tag for palavra in palavras_chave):
                conteudo = []
                for irmao in tag.find_next_siblings():
                    if irmao.name in ['h1', 'h2', 'h3']:
                        break
                    if irmao.get_text().strip():
                        conteudo.append(irmao.get_text().strip())
                if conteudo:
                    secoes_interessantes.append(f"{tag.get_text().strip()}\n" + "\n".join(conteudo))
        
        # Se encontrou seções, concatena e retorna
        if secoes_interessantes:
            texto_final = "\n\n--- SEÇÃO IMPORTANTE ---\n\n".join(secoes_interessantes)
            if len(texto_final) > 45000:
                texto_final = texto_final[:45000]
            print(f"✅ Texto extraído (seções relevantes): {len(texto_final)} caracteres")
            return texto_final
        
        # Fallback: extrai todo o texto limpo
        texto = soup.get_text(separator="\n")
        linhas = (linha.strip() for linha in texto.splitlines())
        texto_limpo = "\n".join(linha for linha in linhas if linha)
        if len(texto_limpo) > 35000:
            texto_limpo = texto_limpo[:35000]
        print(f"✅ Texto extraído (fallback completo): {len(texto_limpo)} caracteres")
        return texto_limpo
    except Exception as e:
        print(f"❌ Erro ao extrair {url}: {e}")
        return ""

# ==================================================
# PÓS-PROCESSAMENTO: CORRIGIR ERROS COMUNS DO JSON
# ==================================================
def pos_processar_json(json_data, texto_original, nome_revista):
    """Ajusta campos problemáticos gerados pela IA e garante completude."""
    
    # Garantir campos de formatação avançada com valores padrão conservadores
    formatacao = json_data.get("formatacao", {})
    if not isinstance(formatacao, dict):
        formatacao = {}
    
    # Valores padrão conservadores (fallback)
    padroes = {
        "margens": "2,5 cm",
        "recuo_primeira_linha": "1,25 cm",
        "alinhamento": "justificado",
        "citacoes_longas": {"recuo": "4 cm", "fonte": 11, "espacamento": "simples"},
        "exemplos_citacoes": "(Sobrenome, ano, p. X)",
        "exemplos_referencias": "SOBRENOME, Nome. (Ano). Título da obra. Cidade: Editora."
    }
    
    for campo, valor_padrao in padroes.items():
        if campo not in formatacao or not formatacao.get(campo):
            formatacao[campo] = valor_padrao
    
    # Se não houver marcação de origem, definir como "padrao"
    if "formatacao_origem" not in json_data or not json_data["formatacao_origem"]:
        json_data["formatacao_origem"] = "padrao"
    
    json_data["formatacao"] = formatacao
    
    # 1. Corrigir extensão quando ela contiver formato de arquivo (.doc, .rtf, etc.)
    for tipo in json_data.get("tipos_texto", []):
        extensao = tipo.get("extensao", "")
        if re.search(r'\.(rtf|doc|docx|odt|pdf)', extensao, re.I):
            palavra_match = re.search(r'(\d{1,3}(?:\.\d{3})*(?:\s*a\s*\d{1,3}(?:\.\d{3})*)?\s*(?:palavras|caracteres|toques))', 
                                      tipo.get("detalhes", "") + " " + str(json_data.get("checklist", "")), re.I)
            if palavra_match:
                tipo["extensao"] = palavra_match.group(1)
            else:
                tipo["extensao"] = "Não especificado"
        
        if tipo.get("resumo_maximo_palavras") and isinstance(tipo["resumo_maximo_palavras"], str):
            num = re.search(r'(\d+)', tipo["resumo_maximo_palavras"])
            if num:
                tipo["resumo_maximo_palavras"] = int(num.group(1))
    
    # 2. Garantir herança de resumo e palavras-chave
    limites = json_data.get("limites", {})
    resumo_global = limites.get("resumo_maximo", "")
    palavras_chave_global = limites.get("palavras_chave_quantidade", "")
    
    for tipo in json_data.get("tipos_texto", []):
        if not tipo.get("resumo_maximo_palavras") and resumo_global:
            num = re.search(r'(\d+)', str(resumo_global))
            tipo["resumo_maximo_palavras"] = int(num.group(1)) if num else None
        if not tipo.get("palavras_chave_quantidade") and palavras_chave_global:
            tipo["palavras_chave_quantidade"] = palavras_chave_global
    
    # 3. Normalizar números
    if limites.get("autores_maximo") and isinstance(limites["autores_maximo"], str):
        num = re.search(r'(\d+)', limites["autores_maximo"])
        if num:
            limites["autores_maximo"] = int(num.group(1))
    
    if limites.get("notas_rodape_palavras") and isinstance(limites["notas_rodape_palavras"], str):
        num = re.search(r'(\d+)', limites["notas_rodape_palavras"])
        if num:
            limites["notas_rodape_palavras"] = int(num.group(1))
    
    # 4. Ajustar periodicidade
    periodicidade = json_data.get("periodicidade", "")
    if "contínua" in periodicidade.lower() and "submissão" not in periodicidade.lower():
        json_data["periodicidade"] = periodicidade + " (submissões em fluxo contínuo)"
    
    # 5. CORREÇÃO: "palavras" para "toques" no resumo
    if limites.get("resumo_maximo"):
        resumo_str = str(limites["resumo_maximo"])
        if "750 palavras" in resumo_str.lower() or "750palavras" in resumo_str.lower():
            limites["resumo_maximo"] = resumo_str.replace("palavras", "toques").replace("Palavras", "toques")
        if "150 palavras" in resumo_str.lower():
            limites["resumo_maximo"] = resumo_str.replace("150 palavras", "150 toques")
    
    # 6. GARANTIR QUE OS NOVOS CAMPOS EXISTAM
    if "titulo_maximo" not in limites:
        limites["titulo_maximo"] = ""
    if "notas_rodape_formato" not in limites:
        limites["notas_rodape_formato"] = ""
    
    formatacao = json_data.get("formatacao", {})
    if "exemplos_referencias" not in formatacao:
        formatacao["exemplos_referencias"] = ""
    json_data["formatacao"] = formatacao
    
    adicionais = json_data.get("instrucoes_adicionais", {})
    if "declaracao_dados_opcoes" not in adicionais:
        adicionais["declaracao_dados_opcoes"] = ""
    json_data["instrucoes_adicionais"] = adicionais
    
    # 7. IDENTIFICAR SUBMISSÃO ABERTA
    sempre_internos = ["editorial", "apresentação", "carta do editor"]
    contextuais = ["entrevista", "tradução", "dossiê", "dossie", "ensaio"]
    
    for tipo in json_data.get("tipos_texto", []):
        tipo_lower = tipo.get("tipo", "").lower()
        detalhes = tipo.get("detalhes", "").lower()
        checklist = " ".join(json_data.get("checklist", [])).lower()
        texto_completo_verificacao = detalhes + " " + checklist
        
        tipo["submissao_aberta"] = True
        tipo["justificativa_submissao"] = ""
        
        if any(palavra in tipo_lower for palavra in sempre_internos):
            tipo["submissao_aberta"] = False
            tipo["justificativa_submissao"] = "Tipo editorial ou de apresentação, geralmente produzido internamente"
        
        elif any(palavra in tipo_lower for palavra in contextuais):
            nao_aceita = ["apenas a convite", "por convite", "iniciativa editorial", "produzida pela revista", 
                         "não aceita submissão", "não são aceitas submissões", "editores convidados",
                         "apenas por chamada", "chamada específica", "encomendada", "comissão editorial"]
            aceita = ["submissão", "envio de originais", "autores podem", "aceita trabalhos", 
                     "bem-vindos", "fluxo contínuo", "submeter"]
            
            encontrou_aceita = any(p in texto_completo_verificacao for p in aceita)
            encontrou_nao_aceita = any(p in texto_completo_verificacao for p in nao_aceita)
            
            if encontrou_nao_aceita and not encontrou_aceita:
                tipo["submissao_aberta"] = False
                tipo["justificativa_submissao"] = "Texto indica que não aceita submissão externa"
            elif encontrou_aceita:
                tipo["submissao_aberta"] = True
                tipo["justificativa_submissao"] = "Texto indica aceitação de submissão"
            else:
                tipo["submissao_aberta"] = None
                tipo["justificativa_submissao"] = "Ambíguo - verificar manualmente"
        
        elif any(p in tipo_lower for p in ["artigo", "resenha", "nota técnica", "comentário"]):
            tipo["submissao_aberta"] = True
            tipo["justificativa_submissao"] = "Tipo tradicionalmente aceito para submissão"
    
    # 8. GERAR TEMPLATE E IMAGEM AUTOMATICAMENTE
    if not json_data.get("imagem") or json_data["imagem"] == "imagem/placeholder.png":
        json_data["imagem"] = gerar_nome_arquivo(nome_revista, "", "imagem")
    
    for tipo in json_data.get("tipos_texto", []):
        if not tipo.get("template") or tipo["template"] == "":
            tipo_nome = tipo.get("tipo", "manuscrito")
            tipo["template"] = gerar_nome_arquivo(nome_revista, tipo_nome, "template")
    
    # 9. Garantir que checklist seja lista
    if not isinstance(json_data.get("checklist"), list):
        json_data["checklist"] = []
    
    return json_data

# ==================================================
# GERAR JSON COM IA (MULTIPLAS URLS) - PROMPT COMPLETO
# ==================================================
def gerar_json_com_ia(texto_completo, nome_revista, id_revista, urls_originais):
    prompt = f"""
Você é um assistente especializado em extrair normas de revistas científicas.

Com base **exclusivamente** no texto oficial abaixo, gere um JSON **exatamente** com a estrutura a seguir.

⚠️ REGRAS OBRIGATÓRIAS:
1. NUNCA invente informações. Se não encontrar no texto, use "" (string vazia) ou null.
2. Para "qualis": NÃO assuma "A1". Deixe "" se não encontrar.
3. No array "tipos_texto", o campo "extensao" deve conter APENAS o limite de palavras (ex: "4.000 a 14.000 palavras").
4. Extraia "issn", "periodicidade", "licenca".
5. Extraia "limites.resumo_maximo" com NÚMERO e UNIDADE EXATA (ex: "750 toques").
6. Extraia "limites.titulo_maximo", "palavras_chave_quantidade", "autores_maximo" (inteiro), "notas_rodape_palavras" e "notas_rodape_formato".
7. Extraia exemplos de referências para "formatacao.exemplos_referencias".
8. Extraia exemplos de citações para "formatacao.exemplos_citacoes" (ex: "(Sobrenome, ano, p. X)").
9. Extraia regras de **margens** (ex: "2,5 cm", "3 cm").
10. Extraia **recuo_primeira_linha** (ex: "1,25 cm", "sem recuo").
11. Extraia **citacoes_longas** como objeto: {{ "recuo": "4 cm", "fonte": 11, "espacamento": "simples" }}.
12. Extraia **tabelas_figuras** com regras completas.
13. Se algum campo de formatação não for encontrado, preencha com "" e marque "formatacao_origem": "padrao" no nível raiz do JSON. Caso contrário, use "formatacao_origem": "extraido".

A estrutura obrigatória é:

{{
  "id": {id_revista},
  "nome": "{nome_revista}",
  "imagem": "imagem/placeholder.png",
  "instituicao": "",
  "qualis": "",
  "issn": "",
  "foco": "",
  "descricao": "",
  "avaliacao": "",
  "avaliacao_preprint": "",
  "taxa": "",
  "periodicidade": "",
  "preprint": "",
  "licenca": "",
  "data_auditoria": "2026-03-30",
  "url_fonte_instrucoes": "{urls_originais[0]}",
  "ultima_atualizacao_normas": null,
  "formatacao_origem": "",
  "links": {{
    "site": "",
    "submissao": "",
    "diretrizes": "{urls_originais[0]}"
  }},
  "limites": {{
    "artigo_palavras": "",
    "nota_tecnica_palavras": "",
    "comentario_critico_palavras": "",
    "resumo_maximo": "",
    "titulo_maximo": "",
    "palavras_chave_quantidade": "",
    "autores_maximo": null,
    "notas_rodape_palavras": null,
    "notas_rodape_formato": "",
    "outros_limites": null
  }},
  "formatacao": {{
    "fonte": "",
    "tamanho_fonte": null,
    "espacamento_entrelinhas": null,
    "margens": "",
    "recuo_primeira_linha": "",
    "alinhamento": "",
    "citacoes_longas": {{ "recuo": "", "fonte": null, "espacamento": "" }},
    "tabelas_figuras": "",
    "citacoes_formato": "",
    "referencias_formato": "",
    "exemplos_citacoes": "",
    "exemplos_referencias": ""
  }},
  "tipos_texto": [
    {{
      "tipo": "",
      "extensao": "",
      "detalhes": "",
      "titulacao_minima_autor": "",
      "idiomas_aceitos": [],
      "resumo_maximo_palavras": null,
      "palavras_chave_quantidade": "",
      "estrutura_sugerida": [],
      "requisitos_especificos": [],
      "referencias_minimas": null,
      "template": "",
      "submissao_aberta": true,
      "justificativa_submissao": ""
    }}
  ],
  "checklist": [],
  "instrucoes_adicionais": {{
    "contribuicao_autores": "",
    "disponibilidade_dados": "",
    "declaracao_dados_opcoes": "",
    "financiamento": "",
    "preprint": ""
  }}
}}

Responda APENAS com o JSON, sem comentários ou formatação extra.

Texto oficial coletado de {len(urls_originais)} fonte(s):
--- INÍCIO DO TEXTO ---
{texto_completo}
--- FIM DO TEXTO ---
"""
    max_tentativas = 3
    for tentativa in range(max_tentativas):
        try:
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            headers = {"Content-Type": "application/json"}
            resposta = requests.post(API_URL, json=payload, headers=headers, timeout=90)
            
            if resposta.status_code == 200:
                dados = resposta.json()
                json_texto = dados["candidates"][0]["content"]["parts"][0]["text"]
                if "```json" in json_texto:
                    json_texto = json_texto.split("```json")[1].split("```")[0]
                elif "```" in json_texto:
                    json_texto = json_texto.split("```")[1].split("```")[0]
                json_data = json.loads(json_texto.strip())
                json_data = pos_processar_json(json_data, texto_completo, nome_revista)
                return json_data
            
            elif resposta.status_code == 503:
                tempo_espera = (2 ** tentativa) + 1
                print(f"⚠️ Erro 503. Tentativa {tentativa+1}/{max_tentativas}. Aguardando {tempo_espera}s...")
                time.sleep(tempo_espera)
            else:
                print(f"❌ Erro na API: {resposta.status_code} - {resposta.text[:300]}")
                return None
        except Exception as e:
            print(f"❌ Erro na chamada: {e}")
            return None
    print(f"❌ Falha após {max_tentativas} tentativas.")
    return None

# ==================================================
# PROCESSAR TODAS AS REVISTAS (MULTIPLAS URLS)
# ==================================================
def processar_todas_revistas():
    try:
        with open("config.json", "r", encoding="utf-8") as f:
            config = json.load(f)
    except FileNotFoundError:
        print("❌ Arquivo 'config.json' não encontrado!")
        return

    for revista in config["revistas"]:
        id_rev = revista["id"]
        nome_rev = revista["nome"]
        urls = revista.get("urls", [])
        if not urls:
            print(f"⚠️ Nenhuma URL definida para {nome_rev}. Pulando.")
            continue

        print(f"\n📘 Processando: {nome_rev} (ID {id_rev})")
        texto_completo = ""
        for url in urls:
            texto = extrair_texto_da_url(url)
            if texto:
                texto_completo += f"\n\n--- CONTEÚDO DE {url} ---\n\n{texto}\n\n"
        
        if not texto_completo.strip():
            print(f"⚠️ Nenhum texto extraído para {nome_rev}. Pulando.")
            continue

        print(f"🤖 Enviando para IA ({MODELO})... (texto total: {len(texto_completo)} caracteres)")
        json_gerado = gerar_json_com_ia(texto_completo, nome_rev, id_rev, urls)
        if not json_gerado:
            print(f"❌ Falha ao gerar JSON para {nome_rev}")
            continue

        os.makedirs(PASTA_REVISTAS, exist_ok=True)
        caminho_json = os.path.join(PASTA_REVISTAS, f"{id_rev}.json")
        with open(caminho_json, "w", encoding="utf-8") as f:
            json.dump(json_gerado, f, indent=2, ensure_ascii=False)
        print(f"✅ JSON salvo em {caminho_json}")

        time.sleep(2)

    ids_lista = [r["id"] for r in config["revistas"]]
    index_path = os.path.join(PASTA_REVISTAS, "index.json")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump({"ids": ids_lista, "atualizado_em": "2026-03-30"}, f, indent=2)
    print(f"\n📋 index.json atualizado com {len(ids_lista)} revistas.")

if __name__ == "__main__":
    processar_todas_revistas()