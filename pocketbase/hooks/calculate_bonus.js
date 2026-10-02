routerAdd(
  'POST',
  '/backend/v1/calculate-bonus',
  (e) => {
    // 1. Validação de autenticação
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login para continuar.' })
    }

    // 2. Determinar papel (role) do usuário autenticado
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

    if (userRole !== 'master' && userRole !== 'manager' && userRole !== 'operator') {
      return e.json(403, {
        error: 'Apenas gestores ou administradores podem executar o cálculo de bonificações.',
      })
    }

    // 3. Obter referral_id do payload
    const body = e.requestInfo().body || {}
    const referralId = String(body.referral_id || body.id || '').trim()
    const rawDealValue = body.deal_value !== undefined ? body.deal_value : body.expected_value
    const forceRecalculate = Boolean(body.force_recalculate)

    if (!referralId) {
      return e.json(400, { error: 'O identificador da indicação (referral_id) é obrigatório.' })
    }

    // 4. Buscar a indicação
    let referralRecord = null
    try {
      referralRecord = $app.findFirstRecordByData('referrals', 'id', referralId)
    } catch (err) {
      return e.json(404, { error: 'Indicação não encontrada.' })
    }

    // Se informado deal_value no payload, atualiza na indicação
    if (rawDealValue !== undefined && rawDealValue !== null && rawDealValue !== '') {
      const parsedVal = Number(rawDealValue)
      if (!isNaN(parsedVal) && parsedVal >= 0) {
        referralRecord.set('deal_value', parsedVal)
        try {
          $app.save(referralRecord)
        } catch (_) {}
      }
    }

    // 5. Verificar idempotência
    const existingBonuses = $app.findRecordsByFilter(
      'bonuses',
      'referral_id = "' + referralRecord.id + '"',
      '-created',
      50,
      0,
    )

    if (existingBonuses.length > 0 && !forceRecalculate) {
      return e.json(200, {
        success: true,
        message: 'Bônus já foram calculados para esta indicação.',
        already_calculated: true,
        bonuses_count: existingBonuses.length,
      })
    }

    // Se forceRecalculate for true, remove bônus pendentes anteriores não pagos
    if (existingBonuses.length > 0 && forceRecalculate) {
      for (let i = 0; i < existingBonuses.length; i++) {
        const b = existingBonuses[i]
        const st = String(b.get('status') || '').toLowerCase()
        if (st !== 'paid') {
          try {
            $app.delete(b)
          } catch (_) {}
        }
      }
    }

    // 6. Carregar configurações de bônus
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
      const rentalRec = $app.findFirstRecordByData('bonus_settings', 'key', 'rental_fixed_amount')
      if (rentalRec) rentalFixedAmount = Number(rentalRec.get('value')) || 200.0
    } catch (_) {}

    const bonusesCol = $app.findCollectionByNameOrId('bonuses')
    const indicatorId = referralRecord.getString('indicator_id')
    const rawPropertyType = String(referralRecord.get('property_type') || '')
      .toLowerCase()
      .trim()
    const dealValue =
      Number(referralRecord.get('deal_value')) || Number(referralRecord.get('expected_value')) || 0

    let createdBonuses = []

    // 7. Cálculo por tipo:
    if (rawPropertyType === 'vitacon' || rawPropertyType.includes('vitacon')) {
      // Vitacon SP: 1% do valor do imóvel (vitacon_percent), is_vitacon=true, sem bônus ao indicado (só indicator)
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
      // Imóvel para alugar: valor fixo (rental_fixed_amount)
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
      // Comprador: 0,5% para indicator + 0,5% para referred
      const buyerAmount = Math.round(((dealValue * buyerPercent) / 100) * 100) / 100

      // Bônus 1: indicator
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

      // Bônus 2: referred (o indicado)
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
      // Imóvel para vender: 5% dos 6% de comissão = 0,3% do valor do imóvel
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

    return e.json(200, {
      success: true,
      message: 'Bonificações calculadas e registradas com sucesso!',
      referral_id: referralRecord.id,
      property_type: rawPropertyType,
      deal_value: dealValue,
      created_bonuses: createdBonuses,
    })
  },
  $apis.requireAuth(),
)
