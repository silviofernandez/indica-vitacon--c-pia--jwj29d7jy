routerAdd(
  'POST',
  '/backend/v1/approve-indicator',
  (e) => {
    // 1. Validação de autenticação e papel Master/Operator
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login como Master para continuar.' })
    }

    // Valida se o usuário autenticado possui role master
    let isMaster = false
    try {
      const userProfile = $app.findFirstRecordByData('profiles', 'user_id', authRecord.id)
      if (
        userProfile &&
        (userProfile.get('role') === 'master' || authRecord.email === 'gabsilvio@gmail.com')
      ) {
        isMaster = true
      }
    } catch (_) {
      if (authRecord.email === 'gabsilvio@gmail.com') {
        isMaster = true
      }
    }

    if (!isMaster) {
      return e.json(403, {
        error: 'Apenas usuários com perfil Master têm permissão para aprovar indicadores.',
      })
    }

    const body = e.requestInfo().body || {}
    const indicatorId = String(body.indicator_id || body.id || '').trim()

    if (!indicatorId) {
      return e.json(400, { error: 'Identificador do indicador (indicator_id) é obrigatório.' })
    }

    // Busca o registro do indicador
    let indicatorRecord = null
    try {
      indicatorRecord = $app.findCollectionByNameOrId('indicators')
      indicatorRecord = $app.findFirstRecordByData('indicators', 'id', indicatorId)
    } catch (findErr) {
      return e.json(404, { error: 'Indicador não encontrado.' })
    }

    const indicatorEmail = String(indicatorRecord.get('email') || '')
      .trim()
      .toLowerCase()
    const indicatorName = String(indicatorRecord.get('full_name') || 'Indicador Parceiro').trim()
    const indicatorPhone = String(indicatorRecord.get('phone') || '').trim()

    if (!indicatorEmail) {
      return e.json(400, {
        error: 'O cadastro deste indicador não possui um e-mail válido para criar a conta.',
      })
    }

    // 2. Gera uma senha temporária segura (ex: Ind#Abc123XY)
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let randomPart = ''
    for (let i = 0; i < 6; i++) {
      const randIndex = Math.floor(Math.random() * charset.length)
      randomPart += charset.charAt(randIndex)
    }
    const tempPassword = 'Ind#' + randomPart + '9'

    // 3. Criação ou busca de auth.user
    let targetUser = null
    try {
      targetUser = $app.findAuthRecordByEmail('users', indicatorEmail)
    } catch (_) {
      // Usuário ainda não existe — criar
    }

    if (!targetUser) {
      try {
        const usersCol = $app.findCollectionByNameOrId('users')
        targetUser = new Record(usersCol)
        targetUser.setEmail(indicatorEmail)
        targetUser.setPassword(tempPassword)
        targetUser.setVerified(true)
        targetUser.set('name', indicatorName)
        $app.save(targetUser)
      } catch (userErr) {
        console.log('Erro ao criar usuário em users:', userErr)
        return e.json(500, {
          error:
            'Falha ao criar usuário de autenticação para o indicador: ' +
            (userErr.message || String(userErr)),
        })
      }
    } else {
      // Se usuário já existia, redefinir a senha para a senha temporária
      try {
        targetUser.setPassword(tempPassword)
        $app.save(targetUser)
      } catch (pwErr) {
        console.log('Aviso ao redefinir senha do usuário existente:', pwErr)
      }
    }

    // 4. Criação ou atualização do Profile com role='indicador' e must_change_password=true
    let targetProfile = null
    try {
      targetProfile = $app.findFirstRecordByData('profiles', 'user_id', targetUser.id)
    } catch (_) {}

    try {
      if (!targetProfile) {
        const profilesCol = $app.findCollectionByNameOrId('profiles')
        targetProfile = new Record(profilesCol)
        targetProfile.set('user_id', targetUser.id)
        targetProfile.set('name', indicatorName)
        targetProfile.set('email', indicatorEmail)
        targetProfile.set('phone', indicatorPhone)
        targetProfile.set('role', 'indicador')
        targetProfile.set('must_change_password', true)
        $app.save(targetProfile)
      } else {
        targetProfile.set('role', 'indicador')
        targetProfile.set('must_change_password', true)
        if (!targetProfile.get('phone') && indicatorPhone) {
          targetProfile.set('phone', indicatorPhone)
        }
        $app.save(targetProfile)
      }
    } catch (profErr) {
      console.log('Erro ao salvar profile:', profErr)
      return e.json(500, {
        error: 'Falha ao atualizar o perfil do indicador: ' + (profErr.message || String(profErr)),
      })
    }

    // 5. Vincula indicators.user_id e indicators.profile_id, e atualiza status para 'approved' e approved=true
    try {
      indicatorRecord.set('user_id', targetUser.id)
      indicatorRecord.set('profile_id', targetProfile.id)
      indicatorRecord.set('approval_status', 'approved')
      indicatorRecord.set('approved', true)
      $app.save(indicatorRecord)
    } catch (indErr) {
      console.log('Erro ao atualizar indicators:', indErr)
      return e.json(500, {
        error:
          'Falha ao atualizar o registro do indicador para aprovado: ' +
          (indErr.message || String(indErr)),
      })
    }

    // Disparo de notificação 'approved_credentials' (best-effort)
    try {
      const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
      // 1. E-mail com credenciais de acesso
      try {
        $http.send({
          url: pbUrl + '/backend/v1/send-notification',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'email',
            event_type: 'approved_credentials',
            recipient: indicatorEmail,
            user_id: targetUser.id,
            indicator_id: indicatorRecord.id,
            payload: {
              name: indicatorName,
              login: indicatorEmail,
              email: indicatorEmail,
              temp_password: tempPassword,
            },
          }),
          timeout: 5,
        })
      } catch (mailErr) {
        console.log('Aviso ao disparar e-mail approved_credentials:', mailErr)
      }

      // 2. WhatsApp opcional se houver telefone
      if (indicatorPhone) {
        try {
          $http.send({
            url: pbUrl + '/backend/v1/send-notification',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: 'whatsapp',
              event_type: 'approved_credentials',
              recipient: indicatorPhone,
              user_id: targetUser.id,
              indicator_id: indicatorRecord.id,
              payload: {
                name: indicatorName,
                login: indicatorEmail,
                email: indicatorEmail,
                temp_password: tempPassword,
              },
            }),
            timeout: 5,
          })
        } catch (waErr) {
          console.log('Aviso ao disparar WhatsApp approved_credentials:', waErr)
        }
      }
    } catch (notifErr) {
      console.log('Aviso geral na notificação approved_credentials:', notifErr)
    }

    return e.json(200, {
      success: true,
      message: 'Indicador aprovado com sucesso!',
      indicator_id: indicatorRecord.id,
      user_id: targetUser.id,
      profile_id: targetProfile.id,
      email: indicatorEmail,
      temp_password: tempPassword,
    })
  },
  $apis.requireAuth(),
)
