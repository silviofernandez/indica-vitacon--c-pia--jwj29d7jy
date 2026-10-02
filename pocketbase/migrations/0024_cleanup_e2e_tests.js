/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Apaga bônus de teste criados no E2E
    try {
      const bonuses = app.findRecordsByFilter(
        'bonuses',
        'referral_id.client_name ~ "E2E_TEST"',
        '-created',
        100,
      )
      for (let i = 0; i < bonuses.length; i++) {
        app.delete(bonuses[i])
      }
    } catch (_) {}

    // Apaga notificações_log do teste E2E
    try {
      const notifs = app.findRecordsByFilter(
        'notifications_log',
        'error_message ~ "Resend/Evolution"',
        '-created',
        100,
      )
      for (let i = 0; i < notifs.length; i++) {
        app.delete(notifs[i])
      }
    } catch (_) {}

    // Apaga histórico de status do teste E2E
    try {
      const history = app.findRecordsByFilter(
        'referral_status_history',
        'notes ~ "E2E teste"',
        '-created',
        100,
      )
      for (let i = 0; i < history.length; i++) {
        app.delete(history[i])
      }
    } catch (_) {}

    // Apaga indicações de teste E2E
    try {
      const referrals = app.findRecordsByFilter(
        'referrals',
        'client_name ~ "E2E_TEST"',
        '-created',
        100,
      )
      for (let i = 0; i < referrals.length; i++) {
        app.delete(referrals[i])
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão
  },
)
