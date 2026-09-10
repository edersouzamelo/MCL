/** Recuperação do Robô_MCL. Mantém o nome usado pelo gatilho já instalado.
 * Propriedades do script: MCL_WEBHOOK_TOKEN (segredo já configurado no servidor)
 * e MCL_ORGANIZATION_CODE (número da UASG, com seis dígitos).
 * Não recria gatilhos, não exclui mensagens e não altera a fonte de RPNP.
 */
function enviarPlanilhaSiafiParaMCL() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('MCL_WEBHOOK_TOKEN');
  var organization = (props.getProperty('MCL_ORGANIZATION_CODE') || '').trim();
  if (!token || !organization) throw new Error('Configure MCL_WEBHOOK_TOKEN e MCL_ORGANIZATION_CODE nas Propriedades do script.');
  if (!/^\d{6}$/.test(organization)) throw new Error('MCL_ORGANIZATION_CODE deve conter a UASG com seis dígitos.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var messages = [];
    // Includes archived mail. Never excludes a thread because an older message was processed.
    var threads = GmailApp.search('from:naoresponda@serpro.gov.br subject:MCL_MESTRE_EXERCICIO_2026 has:attachment newer_than:14d', 0, 100);
    threads.forEach(function(thread) { thread.getMessages().forEach(function(message) {
      if (message.getSubject().indexOf('MCL_MESTRE_EXERCICIO_2026') !== -1 && /(?:<|^)naoresponda@serpro\.gov\.br(?:>|$)/i.test(message.getFrom())) messages.push(message);
    }); });
    messages.sort(function(a, b) { return a.getDate().getTime() - b.getDate().getTime(); });
    var failures = 0;
    var accepted = 0;
    messages.forEach(function(message) {
      message.getAttachments({ includeInlineImages: false }).forEach(function(attachment) {
        if (!/^MCL_MESTRE_EXERCICIO_2026.*\.xlsx?$/i.test(attachment.getName())) return;
        try {
          var response = UrlFetchApp.fetch('https://mcl-one.vercel.app/api/connectors/siafi/upload', {
            method: 'post', muteHttpExceptions: true,
            headers: { Authorization: 'Bearer ' + token },
            payload: { file: attachment.copyBlob(), reportType: 'TG_MASTER_V1', organizationCode: organization, emailReceivedAt: message.getDate().toISOString() }
          });
          var status = response.getResponseCode();
          var body;
          try { body = JSON.parse(response.getContentText()); } catch (_) { throw new Error('HTTP ' + status + ': resposta não JSON'); }
          if (status < 200 || status >= 300 || !body.success || !body.checksum || !body.persistedAt) throw new Error('HTTP ' + status + ': ' + (body.error || 'persistência não confirmada'));
          accepted++;
          console.log(JSON.stringify({ status: 'TG_PERSISTIDO', file: attachment.getName(), rowCount: body.rowCount, checksum: body.checksum, persistedAt: body.persistedAt }));
        } catch (error) { failures++; console.error(String(error)); }
      });
    });
    console.log(JSON.stringify({ accepted: accepted, failures: failures, matchedMessages: messages.length }));
    if (failures) throw new Error(failures + ' anexo(s) não persistido(s). Consulte os registros de execução.');
  } finally { lock.releaseLock(); }
}
