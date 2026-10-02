migrate(
  (app) => {
    // 1. teams (precisa existir antes de profiles poder referenciar team_id)
    const teamsCol = new Collection({
      name: 'teams',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'leader_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_teams_leader ON teams (leader_id)'],
    })
    app.save(teamsCol)

    // 2. profiles (ligado a users e opcionalmente a teams)
    const teamsId = app.findCollectionByNameOrId('teams').id
    const profilesCol = new Collection({
      name: 'profiles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'phone', type: 'text' },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['indicador', 'master', 'operator', 'manager'],
          maxSelect: 1,
        },
        {
          name: 'team_id',
          type: 'relation',
          collectionId: teamsId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_profiles_user ON profiles (user_id)',
        'CREATE INDEX idx_profiles_role ON profiles (role)',
        'CREATE INDEX idx_profiles_team ON profiles (team_id)',
      ],
    })
    app.save(profilesCol)

    // 3. indicators (perfil financeiro/cadastral do indicador)
    const indicatorsCol = new Collection({
      name: 'indicators',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'full_name', type: 'text', required: true },
        { name: 'cpf_cnpj', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'pix_key', type: 'text' },
        {
          name: 'pix_key_type',
          type: 'select',
          values: ['cpf', 'cnpj', 'email', 'phone', 'random'],
          maxSelect: 1,
        },
        { name: 'bank_info', type: 'json' },
        { name: 'approved', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_indicators_user ON indicators (user_id)',
        'CREATE INDEX idx_indicators_approved ON indicators (approved)',
      ],
    })
    app.save(indicatorsCol)

    // 4. team_members (membros da equipa)
    const teamMembersCol = new Collection({
      name: 'team_members',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'team_id',
          type: 'relation',
          required: true,
          collectionId: teamsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'role_in_team',
          type: 'select',
          required: true,
          values: ['leader', 'member'],
          maxSelect: 1,
        },
        { name: 'joined_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_team_members_team ON team_members (team_id)',
        'CREATE INDEX idx_team_members_user ON team_members (user_id)',
      ],
    })
    app.save(teamMembersCol)

    // 5. referrals (entidade central de indicações)
    const indicatorsId = app.findCollectionByNameOrId('indicators').id
    const referralsCol = new Collection({
      name: 'referrals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'indicator_id',
          type: 'relation',
          required: true,
          collectionId: indicatorsId,
          maxSelect: 1,
        },
        { name: 'client_name', type: 'text', required: true },
        { name: 'client_phone', type: 'text', required: true },
        { name: 'client_email', type: 'text' },
        { name: 'property_description', type: 'text' },
        {
          name: 'property_type',
          type: 'select',
          required: true,
          values: ['rental', 'sale', 'vitacon'],
          maxSelect: 1,
        },
        { name: 'expected_value', type: 'number' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['sent', 'in_analysis', 'visited', 'negotiating', 'closed_won', 'closed_lost'],
          maxSelect: 1,
        },
        {
          name: 'assigned_to',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_referrals_indicator ON referrals (indicator_id)',
        'CREATE INDEX idx_referrals_status ON referrals (status)',
        'CREATE INDEX idx_referrals_assigned ON referrals (assigned_to)',
      ],
    })
    app.save(referralsCol)

    // 6. referral_status_history (histórico de auditoria)
    const referralsId = app.findCollectionByNameOrId('referrals').id
    const referralHistoryCol = new Collection({
      name: 'referral_status_history',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'old_status', type: 'text' },
        { name: 'new_status', type: 'text', required: true },
        {
          name: 'changed_by',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_refhist_referral ON referral_status_history (referral_id)',
        'CREATE INDEX idx_refhist_changedby ON referral_status_history (changed_by)',
      ],
    })
    app.save(referralHistoryCol)

    // 7. bonuses (bônus calculados por indicação)
    const bonusesCol = new Collection({
      name: 'bonuses',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsId,
          maxSelect: 1,
        },
        {
          name: 'indicator_id',
          type: 'relation',
          required: true,
          collectionId: indicatorsId,
          maxSelect: 1,
        },
        {
          name: 'bonus_type',
          type: 'select',
          required: true,
          values: ['rental_fixed', 'buyer_percent', 'sale_percent', 'vitacon_percent'],
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'approved', 'paid'],
          maxSelect: 1,
        },
        { name: 'paid_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bonuses_referral ON bonuses (referral_id)',
        'CREATE INDEX idx_bonuses_indicator ON bonuses (indicator_id)',
        'CREATE INDEX idx_bonuses_status ON bonuses (status)',
      ],
    })
    app.save(bonusesCol)

    // 8. bonus_settings (tabela chave/valor de configuração de bônus)
    const bonusSettingsCol = new Collection({
      name: 'bonus_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_bonus_settings_key ON bonus_settings (key)'],
    })
    app.save(bonusSettingsCol)

    // 9. notifications_log (log de notificações internas do sistema)
    const notificationsCol = new Collection({
      name: 'notifications_log',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'referral_id',
          type: 'relation',
          collectionId: referralsId,
          maxSelect: 1,
        },
        { name: 'type', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        { name: 'read', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notif_user ON notifications_log (user_id)',
        'CREATE INDEX idx_notif_referral ON notifications_log (referral_id)',
        'CREATE INDEX idx_notif_read ON notifications_log (read)',
      ],
    })
    app.save(notificationsCol)
  },
  (app) => {
    const list = [
      'notifications_log',
      'bonus_settings',
      'bonuses',
      'referral_status_history',
      'referrals',
      'team_members',
      'indicators',
      'profiles',
      'teams',
    ]
    for (let i = 0; i < list.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(list[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
