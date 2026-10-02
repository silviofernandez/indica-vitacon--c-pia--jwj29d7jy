migrate(
  (app) => {
    // 1. teams: idx_teams_active ON teams (active)
    const teamsCol = app.findCollectionByNameOrId('teams')
    teamsCol.addIndex('idx_teams_active', false, 'active', '')
    app.save(teamsCol)

    // 2. referrals: idx_referrals_property_type ON referrals (property_type)
    const referralsCol = app.findCollectionByNameOrId('referrals')
    referralsCol.addIndex('idx_referrals_property_type', false, 'property_type', '')
    app.save(referralsCol)

    // 3. team_members: uk_team_user UNIQUE (team_id, user_id)
    // Desduplicação defensiva caso existam duplicados antes de aplicar índice UNIQUE
    app
      .db()
      .newQuery(
        `
      DELETE FROM team_members WHERE id NOT IN (
        SELECT MIN(id) FROM team_members GROUP BY team_id, user_id
      ) AND team_id IS NOT NULL AND user_id IS NOT NULL
    `,
      )
      .execute()

    const teamMembersCol = app.findCollectionByNameOrId('team_members')
    teamMembersCol.addIndex('uk_team_user', true, 'team_id, user_id', '')
    app.save(teamMembersCol)
  },
  (app) => {
    try {
      const teamsCol = app.findCollectionByNameOrId('teams')
      teamsCol.removeIndex('idx_teams_active')
      app.save(teamsCol)
    } catch (_) {}

    try {
      const referralsCol = app.findCollectionByNameOrId('referrals')
      referralsCol.removeIndex('idx_referrals_property_type')
      app.save(referralsCol)
    } catch (_) {}

    try {
      const teamMembersCol = app.findCollectionByNameOrId('team_members')
      teamMembersCol.removeIndex('uk_team_user')
      app.save(teamMembersCol)
    } catch (_) {}
  },
)
