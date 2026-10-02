migrate(
  (app) => {
    const referrals = app.findCollectionByNameOrId('referrals')

    // 1. Campo raw_transcription (texto bruto transcrito pelo Whisper)
    if (!referrals.fields.getByName('raw_transcription')) {
      referrals.fields.add(
        new TextField({
          name: 'raw_transcription',
          required: false,
        }),
      )
    }

    // 2. Campo sla_deadline (data/hora limite de 3 horas para atendimento)
    if (!referrals.fields.getByName('sla_deadline')) {
      referrals.fields.add(
        new DateField({
          name: 'sla_deadline',
          required: false,
        }),
      )
    }

    // 3. Garantir valores do property_type: 'rental', 'sale', 'vitacon'
    const propertyTypeField = referrals.fields.getByName('property_type')
    if (propertyTypeField) {
      const existingValues = propertyTypeField.values || []
      const requiredValues = ['rental', 'sale', 'vitacon']
      const mergedValues = Array.from(new Set([...existingValues, ...requiredValues]))
      propertyTypeField.values = mergedValues
      propertyTypeField.maxSelect = 1
    }

    // Salva as alterações estruturais em referrals
    app.save(referrals)

    // Adiciona índice para sla_deadline se não existir
    try {
      referrals.addIndex('idx_referrals_sla_deadline', false, 'sla_deadline', '')
      app.save(referrals)
    } catch (idxErr) {
      console.log('Aviso ao adicionar índice idx_referrals_sla_deadline:', idxErr)
    }
  },
  (app) => {
    try {
      const referrals = app.findCollectionByNameOrId('referrals')
      if (referrals.fields.getByName('raw_transcription')) {
        referrals.fields.removeByName('raw_transcription')
      }
      if (referrals.fields.getByName('sla_deadline')) {
        referrals.fields.removeByName('sla_deadline')
      }
      app.save(referrals)
    } catch (_) {}
  },
)
