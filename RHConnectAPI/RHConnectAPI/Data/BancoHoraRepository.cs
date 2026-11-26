
using Microsoft.Data.SqlClient;
using RHConnectAPI.Models;
using System.Data;

namespace RHConnectAPI.Data;

public class BancoHoraRepository
{
    private readonly string _conexao;

    public BancoHoraRepository(IConfiguration configuracao)
    {
        _conexao = configuracao.GetConnectionString("ConexaoRH")
            ?? throw new InvalidOperationException(
                "A conexão ConexaoRH não foi configurada."
            );
    }

    public async Task SalvarOuAtualizarAsync(BancoHora bancoHora)
    {
        const string sql = """
            IF EXISTS (
                SELECT 1
                FROM dbo.BancoHoras
                WHERE FuncionarioId = @FuncionarioId
                  AND DataReferencia = @DataReferencia
            )
            BEGIN
                UPDATE dbo.BancoHoras
                SET HorasTrabalhadas = @HorasTrabalhadas,
                    HorasPrevistas = @HorasPrevistas,
                    SaldoHoras = @SaldoHoras
                WHERE FuncionarioId = @FuncionarioId
                  AND DataReferencia = @DataReferencia;
            END
            ELSE
            BEGIN
                INSERT INTO dbo.BancoHoras
                    (FuncionarioId, DataReferencia,
                     HorasTrabalhadas, HorasPrevistas, SaldoHoras)
                VALUES
                    (@FuncionarioId, @DataReferencia,
                     @HorasTrabalhadas, @HorasPrevistas, @SaldoHoras);
            END;
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);

        comando.Parameters.Add(
            "@FuncionarioId", SqlDbType.Int
        ).Value = bancoHora.FuncionarioId;

        comando.Parameters.Add(
            "@DataReferencia", SqlDbType.Date
        ).Value = bancoHora.DataReferencia.Date;

        AdicionarDecimal(comando, "@HorasTrabalhadas",
            bancoHora.HorasTrabalhadas);
        AdicionarDecimal(comando, "@HorasPrevistas",
            bancoHora.HorasPrevistas);
        AdicionarDecimal(comando, "@SaldoHoras",
            bancoHora.SaldoHoras);

        await comando.ExecuteNonQueryAsync();
    }

    public async Task<List<BancoHora>> ListarPorFuncionarioAsync(
        int funcionarioId)
    {
        var resultados = new List<BancoHora>();

        const string sql = """
            SELECT Id, FuncionarioId, DataReferencia,
                   HorasTrabalhadas, HorasPrevistas, SaldoHoras
            FROM dbo.BancoHoras
            WHERE FuncionarioId = @FuncionarioId
            ORDER BY DataReferencia DESC;
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
            resultados.Add(new BancoHora
            {
                Id = leitor.GetInt32(0),
                FuncionarioId = leitor.GetInt32(1),
                DataReferencia = leitor.GetDateTime(2),
                HorasTrabalhadas = leitor.GetDecimal(3),
                HorasPrevistas = leitor.GetDecimal(4),
                SaldoHoras = leitor.GetDecimal(5)
            });
        }

        return resultados;
    }

    private static void AdicionarDecimal(
        SqlCommand comando,
        string nome,
        decimal valor)
    {
        var parametro = comando.Parameters.Add(
            nome, SqlDbType.Decimal);

        parametro.Precision = 10;
        parametro.Scale = 2;
        parametro.Value = valor;
    }
}

