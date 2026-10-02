routerAdd(
  'POST',
  '/backend/v1/assign-referral',
  (e) => {
    // 1. Validação de autenticação
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login para continuar.' })
    }

    // 2. Determinar papel (role) do usuário autenticado (master, operator, manager)
    let userRole = ''
    let userTeamId = ''
    try {
      const userProfile = $app.findFirstRecordByData('profiles', 'user_id', authRecord.id)
      if (userProfile) {
        userRole = String(userProfile.get('role') || '').trim()
        userTeamId = String(userProfile.get('team_id') || '').trim()
      }
    } catch (_) {}

    // Fallback de segurança para conta master conhecida se profile não carregar
    if (!userRole && authRecord.email === 'gabsilvio@gmail.com') {
      userRole = 'master'
    }

    if (userRole !== 'master' && userRole !== 'operator' && userRole !== 'manager') {
      return e.json(403, {
        error: 'Acesso negado. Apenas operador, gestor ou master podem encaminhar indicações.',
      })
    }

    // 3. Obter payload
    const body = e.requestInfo().body || {}
    const referralId = String(body.referral_id || body.id || '').trim()
    const teamId = String(body.assigned_team_id || body.team_id || '').trim()
    const managerId = String(body.assigned_manager_id || body.manager_id || '').trim()

    if (!referralId) {
      return e.json(400, { error: 'Identificador da indicação (referral_id) é obrigatório.' })
    }

    if (!teamId && !managerId) {
      return e.json(400, {
        error: 'Informe ao menos a equipe ou o gestor responsável pelo encaminhamento.',
      })
    }

    // 4. Regras de permissão por papel:
    // - Operator: pode encaminhar para qualquer equipe
    // - Manager: só pode encaminhar para a sua própria equipe
    // - Master: pode tudo
    if (userRole === 'manager') {
      if (userTeamId && teamId && teamId !== userTeamId) {
        return e.json(403, {
          error: 'Gerentes só podem encaminhar indicações para a sua própria equipe.',
        })
      }
    }

    // 5. Buscar a indicação
    let referralRecord = null
    try {
      referralRecord = $app.findFirstRecordByData('referrals', 'id', referralId)
    } catch (err) {
      return e.json(404, { error: 'Indicação não encontrada.' })
    }

    // 6. Validar existência da equipe e do gestor se informados
    let resolvedTeamId = teamId
    let resolvedManagerId = managerId

    if (resolvedTeamId) {
      try {
        const teamRec = $app.findFirstRecordByData('teams', 'id', resolvedTeamId)
        if (!teamRec) {
          return e.json(404, { error: 'Equipe selecionada não foi encontrada.' })
        }
        // Se não informou manager_id, tenta puxar o leader_id da equipe como padrão se houver
        if (!resolvedManagerId && teamRec.get('leader_id')) {
          resolvedManagerId = String(teamRec.get('leader_id'))
        }
      } catch (tErr) {
        return e.json(404, { error: 'Equipe selecionada não foi encontrada.' })
      }
    }

    if (resolvedManagerId) {
      try {
        const mgrUser = $app.findFirstRecordByData('users', 'id', resolvedManagerId)
        if (!mgrUser) {
          return e.json(404, { error: 'Gestor selecionado não foi encontrado.' })
        }
      } catch (mErr) {
        return e.json(404, { error: 'Gestor selecionado não foi encontrado.' })
      }
    }

    // 7. Atualizar a indicação
    const nowIso = new Date().toISOString()
    const oldStatus = String(referralRecord.get('status') || 'sent')

    try {
      if (resolvedTeamId) referralRecord.set('assigned_team_id', resolvedTeamId)
      if (resolvedManagerId) {
        referralRecord.set('assigned_manager_id', resolvedManagerId)
        // Mantém compatibilidade com assigned_to caso algum relatório utilize
        referralRecord.set('assigned_to', resolvedManagerId)
      }
      referralRecord.set('assigned_by', authRecord.id)
      referralRecord.set('assigned_at', nowIso)

      // Se a indicação estava no status 'sent' aguardando, avança para 'in_analysis' ou 'in_progress'
      if (oldStatus === 'sent') {
        referralRecord.set('status', 'in_analysis')
      }

      $app.save(referralRecord)
    } catch (saveErr) {
      console.log('Erro ao salvar atribuição da indicação:', saveErr)
      return e.json(500, {
        error: 'Erro ao registrar encaminhamento: ' + (saveErr.message || String(saveErr)),
      })
    }

    // 8. Gravar registro em referral_status_history
    const newStatus = String(referralRecord.get('status'))
    try {
      const historyCol = $app.findCollectionByNameOrId('referral_status_history')
      const hist = new Record(historyCol)
      hist.set('referral_id', referralRecord.id)
      hist.set('old_status', oldStatus)
      hist.set('new_status', newStatus)
      hist.set('changed_by', authRecord.id)
      hist.set('notes', 'Indicação encaminhada para atendimento')
      $app.save(hist)
    } catch (hErr) {
      console.log('Aviso ao gravar histórico de encaminhamento:', hErr)
    }

    return e.json(200, {
      success: true,
      message: 'Indicação encaminhada com sucesso.',
      referral_id: referralRecord.id,
      assigned_team_id: resolvedTeamId || null,
      assigned_manager_id: resolvedManagerId || null,
      assigned_by: authRecord.id,
      assigned_at: nowIso,
      status: newStatus,
    })
  },
  $apis.requireAuth(),
)
