
const formNovaSenha = document.getElementById("formNovaSenha");
const campoNovaSenha = document.getElementById("novaSenha");
const campoConfirmarSenha = document.getElementById("confirmarSenha");
const erroSenha = document.getElementById("erroSenha");

const API_URL = "https://localhost:7238/api/Funcionarios";

const sessao = JSON.parse(
    localStorage.getItem("rh_sessao") || "null"
);

if (!sessao || !sessao.id || sessao.perfil === "rh") {
    alert("Sessão de funcionário não encontrada. Faça login novamente.");
    window.location.href = "login.html?perfil=funcionario";
}

formNovaSenha.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erroSenha.textContent = "";

    const novaSenha = campoNovaSenha.value;
    const confirmarSenha = campoConfirmarSenha.value;

    if (novaSenha.length < 8) {
        erroSenha.textContent =
            "A nova senha deve ter pelo menos 8 caracteres.";
        return;
    }

    if (novaSenha !== confirmarSenha) {
        erroSenha.textContent = "As senhas não são iguais.";
        return;
    }

    const botao = formNovaSenha.querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        const resposta = await fetch(
            `${API_URL}/${sessao.id}/senha`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    novaSenha: novaSenha
                })
            }
        );

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem ||
                dados.detail ||
                "Não foi possível alterar a senha."
            );
        }

        sessao.deveTrocarSenha = false;
        localStorage.setItem("rh_sessao", JSON.stringify(sessao));

        alert("Senha alterada com sucesso! Entre usando sua nova senha.");

        localStorage.removeItem("rh_sessao");
        window.location.href = "login.html?perfil=funcionario";

    } catch (erro) {
        console.error("Erro ao alterar senha:", erro);
        erroSenha.textContent = erro.message;
    } finally {
        botao.disabled = false;
        botao.textContent = "Salvar nova senha";
    }
});
