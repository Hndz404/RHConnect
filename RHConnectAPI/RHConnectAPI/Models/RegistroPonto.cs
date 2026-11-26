
namespace RHConnectAPI.Models;

public class RegistroPonto
{
    public int Id { get; set; }

    public int FuncionarioId { get; set; }

    public DateTime DataHora { get; set; }

    public string Tipo { get; set; } = string.Empty;
}
