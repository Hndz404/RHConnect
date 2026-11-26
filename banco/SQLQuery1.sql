
USE RHConnectDB;
GO

SELECT
    f.Id,
    f.Nome,
    f.Ativo,
    COUNT(r.Id) AS RegistrosHoje
FROM dbo.Funcionarios f
LEFT JOIN dbo.RegistrosPonto r
    ON r.FuncionarioId = f.Id
    AND CAST(r.DataHora AS DATE) = CAST(GETDATE() AS DATE)
WHERE f.Ativo = 1
GROUP BY f.Id, f.Nome, f.Ativo
ORDER BY f.Id;
