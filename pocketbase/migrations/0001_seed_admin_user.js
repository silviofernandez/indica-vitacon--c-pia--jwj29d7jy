migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotente: verifica se o usuário já existe antes de criar
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'gabsilvio@gmail.com')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('gabsilvio@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Gabriel Silvio')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'gabsilvio@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
