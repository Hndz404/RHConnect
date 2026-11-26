
USE RHConnectDB;
GO

DELETE FROM dbo.RegistrosPonto
WHERE Id = 3
  AND FuncionarioId = 10
  AND Tipo = 'Entrada'
  AND DataHora >= '2026-11-26T00:00:00'
  AND DataHora <  '2026-11-27T00:00:00';
GO
