migrate(
  (app) => {
    // 1. referrals: adicionar sla_breached bool (default false) e índice
    const referrals = app.findCollectionByNameOrId('referrals')
    if (!referrals.fields.getByName('sla_breached')) {
      referrals.fields.add(
        new BoolField({
          name: 'sla_breached',
          required: false,
        }),
      )
      app.save(referrals)
    }

    try {
      referrals.addIndex('idx_referrals_sla_breached', false, 'sla_breached', '')
      app.save(referrals)
    } catch (idxErr) {
      console.log('Aviso ao criar índice idx_referrals_sla_breached:', idxErr)
    }

    // 2. referral_status_history: adicionar notified bool (default false) e índice
    const refHist = app.findCollectionByNameOrId('referral_status_history')
    if (!refHist.fields.getByName('notified')) {
      refHist.fields.add(
        new BoolField({
          name: 'notified',
          required: false,
        }),
      )
      app.save(refHist)
    }

    try {
      refHist.addIndex('idx_refhist_notified', false, 'notified', '')
      app.save(refHist)
    } catch (idxErr) {
      console.log('Aviso ao criar índice idx_refhist_notified:', idxErr)
    }

    // 3. notifications_log: adicionar monthly_payment_reminder ao enum event_type se ainda não constar
    const notifLog = app.findCollectionByNameOrId('notifications_log')
    const eventTypeField = notifLog.fields.getByName('event_type')
    if (eventTypeField) {
      const existingValues = eventTypeField.values || []
      if (!existingValues.includes('monthly_payment_reminder')) {
        eventTypeField.values = [...existingValues, 'monthly_payment_reminder']
        eventTypeField.maxSelect = 1
        app.save(notifLog)
      }
    }
  },
  (app) => {
    try {
      const referrals = app.findCollectionByNameOrId('referrals')
      if (referrals.fields.getByName('sla_breached')) {
        referrals.fields.removeByName('sla_breached')
      }
      try {
        referrals.removeIndex('idx_referrals_sla_breached')
      } catch (_) {}
      app.save(referrals)
    } catch (_) {}

    try {
      const refHist = app.findCollectionByNameOrId('referral_status_history')
      if (refHist.fields.getByName('notified')) {
        refHist.fields.removeByName('notified')
      }
      try {
        refHist.removeIndex('idx_refhist_notified')
      } catch (_) {}
      app.save(refHist)
    } catch (_) {}
  },
)
