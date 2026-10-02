migrate(
  (app) => {
    const referrals = app.findCollectionByNameOrId('referrals')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const teams = app.findCollectionByNameOrId('teams')

    // 1. assigned_team_id (relation -> teams)
    if (!referrals.fields.getByName('assigned_team_id')) {
      referrals.fields.add(
        new RelationField({
          name: 'assigned_team_id',
          collectionId: teams.id,
          required: false,
          maxSelect: 1,
        }),
      )
    }

    // 2. assigned_manager_id (relation -> users)
    if (!referrals.fields.getByName('assigned_manager_id')) {
      referrals.fields.add(
        new RelationField({
          name: 'assigned_manager_id',
          collectionId: users.id,
          required: false,
          maxSelect: 1,
        }),
      )
    }

    // 3. assigned_by (relation -> users)
    if (!referrals.fields.getByName('assigned_by')) {
      referrals.fields.add(
        new RelationField({
          name: 'assigned_by',
          collectionId: users.id,
          required: false,
          maxSelect: 1,
        }),
      )
    }

    // 4. assigned_at (date)
    if (!referrals.fields.getByName('assigned_at')) {
      referrals.fields.add(
        new DateField({
          name: 'assigned_at',
          required: false,
        }),
      )
    }

    // 5. Expandir os valores válidos do status
    // sent | in_analysis | in_progress | visited | negotiating | closed_won | closed_lost | paid | cancelled | expired
    const statusField = referrals.fields.getByName('status')
    if (statusField) {
      const allowedStatus = [
        'sent',
        'in_analysis',
        'in_progress',
        'visited',
        'negotiating',
        'closed_won',
        'closed_lost',
        'paid',
        'cancelled',
        'expired',
      ]
      statusField.values = allowedStatus
      statusField.maxSelect = 1
    }

    // 6. Atualizar as API rules de referrals e referral_status_history para considerar assigned_manager_id e assigned_team_id
    const isMaster =
      "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'"

    const referralsReadRule =
      `@request.auth.id != '' && (` +
      `indicator_id.user_id = @request.auth.id || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'operator') || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'manager' && (assigned_manager_id = @request.auth.id || assigned_to = @request.auth.id || (assigned_team_id != '' && assigned_team_id = @collection.profiles.team_id) || @collection.team_members.user_id ?= assigned_to)) || ` +
      `(${isMaster})` +
      `)`

    referrals.listRule = referralsReadRule
    referrals.viewRule = referralsReadRule
    app.save(referrals)

    // Índices auxiliares
    try {
      referrals.addIndex('idx_referrals_assigned_team', false, 'assigned_team_id', '')
      referrals.addIndex('idx_referrals_assigned_manager', false, 'assigned_manager_id', '')
      app.save(referrals)
    } catch (e) {
      console.log('Aviso ao criar índices em referrals:', e)
    }

    // Atualizar regra de leitura em referral_status_history
    const refHistory = app.findCollectionByNameOrId('referral_status_history')
    const refHistoryReadRule =
      `@request.auth.id != '' && (` +
      `referral_id.indicator_id.user_id = @request.auth.id || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'operator') || ` +
      `(@collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'manager' && (referral_id.assigned_manager_id = @request.auth.id || referral_id.assigned_to = @request.auth.id || (referral_id.assigned_team_id != '' && referral_id.assigned_team_id = @collection.profiles.team_id) || @collection.team_members.user_id ?= referral_id.assigned_to)) || ` +
      `(${isMaster})` +
      `)`

    refHistory.listRule = refHistoryReadRule
    refHistory.viewRule = refHistoryReadRule
    app.save(refHistory)
  },
  (app) => {
    try {
      const referrals = app.findCollectionByNameOrId('referrals')
      if (referrals.fields.getByName('assigned_team_id')) {
        referrals.fields.removeByName('assigned_team_id')
      }
      if (referrals.fields.getByName('assigned_manager_id')) {
        referrals.fields.removeByName('assigned_manager_id')
      }
      if (referrals.fields.getByName('assigned_by')) {
        referrals.fields.removeByName('assigned_by')
      }
      if (referrals.fields.getByName('assigned_at')) {
        referrals.fields.removeByName('assigned_at')
      }
      app.save(referrals)
    } catch (_) {}
  },
)
