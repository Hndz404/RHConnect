
USE RHConnectDB;
GO

BEGIN TRANSACTION;

DELETE FROM dbo.RegistrosPonto;
DELETE FROM dbo.BancoHoras;
DELETE FROM dbo.Funcionarios;

COMMIT TRANSACTION;

SELECT COUNT(*) AS FuncionariosRestantes
FROM dbo.Funcionarios;

SELECT COUNT(*) AS RegistrosDePontoRestantes
FROM dbo.RegistrosPonto;

SELECT COUNT(*) AS RegistrosDeBancoDeHorasRestantes
FROM dbo.BancoHoras;
