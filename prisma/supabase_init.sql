-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum Perfil (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Perfil') THEN
        CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'TECNICO');
    END IF;
END $$;

-- CreateEnum TipoEquipamento (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoEquipamento') THEN
        CREATE TYPE "TipoEquipamento" AS ENUM ('SPLIT', 'CASSETE', 'PISO_TETO', 'JANELA', 'VRF', 'MULTI_SPLIT', 'OUTROS');
    END IF;
END $$;

-- CreateEnum TipoFoto (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoFoto') THEN
        CREATE TYPE "TipoFoto" AS ENUM ('ANTES', 'DEPOIS');
    END IF;
END $$;

-- CreateTable Usuario
CREATE TABLE IF NOT EXISTS "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable Equipamento
CREATE TABLE IF NOT EXISTS "Equipamento" (
    "id" TEXT NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "qrCode" TEXT,
    "endereco" TEXT NOT NULL,
    "localInstalacao" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "numeroSerie" TEXT NOT NULL,
    "btu" INTEGER NOT NULL,
    "tipo" "TipoEquipamento" NOT NULL,
    "dataInstalacao" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "criadoPor" TEXT NOT NULL,
    "clienteId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable Cliente
CREATE TABLE IF NOT EXISTS "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "qrCode" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable Manutencao
CREATE TABLE IF NOT EXISTS "Manutencao" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "dataManutencao" TIMESTAMP(3) NOT NULL,
    "servicoRealizado" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pecaTrocada" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "tecnicoNome" TEXT NOT NULL,
    "tecnicoAssinatura" TEXT NOT NULL,
    "contratanteNome" TEXT NOT NULL,
    "contratanteAssinatura" TEXT NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable Foto
CREATE TABLE IF NOT EXISTS "Foto" (
    "id" TEXT NOT NULL,
    "manutencaoId" TEXT NOT NULL,
    "tipo" "TipoFoto" NOT NULL,
    "arquivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable Auditoria
CREATE TABLE IF NOT EXISTS "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Equipamento_codigoInterno_key" ON "Equipamento"("codigoInterno");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipamento_clienteId_idx" ON "Equipamento"("clienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipamento_criadoPor_idx" ON "Equipamento"("criadoPor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Manutencao_equipamentoId_idx" ON "Manutencao"("equipamentoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Foto_manutencaoId_idx" ON "Foto"("manutencaoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- AddForeignKey Equipamento -> Usuario (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Equipamento_criadoPor_fkey') THEN
        ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_criadoPor_fkey" FOREIGN KEY ("criadoPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey Equipamento -> Cliente (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Equipamento_clienteId_fkey') THEN
        ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey Manutencao -> Equipamento (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Manutencao_equipamentoId_fkey') THEN
        ALTER TABLE "Manutencao" ADD CONSTRAINT "Manutencao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey Foto -> Manutencao (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Foto_manutencaoId_fkey') THEN
        ALTER TABLE "Foto" ADD CONSTRAINT "Foto_manutencaoId_fkey" FOREIGN KEY ("manutencaoId") REFERENCES "Manutencao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey Auditoria -> Usuario (conditional DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Auditoria_usuarioId_fkey') THEN
        ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
