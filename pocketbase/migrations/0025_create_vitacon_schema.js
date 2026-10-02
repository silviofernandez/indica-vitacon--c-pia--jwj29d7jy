/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. empreendimentos
    let empreendimentosCol
    try {
      empreendimentosCol = app.findCollectionByNameOrId('empreendimentos')
    } catch (_) {
      empreendimentosCol = new Collection({
        name: 'empreendimentos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        updateRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        deleteRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'bairro', type: 'text' },
          { name: 'cidade', type: 'text' },
          { name: 'status_obra', type: 'text' },
          { name: 'descricao', type: 'text' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_empreendimentos_nome ON empreendimentos (nome)'],
      })
      app.save(empreendimentosCol)
    }

    const empreendimentosId = app.findCollectionByNameOrId('empreendimentos').id

    // 2. unidades
    let unidadesCol
    try {
      unidadesCol = app.findCollectionByNameOrId('unidades')
    } catch (_) {
      unidadesCol = new Collection({
        name: 'unidades',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        updateRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        deleteRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        fields: [
          {
            name: 'empreendimento_id',
            type: 'relation',
            required: true,
            collectionId: empreendimentosId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'identificacao', type: 'text', required: true },
          { name: 'torre', type: 'text' },
          { name: 'metragem', type: 'number' },
          { name: 'valor', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['disponivel', 'vendida', 'reservada'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_unidades_emp ON unidades (empreendimento_id)',
          'CREATE INDEX idx_unidades_ident ON unidades (identificacao)',
        ],
      })
      app.save(unidadesCol)
    }

    const unidadesId = app.findCollectionByNameOrId('unidades').id

    // 3. config_recompensa
    let configRecompensaCol
    try {
      configRecompensaCol = app.findCollectionByNameOrId('config_recompensa')
    } catch (_) {
      configRecompensaCol = new Collection({
        name: 'config_recompensa',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        updateRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        deleteRule:
          "@request.auth.id != '' && @collection.profiles.user_id ?= @request.auth.id && @collection.profiles.role ?= 'master'",
        fields: [
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['percentual', 'valor_fixo'],
            maxSelect: 1,
          },
          { name: 'valor', type: 'number', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(configRecompensaCol)
    }

    // 4. Adicionar campos em 'indicators' para vincular a unidade adquirida na Vitacon
    try {
      const indicators = app.findCollectionByNameOrId('indicators')
      let changed = false

      if (!indicators.fields.getByName('unidade_comprada_id')) {
        indicators.fields.add(
          new RelationField({
            name: 'unidade_comprada_id',
            required: false,
            collectionId: unidadesId,
            maxSelect: 1,
          }),
        )
        changed = true
      }

      if (!indicators.fields.getByName('empreendimento_id')) {
        indicators.fields.add(
          new RelationField({
            name: 'empreendimento_id',
            required: false,
            collectionId: empreendimentosId,
            maxSelect: 1,
          }),
        )
        changed = true
      }

      if (!indicators.fields.getByName('unidade_descricao')) {
        indicators.fields.add(
          new TextField({
            name: 'unidade_descricao',
            required: false,
          }),
        )
        changed = true
      }

      if (!indicators.fields.getByName('autorizado')) {
        indicators.fields.add(
          new BoolField({
            name: 'autorizado',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(indicators)
      }
    } catch (e) {
      console.log('Aviso ao adicionar campos em indicators:', e)
    }

    // 5. Adicionar campos em 'referrals' para Vitacon
    try {
      const referrals = app.findCollectionByNameOrId('referrals')
      let changed = false

      if (!referrals.fields.getByName('empreendimento_id')) {
        referrals.fields.add(
          new RelationField({
            name: 'empreendimento_id',
            required: false,
            collectionId: empreendimentosId,
            maxSelect: 1,
          }),
        )
        changed = true
      }

      if (!referrals.fields.getByName('unidade_escolhida_id')) {
        referrals.fields.add(
          new RelationField({
            name: 'unidade_escolhida_id',
            required: false,
            collectionId: unidadesId,
            maxSelect: 1,
          }),
        )
        changed = true
      }

      if (!referrals.fields.getByName('estagio')) {
        referrals.fields.add(
          new SelectField({
            name: 'estagio',
            required: false,
            values: [
              'lead_enviado',
              'reuniao_realizada',
              'gostou',
              'ficou_de_pensar',
              'proposta',
              'fechamento',
            ],
            maxSelect: 1,
          }),
        )
        changed = true
      }

      if (!referrals.fields.getByName('valor_compra')) {
        referrals.fields.add(
          new NumberField({
            name: 'valor_compra',
            required: false,
          }),
        )
        changed = true
      }

      if (!referrals.fields.getByName('comissao_calculada')) {
        referrals.fields.add(
          new NumberField({
            name: 'comissao_calculada',
            required: false,
          }),
        )
        changed = true
      }

      if (!referrals.fields.getByName('comissao_regra_aplicada')) {
        referrals.fields.add(
          new TextField({
            name: 'comissao_regra_aplicada',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(referrals)
      }
    } catch (e) {
      console.log('Aviso ao adicionar campos em referrals:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('config_recompensa')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('unidades')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('empreendimentos')
      app.delete(col)
    } catch (_) {}
  },
)
