-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "qrCode" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigoInterno" TEXT NOT NULL,
    "qrCode" TEXT,
    "endereco" TEXT NOT NULL,
    "localInstalacao" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "numeroSerie" TEXT NOT NULL,
    "btu" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataInstalacao" DATETIME NOT NULL,
    "observacoes" TEXT,
    "criadoPor" TEXT NOT NULL,
    "clienteId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "Equipamento_criadoPor_fkey" FOREIGN KEY ("criadoPor") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Equipamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Equipamento" ("btu", "clienteId", "codigoInterno", "criadoEm", "criadoPor", "dataInstalacao", "deletedAt", "endereco", "id", "localInstalacao", "marca", "modelo", "numeroSerie", "observacoes", "qrCode", "tipo") SELECT "btu", "clienteId", "codigoInterno", "criadoEm", "criadoPor", "dataInstalacao", "deletedAt", "endereco", "id", "localInstalacao", "marca", "modelo", "numeroSerie", "observacoes", "qrCode", "tipo" FROM "Equipamento";
DROP TABLE "Equipamento";
ALTER TABLE "new_Equipamento" RENAME TO "Equipamento";
CREATE UNIQUE INDEX "Equipamento_codigoInterno_key" ON "Equipamento"("codigoInterno");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
