
using Microsoft.Data.SqlClient;
using RHConnectAPI.Models;
using System.Data;

namespace RHConnectAPI.Data;

public class RegistroPontoRepository
{
    private readonly string _conexao;

    public RegistroPontoRepository(IConfiguration configuracao)
    {
        _conexao = configuracao.GetConnectionString("ConexaoRH")
            ?? throw new InvalidOperationException(
                "A conexão ConexaoRH não foi configurada."
            );
    }

    public async Task<int> RegistrarAsync(RegistroPonto registro)
    {
        const string sql = """
            INSERT INTO dbo.RegistrosPonto
                (FuncionarioId, DataHora, Tipo)
            OUTPUT INSERTED.Id
            VALUES
                (@FuncionarioId, @DataHora, @Tipo);
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);

        comando.Parameters.Add(
            "@FuncionarioId", SqlDbType.Int
        ).Value = registro.FuncionarioId;

        comando.Parameters.Add(
            "@DataHora", SqlDbType.DateTime2
        ).Value = registro.DataHora;

        comando.Parameters.Add(
            "@Tipo", SqlDbType.NVarChar, 30
        ).Value = registro.Tipo;

        var resultado = await comando.ExecuteScalarAsync();

        return Convert.ToInt32(resultado);
    }

    public async Task<List<RegistroPonto>> ListarPorFuncionarioAsync(
        int funcionarioId)
    {
        var registros = new List<RegistroPonto>();

        const string sql = """
            SELECT Id, FuncionarioId, DataHora, Tipo
            FROM dbo.RegistrosPonto
            WHERE FuncionarioId = @FuncionarioId
            ORDER BY DataHora DESC;
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);

        comando.Parameters.Add(
            "@FuncionarioId", SqlDbType.Int
        ).Value = funcionarioId;

        await using var leitor = await comando.ExecuteReaderAsync();

        while (await leitor.ReadAsync())
        {
            registros.Add(new RegistroPonto
            {
                Id = leitor.GetInt32(0),
                FuncionarioId = leitor.GetInt32(1),
                DataHora = leitor.GetDateTime(2),
                Tipo = leitor.GetString(3)
            });
        }

        return registros;
    }
}
