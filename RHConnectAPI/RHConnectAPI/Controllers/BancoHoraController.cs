
using Microsoft.AspNetCore.Mvc;
using RHConnectAPI.Data;
using RHConnectAPI.Models;

namespace RHConnectAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BancoHoraController : ControllerBase
{
    private readonly BancoHoraRepository _bancoHoraRepository;
    private readonly RegistroPontoRepository _registroPontoRepository;
    private readonly FuncionarioRepository _funcionarioRepository;

    public BancoHoraController(
        BancoHoraRepository bancoHoraRepository,
        RegistroPontoRepository registroPontoRepository,
        FuncionarioRepository funcionarioRepository)
    {
        _bancoHoraRepository = bancoHoraRepository;
        _registroPontoRepository = registroPontoRepository;
        _funcionarioRepository = funcionarioRepository;
    }

    public record CalcularBancoHoraRequest(
        int FuncionarioId,
        DateTime DataReferencia
    );

    [HttpPost("calcular")]
    public async Task<IActionResult> Calcular(
        [FromBody] CalcularBancoHoraRequest pedido)
    {
        if (pedido.FuncionarioId <= 0)
        {
            return BadRequest(new
            {
                mensagem = "Informe um funcionário válido."
            });
        }

        try
        {
            var funcionarios =
                await _funcionarioRepository.ListarAsync();

            var funcionario = funcionarios.FirstOrDefault(f =>
                f.Id == pedido.FuncionarioId && f.Ativo);

            if (funcionario is null)
            {
                return NotFound(new
                {
                    mensagem = "Funcionário não encontrado ou inativo."
                });
            }

            var registros =
                await _registroPontoRepository
                    .ListarPorFuncionarioAsync(pedido.FuncionarioId);

            var pontosDoDia = registros
                .Where(r =>
                    r.DataHora.Date == pedido.DataReferencia.Date)
                .OrderBy(r => r.DataHora)
                .ToList();

            string[] tiposEsperados =
            [
                "Entrada",
                "InicioIntervalo",
                "FimIntervalo",
                "Saida"
            ];

            if (pontosDoDia.Count != 4 ||
                !pontosDoDia
                    .Select(r => r.Tipo)
                    .SequenceEqual(tiposEsperados))
            {
                return BadRequest(new
                {
                    mensagem =
                        "São necessários quatro registros válidos, " +
                        "na ordem: Entrada, InicioIntervalo, " +
                        "FimIntervalo e Saida."
                });
            }

            var entrada = pontosDoDia[0].DataHora;
            var inicioIntervalo = pontosDoDia[1].DataHora;
            var fimIntervalo = pontosDoDia[2].DataHora;
            var saida = pontosDoDia[3].DataHora;

            if (inicioIntervalo <= entrada ||
                fimIntervalo <= inicioIntervalo ||
                saida <= fimIntervalo)
            {
                return BadRequest(new
                {
                    mensagem =
                        "Os horários devem estar em ordem crescente " +
                        "e ser diferentes."
                });
            }

            var tempoTrabalhado =
                (inicioIntervalo - entrada) +
                (saida - fimIntervalo);

            if (tempoTrabalhado < TimeSpan.Zero)
            {
                return BadRequest(new
                {
                    mensagem =
                        "A duração calculada do trabalho é inválida."
                });
            }

            decimal horasTrabalhadas = Math.Round(
                (decimal)tempoTrabalhado.TotalMinutes / 60m,
                2,
                MidpointRounding.AwayFromZero
            );

            const decimal horasPrevistas = 8.00m;

            decimal saldoHoras = Math.Round(
                horasTrabalhadas - horasPrevistas,
                2,
                MidpointRounding.AwayFromZero
            );

            var bancoHora = new BancoHora
            {
                FuncionarioId = pedido.FuncionarioId,
                DataReferencia = pedido.DataReferencia.Date,
                HorasTrabalhadas = horasTrabalhadas,
                HorasPrevistas = horasPrevistas,
                SaldoHoras = saldoHoras
            };

            await _bancoHoraRepository
                .SalvarOuAtualizarAsync(bancoHora);

            return Ok(new
            {
                funcionarioId = bancoHora.FuncionarioId,
                dataReferencia = bancoHora.DataReferencia,
                horasTrabalhadas = bancoHora.HorasTrabalhadas,
                horasPrevistas = bancoHora.HorasPrevistas,
                saldoHoras = bancoHora.SaldoHoras,
                mensagem =
                    "Banco de horas calculado e salvo com sucesso."
            });
        }
        catch (Exception)
        {
            return Problem(
                "Não foi possível calcular o banco de horas. " +
                "Verifique os registros e a estrutura do banco de dados."
            );
        }
    }

    [HttpGet("{funcionarioId:int}")]
    public async Task<IActionResult> Listar(int funcionarioId)
    {
        if (funcionarioId <= 0)
        {
            return BadRequest(new
            {
                mensagem = "Informe um funcionário válido."
            });
        }

        try
        {
            var funcionarios =
                await _funcionarioRepository.ListarAsync();

            var funcionario = funcionarios.FirstOrDefault(f =>
                f.Id == funcionarioId && f.Ativo);

            if (funcionario is null)
            {
                return NotFound(new
                {
                    mensagem =
                        "Funcionário não encontrado ou inativo."
                });
            }

            var resultados =
                await _bancoHoraRepository
                    .ListarPorFuncionarioAsync(funcionarioId);

            return Ok(resultados);
        }
        catch (Exception)
        {
            return Problem(
                "Não foi possível consultar o banco de horas."
            );
        }
    }
}
