
namespace RHConnectAPI.Models;

public class BancoHora
{
    public int Id { get; set; }

    public int FuncionarioId { get; set; }

    public DateTime DataReferencia { get; set; }

    public decimal HorasTrabalhadas { get; set; }

    public decimal HorasPrevistas { get; set; }

    public decimal SaldoHoras { get; set; }
}

