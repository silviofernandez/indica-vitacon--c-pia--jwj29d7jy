migrate(
  (app) => {
    // 1. Adicionar must_change_password (bool) na coleção profiles
    const profilesCol = app.findCollectionByNameOrId('profiles')
    if (!profilesCol.fields.getByName('must_change_password')) {
      profilesCol.fields.add(
        new BoolField({
          name: 'must_change_password',
        }),
      )
      app.save(profilesCol)
    }

    // 2. Garantir que o admin seed gabsilvio@gmail.com fique com must_change_password = false
    try {
      const adminProfile = app.findFirstRecordByData('profiles', 'email', 'gabsilvio@gmail.com')
      adminProfile.set('must_change_password', false)
      app.save(adminProfile)
    } catch (_) {
      // Se não achar por email, tenta pelo user_id
      try {
        const adminUser = app.findFirstRecordByData('users', 'email', 'gabsilvio@gmail.com')
        const adminProfile = app.findFirstRecordByData('profiles', 'user_id', adminUser.id)
        adminProfile.set('must_change_password', false)
        app.save(adminProfile)
      } catch (err) {
        console.log('Aviso ao atualizar admin profile must_change_password:', err)
      }
    }
  },
  (app) => {
    try {
      const profilesCol = app.findCollectionByNameOrId('profiles')
      const field = profilesCol.fields.getByName('must_change_password')
      if (field) {
        profilesCol.fields.removeByName('must_change_password')
        app.save(profilesCol)
      }
    } catch (_) {}
  },
)
