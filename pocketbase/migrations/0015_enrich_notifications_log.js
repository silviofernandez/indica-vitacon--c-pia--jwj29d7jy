migrate(
  (app) => {
    const notificationsLog = app.findCollectionByNameOrId('notifications_log')

    // 1. Tornar title e type opcionais caso não sejam ou flexibilizar
    const typeField = notificationsLog.fields.getByName('type')
    if (typeField) {
      typeField.required = false
    }

    const titleField = notificationsLog.fields.getByName('title')
    if (titleField) {
      titleField.required = false
    }

    const messageField = notificationsLog.fields.getByName('message')
    if (messageField) {
      messageField.required = false
    }

    // 2. Adicionar channel ('email' | 'whatsapp')
    if (!notificationsLog.fields.getByName('channel')) {
      notificationsLog.fields.add(
        new SelectField({
          name: 'channel',
          required: false,
          values: ['email', 'whatsapp'],
          maxSelect: 1,
        }),
      )
    }

    // 3. Adicionar event_type ('registration_received' | 'approved_credentials' | 'status_changed' | 'bonus_paid')
    if (!notificationsLog.fields.getByName('event_type')) {
      notificationsLog.fields.add(
        new SelectField({
          name: 'event_type',
          required: false,
          values: ['registration_received', 'approved_credentials', 'status_changed', 'bonus_paid'],
          maxSelect: 1,
        }),
      )
    }

    // 4. Adicionar status ('sent' | 'failed' | 'skipped')
    if (!notificationsLog.fields.getByName('status')) {
      notificationsLog.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['sent', 'failed', 'skipped'],
          maxSelect: 1,
        }),
      )
    }

    // 5. Adicionar recipient (e-mail ou telefone de destino)
    if (!notificationsLog.fields.getByName('recipient')) {
      notificationsLog.fields.add(
        new TextField({
          name: 'recipient',
          required: false,
        }),
      )
    }

    // 6. Adicionar related_id (referral_id, indicator_id, etc.)
    if (!notificationsLog.fields.getByName('related_id')) {
      notificationsLog.fields.add(
        new TextField({
          name: 'related_id',
          required: false,
        }),
      )
    }

    // 7. Adicionar indicator_id relation (opcional para facilitar queries por indicador)
    if (!notificationsLog.fields.getByName('indicator_id')) {
      try {
        const indicatorsCol = app.findCollectionByNameOrId('indicators')
        notificationsLog.fields.add(
          new RelationField({
            name: 'indicator_id',
            collectionId: indicatorsCol.id,
            maxSelect: 1,
            required: false,
          }),
        )
      } catch (_) {}
    }

    // 8. Adicionar error_message (motivo de falha ou do status 'skipped')
    if (!notificationsLog.fields.getByName('error_message')) {
      notificationsLog.fields.add(
        new TextField({
          name: 'error_message',
          required: false,
        }),
      )
    }

    // 9. Adicionar payload_json para rastreabilidade de dados do template
    if (!notificationsLog.fields.getByName('payload_json')) {
      notificationsLog.fields.add(
        new JSONField({
          name: 'payload_json',
          required: false,
        }),
      )
    }

    app.save(notificationsLog)

    // Índices para performance e idempotência
    try {
      notificationsLog.addIndex('idx_notif_channel', false, 'channel', '')
      notificationsLog.addIndex('idx_notif_event_type', false, 'event_type', '')
      notificationsLog.addIndex('idx_notif_status', false, 'status', '')
      notificationsLog.addIndex('idx_notif_related', false, 'related_id', '')
      app.save(notificationsLog)
    } catch (e) {
      console.log('Aviso ao criar índices em notifications_log:', e)
    }
  },
  (app) => {
    try {
      const notificationsLog = app.findCollectionByNameOrId('notifications_log')
      if (notificationsLog.fields.getByName('channel'))
        notificationsLog.fields.removeByName('channel')
      if (notificationsLog.fields.getByName('event_type'))
        notificationsLog.fields.removeByName('event_type')
      if (notificationsLog.fields.getByName('status'))
        notificationsLog.fields.removeByName('status')
      if (notificationsLog.fields.getByName('recipient'))
        notificationsLog.fields.removeByName('recipient')
      if (notificationsLog.fields.getByName('related_id'))
        notificationsLog.fields.removeByName('related_id')
      if (notificationsLog.fields.getByName('indicator_id'))
        notificationsLog.fields.removeByName('indicator_id')
      if (notificationsLog.fields.getByName('error_message'))
        notificationsLog.fields.removeByName('error_message')
      if (notificationsLog.fields.getByName('payload_json'))
        notificationsLog.fields.removeByName('payload_json')
      app.save(notificationsLog)
    } catch (_) {}
  },
)
