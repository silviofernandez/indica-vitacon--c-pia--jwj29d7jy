migrate(
  (app) => {
    // Limpa o registro de teste QA temporário para manter o banco limpo
    try {
      const histories = app.findRecordsByFilter(
        'referral_status_history',
        "notes = 'Indicação criada via teste QA'",
        '-created',
        10,
        0,
      )
      for (let i = 0; i < histories.length; i++) {
        app.delete(histories[i])
      }
    } catch (_) {}

    try {
      const ref = app.findFirstRecordByData('referrals', 'client_name', 'Cliente Teste QA')
      if (ref) {
        app.delete(ref)
      }
    } catch (_) {}
  },
  () => {},
)
