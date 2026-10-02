routerAdd('POST', '/backend/v1/submit-indicator-registration', (e) => {
  const body = e.requestInfo().body || {}
  const fullName = String(body.full_name || body.name || '').trim()
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const phone = String(body.phone || '').trim()
  const cpfRaw = String(body.cpf || body.cpf_cnpj || '').trim()
  const address = String(body.address || '').trim()
  const rg = String(body.rg || '').trim()

  if (!fullName) {
    return e.json(400, { error: 'O nome completo é obrigatório.' })
  }

  if (!email || !email.includes('@')) {
    return e.json(400, { error: 'Por favor, informe um endereço de e-mail válido.' })
  }

  // Sanitização e validação de CPF
  const cpfDigits = cpfRaw.replace(/\D/g, '')
  if (cpfDigits.length !== 11) {
    return e.json(400, { error: 'O CPF deve conter exatamente 11 dígitos.' })
  }

  // Rejeita sequências repetidas conhecidas
  let allEqual = true
  for (let i = 1; i < 11; i++) {
    if (cpfDigits[i] !== cpfDigits[0]) {
      allEqual = false
      break
    }
  }
  if (allEqual) {
    return e.json(400, { error: 'CPF inválido. Por favor, verifique os dígitos digitados.' })
  }

  // Validação dos dígitos verificadores
  let sum1 = 0
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(cpfDigits[i], 10) * (10 - i)
  }
  let remainder1 = (sum1 * 10) % 11
  if (remainder1 === 10 || remainder1 === 11) remainder1 = 0
  if (remainder1 !== parseInt(cpfDigits[9], 10)) {
    return e.json(400, { error: 'CPF inválido. Dígito verificador incorreto.' })
  }

  let sum2 = 0
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(cpfDigits[i], 10) * (11 - i)
  }
  let remainder2 = (sum2 * 10) % 11
  if (remainder2 === 10 || remainder2 === 11) remainder2 = 0
  if (remainder2 !== parseInt(cpfDigits[10], 10)) {
    return e.json(400, { error: 'CPF inválido. Dígito verificador incorreto.' })
  }

  // Verifica unicidade de e-mail em indicators
  try {
    const existingByEmail = $app.findFirstRecordByData('indicators', 'email', email)
    if (existingByEmail) {
      return e.json(400, {
        error:
          'Já existe um cadastro de indicador com este e-mail. Caso precise, entre em contato com nosso suporte.',
      })
    }
  } catch (_) {
    // Não encontrado — ok
  }

  // Verifica unicidade de CPF em indicators (busca por dígito ou formatação)
  try {
    const existingIndicators = $app.findRecordsByFilter('indicators', '', '', 500, 0)
    for (let i = 0; i < existingIndicators.length; i++) {
      const rec = existingIndicators[i]
      const recCpf = String(rec.get('cpf_cnpj') || '').replace(/\D/g, '')
      if (recCpf === cpfDigits) {
        return e.json(400, {
          error: 'Já existe um indicador cadastrado com este CPF.',
        })
      }
    }
  } catch (err) {
    console.log('Aviso ao consultar indicadores por CPF:', err)
  }

  // Também verifica se já existe usuário com este e-mail na coleção users
  try {
    const existingUser = $app.findAuthRecordByEmail('users', email)
    if (existingUser) {
      return e.json(400, {
        error: 'Este e-mail já possui uma conta ativa no sistema.',
      })
    }
  } catch (_) {
    // Não existe — ok
  }

  // Formata o CPF para exibição padrão XXX.XXX.XXX-XX
  const formattedCpf =
    cpfDigits.slice(0, 3) +
    '.' +
    cpfDigits.slice(3, 6) +
    '.' +
    cpfDigits.slice(6, 9) +
    '-' +
    cpfDigits.slice(9, 11)

  try {
    const indicatorsCol = $app.findCollectionByNameOrId('indicators')
    const newIndicator = new Record(indicatorsCol)
    newIndicator.set('full_name', fullName)
    newIndicator.set('email', email)
    newIndicator.set('phone', phone)
    newIndicator.set('cpf_cnpj', formattedCpf)
    newIndicator.set('address', address)
    newIndicator.set('rg', rg)
    newIndicator.set('approval_status', 'pending')
    newIndicator.set('approved', false)
    $app.save(newIndicator)

    // Disparo de notificação 'registration_received' (best-effort)
    try {
      const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
      // 1. E-mail de confirmação de cadastro
      try {
        $http.send({
          url: pbUrl + '/backend/v1/send-notification',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'email',
            event_type: 'registration_received',
            recipient: email,
            indicator_id: newIndicator.id,
            payload: {
              name: fullName,
              email: email,
              phone: phone,
            },
          }),
          timeout: 5,
        })
      } catch (mailErr) {
        console.log('Aviso ao disparar e-mail registration_received:', mailErr)
      }

      // 2. WhatsApp opcional se houver telefone
      if (phone) {
        try {
          $http.send({
            url: pbUrl + '/backend/v1/send-notification',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: 'whatsapp',
              event_type: 'registration_received',
              recipient: phone,
              indicator_id: newIndicator.id,
              payload: {
                name: fullName,
                email: email,
                phone: phone,
              },
            }),
            timeout: 5,
          })
        } catch (waErr) {
          console.log('Aviso ao disparar WhatsApp registration_received:', waErr)
        }
      }
    } catch (notifErr) {
      console.log('Aviso geral na notificação registration_received:', notifErr)
    }

    return e.json(201, {
      success: true,
      id: newIndicator.id,
      message:
        'Cadastro recebido com sucesso! Nossa equipe analisará os seus dados e você receberá as instruções de acesso.',
    })
  } catch (saveErr) {
    console.log('Erro ao salvar indicador no endpoint submit-indicator-registration:', saveErr)
    return e.json(500, {
      error: 'Não foi possível salvar o seu cadastro. Por favor, tente novamente em instantes.',
    })
  }
})
