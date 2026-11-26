
const formCadastro = document.getElementById("formCadastro");
const campoNome = document.getElementById("nome");
const campoSetor = document.getElementById("setor");
const erroCadastro = document.getElementById("erroCadastro");

const resultadoCadastro = document.getElementById("resultadoCadastro");
const campoSenhaTemporaria = document.getElementById("senhaTemporaria");
const botaoCopiarSenha = document.getElementById("copiarSenha");
const avisoCopia = document.getElementById("avisoCopia");

const API_URL = "https://localhost:7238/api/Funcionarios";

function gerarSenhaTemporaria() {
    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";

    const valores = new Uint32Array(12);
    crypto.getRandomValues(valores);

    return Array.from(valores, valor =>
        caracteres[valor % caracteres.length]
    ).join("");
}

formCadastro.addEventListener("submit", async function (event) {
    event.preventDefault();

    erroCadastro.textContent = "";
    avisoCopia.textContent = "";
    resultadoCadastro.hidden = true;

    const nome = campoNome.value.trim();
    const setor = campoSetor.value;

    if (nome.length < 3) {
        erroCadastro.textContent = "Digite um nome válido.";
        return;
    }

    if (!setor) {
        erroCadastro.textContent = "Selecione um setor.";
        return;
    }

    try {
        const respostaLista = await fetch(API_URL);

        if (!respostaLista.ok) {
            throw new Error("Não foi possível consultar os funcionários.");
        }

        const funcionarios = await respostaLista.json();

        const nomeExiste = funcionarios.some(funcionario =>
            funcionario.nome.trim().toLowerCase() === nome.toLowerCase()
        );

        if (nomeExiste) {
            erroCadastro.textContent =
                "Já existe um funcionário cadastrado com esse nome.";
            return;
        }

        const senhaTemporaria = gerarSenhaTemporaria();

        const novoFuncionario = {
            nome: nome,
            setor: setor,
            senha: senhaTemporaria
        };

        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(novoFuncionario)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.mensagem ||
                "Não foi possível cadastrar o funcionário."
            );
        }

        campoSenhaTemporaria.value = senhaTemporaria;
        resultadoCadastro.hidden = false;

        formCadastro.reset();

    } catch (erro) {
        console.error("Erro no cadastro:", erro);

        erroCadastro.textContent =
            erro.message ||
            "Não foi possível conectar à API. Verifique se ela está executando.";
    }
});

botaoCopiarSenha.addEventListener("click", async function () {
    try {
        await navigator.clipboard.writeText(
            campoSenhaTemporaria.value
        );

        avisoCopia.textContent = "Senha copiada!";
    } catch {
        campoSenhaTemporaria.select();

        avisoCopia.textContent =
            "Não foi possível copiar automaticamente. Selecione e copie a senha.";
    }
});
