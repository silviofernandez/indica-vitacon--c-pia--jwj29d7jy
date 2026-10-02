migrate(
  (app) => {
    // Busca usuário master seeded
    let user = null
    try {
      user = app.findAuthRecordByEmail('users', 'gabsilvio@gmail.com')
    } catch (_) {
      return
    }

    // Busca ou cria indicador para gabsilvio
    let ind = null
    try {
      ind = app.findFirstRecordByData('indicators', 'user_id', user.id)
    } catch (_) {
      const indCol = app.findCollectionByNameOrId('indicators')
      ind = new Record(indCol)
      ind.set('user_id', user.id)
      ind.set('full_name', 'Gabriel Silvio')
      ind.set('email', 'gabsilvio@gmail.com')
      ind.set('phone', '(11) 99999-8888')
      ind.set('approved', true)
      ind.set('approval_status', 'approved')
      app.save(ind)
    }

    // 1. Criar referral de teste
    const referralsCol = app.findCollectionByNameOrId('referrals')
    const ref = new Record(referralsCol)
    ref.set('indicator_id', ind.id)
    ref.set('client_name', 'Cliente Teste QA')
    ref.set('client_phone', '(11) 98765-4321')
    ref.set('property_type', 'vitacon')
    ref.set('property_description', 'Studio Vitacon SP com varanda')
    ref.set('notes', 'Studio Vitacon SP com varanda')
    ref.set(
      'raw_transcription',
      'Quero indicar o Cliente Teste QA pelo telefone 11 98765-4321 interessado em Vitacon',
    )
    const now = new Date()
    const slaDeadline = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()
    ref.set('sla_deadline', slaDeadline)
    ref.set('status', 'sent')
    app.save(ref)

    // 2. Criar status history
    const histCol = app.findCollectionByNameOrId('referral_status_history')
    const hist = new Record(histCol)
    hist.set('referral_id', ref.id)
    hist.set('old_status', '')
    hist.set('new_status', 'sent')
    hist.set('changed_by', user.id)
    hist.set('notes', 'Indicação criada via teste QA')
    app.save(hist)

    console.log('Teste QA criado com sucesso: referral id = ' + ref.id + ', sla = ' + slaDeadline)
  },
  (app) => {
    // Reversão
    try {
      const ref = app.findFirstRecordByData('referrals', 'client_name', 'Cliente Teste QA')
      if (ref) {
        app.delete(ref)
      }
    } catch (_) {}
  },
)
