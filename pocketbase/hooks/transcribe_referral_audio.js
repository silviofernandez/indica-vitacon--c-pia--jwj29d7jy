routerAdd(
  'POST',
  '/backend/v1/transcribe-referral-audio',
  (e) => {
    // 1. Validação de autenticação
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login para continuar.' })
    }

    // 2. Extrair arquivo de áudio enviado via multipart/form-data
    // Campo esperado: 'audio' ou 'file'
    let files = e.findUploadedFiles('audio')
    if (!files || files.length === 0) {
      files = e.findUploadedFiles('file')
    }

    if (!files || files.length === 0) {
      return e.json(400, {
        error: 'Nenhum arquivo de áudio foi enviado. Grave ou selecione um áudio para transcrever.',
      })
    }

    const audioFile = files[0]
    if (!audioFile || audioFile.size === 0) {
      return e.json(400, {
        error: 'O arquivo de áudio está vazio. Tente gravar novamente.',
      })
    }

    // 3. Obter credenciais do gateway de IA
    let gatewayUrl = $os.getenv('SKIP_AI_GATEWAY_URL') || ''
    const gatewayKey = $os.getenv('SKIP_AI_GATEWAY_API_KEY') || ''

    if (!gatewayUrl || !gatewayKey) {
      console.log('Aviso: SKIP_AI_GATEWAY_URL ou SKIP_AI_GATEWAY_API_KEY não configurados.')
      return e.json(503, {
        error:
          'Serviço de transcrição temporariamente indisponível. Por favor, preencha os dados manualmente.',
      })
    }

    // Normaliza URL do gateway
    if (gatewayUrl.endsWith('/')) {
      gatewayUrl = gatewayUrl.slice(0, -1)
    }

    // Endpoint de transcrição compatível com OpenAI Whisper: /v1/audio/transcriptions
    const transcriptionsEndpoint = gatewayUrl + '/v1/audio/transcriptions'

    // 4. Montar FormData para o gateway Whisper
    const outFormData = new FormData()
    outFormData.append('file', audioFile)
    outFormData.append('model', 'whisper-1')
    outFormData.append('language', 'pt')

    let transcribedText = ''
    try {
      const res = $http.send({
        url: transcriptionsEndpoint,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + gatewayKey,
        },
        body: outFormData,
        timeout: 60,
      })

      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.log(
          'Erro ao chamar gateway de transcrição:',
          res.statusCode,
          res.body || JSON.stringify(res.json),
        )
        return e.json(502, {
          error:
            'Não foi possível transcrever o áudio no momento. Você pode preencher os campos manualmente.',
          details: res.json?.error?.message || res.body,
        })
      }

      if (res.json && res.json.text) {
        transcribedText = String(res.json.text).trim()
      } else if (typeof res.body === 'string') {
        try {
          const parsed = JSON.parse(res.body)
          transcribedText = String(parsed.text || '').trim()
        } catch (_) {
          transcribedText = res.body.trim()
        }
      }
    } catch (httpErr) {
      console.log('Exceção ao enviar áudio ao gateway:', httpErr)
      return e.json(502, {
        error:
          'Falha na comunicação com o serviço de áudio. Você pode preencher os campos manualmente.',
      })
    }

    if (!transcribedText) {
      return e.json(200, {
        text: '',
        name: '',
        phone: '',
        message: 'Nenhum texto identificado no áudio.',
      })
    }

    // 5. Heurísticas e Regex para extrair Nome e Telefone sem IA interpretativa (V0)
    let extractedPhone = ''
    let extractedName = ''

    // --- Extração de Telefone ---
    // Procura por sequências numéricas que somem 10 ou 11 dígitos, como:
    // (11) 98765-4321, 11987654321, 98765-4321, etc.
    const phoneRegex = /(?:\+?55\s*)?(?:\(?([1-9]{2})\)?\s*)?(?:9\s*)?(\d{4,5})[-.\s]?(\d{4})/g
    const phoneMatch = phoneRegex.exec(transcribedText)
    if (phoneMatch) {
      const rawCandidate = phoneMatch[0].replace(/\D/g, '')
      // Se tiver 10 ou 11 dígitos
      if (rawCandidate.length === 11) {
        extractedPhone =
          '(' +
          rawCandidate.slice(0, 2) +
          ') ' +
          rawCandidate.slice(2, 7) +
          '-' +
          rawCandidate.slice(7, 11)
      } else if (rawCandidate.length === 10) {
        extractedPhone =
          '(' +
          rawCandidate.slice(0, 2) +
          ') ' +
          rawCandidate.slice(2, 6) +
          '-' +
          rawCandidate.slice(6, 10)
      } else if (rawCandidate.length === 12 || rawCandidate.length === 13) {
        // Possui DDI 55
        const without55 = rawCandidate.startsWith('55') ? rawCandidate.slice(2) : rawCandidate
        if (without55.length === 11) {
          extractedPhone =
            '(' +
            without55.slice(0, 2) +
            ') ' +
            without55.slice(2, 7) +
            '-' +
            without55.slice(7, 11)
        }
      }
    }

    // --- Extração de Nome ---
    // Heurística 1: Padrões comuns como:
    // "o nome dele é Carlos Eduardo", "nome é Carlos", "cliente é a Maria Santos", "me chamo João Silva"
    const namePatterns = [
      /(?:o\s+nome\s+d(?:ele|ela)\s+é|o\s+nome\s+é|nome\s+é|se\s+chama|chama-se|cliente\s+é\s+(?:o|a)?|me\s+chamo|falar\s+com|indico\s+(?:o|a)?)\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+){0,3})/i,
    ]

    for (let i = 0; i < namePatterns.length; i++) {
      const match = transcribedText.match(namePatterns[i])
      if (match && match[1]) {
        extractedName = match[1].trim()
        break
      }
    }

    // Heurística 2: Se não pegou por gatilho, busca a primeira sequência de 2 a 3 palavras capitalizadas que não sejam o início trivial da frase
    if (!extractedName) {
      // Remove pontuações e quebras
      const words = transcribedText.split(/\s+/)
      const ignoreWords = [
        'Olá',
        'Oi',
        'Bom',
        'Boa',
        'Tarde',
        'Noite',
        'Dia',
        'Gabriel',
        'Indica',
        'Tudo',
        'Quero',
        'Tenho',
        'Gostaria',
      ]
      let candidateWords = []
      for (let j = 0; j < words.length; j++) {
        const w = words[j].replace(/[^A-Za-zÀ-ÿ]/g, '')
        if (
          w.length > 2 &&
          w[0] === w[0].toUpperCase() &&
          w.slice(1) === w.slice(1).toLowerCase()
        ) {
          if (!ignoreWords.includes(w)) {
            candidateWords.push(w)
            if (candidateWords.length === 2) {
              extractedName = candidateWords.join(' ')
              break
            }
          }
        } else {
          candidateWords = []
        }
      }
    }

    return e.json(200, {
      text: transcribedText,
      name: extractedName,
      phone: extractedPhone,
    })
  },
  $apis.requireAuth(),
)
