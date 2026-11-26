
using Microsoft.Data.SqlClient;
using RHConnectAPI.Models;
using System.Data;

namespace RHConnectAPI.Data;

public class FuncionarioRepository
{
    private readonly string _conexao;

    public FuncionarioRepository(IConfiguration configuracao)
    {
        _conexao = configuracao.GetConnectionString("ConexaoRH")
            ?? throw new InvalidOperationException(
                "A conexão ConexaoRH não foi configurada."
            );
    }

    public async Task<List<Funcionario>> ListarAsync()
    {
        var funcionarios = new List<Funcionario>();

        const string sql = """
            SELECT Id, Nome, Setor, SenhaHash,
                   DeveTrocarSenha, DataCadastro, Ativo
            FROM dbo.Funcionarios
            ORDER BY Nome;
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);
        await using var leitor = await comando.ExecuteReaderAsync();

        while (await leitor.ReadAsync())
        {
            funcionarios.Add(new Funcionario
            {
                Id = leitor.GetInt32(0),
                Nome = leitor.GetString(1),
                Setor = leitor.GetString(2),
                SenhaHash = leitor.GetString(3),
                DeveTrocarSenha = leitor.GetBoolean(4),
                DataCadastro = leitor.GetDateTime(5),
                Ativo = leitor.GetBoolean(6)
            });
        }

        return funcionarios;
    }

    public async Task<Funcionario?> BuscarPorNomeAsync(string nome)
    {
        const string sql = """
            SELECT Id, Nome, Setor, SenhaHash,
                   DeveTrocarSenha, DataCadastro, Ativo
            FROM dbo.Funcionarios
            WHERE Nome = @Nome
              AND Ativo = 1;
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);

        comando.Parameters.AddWithValue("@Nome", nome);

        await using var leitor = await comando.ExecuteReaderAsync();

        if (!await leitor.ReadAsync())
        {
            return null;
        }

        return new Funcionario
        {
            Id = leitor.GetInt32(0),
            Nome = leitor.GetString(1),
            Setor = leitor.GetString(2),
            SenhaHash = leitor.GetString(3),
            DeveTrocarSenha = leitor.GetBoolean(4),
            DataCadastro = leitor.GetDateTime(5),
            Ativo = leitor.GetBoolean(6)
        };
    }

    public async Task<int> CadastrarAsync(Funcionario funcionario)
    {
        const string sql = """
            INSERT INTO dbo.Funcionarios
                (Nome, Setor, SenhaHash, DeveTrocarSenha, Ativo)
            OUTPUT INSERTED.Id
            VALUES
                (@Nome, @Setor, @SenhaHash, 1, 1);
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);

        comando.Parameters.AddWithValue("@Nome", funcionario.Nome);
        comando.Parameters.AddWithValue("@Setor", funcionario.Setor);
        comando.Parameters.AddWithValue(
            "@SenhaHash",
            funcionario.SenhaHash
        );

        var resultado = await comando.ExecuteScalarAsync();

        return Convert.ToInt32(resultado);
    }

    public async Task<bool> AtualizarAsync(Funcionario funcionario)
    {
        const string sql = """
            UPDATE dbo.Funcionarios
            SET Nome = @Nome,
                Setor = @Setor
            WHERE Id = @Id
              AND Ativo = 1;
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);

        comando.Parameters.AddWithValue("@Id", funcionario.Id);
        comando.Parameters.AddWithValue("@Nome", funcionario.Nome);
        comando.Parameters.AddWithValue("@Setor", funcionario.Setor);

        int linhasAfetadas = await comando.ExecuteNonQueryAsync();

        return linhasAfetadas > 0;
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var transacao =
            await conexao.BeginTransactionAsync();

        try
        {
            const string sql = """
                DELETE FROM dbo.RegistrosPonto
                WHERE FuncionarioId = @Id;

                DELETE FROM dbo.BancoHoras
                WHERE FuncionarioId = @Id;

                DELETE FROM dbo.Funcionarios
                WHERE Id = @Id;
                """;

            await using var comando = new SqlCommand(
                sql,
                conexao,
                (SqlTransaction)transacao
            );

            comando.Parameters.AddWithValue("@Id", id);

            int linhasAfetadas = await comando.ExecuteNonQueryAsync();

            await transacao.CommitAsync();

            return linhasAfetadas > 0;
        }
        catch
        {
            await transacao.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> AtualizarSenhaAsync(
        int id,
        string senhaHash)
    {
        const string sql = """
            UPDATE dbo.Funcionarios
            SET SenhaHash = @SenhaHash,
                DeveTrocarSenha = 0
            WHERE Id = @Id
              AND Ativo = 1;
            """;

        await using var conexao = new SqlConnection(_conexao);
        await conexao.OpenAsync();

        await using var comando = new SqlCommand(sql, conexao);

        comando.Parameters.AddWithValue("@Id", id);
        comando.Parameters.AddWithValue("@SenhaHash", senhaHash);

        int linhasAfetadas = await comando.ExecuteNonQueryAsync();

        return linhasAfetadas > 0;
    }
}
