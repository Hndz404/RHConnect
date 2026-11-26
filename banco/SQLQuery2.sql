
USE RHConnectDB;
GO

ALTER TABLE dbo.RegistrosPonto
DROP CONSTRAINT CK_RegistrosPonto_Tipo;
GO

ALTER TABLE dbo.RegistrosPonto
ADD CONSTRAINT CK_RegistrosPonto_Tipo
CHECK (
    Tipo IN (
        'Entrada',
        'InicioIntervalo',
        'FimIntervalo',
        'Saida'
    )
);
GO
