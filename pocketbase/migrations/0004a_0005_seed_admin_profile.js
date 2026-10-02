migrate(
  (app) => {
    try {
      const user = app.findFirstRecordByData('users', 'email', 'gabsilvio@gmail.com')
      const profiles = app.findCollectionByNameOrId('profiles')

      try {
        app.findFirstRecordByData('profiles', 'user_id', user.id)
      } catch (_) {
        const profile = new Record(profiles)
        profile.set('user_id', user.id)
        profile.set('name', user.getString('name') || 'Gabriel Silvio')
        profile.set('email', user.getString('email') || 'gabsilvio@gmail.com')
        profile.set('role', 'master')
        app.save(profile)
      }
    } catch (e) {
      console.log('Erro seed profile:', e)
    }
  },
  (app) => {
    try {
      const user = app.findFirstRecordByData('users', 'email', 'gabsilvio@gmail.com')
      const profile = app.findFirstRecordByData('profiles', 'user_id', user.id)
      app.delete(profile)
    } catch (_) {}
  },
)
