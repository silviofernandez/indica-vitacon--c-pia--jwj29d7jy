routerAdd(
  'POST',
  '/backend/v1/reject-indicator',
  (e) => {
    // 1. Validação de autenticação e papel Master
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login como Master para continuar.' })
    }

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
        error: 'Apenas usuários com perfil Master têm permissão para rejeitar indicadores.',
      })
    }

    const body = e.requestInfo().body || {}
    const indicatorId = String(body.indicator_id || body.id || '').trim()
    const rejectionReason = String(body.rejection_reason || body.reason || '').trim()

    if (!indicatorId) {
      return e.json(400, { error: 'Identificador do indicador (indicator_id) é obrigatório.' })
    }

    if (!rejectionReason) {
      return e.json(400, {
        error: 'O motivo da rejeição é obrigatório. Por favor, especifique o motivo.',
      })
    }

    // Busca o registro do indicador
    let indicatorRecord = null
    try {
      indicatorRecord = $app.findFirstRecordByData('indicators', 'id', indicatorId)
    } catch (findErr) {
      return e.json(404, { error: 'Indicador não encontrado.' })
    }

    try {
      indicatorRecord.set('approval_status', 'rejected')
      indicatorRecord.set('approved', false)
      indicatorRecord.set('rejection_reason', rejectionReason)
      $app.save(indicatorRecord)

      return e.json(200, {
        success: true,
        message: 'Cadastro de indicador rejeitado.',
        indicator_id: indicatorRecord.id,
        rejection_reason: rejectionReason,
      })
    } catch (saveErr) {
      console.log('Erro ao rejeitar indicador:', saveErr)
      return e.json(500, {
        error:
          'Falha ao atualizar o cadastro do indicador: ' + (saveErr.message || String(saveErr)),
      })
    }
  },
  $apis.requireAuth(),
)
