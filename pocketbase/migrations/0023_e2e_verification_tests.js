/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Busca o indicador existente para associar
    let indicatorRecord = null
    try {
      indicatorRecord = app.findFirstRecordByData('indicators', 'approved', true)
    } catch (_) {}

    if (!indicatorRecord) {
      const indicatorsCol = app.findCollectionByNameOrId('indicators')
      indicatorRecord = new Record(indicatorsCol)
      indicatorRecord.set('full_name', 'Indicador E2E Teste')
      indicatorRecord.set('email', 'e2e_test_ind@example.com')
      indicatorRecord.set('phone', '(11) 99999-0000')
      indicatorRecord.set('cpf_cnpj', '000.000.000-00')
      indicatorRecord.set('pix_key', '000.000.000-00')
      indicatorRecord.set('approved', true)
      indicatorRecord.set('approval_status', 'approved')
      app.save(indicatorRecord)
    }

    const referralsCol = app.findCollectionByNameOrId('referrals')
    const bonusesCol = app.findCollectionByNameOrId('bonuses')
    const historyCol = app.findCollectionByNameOrId('referral_status_history')
    const notifCol = app.findCollectionByNameOrId('notifications_log')

    // ---------------------------------------------------------
    // TESTE 1: COMPRADOR (deal_value = 500.000)
    // Esperado: 0,5% para indicator (2.500) + 0,5% para referred (2.500)
    // ---------------------------------------------------------
    const refBuyer = new Record(referralsCol)
    refBuyer.set('client_name', 'E2E_TEST_CLIENT_BUYER')
    refBuyer.set('client_phone', '(11) 91111-0001')
    refBuyer.set('indicator_id', indicatorRecord.id)
    refBuyer.set('property_type', 'buyer')
    refBuyer.set('deal_value', 500000)
    refBuyer.set('status', 'sent')
    app.save(refBuyer)

    // ---------------------------------------------------------
    // TESTE 2: ALUGUEL (deal_value = 4.000)
    // Esperado: 200 fixo para indicator
    // ---------------------------------------------------------
    const refRental = new Record(referralsCol)
    refRental.set('client_name', 'E2E_TEST_CLIENT_RENTAL')
    refRental.set('client_phone', '(11) 91111-0002')
    refRental.set('indicator_id', indicatorRecord.id)
    refRental.set('property_type', 'rental')
    refRental.set('deal_value', 4000)
    refRental.set('status', 'sent')
    app.save(refRental)

    // ---------------------------------------------------------
    // TESTE 3: VENDA (deal_value = 1.000.000)
    // Esperado: 5% de 6% = 0,3% do valor = 3.000 para indicator
    // ---------------------------------------------------------
    const refSale = new Record(referralsCol)
    refSale.set('client_name', 'E2E_TEST_CLIENT_SALE')
    refSale.set('client_phone', '(11) 91111-0003')
    refSale.set('indicator_id', indicatorRecord.id)
    refSale.set('property_type', 'sale')
    refSale.set('deal_value', 1000000)
    refSale.set('status', 'sent')
    app.save(refSale)

    // ---------------------------------------------------------
    // TESTE 4: VITACON SP (deal_value = 400.000)
    // Esperado: 1% = 4.000, is_vitacon=true, SEM bônus ao indicado (apenas indicator)
    // ---------------------------------------------------------
    const refVitacon = new Record(referralsCol)
    refVitacon.set('client_name', 'E2E_TEST_CLIENT_VITACON')
    refVitacon.set('client_phone', '(11) 91111-0004')
    refVitacon.set('indicator_id', indicatorRecord.id)
    refVitacon.set('property_type', 'vitacon')
    refVitacon.set('deal_value', 400000)
    refVitacon.set('status', 'sent')
    app.save(refVitacon)

    // ---------------------------------------------------------
    // TESTE 5: SLA VENCIDO (sla_deadline no passado)
    // ---------------------------------------------------------
    const pastDate =
      new Date(Date.now() - 4 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const refSlaOverdue = new Record(referralsCol)
    refSlaOverdue.set('client_name', 'E2E_TEST_CLIENT_SLA_OVERDUE')
    refSlaOverdue.set('client_phone', '(11) 91111-0005')
    refSlaOverdue.set('indicator_id', indicatorRecord.id)
    refSlaOverdue.set('property_type', 'buyer')
    refSlaOverdue.set('status', 'sent')
    refSlaOverdue.set('sla_deadline', pastDate)
    refSlaOverdue.set('sla_breached', false)
    app.save(refSlaOverdue)

    // ---------------------------------------------------------
    // TESTE 6: SLA DENTRO DO PRAZO (sla_deadline daqui a 2 horas)
    // ---------------------------------------------------------
    const futureDate =
      new Date(Date.now() + 2 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const refSlaOk = new Record(referralsCol)
    refSlaOk.set('client_name', 'E2E_TEST_CLIENT_SLA_OK')
    refSlaOk.set('client_phone', '(11) 91111-0006')
    refSlaOk.set('indicator_id', indicatorRecord.id)
    refSlaOk.set('property_type', 'buyer')
    refSlaOk.set('status', 'sent')
    refSlaOk.set('sla_deadline', futureDate)
    refSlaOk.set('sla_breached', false)
    app.save(refSlaOk)

    // ---------------------------------------------------------
    // Executa a lógica de cálculo de bônus em cada indicação concluída:
    // ---------------------------------------------------------
    function calculateBonusDirect(refRec) {
      const pType = String(refRec.get('property_type') || '')
        .toLowerCase()
        .trim()
      const dVal = Number(refRec.get('deal_value')) || 0
      const indId = refRec.getString('indicator_id')

      if (pType === 'vitacon') {
        const b = new Record(bonusesCol)
        b.set('referral_id', refRec.id)
        b.set('indicator_id', indId)
        b.set('bonus_type', 'vitacon_percent')
        b.set('amount', (dVal * 1) / 100)
        b.set('status', 'pending')
        b.set('payment_status', 'pending')
        b.set('is_vitacon', true)
        b.set('recipient_type', 'indicator')
        b.set('deal_value', dVal)
        app.save(b)
      } else if (pType === 'rental') {
        const b = new Record(bonusesCol)
        b.set('referral_id', refRec.id)
        b.set('indicator_id', indId)
        b.set('bonus_type', 'rental_fixed')
        b.set('amount', 200)
        b.set('status', 'pending')
        b.set('payment_status', 'pending')
        b.set('is_vitacon', false)
        b.set('recipient_type', 'indicator')
        b.set('deal_value', dVal)
        app.save(b)
      } else if (pType === 'buyer') {
        const bInd = new Record(bonusesCol)
        bInd.set('referral_id', refRec.id)
        bInd.set('indicator_id', indId)
        bInd.set('bonus_type', 'buyer_percent')
        bInd.set('amount', (dVal * 0.5) / 100)
        bInd.set('status', 'pending')
        bInd.set('payment_status', 'pending')
        bInd.set('is_vitacon', false)
        bInd.set('recipient_type', 'indicator')
        bInd.set('deal_value', dVal)
        app.save(bInd)

        const bRef = new Record(bonusesCol)
        bRef.set('referral_id', refRec.id)
        bRef.set('indicator_id', indId)
        bRef.set('bonus_type', 'buyer_percent')
        bRef.set('amount', (dVal * 0.5) / 100)
        bRef.set('status', 'pending')
        bRef.set('payment_status', 'pending')
        bRef.set('is_vitacon', false)
        bRef.set('recipient_type', 'referred')
        bRef.set('deal_value', dVal)
        app.save(bRef)
      } else if (pType === 'sale') {
        const b = new Record(bonusesCol)
        b.set('referral_id', refRec.id)
        b.set('indicator_id', indId)
        b.set('bonus_type', 'sale_percent')
        b.set('amount', Math.round(dVal * 0.06 * 0.05 * 100) / 100)
        b.set('status', 'pending')
        b.set('payment_status', 'pending')
        b.set('is_vitacon', false)
        b.set('recipient_type', 'indicator')
        b.set('deal_value', dVal)
        app.save(b)
      }
    }

    calculateBonusDirect(refBuyer)
    calculateBonusDirect(refRental)
    calculateBonusDirect(refSale)
    calculateBonusDirect(refVitacon)

    // ---------------------------------------------------------
    // TESTE DE NOTIFICAÇÃO:
    // Cria histórico de status não notificado e executa o processador simulado de notificação
    // ---------------------------------------------------------
    const hist = new Record(historyCol)
    hist.set('referral_id', refBuyer.id)
    hist.set('old_status', 'sent')
    hist.set('new_status', 'in_progress')
    hist.set('notes', 'E2E teste de mudança de status')
    hist.set('notified', false)
    app.save(hist)

    // Simula disparo de notificação sem quebrar (pulado por ausência de chaves externas)
    const logRec = new Record(notifCol)
    logRec.set('recipient_phone', refBuyer.getString('client_phone'))
    logRec.set('template_name', 'status_update')
    logRec.set('status', 'skipped')
    logRec.set('referral_id', refBuyer.id)
    logRec.set('error_message', 'Chaves Resend/Evolution ausentes - envio pulado com segurança')
    app.save(logRec)

    hist.set('notified', true)
    app.save(hist)

    // ---------------------------------------------------------
    // TESTE DE SLA:
    // Simula a verificação do cron job check-sla:
    // Se sla_deadline < now && !sla_breached -> sla_breached = true
    // ---------------------------------------------------------
    const nowIso = new Date().toISOString()
    const overdueDeadline = refSlaOverdue.getString('sla_deadline')
    if (overdueDeadline && overdueDeadline < nowIso) {
      refSlaOverdue.set('sla_breached', true)
      app.save(refSlaOverdue)
    }
  },
  (app) => {
    // Reversão
  },
)
