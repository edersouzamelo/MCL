/**
 * Robô_MCL, contrato TG Mestre V2.
 *
 * A fonte preferencial de Créditos do MCL é MCL_MESTRE_CREDITOS_V2_TESTE.xlsx.
 * O relatório MCL_MESTRE_EXERCICIO_2026 pode ser um contrato TG diferente:
 * NÃO misturar a versão antiga como se fosse mais recente nem sobrescrever V2.
 *
 * No projeto Google Apps Script EXISTENTE, mantenha:
 *   MCL_WEBHOOK_TOKEN: o mesmo configurado como MCL_SIAFI_WEBHOOK_TOKEN na Vercel;
 *   MCL_ORGANIZATION_CODE: UASG de seis dígitos.
 *   MCL_WEBHOOK_URL (opcional): default abaixo.
 *
 * Usa o gatilho instalado de enviarPlanilhaSiafiParaMCL; não cria gatilhos
 * automaticamente, não arquiva/exclui e-mails nem imprime tokens no log.
 * SUCESSO = a última parte foi recebida E o banco confirmou checksum,
 * rowCount positivo e persistedAt.
 */

var MCL_TG_V2_FILE_ = /^MCL_MESTRE_CREDITOS_V2_TESTE(?:[^/]*)?\.xlsx?$/i;
var MCL_TG_SOURCE_ = 'naoresponda@serpro.gov.br';
var MCL_TG_LAST_SUCCESS_AT_ = 'MCL_TG_LAST_SUCCESS_EMAIL_AT';
var MCL_TG_MAX_PART_BYTES_ = 2000000;
var MCL_TG_MAX_PARTS_ = 20;
var MCL_TG_MAX_BYTES_ = 20 * 1024 * 1024;

function mclTgCandidates_(threads) {
  var candidates = [];
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      var from = String(message.getFrom() || '');
      if (!/(?:^|[<\s])naoresponda@serpro\.gov\.br(?:>|\s|$)/i.test(from)) return;
      if (!/MCL_MESTRE_CREDITOS_V2_TESTE/i.test(message.getSubject())) return;
      message.getAttachments({ includeInlineImages: false }).forEach(function (attachment) {
        if (MCL_TG_V2_FILE_.test(attachment.getName())) {
          candidates.push({ message: message, attachment: attachment, at: message.getDate().getTime() });
        }
      });
    });
  });
  candidates.sort(function (a, b) { return b.at - a.at; });
  return candidates;
}

function mclTgHttpChunk_(url, token, payload, partIndex) {
  for (var attempt = 0; attempt < 3; attempt++) {
    var response;
    try {
      response = UrlFetchApp.fetch(url, {
        method: 'post', muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + token },
        payload: payload,
      });
    } catch (error) {
      if (attempt === 2) throw new Error('Falha de transporte no bloco ' + (partIndex + 1) + ': ' + String(error));
      Utilities.sleep(1500 * Math.pow(2, attempt));
      continue;
    }
    var status = response.getResponseCode();
    var body;
    try { body = JSON.parse(response.getContentText()); }
    catch (_) { body = { error: 'O endpoint retornou resposta não JSON.' }; }
    if (status >= 200 && status < 300 && body.success) return body;
    // 400/401/403/404/409/413/422 indicam contrato, token ou payload quebrado.
    // Não consumir a janela de execução repetindo uma falha definitiva.
    if ([429, 500, 502, 503, 504].indexOf(status) < 0 || attempt === 2) {
      throw new Error('TG_UPLOAD_HTTP_' + status + ' bloco ' + (partIndex + 1) +
        ', tentativa ' + (attempt + 1) + ': ' + String(body.error || 'persistência não confirmada'));
    }
    Utilities.sleep(1500 * Math.pow(2, attempt));
  }
  throw new Error('O envio do bloco não obteve confirmação.');
}

function mclTgUpload_(candidate, url, token, organization) {
  var attachment = candidate.attachment;
  var bytes = attachment.getBytes();
  if (!bytes.length || bytes.length > MCL_TG_MAX_BYTES_) {
    throw new Error('TG_UPLOAD_SIZE_INVALID: fonte de ' + bytes.length + ' bytes (máximo 20 MB).');
  }
  var count = Math.ceil(bytes.length / MCL_TG_MAX_PART_BYTES_);
  if (count > MCL_TG_MAX_PARTS_) throw new Error('TG_UPLOAD_TOO_MANY_PARTS: ' + count);
  var uploadId = Utilities.getUuid();
  var reply;
  for (var index = 0; index < count; index++) {
    var offset = index * MCL_TG_MAX_PART_BYTES_;
    var data = bytes.slice(offset, Math.min(offset + MCL_TG_MAX_PART_BYTES_, bytes.length));
    var part = Utilities.newBlob(data, 'application/octet-stream', 'tg-' + index + '.bin');
    reply = mclTgHttpChunk_(url, token, {
      file: part,
      // Nome histórico da flag de transporte: aceita planilhas mestre V1/V2.
      reportType: 'TG_MASTER_V1',
      organizationCode: organization,
      emailReceivedAt: candidate.message.getDate().toISOString(),
      uploadId: uploadId,
      chunkIndex: String(index),
      chunkCount: String(count),
      originalFileName: attachment.getName(),
    }, index);
    if (index < count - 1 && reply.complete !== false) {
      throw new Error('TG_PROTOCOL_INVALID: confirmação de bloco intermediário inesperada.');
    }
  }
  if (!reply || !reply.checksum || !reply.persistedAt ||
      !(Number(reply.rowCount) > 0) || reply.complete === false) {
    throw new Error('TG_NOT_PERSISTED: a API não confirmou checksum, linhas e persistência.');
  }
  return {
    file: attachment.getName(),
    receivedAt: candidate.message.getDate().toISOString(),
    rowCount: reply.rowCount,
    checksum: reply.checksum,
    persistedAt: reply.persistedAt,
    chunkCount: count,
  };
}

function enviarPlanilhaSiafiParaMCL() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('MCL_WEBHOOK_TOKEN');
  var organization = String(props.getProperty('MCL_ORGANIZATION_CODE') || '').trim();
  var endpoint = String(props.getProperty('MCL_WEBHOOK_URL') ||
    'https://mcl-one.vercel.app/api/connectors/siafi/upload').trim();
  if (!token) throw new Error('MCL_WEBHOOK_TOKEN não está configurado no projeto do Apps Script.');
  if (!/^\d{6}$/.test(organization)) throw new Error('MCL_ORGANIZATION_CODE exige UASG com seis dígitos.');
  if (!/^https:\/\//i.test(endpoint)) throw new Error('MCL_WEBHOOK_URL deve usar HTTPS.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    console.log(JSON.stringify({ status: 'TG_BUSY', message: 'Outra execução já iniciou o processamento.' }));
    return;
  }
  try {
    var threads = GmailApp.search(
      'from:naoresponda@serpro.gov.br subject:MCL_MESTRE_CREDITOS_V2_TESTE has:attachment newer_than:14d',
      0, 100
    );
    var candidates = mclTgCandidates_(threads);
    if (!candidates.length) {
      console.warn(JSON.stringify({ status: 'TG_NO_SOURCE', recentMatches: 0 }));
      throw new Error('TG_NO_SOURCE: nenhuma carga V2 recente foi localizada; verificar relatório do SERPRO.');
    }
    // A execução sempre considera a fonte MAIS RECENTE. Erro nela jamais leva
    // à publicação de arquivo mais antigo como se fosse o saldo atual.
    var selected = candidates[0];
    var lastSuccess = Number(props.getProperty(MCL_TG_LAST_SUCCESS_AT_) || 0);
    if (selected.at <= lastSuccess) {
      console.log(JSON.stringify({
        status: 'TG_ALREADY_CONFIRMED', file: selected.attachment.getName(),
        emailReceivedAt: selected.message.getDate().toISOString(),
      }));
      return;
    }
    try {
      var persisted = mclTgUpload_(selected, endpoint, token, organization);
      props.setProperty(MCL_TG_LAST_SUCCESS_AT_, String(selected.at));
      console.log(JSON.stringify({
        status: 'TG_PERSISTIDO', reportKind: 'CREDITOS_V2', organizationCode: organization,
        file: persisted.file, emailReceivedAt: persisted.receivedAt,
        rowCount: persisted.rowCount, checksum: persisted.checksum,
        persistedAt: persisted.persistedAt, chunks: persisted.chunkCount,
      }));
    } catch (error) {
      console.error(JSON.stringify({
        status: 'TG_SYNC_FAILED', reportKind: 'CREDITOS_V2',
        emailReceivedAt: selected.message.getDate().toISOString(),
        file: selected.attachment.getName(), error: String(error),
      }));
      throw error;
    }
  } finally {
    lock.releaseLock();
  }
}

/** Executar uma única vez no projeto instalado, se o acionador não existir. */
function instalarGatilhoMclTg() {
  var existing = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'enviarPlanilhaSiafiParaMCL';
  });
  if (existing) {
    console.log('O gatilho enviarPlanilhaSiafiParaMCL já existe; não foi recriado.');
    return;
  }
  ScriptApp.newTrigger('enviarPlanilhaSiafiParaMCL').timeBased().everyHours(1).create();
  console.log('Gatilho horário de ingestão TG criado.');
}
