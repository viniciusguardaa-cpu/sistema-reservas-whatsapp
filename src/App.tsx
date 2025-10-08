{
  "name": "Sistema de Reservas WhatsApp",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-reservas",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [240, 300],
      "id": "webhook-whatsapp",
      "name": "Webhook WhatsApp",
      "webhookId": "fb32cc20-2b95-43de-8c32-826eebeed1b3"
    },
    {
      "parameters": {
        "jsCode": "const data = $input.first().json;\n\n// Extrai informações do WhatsApp (Evolution API)\nconst sender = data.data?.key?.remoteJid || data.key?.remoteJid || data.from;\nconst message = data.data?.message?.conversation || data.message?.conversation || data.data?.message?.extendedTextMessage?.text || '';\nconst instance = data.instance || 'default';\n\n// Limpa o número (remove @s.whatsapp.net)\nconst cleanNumber = sender ? sender.replace('@s.whatsapp.net', '') : '';\n\nconsole.log('📱 Mensagem recebida de:', cleanNumber);\nconsole.log('💬 Conteúdo:', message);\n\nreturn {\n  json: {\n    sender: cleanNumber,\n    message: message,\n    instance: instance,\n    originalData: data\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300],
      "id": "code-extractor",
      "name": "Extrair Dados WhatsApp"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "value": "gpt-4o-mini",
          "mode": "list",
          "cachedResultName": "gpt-4o-mini"
        },
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1.2,
      "position": [900, 80],
      "id": "openai-model",
      "name": "OpenAI Chat Model",
      "credentials": {
        "openAiApi": {
          "id": "XZGXJgx3MppHPnBU",
          "name": "OpenAi account"
        }
      }
    },
    {
      "parameters": {
        "options": {
          "systemMessage": "Você é o assistente virtual do sistema de reservas de restaurante.\n\n**INSTRUÇÕES IMPORTANTES:**\n\n1. **Para CRIAR reserva**, colete TODAS estas informações:\n   - Nome completo do cliente\n   - Data da reserva (formato: YYYY-MM-DD, exemplo: 2025-10-15)\n   - Horário (opções: 18:00, 19:00, 20:00, 21:00, 22:00)\n   - Número de pessoas\n   - Telefone para contato\n   - Email do cliente\n\n2. **Seja conversacional e amigável:**\n   - Cumprimente o cliente\n   - Faça UMA pergunta por vez\n   - Confirme os dados antes de criar\n   - Use emojis quando apropriado 😊\n\n3. **Sempre use as ferramentas:**\n   - Use 'webhook_app' quando tiver TODOS os dados para criar reserva\n   - Use 'enviar_whatsapp' para TODA resposta ao cliente\n\n4. **Após criar a reserva:**\n   - Confirme o número de mesas reservadas\n   - Resuma os detalhes\n   - Pergunte se precisa de mais algo\n\n**Horários disponíveis:** 18:00, 19:00, 20:00, 21:00, 22:00\n**Sistema:** 2 pessoas por mesa\n\nSeja sempre educado, prestativo e eficiente! 🍽️"
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 2.2,
      "position": [680, 300],
      "id": "ai-agent",
      "name": "Agente de Reservas"
    },
    {
      "parameters": {
        "contextWindowLength": 10,
        "sessionIdType": "customKey",
        "sessionKey": "={{ $('Extrair Dados WhatsApp').item.json.sender }}"
      },
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1.3,
      "position": [900, 200],
      "id": "memory-buffer",
      "name": "Memória por Usuário"
    },
    {
      "parameters": {
        "toolDescription": "Use esta ferramenta para ENVIAR dados para o APP de reservas.\n\n⚠️ IMPORTANTE: Esta ferramenta cria a reserva no sistema!\n\nParâmetros obrigatórios:\n- acao: sempre use 'criar_reserva'\n- dados: objeto com:\n  - nome: nome completo\n  - telefone: telefone do cliente\n  - email: email do cliente\n  - data: formato YYYY-MM-DD (ex: 2025-10-15)\n  - horario: um dos horários (18:00, 19:00, 20:00, 21:00, 22:00)\n  - pessoas: número de pessoas\n\nExemplo correto:\n{\n  \"acao\": \"criar_reserva\",\n  \"dados\": {\n    \"nome\": \"João Silva\",\n    \"telefone\": \"11999887766\",\n    \"email\": \"joao@email.com\",\n    \"data\": \"2025-10-15\",\n    \"horario\": \"19:00\",\n    \"pessoas\": 4\n  }\n}\n\n🎯 ATENÇÃO: \n- A data DEVE estar no formato YYYY-MM-DD\n- O horário DEVE ser um dos 5 disponíveis\n- Certifique-se de ter TODOS os dados antes de chamar esta ferramenta!",
        "method": "POST",
        "url": "https://sistema-reservas-whatsapp.vercel.app",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json) }}",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
      "typeVersion": 1.1,
      "position": [900, 320],
      "id": "tool-webhook-app",
      "name": "Webhook para App Reservas"
    },
    {
      "parameters": {
        "toolDescription": "SEMPRE use esta ferramenta para ENVIAR sua resposta ao cliente no WhatsApp.\n\nParâmetro obrigatório:\n- text: sua mensagem de resposta (string)\n\nEsta é a ÚNICA forma de se comunicar com o cliente!\n\nExemplos:\n- { \"text\": \"Olá! Para fazer sua reserva, preciso de algumas informações. Qual seu nome completo?\" }\n- { \"text\": \"Perfeito! E qual a data da reserva? (exemplo: 15/10/2025)\" }\n- { \"text\": \"✅ Reserva confirmada para João Silva, dia 15/10 às 19:00, 4 pessoas!\" }",
        "method": "POST",
        "url": "=https://evolution-evolution-api.wahmhv.easypanel.host/message/sendText/{{ $('Extrair Dados WhatsApp').item.json.instance }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "429683C4C977415CAAFCCE10F7D57E11"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"number\": \"{{ $('Extrair Dados WhatsApp').item.json.sender }}\",\n  \"text\": \"{{ $json.text }}\"\n}",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
      "typeVersion": 1.1,
      "position": [900, 440],
      "id": "tool-enviar-whatsapp",
      "name": "Ferramenta: Enviar WhatsApp"
    }
  ],
  "connections": {
    "Webhook WhatsApp": {
      "main": [
        [
          {
            "node": "Extrair Dados WhatsApp",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extrair Dados WhatsApp": {
      "main": [
        [
          {
            "node": "Agente de Reservas",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "Agente de Reservas",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "Memória por Usuário": {
      "ai_memory": [
        [
          {
            "node": "Agente de Reservas",
            "type": "ai_memory",
            "index": 0
          }
        ]
      ]
    },
    "Webhook para App Reservas": {
      "ai_tool": [
        [
          {
            "node": "Agente de Reservas",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Ferramenta: Enviar WhatsApp": {
      "ai_tool": [
        [
          {
            "node": "Agente de Reservas",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "v2-simplificado",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a1f4d829479b47b40944bfc5c615426e7f8449646495cf9dc56481d0d001464e"
  },
  "id": "VNi3IbANVouYf2aD",
  "tags": []
}
