
const botoesPerfil = document.querySelectorAll(".perfil-btn");
const formulario = document.querySelector("#formLogin");
const campoUsuario = document.querySelector("#usuario");
const campoSenha = document.querySelector("#senha");
const labelUsuario = document.querySelector("#labelUsuario");
const mensagem = document.querySelector("#mensagem");

const API_URL = "https://localhost:7238/api/Funcionarios";

let perfilSelecionado =
    new URLSearchParams(window.location.search).get("perfil")
    || "funcionario";

function selecionarPerfil(perfil) {
    perfilSelecionado = perfil;

    botoesPerfil.forEach((botao) => {
        botao.classList.toggle(
            "ativo",
            botao.dataset.perfil === perfil
        );
    });

    if (perfil === "rh") {
        labelUsuario.textContent = "Usuário do RH";
        campoUsuario.placeholder = "Digite o usuário do RH";
    } else {
        labelUsuario.textContent = "Nome completo";
        campoUsuario.placeholder = "Digite seu nome completo";
    }

    mensagem.textContent = "";
    mensagem.className = "mensagem";
}

botoesPerfil.forEach((botao) => {
    botao.addEventListener("click", () => {
        selecionarPerfil(botao.dataset.perfil);
    });
});

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const usuario = campoUsuario.value.trim();
    const senha = campoSenha.value;

    mensagem.textContent = "";
    mensagem.className = "mensagem";

    if (!usuario || !senha) {
        mostrarErro("Preencha o nome e a senha.");
        return;
    }

    if (perfilSelecionado === "rh") {
        if (usuario === "admin" && senha === "1234") {
            localStorage.setItem(
                "rh_sessao",
                JSON.stringify({
                    perfil: "rh",
                    nome: "Gerência / RH"
                })
            );

            window.location.href = "rh.html";
            return;
        }

        mostrarErro("Usuário ou senha do RH incorretos.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: usuario,
                senha: senha
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mostrarErro(
                resultado.mensagem ||
                "Não foi possível realizar o login."
            );
            return;
        }

        localStorage.setItem(
            "rh_sessao",
            JSON.stringify({
                perfil: "funcionario",
                id: resultado.id,
                nome: resultado.nome,
                setor: resultado.setor
            })
        );

        if (resultado.deveTrocarSenha) {
            window.location.href = "trocar-senha.html";
            return;
        }

        window.location.href = "funcionario.html";

    } catch (erro) {
        console.error("Erro no login:", erro);

        mostrarErro(
            "Não foi possível conectar à API. " +
            "Verifique se ela está executando."
        );
    }
});

function mostrarErro(texto) {
    mensagem.textContent = texto;
    mensagem.className = "mensagem erro";
}

selecionarPerfil(
    perfilSelecionado === "rh" ? "rh" : "funcionario"
);

