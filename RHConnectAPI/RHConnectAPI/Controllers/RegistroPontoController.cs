
using Microsoft.AspNetCore.Mvc;
using RHConnectAPI.Data;
using RHConnectAPI.Models;

namespace RHConnectAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RegistroPontoController : ControllerBase
{
    private readonly RegistroPontoRepository _repository;
    private readonly FuncionarioRepository _funcionarioRepository;

    public RegistroPontoController(
        RegistroPontoRepository repository,
        FuncionarioRepository funcionarioRepository)
    {
        _repository = repository;
        _funcionarioRepository = funcionarioRepository;
    }

    public record RegistrarPontoRequest(
        int FuncionarioId,
        string Tipo,
        DateTime? DataHora
    );

    private static readonly string[] TiposPermitidos =
    [
        "Entrada",
        "InicioIntervalo",
        "FimIntervalo",
        "Saida"
    ];

    [HttpGet("{funcionarioId:int}")]
    public async Task<IActionResult> ListarPorFuncionario(int funcionarioId)
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
                f.Id == funcionarioId);

            if (funcionario is null)
            {
                return NotFound(new
                {
                    mensagem = "Funcionário não encontrado."
                });
            }

            var registros =
                await _repository.ListarPorFuncionarioAsync(funcionarioId);

            return Ok(registros);
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao consultar histórico de ponto",
                statusCode: 500
            );
        }
    }

    [HttpPost]
    public async Task<IActionResult> Registrar(
        [FromBody] RegistrarPontoRequest pedido)
    {
        if (pedido.FuncionarioId <= 0)
        {
            return BadRequest(new
            {
                mensagem = "Informe um funcionário válido."
            });
        }

        if (string.IsNullOrWhiteSpace(pedido.Tipo) ||
            !TiposPermitidos.Contains(pedido.Tipo))
        {
            return BadRequest(new
            {
                mensagem = "Tipo de registro inválido."
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

            DateTime dataHoraRegistro =
                pedido.DataHora ?? DateTime.Now;

            var registros =
                await _repository.ListarPorFuncionarioAsync(
                    pedido.FuncionarioId);

            var registrosDoDia = registros
                .Where(r => r.DataHora.Date == dataHoraRegistro.Date)
                .OrderBy(r => r.DataHora)
                .ThenBy(r => r.Id)
                .ToList();

            if (registrosDoDia.Count >= TiposPermitidos.Length)
            {
                return Conflict(new
                {
                    mensagem =
                        "Os quatro registros de ponto deste dia já foram realizados."
                });
            }

            for (int i = 0; i < registrosDoDia.Count; i++)
            {
                if (registrosDoDia[i].Tipo != TiposPermitidos[i])
                {
                    return Conflict(new
                    {
                        mensagem =
                            "Existem registros fora de ordem neste dia. Procure o RH para corrigir."
                    });
                }
            }

            string proximoTipo =
                TiposPermitidos[registrosDoDia.Count];

            if (pedido.Tipo != proximoTipo)
            {
                return Conflict(new
                {
                    mensagem = $"O próximo registro permitido é: {proximoTipo}."
                });
            }

            if (registrosDoDia.Count > 0)
            {
                DateTime ultimoHorario =
                    registrosDoDia[^1].DataHora;

                if (dataHoraRegistro <= ultimoHorario)
                {
                    return Conflict(new
                    {
                        mensagem =
                            "O horário do novo registro deve ser posterior ao último ponto do dia."
                    });
                }
            }

            var registro = new RegistroPonto
            {
                FuncionarioId = pedido.FuncionarioId,
                DataHora = dataHoraRegistro,
                Tipo = pedido.Tipo
            };

            int id = await _repository.RegistrarAsync(registro);

            return Ok(new
            {
                id,
                funcionarioId = registro.FuncionarioId,
                dataHora = registro.DataHora,
                tipo = registro.Tipo,
                mensagem = "Ponto registrado com sucesso."
            });
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao registrar ponto",
                statusCode: 500
            );
        }
    }
}
