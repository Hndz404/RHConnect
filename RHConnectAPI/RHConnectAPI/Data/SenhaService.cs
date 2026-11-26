
using Microsoft.AspNetCore.Identity;

namespace RHConnectAPI.Data;

public class SenhaService
{
    private readonly PasswordHasher<object> _hasher = new();

    public string GerarHash(string senha)
    {
        return _hasher.HashPassword(new object(), senha);
    }

    public bool Verificar(string hash, string senha)
    {
        var resultado = _hasher.VerifyHashedPassword(
            new object(),
            hash,
            senha
        );

        return resultado != PasswordVerificationResult.Failed;
    }
}

