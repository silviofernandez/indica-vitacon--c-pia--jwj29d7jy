migrate(
  (app) => {
    // Collection reports: armazena relatórios gerados em PDF e Excel
    // Campos:
    // - owner (relation -> users): usuário que solicitou / dono do relatório
    // - kind (select: indicator, financial): tipo de relatório
    // - format (select: pdf, excel): formato do arquivo
    // - file (file): arquivo gerado
    // - metadata (json): dados extras (ex: período, totais)
    // Regras de acesso:
    // - list/view: dono vê os seus, ou usuários com role 'master' vêem tudo
    // - create: autenticado
    // - update: superusers / master
    // - delete: superusers / master ou dono
    const reportsCol = new Collection({
      name: 'reports',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.email = 'gabsilvio@gmail.com')",
      viewRule:
        "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.email = 'gabsilvio@gmail.com')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.email = 'gabsilvio@gmail.com')",
      deleteRule:
        "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.email = 'gabsilvio@gmail.com')",
      fields: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'kind',
          type: 'select',
          required: true,
          values: ['indicator', 'financial'],
          maxSelect: 1,
        },
        {
          name: 'format',
          type: 'select',
          required: true,
          values: ['pdf', 'excel'],
          maxSelect: 1,
        },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 15728640, // 15MB
          mimeTypes: [
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/octet-stream',
          ],
        },
        {
          name: 'metadata',
          type: 'json',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_reports_owner ON reports (owner)',
        'CREATE INDEX idx_reports_kind ON reports (kind)',
        'CREATE INDEX idx_reports_format ON reports (format)',
        'CREATE INDEX idx_reports_created ON reports (created DESC)',
      ],
    })

    app.save(reportsCol)
  },
  (app) => {
    try {
      const reportsCol = app.findCollectionByNameOrId('reports')
      app.delete(reportsCol)
    } catch (_) {}
  },
)
