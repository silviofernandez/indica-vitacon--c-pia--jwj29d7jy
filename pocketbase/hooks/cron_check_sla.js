cronAdd('cron-check-sla', '*/5 * * * *', () => {
  try {
    const nowIso = new Date().toISOString().replace('T', ' ')
    // PocketBase filter: status = 'sent' e sla_deadline < now() e sem equipe encaminhada e sla_breached != true
    // Obs: status = 'sent' e status = 'pending' (como o usuário citou "status = 'pending'", cobrimos ambos: status = 'sent' || status = 'pending')
    const filter =
      '(status = "sent" || status = "pending") && sla_deadline != "" && sla_deadline < "' +
      nowIso +
      '" && (assigned_team_id = "" || assigned_team_id = null) && (sla_breached = false || sla_breached = null)'

    const referrals = $app.findRecordsByFilter('referrals', filter, 'sla_deadline', 100, 0)

    if (!referrals || referrals.length === 0) {
      return
    }

    console.log(
      '[cron-check-sla] Encontradas ' + referrals.length + ' indicações com SLA estourado.',
    )

    let updatedCount = 0
    for (let i = 0; i < referrals.length; i++) {
      const ref = referrals[i]
      try {
        ref.set('sla_breached', true)
        $app.save(ref)
        updatedCount++
      } catch (saveErr) {
        console.log('[cron-check-sla] Erro ao salvar indicação ' + ref.id + ':', saveErr)
      }
    }

    console.log('[cron-check-sla] Concluído. Registros marcados com sla_breached: ' + updatedCount)
  } catch (err) {
    console.log('[cron-check-sla] Erro no job cron-check-sla:', err)
  }
})
