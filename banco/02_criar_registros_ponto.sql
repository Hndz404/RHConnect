
USE RHConnectDB;
GO

CREATE TABLE RegistrosPonto (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FuncionarioId INT NOT NULL,
    DataHora DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Tipo NVARCHAR(20) NOT NULL,
    
    CONSTRAINT FK_RegistrosPonto_Funcionarios
        FOREIGN KEY (FuncionarioId)
        REFERENCES Funcionarios(Id),

    CONSTRAINT CK_RegistrosPonto_Tipo
        CHECK (Tipo IN ('Entrada', 'Saida'))
);
GO

