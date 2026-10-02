routerAdd('POST', '/backend/v1/send-notification', (e) => {
  const body = e.requestInfo().body || {}

  const channel = String(body.channel || 'email')
    .trim()
    .toLowerCase()
  const eventType = String(body.event_type || '').trim()
  const rawRecipient = String(body.recipient || body.to || body.email || body.phone || '').trim()
  let userId = String(body.user_id || '').trim()
  let referralId = String(body.referral_id || '').trim()
  let indicatorId = String(body.indicator_id || '').trim()
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}

  if (!eventType) {
    return e.json(400, { error: 'O parâmetro event_type é obrigatório.' })
  }

  const allowedEvents = [
    'registration_received',
    'approved_credentials',
    'status_changed',
    'bonus_paid',
    'monthly_payment_reminder',
  ]
  if (!allowedEvents.includes(eventType)) {
    return e.json(400, {
      error: 'event_type inválido. Permitidos: ' + allowedEvents.join(', '),
    })
  }

  if (channel !== 'email' && channel !== 'whatsapp') {
    return e.json(400, { error: 'Canal inválido. Permitidos: email, whatsapp.' })
  }

  // Tenta resolver dados faltantes do usuário/indicador se fornecido user_id ou indicator_id
  let targetEmail = channel === 'email' ? rawRecipient : ''
  let targetPhone = channel === 'whatsapp' ? rawRecipient : ''
  let recipientName = String(
    payload.name || payload.indicator_name || payload.full_name || '',
  ).trim()

  if (userId && (!targetEmail || !recipientName)) {
    try {
      const u = $app.findFirstRecordByData('users', 'id', userId)
      if (u) {
        if (!targetEmail) targetEmail = u.getString('email')
        if (!recipientName) recipientName = u.getString('name')
      }
    } catch (_) {}
  }

  if (userId && (!targetPhone || !indicatorId || !recipientName)) {
    try {
      const ind = $app.findFirstRecordByData('indicators', 'user_id', userId)
      if (ind) {
        if (!indicatorId) indicatorId = ind.id
        if (!targetPhone) targetPhone = ind.getString('phone')
        if (!recipientName) recipientName = ind.getString('full_name')
        if (!targetEmail) targetEmail = ind.getString('email')
      }
    } catch (_) {}
  }

  if (indicatorId && (!targetEmail || !targetPhone || !recipientName || !userId)) {
    try {
      const ind = $app.findFirstRecordByData('indicators', 'id', indicatorId)
      if (ind) {
        if (!userId) userId = ind.getString('user_id')
        if (!targetPhone) targetPhone = ind.getString('phone')
        if (!targetEmail) targetEmail = ind.getString('email')
        if (!recipientName) recipientName = ind.getString('full_name')
      }
    } catch (_) {}
  }

  const finalRecipient = channel === 'email' ? targetEmail : targetPhone
  if (!finalRecipient) {
    return e.json(400, {
      error: 'Destinatário não informado para o canal ' + channel + '.',
    })
  }

  const relatedId = referralId || indicatorId || String(payload.related_id || '')

  // 1. VERIFICAÇÃO DE IDEMPOTÊNCIA:
  // Se já existe registro com mesmo destinatário, event_type, channel (e related_id se presente) com status 'sent'
  try {
    let filter =
      'channel = "' + channel + '" && event_type = "' + eventType + '" && status = "sent"'
    if (finalRecipient) {
      filter += ' && recipient = "' + finalRecipient.replace(/"/g, '\\"') + '"'
    }
    if (relatedId) {
      filter += ' && related_id = "' + relatedId + '"'
    }

    const existing = $app.findRecordsByFilter('notifications_log', filter, '-created', 1, 0)
    if (existing && existing.length > 0) {
      const rec = existing[0]
      return e.json(200, {
        success: true,
        idempotent: true,
        message: 'Notificação já enviada anteriormente (idempotente).',
        log_id: rec.id,
        status: 'sent',
        channel: channel,
        event_type: eventType,
      })
    }
  } catch (checkErr) {
    console.log('Aviso ao verificar idempotência em notifications_log:', checkErr)
  }

  // 2. GERAÇÃO DE TEMPLATE EM PORTUGUÊS (SEM JARGÃO)
  let subject = ''
  let htmlContent = ''
  let textContent = ''

  const safeName = recipientName || 'Parceiro(a)'
  const appUrl = $os.getenv('SITE_URL') || 'https://indica-gabriel.goskip.app'

  if (eventType === 'registration_received') {
    subject = 'Cadastro recebido com sucesso! | Indica Gabriel'
    textContent =
      'Olá, ' +
      safeName +
      '!\n\n' +
      'Recebemos o seu cadastro como indicador parceiro no Indica Gabriel.\n\n' +
      'Nossa equipe está analisando os seus dados e, assim que for aprovado, você receberá um e-mail com as suas credenciais temporárias de acesso ao painel.\n\n' +
      'Agradecemos a sua parceria e confiança!\n\n' +
      'Equipe Indica Gabriel'

    htmlContent =
      '<div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">' +
      '<h2 style="color:#0f172a;margin-top:0;">Cadastro recebido!</h2>' +
      '<p>Olá, <strong>' +
      safeName +
      '</strong>,</p>' +
      '<p>Recebemos o seu cadastro de indicador parceiro com sucesso.</p>' +
      '<p>Nossa equipe já está analisando as suas informações. Assim que sua conta for aprovada, você receberá um e-mail com as suas credenciais para acessar o painel e começar a indicar.</p>' +
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />' +
      '<p style="font-size:12px;color:#64748b;margin:0;">Equipe Indica Gabriel • Este é um e-mail automático.</p>' +
      '</div>'
  } else if (eventType === 'approved_credentials') {
    const loginEmail = String(payload.login || payload.email || targetEmail || '').trim()
    const tempPass = String(payload.temp_password || payload.password || '').trim()

    subject = 'Seu acesso foi aprovado! Credenciais do Indica Gabriel'
    textContent =
      'Olá, ' +
      safeName +
      '!\n\n' +
      'Temos uma ótima notícia: o seu cadastro no Indica Gabriel foi aprovado!\n\n' +
      'Aqui estão os seus dados de acesso:\n' +
      '• Link de login: ' +
      appUrl +
      '/login\n' +
      '• E-mail: ' +
      loginEmail +
      '\n' +
      '• Senha temporária: ' +
      tempPass +
      '\n\n' +
      'Importante: por motivos de segurança, você deverá cadastrar uma nova senha logo no primeiro acesso.\n\n' +
      'Seja muito bem-vindo(a) à nossa rede de parceiros!\n\n' +
      'Equipe Indica Gabriel'

    htmlContent =
      '<div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">' +
      '<h2 style="color:#16a34a;margin-top:0;">Conta aprovada com sucesso! 🎉</h2>' +
      '<p>Olá, <strong>' +
      safeName +
      '</strong>,</p>' +
      '<p>Seu cadastro como indicador parceiro foi revisado e aprovado. Agora você já pode acessar o sistema e cadastrar suas indicações.</p>' +
      '<div style="background:#f8fafc;padding:16px;border-radius:6px;border-left:4px solid #16a34a;margin:20px 0;">' +
      '<p style="margin:0 0 8px 0;"><strong>Seus dados de acesso:</strong></p>' +
      '<p style="margin:4px 0;"><strong>E-mail:</strong> ' +
      loginEmail +
      '</p>' +
      '<p style="margin:4px 0;"><strong>Senha temporária:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:14px;">' +
      tempPass +
      '</code></p>' +
      '</div>' +
      '<p><em>Aviso: por segurança, o sistema solicitará a troca da senha temporária logo no seu primeiro login.</em></p>' +
      '<div style="margin:24px 0;">' +
      '<a href="' +
      appUrl +
      '/login" style="background:#16a34a;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Acessar o Painel</a>' +
      '</div>' +
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />' +
      '<p style="font-size:12px;color:#64748b;margin:0;">Equipe Indica Gabriel</p>' +
      '</div>'
  } else if (eventType === 'status_changed') {
    const rawStatus = String(payload.new_status || payload.status || '').trim()
    const clientName = String(payload.client_name || 'sua indicação').trim()

    let friendlyStatus = rawStatus
    if (rawStatus === 'sent') friendlyStatus = 'Enviada'
    else if (rawStatus === 'in_analysis') friendlyStatus = 'Em análise'
    else if (rawStatus === 'in_progress') friendlyStatus = 'Em andamento'
    else if (rawStatus === 'visited') friendlyStatus = 'Visita realizada'
    else if (rawStatus === 'negotiating') friendlyStatus = 'Em negociação'
    else if (rawStatus === 'closed_won') friendlyStatus = 'Negócio fechado'
    else if (rawStatus === 'closed_lost') friendlyStatus = 'Não concretizado'
    else if (rawStatus === 'paid') friendlyStatus = 'Comissão paga'
    else if (rawStatus === 'bonus_paid') friendlyStatus = 'Bônus pago'
    else if (rawStatus === 'cancelled') friendlyStatus = 'Cancelada'
    else if (rawStatus === 'expired') friendlyStatus = 'Expirada'

    subject = 'Atualização na sua indicação: ' + friendlyStatus + ' | Indica Gabriel'
    textContent =
      'Olá, ' +
      safeName +
      '!\n\n' +
      'A sua indicação de ' +
      clientName +
      ' teve uma atualização de status.\n\n' +
      'Novo status: ' +
      friendlyStatus +
      '\n' +
      (payload.notes ? 'Observações: ' + payload.notes + '\n\n' : '\n') +
      'Acompanhe o andamento completo em seu painel: ' +
      appUrl +
      '/indicador\n\n' +
      'Equipe Indica Gabriel'

    htmlContent =
      '<div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">' +
      '<h2 style="color:#0f172a;margin-top:0;">Status atualizado da indicação</h2>' +
      '<p>Olá, <strong>' +
      safeName +
      '</strong>,</p>' +
      '<p>A sua indicação de <strong>' +
      clientName +
      '</strong> teve uma mudança de andamento:</p>' +
      '<div style="background:#f1f5f9;padding:16px;border-radius:6px;margin:16px 0;">' +
      '<p style="margin:0;font-size:16px;">Novo status: <strong style="color:#0284c7;">' +
      friendlyStatus +
      '</strong></p>' +
      (payload.notes
        ? '<p style="margin:8px 0 0 0;color:#475569;font-size:14px;"><em>' +
          payload.notes +
          '</em></p>'
        : '') +
      '</div>' +
      '<p>Você pode acompanhar todos os detalhes e o histórico no painel do parceiro:</p>' +
      '<div style="margin:20px 0;">' +
      '<a href="' +
      appUrl +
      '/indicador" style="background:#0284c7;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Ver Indicação</a>' +
      '</div>' +
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />' +
      '<p style="font-size:12px;color:#64748b;margin:0;">Equipe Indica Gabriel</p>' +
      '</div>'
  } else if (eventType === 'monthly_payment_reminder') {
    const rawTotalAmount = Number(payload.total_amount || 0)
    const formattedTotal =
      rawTotalAmount > 0
        ? 'R$ ' +
          rawTotalAmount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : payload.total_amount_text || 'R$ 0,00'
    const totalBonuses = Number(payload.total_bonuses || payload.bonuses_count || 0)
    const totalIndicators = Number(payload.total_indicators || payload.indicators_count || 0)
    const monthRef = String(payload.month_reference || payload.related_id || '').trim()

    subject = 'Lembrete financeiro: Bonificações a pagar amanhã (Dia 10) | Indica Gabriel'
    textContent =
      'Olá, ' +
      safeName +
      '!\n\n' +
      'Este é um lembrete automático do sistema Indica Gabriel sobre os pagamentos de bonificações programados para o dia 10' +
      (monthRef ? ' (' + monthRef + ')' : '') +
      '.\n\n' +
      'Resumo das bonificações pendentes:\n' +
      '• Valor total pendente: ' +
      formattedTotal +
      '\n' +
      '• Quantidade de bonificações: ' +
      totalBonuses +
      '\n' +
      '• Indicadores envolvidos: ' +
      totalIndicators +
      '\n\n' +
      'Acesse o módulo financeiro para conferir as chaves PIX e realizar os pagamentos:\n' +
      appUrl +
      '/admin/financeiro\n\n' +
      'Equipe Indica Gabriel'

    htmlContent =
      '<div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">' +
      '<h2 style="color:#0f2a43;margin-top:0;">Lembrete de Pagamento de Bonificações 📅</h2>' +
      '<p>Olá, <strong>' +
      safeName +
      '</strong>,</p>' +
      '<p>Lembramos que amanhã, <strong>dia 10</strong>' +
      (monthRef ? ' (' + monthRef + ')' : '') +
      ', é a data prevista para liquidação das bonificações pendentes aos parceiros do Indica Gabriel.</p>' +
      '<div style="background:#f8fafc;border:1px solid #cbd5e1;padding:16px;border-radius:6px;margin:20px 0;">' +
      '<p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;font-weight:600;">Total pendente a pagar:</p>' +
      '<p style="margin:4px 0 12px 0;font-size:26px;font-weight:bold;color:#0f2a43;">' +
      formattedTotal +
      '</p>' +
      '<div style="border-top:1px solid #e2e8f0;padding-top:10px;font-size:14px;color:#334155;">' +
      '<p style="margin:4px 0;">• Bonificações aguardando pagamento: <strong>' +
      totalBonuses +
      '</strong></p>' +
      '<p style="margin:4px 0;">• Indicadores/parceiros a receber: <strong>' +
      totalIndicators +
      '</strong></p>' +
      '</div>' +
      '</div>' +
      '<p>Confira a listagem detalhada e as chaves PIX cadastradas no painel administrativo:</p>' +
      '<div style="margin:20px 0;">' +
      '<a href="' +
      appUrl +
      '/admin/financeiro" style="background:#0f2a43;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Acessar Financeiro</a>' +
      '</div>' +
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />' +
      '<p style="font-size:12px;color:#64748b;margin:0;">Equipe Indica Gabriel • Notificação automática do sistema</p>' +
      '</div>'
  } else if (eventType === 'bonus_paid') {
    const rawAmount = Number(payload.amount || payload.bonus_amount || 0)
    const formattedAmount =
      rawAmount > 0
        ? 'R$ ' +
          rawAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : payload.amount_text || 'R$ 0,00'
    const clientName = String(payload.client_name || '').trim()

    subject = 'Bônus pago! Seu PIX de ' + formattedAmount + ' foi realizado 💸'
    textContent =
      'Olá, ' +
      safeName +
      '!\n\n' +
      'Seu bônus de indicação foi pago com sucesso via PIX!\n\n' +
      '• Valor do bônus: ' +
      formattedAmount +
      '\n' +
      (clientName ? '• Indicação correspondente: ' + clientName + '\n' : '') +
      (payload.pix_key_used ? '• Chave PIX: ' + payload.pix_key_used + '\n' : '') +
      '\nO comprovante já foi processado pelo setor financeiro. Muito obrigado pela sua parceria!\n\n' +
      'Equipe Indica Gabriel'

    htmlContent =
      '<div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">' +
      '<h2 style="color:#16a34a;margin-top:0;">Bônus pago com sucesso via PIX! 💸</h2>' +
      '<p>Olá, <strong>' +
      safeName +
      '</strong>,</p>' +
      '<p>Excelente notícia! A sua bonificação de indicação foi transferida com sucesso pelo nosso setor financeiro.</p>' +
      '<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:6px;margin:16px 0;">' +
      '<p style="margin:0;font-size:14px;color:#166534;">Valor do bônus pago:</p>' +
      '<p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#15803d;">' +
      formattedAmount +
      '</p>' +
      (clientName
        ? '<p style="margin:8px 0 0 0;font-size:14px;color:#374151;">Indicação: <strong>' +
          clientName +
          '</strong></p>'
        : '') +
      (payload.pix_key_used
        ? '<p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;">Chave PIX creditada: ' +
          payload.pix_key_used +
          '</p>'
        : '') +
      '</div>' +
      '<p>Continue indicando e aumentando os seus ganhos!</p>' +
      '<div style="margin:20px 0;">' +
      '<a href="' +
      appUrl +
      '/indicador" style="background:#16a34a;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Acessar Meu Painel</a>' +
      '</div>' +
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />' +
      '<p style="font-size:12px;color:#64748b;margin:0;">Equipe Indica Gabriel</p>' +
      '</div>'
  }

  // 3. ENVIO CONFORME CANAL
  let finalStatus = 'skipped'
  let errorMessage = ''
  let responseData = null

  if (channel === 'email') {
    const resendApiKey = $os.getenv('RESEND_API_KEY')
    const resendFromEmail =
      $os.getenv('RESEND_FROM_EMAIL') || 'Indica Gabriel <onboarding@resend.dev>'

    if (!resendApiKey) {
      finalStatus = 'skipped'
      errorMessage = 'RESEND_API_KEY não configurada nos segredos do sistema.'
      console.log('Aviso send-notification: e-mail pulado porque RESEND_API_KEY não está presente.')
    } else {
      try {
        const resendRes = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + resendApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [finalRecipient],
            subject: subject,
            text: textContent,
            html: htmlContent,
          }),
          timeout: 15,
        })

        if (resendRes.statusCode >= 200 && resendRes.statusCode < 300) {
          finalStatus = 'sent'
          responseData = resendRes.json
        } else {
          finalStatus = 'failed'
          errorMessage = 'Erro HTTP Resend (' + resendRes.statusCode + '): ' + (resendRes.raw || '')
          console.log('Erro ao enviar e-mail via Resend:', errorMessage)
        }
      } catch (httpErr) {
        finalStatus = 'failed'
        errorMessage = 'Falha de conexão com Resend: ' + (httpErr.message || String(httpErr))
        console.log('Exceção ao chamar Resend:', errorMessage)
      }
    }
  } else if (channel === 'whatsapp') {
    let evolutionUrl = $os.getenv('EVOLUTION_API_URL')
    const evolutionApiKey = $os.getenv('EVOLUTION_API_KEY')
    const evolutionInstance = $os.getenv('EVOLUTION_INSTANCE')

    if (!evolutionUrl || !evolutionApiKey || !evolutionInstance) {
      finalStatus = 'skipped'
      errorMessage =
        'Credenciais Evolution API ausentes (EVOLUTION_API_URL, EVOLUTION_API_KEY ou EVOLUTION_INSTANCE).'
      console.log(
        'Aviso send-notification: WhatsApp pulado por ausência de credenciais Evolution API.',
      )
    } else {
      if (evolutionUrl.endsWith('/')) {
        evolutionUrl = evolutionUrl.slice(0, -1)
      }

      // Sanitizar telefone apenas dígitos (adiciona DDI 55 se tiver 10 ou 11 dígitos)
      let phoneDigits = finalRecipient.replace(/\D/g, '')
      if (
        (phoneDigits.length === 10 || phoneDigits.length === 11) &&
        !phoneDigits.startsWith('55')
      ) {
        phoneDigits = '55' + phoneDigits
      }

      try {
        const evoRes = $http.send({
          url: evolutionUrl + '/message/sendText/' + encodeURIComponent(evolutionInstance),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: evolutionApiKey,
          },
          body: JSON.stringify({
            number: phoneDigits,
            text: textContent,
            delay: 1200,
          }),
          timeout: 15,
        })

        if (evoRes.statusCode >= 200 && evoRes.statusCode < 300) {
          finalStatus = 'sent'
          responseData = evoRes.json
        } else {
          finalStatus = 'failed'
          errorMessage =
            'Erro HTTP Evolution API (' + evoRes.statusCode + '): ' + (evoRes.raw || '')
          console.log('Erro ao enviar WhatsApp via Evolution:', errorMessage)
        }
      } catch (evoErr) {
        finalStatus = 'failed'
        errorMessage = 'Falha de conexão com Evolution API: ' + (evoErr.message || String(evoErr))
        console.log('Exceção ao chamar Evolution API:', errorMessage)
      }
    }
  }

  // 4. GRAVAÇÃO EM notifications_log (AUDITORIA E IDEMPOTÊNCIA)
  let logRecordId = null
  try {
    const notifCol = $app.findCollectionByNameOrId('notifications_log')
    const logRec = new Record(notifCol)

    if (userId) logRec.set('user_id', userId)
    if (referralId) logRec.set('referral_id', referralId)
    if (indicatorId) logRec.set('indicator_id', indicatorId)

    logRec.set('type', eventType)
    logRec.set('event_type', eventType)
    logRec.set('channel', channel)
    logRec.set('title', subject || 'Notificação ' + eventType)
    logRec.set('message', textContent)
    logRec.set('status', finalStatus)
    logRec.set('recipient', finalRecipient)
    logRec.set('related_id', relatedId)
    logRec.set('read', false)

    if (errorMessage) {
      logRec.set('error_message', errorMessage.slice(0, 500))
    }

    try {
      logRec.set('payload_json', payload)
    } catch (_) {}

    $app.save(logRec)
    logRecordId = logRec.id
  } catch (dbErr) {
    console.log('Erro ao salvar registro em notifications_log:', dbErr)
  }

  return e.json(200, {
    success: finalStatus === 'sent' || finalStatus === 'skipped',
    status: finalStatus,
    channel: channel,
    event_type: eventType,
    recipient: finalRecipient,
    log_id: logRecordId,
    reason: errorMessage || null,
    provider_response: responseData,
  })
})
