# Busca inteligente local

A busca em linguagem natural usa o Ollama instalado no computador que executa o backend. O modelo padrão é `qwen3:4b-instruct`; `OLLAMA_MODEL` e `OLLAMA_BASE_URL` podem ser definidos no `server/.env`, mas têm padrões locais. A integração não usa a OpenAI nem precisa de chave de API.

## Preparação

1. Instale e abra o Ollama para Windows.
2. No PowerShell, baixe o modelo uma vez:

   ```powershell
   ollama pull qwen3:4b-instruct
   ```

3. Confirme que o modelo aparece:

   ```powershell
   ollama list
   ```

4. Inicie ou reinicie o backend (`npm run dev` em `server/`).

O backend espera a API local do Ollama em `http://127.0.0.1:11434`. Para usar outro endereço ou modelo, defina `OLLAMA_BASE_URL` e `OLLAMA_MODEL` no `server/.env`. O modelo é mantido carregado por alguns minutos depois de uma busca; a primeira busca pode levar mais tempo enquanto ele carrega.

## Fluxo e dados enviados

O endpoint `POST /api/providers/ai-search` recebe `{ "query": "...", "page": 1, "limit": 12 }`. O backend envia a frase da busca e os nomes públicos das categorias e bairros ao Ollama local. A saída estruturada é validada com Zod; só então a API constrói uma consulta Prisma. O modelo não recebe credenciais nem acesso ao banco e não pode gerar SQL.

Os perfis, contas, mensagens e demais registros não são enviados ao modelo. Como o Ollama é executado localmente, a interpretação ocorre nesta máquina. Em uma implantação remota, o servidor que hospeda o backend também precisa executar o Ollama ou apontar `OLLAMA_BASE_URL` para uma instância acessível.

Se o Ollama estiver desligado, a rota responde `503 AI_SEARCH_UNAVAILABLE`. Se o modelo ainda não foi baixado, a resposta informa o comando `ollama pull` necessário. A busca textual normal do diretório continua independente desta integração.
