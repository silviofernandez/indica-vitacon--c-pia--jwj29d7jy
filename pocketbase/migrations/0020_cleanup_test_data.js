migrate(
  (app) => {
    // Limpa referências e bonificações de teste criadas
    try {
      const refs = app.findRecordsByFilter(
        'referrals',
        'client_name = "Carlos Eduardo Silveira"',
        '-created',
        20,
        0,
      )
      for (let i = 0; i < refs.length; i++) {
        const r = refs[i]
        const bons = app.findRecordsByFilter(
          'bonuses',
          `referral_id = "${r.id}"`,
          '-created',
          20,
          0,
        )
        for (let j = 0; j < bons.length; j++) {
          app.delete(bons[j])
        }
        app.delete(r)
      }
    } catch (_) {}

    // Limpa relatórios gerados pelo teste automatizado
    try {
      const reports = app.findRecordsByFilter('reports', '1=1', '-created', 50, 0)
      for (let k = 0; k < reports.length; k++) {
        app.delete(reports[k])
      }
    } catch (_) {}
  },
  (app) => {},
)
