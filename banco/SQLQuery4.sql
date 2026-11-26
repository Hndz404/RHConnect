
SELECT FuncionarioId, DataHora, Tipo
FROM dbo.RegistrosPonto
WHERE FuncionarioId IN (7, 8, 9)
ORDER BY FuncionarioId, DataHora;


