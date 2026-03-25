/**
 * Storage Layer Tests - iuria LexFutura
 * Tests the in-memory storage implementation
 */
import { describe, it, expect, beforeEach } from "vitest";

// We test the MemStorage via dynamic import to avoid DB dependency
// Using a factory approach
async function createMemStorage() {
  // Directly create MemStorage for testing
  const { storage } = await import("../server/storage");
  return storage;
}

describe("Storage Layer (MemStorage)", () => {
  let store: Awaited<ReturnType<typeof createMemStorage>>;

  beforeEach(async () => {
    store = await createMemStorage();
  });

  describe("Users", () => {
    it("should get user by username", async () => {
      const user = await store.getUserByUsername("admin");
      expect(user).toBeDefined();
      expect(user?.username).toBe("admin");
      expect(user?.nome).toBe("Thiago Gomes");
      expect(user?.role).toBe("admin");
    });

    it("should return undefined for unknown username", async () => {
      const user = await store.getUserByUsername("nonexistent");
      expect(user).toBeUndefined();
    });

    it("should create a new user", async () => {
      const newUser = await store.createUser({
        username: "testuser",
        password: "testpass",
        nome: "Test User",
        email: "test@test.com",
        role: "advogado",
      });
      expect(newUser.id).toBeTruthy();
      expect(newUser.username).toBe("testuser");
    });
  });

  describe("Clientes", () => {
    it("should list clientes (seeded)", async () => {
      const clientes = await store.getClientes();
      expect(clientes.length).toBeGreaterThanOrEqual(2);
    });

    it("should create a new cliente", async () => {
      const cliente = await store.createCliente({
        nome: "Novo Cliente",
        tipo: "Pessoa Fisica",
        status: "Ativo",
      });
      expect(cliente.id).toBeTruthy();
      expect(cliente.nome).toBe("Novo Cliente");
    });

    it("should update a cliente", async () => {
      const clientes = await store.getClientes();
      const first = clientes[0];
      const updated = await store.updateCliente(first.id, { nome: "Updated Name" });
      expect(updated?.nome).toBe("Updated Name");
    });

    it("should delete a cliente", async () => {
      const cliente = await store.createCliente({
        nome: "To Delete",
        tipo: "Pessoa Fisica",
        status: "Ativo",
      });
      const deleted = await store.deleteCliente(cliente.id);
      expect(deleted).toBe(true);
      const found = await store.getCliente(cliente.id);
      expect(found).toBeUndefined();
    });
  });

  describe("Processos", () => {
    it("should list processos (seeded)", async () => {
      const processos = await store.getProcessos();
      expect(processos.length).toBeGreaterThanOrEqual(2);
    });

    it("should get processo by ID", async () => {
      const processos = await store.getProcessos();
      const first = processos[0];
      const found = await store.getProcesso(first.id);
      expect(found).toBeDefined();
      expect(found?.numero).toBe(first.numero);
    });
  });

  describe("Atividades", () => {
    it("should list atividades (seeded)", async () => {
      const atividades = await store.getAtividades();
      expect(atividades.length).toBeGreaterThanOrEqual(3);
    });

    it("should create and update atividade", async () => {
      const processos = await store.getProcessos();
      const equipe = await store.getEquipe();
      const ativ = await store.createAtividade({
        titulo: "Test Task",
        tipo: "Tarefa",
        data: "2026-04-01",
        prioridade: "Alta",
        status: "Pendente",
        processoId: processos[0].id,
        responsavelId: equipe[0].id,
      });
      expect(ativ.id).toBeTruthy();
      expect(ativ.titulo).toBe("Test Task");

      const updated = await store.updateAtividade(ativ.id, { status: "Concluida" });
      expect(updated?.status).toBe("Concluida");
    });
  });

  describe("Prazos", () => {
    it("should list prazos (seeded)", async () => {
      const prazos = await store.getPrazos();
      expect(prazos.length).toBeGreaterThanOrEqual(3);
    });

    it("should get prazos vencendo", async () => {
      const prazos = await store.getPrazosVencendo(30);
      expect(Array.isArray(prazos)).toBe(true);
    });

    it("should update prazo status", async () => {
      const prazos = await store.getPrazos();
      const first = prazos[0];
      const updated = await store.updatePrazo(first.id, { status: "cumprido" });
      expect(updated?.status).toBe("cumprido");
    });
  });

  describe("Alertas", () => {
    it("should list alertas (seeded)", async () => {
      const alertas = await store.getAlertas();
      expect(alertas.length).toBeGreaterThanOrEqual(2);
    });

    it("should get unread alertas", async () => {
      const unread = await store.getAlertasNaoLidos();
      expect(Array.isArray(unread)).toBe(true);
      // All should be unread
      unread.forEach((a) => expect(a.lido).toBe(false));
    });

    it("should mark alerta as read", async () => {
      const unread = await store.getAlertasNaoLidos();
      if (unread.length > 0) {
        const marked = await store.marcarAlertaLido(unread[0].id);
        expect(marked?.lido).toBe(true);
        expect(marked?.lidoEm).toBeTruthy();
      }
    });
  });

  describe("Financeiro", () => {
    it("should list contas a receber (seeded)", async () => {
      const contas = await store.getContasReceber();
      expect(contas.length).toBeGreaterThanOrEqual(1);
    });

    it("should list contas a pagar (seeded)", async () => {
      const contas = await store.getContasPagar();
      expect(contas.length).toBeGreaterThanOrEqual(1);
    });

    it("should list honorarios (seeded)", async () => {
      const honorarios = await store.getHonorarios();
      expect(honorarios.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Dashboard Stats", () => {
    it("should return dashboard stats with all data", async () => {
      const stats = await store.getDashboardStats();
      expect(stats.atividades).toBeDefined();
      expect(stats.processos).toBeDefined();
      expect(stats.clientes).toBeDefined();
      expect(stats.prazos).toBeDefined();
      expect(stats.contasReceber).toBeDefined();
      expect(stats.contasPagar).toBeDefined();
      expect(typeof stats.alertasNaoLidos).toBe("number");
    });
  });

  describe("Tribunais", () => {
    it("should list tribunais (seeded)", async () => {
      const tribunais = await store.getTribunais();
      expect(tribunais.length).toBeGreaterThanOrEqual(5);
    });

    it("should find tribunal by sigla", async () => {
      const stf = await store.getTribunalBySigla("STF");
      expect(stf).toBeDefined();
      expect(stf?.nome).toContain("Supremo Tribunal Federal");
    });
  });

  describe("Monitoramento", () => {
    it("should create and manage monitoramento", async () => {
      const mon = await store.createMonitoramento({
        numeroProcesso: "0001234-56.2025.8.19.9999",
        tribunal: "TJRJ",
        frequenciaMinutos: 60,
        ativo: true,
        contadorAndamentos: 0,
        novosAndamentos: 0,
      });
      expect(mon.id).toBeTruthy();
      expect(mon.ativo).toBe(true);

      // List active
      const ativos = await store.getMonitoramentosAtivos();
      expect(ativos.some((m) => m.id === mon.id)).toBe(true);

      // Update
      const updated = await store.updateMonitoramento(mon.id, { frequenciaMinutos: 120 });
      expect(updated?.frequenciaMinutos).toBe(120);

      // Delete
      const deleted = await store.deleteMonitoramento(mon.id);
      expect(deleted).toBe(true);
    });
  });
});
