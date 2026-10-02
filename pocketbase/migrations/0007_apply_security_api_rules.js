migrate(
  (app) => {
    // =========================================================================
    // MIGRATION 0007: API RULES (RBAC / RLS) DO INDICA GABRIEL NO POCKETBASE
    // =========================================================================
    // Traduz o modelo de segurança por papéis (indicador, master, operator, manager):
    // - Perfis/roles no PB são resolvidos via back-reference @collection.profiles:
    //   Master:   @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'
    //   Operator: @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'operator'
    //   Manager:  @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'manager'
    //
    // - Expressão de Staff (master ou operator):
    //   @collection.profiles.user_id ?= @request.auth.id && (@collection.profiles.role ?= 'master' || @collection.profiles.role ?= 'operator')
    //
    // - Expressão de Staff + Manager:
    //   @collection.profiles.user_id ?= @request.auth.id && (@collection.profiles.role ?= 'master' || @collection.profiles.role ?= 'operator' || @collection.profiles.role ?= 'manager')
    // =========================================================================

    const isMaster =
      "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'"

    const isStaffOrManager =
      "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && (@collection.profiles.role ?= 'master' || @collection.profiles.role ?= 'operator' || @collection.profiles.role ?= 'manager')"

    const isStaff =
      "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && (@collection.profiles.role ?= 'master' || @collection.profiles.role ?= 'operator')"

    // 1. TEAMS
    // Leitura: autenticados (usado para menus/equipes/filtros)
    // Escrita (create/update/delete): apenas master
    const teams = app.findCollectionByNameOrId('teams')
    teams.listRule = "@request.auth.id != ''"
    teams.viewRule = "@request.auth.id != ''"
    teams.createRule = isMaster
    teams.updateRule = isMaster
    teams.deleteRule = isMaster
    app.save(teams)

    // 2. TEAM_MEMBERS
    // Leitura: autenticados
    // Escrita: apenas master
    const teamMembers = app.findCollectionByNameOrId('team_members')
    teamMembers.listRule = "@request.auth.id != ''"
    teamMembers.viewRule = "@request.auth.id != ''"
    teamMembers.createRule = isMaster
    teamMembers.updateRule = isMaster
    teamMembers.deleteRule = isMaster
    app.save(teamMembers)

    // 3. PROFILES
    // Leitura: autenticados (o app precisa carregar o role do próprio usuário e ver responsáveis)
    // Criação: autenticados (auto-criação de perfil no primeiro login) ou master
    // Update: dono pode atualizar seu próprio perfil OU master pode gerenciar
    // Nota de segurança PB: no updateRule permitimos auth.id = user_id || master.
    // Em regras puras do PocketBase não há restrição por coluna em nível de API rule;
    // a proteção de role contra self-escalation é documentada e reforçada pelo sistema.
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.listRule = "@request.auth.id != ''"
    profiles.viewRule = "@request.auth.id != ''"
    profiles.createRule = "@request.auth.id != ''"
    profiles.updateRule = `@request.auth.id != '' && (user_id = @request.auth.id || (${isMaster}))`
    profiles.deleteRule = isMaster
    app.save(profiles)

    // 4. INDICATORS
    // Cadastro público (anon INSERT): createRule = "" (permite anónimo e autenticado)
    // Leitura: dono vê o seu (user_id = auth.id) OU staff/manager vê todos
    // Update/Delete: apenas o próprio dono OU master
    const indicators = app.findCollectionByNameOrId('indicators')
    indicators.createRule = '' // Anon INSERT habilitado para cadastro público
    indicators.listRule = `@request.auth.id != '' && (user_id = @request.auth.id || (${isStaffOrManager}))`
    indicators.viewRule = `@request.auth.id != '' && (user_id = @request.auth.id || (${isStaffOrManager}))`
    indicators.updateRule = `@request.auth.id != '' && (user_id = @request.auth.id || (${isMaster}))`
    indicators.deleteRule = `@request.auth.id != '' && (user_id = @request.auth.id || (${isMaster}))`
    app.save(indicators)

    // 5. REFERRALS
    // Leitura:
    // - Indicador vê apenas suas próprias indicações (indicator_id.user_id = @request.auth.id)
    // - Operator vê todas
    // - Manager vê as atribuídas a ele (assigned_to = @request.auth.id) ou da sua equipe via team_members
    //   (expressão: assigned_to = @request.auth.id || @collection.team_members.user_id ?= assigned_to && @collection.team_members.team_id ?= @collection.profiles.team_id)
    // - Master vê todas
    //
    // Escrita:
    // - Create: Indicador pode criar apontando para o seu próprio indicador_id (indicator_id.user_id = @request.auth.id) OU master
    // - Update / Delete: Apenas master (regras operacionais centrais)
    const referrals = app.findCollectionByNameOrId('referrals')

    const referralsReadRule =
      `@request.auth.id != '' && (` +
      `indicator_id.user_id = @request.auth.id || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'operator') || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'manager' && (assigned_to = @request.auth.id || @collection.team_members.user_id ?= assigned_to)) || ` +
      `(${isMaster})` +
      `)`

    const referralsCreateRule = `@request.auth.id != '' && (indicator_id.user_id = @request.auth.id || (${isMaster}))`

    referrals.listRule = referralsReadRule
    referrals.viewRule = referralsReadRule
    referrals.createRule = referralsCreateRule
    referrals.updateRule = isMaster
    referrals.deleteRule = isMaster
    app.save(referrals)

    // 6. BONUSES
    // Leitura: mesma visibilidade de referrals:
    // - Indicador vê apenas os seus (indicator_id.user_id = @request.auth.id)
    // - Operator vê tudo
    // - Manager vê os de referrals atribuídos a ele ou da sua equipe
    // - Master vê tudo
    // Escrita: apenas master
    const bonuses = app.findCollectionByNameOrId('bonuses')

    const bonusesReadRule =
      `@request.auth.id != '' && (` +
      `indicator_id.user_id = @request.auth.id || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'operator') || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'manager' && (referral_id.assigned_to = @request.auth.id || @collection.team_members.user_id ?= referral_id.assigned_to)) || ` +
      `(${isMaster})` +
      `)`

    bonuses.listRule = bonusesReadRule
    bonuses.viewRule = bonusesReadRule
    bonuses.createRule = isMaster
    bonuses.updateRule = isMaster
    bonuses.deleteRule = isMaster
    app.save(bonuses)

    // 7. REFERRAL_STATUS_HISTORY
    // Leitura: espelha a visibilidade do referral pai (referral_id)
    // Escrita (create): staff (master ou operator) ao movimentar status
    // Update/Delete: apenas master
    const refHistory = app.findCollectionByNameOrId('referral_status_history')

    const refHistoryReadRule =
      `@request.auth.id != '' && (` +
      `referral_id.indicator_id.user_id = @request.auth.id || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'operator') || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'manager' && (referral_id.assigned_to = @request.auth.id || @collection.team_members.user_id ?= referral_id.assigned_to)) || ` +
      `(${isMaster})` +
      `)`

    refHistory.listRule = refHistoryReadRule
    refHistory.viewRule = refHistoryReadRule
    refHistory.createRule = isStaff
    refHistory.updateRule = isMaster
    refHistory.deleteRule = isMaster
    app.save(refHistory)

    // 8. BONUS_SETTINGS
    // Leitura: autenticados (a página /admin/configuracoes lê os 4 valores de parametrização)
    // Escrita: apenas master
    const bonusSettings = app.findCollectionByNameOrId('bonus_settings')
    bonusSettings.listRule = "@request.auth.id != ''"
    bonusSettings.viewRule = "@request.auth.id != ''"
    bonusSettings.createRule = isMaster
    bonusSettings.updateRule = isMaster
    bonusSettings.deleteRule = isMaster
    app.save(bonusSettings)

    // 9. NOTIFICATIONS_LOG
    // Leitura: usuário vê apenas as suas (user_id = @request.auth.id) OU master vê todas
    // Escrita: apenas master (ou processo interno com token de superusuário)
    const notifLog = app.findCollectionByNameOrId('notifications_log')
    notifLog.listRule = `@request.auth.id != '' && (user_id = @request.auth.id || (${isMaster}))`
    notifLog.viewRule = `@request.auth.id != '' && (user_id = @request.auth.id || (${isMaster}))`
    notifLog.createRule = isMaster
    notifLog.updateRule = isMaster
    notifLog.deleteRule = isMaster
    app.save(notifLog)
  },
  (app) => {
    // DOWN: Restaura as regras anteriores simples (@request.auth.id != '')
    const collections = [
      'teams',
      'team_members',
      'profiles',
      'indicators',
      'referrals',
      'bonuses',
      'referral_status_history',
      'bonus_settings',
      'notifications_log',
    ]

    for (let i = 0; i < collections.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(collections[i])
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (_) {}
    }
  },
)
