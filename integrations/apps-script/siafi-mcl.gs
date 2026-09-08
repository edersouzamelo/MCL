/**
 * Ponte auditável Tesouro Gerencial -> MCL.
 * Configure nas Propriedades do script:
 * MCL_WEBHOOK_URL, MCL_WEBHOOK_TOKEN e MCL_ORGANIZATION_CODE.
 */
function syncTesouroGerencialMcl() {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = requiredProperty_(properties, "MCL_WEBHOOK_URL");
  const token = requiredProperty_(properties, "MCL_WEBHOOK_TOKEN");
  const organizationCode = requiredProperty_(properties, "MCL_ORGANIZATION_CODE");
  const processed = GmailApp.getUserLabelByName("MCL_SIAFI_PROCESSADO") || GmailApp.createLabel("MCL_SIAFI_PROCESSADO");
  const failed = GmailApp.getUserLabelByName("MCL_SIAFI_ERRO") || GmailApp.createLabel("MCL_SIAFI_ERRO");
  const threads = GmailApp.search('subject:"[SIAFI-MCL]" has:attachment newer_than:3d -label:MCL_SIAFI_PROCESSADO');

  threads.forEach(function(thread) {
    let accepted = false;
    try {
      thread.getMessages().forEach(function(message) {
        message.getAttachments().forEach(function(attachment) {
          const name = attachment.getName();
          if (!/\.xlsx?$/i.test(name)) return;
          const text = (message.getSubject() + " " + name).toUpperCase();
          const kind = /RPNP|RESTOS A PAGAR|EXERC[IÍ]CIO ANTERIOR/.test(text) ? "RPNP" : "CURRENT";
          const response = UrlFetchApp.fetch(endpoint, {
            method: "post",
            headers: { Authorization: "Bearer " + token },
            payload: { file: attachment.copyBlob().setName(name), sourceKind: kind, organizationCode: organizationCode },
            muteHttpExceptions: true
          });
          const status = response.getResponseCode();
          const body = response.getContentText();
          if (status < 200 || status >= 300) throw new Error("MCL HTTP " + status + ": " + body);
          const result = JSON.parse(body);
          if (!result.success || !result.checksum || !result.persistedAt) throw new Error("MCL não confirmou persistência: " + body);
          console.log(JSON.stringify(result));
          accepted = true;
        });
      });
      if (accepted) {
        thread.addLabel(processed);
        thread.removeLabel(failed);
      }
    } catch (error) {
      thread.addLabel(failed);
      console.error(error);
      throw error;
    }
  });
}

function installHourlyMclTrigger() {
  ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === "syncTesouroGerencialMcl";
  }).forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger("syncTesouroGerencialMcl").timeBased().everyHours(1).create();
}

function requiredProperty_(properties, key) {
  const value = properties.getProperty(key);
  if (!value) throw new Error("Propriedade obrigatória ausente: " + key);
  return value;
}
