import { expect, test } from "@playwright/test";

test("fluxo demonstrativo ponta a ponta", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Entre$/i }).first().click();
  await page.getByRole("button", { name: /^Entrar$/i }).click();
  await expect(page.getByRole("heading", { name: /Situacao geral da cadeia/i })).toBeVisible();

  await page.goto("/necessidades");
  await page.getByRole("link", { name: /MCL-NEC-2026-0001/i }).click();
  await expect(page.getByRole("heading", { name: /MCL-NEC-2026-0001/i })).toBeVisible();

  await page.goto("/scanner");
  await page.getByLabel(/Entrada manual/i).fill("MCL:UL:ul-coturno-caixa-001");
  await page.getByRole("button", { name: /Resolver codigo/i }).click();
  await expect(page.getByRole("heading", { name: /Passaporte digital/i })).toBeVisible();

  await page.getByLabel(/Evento/i).selectOption("MATERIAL_ARMAZENADO");
  await page.getByRole("button", { name: /Registrar evento/i }).click();
  await expect(page.getByText(/Evento registrado|idempotencia/i)).toBeVisible();

  await page.goto("/auditoria");
  await expect(page.getByText(/EVENTO_CRIADO|QR_RESOLVIDO/)).toBeVisible();
});
