migrate(
  (app) => {
    // 1. referrals: adicionar deal_value e garantir property_type 'buyer' e status 'bonus_paid'
    const referrals = app.findCollectionByNameOrId('referrals')

    if (!referrals.fields.getByName('deal_value')) {
      referrals.fields.add(
        new NumberField({
          name: 'deal_value',
          required: false,
        }),
      )
    }

    const propTypeField = referrals.fields.getByName('property_type')
    if (propTypeField) {
      const currentValues = propTypeField.values || []
      const requiredValues = ['rental', 'sale', 'vitacon', 'buyer']
      const mergedValues = Array.from(new Set([...currentValues, ...requiredValues]))
      propTypeField.values = mergedValues
      propTypeField.maxSelect = 1
    }

    const statusField = referrals.fields.getByName('status')
    if (statusField) {
      const currentStatuses = statusField.values || []
      const requiredStatuses = [
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
      const mergedStatuses = Array.from(new Set([...currentStatuses, ...requiredStatuses]))
      statusField.values = mergedStatuses
      statusField.maxSelect = 1
    }

    app.save(referrals)

    // 2. bonuses: adicionar campos payment_status, is_vitacon, recipient_type, payment_notes, pix_key_used, deal_value
    const bonuses = app.findCollectionByNameOrId('bonuses')

    if (!bonuses.fields.getByName('payment_status')) {
      bonuses.fields.add(
        new SelectField({
          name: 'payment_status',
          required: false,
          values: ['pending', 'paid', 'cancelled'],
          maxSelect: 1,
        }),
      )
    }

    if (!bonuses.fields.getByName('is_vitacon')) {
      bonuses.fields.add(
        new BoolField({
          name: 'is_vitacon',
          required: false,
        }),
      )
    }

    if (!bonuses.fields.getByName('recipient_type')) {
      bonuses.fields.add(
        new SelectField({
          name: 'recipient_type',
          required: false,
          values: ['indicator', 'referred'],
          maxSelect: 1,
        }),
      )
    }

    if (!bonuses.fields.getByName('payment_notes')) {
      bonuses.fields.add(
        new TextField({
          name: 'payment_notes',
          required: false,
        }),
      )
    }

    if (!bonuses.fields.getByName('pix_key_used')) {
      bonuses.fields.add(
        new TextField({
          name: 'pix_key_used',
          required: false,
        }),
      )
    }

    if (!bonuses.fields.getByName('deal_value')) {
      bonuses.fields.add(
        new NumberField({
          name: 'deal_value',
          required: false,
        }),
      )
    }

    app.save(bonuses)

    // Índices auxiliares
    try {
      bonuses.addIndex('idx_bonuses_payment_status', false, 'payment_status', '')
      bonuses.addIndex('idx_bonuses_is_vitacon', false, 'is_vitacon', '')
      app.save(bonuses)
    } catch (e) {
      console.log('Aviso ao criar índices em bonuses:', e)
    }
  },
  (app) => {
    try {
      const referrals = app.findCollectionByNameOrId('referrals')
      if (referrals.fields.getByName('deal_value')) {
        referrals.fields.removeByName('deal_value')
      }
      app.save(referrals)
    } catch (_) {}

    try {
      const bonuses = app.findCollectionByNameOrId('bonuses')
      if (bonuses.fields.getByName('payment_status')) bonuses.fields.removeByName('payment_status')
      if (bonuses.fields.getByName('is_vitacon')) bonuses.fields.removeByName('is_vitacon')
      if (bonuses.fields.getByName('recipient_type')) bonuses.fields.removeByName('recipient_type')
      if (bonuses.fields.getByName('payment_notes')) bonuses.fields.removeByName('payment_notes')
      if (bonuses.fields.getByName('pix_key_used')) bonuses.fields.removeByName('pix_key_used')
      if (bonuses.fields.getByName('deal_value')) bonuses.fields.removeByName('deal_value')
      app.save(bonuses)
    } catch (_) {}
  },
)
