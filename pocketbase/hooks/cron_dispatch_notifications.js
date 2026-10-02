cronAdd('cron-dispatch-notifications', '* * * * *', () => {
  try {
    const filter = 'notified = false || notified = null'
    const histories = $app.findRecordsByFilter('referral_status_history', filter, 'created', 50, 0)

    if (!histories || histories.length === 0) {
      return
    }

    console.log(
      '[cron-dispatch-notifications] Processando ' +
        histories.length +
        ' histórico(s) pendente(s) de notificação.',
    )

    const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'

    for (let i = 0; i < histories.length; i++) {
      const hist = histories[i]

      try {
        const referralId = hist.getString('referral_id')
        const newStatus = hist.getString('new_status')
        const oldStatus = hist.getString('old_status')
        const notes = hist.getString('notes')

        let referralRecord = null
        if (referralId) {
          try {
            referralRecord = $app.findFirstRecordByData('referrals', 'id', referralId)
          } catch (_) {}
        }

        if (referralRecord) {
          const indicatorId = referralRecord.getString('indicator_id')
          const clientName = referralRecord.getString('client_name') || 'Indicação'

          let indicatorRecord = null
          if (indicatorId) {
            try {
              indicatorRecord = $app.findFirstRecordByData('indicators', 'id', indicatorId)
            } catch (_) {}
          }

          if (indicatorRecord) {
            const indicatorEmail = indicatorRecord.getString('email')
            const indicatorPhone = indicatorRecord.getString('phone')
            const indicatorName = indicatorRecord.getString('full_name')
            const indicatorUserId = indicatorRecord.getString('user_id')

            // Rótulo leigo do status (mesmos rótulos usados no app)
            let friendlyStatusLabel = newStatus
            const s = (newStatus || '').toLowerCase().trim()
            if (s === 'sent') friendlyStatusLabel = 'Aguardando análise'
            else if (s === 'in_analysis' || s === 'in_progress')
              friendlyStatusLabel = 'Em andamento'
            else if (s === 'visited') friendlyStatusLabel = 'Visita agendada'
            else if (s === 'negotiating') friendlyStatusLabel = 'Em negociação'
            else if (s === 'closed_won' || s === 'closed')
              friendlyStatusLabel = 'Concluída com sucesso'
            else if (s === 'paid' || s === 'bonus_paid') friendlyStatusLabel = 'Bonificação paga'
            else if (s === 'closed_lost' || s === 'cancelled') friendlyStatusLabel = 'Cancelada'
            else if (s === 'expired') friendlyStatusLabel = 'Expirada'

            // Envia e-mail se houver endereço
            if (indicatorEmail) {
              try {
                $http.send({
                  url: pbUrl + '/backend/v1/send-notification',
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    channel: 'email',
                    event_type: 'status_changed',
                    recipient: indicatorEmail,
                    user_id: indicatorUserId,
                    indicator_id: indicatorId,
                    referral_id: referralId,
                    payload: {
                      name: indicatorName,
                      client_name: clientName,
                      old_status: oldStatus,
                      new_status: newStatus,
                      friendly_status: friendlyStatusLabel,
                      status: friendlyStatusLabel,
                      notes: notes,
                      related_id: hist.id,
                    },
                  }),
                  timeout: 10,
                })
              } catch (sendEmailErr) {
                console.log(
                  '[cron-dispatch-notifications] Erro ao disparar e-mail hist ' + hist.id + ':',
                  sendEmailErr,
                )
              }
            }

            // Envia WhatsApp se houver telefone
            if (indicatorPhone) {
              try {
                $http.send({
                  url: pbUrl + '/backend/v1/send-notification',
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    channel: 'whatsapp',
                    event_type: 'status_changed',
                    recipient: indicatorPhone,
                    user_id: indicatorUserId,
                    indicator_id: indicatorId,
                    referral_id: referralId,
                    payload: {
                      name: indicatorName,
                      client_name: clientName,
                      old_status: oldStatus,
                      new_status: newStatus,
                      friendly_status: friendlyStatusLabel,
                      status: friendlyStatusLabel,
                      notes: notes,
                      related_id: hist.id,
                    },
                  }),
                  timeout: 10,
                })
              } catch (sendWaErr) {
                console.log(
                  '[cron-dispatch-notifications] Erro ao disparar WhatsApp hist ' + hist.id + ':',
                  sendWaErr,
                )
              }
            }
          }
        }
      } catch (procErr) {
        console.log(
          '[cron-dispatch-notifications] Erro ao processar histórico ' + hist.id + ':',
          procErr,
        )
      } finally {
        // Marca SEMPRE notified = true (mesmo em caso de falha/pulo, para não reprocessar infinitamente)
        try {
          hist.set('notified', true)
          $app.save(hist)
        } catch (saveHistErr) {
          console.log(
            '[cron-dispatch-notifications] Erro ao atualizar notified em ' + hist.id + ':',
            saveHistErr,
          )
        }
      }
    }
  } catch (err) {
    console.log('[cron-dispatch-notifications] Erro no job:', err)
  }
})
