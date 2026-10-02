onRecordUpdate((e) => {
  // Dispara antes ou durante o salvamento da alteração do registro
  const record = e.record
  const original = record.original()

  if (original) {
    const oldStatus = original.getString('status')
    const newStatus = record.getString('status')

    // Se o status mudou
    if (newStatus && oldStatus !== newStatus) {
      try {
        // Verifica se já não foi criado um histórico nos últimos 3 segundos para este mesmo status
        const historyCol = $app.findCollectionByNameOrId('referral_status_history')
        const hist = new Record(historyCol)
        hist.set('referral_id', record.id)
        hist.set('old_status', oldStatus)
        hist.set('new_status', newStatus)

        // Se puder identificar o usuário atual ou usar o assigned_by / assigned_manager_id
        const changedBy = record.getString('assigned_by') || record.getString('assigned_manager_id')
        if (changedBy) {
          hist.set('changed_by', changedBy)
        }
        hist.set('notes', 'Mudança de status via sistema')
        $app.save(hist)
      } catch (err) {
        console.log('Aviso no hook referrals_status_change_logger:', err)
      }
    }
  }

  e.next()
}, 'referrals')
