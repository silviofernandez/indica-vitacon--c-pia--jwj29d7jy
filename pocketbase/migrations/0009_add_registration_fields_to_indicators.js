migrate(
  (app) => {
    const indicators = app.findCollectionByNameOrId('indicators')

    // 1. Tornar user_id opcional (para permitir cadastro anônimo antes de aprovação)
    const userIdField = indicators.fields.getByName('user_id')
    if (userIdField) {
      userIdField.required = false
    }

    // 2. Campo email (obrigatório para cadastro e contato)
    if (!indicators.fields.getByName('email')) {
      indicators.fields.add(
        new EmailField({
          name: 'email',
          required: false,
        }),
      )
    }

    // 3. Campo address (endereço do indicador)
    if (!indicators.fields.getByName('address')) {
      indicators.fields.add(
        new TextField({
          name: 'address',
          required: false,
        }),
      )
    }

    // 4. Campo rg (documento de identidade RG)
    if (!indicators.fields.getByName('rg')) {
      indicators.fields.add(
        new TextField({
          name: 'rg',
          required: false,
        }),
      )
    }

    // 5. Campo approval_status ('pending' | 'approved' | 'rejected')
    if (!indicators.fields.getByName('approval_status')) {
      indicators.fields.add(
        new SelectField({
          name: 'approval_status',
          required: false,
          values: ['pending', 'approved', 'rejected'],
          maxSelect: 1,
        }),
      )
    }

    // 6. Campo rejection_reason (motivo obrigatório ao rejeitar)
    if (!indicators.fields.getByName('rejection_reason')) {
      indicators.fields.add(
        new TextField({
          name: 'rejection_reason',
          required: false,
        }),
      )
    }

    // 7. Campo profile_id (relação com a tabela profiles criada na aprovação)
    if (!indicators.fields.getByName('profile_id')) {
      const profilesCol = app.findCollectionByNameOrId('profiles')
      indicators.fields.add(
        new RelationField({
          name: 'profile_id',
          required: false,
          collectionId: profilesCol.id,
          maxSelect: 1,
        }),
      )
    }

    // Salva as alterações estruturais na coleção indicators
    app.save(indicators)

    // Adiciona índices se ainda não existirem
    try {
      indicators.addIndex('idx_indicators_approval_status', false, 'approval_status', '')
      indicators.addIndex('idx_indicators_email', false, 'email', '')
      indicators.addIndex('idx_indicators_cpf', false, 'cpf_cnpj', '')
      app.save(indicators)
    } catch (idxErr) {
      console.log('Aviso ao adicionar índices em indicators:', idxErr)
    }
  },
  (app) => {
    try {
      const indicators = app.findCollectionByNameOrId('indicators')
      const fieldsToRemove = [
        'profile_id',
        'rejection_reason',
        'approval_status',
        'rg',
        'address',
        'email',
      ]
      for (let i = 0; i < fieldsToRemove.length; i++) {
        const fieldName = fieldsToRemove[i]
        if (indicators.fields.getByName(fieldName)) {
          indicators.fields.removeByName(fieldName)
        }
      }
      app.save(indicators)
    } catch (_) {}
  },
)
