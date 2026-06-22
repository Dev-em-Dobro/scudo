-- Prêmio em dinheiro via PIX (substitui a Cadeira Gamer como prêmio de temporada).
-- Novo valor do enum MgmRewardType: ops paga manualmente e registra o comprovante.
ALTER TYPE "MgmRewardType" ADD VALUE 'PIX';
