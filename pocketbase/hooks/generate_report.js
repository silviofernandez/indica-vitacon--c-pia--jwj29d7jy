routerAdd(
  'POST',
  '/backend/v1/generate-report',
  (e) => {
    // 1. Validação de autenticação
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado. Faça login para continuar.' })
    }

    // 2. Determinar perfil e papel do usuário
    let userRole = ''
    let userProfile = null
    try {
      userProfile = $app.findFirstRecordByData('profiles', 'user_id', authRecord.id)
      if (userProfile) {
        userRole = String(userProfile.get('role') || '').trim()
      }
    } catch (_) {}

    if (!userRole && authRecord.email === 'gabsilvio@gmail.com') {
      userRole = 'master'
    }

    // 3. Obter payload da requisição
    const body = e.requestInfo().body || {}
    const requestedKind = String(body.kind || 'indicator')
      .trim()
      .toLowerCase()
    const requestedFormat = String(body.format || 'pdf')
      .trim()
      .toLowerCase()
    const targetIndicatorId = String(body.indicator_id || '').trim()

    if (requestedKind !== 'indicator' && requestedKind !== 'financial') {
      return e.json(400, {
        error: 'Tipo de relatório inválido. Valores permitidos: "indicator", "financial".',
      })
    }

    if (requestedFormat !== 'pdf' && requestedFormat !== 'excel') {
      return e.json(400, {
        error: 'Formato de relatório inválido. Valores permitidos: "pdf", "excel".',
      })
    }

    // Validação de permissões:
    // - Relatório Financeiro: exclusivo para role 'master' (operator e manager não têm acesso)
    if (requestedKind === 'financial' && userRole !== 'master') {
      return e.json(403, {
        error:
          'Acesso negado. O relatório financeiro de pagamento é exclusivo para administradores Master.',
      })
    }

    // - Relatório do Indicador: indicador logado (vê os seus) ou master
    let indicatorRecord = null
    if (requestedKind === 'indicator') {
      if (userRole === 'master' && targetIndicatorId) {
        try {
          indicatorRecord = $app.findFirstRecordByData('indicators', 'id', targetIndicatorId)
        } catch (_) {}
      }

      if (!indicatorRecord) {
        try {
          indicatorRecord = $app.findFirstRecordByData('indicators', 'user_id', authRecord.id)
        } catch (_) {}
      }

      if (!indicatorRecord && userProfile) {
        try {
          indicatorRecord = $app.findFirstRecordByData('indicators', 'profile_id', userProfile.id)
        } catch (_) {}
      }

      // Se for master e não tiver indicador específico, buscar o primeiro para exemplo ou retornar erro amigável
      if (!indicatorRecord && userRole === 'master') {
        const anyInds = $app.findRecordsByFilter('indicators', '1=1', '-created', 1, 0)
        if (anyInds && anyInds.length > 0) {
          indicatorRecord = anyInds[0]
        }
      }

      if (!indicatorRecord) {
        return e.json(404, {
          error: 'Registro de indicador parceiro não encontrado para o usuário logado.',
        })
      }
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const timestampStr = year + '-' + month + '-' + day + '_' + hours + '-' + minutes
    const dateFormatted = day + '/' + month + '/' + year + ' ' + hours + ':' + minutes

    // 4. Coletar dados e preparar estrutura de linhas
    let fileName = ''
    let fileBytes = []
    let contentType = ''
    let metadata = {}

    // Funções utilitárias locais inline (evita escopo externo de JSVM)
    const formatBRL = (val) => {
      const n = Number(val) || 0
      return (
        'R$ ' +
        n
          .toFixed(2)
          .replace('.', ',')
          .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      )
    }

    const getFriendlyStatus = (st) => {
      const s = String(st || '').toLowerCase()
      if (s === 'sent') return 'Aguardando análise'
      if (s === 'in_analysis' || s === 'in_progress') return 'Em andamento'
      if (s === 'visited') return 'Visita agendada'
      if (s === 'negotiating') return 'Em negociação'
      if (s === 'closed_won' || s === 'closed') return 'Concluída com sucesso'
      if (s === 'paid' || s === 'bonus_paid') return 'Bonificação paga'
      if (s === 'closed_lost' || s === 'cancelled') return 'Cancelada'
      if (s === 'expired') return 'Expirada'
      return s || 'Em análise'
    }

    const getFriendlyPropertyType = (tp) => {
      const t = String(tp || '').toLowerCase()
      if (t === 'vitacon' || t.includes('vitacon')) return 'Vitacon SP'
      if (t === 'rental' || t.includes('alug')) return 'Locação'
      if (t === 'buyer' || t.includes('compra')) return 'Comprador'
      if (t === 'sale' || t.includes('venda')) return 'Venda de Imóvel'
      return 'Imóvel'
    }

    const sanitizeAscii = (str) => {
      return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\\/g, '/')
        .replace(/\(/g, '[')
        .replace(/\)/g, ']')
    }

    // GERADOR DE PDF VETORIAL MÍNIMO (compatível com visualizadores de PDF padrão)
    const buildSimplePdf = (title, subtitle, metaLines, headers, rows, footerNotes) => {
      const pageWidth = 595
      const pageHeight = 842
      const marginLeft = 40
      const marginTop = 790
      const contentWidth = 515

      const streamLines = []
      // Cabeçalho de fundo decorativo no topo
      streamLines.push('0.06 0.16 0.26 rg') // #0f2a43
      streamLines.push('40 760 515 50 re f')

      // Título principal branco
      streamLines.push('BT')
      streamLines.push('/F1 16 Tf')
      streamLines.push('1 1 1 rg')
      streamLines.push('50 785 Td')
      streamLines.push('(' + sanitizeAscii(title) + ') Tj')
      streamLines.push('ET')

      // Subtítulo
      streamLines.push('BT')
      streamLines.push('/F1 9 Tf')
      streamLines.push('0.85 0.6 0.35 rg') // tom dourado #d9995b
      streamLines.push('50 770 Td')
      streamLines.push(
        '(' + sanitizeAscii(subtitle + ' - Indica Gabriel | Imobiliaria Gabriel') + ') Tj',
      )
      streamLines.push('ET')

      let currentY = 740

      // Linhas de Metadados
      streamLines.push('0 0 0 rg')
      for (let m = 0; m < metaLines.length; m++) {
        streamLines.push('BT')
        streamLines.push('/F1 9 Tf')
        streamLines.push('0.2 0.2 0.2 rg')
        streamLines.push(marginLeft + ' ' + currentY + ' Td')
        streamLines.push('(' + sanitizeAscii(metaLines[m]) + ') Tj')
        streamLines.push('ET')
        currentY -= 14
      }

      currentY -= 10

      // Larguras de colunas proporcionais
      const colWidth = Math.floor(contentWidth / headers.length)

      // Cabeçalho da Tabela
      streamLines.push('0.1 0.36 0.56 rg') // #1a5d8f
      streamLines.push(marginLeft + ' ' + (currentY - 4) + ' ' + contentWidth + ' 18 re f')

      for (let h = 0; h < headers.length; h++) {
        const x = marginLeft + h * colWidth + 4
        streamLines.push('BT')
        streamLines.push('/F1 8 Tf')
        streamLines.push('1 1 1 rg')
        streamLines.push(x + ' ' + currentY + ' Td')
        streamLines.push('(' + sanitizeAscii(headers[h]) + ') Tj')
        streamLines.push('ET')
      }

      currentY -= 20

      // Linhas da Tabela
      for (let r = 0; r < rows.length; r++) {
        if (currentY < 70) break // Limite de 1 página por simplicidade ou até caber

        const row = rows[r]
        // Fundo alternado
        if (r % 2 === 1) {
          streamLines.push('0.96 0.96 0.96 rg')
          streamLines.push(marginLeft + ' ' + (currentY - 3) + ' ' + contentWidth + ' 14 re f')
        }

        for (let c = 0; c < row.length; c++) {
          const x = marginLeft + c * colWidth + 4
          const cellText = String(row[c] || '').slice(0, 24)
          streamLines.push('BT')
          streamLines.push('/F1 8 Tf')
          streamLines.push('0.15 0.15 0.15 rg')
          streamLines.push(x + ' ' + currentY + ' Td')
          streamLines.push('(' + sanitizeAscii(cellText) + ') Tj')
          streamLines.push('ET')
        }

        currentY -= 15
      }

      currentY -= 10

      // Notas e Totais no Rodapé
      if (footerNotes && footerNotes.length > 0) {
        streamLines.push('0.85 0.85 0.85 rg')
        streamLines.push(marginLeft + ' ' + currentY + ' ' + contentWidth + ' 0.5 re f')
        currentY -= 14

        for (let fn = 0; fn < footerNotes.length; fn++) {
          streamLines.push('BT')
          streamLines.push('/F1 9 Tf')
          streamLines.push('0.1 0.1 0.1 rg')
          streamLines.push(marginLeft + ' ' + currentY + ' Td')
          streamLines.push('(' + sanitizeAscii(footerNotes[fn]) + ') Tj')
          streamLines.push('ET')
          currentY -= 14
        }
      }

      // Rodapé fixo da página
      streamLines.push('BT')
      streamLines.push('/F1 7 Tf')
      streamLines.push('0.5 0.5 0.5 rg')
      streamLines.push(marginLeft + ' 30 Td')
      streamLines.push(
        '(Indica Gabriel - Imobiliaria Gabriel | Documento gerado automaticamente em ' +
          sanitizeAscii(dateFormatted) +
          ') Tj',
      )
      streamLines.push('ET')

      const streamContent = streamLines.join('\n')
      const streamLen = streamContent.length

      const pdfParts = []
      pdfParts.push('%PDF-1.4\n')
      pdfParts.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
      pdfParts.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
      pdfParts.push(
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
      )
      pdfParts.push(
        '4 0 obj\n<< /Length ' +
          streamLen +
          ' >>\nstream\n' +
          streamContent +
          '\nendstream\nendobj\n',
      )
      pdfParts.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')

      const xrefOffset = pdfParts.join('').length
      pdfParts.push('xref\n0 6\n0000000000 65535 f \n')
      // Calcula offsets dos 5 objetos
      let acc = 0
      const objOffsets = [0]
      for (let i = 0; i < 5; i++) {
        acc += pdfParts[i].length
        objOffsets.push(acc)
      }

      pdfParts.push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF')

      const fullPdfStr = pdfParts.join('')
      const bytes = []
      for (let b = 0; b < fullPdfStr.length; b++) {
        bytes.push(fullPdfStr.charCodeAt(b) & 0xff)
      }
      return bytes
    }

    // GERADOR DE EXCEL (XLSX / XML Spreadsheet 2003 compatível com Excel sem libs pesadas)
    // O formato XML Spreadsheet 2003 abre nativamente no Microsoft Excel, LibreOffice e Google Sheets mantendo formatação e colunas
    const buildExcelXml = (sheetName, title, headers, rows, summaryRows) => {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
      xml += '<?mso-application progid="Excel.Sheet"?>\n'
      xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n'
      xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n'
      xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n'
      xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n'
      xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n'
      xml += ' <Styles>\n'
      xml += '  <Style ss:ID="Default" ss:Name="Normal">\n'
      xml += '   <Alignment ss:Vertical="Center"/>\n'
      xml += '   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>\n'
      xml += '  </Style>\n'
      xml += '  <Style ss:ID="TitleStyle">\n'
      xml += '   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0F2A43"/>\n'
      xml += '  </Style>\n'
      xml += '  <Style ss:ID="SubTitleStyle">\n'
      xml += '   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#666666"/>\n'
      xml += '  </Style>\n'
      xml += '  <Style ss:ID="HeaderStyle">\n'
      xml += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n'
      xml += '   <Borders>\n'
      xml +=
        '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>\n'
      xml += '   </Borders>\n'
      xml += '   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>\n'
      xml += '   <Interior ss:Color="#1A5D8F" ss:Pattern="Solid"/>\n'
      xml += '  </Style>\n'
      xml += '  <Style ss:ID="CurrencyStyle">\n'
      xml += '   <NumberFormat ss:Format="&quot;R$&quot;\ #,##0.00"/>\n'
      xml += '   <Alignment ss:Horizontal="Right"/>\n'
      xml += '  </Style>\n'
      xml += '  <Style ss:ID="TotalStyle">\n'
      xml += '   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F2A43"/>\n'
      xml += '   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>\n'
      xml += '   <Borders>\n'
      xml +=
        '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>\n'
      xml +=
        '    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#94A3B8"/>\n'
      xml += '   </Borders>\n'
      xml += '  </Style>\n'
      xml += ' </Styles>\n'
      xml +=
        ' <Worksheet ss:Name="' + (sheetName || 'Relatorio').replace(/[:\\/?*\[\]]/g, '') + '">\n'
      xml += '  <Table ss:DefaultRowHeight="20">\n'

      // Largura das colunas
      for (let c = 0; c < headers.length; c++) {
        xml += '   <Column ss:Width="140"/>\n'
      }

      // Título
      xml += '   <Row ss:Height="26">\n'
      xml +=
        '    <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">' + title + '</Data></Cell>\n'
      xml += '   </Row>\n'
      xml += '   <Row ss:Height="18">\n'
      xml +=
        '    <Cell ss:StyleID="SubTitleStyle"><Data ss:Type="String">Indica Gabriel - Gerado em ' +
        dateFormatted +
        '</Data></Cell>\n'
      xml += '   </Row>\n'
      xml += '   <Row ss:Height="10"></Row>\n' // linha em branco

      // Cabeçalhos
      xml += '   <Row ss:Height="24">\n'
      for (let h = 0; h < headers.length; h++) {
        xml +=
          '    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">' +
          headers[h] +
          '</Data></Cell>\n'
      }
      xml += '   </Row>\n'

      // Linhas de dados
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]
        xml += '   <Row>\n'
        for (let c = 0; c < row.length; c++) {
          const val = row[c]
          const isNum = typeof val === 'number'
          const isCurr = typeof val === 'string' && val.startsWith('R$')
          if (isNum) {
            xml += '    <Cell><Data ss:Type="Number">' + val + '</Data></Cell>\n'
          } else if (isCurr) {
            const rawNum =
              parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0
            xml +=
              '    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">' +
              rawNum +
              '</Data></Cell>\n'
          } else {
            const safeStr = String(val || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
            xml += '    <Cell><Data ss:Type="String">' + safeStr + '</Data></Cell>\n'
          }
        }
        xml += '   </Row>\n'
      }

      // Linhas de totais
      if (summaryRows && summaryRows.length > 0) {
        xml += '   <Row ss:Height="10"></Row>\n'
        for (let s = 0; s < summaryRows.length; s++) {
          const sumRow = summaryRows[s]
          xml += '   <Row ss:StyleID="TotalStyle">\n'
          for (let sc = 0; sc < sumRow.length; sc++) {
            const sVal = sumRow[sc]
            const isCurr = typeof sVal === 'string' && sVal.startsWith('R$')
            if (isCurr) {
              const rawNum =
                parseFloat(sVal.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0
              xml +=
                '    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">' +
                rawNum +
                '</Data></Cell>\n'
            } else {
              xml += '    <Cell><Data ss:Type="String">' + String(sVal || '') + '</Data></Cell>\n'
            }
          }
          xml += '   </Row>\n'
        }
      }

      xml += '  </Table>\n'
      xml += ' </Worksheet>\n'
      xml += '</Workbook>\n'

      // Converte string XML UTF-8 em array de bytes
      // Adiciona BOM UTF-8 (0xEF, 0xBB, 0xBF) para compatibilidade plena no Excel
      const utf8Bytes = [0xef, 0xbb, 0xbf]
      const unescaped = unescape(encodeURIComponent(xml))
      for (let b = 0; b < unescaped.length; b++) {
        utf8Bytes.push(unescaped.charCodeAt(b) & 0xff)
      }
      return utf8Bytes
    }

    // =================================================================================
    // CASO A: RELATÓRIO DO INDICADOR (Suas indicações + Bonificação acumulada)
    // =================================================================================
    if (requestedKind === 'indicator') {
      const indId = indicatorRecord.id
      const indicatorName = indicatorRecord.getString('full_name') || 'Indicador Parceiro'
      const indicatorEmail =
        indicatorRecord.getString('email') || authRecord.getString('email') || ''
      const indicatorCpf = indicatorRecord.getString('cpf_cnpj') || ''
      const indicatorPix = indicatorRecord.getString('pix_key') || ''

      // 1. Busca todas as indicações do indicador
      const refs = $app.findRecordsByFilter(
        'referrals',
        'indicator_id = "' + indId + '"',
        '-created',
        500,
        0,
      )

      // 2. Busca todos os bônus do indicador
      const bonuses = $app.findRecordsByFilter(
        'bonuses',
        'indicator_id = "' + indId + '"',
        '-created',
        500,
        0,
      )

      let totalAccumulated = 0
      let totalPaid = 0
      let totalPending = 0
      let totalApproved = 0

      for (let b = 0; b < bonuses.length; b++) {
        const bon = bonuses[b]
        const amt = Number(bon.get('amount') || 0)
        const st = String(bon.get('status') || '').toLowerCase()
        const pSt = String(bon.get('payment_status') || '').toLowerCase()

        totalAccumulated += amt
        if (st === 'paid' || pSt === 'paid') {
          totalPaid += amt
        } else if (st === 'approved') {
          totalApproved += amt
        } else {
          totalPending += amt
        }
      }

      metadata = {
        indicator_id: indId,
        indicator_name: indicatorName,
        total_referrals: refs.length,
        total_accumulated: totalAccumulated,
        total_paid: totalPaid,
        total_pending: totalPending,
        total_approved: totalApproved,
      }

      const headers = ['Data', 'Indicado', 'Telefone', 'Tipo de Imovel', 'Status', 'Valor Previsto']
      const rows = []

      for (let r = 0; r < refs.length; r++) {
        const ref = refs[r]
        const createdDate = ref.getString('created').split(' ')[0] || ''
        const clientName = ref.getString('client_name') || ''
        const clientPhone = ref.getString('client_phone') || ''
        const propType = getFriendlyPropertyType(ref.getString('property_type'))
        const statusFriendly = getFriendlyStatus(ref.getString('status'))
        const val = Number(ref.get('deal_value') || ref.get('expected_value') || 0)

        rows.push([
          createdDate,
          clientName,
          clientPhone,
          propType,
          statusFriendly,
          val > 0 ? formatBRL(val) : '-',
        ])
      }

      if (requestedFormat === 'pdf') {
        fileName = 'relatorio-indicador-' + year + '-' + month + '.pdf'
        contentType = 'application/pdf'

        const metaLines = [
          'Indicador Parceiro: ' + indicatorName,
          'CPF/CNPJ: ' +
            (indicatorCpf || 'Nao informado') +
            ' | PIX: ' +
            (indicatorPix || 'Nao cadastrado'),
          'Periodo de Emissao: ' + dateFormatted,
          'Total de Indicacoes: ' + refs.length + ' registradas',
        ]

        const footerNotes = [
          'BONIFICACAO ACUMULADA: ' + formatBRL(totalAccumulated),
          'Ja Recebido (Pago via PIX): ' +
            formatBRL(totalPaid) +
            ' | Em Liberacao/Aprovado: ' +
            formatBRL(totalPending + totalApproved),
          'Nota: O pagamento de bonificacoes pendentes e processado todo dia 10.',
        ]

        fileBytes = buildSimplePdf(
          'Relatorio de Indicacoes e Bonificacao',
          'Demonstrativo do Parceiro',
          metaLines,
          headers,
          rows,
          footerNotes,
        )
      } else {
        // Excel (XLS)
        fileName = 'relatorio-indicador-' + year + '-' + month + '.xls'
        contentType = 'application/vnd.ms-excel'

        const summaryRows = [
          [
            'TOTAL DE INDICACOES',
            refs.length,
            '',
            '',
            'TOTAL BONIFICACAO ACUMULADA',
            formatBRL(totalAccumulated),
          ],
          ['', '', '', '', 'Total Ja Pago (PIX)', formatBRL(totalPaid)],
          ['', '', '', '', 'Total Pendente/Em Liberacao', formatBRL(totalPending + totalApproved)],
        ]

        fileBytes = buildExcelXml(
          'Minhas Indicacoes',
          'Relatorio de Indicacoes - ' + indicatorName,
          headers,
          rows,
          summaryRows,
        )
      }
    }

    // =================================================================================
    // CASO B: RELATÓRIO FINANCEIRO DO MASTER (Pagamento do dia 10)
    // =================================================================================
    if (requestedKind === 'financial') {
      // 1. Busca todos os bônus pendentes de pagamento (status='pending' ou 'approved')
      const pendingBonuses = $app.findRecordsByFilter(
        'bonuses',
        'status != "paid" && payment_status != "paid"',
        '-created',
        1000,
        0,
      )

      // 2. Agrupa por indicador para facilitar o lote de pagamento do dia 10
      const indicatorMap = {}
      let grandTotalToPay = 0
      let totalBonusesCount = 0

      for (let i = 0; i < pendingBonuses.length; i++) {
        const bon = pendingBonuses[i]
        const indId = bon.getString('indicator_id')
        const amt = Number(bon.get('amount') || 0)
        grandTotalToPay += amt
        totalBonusesCount++

        if (!indicatorMap[indId]) {
          let indRecord = null
          try {
            indRecord = $app.findFirstRecordByData('indicators', 'id', indId)
          } catch (_) {}

          indicatorMap[indId] = {
            id: indId,
            name: indRecord ? indRecord.getString('full_name') : 'Indicador ' + indId,
            cpf: indRecord ? indRecord.getString('cpf_cnpj') : '',
            pix: indRecord ? indRecord.getString('pix_key') : '',
            pixType: indRecord ? indRecord.getString('pix_key_type') : '',
            phone: indRecord ? indRecord.getString('phone') : '',
            totalAmount: 0,
            bonusesCount: 0,
            items: [],
          }
        }

        indicatorMap[indId].totalAmount += amt
        indicatorMap[indId].bonusesCount++
        indicatorMap[indId].items.push({
          bonusId: bon.id,
          amount: amt,
          type: bon.getString('bonus_type'),
          referralId: bon.getString('referral_id'),
        })
      }

      const indicatorList = Object.values(indicatorMap).sort(
        (a, b) => b.totalAmount - a.totalAmount,
      )

      metadata = {
        total_indicators_to_pay: indicatorList.length,
        total_bonuses_to_pay: totalBonusesCount,
        grand_total_to_pay: grandTotalToPay,
        payment_reference: 'Dia 10 - ' + month + '/' + year,
      }

      const headers = [
        'Indicador',
        'CPF/CNPJ',
        'Chave PIX',
        'Tipo Chave',
        'Qtd Bonus',
        'Valor a Pagar',
      ]
      const rows = []

      for (let idx = 0; idx < indicatorList.length; idx++) {
        const item = indicatorList[idx]
        rows.push([
          item.name,
          item.cpf || 'Nao informado',
          item.pix || 'SEM PIX CADASTRADO',
          (item.pixType || 'PIX').toUpperCase(),
          item.bonusesCount,
          formatBRL(item.totalAmount),
        ])
      }

      if (requestedFormat === 'pdf') {
        fileName = 'relatorio-financeiro-' + year + '-' + month + '-10.pdf'
        contentType = 'application/pdf'

        const metaLines = [
          'Relatorio Financeiro de Pagamento de Bonificacoes - Lote do Dia 10',
          'Referencia: ' + day + '/' + month + '/' + year + ' | Destino: Financeiro / Master Admin',
          'Indicadores a Receber: ' + indicatorList.length + ' parceiros',
          'Total de Bonificacoes Pendentes: ' + totalBonusesCount + ' bonificacoes',
        ]

        const footerNotes = [
          'TOTAL GERAL A PAGAR: ' + formatBRL(grandTotalToPay),
          'Instrucoes de Pagamento: Efetuar as transferencias PIX com as chaves indicadas.',
          'Apos a transferencia, registrar o pagamento em /admin/financeiro para quitar o bonus.',
        ]

        fileBytes = buildSimplePdf(
          'Relatorio Financeiro - Pagamentos do Dia 10',
          'Fechamento de Bonificacoes a Pagar',
          metaLines,
          headers,
          rows,
          footerNotes,
        )
      } else {
        // Excel (XLS)
        fileName = 'relatorio-financeiro-' + year + '-' + month + '-10.xls'
        contentType = 'application/vnd.ms-excel'

        const summaryRows = [
          [
            'TOTAL GERAL A PAGAR',
            '',
            '',
            '',
            totalBonusesCount + ' bonus',
            formatBRL(grandTotalToPay),
          ],
        ]

        fileBytes = buildExcelXml(
          'Pagamento Dia 10',
          'Relatorio Financeiro de Bonificacoes a Pagar - Lote Dia 10',
          headers,
          rows,
          summaryRows,
        )
      }
    }

    // 5. Salvar na collection 'reports' usando $filesystem.fileFromBytes
    let reportRecord = null
    let fileUrl = ''
    try {
      const reportsCol = $app.findCollectionByNameOrId('reports')
      reportRecord = new Record(reportsCol)
      reportRecord.set('owner', authRecord.id)
      reportRecord.set('kind', requestedKind)
      reportRecord.set('format', requestedFormat)
      reportRecord.set('metadata', metadata)

      // Cria a instância File do PocketBase
      const pbFile = $filesystem.fileFromBytes(fileBytes, fileName)
      reportRecord.set('file', pbFile)

      $app.save(reportRecord)

      // Monta a URL de download compatível com a sessão do usuário
      const savedFileName = reportRecord.getString('file')
      fileUrl =
        '/api/files/' +
        reportsCol.id +
        '/' +
        reportRecord.id +
        '/' +
        encodeURIComponent(savedFileName)
    } catch (saveErr) {
      console.log('Erro ao salvar relatorio na collection reports:', saveErr)
      return e.json(500, {
        error:
          'Não foi possível gerar e salvar o relatório no servidor: ' +
          (saveErr.message || String(saveErr)),
      })
    }

    // 6. Retorno de sucesso
    return e.json(200, {
      success: true,
      report_id: reportRecord ? reportRecord.id : null,
      report_url: fileUrl,
      file_name: fileName,
      kind: requestedKind,
      format: requestedFormat,
      content_type: contentType,
      generated_at: new Date().toISOString(),
      metadata: metadata,
    })
  },
  $apis.requireAuth(),
)
