routerAdd(
  'POST',
  '/backend/v1/create-referral',
  (e) => {
    // 1. Validação de autenticação
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login para continuar.' })
    }

    const body = e.requestInfo().body || {}
    const clientName = String(body.client_name || body.name || '').trim()
    const clientContact = String(
      body.client_contact || body.client_phone || body.phone || '',
    ).trim()
    const rawPropertyType = String(body.property_type || '')
      .trim()
      .toLowerCase()
    const details = String(body.details || body.property_description || body.notes || '').trim()
    const rawTranscription = String(body.raw_transcription || '').trim()

    // 2. Validações mínimas de campos
    if (!clientName) {
      return e.json(400, { error: 'O nome da pessoa indicada é obrigatório.' })
    }

    if (!clientContact) {
      return e.json(400, {
        error: 'O contato (telefone/WhatsApp) da pessoa indicada é obrigatório.',
      })
    }

    // Mapeamento flexível dos tipos solicitados:
    // "comprador" / "compra" / "sale" -> 'sale'
    // "imóvel para alugar" / "aluguel" / "locacao" / "rental" -> 'rental'
    // "imóvel para vender" / "venda" -> 'sale'
    // "vitacon" / "vitacon sp" -> 'vitacon'
    let mappedPropertyType = ''
    if (rawPropertyType === 'vitacon' || rawPropertyType.includes('vitacon')) {
      mappedPropertyType = 'vitacon'
    } else if (
      rawPropertyType === 'rental' ||
      rawPropertyType.includes('alug') ||
      rawPropertyType.includes('loca')
    ) {
      mappedPropertyType = 'rental'
    } else if (
      rawPropertyType === 'sale' ||
      rawPropertyType.includes('vend') ||
      rawPropertyType.includes('comp')
    ) {
      mappedPropertyType = 'sale'
    } else {
      // Fallback padrão se não fornecido
      mappedPropertyType = 'sale'
    }

    // 3. Localizar indicator correspondente ao usuário logado
    // Indicador pode estar em indicators por user_id ou por profile_id
    let indicatorRecord = null
    try {
      indicatorRecord = $app.findFirstRecordByData('indicators', 'user_id', authRecord.id)
    } catch (_) {}

    if (!indicatorRecord) {
      try {
        const userProfile = $app.findFirstRecordByData('profiles', 'user_id', authRecord.id)
        if (userProfile) {
          indicatorRecord = $app.findFirstRecordByData('indicators', 'profile_id', userProfile.id)
        }
      } catch (_) {}
    }

    // Se o usuário autenticado for Master/Operator ou não tiver indicator ainda registrado,
    // cria um registro em indicators para vincular a indicação
    if (!indicatorRecord) {
      try {
        const indicatorsCol = $app.findCollectionByNameOrId('indicators')
        indicatorRecord = new Record(indicatorsCol)
        indicatorRecord.set('user_id', authRecord.id)
        indicatorRecord.set('full_name', String(authRecord.get('name') || authRecord.email).trim())
        indicatorRecord.set('email', authRecord.email)
        indicatorRecord.set('approved', true)
        indicatorRecord.set('approval_status', 'approved')
        $app.save(indicatorRecord)
      } catch (indErr) {
        console.log('Aviso ao criar registro de indicator para o usuário:', indErr)
        return e.json(500, {
          error: 'Não foi possível associar a indicação ao seu perfil de indicador.',
        })
      }
    }

    // 4. Calcular SLA = now() + 3 horas
    const now = new Date()
    const slaDeadlineDate = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    // Formato ISO compatível com PocketBase datetime: "YYYY-MM-DD HH:mm:ss.000Z" ou ISO string
    const slaDeadlineStr = slaDeadlineDate.toISOString()

    // 5. Gravar na coleção referrals
    // Status inicial: 'sent' (o valor inicial padrão dos 6 status existentes no schema)
    const initialStatus = 'sent'

    let newReferral = null
    try {
      const referralsCol = $app.findCollectionByNameOrId('referrals')
      newReferral = new Record(referralsCol)
      newReferral.set('indicator_id', indicatorRecord.id)
      newReferral.set('client_name', clientName)
      newReferral.set('client_phone', clientContact)
      newReferral.set('property_type', mappedPropertyType)
      newReferral.set('property_description', details)
      newReferral.set('notes', details)
      newReferral.set('raw_transcription', rawTranscription)
      newReferral.set('sla_deadline', slaDeadlineStr)
      newReferral.set('status', initialStatus)

      $app.save(newReferral)
    } catch (saveErr) {
      console.log('Erro ao salvar indicação em referrals:', saveErr)
      return e.json(500, {
        error: 'Não foi possível registrar a indicação: ' + (saveErr.message || String(saveErr)),
      })
    }

    // 6. Gravar automaticamente histórico de status em referral_status_history
    try {
      const historyCol = $app.findCollectionByNameOrId('referral_status_history')
      const historyRecord = new Record(historyCol)
      historyRecord.set('referral_id', newReferral.id)
      historyRecord.set('old_status', '')
      historyRecord.set('new_status', initialStatus)
      historyRecord.set('changed_by', authRecord.id)
      historyRecord.set('notes', 'Indicação criada')
      $app.save(historyRecord)
    } catch (histErr) {
      console.log('Aviso ao registrar histórico de status inicial:', histErr)
    }

    return e.json(201, {
      success: true,
      id: newReferral.id,
      client_name: clientName,
      client_contact: clientContact,
      property_type: mappedPropertyType,
      status: initialStatus,
      sla_deadline: slaDeadlineStr,
      sla_hours: 3,
      message: 'Indicação enviada com sucesso! Nossa equipe entrará em contato em até 3 horas.',
    })
  },
  $apis.requireAuth(),
)
