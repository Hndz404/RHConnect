
USE RHConnectDB;
GO

CREATE TABLE BancoHoras (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FuncionarioId INT NOT NULL,
    DataReferencia DATE NOT NULL,
    HorasTrabalhadas DECIMAL(5,2) NOT NULL DEFAULT 0,
    HorasPrevistas DECIMAL(5,2) NOT NULL DEFAULT 0,
    SaldoHoras DECIMAL(6,2) NOT NULL DEFAULT 0,

    CONSTRAINT FK_BancoHoras_Funcionarios
        FOREIGN KEY (FuncionarioId)
        REFERENCES Funcionarios(Id)
);
GO
