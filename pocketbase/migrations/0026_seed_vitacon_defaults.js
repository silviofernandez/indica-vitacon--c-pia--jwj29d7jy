/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Seed da configuração inicial de recompensa (default: 1% percentual)
    try {
      const configCol = app.findCollectionByNameOrId('config_recompensa')
      const existing = app.findRecordsByFilter('config_recompensa', 'ativo = true', '-created', 1)
      if (existing.length === 0) {
        const rec = new Record(configCol)
        rec.set('tipo', 'percentual')
        rec.set('valor', 1)
        rec.set('descricao', 'Comissão padrão Vitacon de 1% sobre o valor da compra da unidade')
        rec.set('ativo', true)
        app.save(rec)
      }
    } catch (e) {
      console.log('Aviso ao criar seed config_recompensa:', e)
    }

    // 2. Seed de Empreendimentos Vitacon de Exemplo
    let empOnPaulista = null
    let empVitrace = null
    try {
      const empCol = app.findCollectionByNameOrId('empreendimentos')
      const existingEmps = app.findRecordsByFilter('empreendimentos', '', '-created', 10)
      if (existingEmps.length === 0) {
        empOnPaulista = new Record(empCol)
        empOnPaulista.set('nome', 'ON Paulista Vitacon')
        empOnPaulista.set('bairro', 'Bela Vista / Paulista')
        empOnPaulista.set('cidade', 'São Paulo - SP')
        empOnPaulista.set('status_obra', 'Pronto para morar')
        empOnPaulista.set(
          'descricao',
          'Estúdios inteligentes a 200m da Av. Paulista e metrô Brigadeiro',
        )
        empOnPaulista.set('ativo', true)
        app.save(empOnPaulista)

        empVitrace = new Record(empCol)
        empVitrace.set('nome', 'VN Faria Lima Vitacon')
        empVitrace.set('bairro', 'Itaim Bibi / Faria Lima')
        empVitrace.set('cidade', 'São Paulo - SP')
        empVitrace.set('status_obra', 'Em obras avançadas')
        empVitrace.set('descricao', 'Conceito Smart Living no coração financeiro de São Paulo')
        empVitrace.set('ativo', true)
        app.save(empVitrace)

        const empOscar = new Record(empCol)
        empOscar.set('nome', 'VN Oscar Freire Vitacon')
        empOscar.set('bairro', 'Pinheiros / Jardins')
        empOscar.set('cidade', 'São Paulo - SP')
        empOscar.set('status_obra', 'Pronto para morar')
        empOscar.set('descricao', 'Design assinado e máxima rentabilidade de locação')
        empOscar.set('ativo', true)
        app.save(empOscar)
      } else {
        empOnPaulista = existingEmps[0]
      }
    } catch (e) {
      console.log('Aviso ao criar seed empreendimentos:', e)
    }

    // 3. Seed de Unidades dos Empreendimentos
    try {
      if (empOnPaulista) {
        const uniCol = app.findCollectionByNameOrId('unidades')
        const existingUnis = app.findRecordsByFilter('unidades', '', '-created', 10)
        if (existingUnis.length === 0) {
          const u1 = new Record(uniCol)
          u1.set('empreendimento_id', empOnPaulista.id)
          u1.set('identificacao', 'Apto 804 - Torre A')
          u1.set('torre', 'Torre A')
          u1.set('metragem', 24)
          u1.set('valor', 420000)
          u1.set('status', 'vendida')
          app.save(u1)

          const u2 = new Record(uniCol)
          u2.set('empreendimento_id', empOnPaulista.id)
          u2.set('identificacao', 'Studio 1202 - Torre A')
          u2.set('torre', 'Torre A')
          u2.set('metragem', 28)
          u2.set('valor', 490000)
          u2.set('status', 'disponivel')
          app.save(u2)

          const u3 = new Record(uniCol)
          u3.set('empreendimento_id', empOnPaulista.id)
          u3.set('identificacao', 'Studio 1505 - Torre B')
          u3.set('torre', 'Torre B')
          u3.set('metragem', 32)
          u3.set('valor', 560000)
          u3.set('status', 'disponivel')
          app.save(u3)

          if (empVitrace) {
            const u4 = new Record(uniCol)
            u4.set('empreendimento_id', empVitrace.id)
            u4.set('identificacao', 'Studio 603 - Torre Única')
            u4.set('torre', 'Torre Única')
            u4.set('metragem', 26)
            u4.set('valor', 580000)
            u4.set('status', 'disponivel')
            app.save(u4)

            const u5 = new Record(uniCol)
            u5.set('empreendimento_id', empVitrace.id)
            u5.set('identificacao', 'Studio 1108 - Torre Única')
            u5.set('torre', 'Torre Única')
            u5.set('metragem', 34)
            u5.set('valor', 720000)
            u5.set('status', 'disponivel')
            app.save(u5)
          }
        }
      }
    } catch (e) {
      console.log('Aviso ao criar seed unidades:', e)
    }

    // 4. Seed do Master Vitacon (master@vitacon.com / Skip@Vitacon2026)
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      let masterUser = null
      try {
        masterUser = app.findAuthRecordByEmail('_pb_users_auth_', 'master@vitacon.com')
      } catch (_) {
        masterUser = new Record(usersCol)
        masterUser.setEmail('master@vitacon.com')
        masterUser.setPassword('Skip@Vitacon2026')
        masterUser.setVerified(true)
        masterUser.set('name', 'Admin Master Vitacon')
        app.save(masterUser)
      }

      // Perfil do master
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
          app.save(masterProfile)
        }
      } catch (profErr) {
        console.log('Aviso ao criar profile master@vitacon.com:', profErr)
      }
    } catch (e) {
      console.log('Aviso ao criar user master@vitacon.com:', e)
    }
  },
  (app) => {
    try {
      const u = app.findAuthRecordByEmail('_pb_users_auth_', 'master@vitacon.com')
      app.delete(u)
    } catch (_) {}
  },
)
