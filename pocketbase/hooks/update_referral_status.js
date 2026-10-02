routerAdd(
  'POST',
  '/backend/v1/update-referral-status',
  (e) => {
    // 1. Validação de autenticação
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login para continuar.' })
    }

    // 2. Determinar papel (role) do usuário autenticado (manager, master, operator)
    let userRole = ''
    let userTeamId = ''
    try {
      const userProfile = $app.findFirstRecordByData('profiles', 'user_id', authRecord.id)
      if (userProfile) {
        userRole = String(userProfile.get('role') || '').trim()
        userTeamId = String(userProfile.get('team_id') || '').trim()
      }
    } catch (_) {}

    if (!userRole && authRecord.email === 'gabsilvio@gmail.com') {
      userRole = 'master'
    }

    // Apenas manager, master (e operator para flexibilidade operacional) podem atualizar status
    if (userRole !== 'master' && userRole !== 'manager' && userRole !== 'operator') {
      return e.json(403, {
        error: 'Apenas gestores ou administradores podem alterar o status das indicações.',
      })
    }

    // 3. Obter payload
    const body = e.requestInfo().body || {}
    const referralId = String(body.referral_id || body.id || '').trim()
    const newStatus = String(body.status || body.new_status || '')
      .trim()
      .toLowerCase()
    const notes = String(body.notes || body.observacoes || '').trim()
    const rawDealValue = body.deal_value !== undefined ? body.deal_value : body.expected_value

    if (!referralId) {
      return e.json(400, { error: 'Identificador da indicação (referral_id) é obrigatório.' })
    }

    if (!newStatus) {
      return e.json(400, { error: 'Novo status é obrigatório.' })
    }

    // 4. Validar status permitido
    const allowedStatuses = [
      'sent',
      'in_analysis',
      'in_progress',
      'visited',
      'negotiating',
      'closed_won',
      'closed_lost',
      'paid',
      'bonus_paid',
      'cancelled',
      'expired',
    ]

    if (!allowedStatuses.includes(newStatus)) {
      return e.json(400, {
        error: 'Status inválido. Use um dos status permitidos: ' + allowedStatuses.join(', '),
      })
    }

    // 5. Buscar a indicação
    let referralRecord = null
    try {
      referralRecord = $app.findFirstRecordByData('referrals', 'id', referralId)
    } catch (err) {
      return e.json(404, { error: 'Indicação não encontrada.' })
    }

    // 6. Verificar se o gestor tem permissão sobre esta indicação:
    if (userRole === 'manager') {
      const assignedManager = String(
        referralRecord.get('assigned_manager_id') || referralRecord.get('assigned_to') || '',
      )
      const assignedTeam = String(referralRecord.get('assigned_team_id') || '')

      const isDirectlyAssigned = assignedManager === authRecord.id
      const isTeamAssigned = userTeamId && assignedTeam && assignedTeam === userTeamId

      if (!isDirectlyAssigned && !isTeamAssigned) {
        return e.json(403, {
          error:
            'Acesso negado. Você só pode gerenciar indicações atribuídas diretamente a você ou à sua equipe.',
        })
      }
    }

    const oldStatus = String(referralRecord.get('status') || 'sent')

    // Se foi passado deal_value no fechamento ou atualização, atualiza
    if (rawDealValue !== undefined && rawDealValue !== null && rawDealValue !== '') {
      const parsedVal = Number(rawDealValue)
      if (!isNaN(parsedVal) && parsedVal >= 0) {
        referralRecord.set('deal_value', parsedVal)
      }
    }

    // 7. Atualizar a indicação
    try {
      referralRecord.set('status', newStatus)
      if (notes) {
        const currentNotes = String(referralRecord.get('notes') || '').trim()
        const updatedNotes = currentNotes ? currentNotes + '\n' + notes : notes
        referralRecord.set('notes', updatedNotes)
      }
      $app.save(referralRecord)
    } catch (saveErr) {
      console.log('Erro ao atualizar status da indicação:', saveErr)
      return e.json(500, {
        error: 'Erro ao atualizar status: ' + (saveErr.message || String(saveErr)),
      })
    }

    // 8. Gravar registro no histórico de status (referral_status_history)
    let historyRecord = null
    try {
      const historyCol = $app.findCollectionByNameOrId('referral_status_history')
      historyRecord = new Record(historyCol)
      historyRecord.set('referral_id', referralRecord.id)
      historyRecord.set('old_status', oldStatus)
      historyRecord.set('new_status', newStatus)
      historyRecord.set('changed_by', authRecord.id)
      historyRecord.set('notes', notes || 'Atualização de status')
      $app.save(historyRecord)
    } catch (hErr) {
      console.log('Aviso ao registrar histórico de status:', hErr)
    }

    // 9. Se o status virou closed_won (ou se já era e foi requisitado recálculo), disparar cálculo de bônus
    let createdBonuses = []
    if (newStatus === 'closed_won') {
      try {
        // Carrega configurações de bônus de bonus_settings
        let buyerPercent = 0.5
        let vitaconPercent = 1.0
        let rentalFixedAmount = 200.0

        try {
          const buyerRec = $app.findFirstRecordByData('bonus_settings', 'key', 'buyer_percent')
          if (buyerRec) buyerPercent = Number(buyerRec.get('value')) || 0.5
        } catch (_) {}

        try {
          const vitaconRec = $app.findFirstRecordByData('bonus_settings', 'key', 'vitacon_percent')
          if (vitaconRec) vitaconPercent = Number(vitaconRec.get('value')) || 1.0
        } catch (_) {}

        try {
          const rentalRec = $app.findFirstRecordByData(
            'bonus_settings',
            'key',
            'rental_fixed_amount',
          )
          if (rentalRec) rentalFixedAmount = Number(rentalRec.get('value')) || 200.0
        } catch (_) {}

        // Verificar idempotência: se já existem bônus criados para esta indicação, não duplica
        const existingBonuses = $app.findRecordsByFilter(
          'bonuses',
          'referral_id = "' + referralRecord.id + '"',
          '-created',
          50,
          0,
        )

        if (existingBonuses.length === 0) {
          const bonusesCol = $app.findCollectionByNameOrId('bonuses')
          const indicatorId = referralRecord.getString('indicator_id')
          const rawPropertyType = String(referralRecord.get('property_type') || '')
            .toLowerCase()
            .trim()
          const dealValue =
            Number(referralRecord.get('deal_value')) ||
            Number(referralRecord.get('expected_value')) ||
            0

          // Regras conforme especificação:
          // 1) Comprador (buyer): 0,5% para indicator + 0,5% para referred
          // 2) Imóvel para alugar (rental): rental_fixed_amount (fixo)
          // 3) Imóvel para vender (sale): 5% dos 6% de comissão = 0,3% do valor do imóvel (0.05 * 0.06 * dealValue)
          // 4) Vitacon SP: 1% do valor do imóvel (vitacon_percent), is_vitacon=true, sem bônus ao indicado (só indicator)
          if (rawPropertyType === 'vitacon' || rawPropertyType.includes('vitacon')) {
            const vitaconAmount = Math.round(((dealValue * vitaconPercent) / 100) * 100) / 100
            const b = new Record(bonusesCol)
            b.set('referral_id', referralRecord.id)
            b.set('indicator_id', indicatorId)
            b.set('bonus_type', 'vitacon_percent')
            b.set('amount', vitaconAmount)
            b.set('status', 'pending')
            b.set('payment_status', 'pending')
            b.set('is_vitacon', true)
            b.set('recipient_type', 'indicator')
            b.set('deal_value', dealValue)
            $app.save(b)
            createdBonuses.push({
              id: b.id,
              recipient: 'indicator',
              type: 'vitacon_percent',
              amount: vitaconAmount,
            })
          } else if (
            rawPropertyType === 'rental' ||
            rawPropertyType.includes('alug') ||
            rawPropertyType.includes('loca')
          ) {
            const b = new Record(bonusesCol)
            b.set('referral_id', referralRecord.id)
            b.set('indicator_id', indicatorId)
            b.set('bonus_type', 'rental_fixed')
            b.set('amount', rentalFixedAmount)
            b.set('status', 'pending')
            b.set('payment_status', 'pending')
            b.set('is_vitacon', false)
            b.set('recipient_type', 'indicator')
            b.set('deal_value', dealValue)
            $app.save(b)
            createdBonuses.push({
              id: b.id,
              recipient: 'indicator',
              type: 'rental_fixed',
              amount: rentalFixedAmount,
            })
          } else if (rawPropertyType === 'buyer' || rawPropertyType.includes('compra')) {
            const buyerAmount = Math.round(((dealValue * buyerPercent) / 100) * 100) / 100
            // 1) Bônus para o indicator (0,5%)
            const bInd = new Record(bonusesCol)
            bInd.set('referral_id', referralRecord.id)
            bInd.set('indicator_id', indicatorId)
            bInd.set('bonus_type', 'buyer_percent')
            bInd.set('amount', buyerAmount)
            bInd.set('status', 'pending')
            bInd.set('payment_status', 'pending')
            bInd.set('is_vitacon', false)
            bInd.set('recipient_type', 'indicator')
            bInd.set('deal_value', dealValue)
            $app.save(bInd)
            createdBonuses.push({
              id: bInd.id,
              recipient: 'indicator',
              type: 'buyer_percent',
              amount: buyerAmount,
            })

            // 2) Bônus para o referred (indicado - 0,5%)
            const bRef = new Record(bonusesCol)
            bRef.set('referral_id', referralRecord.id)
            bRef.set('indicator_id', indicatorId)
            bRef.set('bonus_type', 'buyer_percent')
            bRef.set('amount', buyerAmount)
            bRef.set('status', 'pending')
            bRef.set('payment_status', 'pending')
            bRef.set('is_vitacon', false)
            bRef.set('recipient_type', 'referred')
            bRef.set('deal_value', dealValue)
            $app.save(bRef)
            createdBonuses.push({
              id: bRef.id,
              recipient: 'referred',
              type: 'buyer_percent',
              amount: buyerAmount,
            })
          } else {
            // Imóvel para vender (sale): 5% dos 6% de comissão = 0,3% do valor do imóvel
            const saleCommissionAmount = Math.round(dealValue * 0.06 * 0.05 * 100) / 100
            const b = new Record(bonusesCol)
            b.set('referral_id', referralRecord.id)
            b.set('indicator_id', indicatorId)
            b.set('bonus_type', 'sale_percent')
            b.set('amount', saleCommissionAmount)
            b.set('status', 'pending')
            b.set('payment_status', 'pending')
            b.set('is_vitacon', false)
            b.set('recipient_type', 'indicator')
            b.set('deal_value', dealValue)
            $app.save(b)
            createdBonuses.push({
              id: b.id,
              recipient: 'indicator',
              type: 'sale_percent',
              amount: saleCommissionAmount,
            })
          }
        }
      } catch (bonusErr) {
        console.log('Erro ao calcular bônus ao concluir indicação:', bonusErr)
      }
    }

    // 10. Disparo de notificação 'status_changed' ao indicador dono (best-effort)
    try {
      const indicatorId = referralRecord.getString('indicator_id')
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
        const clientName = String(referralRecord.get('client_name') || 'Indicação').trim()

        // E-mail ao indicador
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
                referral_id: referralRecord.id,
                payload: {
                  name: indicatorName,
                  client_name: clientName,
                  old_status: oldStatus,
                  new_status: newStatus,
                  notes: notes,
                  related_id: referralRecord.id,
                },
              }),
              timeout: 5,
            })
          } catch (mErr) {
            console.log('Aviso ao disparar e-mail status_changed:', mErr)
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
                event_type: 'status_changed',
                recipient: indicatorPhone,
                user_id: indicatorUserId,
                indicator_id: indicatorId,
                referral_id: referralRecord.id,
                payload: {
                  name: indicatorName,
                  client_name: clientName,
                  old_status: oldStatus,
                  new_status: newStatus,
                  notes: notes,
                  related_id: referralRecord.id,
                },
              }),
              timeout: 5,
            })
          } catch (wErr) {
            console.log('Aviso ao disparar WhatsApp status_changed:', wErr)
          }
        }
      }
    } catch (notifErr) {
      console.log('Aviso geral na notificação status_changed:', notifErr)
    }

    return e.json(200, {
      success: true,
      message: 'Status atualizado com sucesso!',
      referral_id: referralRecord.id,
      old_status: oldStatus,
      new_status: newStatus,
      notes: notes,
      history_id: historyRecord ? historyRecord.id : null,
      created_bonuses: createdBonuses,
    })
  },
  $apis.requireAuth(),
)
