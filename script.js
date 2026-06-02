// ==============================================
// ARQUIVO: script.js
// CODIFICAÇÃO: UTF-8 (obrigatório para acentos)
// SISTEMA DE NORMAS NEV/USP - VERSÃO REFINADA (COM MELHORIAS)
// ==============================================
// ✅ Correção de classes CSS (filter-pill, card-academic)
// ✅ Melhor tratamento de erros e fallbacks
// ✅ Evita duplicação de conteúdo no detalhe
// ✅ Download de template com feedback
// ✅ Cache de dados (CACHE_DURATION = 1 hora)
// ✅ Favoritos com localStorage
// ✅ Notificações de atualização (data_auditoria / última visita)
// ==============================================

// Estado Global
window.state = {
    revistas: [],               // Lista resumida para exibição
    revistasMap: new Map(),    // Mapa com dados completos (id -> objeto)
    normasGerais: {},
    filtroQualis: 'Todos',
    searchTerm: '',
    currentView: 'main',
    currentRevista: null,
    usandoCache: false,
    favorites: new Set()       // IDs das revistas favoritas
};

window.CONFIG = {
    JSON_PATH: 'revistas/index.json',
    CACHE_KEY: 'nev_normas_cache_v6',
    CACHE_DURATION: 3600000,   // 1 hora (em ms)
    LAST_VISIT_KEY: 'submetnev_last_visit',
    FAVORITES_KEY: 'submetnev_favorites',
    IMAGE_PLACEHOLDER: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjY2NiMmZmIj48cGF0aCBkPSJNMjAgMkg0Yy0xLjEgMC0yIC45LTIgMnYxNmMwIDEuMS45IDIgMiAyaDE2YzEuMSAwIDItLjkgMi0yVjRjMC0xLjEtLjktMi0yLTJ6bS04IDljMCAxLjEtLjkgMi0yIDJzLTItLjktMi0yIC45LTIgMi0yIDIgLjkgMiAyem01IDRsLTUgN3oiLz48L3N2Zz4='
};

// ==============================================
// DIRETRIZES METODOLÓGICAS DE REFERÊNCIA (GUIAS)
// ==============================================
const GUIAS = {
    artigo: {
        icone: "📄",
        titulo: "📋 Estrutura de Artigo Científico (NBR 6022:2018)",
        descricao: "Diretrizes estruturais para artigos originais e de revisão",
        etapas: [
            {
                icone: "🏷️",
                titulo: "Elementos Pré-textuais",
                itens: [
                    "Título (claro, conciso e representativo do conteúdo)",
                    "Resumo e Abstract (100-250 palavras, com problema, objetivo, método, resultados e conclusão)",
                    "Palavras-chave e Keywords (3 a 5 termos, descritores do conteúdo)",
                    "Autoria e filiação institucional (conforme política de anonimato da revista)"
                ]
            },
            {
                icone: "🎯",
                titulo: "Introdução e Fundamentação Teórica",
                itens: [
                    "Delimitação do problema de pesquisa e pergunta central",
                    "Objetivos (geral e específicos, claros e alcançáveis)",
                    "Revisão da literatura e Estado da Arte (o que já foi produzido sobre o tema)",
                    "Justificativa da originalidade e relevância do estudo"
                ]
            },
            {
                icone: "🔬",
                titulo: "Metodologia e Análise de Dados",
                itens: [
                    "Procedimentos metodológicos (tipo de pesquisa, abordagem, universo, amostra, instrumentos de coleta)",
                    "Técnicas de análise de dados (detalhadas e justificadas)",
                    "Aspectos éticos (aprovação de comitê de ética, se aplicável)",
                    "Limitações do método e implicações para os resultados"
                ]
            },
            {
                icone: "⚖️",
                titulo: "Resultados, Discussão e Conclusões",
                itens: [
                    "Apresentação clara e objetiva dos achados (tabelas, gráficos, figuras com fontes)",
                    "Discussão dos resultados à luz do referencial teórico (dialogar, confirmar, contradizer)",
                    "Síntese das conclusões e retomada dos objetivos",
                    "Contribuições originais do estudo e agenda para pesquisas futuras"
                ]
            }
        ],
        dica: "Em periódicos Qualis A, a Discussão Teórica deve ir além da descrição dos dados, estabelecendo um diálogo crítico com a literatura e aprofundando as implicações dos achados."
    },
    resenha: {
        icone: "📖",
        titulo: "📋 Roteiro para Resenha Crítica (Ensaio Bibliográfico)",
        descricao: "Análise crítica de obra, situada no campo disciplinar e com posicionamento autoral",
        etapas: [
            {
                icone: "📌",
                titulo: "Contextualização da Obra",
                itens: [
                    "Referência completa da obra (livro, artigo, filme, etc. - NBR 6023)",
                    "Breve apresentação do autor/diretor e sua relevância no campo",
                    "Situação da obra no debate atual da área ou em relação a outras produções do autor"
                ]
            },
            {
                icone: "⚖️",
                titulo: "Análise e Crítica",
                itens: [
                    "Síntese argumentativa da obra (NÃO um resumo capítulo a capítulo, mas a tese central)",
                    "Identificação dos pontos fortes e contribuições originais da obra",
                    "Apontamento de possíveis limitações metodológicas, conceituais ou lacunas",
                    "Diálogo crítico com outras obras ou autores do campo, posicionando a resenha"
                ]
            },
            {
                icone: "💡",
                titulo: "Considerações Finais",
                itens: [
                    "Avaliação do impacto da obra para a área de conhecimento",
                    "Recomendação ou não da leitura, com justificativa",
                    "Reflexão sobre o futuro do debate a partir da obra"
                ]
            }
        ],
        dica: "Uma resenha acadêmica de alto nível deve 'conversar' com o campo de conhecimento, apresentando um posicionamento crítico e original, e não apenas resumir o conteúdo da obra."
    },
    ensaio: {
        icone: "📝",
        titulo: "📋 Estrutura de Ensaio Teórico",
        descricao: "Texto que explora e desenvolve uma ideia ou tese, com rigor lógico-argumentativo",
        etapas: [
            {
                icone: "🎯",
                titulo: "Tese Central e Problematização",
                itens: [
                    "Proposição clara de uma ideia, conceito ou tese a ser desenvolvida",
                    "Problematização de conceitos estabelecidos ou lacunas teóricas",
                    "Rigor na lógica de argumentação e originalidade da abordagem"
                ]
            },
            {
                icone: "💭",
                titulo: "Desenvolvimento Argumentativo",
                itens: [
                    "Diálogo crítico com a literatura de referência (não exaustivo, mas estratégico)",
                    "Encadeamento lógico e progressivo dos argumentos",
                    "Análise de exemplos ou casos que ilustrem a tese (se aplicável)"
                ]
            },
            {
                icone: "✨",
                titulo: "Conclusão e Contribuição",
                itens: [
                    "Síntese da tese defendida e suas implicações",
                    "Contribuição conceitual ou metodológica para o campo",
                    "Questões em aberto ou agenda para futuras reflexões"
                ]
            }
        ],
        dica: "Ensaios teóricos não são 'opiniões' desprovidas de rigor, mas sim construções lógicas e argumentativas que buscam aprofundar ou inovar em um debate."
    },
    tese_dissertacao: {
        icone: "🎓",
        titulo: "📋 Estrutura de Teses e Dissertações (NBR 14724)",
        descricao: "Padrão estrutural para trabalhos de pós-graduação (Teses e Dissertações)",
        etapas: [
            { icone: "🏷️", titulo: "Elementos Pré-textuais", itens: ["Capa", "Folha de rosto", "Ficha catalográfica", "Folha de aprovação", "Dedicatória (opcional)", "Agradecimentos", "Epígrafe (opcional)", "Resumo e Abstract", "Lista de ilustrações, tabelas, abreviaturas (se houver)", "Sumário"] },
            { icone: "📝", titulo: "Elementos Textuais", itens: ["Introdução (contexto, problema, objetivos, justificativa)", "Referencial Teórico (revisão crítica da literatura)", "Metodologia (tipo de pesquisa, procedimentos, ética)", "Resultados e Discussão (análise e interpretação)", "Conclusão (síntese, contribuições, limitações)"] },
            { icone: "🔗", titulo: "Elementos Pós-textuais", itens: ["Referências (NBR 6023)", "Glossário (opcional)", "Apêndices (elaborados pelo autor)", "Anexos (não elaborados pelo autor)"] }
        ],
        dica: "A tese/dissertação deve apresentar uma contribuição original e inédita para o conhecimento, com rigor metodológico e argumentativo."
    }
};

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast show ${type} animate-fade-in bg-white border p-4 rounded-lg shadow-lg flex items-center gap-3`;
    const icons = { info: 'fa-info-circle text-blue-500', success: 'fa-check-circle text-green-500', error: 'fa-exclamation-circle text-red-500', warning: 'fa-exclamation-triangle text-yellow-500' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span class="text-sm font-medium">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
}

function updateResultsCount(count) {
    const el = document.getElementById('results-count');
    if (!el) return;
    el.innerHTML = count === 0 ? `<span class="text-slate-400">Nenhuma revista encontrada</span>` : `Exibindo <span class="text-[#003366] font-bold mx-1">${count}</span> ${count === 1 ? 'revista' : 'revistas'}`;
}

// ==============================================
// GERENCIAMENTO DE CACHE (localStorage)
// ==============================================
function getCachedData() {
    const cached = localStorage.getItem(window.CONFIG.CACHE_KEY);
    if (!cached) return null;
    try {
        const data = JSON.parse(cached);
        const now = Date.now();
        if (now - data.timestamp < window.CONFIG.CACHE_DURATION) {
            return data;
        }
    } catch (e) {
        console.warn('Erro ao ler cache:', e);
    }
    return null;
}

function setCachedData(revistasMap, normasData) {
    // Converter Map para objeto serializável
    const revistasObj = {};
    revistasMap.forEach((value, key) => { revistasObj[key] = value; });
    const cacheData = {
        timestamp: Date.now(),
        revistas: revistasObj,
        normas: normasData
    };
    localStorage.setItem(window.CONFIG.CACHE_KEY, JSON.stringify(cacheData));
}

// ==============================================
// FAVORITOS
// ==============================================
function loadFavorites() {
    const saved = localStorage.getItem(window.CONFIG.FAVORITES_KEY);
    if (saved) {
        try {
            const favs = JSON.parse(saved);
            window.state.favorites = new Set(favs);
        } catch (e) { console.warn(e); }
    }
}

function saveFavorites() {
    localStorage.setItem(window.CONFIG.FAVORITES_KEY, JSON.stringify([...window.state.favorites]));
}

function toggleFavorite(revistaId) {
    if (window.state.favorites.has(revistaId)) {
        window.state.favorites.delete(revistaId);
        showToast('Revista removida dos favoritos', 'info');
    } else {
        window.state.favorites.add(revistaId);
        showToast('Revista adicionada aos favoritos', 'success');
    }
    saveFavorites();
    // Atualizar interface (cards e detalhe)
    renderRevistas();
    if (window.state.currentRevista && window.state.currentRevista.id === revistaId) {
        updateDetailFavoriteIcon(revistaId);
    }
}

function isFavorite(revistaId) {
    return window.state.favorites.has(revistaId);
}

function updateDetailFavoriteIcon(revistaId) {
    const starBtn = document.getElementById('favorite-star-detail');
    if (starBtn) {
        const isFav = isFavorite(revistaId);
        starBtn.innerHTML = isFav ? '<i class="fas fa-star text-yellow-500"></i>' : '<i class="far fa-star text-slate-400"></i>';
        starBtn.classList.toggle('text-yellow-500', isFav);
    }
}

// ==============================================
// NOTIFICAÇÕES DE ATUALIZAÇÃO
// ==============================================
function getLastVisit() {
    const last = localStorage.getItem(window.CONFIG.LAST_VISIT_KEY);
    return last ? new Date(last) : null;
}

function updateLastVisit() {
    localStorage.setItem(window.CONFIG.LAST_VISIT_KEY, new Date().toISOString());
}

function checkForUpdates(revistasMap, normasData) {
    const lastVisit = getLastVisit();
    if (!lastVisit) return; // primeira visita, não notificar

    const updatedItems = [];

    // Verificar revistas
    for (const [id, revista] of revistasMap.entries()) {
        if (revista.data_auditoria) {
            const auditDate = new Date(revista.data_auditoria);
            if (auditDate > lastVisit) {
                updatedItems.push({ type: 'revista', id, nome: revista.nome });
            }
        }
    }

    // Verificar normas gerais
    if (normasData.ultima_atualizacao_normas) {
        const normsDate = new Date(normasData.ultima_atualizacao_normas);
        if (normsDate > lastVisit) {
            updatedItems.push({ type: 'normas', nome: 'Normas Gerais' });
        }
    }

    if (updatedItems.length > 0) {
        const message = `📢 ${updatedItems.length} atualização(ões) disponível(is) desde sua última visita.`;
        showToast(message, 'info');
        // Marcar visualmente os cards atualizados (adicionar classe 'updated')
        updatedItems.forEach(item => {
            if (item.type === 'revista') {
                const card = document.querySelector(`.card-academic[data-id="${item.id}"]`);
                if (card) card.classList.add('updated-card');
            }
        });
        // Se houver atualização nas normas, pode-se adicionar um indicador no menu
        if (updatedItems.some(i => i.type === 'normas')) {
            const normasMenu = document.querySelector('#menu-normas');
            if (normasMenu) normasMenu.classList.add('updated-menu');
        }
    }
}

// ==============================================
// CARREGAMENTO DE DADOS (COM CACHE)
// ==============================================
async function loadData() {
    try {
        // 1. Tentar carregar do cache
        const cached = getCachedData();
        if (cached) {
            console.log('Usando dados do cache');
            window.state.usandoCache = true;
            const revistasMap = new Map(Object.entries(cached.revistas));
            const normasData = cached.normas;

            // Construir lista resumida para exibição
            const revistasList = [];
            revistasMap.forEach((data, id) => {
                revistasList.push({
                    id: id,
                    nome: data.nome || `Revista ${id}`,
                    qualis: data.qualis || 'Sem classificação',
                    instituicao: data.instituicao || 'Instituição não informada',
                    foco: data.foco || '',
                    imagem: data.imagem || window.CONFIG.IMAGE_PLACEHOLDER
                });
            });

            window.state.revistasMap = revistasMap;
            window.state.revistas = revistasList;
            window.state.normasGerais = normasData;

            renderQualisFilters();
            renderRevistas();
            checkForUpdates(revistasMap, normasData);
            return;
        }

        // 2. Se não houver cache ou expirado, buscar da rede
        console.log('Buscando dados da rede');
        window.state.usandoCache = false;
        const timestamp = Date.now();

        const [indexRes, normasRes] = await Promise.all([
            fetch(`${window.CONFIG.JSON_PATH}?t=${timestamp}`),
            fetch(`normas_gerais.json?t=${timestamp}`)
        ]);

        if (!indexRes.ok) throw new Error(`Falha ao carregar índice: ${indexRes.status}`);
        if (!normasRes.ok) throw new Error(`Falha ao carregar normas gerais: ${normasRes.status}`);

        const indexData = await indexRes.json();
        const normasData = await normasRes.json();

        if (!indexData.ids || !Array.isArray(indexData.ids)) {
            throw new Error('Índice não contém um array "ids"');
        }

        const revistaIds = indexData.ids;

        // Buscar todos os JSONs individuais
        const revistasMap = new Map();
        const revistasList = [];

        await Promise.all(
            revistaIds.map(async id => {
                try {
                    const res = await fetch(`revistas/${id}.json?t=${timestamp}`);
                    if (!res.ok) {
                        console.warn(`Revista ID ${id} não encontrada: ${res.status}`);
                        return;
                    }
                    const data = await res.json();
                    revistasMap.set(id, data);
                    revistasList.push({
                        id: id,
                        nome: data.nome || `Revista ${id}`,
                        qualis: data.qualis || 'Sem classificação',
                        instituicao: data.instituicao || 'Instituição não informada',
                        foco: data.foco || '',
                        imagem: data.imagem || window.CONFIG.IMAGE_PLACEHOLDER
                    });
                } catch (err) {
                    console.warn(`Erro ao carregar revista ${id}:`, err);
                }
            })
        );

        if (revistasList.length !== revistaIds.length) {
            console.warn(`Apenas ${revistasList.length} de ${revistaIds.length} revistas carregadas.`);
            showToast(`Atenção: ${revistaIds.length - revistasList.length} revistas não puderam ser carregadas.`, 'warning');
        }

        window.state.revistasMap = revistasMap;
        window.state.revistas = revistasList;
        window.state.normasGerais = normasData;

        // Salvar cache
        setCachedData(revistasMap, normasData);

        renderQualisFilters();
        renderRevistas();

        // Notificar sobre atualizações (compara com última visita)
        checkForUpdates(revistasMap, normasData);

        // Atualizar timestamp da última visita
        updateLastVisit();

    } catch (error) {
        console.error("Erro fatal na carga de dados:", error);
        showToast(`Erro ao carregar dados: ${error.message}`, 'error');
        document.getElementById('revistas-grid').innerHTML = `<div class="col-span-full text-center py-20 text-slate-500"><i class="fas fa-exclamation-triangle text-4xl mb-3"></i><p>Falha ao carregar dados. Tente recarregar a página.</p></div>`;
    }
}

// ==============================================
// RENDERIZAÇÃO: FILTROS
// ==============================================
function renderQualisFilters() {
    const container = document.getElementById('qualis-filters');
    if (!container) return;
    const qualisUnicos = ['Todos', ...new Set(window.state.revistas.map(r => r.qualis))].sort();
    container.innerHTML = qualisUnicos.map(q => `
        <button 
            onclick="window.setFiltroQualis('${q}')" 
            class="filter-pill ${window.state.filtroQualis === q ? 'active' : ''}"
        >
            ${q}
        </button>
    `).join('');
}

window.setFiltroQualis = function(q) {
    window.state.filtroQualis = q;
    renderQualisFilters();
    renderRevistas();
};

// ==============================================
// RENDERIZAÇÃO: LISTA DE REVISTAS
// ==============================================
function renderRevistas() {
    const grid = document.getElementById('revistas-grid');
    if (!grid) return;
    const filtradas = window.state.revistas.filter(r => {
        const matchQualis = window.state.filtroQualis === 'Todos' || r.qualis === window.state.filtroQualis;
        const searchLower = window.state.searchTerm.toLowerCase();
        return matchQualis && (r.nome.toLowerCase().includes(searchLower) || r.instituicao.toLowerCase().includes(searchLower) || r.foco.toLowerCase().includes(searchLower));
    });
    updateResultsCount(filtradas.length);
    grid.innerHTML = filtradas.map(r => `
        <div class="card-academic overflow-hidden flex flex-col animate-fade-in p-5" data-id="${r.id}">
            <div class="flex items-start justify-between mb-4">
                <div class="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                    <img src="${r.imagem}" alt="${r.nome}" class="w-full h-full object-contain p-2" onerror="this.onerror=null; this.src='${window.CONFIG.IMAGE_PLACEHOLDER}';">
                </div>
                <div class="flex items-center gap-2">
                    <span class="qualis-badge ${getQualisClass(r.qualis)}">Qualis ${r.qualis}</span>
                    <button onclick="window.toggleFavorite('${r.id}')" class="favorite-star text-xl focus:outline-none">
                        ${isFavorite(r.id) ? '<i class="fas fa-star text-yellow-500"></i>' : '<i class="far fa-star text-slate-400"></i>'}
                    </button>
                </div>
            </div>
            <h3 class="text-slate-900 font-bold text-lg leading-tight mb-2 line-clamp-2">${r.nome}</h3>
            <p class="text-slate-500 text-xs font-medium mb-3 flex items-center gap-1"><i class="fas fa-university opacity-70"></i> ${r.instituicao}</p>
            <p class="text-slate-600 text-sm line-clamp-2 mb-4 italic">"${r.foco}"</p>
            <div class="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: ${r.id}</span>
                <button onclick="window.showRevistaDetail('${r.id}')" class="btn-primary py-2 text-xs">Ver Diretrizes <i class="fas fa-arrow-right text-[10px]"></i></button>
            </div>
        </div>
    `).join('');
}

function getQualisClass(qualis) {
    const map = {
        'A1': 'qualis-A1', 'A2': 'qualis-A2', 'A3': 'qualis-A3', 'A4': 'qualis-A4',
        'B1': 'qualis-B1', 'B2': 'qualis-B2', 'B3': 'qualis-B3', 'B4': 'qualis-B4',
        'C': 'qualis-C'
    };
    return map[qualis] || 'qualis-nao-especificado';
}

// ==============================================
// DETALHE DA REVISTA (VERSÃO COM LAYOUT CORRIGIDO)
// ==============================================
window.showRevistaDetail = async function(id, save = true) {
    if (save && window.router) {
        window.router.push('detalhe', id, true);
        return;
    }

    const container = document.getElementById('revista-detail-content');
    if (!container) return;

    container.innerHTML = `<div class="flex flex-col items-center justify-center py-20"><i class="fas fa-spinner animate-spin text-4xl text-[#003366] mb-4"></i><p class="text-slate-500 font-medium">Carregando diretrizes...</p></div>`;

    try {
        // Tenta obter do mapa primeiro, senão busca da rede
        let r = window.state.revistasMap.get(id);
        if (!r) {
            const response = await fetch(`revistas/${id}.json?t=${Date.now()}`);
            if (!response.ok) throw new Error(`Revista ID ${id} não encontrada.`);
            r = await response.json();
            window.state.revistasMap.set(id, r);
        }

        // Armazenar revista atual
        window.state.currentRevista = r;

        // Monta HTML do detalhe com layout corrigido
        container.innerHTML = `
            <div class="animate-fade-in">
                <!-- Cabeçalho da revista -->
                <div class="detail-main-section">
                    <div class="flex flex-col md:flex-row gap-8 items-start">
                        <div class="w-32 h-32 bg-white rounded-2xl border border-slate-200 flex items-center justify-center p-4">
                            <img src="${r.imagem || window.CONFIG.IMAGE_PLACEHOLDER}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='${window.CONFIG.IMAGE_PLACEHOLDER}';">
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <h1 class="text-2xl font-extrabold text-slate-900 mb-2">${r.nome || 'Revista'}</h1>
                                <button id="favorite-star-detail" onclick="window.toggleFavorite('${id}')" class="text-2xl focus:outline-none">
                                    ${isFavorite(id) ? '<i class="fas fa-star text-yellow-500"></i>' : '<i class="far fa-star text-slate-400"></i>'}
                                </button>
                            </div>
                            <p class="text-slate-500 font-medium mb-4"><i class="fas fa-university text-[#003366]"></i> ${r.instituicao || 'Instituição não informada'}</p>
                            <div class="flex flex-wrap gap-3">
                                ${r.links?.site ? `<a href="${r.links.site}" target="_blank" class="btn-primary py-2 text-xs"><i class="fas fa-external-link-alt"></i> Site Oficial</a>` : ''}
                                ${r.links?.submissao ? `<a href="${r.links.submissao}" target="_blank" class="btn-primary py-2 text-xs"><i class="fas fa-paper-plane"></i> Submeter</a>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SEÇÃO 1: FOCO E ESCOPO (LARGURA TOTAL) -->
                <div class="w-full mb-8">
                    <section class="card-academic p-6 md:p-8">
                        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><i class="fas fa-bullseye text-[#003366]"></i> Foco e Escopo</h2>
                        <p class="text-slate-600 leading-relaxed">${r.foco || 'Informação não disponível'}</p>
                    </section>
                </div>

                <!-- SEÇÃO 2: TEMPLATES (LARGURA TOTAL) -->
                <div class="w-full mb-8">
                    <section class="card-academic p-6 md:p-8">
                        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><i class="fas fa-file-alt text-[#003366]"></i> Templates de Estrutura</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${r.tipos_texto?.map(t => `
                                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h4 class="font-bold text-[#003366] mb-1">${t.tipo || 'Template'}</h4>
                                    <p class="text-xs text-slate-500 mb-3">${t.detalhes || ''}</p>
                                    <button onclick="window.downloadTemplate('${t.template}', this)" class="btn-primary w-full text-[10px] py-2 justify-center">
                                        <i class="fas fa-file-word"></i> Baixar Template .DOCX
                                    </button>
                                </div>
                            `).join('') || '<p class="text-slate-500">Consulte o site oficial da revista para templates específicos.</p>'}
                        </div>
                    </section>
                </div>

                <!-- SEÇÃO 3: FORMAÇÃO E CHECKLIST (LADO A LADO) -->
                <div class="detail-two-columns">
                    <!-- Coluna esquerda: Formatação -->
                    <section class="card-academic p-6 bg-[#003366] text-white">
                        <h2 class="text-lg font-bold mb-6 flex items-center gap-2"><i class="fas fa-i-cursor"></i> Formatação</h2>
                        <div class="space-y-4">
                            ${r.formatacao ? Object.entries(r.formatacao).map(([k, v]) => `
                                <div class="border-b border-white/10 pb-3 last:border-0">
                                    <p class="text-[10px] uppercase tracking-widest text-white/60 mb-1">${k.replace(/_/g, ' ')}</p>
                                    <p class="text-sm font-medium">${v}</p>
                                </div>
                            `).join('') : '<p>Consulte as normas da revista.</p>'}
                        </div>
                    </section>

                    <!-- Coluna direita: Checklist -->
                    <section class="card-academic p-6">
                        <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><i class="fas fa-check-double text-[#003366]"></i> Checklist Final</h2>
                        <ul class="space-y-3">
                            ${r.checklist?.map(item => `<li class="flex items-start gap-3 text-sm text-slate-600"><i class="fas fa-square text-slate-300 mt-1 text-xs"></i><span>${item}</span></li>`).join('') || '<li class="text-sm text-slate-500">Consulte as diretrizes da revista.</li>'}
                        </ul>
                    </section>
                </div>
            </div>
        `;

        // Garantir que a view de detalhe seja exibida
        document.getElementById('main-view')?.classList.add('hidden');
        document.getElementById('detail-view')?.classList.remove('hidden');
        document.getElementById('general-norms-view')?.classList.add('hidden');
        document.getElementById('guide-view')?.classList.add('hidden');
        window.scrollTo(0, 0);
        
    } catch (e) {
        console.error(e);
        showToast(`Erro ao carregar detalhes da revista: ${e.message}`, 'error');
        container.innerHTML = `<div class="text-center py-20 text-slate-500"><i class="fas fa-exclamation-circle text-4xl mb-3"></i><p>Não foi possível carregar os dados da revista.</p><button onclick="window.router.back()" class="btn-primary mt-4">Voltar</button></div>`;
    }
};// ==============================================
// NORMAS GERAIS E GUIAS
// ==============================================
window.showGeneralNorms = function(save = true) {
    const container = document.getElementById('general-norms-content');
    if (!container) return;
    if (save && window.router) { window.router.push('normas', null, true); return; }

    container.innerHTML = Object.entries(window.state.normasGerais).map(([k, v]) => `
        <div class="card-academic p-6 border-l-4 border-l-[#003366] animate-fade-in">
            <h3 class="text-lg font-bold text-[#003366] mb-4">${v.titulo}</h3>
            <ul class="space-y-3">
                ${v.itens.map(item => `<li class="text-sm text-slate-600 flex items-start gap-2"><i class="fas fa-chevron-right text-[10px] mt-1.5 opacity-50"></i>${item}</li>`).join('')}
            </ul>
        </div>
    `).join('');

    document.getElementById('main-view')?.classList.add('hidden');
    document.getElementById('detail-view')?.classList.add('hidden');
    document.getElementById('guide-view')?.classList.add('hidden');
    document.getElementById('general-norms-view')?.classList.remove('hidden');
    window.scrollTo(0, 0);
};

window.showGuideView = function(save = true) {
    const container = document.getElementById('guide-content');
    if (!container) return;
    if (save && window.router) { window.router.push('guias', null, true); return; }

    container.innerHTML = Object.values(GUIAS).map(g => `
        <div class="card-academic overflow-hidden animate-fade-in">
            <div class="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                <span class="text-4xl">${g.icone}</span>
                <div><h3 class="text-xl font-bold text-slate-900">${g.titulo}</h3><p class="text-slate-500 text-sm">${g.descricao}</p></div>
            </div>
            <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                ${g.etapas.map(e => `
                    <div>
                        <h4 class="font-bold text-[#003366] border-b pb-2 mb-3">${e.icone} ${e.titulo}</h4>
                        <ul class="space-y-2">
                            ${e.itens.map(i => `<li class="text-sm text-slate-600 flex items-start gap-2"><i class="fas fa-check text-[10px] text-emerald-500 mt-1"></i>${i}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
            <div class="px-8 pb-8"><div class="p-4 bg-blue-50 rounded-xl text-sm text-blue-800 italic"><strong>Dica:</strong> ${g.dica}</div></div>
        </div>
    `).join('');

    document.getElementById('main-view')?.classList.add('hidden');
    document.getElementById('detail-view')?.classList.add('hidden');
    document.getElementById('general-norms-view')?.classList.add('hidden');
    document.getElementById('guide-view')?.classList.remove('hidden');
    window.scrollTo(0, 0);
};

// ==============================================
// DOWNLOAD DE TEMPLATE
// ==============================================
window.downloadTemplate = async function(path, btn) {
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> Preparando...`;

    try {
        const response = await fetch(path, { method: 'HEAD' });
        if (!response.ok) throw new Error('Arquivo não encontrado');

        const link = document.createElement('a');
        link.href = path;
        link.download = path.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Download iniciado!', 'success');
    } catch (err) {
        console.error(err);
        showToast('Falha ao baixar o template. Tente novamente mais tarde.', 'error');
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }, 800);
    }
};

// ==============================================
// INICIALIZAÇÃO
// ==============================================
async function init() {
    console.log("Iniciando SubmetNEV...");

    loadFavorites(); // Carregar favoritos do localStorage

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            window.state.searchTerm = e.target.value;
            renderRevistas();
        });
    }

    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            localStorage.removeItem(window.CONFIG.CACHE_KEY);
            location.reload();
        });
    }

    await loadData();

    if (window.router && window.router.init) {
        window.router.init();
    }
}

document.addEventListener('DOMContentLoaded', init);