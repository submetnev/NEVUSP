const CACHE_NAME = 'submetnev-v2'; // Versão incrementada para forçar atualização
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/style.css',
  '/imagem/logo_submetnev.png',
  '/imagem/icone_submetnev.png',
  '/imagem/sem_imagem.png'
];

// Arquivos JSON que serão cacheados com stale-while-revalidate
const JSON_PATHS = [
  '/revistas/index.json',
  '/normas_gerais.json',
  '/revistas/'
];

// Verifica se a URL é um JSON de revista
function isRevistaJson(url) {
  return url.pathname.startsWith('/revistas/') && url.pathname.endsWith('.json');
}

// Verifica se é imagem (capas das revistas)
function isImage(url) {
  return /\.(png|jpg|jpeg|webp|svg)$/i.test(url.pathname);
}

// Verifica se é um arquivo JSON dinâmico (índice, normas ou revista específica)
function isDynamicJson(url) {
  return url.pathname === '/revistas/index.json' ||
         url.pathname === '/normas_gerais.json' ||
         isRevistaJson(url);
}

self.addEventListener('install', event => {
  console.log('[SW] Instalando nova versão...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.error('[SW] Erro ao cachear assets:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Ativando nova versão...');
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Reivindicar controle imediato
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorar requisições para outros domínios
  if (url.origin !== location.origin) {
    return;
  }

  // Estratégia stale-while-revalidate para JSONs dinâmicos
  if (isDynamicJson(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Atualizar cache com a nova resposta
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
              // Notificar a página sobre atualização
              notifyClientsAboutUpdate(url.pathname);
            }
            return networkResponse;
          }).catch(err => {
            console.warn('[SW] Falha ao buscar', url.pathname, err);
            // Se não houver cache, retornar erro
            if (!cachedResponse) {
              return new Response(JSON.stringify({ error: 'Conteúdo não disponível offline' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            return cachedResponse;
          });

          // Retornar do cache imediatamente (se existir)
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não houver cache, aguardar a rede
          return fetchPromise;
        });
      })
    );
    return;
  }

  // Estratégia cache-first para imagens (capas das revistas)
  if (isImage(url)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fallback para imagem padrão
          return caches.match('/imagem/sem_imagem.png');
        });
      })
    );
    return;
  }

  // Estratégia cache-first para assets estáticos
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Buscar atualização em segundo plano para HTML e JS
        if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/script.js') {
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
                notifyClientsAboutUpdate('app');
              });
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback offline para páginas principais
        if (url.pathname === '/' || url.pathname === '/index.html') {
          return caches.match('/index.html');
        }
        return new Response('Offline: conteúdo não disponível', { status: 503 });
      });
    })
  );
});

// Função para notificar os clientes (páginas) sobre atualizações
function notifyClientsAboutUpdate(path) {
  clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE',
        path: path,
        timestamp: Date.now()
      });
    });
  });
}

// Ouvir mensagens do client para forçar atualização de cache
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'REFRESH_CACHE') {
    console.log('[SW] Forçando atualização de cache para:', event.data.path);
    if (event.data.path) {
      caches.open(CACHE_NAME).then(cache => {
        fetch(event.data.path).then(response => {
          if (response && response.status === 200) {
            cache.put(event.data.path, response);
          }
        });
      });
    } else {
      // Recarregar todos os JSONs principais
      const urls = ['/revistas/index.json', '/normas_gerais.json'];
      caches.open(CACHE_NAME).then(cache => {
        urls.forEach(url => {
          fetch(url).then(response => {
            if (response && response.status === 200) {
              cache.put(url, response);
            }
          });
        });
      });
    }
  }
});