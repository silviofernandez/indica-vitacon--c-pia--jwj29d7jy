/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir que o usuário master@vitacon.com esteja configurado
    let masterUser = null
    try {
      masterUser = app.findAuthRecordByEmail('_pb_users_auth_', 'master@vitacon.com')
      masterUser.setPassword('Skip@Vitacon2026')
      masterUser.setVerified(true)
      masterUser.set('name', 'Admin Master Vitacon')
      app.save(masterUser)
    } catch (_) {
      try {
        const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
        masterUser = new Record(usersCol)
        masterUser.setEmail('master@vitacon.com')
        masterUser.setPassword('Skip@Vitacon2026')
        masterUser.setVerified(true)
        masterUser.set('name', 'Admin Master Vitacon')
        app.save(masterUser)
      } catch (err) {
        console.log('Aviso ao criar masterUser:', err)
      }
    }

    if (masterUser) {
      try {
        const profilesCol = app.findCollectionByNameOrId('profiles')
        let masterProfile = null
        try {
          masterProfile = app.findFirstRecordByData('profiles', 'user_id', masterUser.id)
        } catch (_) {}

        if (!masterProfile) {
          masterProfile = new Record(profilesCol)
          masterProfile.set('user_id', masterUser.id)
          masterProfile.set('name', 'Admin Master Vitacon')
          masterProfile.set('email', 'master@vitacon.com')
          masterProfile.set('role', 'master')
          masterProfile.set('must_change_password', false)
          app.save(masterProfile)
        } else {
          masterProfile.set('role', 'master')
          masterProfile.set('must_change_password', false)
          app.save(masterProfile)
        }
      } catch (e) {
        console.log('Aviso ao sincronizar profile master:', e)
      }
    }

    // 2. Criar ou sincronizar Indicador de Demonstração com Unidade Comprada
    // gabsilvio@gmail.com como cliente indicador autorizado com unidade no ON Paulista
    try {
      let empPaulista = null
      let uniVendida = null
      try {
        empPaulista = app.findFirstRecordByData('empreendimentos', 'nome', 'ON Paulista Vitacon')
      } catch (_) {}

      if (empPaulista) {
        try {
          uniVendida = app.findFirstRecordByData('unidades', 'identificacao', 'Apto 804 - Torre A')
        } catch (_) {}
      }

      // Sincronizar registro do indicator gabsilvio@gmail.com
      let indRecord = null
      try {
        indRecord = app.findFirstRecordByData('indicators', 'email', 'gabsilvio@gmail.com')
      } catch (_) {}

      if (indRecord) {
        indRecord.set('autorizado', true)
        indRecord.set('approved', true)
        indRecord.set('approval_status', 'approved')
        if (empPaulista) indRecord.set('empreendimento_id', empPaulista.id)
        if (uniVendida) {
          indRecord.set('unidade_comprada_id', uniVendida.id)
          indRecord.set('unidade_descricao', 'Apto 804 - Torre A (24m²)')
        }
        app.save(indRecord)

        // 3. Criar indicações de exemplo nos 6 estágios para visualização rica
        const refCol = app.findCollectionByNameOrId('referrals')
        const existingRefs = app.findRecordsByFilter(
          'referrals',
          `indicator_id = "${indRecord.id}"`,
          '-created',
          1,
        )

        if (existingRefs.length === 0) {
          // Exemplo 1: Proposta em andamento (Estágio 5)
          let uniStudio1202 = null
          try {
            uniStudio1202 = app.findFirstRecordByData(
              'unidades',
              'identificacao',
              'Studio 1202 - Torre A',
            )
          } catch (_) {}

          const r1 = new Record(refCol)
          r1.set('indicator_id', indRecord.id)
          r1.set('client_name', 'Mariana Ribeiro')
          r1.set('client_phone', '11987654321')
          r1.set('client_email', 'mariana.ribeiro@exemplo.com')
          r1.set('property_type', 'vitacon')
          if (empPaulista) r1.set('empreendimento_id', empPaulista.id)
          if (uniStudio1202) {
            r1.set('unidade_escolhida_id', uniStudio1202.id)
            r1.set('valor_compra', 490000)
            r1.set('comissao_calculada', 4900)
            r1.set('comissao_regra_aplicada', '1% sobre o valor da compra')
          }
          r1.set('estagio', 'proposta')
          r1.set('status', 'in_progress')
          r1.set(
            'notes',
            'Cliente gostou muito do conceito Smart Living e já enviou documentação para a proposta.',
          )
          app.save(r1)

          // Exemplo 2: Fechamento com compra realizada (Estágio 6)
          let uniStudio1505 = null
          try {
            uniStudio1505 = app.findFirstRecordByData(
              'unidades',
              'identificacao',
              'Studio 1505 - Torre B',
            )
          } catch (_) {}

          const r2 = new Record(refCol)
          r2.set('indicator_id', indRecord.id)
          r2.set('client_name', 'Carlos Eduardo Mendes')
          r2.set('client_phone', '11976543210')
          r2.set('client_email', 'carlos.mendes@exemplo.com')
          r2.set('property_type', 'vitacon')
          if (empPaulista) r2.set('empreendimento_id', empPaulista.id)
          if (uniStudio1505) {
            r2.set('unidade_escolhida_id', uniStudio1505.id)
            r2.set('valor_compra', 560000)
            r2.set('comissao_calculada', 5600)
            r2.set('comissao_regra_aplicada', '1% sobre o valor da compra')
          }
          r2.set('estagio', 'fechamento')
          r2.set('status', 'closed_won')
          r2.set(
            'notes',
            'Contrato assinado e pagamento de entrada confirmado. Comissão garantida ao indicador.',
          )
          app.save(r2)

          // Exemplo 3: Reunião realizada (Estágio 2)
          let empFariaLima = null
          try {
            empFariaLima = app.findFirstRecordByData(
              'empreendimentos',
              'nome',
              'VN Faria Lima Vitacon',
            )
          } catch (_) {}

          const r3 = new Record(refCol)
          r3.set('indicator_id', indRecord.id)
          r3.set('client_name', 'Fernanda Souza')
          r3.set('client_phone', '11991234567')
          r3.set('client_email', 'fernanda.souza@exemplo.com')
          r3.set('property_type', 'vitacon')
          if (empFariaLima) r3.set('empreendimento_id', empFariaLima.id)
          r3.set('valor_compra', 580000)
          r3.set('comissao_calculada', 5800)
          r3.set('comissao_regra_aplicada', '1% sobre o valor da compra')
          r3.set('estagio', 'reuniao_realizada')
          r3.set('status', 'in_analysis')
          r3.set(
            'notes',
            'Primeira apresentação realizada via videoconferência. Interessada em estúdios para renda.',
          )
          app.save(r3)
        }
      }
    } catch (e) {
      console.log('Aviso ao sincronizar indicador e referrals de exemplo:', e)
    }
  },
  () => {},
)
