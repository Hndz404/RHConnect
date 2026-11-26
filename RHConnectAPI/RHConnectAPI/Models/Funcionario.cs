
namespace RHConnectAPI.Models;

public class Funcionario
{
    public int Id { get; set; }

    public string Nome { get; set; } = string.Empty;

    public string Setor { get; set; } = string.Empty;

    public string SenhaHash { get; set; } = string.Empty;

    public bool DeveTrocarSenha { get; set; } = true;

    public DateTime DataCadastro { get; set; }

    public bool Ativo { get; set; } = true;
}
