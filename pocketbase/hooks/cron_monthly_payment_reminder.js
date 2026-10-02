cronAdd('cron-monthly-payment-reminder', '0 9 9 * *', () => {
  try {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const monthKey = year + '-' + month

    console.log('[cron-monthly-payment-reminder] Executando lembrete para a referência ' + monthKey)

    // 1. Buscar todas as bonificações com payment_status = 'pending'
    const pendingBonuses = $app.findRecordsByFilter(
      'bonuses',
      'payment_status = "pending"',
      '-created',
      500,
      0,
    )

    let totalAmount = 0
    const indicatorIdSet = {}
    for (let i = 0; i < pendingBonuses.length; i++) {
      const b = pendingBonuses[i]
      totalAmount += Number(b.get('amount')) || 0
      const indId = b.getString('indicator_id')
      if (indId) {
        indicatorIdSet[indId] = true
      }
    }

    const totalBonusesCount = pendingBonuses.length
    const totalIndicatorsCount = Object.keys(indicatorIdSet).length

    console.log(
      '[cron-monthly-payment-reminder] Pendências: ' +
        totalBonusesCount +
        ' bonificações, ' +
        totalIndicatorsCount +
        ' indicadores, total R$ ' +
        totalAmount,
    )

    // 2. Buscar usuários com perfil 'master'
    const masterProfiles = $app.findRecordsByFilter('profiles', 'role = "master"', 'created', 50, 0)

    if (!masterProfiles || masterProfiles.length === 0) {
      console.log('[cron-monthly-payment-reminder] Nenhum usuário com perfil master encontrado.')
      return
    }

    const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'

    for (let i = 0; i < masterProfiles.length; i++) {
      const masterProf = masterProfiles[i]
      const masterUserId = masterProf.getString('user_id')
      let masterEmail = masterProf.getString('email')
      const masterName = masterProf.getString('name') || 'Administrador'

      if (!masterEmail && masterUserId) {
        try {
          const u = $app.findFirstRecordByData('users', 'id', masterUserId)
          if (u) {
            masterEmail = u.getString('email')
          }
        } catch (_) {}
      }

      if (!masterEmail) {
        continue
      }

      // Idempotência adicional: verifica se já notificou este destinatário para este mês
      try {
        const alreadyNotified = $app.findRecordsByFilter(
          'notifications_log',
          'channel = "email" && event_type = "monthly_payment_reminder" && related_id = "' +
            monthKey +
            '" && recipient = "' +
            masterEmail.replace(/"/g, '\\"') +
            '"',
          '-created',
          1,
          0,
        )

        if (alreadyNotified && alreadyNotified.length > 0) {
          console.log(
            '[cron-monthly-payment-reminder] E-mail já enviado para ' +
              masterEmail +
              ' no mês ' +
              monthKey +
              ' (pulando).',
          )
          continue
        }
      } catch (checkErr) {
        console.log('[cron-monthly-payment-reminder] Erro ao checar envio anterior:', checkErr)
      }

      // 3. Disparar notificação via rota /backend/v1/send-notification
      try {
        $http.send({
          url: pbUrl + '/backend/v1/send-notification',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'email',
            event_type: 'monthly_payment_reminder',
            recipient: masterEmail,
            user_id: masterUserId,
            payload: {
              name: masterName,
              total_amount: totalAmount,
              total_bonuses: totalBonusesCount,
              total_indicators: totalIndicatorsCount,
              month_reference: monthKey,
              related_id: monthKey,
            },
          }),
          timeout: 15,
        })
        console.log(
          '[cron-monthly-payment-reminder] Lembrete disparado com sucesso para ' + masterEmail,
        )
      } catch (sendErr) {
        console.log(
          '[cron-monthly-payment-reminder] Erro ao disparar lembrete para ' + masterEmail + ':',
          sendErr,
        )
      }
    }
  } catch (err) {
    console.log('[cron-monthly-payment-reminder] Erro geral no cron:', err)
  }
})
