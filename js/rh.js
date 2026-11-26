
const API_BASE_URL = "https://localhost:7238/api";

const API_FUNCIONARIOS = `${API_BASE_URL}/Funcionarios`;
const API_BANCO_HORAS = `${API_BASE_URL}/BancoHora`;
const API_REGISTRO_PONTO = `${API_BASE_URL}/RegistroPonto`;

const boasVindas = document.getElementById("boasVindas");
const listaFuncionarios = document.getElementById("listaFuncionarios");
const pesquisaFuncionario = document.getElementById("pesquisaFuncionario");
const totalFuncionarios = document.getElementById("totalFuncionarios");
const mensagemLista = document.getElementById("mensagemLista");
const botaoSair = document.getElementById("sair");

const detalhesFuncionario = document.getElementById("detalhesFuncionario");
const nomeFuncionarioDetalhes = document.getElementById("nomeFuncionarioDetalhes");
const saldoBancoHoras = document.getElementById("saldoBancoHoras");
const historicoPonto = document.getElementById("historicoPonto");
const mensagemDetalhes = document.getElementById("mensagemDetalhes");
const botaoFecharDetalhes = document.getElementById("fecharDetalhes");

let funcionarios = [];
let graficoHoras = null;
let temporizadorDetalhes = null;

const sessaoRH = localStorage.getItem("rh_sessao");

if (!sessaoRH) {
    window.location.href = "../index.html";
} else {
    iniciarPainel();
}

async function iniciarPainel() {
    if (boasVindas) {
        boasVindas.textContent =
            "Gerencie os funcionários, os registros de ponto e o banco de horas.";
    }

    await carregarFuncionarios();
}

function formatarDuracao(valor) {
    const horasDecimais = Number(valor) || 0;
    const minutosTotais = Math.round(horasDecimais * 60);

    const sinal = minutosTotais < 0 ? "-" : "";
    const absoluto = Math.abs(minutosTotais);

    const horas = Math.floor(absoluto / 60);
    const minutos = absoluto % 60;

    return `${sinal}${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function formatarSaldo(horas) {
    const valor = Number(horas) || 0;
    const minutosTotais = Math.round(valor * 60);
    const duracao = formatarDuracao(valor);

    return minutosTotais > 0 ? `+${duracao}` : duracao;
}

function interpretarDataHora(valor) {
    if (!valor) {
        return new Date(NaN);
    }

    const texto = String(valor);
    const possuiFuso = /(?:Z|[+-]\d{2}:\d{2})$/i.test(texto);
    const dataNormalizada = possuiFuso ? texto : `${texto}Z`;

    return new Date(dataNormalizada);
}

function interpretarDataReferencia(valor) {
    if (!valor) {
        return new Date(NaN);
    }

    const correspondencia = String(valor).match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (!correspondencia) {
        return new Date(NaN);
    }

    const ano = Number(correspondencia[1]);
    const mes = Number(correspondencia[2]) - 1;
    const dia = Number(correspondencia[3]);

    const data = new Date(ano, mes, dia);

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes ||
        data.getDate() !== dia
    ) {
        return new Date(NaN);
    }

    return data;
}

function formatarDataLocal(valor) {
    const data = interpretarDataHora(valor);

    if (Number.isNaN(data.getTime())) {
        return "Data inválida";
    }

    return data.toLocaleDateString("pt-BR", {
        timeZone: "America/Bahia"
    });
}

function formatarHoraLocal(valor) {
    const data = interpretarDataHora(valor);

    if (Number.isNaN(data.getTime())) {
        return "--:--";
    }

    return data.toLocaleTimeString("pt-BR", {
        timeZone: "America/Bahia",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function requisicaoAPI(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...opcoes.headers
        }
    });

    if (!resposta.ok) {
        let mensagem = `Erro HTTP ${resposta.status}.`;

        try {
            const erro = await resposta.json();

            mensagem =
                erro.detail ||
                erro.title ||
                erro.message ||
                erro.mensagem ||
                mensagem;
        } catch {
            
        }

        throw new Error(mensagem);
    }

    if (resposta.status === 204) {
        return null;
    }

    const texto = await resposta.text();

    return texto ? JSON.parse(texto) : null;
}

async function obterFuncionarios() {
    return await requisicaoAPI(API_FUNCIONARIOS);
}

async function carregarFuncionarios() {
    if (mensagemLista) {
        mensagemLista.textContent = "Carregando funcionários...";
    }

    if (listaFuncionarios) {
        listaFuncionarios.replaceChildren();
    }

    try {
        funcionarios = await obterFuncionarios();

        if (!Array.isArray(funcionarios)) {
            funcionarios = [];
        }

        const pesquisa = pesquisaFuncionario
            ? pesquisaFuncionario.value.trim().toLowerCase()
            : "";

        const filtrados = funcionarios.filter(funcionario => {
            const nome = String(funcionario.nome || "").toLowerCase();
            const setor = String(funcionario.setor || "").toLowerCase();

            return nome.includes(pesquisa) || setor.includes(pesquisa);
        });

        if (totalFuncionarios) {
            totalFuncionarios.textContent =
                `${filtrados.length} funcionário(s) encontrado(s).`;
        }

        if (filtrados.length === 0) {
            if (mensagemLista) {
                mensagemLista.textContent = "Nenhum funcionário encontrado.";
            }

            return;
        }

        if (mensagemLista) {
            mensagemLista.textContent = "";
        }

        for (const funcionario of filtrados) {
            const linha = document.createElement("tr");

            adicionarCelula(linha, funcionario.nome);
            adicionarCelula(linha, funcionario.setor);

            const celulaBanco = document.createElement("td");
            celulaBanco.textContent = "Carregando...";
            celulaBanco.dataset.bancoFuncionario = funcionario.id;
            linha.appendChild(celulaBanco);

            const celulaAcoes = document.createElement("td");

            const botaoDetalhes = criarBotao("Detalhes", async () => {
                await abrirDetalhesFuncionario(funcionario);
            });

            const botaoEditar = criarBotao("Editar", async () => {
                await editarFuncionario(funcionario);
            });

            const botaoExcluir = criarBotao("Excluir", async () => {
                await excluirFuncionario(funcionario);
            });

            celulaAcoes.append(
                botaoDetalhes,
                botaoEditar,
                botaoExcluir
            );

            linha.appendChild(celulaAcoes);
            listaFuncionarios.appendChild(linha);

            carregarSaldoNaTabela(funcionario.id, celulaBanco);
        }
    } catch (erro) {
        console.error("Erro ao carregar funcionários:", erro);

        if (mensagemLista) {
            mensagemLista.textContent =
                `Não foi possível carregar os funcionários: ${erro.message}`;
        }

        if (totalFuncionarios) {
            totalFuncionarios.textContent = "";
        }
    }
}

function adicionarCelula(linha, valor) {
    const celula = document.createElement("td");
    celula.textContent = valor ?? "";
    linha.appendChild(celula);
}

function criarBotao(texto, acao) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.textContent = texto;
    botao.className = "botao botao-login";
    botao.style.margin = "3px";
    botao.addEventListener("click", acao);

    return botao;
}

async function carregarSaldoNaTabela(funcionarioId, celula) {
    try {
        const registros = await requisicaoAPI(
            `${API_BANCO_HORAS}/${funcionarioId}`
        );

        const saldo = calcularSaldoTotal(registros);
        celula.textContent = formatarSaldo(saldo);
    } catch (erro) {
        console.error("Erro ao carregar banco de horas:", erro);
        celula.textContent = "Indisponível";
    }
}

function calcularSaldoTotal(registros) {
    if (!Array.isArray(registros)) {
        return 0;
    }

    return registros.reduce((total, registro) => {
        return total + Number(registro.saldoHoras || 0);
    }, 0);
}

async function abrirDetalhesFuncionario(funcionario) {
    detalhesFuncionario.hidden = false;

    nomeFuncionarioDetalhes.textContent =
        `Funcionário: ${funcionario.nome} — Setor: ${funcionario.setor}`;

    saldoBancoHoras.textContent = "Carregando banco de horas...";
    mensagemDetalhes.textContent = "Carregando registros...";
    historicoPonto.replaceChildren();

    detalhesFuncionario.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    try {
        
        const funcionariosAtualizados = await obterFuncionarios();

        if (!Array.isArray(funcionariosAtualizados)) {
            throw new Error("A API não retornou uma lista válida de funcionários.");
        }

        const funcionarioAtualizado = funcionariosAtualizados.find(
            item => Number(item.id) === Number(funcionario.id)
        );

        if (!funcionarioAtualizado) {
            throw new Error("Funcionário não encontrado na API.");
        }

        
        funcionario = funcionarioAtualizado;

        funcionarios = funcionarios.map(item =>
            Number(item.id) === Number(funcionario.id)
                ? funcionarioAtualizado
                : item
        );

        
        nomeFuncionarioDetalhes.textContent =
            `Funcionário: ${funcionarioAtualizado.nome} — Setor: ${funcionarioAtualizado.setor}`;

        const [bancoHoras, registrosPonto] = await Promise.all([
            requisicaoAPI(`${API_BANCO_HORAS}/${funcionarioAtualizado.id}`),
            requisicaoAPI(`${API_REGISTRO_PONTO}/${funcionarioAtualizado.id}`)
        ]);

        const saldoTotal = calcularSaldoTotal(bancoHoras);

        saldoBancoHoras.textContent =
            `Saldo total do banco de horas: ${formatarSaldo(saldoTotal)}`;

        desenharGrafico(bancoHoras);
        exibirHistoricoPonto(registrosPonto);

        mostrarMensagemDetalhes(
            Array.isArray(registrosPonto) && registrosPonto.length > 0
                ? `${registrosPonto.length} registro(s) de ponto encontrado(s).`
                : "Este funcionário ainda não possui registros de ponto."
        );
    } catch (erro) {
        console.error("Erro ao carregar detalhes:", erro);

        saldoBancoHoras.textContent =
            "Não foi possível carregar o banco de horas.";

        mensagemDetalhes.textContent =
            `Não foi possível carregar os detalhes: ${erro.message}`;
    }
}

function mostrarMensagemDetalhes(mensagem) {
    if (!mensagemDetalhes) {
        return;
    }

    if (temporizadorDetalhes) {
        clearTimeout(temporizadorDetalhes);
        temporizadorDetalhes = null;
    }

    mensagemDetalhes.textContent = mensagem;

    temporizadorDetalhes = setTimeout(() => {
        mensagemDetalhes.textContent = "";
        temporizadorDetalhes = null;
    }, 3000);
}

function desenharGrafico(registros) {
    const canvas = document.getElementById("graficoHorasTrabalhadas");

    if (!canvas || typeof Chart === "undefined") {
        mensagemDetalhes.textContent =
            "Não foi possível carregar o gráfico. Verifique a biblioteca Chart.js.";
        return;
    }

    const dados = Array.isArray(registros) ? [...registros] : [];

    dados.sort((a, b) => {
        const dataA = interpretarDataReferencia(a.dataReferencia);
        const dataB = interpretarDataReferencia(b.dataReferencia);

        return dataA.getTime() - dataB.getTime();
    });

    const rotulos = dados.map(registro => {
        const data = interpretarDataReferencia(registro.dataReferencia);

        return Number.isNaN(data.getTime())
            ? "Data inválida"
            : data.toLocaleDateString("pt-BR");
    });

    const minutosTrabalhados = dados.map(registro =>
        Math.round(Number(registro.horasTrabalhadas || 0) * 60)
    );

    if (graficoHoras) {
        graficoHoras.destroy();
    }

    graficoHoras = new Chart(canvas, {
        type: "bar",

        data: {
            labels: rotulos,

            datasets: [{
                label: "Horas trabalhadas",
                data: minutosTrabalhados,
                backgroundColor: "rgba(139, 92, 246, 0.7)",
                borderColor: "rgb(139, 92, 246)",
                borderWidth: 1,
                borderRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                y: {
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: "Tempo trabalhado (HH:MM)"
                    },

                    ticks: {
                        callback: function(valor) {
                            return formatarDuracao(Number(valor) / 60);
                        }
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: "Data"
                    }
                }
            },

            plugins: {
                legend: {
                    display: true
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Horas trabalhadas: ${formatarDuracao(Number(context.raw) / 60)}`;
                        }
                    }
                }
            }
        }
    });
}

function exibirHistoricoPonto(registros) {
    historicoPonto.replaceChildren();

    if (!Array.isArray(registros) || registros.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 3;
        celula.textContent = "Nenhum registro de ponto encontrado.";

        linha.appendChild(celula);
        historicoPonto.appendChild(linha);
        return;
    }

    const ordenados = [...registros].sort((a, b) => {
        return interpretarDataHora(b.dataHora) -
            interpretarDataHora(a.dataHora);
    });

    for (const registro of ordenados) {
        const linha = document.createElement("tr");

        adicionarCelula(
            linha,
            formatarDataLocal(registro.dataHora)
        );

        adicionarCelula(
            linha,
            formatarHoraLocal(registro.dataHora)
        );

        adicionarCelula(
            linha,
            traduzirTipoPonto(registro.tipo)
        );

        historicoPonto.appendChild(linha);
    }
}

function traduzirTipoPonto(tipo) {
    const tipos = {
        Entrada: "Entrada",
        InicioIntervalo: "Início do intervalo",
        FimIntervalo: "Fim do intervalo",
        Saida: "Saída"
    };

    return tipos[tipo] || tipo || "Não informado";
}

async function editarFuncionario(funcionario) {
    const nomeAtualizado = prompt(
        "Digite o novo nome do funcionário:",
        funcionario.nome
    );

    if (nomeAtualizado === null) {
        return;
    }

    const nome = nomeAtualizado.trim();

    if (!nome) {
        alert("O nome não pode ficar vazio.");
        return;
    }

    const setorAtualizado = prompt(
        "Digite o novo setor do funcionário:",
        funcionario.setor
    );

    if (setorAtualizado === null) {
        return;
    }

    const setor = setorAtualizado.trim();

    if (!setor) {
        alert("O setor não pode ficar vazio.");
        return;
    }

    try {
        await requisicaoAPI(`${API_FUNCIONARIOS}/${funcionario.id}`, {
            method: "PUT",
            body: JSON.stringify({ nome, setor })
        });

        alert("Funcionário atualizado com sucesso!");

        // Recarrega a lista usando os dados mais recentes da API.
        await carregarFuncionarios();

        // Se os detalhes estiverem abertos para este funcionário,
        // atualiza também o nome e os dados exibidos nessa área.
        if (
            detalhesFuncionario &&
            !detalhesFuncionario.hidden &&
            nomeFuncionarioDetalhes
        ) {
            const atualizado = funcionarios.find(
                item => Number(item.id) === Number(funcionario.id)
            );

            if (atualizado) {
                nomeFuncionarioDetalhes.textContent =
                    `Funcionário: ${atualizado.nome} — Setor: ${atualizado.setor}`;
            }
        }
    } catch (erro) {
        console.error("Erro ao editar funcionário:", erro);

        alert(
            `Não foi possível atualizar o funcionário: ${erro.message}`
        );
    }
}

async function excluirFuncionario(funcionario) {
    const confirmar = confirm(
        `Deseja realmente excluir o funcionário ${funcionario.nome}?`
    );

    if (!confirmar) {
        return;
    }

    try {
        await requisicaoAPI(`${API_FUNCIONARIOS}/${funcionario.id}`, {
            method: "DELETE"
        });

        alert("Funcionário excluído com sucesso!");

        detalhesFuncionario.hidden = true;

        if (graficoHoras) {
            graficoHoras.destroy();
            graficoHoras = null;
        }

        await carregarFuncionarios();
    } catch (erro) {
        console.error("Erro ao excluir funcionário:", erro);

        alert(
            `Não foi possível excluir o funcionário: ${erro.message}`
        );
    }
}

if (pesquisaFuncionario) {
    pesquisaFuncionario.addEventListener("input", carregarFuncionarios);
}

if (botaoFecharDetalhes) {
    botaoFecharDetalhes.addEventListener("click", () => {
        detalhesFuncionario.hidden = true;

        if (graficoHoras) {
            graficoHoras.destroy();
            graficoHoras = null;
        }

        if (temporizadorDetalhes) {
            clearTimeout(temporizadorDetalhes);
            temporizadorDetalhes = null;
        }

        if (mensagemDetalhes) {
            mensagemDetalhes.textContent = "";
        }
    });
}

if (botaoSair) {
    botaoSair.addEventListener("click", () => {
        localStorage.removeItem("rh_sessao");
        window.location.href = "../index.html";
    });
}
