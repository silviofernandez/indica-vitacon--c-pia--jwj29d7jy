migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('bonus_settings')

    const seeds = [
      {
        key: 'rental_fixed_amount',
        value: '200',
        description: 'Valor fixo padrão (R$) pago ao indicador por locação concluída com sucesso',
      },
      {
        key: 'buyer_percent',
        value: '0.5',
        description:
          'Percentual (%) de bônus sobre o valor da transação para indicação de comprador',
      },
      {
        key: 'sale_percent',
        value: '1',
        description:
          'Percentual (%) de bônus sobre o valor da transação para indicação de venda/proprietário',
      },
      {
        key: 'vitacon_percent',
        value: '1',
        description: 'Percentual (%) de bônus sobre unidades ou projetos parceiros Vitacon',
      },
    ]

    for (let i = 0; i < seeds.length; i++) {
      const item = seeds[i]
      try {
        app.findFirstRecordByData('bonus_settings', 'key', item.key)
        // já existe, não duplica
      } catch (_) {
        const record = new Record(col)
        record.set('key', item.key)
        record.set('value', item.value)
        record.set('description', item.description)
        app.save(record)
      }
    }
  },
  (app) => {
    const keys = ['rental_fixed_amount', 'buyer_percent', 'sale_percent', 'vitacon_percent']
    for (let i = 0; i < keys.length; i++) {
      try {
        const record = app.findFirstRecordByData('bonus_settings', 'key', keys[i])
        app.delete(record)
      } catch (_) {}
    }
  },
)
