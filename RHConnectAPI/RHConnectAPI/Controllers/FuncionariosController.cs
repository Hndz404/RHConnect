
using Microsoft.AspNetCore.Mvc;
using RHConnectAPI.Data;
using RHConnectAPI.Models;

namespace RHConnectAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FuncionariosController : ControllerBase
{
    private readonly FuncionarioRepository _repository;
    private readonly SenhaService _senhaService;

    public FuncionariosController(
        FuncionarioRepository repository,
        SenhaService senhaService)
    {
        _repository = repository;
        _senhaService = senhaService;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        try
        {
            var funcionarios = await _repository.ListarAsync();
            return Ok(funcionarios);
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao listar funcionários",
                statusCode: 500
            );
        }
    }

    [HttpPost]
    public async Task<IActionResult> Cadastrar(
        CadastroFuncionarioRequest pedido)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(pedido.Nome) ||
                string.IsNullOrWhiteSpace(pedido.Setor) ||
                string.IsNullOrWhiteSpace(pedido.Senha))
            {
                return BadRequest(new
                {
                    mensagem = "Preencha nome, setor e senha."
                });
            }

            if (pedido.Senha.Length < 8)
            {
                return BadRequest(new
                {
                    mensagem = "A senha deve ter pelo menos 8 caracteres."
                });
            }

            var funcionario = new Funcionario
            {
                Nome = pedido.Nome.Trim(),
                Setor = pedido.Setor.Trim(),
                SenhaHash = _senhaService.GerarHash(pedido.Senha),
                DeveTrocarSenha = true,
                Ativo = true
            };

            int id = await _repository.CadastrarAsync(funcionario);

            return Ok(new
            {
                id,
                mensagem = "Funcionário cadastrado com sucesso!"
            });
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao cadastrar funcionário",
                statusCode: 500
            );
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest pedido)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(pedido.Nome) ||
                string.IsNullOrWhiteSpace(pedido.Senha))
            {
                return BadRequest(new
                {
                    mensagem = "Informe o nome e a senha."
                });
            }

            var funcionario =
                await _repository.BuscarPorNomeAsync(pedido.Nome.Trim());

            if (funcionario == null ||
                !_senhaService.Verificar(
                    funcionario.SenhaHash,
                    pedido.Senha))
            {
                return Unauthorized(new
                {
                    mensagem = "Nome ou senha incorretos."
                });
            }

            return Ok(new
            {
                funcionario.Id,
                funcionario.Nome,
                funcionario.Setor,
                funcionario.DeveTrocarSenha
            });
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao realizar login",
                statusCode: 500
            );
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Atualizar(
        int id,
        CadastroFuncionarioRequest pedido)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(pedido.Nome) ||
                string.IsNullOrWhiteSpace(pedido.Setor))
            {
                return BadRequest(new
                {
                    mensagem = "Preencha o nome e o setor."
                });
            }

            var funcionario = new Funcionario
            {
                Id = id,
                Nome = pedido.Nome.Trim(),
                Setor = pedido.Setor.Trim()
            };

            bool atualizado =
                await _repository.AtualizarAsync(funcionario);

            if (!atualizado)
            {
                return NotFound(new
                {
                    mensagem = "Funcionário não encontrado."
                });
            }

            return Ok(new
            {
                mensagem = "Funcionário atualizado com sucesso!"
            });
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao atualizar funcionário",
                statusCode: 500
            );
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id)
    {
        try
        {
            bool excluido = await _repository.ExcluirAsync(id);

            if (!excluido)
            {
                return NotFound(new
                {
                    mensagem = "Funcionário não encontrado."
                });
            }

            return Ok(new
            {
                mensagem = "Funcionário excluído com sucesso!"
            });
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao excluir funcionário",
                statusCode: 500
            );
        }
    }

    [HttpPut("{id:int}/senha")]
    public async Task<IActionResult> AtualizarSenha(
        int id,
        [FromBody] AlterarSenhaRequest pedido)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(pedido.NovaSenha) ||
                pedido.NovaSenha.Length < 8)
            {
                return BadRequest(new
                {
                    mensagem = "A nova senha deve ter pelo menos 8 caracteres."
                });
            }

            string senhaHash =
                _senhaService.GerarHash(pedido.NovaSenha);

            bool atualizado =
                await _repository.AtualizarSenhaAsync(id, senhaHash);

            if (!atualizado)
            {
                return NotFound(new
                {
                    mensagem = "Funcionário não encontrado."
                });
            }

            return Ok(new
            {
                mensagem = "Senha atualizada com sucesso!"
            });
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Erro ao atualizar senha",
                statusCode: 500
            );
        }
    }
}

public class LoginRequest
{
    public string Nome { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}

public class AlterarSenhaRequest
{
    public string NovaSenha { get; set; } = string.Empty;
}
