routerAdd(
  'POST',
  '/backend/v1/register-bonus-payment',
  (e) => {
    // 1. Validação de autenticação
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login para continuar.' })
    }

    // 2. Determinar papel (role) do usuário autenticado: restrito a master (e operator)
    let userRole = ''
    try {
      const userProfile = $app.findFirstRecordByData('profiles', 'user_id', authRecord.id)
      if (userProfile) {
        userRole = String(userProfile.get('role') || '').trim()
      }
    } catch (_) {}

    if (!userRole && authRecord.email === 'gabsilvio@gmail.com') {
      userRole = 'master'
    }

    if (userRole !== 'master' && userRole !== 'operator') {
      return e.json(403, {
        error:
          'Apenas a administração financeira (master ou operador) pode registrar pagamentos de bônus.',
      })
    }

    // 3. Obter payload
    const body = e.requestInfo().body || {}
    const bonusId = String(body.bonus_id || body.id || '').trim()
    const pixKeyUsed = String(body.pix_key_used || body.pix_key || '').trim()
    const paymentNotes = String(body.payment_notes || body.notes || '').trim()
    const paidAtInput = String(body.paid_at || '').trim()

    if (!bonusId) {
      return e.json(400, { error: 'O identificador do bônus (bonus_id) é obrigatório.' })
    }

    // 4. Buscar o registro de bônus
    let bonusRecord = null
    try {
      bonusRecord = $app.findFirstRecordByData('bonuses', 'id', bonusId)
    } catch (err) {
      return e.json(404, { error: 'Registro de bônus não encontrado.' })
    }

    // Se já foi pago
    const currentStatus = String(bonusRecord.get('status') || '')
    if (currentStatus === 'paid') {
      return e.json(200, {
        success: true,
        message: 'Este bônus já consta como pago.',
        already_paid: true,
        bonus_id: bonusRecord.id,
      })
    }

    // 5. Atualizar o bônus: status = 'paid', payment_status = 'paid', paid_at, pix_key_used, payment_notes
    const nowIso = paidAtInput || new Date().toISOString()
    try {
      bonusRecord.set('status', 'paid')
      bonusRecord.set('payment_status', 'paid')
      bonusRecord.set('paid_at', nowIso)
      if (pixKeyUsed) {
        bonusRecord.set('pix_key_used', pixKeyUsed)
      }
      if (paymentNotes) {
        bonusRecord.set('payment_notes', paymentNotes)
      }
      $app.save(bonusRecord)
    } catch (bErr) {
      console.log('Erro ao atualizar bônus:', bErr)
      return e.json(500, {
        error: 'Erro ao atualizar registro de bônus: ' + (bErr.message || String(bErr)),
      })
    }

    // 6. Atualizar a indicação associada (referrals) para 'bonus_paid'
    const referralId = bonusRecord.getString('referral_id')
    let referralRecord = null
    let oldRefStatus = ''
    if (referralId) {
      try {
        referralRecord = $app.findFirstRecordByData('referrals', 'id', referralId)
        if (referralRecord) {
          oldRefStatus = String(referralRecord.get('status') || '')
          referralRecord.set('status', 'bonus_paid')
          $app.save(referralRecord)

          // Gravar no histórico de status
          try {
            const historyCol = $app.findCollectionByNameOrId('referral_status_history')
            const hist = new Record(historyCol)
            hist.set('referral_id', referralRecord.id)
            hist.set('old_status', oldRefStatus)
            hist.set('new_status', 'bonus_paid')
            hist.set('changed_by', authRecord.id)
            hist.set(
              'notes',
              paymentNotes
                ? 'Bonificação paga: ' + paymentNotes
                : 'Bonificação quitada via PIX (' + (pixKeyUsed || 'chave cadastrada') + ')',
            )
            $app.save(hist)
          } catch (hErr) {
            console.log('Aviso ao gravar histórico de quitação:', hErr)
          }
        }
      } catch (rErr) {
        console.log('Aviso ao atualizar indicação associada ao bônus:', rErr)
      }
    }

    // 7. Disparo de notificação 'bonus_paid' ao indicador (best-effort)
    try {
      const indicatorId = bonusRecord.getString('indicator_id')
      let indicatorEmail = ''
      let indicatorPhone = ''
      let indicatorName = ''
      let indicatorUserId = ''

      if (indicatorId) {
        try {
          const indRec = $app.findFirstRecordByData('indicators', 'id', indicatorId)
          if (indRec) {
            indicatorEmail = String(indRec.get('email') || '').trim()
            indicatorPhone = String(indRec.get('phone') || '').trim()
            indicatorName = String(indRec.get('full_name') || '').trim()
            indicatorUserId = String(indRec.get('user_id') || '').trim()
          }
        } catch (_) {}
      }

      if (indicatorEmail || indicatorPhone) {
        const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
        const clientName = referralRecord
          ? String(referralRecord.get('client_name') || '').trim()
          : ''
        const bonusAmount = Number(bonusRecord.get('amount') || 0)

        // E-mail ao indicador
        if (indicatorEmail) {
          try {
            $http.send({
              url: pbUrl + '/backend/v1/send-notification',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: 'email',
                event_type: 'bonus_paid',
                recipient: indicatorEmail,
                user_id: indicatorUserId,
                indicator_id: indicatorId,
                referral_id: referralId,
                payload: {
                  name: indicatorName,
                  amount: bonusAmount,
                  client_name: clientName,
                  pix_key_used: pixKeyUsed,
                  related_id: bonusRecord.id,
                },
              }),
              timeout: 5,
            })
          } catch (mErr) {
            console.log('Aviso ao disparar e-mail bonus_paid:', mErr)
          }
        }

        // WhatsApp ao indicador se configurado / com telefone
        if (indicatorPhone) {
          try {
            $http.send({
              url: pbUrl + '/backend/v1/send-notification',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: 'whatsapp',
                event_type: 'bonus_paid',
                recipient: indicatorPhone,
                user_id: indicatorUserId,
                indicator_id: indicatorId,
                referral_id: referralId,
                payload: {
                  name: indicatorName,
                  amount: bonusAmount,
                  client_name: clientName,
                  pix_key_used: pixKeyUsed,
                  related_id: bonusRecord.id,
                },
              }),
              timeout: 5,
            })
          } catch (wErr) {
            console.log('Aviso ao disparar WhatsApp bonus_paid:', wErr)
          }
        }
      }
    } catch (notifErr) {
      console.log('Aviso geral na notificação bonus_paid:', notifErr)
    }

    return e.json(200, {
      success: true,
      message: 'Pagamento de bônus registrado com sucesso!',
      bonus_id: bonusRecord.id,
      amount: bonusRecord.get('amount'),
      paid_at: nowIso,
      pix_key_used: pixKeyUsed,
      referral_id: referralId,
      referral_new_status: 'bonus_paid',
    })
  },
  $apis.requireAuth(),
)
